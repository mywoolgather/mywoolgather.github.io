/* Woolgather Cloud Functions — Ravelry lookups.

   The app can't call Ravelry directly: Ravelry's API needs a key, and a key
   in a public static site is a key for everyone. This callable function holds
   the key (as Firebase secrets) and forwards a small set of read-only
   requests for signed-in users, returning only the fields the app uses.

   Secrets (set once):
     firebase functions:secrets:set RAVELRY_USERNAME
     firebase functions:secrets:set RAVELRY_PASSWORD
   Deploy only this function (other functions in the project are deployed
   separately and must not be removed):
     firebase deploy --only functions:ravelry
*/
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const RAVELRY_USERNAME = defineSecret('RAVELRY_USERNAME');
const RAVELRY_PASSWORD = defineSecret('RAVELRY_PASSWORD');
const API = 'https://api.ravelry.com';

async function ravelryGet(path){
  const auth = Buffer.from(`${RAVELRY_USERNAME.value()}:${RAVELRY_PASSWORD.value()}`).toString('base64');
  const res = await fetch(API + path, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } });
  if(res.status === 404) throw new HttpsError('not-found', 'Not found on Ravelry.');
  if(res.status === 429) throw new HttpsError('resource-exhausted', 'Ravelry is busy — try again in a minute.');
  if(!res.ok) throw new HttpsError('unavailable', `Ravelry returned ${res.status}.`);
  return res.json();
}

const photo = p => p && (p.medium_url || p.small2_url || p.small_url) || null;
const trimPatternResult = p => ({
  id: p.id, name: p.name, permalink: p.permalink,
  designer: p.designer ? p.designer.name : null,
  craft: p.craft ? p.craft.permalink : null,
  yardage: p.yardage || null,
  weight: p.yarn_weight_description || null,
  photo: photo(p.first_photo)
});
const trimPattern = p => ({
  ...trimPatternResult(p),
  yardageMax: p.yardage_max || null,
  sizes: p.sizes_available || null,
  gauge: p.gauge || null, rowGauge: p.row_gauge || null, gaugeDivisor: p.gauge_divisor || null, gaugePattern: p.gauge_pattern || null,
  needles: (p.pattern_needle_sizes || []).map(n => ({ name: n.name, metric: n.metric, us: n.us, hook: n.hook, crochet: !!n.crochet })),
  difficulty: p.difficulty_average || null,
  photos: (p.photos || []).map(photo).filter(Boolean).slice(0, 4)
});
const trimYarnResult = y => ({
  id: y.id, name: y.name, permalink: y.permalink,
  company: y.yarn_company ? y.yarn_company.name : null,
  weight: y.yarn_weight ? y.yarn_weight.name : null,
  yardage: y.yardage || y.max_yardage || y.min_yardage || null,
  grams: y.grams || y.max_grams || y.min_grams || null,
  discontinued: !!y.discontinued,
  photo: photo(y.first_photo)
});
const trimYarn = y => ({
  ...trimYarnResult(y),
  fibers: (y.yarn_fibers || []).map(f => ({ pct: f.percentage, name: f.fiber_type ? f.fiber_type.name : null })).filter(f => f.name)
});

const text = (v, max = 100) => {
  if(typeof v !== 'string' || !v.trim() || v.length > max) throw new HttpsError('invalid-argument', 'Bad search text.');
  return v.trim();
};
const num = v => {
  const n = Number(v);
  if(!Number.isInteger(n) || n <= 0) throw new HttpsError('invalid-argument', 'Bad id.');
  return n;
};

exports.ravelry = onCall({ secrets: [RAVELRY_USERNAME, RAVELRY_PASSWORD], maxInstances: 5, timeoutSeconds: 20 }, async (req) => {
  if(!req.auth) throw new HttpsError('unauthenticated', 'Sign in to look things up on Ravelry.');
  const { action } = req.data || {};
  switch(action){
    case 'searchPatterns': {
      const q = new URLSearchParams({ query: text(req.data.query), page_size: '10' });
      const r = await ravelryGet(`/patterns/search.json?${q}`);
      return { patterns: (r.patterns || []).map(trimPatternResult) };
    }
    case 'pattern': {
      // A library link carries the permalink, not the id: find it by search.
      let id = req.data.id ? num(req.data.id) : null;
      if(!id){
        const permalink = text(req.data.permalink, 200);
        if(!/^[a-z0-9-]+$/i.test(permalink)) throw new HttpsError('invalid-argument', 'Bad Ravelry link.');
        const q = new URLSearchParams({ query: permalink.replace(/-/g, ' '), page_size: '20' });
        const r = await ravelryGet(`/patterns/search.json?${q}`);
        const hit = (r.patterns || []).find(p => p.permalink === permalink);
        if(!hit) throw new HttpsError('not-found', "Couldn't find that pattern on Ravelry.");
        id = hit.id;
      }
      const r = await ravelryGet(`/patterns/${id}.json`);
      return { pattern: trimPattern(r.pattern) };
    }
    case 'searchYarns': {
      const q = new URLSearchParams({ query: text(req.data.query), page_size: '10' });
      const r = await ravelryGet(`/yarns/search.json?${q}`);
      return { yarns: (r.yarns || []).map(trimYarnResult) };
    }
    case 'yarn': {
      const r = await ravelryGet(`/yarns/${num(req.data.id)}.json`);
      return { yarn: trimYarn(r.yarn) };
    }
    default:
      throw new HttpsError('invalid-argument', 'Unknown action.');
  }
});
