/* Score the app's label reader on a corpus made by generate.py.

     node bench.mjs --set CORPUS/train --app ../.. --tess NODE_MODULES [--old OTHER_APP_DIR] [--show]

   Loads demo.html from --app in headless Chromium (Playwright), serves
   tesseract.js, its core and the English data from --tess (an npm
   node_modules with tesseract.js@5 and @tesseract.js-data/eng), adds the
   corpus's preset and stash brands to the vocabulary, runs readYarnLabel on
   every image and compares each field with truth.json. --show prints misses.
*/
import fs from 'fs'; import path from 'path';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => v.startsWith('--') ? [...a, [v.slice(2), all[i+1] && !all[i+1].startsWith('--') ? all[i+1] : true]] : a, []));
const { chromium } = await import(args.playwright || 'playwright');
const SET = path.resolve(args.set), APP = path.resolve(args.app || '../..'), NM = path.resolve(args.tess);
const truth = JSON.parse(fs.readFileSync(path.join(SET, 'truth.json')));
const FIELDS = ['brand','line','fiber','weightCategory','skeinYardage','skeinWeightGrams','colorway','dyeLot'];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', e => console.log('pageerror', e.message));
await page.route('**/*', async route => {
  const u = new URL(route.request().url());
  if(u.hostname === 'app.test'){ const f = path.join(APP, u.pathname); return fs.existsSync(f) ? route.fulfill({ path:f, contentType: f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html' }) : route.fulfill({ status:404 }); }
  if(u.hostname === 'img.test') return route.fulfill({ path: path.join(SET, u.pathname.slice(1)), contentType:'image/jpeg' });
  if(u.hostname === 'cdn.jsdelivr.net'){
    const m = u.pathname.replace(/^\/npm\//,'').match(/^(@[^/]+\/[^/@]+|[^/@]+)(?:@[^/]+)?\/(.*)$/);
    const f = m && path.join(NM, m[1], m[2]);
    if(f && fs.existsSync(f)) return route.fulfill({ path:f, headers:{'access-control-allow-origin':'*'}, contentType: f.endsWith('.wasm')?'application/wasm':f.endsWith('.gz')?'application/gzip':'text/javascript' });
  }
  return route.fulfill({ status:404 });
});
await page.goto('http://app.test/demo.html'); await page.waitForTimeout(1000);
await page.evaluate(t => {
  YARN_PRESETS.push(...t.presets.filter(p => !YARN_PRESETS.some(q => q.brand===p.brand && q.line===p.line)));
  t.stash.forEach((s,i) => STATE.yarns.push({ id:'stash'+i, brand:s.brand, line:s.line, weightCategory:'DK', yardageRemaining:0, colorHex:'#777' }));
}, truth);
const norm = v => v == null ? null : String(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9%]+/g,' ').trim();
const per = Object.fromEntries(FIELDS.map(f => [f, { right:0, total:0 }]));
let right = 0, total = 0, ms = 0;
const names = Object.keys(truth.labels);
for(const name of names){
  const out = await page.evaluate(async url => {
    const blob = await (await fetch(url)).blob();
    const t0 = performance.now();
    const file = new File([blob], 'label.jpg', { type:'image/jpeg' });
    let p;
    if(typeof readYarnLabel === 'function') p = await readYarnLabel(file);
    else { await ensureTesseractLoaded(); const { data } = await Tesseract.recognize(file, 'eng'); p = parseYarnLabel(data.text || ''); p._text = data.text; }   // older versions of the app
    p._ms = performance.now() - t0; return p;
  }, `http://img.test/${name}.jpg`);
  ms += out._ms;
  const exp = truth.labels[name], miss = [];
  for(const f of FIELDS){
    const ok = norm(out[f]) === norm(exp[f]);
    per[f].total++; total++; if(ok){ per[f].right++; right++; } else miss.push(`${f}: got ${JSON.stringify(out[f])} want ${JSON.stringify(exp[f])}`);
  }
  if(args.show && miss.length) console.log(`${name}\n  ` + miss.join('\n  ') + (args.text ? `\n  TEXT ${JSON.stringify(out._text)}` : ''));
}
console.log(FIELDS.map(f => `${f} ${per[f].right}/${per[f].total}`).join(' · '));
console.log(`SCORE ${right}/${total} (${(100*right/total).toFixed(1)}%) · avg ${Math.round(ms/names.length)} ms/label`);
await browser.close();
