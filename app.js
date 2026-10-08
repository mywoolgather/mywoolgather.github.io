/* =================================================================
   Design tokens / constants
================================================================= */
const STATUS_COLORS = { Planned:'#6E6178', WIP:'#8B5FA3', Finished:'#3E6B49', Frogged:'#7A2F4B' };
const CHART_COLORS = ['#3E6B49','#5C3A72','#9B7EC0','#8FAF7C','#6E6178'];
const WEIGHTS = ["Lace","Fingering","Sport","DK","Worsted","Bulky","Super Bulky"];
/* Display metadata for weight categories — CYC number + common aliases so
   people whose brand uses a different term (8-ply, chunky, etc.) recognize
   it. Keys must match WEIGHTS exactly; internal values/order are unchanged
   so Palette Lab weight-matching and existing saved yarns keep working.
   (Letter-group systems e.g. Drops A–F are on the backlog — not standardized
   enough to map reliably.) */
const WEIGHT_META = {
  "Lace":        { cyc:0, aliases:["cobweb","2-ply","thread","light fingering"] },
  "Fingering":   { cyc:1, aliases:["sock","4-ply","super fine","baby"] },
  "Sport":       { cyc:2, aliases:["5-ply","fine"] },
  "DK":          { cyc:3, aliases:["light worsted","8-ply","double knit"] },
  "Worsted":     { cyc:4, aliases:["aran","afghan","heavy worsted","10-ply","12-ply"] },
  "Bulky":       { cyc:5, aliases:["chunky","craft","14-ply"] },
  "Super Bulky": { cyc:6, aliases:["super chunky","roving"] }
};
function weightLabel(name){
  const m = WEIGHT_META[name];
  if(!m) return name;
  const alias = m.aliases && m.aliases.length ? ` (${m.aliases.slice(0,2).join(', ')})` : '';
  return `${m.cyc} · ${name}${alias}`;
}
/* Migration: "Aran" used to be its own weight category, sitting between
   Worsted and Bulky. Per standard weight-conversion references (UK Aran =
   US Worsted = CYC 4), it's the same weight under a different regional
   name, not a distinct level — so it's now folded into Worsted everywhere
   (dropdown, matching, OCR). Any yarn saved with the old value is
   normalized on load so it keeps matching and displaying correctly. */
function normalizeLegacyYarn(y){
  if(!y) return y;
  if(y.weightCategory === 'Aran') y = { ...y, weightCategory: 'Worsted' };
  // Scraps: before partial balls were tracked individually, a yarn was either
  // flagged isScrap or simply had a remaining length that wasn't a whole
  // number of skeins. Turn that leftover part into one scrap so it can be
  // re-weighed and picked from when recording project usage.
  if(!Array.isArray(y.scraps)){
    const sy = Number(y.skeinYardage)||0, rem = Number(y.yardageRemaining)||0;
    let part = 0;
    if(sy>0 && rem>0) part = (y.isScrap && rem<sy) ? rem : Math.round(rem % sy);
    else if(y.isScrap && rem>0) part = rem;
    y = { ...y, scraps: part>=1 && (sy===0 || part<sy) ? [{ id: uid(), yards: Math.round(part) }] : [] };
  }
  return y;
}
const STATUSES = ["Planned","WIP","Finished","Frogged"];
const GARMENT_SIZES = ["XS","S","M","L","XL","2X","3X","One size"];
const HARMONIES = ["Complementary","Analogous","Triadic","Split-Complementary"];

/* Only this account sees and can use the "Add preset" admin panel.
   Enforced here for the UI, and separately in Firestore security rules
   for the actual write — the UI check alone would not stop someone
   from calling the write directly, so both layers matter. */
const ADMIN_EMAIL = "miknorton19@gmail.com";
/* URL of the deployed "linkPreview" Cloud Function — see setup notes.
   Fill this in after deploying; until then, pattern/blog links just fall
   back to a plain bookmark card with the domain name, same as before. */
const LINK_PREVIEW_ENDPOINT = "https://linkpreview-deanu6jutq-uc.a.run.app";
function isAdmin(){ return !!(STATE.user && STATE.user.email === ADMIN_EMAIL); }
/* True when the viewport is in mobile layout territory — matches the CSS
   breakpoint so JS behavior and CSS stay in agreement. */
function isMobile(){ return window.matchMedia('(max-width:760px), (max-height:550px) and (max-width:950px)').matches; }
/* On mobile, forms are elevated into a full-screen slide-up overlay with
   their own Cancel/Save bar. On desktop this is a no-op passthrough so the
   form stays inline exactly as before. `saveCall`/`cancelCall` are the JS
   the top bar's buttons fire; the form's own submit still works too. */
function wrapFormForMobile(innerHTML, title, saveCall, cancelCall){
  if(!isMobile()) return innerHTML;
  return `<div class="fullscreen-form">
    <div class="fs-bar">
      <button class="fs-cancel" onclick="${cancelCall}">Cancel</button>
      <span class="fs-title">${esc(title)}</span>
      <button class="fs-save" onclick="${saveCall}">Save</button>
    </div>
    <div class="fs-body">${innerHTML}</div>
  </div>`;
}
/* Lock/unlock background scroll when a full-screen form is showing. */
function syncFormScrollLock(){
  const anyFormOpen = (STATE.showYarnForm || STATE.showProjectForm || STATE.showPatternForm) && isMobile();
  document.body.classList.toggle('form-open', anyFormOpen);
}

/* Curated brand/line presets — approximate specs, always double-check the ball band.
   Stored as a flat array (not nested) so it maps cleanly onto a Firestore array-of-maps
   field, which is much easier to hand-edit in the Firebase console than nested maps.
   This hardcoded list is only the fallback used before Firestore responds, or if the
   Firestore read fails for any reason — see loadPresetsFromFirestore(). */
let YARN_PRESETS = [
  { brand:"Cascade Yarns", line:"220", fiber:"100% Peruvian Highland Wool", weightCategory:"Worsted", skeinWeightGrams:100, skeinYardage:220 },
  { brand:"Cascade Yarns", line:"220 Superwash", fiber:"100% Superwash Wool", weightCategory:"Worsted", skeinWeightGrams:100, skeinYardage:220 },
  { brand:"Cascade Yarns", line:"Heritage", fiber:"75% Superwash Merino Wool, 25% Nylon", weightCategory:"Fingering", skeinWeightGrams:100, skeinYardage:437 },
  { brand:"Malabrigo", line:"Rios", fiber:"100% Superwash Merino Wool", weightCategory:"Worsted", skeinWeightGrams:100, skeinYardage:210 },
  { brand:"Drops", line:"Nepal", fiber:"65% Wool, 35% Alpaca", weightCategory:"Worsted", skeinWeightGrams:50, skeinYardage:82 },
  { brand:"Lion Brand", line:"Wool-Ease", fiber:"80% Acrylic, 20% Wool", weightCategory:"Worsted", skeinWeightGrams:85, skeinYardage:197 },
  { brand:"Lion Brand", line:"Wool-Ease Thick & Quick", fiber:"80% Acrylic, 20% Wool", weightCategory:"Super Bulky", skeinWeightGrams:170, skeinYardage:106 },
  { brand:"Lion Brand", line:"24/7 Cotton", fiber:"100% Mercerized Cotton", weightCategory:"Worsted", skeinWeightGrams:100, skeinYardage:186 },
  { brand:"Knit Picks", line:"Wool of the Andes Worsted", fiber:"100% Peruvian Highland Wool", weightCategory:"Worsted", skeinWeightGrams:50, skeinYardage:110 },
  { brand:"Berroco", line:"Vintage", fiber:"52% Acrylic, 40% Wool, 8% Nylon", weightCategory:"Worsted", skeinWeightGrams:100, skeinYardage:218 },
  { brand:"Red Heart", line:"Super Saver", fiber:"100% Acrylic", weightCategory:"Worsted", skeinWeightGrams:198, skeinYardage:364 }
];
function presetBrands(){ return [...new Set(YARN_PRESETS.map(p=>p.brand))]; }
function presetLinesForBrand(brand){ return YARN_PRESETS.filter(p=>p.brand===brand); }
function findPreset(brand,line){ return YARN_PRESETS.find(p=>p.brand===brand && p.line===line); }

/* =================================================================
   State
================================================================= */
let STATE = {
  yarns: [],
  projects: [],
  tab: 'overview',
  loading: true,
  authChecked: false,
  user: null,
  showYarnForm: false,
  showProjectForm: false,
  editingYarnId: null,
  editingProjectId: null,
  settingsOpen: false,
  online: (typeof navigator !== 'undefined' ? navigator.onLine : true),
  paletteBaseId: null,
  paletteHarmony: 'Complementary',
  paletteMatchMode: 'balanced',
  paletteIncludeNeutral: false,
  paletteSlotChoice: {},          // slot index -> chosen candidate index (cycling)
  paletteSavedPalettes: [],       // loaded from Firestore alongside yarns/projects
  shoppingList: [],               // saved shopping-list items (gaps to buy)
  inStoreColor: null,             // hex captured from an in-store skein photo
  inStoreExtracted: [],           // candidate colors from the photo
  showShoppingForm: false,
  editingShoppingId: null,
  authMode: 'signin',
  unitPref: 'yd',   // 'yd' | 'm' — display/input unit; storage is always yards
  theme: 'device', // 'light' | 'dark' | 'device'
  preferencesSetup: false,
  expandedCounters: null,   // project id whose counter panel is open
  stashSearch: '',
  stashFilterWeight: 'All weights',
  stashFilterFiber: 'All fibers',
  stashFilterScrap: 'all',
  gauge: {            // standalone gauge calculator inputs (session-held)
    craft:'knit', terms:'us', stitchType:'', needleSize:'',
    measUnit:'in',
    sts:'', swW:4,          // stitches counted across a measured width
    rows:'', swH:4,         // rows counted down a measured height
    targetSts:'', targetRows:'', patSts:'', patRows:'',   // pattern gauge + counts to convert
    sizeW:'', sizeL:'', multiple:'', multPlus:'',         // size → stitches/rows
    shapeSts:'', shapeN:'', shapeKind:'inc',              // even increases/decreases
    open:{ size:true }
  },
  stashSort: 'recent',
  patterns: [],                   // pattern library
  orderImport: null,              // { items|null, store, date } while importing an order
  showPatternForm: false,
  editingPatternId: null,
  patternSearch: '',
  patternFilterStatus: 'all',
  patternFilterCraft: 'all',
  patternSort: 'recent',
  projFilterStatus: 'All statuses',
  projSort: 'recent',
};
let pendingColorHex = '#5C3A72';
let extractedSwatches = [];
let pendingYarnIsMulticolor = false;
let pendingYarnScraps = [];   // scraps being edited in the yarn form ({id, yards})
let pendingYarnColors = [];
let pendingYarnPrimaryIndex = 0;
let pendingYarnMatchMode = 'simple'; // 'simple' | 'full' — only meaningful for 2-3 color yarns
let multicolorExtractedSwatches = [];
let colorDragSrcIndex = null;
let pendingProjectYarnIds = [];
let pendingProjectYarnUsage = [];
let pendingProjectYarnRequired = [];
let pendingProjectLinks = [];
let pendingProjectPhotos = [];
let pendingProjectCounters = [];
let fiberChartInstance = null;
let statusChartInstance = null;

/* =================================================================
   Storage — Firebase Auth + Firestore.
   window.FB is set up by the <script type="module"> block near the
   bottom of <head>/<body> (see FIREBASE SETUP below). All calls here
   go through that bridge so this script can stay a plain, non-module
   script (needed for inline onclick="..." handlers to work).
================================================================= */
async function persist(){
  if(!STATE.user) return;
  try{
    await window.FB.saveUserData(STATE.user.uid, { yarns: STATE.yarns, projects: STATE.projects, palettes: STATE.paletteSavedPalettes, shoppingList: STATE.shoppingList, patterns: STATE.patterns, prefs: {unitPref: STATE.unitPref, theme: STATE.theme, preferencesSetup: true, stashSort: STATE.stashSort, projSort: STATE.projSort, patternSort: STATE.patternSort} });
  }catch(e){
    console.error('Save failed', e);
    wgToast("Couldn't save to your account — check your connection and try again.", "error");
  }
}
/* Theme — resolves 'device' to the OS preference, applies via a data-theme
   attribute + color-scheme so the browser renders form controls correctly. */
function getResolvedTheme(){
  if(STATE.theme === 'dark') return 'dark';
  if(STATE.theme === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme(){
  const theme = getResolvedTheme();
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
// When set to 'device', follow live OS theme changes.
const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
themeMedia.addEventListener?.('change', () => {
  if(STATE.theme === 'device') applyTheme();
});
/* Deferred save for high-frequency edits (row counters). Increments update
   in-memory immediately; the write is deferred to a 10-second safety
   checkpoint, and flushed immediately when the page is hidden/closed — so a
   normal exit always persists and the worst-case crash loss is ~10s of taps.
   No per-tap write (would spam Firestore) and no nagging "unsaved" warning. */
let _pendingCheckpoint = null;
function persistSoon(){
  if(_pendingCheckpoint) return;               // already scheduled
  _pendingCheckpoint = setTimeout(()=>{ _pendingCheckpoint = null; persist(); }, 10000);
}
function flushPending(){
  if(_pendingCheckpoint){ clearTimeout(_pendingCheckpoint); _pendingCheckpoint = null; persist(); }
}
/* Preserve an open Add/Edit form across tab-switches (e.g. user leaves to
   convert meters or look up a colorway, then returns). We snapshot every
   form field's current value when the page hides, and restore them when it
   comes back if a form is still open — so nothing typed is lost. In-session
   only; not persisted to the account. */
let _formSnapshot = null;
function snapshotOpenForm(){
  if(!(STATE.showYarnForm || STATE.showProjectForm || STATE.showShoppingForm || STATE.showPatternForm)) { _formSnapshot = null; return; }
  const form = document.querySelector('#inner-tab-content form, .fullscreen-form form');
  if(!form) return;
  const snap = {};
  form.querySelectorAll('input, select, textarea').forEach(el=>{
    if(el.id) snap[el.id] = (el.type==='checkbox') ? el.checked : el.value;
  });
  _formSnapshot = snap;
}
function restoreOpenForm(){
  if(!_formSnapshot) return;
  const form = document.querySelector('#inner-tab-content form, .fullscreen-form form');
  if(!form){ _formSnapshot = null; return; }
  Object.entries(_formSnapshot).forEach(([id,val])=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(el.type==='checkbox') el.checked = val; else el.value = val;
  });
  _formSnapshot = null;
}
// Flush pending saves + snapshot open forms on backgrounding; restore on return.
if(typeof window !== 'undefined'){
  window.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState==='hidden'){ flushPending(); snapshotOpenForm(); }
    else if(document.visibilityState==='visible'){ restoreOpenForm(); }
  });
  window.addEventListener('pagehide', ()=>{ flushPending(); snapshotOpenForm(); });
  window.addEventListener('beforeunload', flushPending);
}
async function loadPresetsFromFirestore(){
  try{
    const remote = await window.FB.loadPresets();
    if(remote && Array.isArray(remote) && remote.length){ YARN_PRESETS = remote; return; }
    // Nothing in Firestore yet — seed it once with the built-in defaults.
    // The security rules only allow this "create" the very first time;
    // after that the doc exists and further client writes are rejected,
    // so editing afterward happens in the Firebase console.
    await window.FB.seedPresetsIfEmpty(YARN_PRESETS);
  }catch(e){
    console.warn('Using built-in yarn presets (Firestore presets unavailable):', e);
  }
}

/* =================================================================
   Utilities
================================================================= */
function uid(){ return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()).slice(2); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
/* After any save, jump back to the top of the page so the user lands on the
   list (where a new entry shows first under the default "Newest" sort) rather
   than wherever the long form left the scroll position. */
function scrollToTop(){
  requestAnimationFrame(()=> window.scrollTo({ top:0, behavior:'auto' }));
}
function setSort(key, value){
  STATE[key] = value;
  renderTab();
  persist();   // sort choice is remembered on the account
}
function daysBetween(a,b){ const d = Math.round((new Date(b) - new Date(a)) / 86400000); return Number.isFinite(d) ? d : null; }
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* In-app dialogs + toasts — Promise-based, replace browser prompt/confirm/alert. */
function wgToast(message, kind){
  const root = document.getElementById('wg-toast-root');
  if(!root){ return; }
  const t = document.createElement('div');
  t.className = 'wg-toast' + (kind ? ' '+kind : '');
  t.textContent = message;
  root.appendChild(t);
  requestAnimationFrame(()=> t.classList.add('show'));
  setTimeout(()=>{
    t.classList.remove('show');
    setTimeout(()=> t.remove(), 250);
  }, 3200);
}
function wgConfirm(message, { title='Are you sure?', okLabel='Confirm', danger=false } = {}){
  return new Promise(resolve=>{
    const root = document.getElementById('wg-modal-root');
    root.innerHTML = `<div class="wg-modal-backdrop" id="wg-modal-bd">
      <div class="wg-modal" role="dialog" aria-modal="true">
        <h3>${esc(title)}</h3>
        <p>${esc(message)}</p>
        <div class="wg-modal-actions">
          <button class="btn btn-ghost" id="wg-cancel">Cancel</button>
          <button class="btn btn-primary" id="wg-ok" style="${danger?'background:var(--wine);':''}">${esc(okLabel)}</button>
        </div>
      </div>
    </div>`;
    const bd = document.getElementById('wg-modal-bd');
    requestAnimationFrame(()=> bd.classList.add('open'));
    const close = (val)=>{ bd.classList.remove('open'); setTimeout(()=>{ root.innerHTML=''; }, 160); resolve(val); };
    document.getElementById('wg-ok').onclick = ()=> close(true);
    document.getElementById('wg-cancel').onclick = ()=> close(false);
    bd.onclick = (e)=>{ if(e.target===bd) close(false); };
  });
}
function wgPrompt(message, { title='', defaultValue='', okLabel='Save', placeholder='' } = {}){
  return new Promise(resolve=>{
    const root = document.getElementById('wg-modal-root');
    root.innerHTML = `<div class="wg-modal-backdrop" id="wg-modal-bd">
      <div class="wg-modal" role="dialog" aria-modal="true">
        ${title?`<h3>${esc(title)}</h3>`:''}
        ${message?`<p>${esc(message)}</p>`:''}
        <input id="wg-input" type="text" value="${esc(defaultValue)}" placeholder="${esc(placeholder)}" />
        <div class="wg-modal-actions">
          <button class="btn btn-ghost" id="wg-cancel">Cancel</button>
          <button class="btn btn-primary" id="wg-ok">${esc(okLabel)}</button>
        </div>
      </div>
    </div>`;
    const bd = document.getElementById('wg-modal-bd');
    const input = document.getElementById('wg-input');
    requestAnimationFrame(()=>{ bd.classList.add('open'); input.focus(); input.select(); });
    const close = (val)=>{ bd.classList.remove('open'); setTimeout(()=>{ root.innerHTML=''; }, 160); resolve(val); };
    document.getElementById('wg-ok').onclick = ()=> close(input.value);
    document.getElementById('wg-cancel').onclick = ()=> close(null);
    input.onkeydown = (e)=>{ if(e.key==='Enter') close(input.value); if(e.key==='Escape') close(null); };
    bd.onclick = (e)=>{ if(e.target===bd) close(null); };
  });
}
function yarnTotalYardage(y){ return (Number(y.skeinYardage)||0) * (Number(y.quantity)||0); }
/* Scraps / partial balls. yardageRemaining stays the yarn's total on hand;
   `scraps` lists the partial balls inside that total, so
       full-skein length = yardageRemaining − sum(scraps).
   Several scraps of one colorway live on the same entry. */
function yarnScraps(y){ return (y && Array.isArray(y.scraps)) ? y.scraps : []; }
function scrapYards(y){ return yarnScraps(y).reduce((s,c)=>s+(Number(c.yards)||0), 0); }
function fullYards(y){ return Math.max(0, (Number(y.yardageRemaining)||0) - scrapYards(y)); }
function fullSkeinCount(y){
  const sy = Number(y.skeinYardage)||0;
  return sy>0 ? Math.round(fullYards(y)/sy*10)/10 : null;
}
function yardsToGrams(y, yards){
  const sg = Number(y.skeinWeightGrams)||0, sy = Number(y.skeinYardage)||0;
  return sg>0 && sy>0 ? Math.round(yards/sy*sg) : null;
}
function gramsToYards(y, grams){
  const sg = Number(y.skeinWeightGrams)||0, sy = Number(y.skeinYardage)||0;
  return sg>0 && sy>0 ? Math.round(grams/sg*sy) : null;
}
function scrapLabel(y, c){
  const g = yardsToGrams(y, c.yards);
  return g!=null ? `${g} g` : `${toDisplayLength(c.yards)} ${unitLabel()}`;
}
/* Record `yards` used from a yarn, taken from `source`: 'new' (open fresh
   skeins — whatever's left of the last one opened becomes a new scrap) or a
   scrap id (that scrap shrinks; once used up it disappears). Pure: returns
   the updated yarn. */
function applyYarnUse(y, yards, source){
  yards = Math.max(0, Math.round(Number(yards)||0));
  let scraps = yarnScraps(y).map(c=>({ ...c }));
  if(source && source!=='new'){
    const c = scraps.find(cc=>cc.id===source);
    const have = c ? (Number(c.yards)||0) : 0;
    if(c && yards > have){
      // Finished the scrap and kept going: the rest comes from a new skein.
      const rest = { ...y, scraps: scraps.filter(cc=>cc.id!==source), yardageRemaining:(Number(y.yardageRemaining)||0) - have };
      return applyYarnUse(rest, yards - have, 'new');
    }
    if(c) c.yards = have - yards;
    scraps = scraps.filter(cc=>cc.yards>0);
  } else {
    const sy = Number(y.skeinYardage)||0, full = fullYards(y);
    const take = Math.min(yards, full);
    if(sy>0 && take>0){
      const opened = Math.ceil(take/sy);
      const leftover = Math.round(Math.min(opened*sy, full) - take);
      if(leftover>0) scraps.push({ id: uid(), yards: leftover });
    }
  }
  return { ...y, scraps, yardageRemaining: (Number(y.yardageRemaining)||0) - yards };
}
/* Length units. Storage is always canonical yards; these convert only at the
   display/input edges based on the user's preference. */
const YD_PER_M = 1.0936133;
function unitLabel(){ return STATE.unitPref === 'm' ? 'm' : 'yd'; }
function toDisplayLength(yards){          // canonical yd -> shown value
  const v = STATE.unitPref === 'm' ? (Number(yards)||0) / YD_PER_M : (Number(yards)||0);
  return Math.round(v);
}
function fromInputLength(shown){          // user-entered value -> canonical yd
  const n = Number(shown)||0;
  return STATE.unitPref === 'm' ? Math.round(n * YD_PER_M) : n;
}
function yarnStatus(y){ return y.status || 'available'; }
/* "Brand - Line - Colorway" for Palette Lab, since that's where knowing
   exactly which skein you're looking at matters most. Falls back
   gracefully for yarn saved before brand/line were split out. */
function yarnDisplayName(y){
  const parts = [];
  if(y.brand) parts.push(y.brand);
  if(y.line) parts.push(y.line);
  if(parts.length===0 && y.name) parts.push(y.name);
  if(y.colorway) parts.push(y.colorway);
  return parts.join(' - ') || y.name || 'Unnamed yarn';
}
/* Prefer summing real per-yarn tracked usage; fall back to the simple
   lump total for projects that never used the per-yarn picker. */
function projectYardageUsed(p){
  if(p.yarnUsage && p.yarnUsage.length){
    return p.yarnUsage.reduce((s,u)=>s+(Number(u.yardageUsed)||0),0);
  }
  return Number(p.yardageUsed)||0;
}
/* Per-yarn yardage gap for a project: for each linked yarn with a "need"
   set, shortfall = need − that yarn's remaining stock. Summed across all
   linked yarns. Returns null if no per-yarn requirements are set. */
function projectYardageGap(p){
  const reqs = p.yarnRequired || [];
  if(!reqs.length) return null;
  let required=0, shortfall=0;
  reqs.forEach(r=>{
    const need = Number(r.yardage)||0;
    if(!need) return;
    required += need;
    const y = STATE.yarns.find(yy=>yy.id===r.yarnId);
    const have = y ? (Number(y.yardageRemaining)||0) : 0;
    if(need > have) shortfall += (need - have);
  });
  if(required===0) return null;
  return { required, gap: Math.max(0, shortfall) };
}

/* Color math */
function hexToRgb(hex){
  const m = (hex||'#999999').replace('#','');
  const full = m.length===3 ? m.split('').map(c=>c+c).join('') : m;
  const bigint = parseInt(full,16) || 0;
  return [(bigint>>16)&255, (bigint>>8)&255, bigint&255];
}
function rgbToHex([r,g,b]){
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function rgbToHsl([r,g,b]){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h=0,s=0; const l=(max+min)/2;
  if(max!==min){
    const d=max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d + (g<b?6:0); break;
      case g: h=(b-r)/d + 2; break;
      default: h=(r-g)/d + 4;
    }
    h/=6;
  }
  return { h:h*360, s:s*100, l:l*100 };
}
function hexToHsl(hex){ return rgbToHsl(hexToRgb(hex)); }
/* HSL (h in degrees, s/l in %) back to hex — used to build a harmony target
   color: we take the base yarn's saturation & lightness and rotate the hue
   to the harmony angle, giving a realistic "ideal" color to match against. */
function hslToHex(h, s, l){
  h=((h%360)+360)%360; s=Math.max(0,Math.min(100,s))/100; l=Math.max(0,Math.min(100,l))/100;
  const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2;
  let r=0,g=0,b=0;
  if(h<60){r=c;g=x;} else if(h<120){r=x;g=c;} else if(h<180){g=c;b=x;}
  else if(h<240){g=x;b=c;} else if(h<300){r=x;b=c;} else {r=c;b=x;}
  return rgbToHex([(r+m)*255,(g+m)*255,(b+m)*255]);
}

/* ---- Perceptual color science (CIELAB + CIEDE2000) ----
   HSL hue-distance treats all equal degree-steps as equal, but the eye
   doesn't work that way. Converting to CIELAB and measuring CIEDE2000
   "Delta-E" gives a distance that tracks how different two colors actually
   look to a person — accounting for hue, saturation and lightness together,
   weighted perceptually. This is what makes matches feel aesthetic rather
   than arithmetic. */
function srgbToLinear(c){
  c /= 255;
  return c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
}
function rgbToXyz([r,g,b]){
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  // sRGB D65
  return [
    (R*0.4124 + G*0.3576 + B*0.1805) * 100,
    (R*0.2126 + G*0.7152 + B*0.0722) * 100,
    (R*0.0193 + G*0.1192 + B*0.9505) * 100
  ];
}
function xyzToLab([x,y,z]){
  // D65 reference white
  const xn=95.047, yn=100.0, zn=108.883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : (7.787*t + 16/116);
  const fx=f(x/xn), fy=f(y/yn), fz=f(z/zn);
  return { L: 116*fy - 16, a: 500*(fx-fy), b: 200*(fy-fz) };
}
function hexToLab(hex){ return xyzToLab(rgbToXyz(hexToRgb(hex))); }

/* CIEDE2000 — the current standard perceptual color-difference formula. */
function deltaE2000(lab1, lab2){
  const {L:L1,a:a1,b:b1}=lab1, {L:L2,a:a2,b:b2}=lab2;
  const avgL=(L1+L2)/2;
  const C1=Math.hypot(a1,b1), C2=Math.hypot(a2,b2);
  const avgC=(C1+C2)/2;
  const G=0.5*(1-Math.sqrt(Math.pow(avgC,7)/(Math.pow(avgC,7)+Math.pow(25,7))));
  const a1p=a1*(1+G), a2p=a2*(1+G);
  const C1p=Math.hypot(a1p,b1), C2p=Math.hypot(a2p,b2);
  const avgCp=(C1p+C2p)/2;
  const deg=x=>x*180/Math.PI, rad=x=>x*Math.PI/180;
  let h1p=deg(Math.atan2(b1,a1p)); if(h1p<0) h1p+=360;
  let h2p=deg(Math.atan2(b2,a2p)); if(h2p<0) h2p+=360;
  const dLp=L2-L1, dCp=C2p-C1p;
  let dhp=0;
  if(C1p*C2p!==0){
    dhp=h2p-h1p;
    if(dhp>180) dhp-=360; else if(dhp<-180) dhp+=360;
  }
  const dHp=2*Math.sqrt(C1p*C2p)*Math.sin(rad(dhp)/2);
  let avghp;
  if(C1p*C2p===0){ avghp=h1p+h2p; }
  else{
    avghp=(h1p+h2p)/2;
    if(Math.abs(h1p-h2p)>180) avghp += (h1p+h2p<360)?180:-180;
  }
  const T=1 -0.17*Math.cos(rad(avghp-30)) +0.24*Math.cos(rad(2*avghp))
          +0.32*Math.cos(rad(3*avghp+6)) -0.20*Math.cos(rad(4*avghp-63));
  const dTheta=30*Math.exp(-Math.pow((avghp-275)/25,2));
  const Rc=2*Math.sqrt(Math.pow(avgCp,7)/(Math.pow(avgCp,7)+Math.pow(25,7)));
  const Sl=1 + (0.015*Math.pow(avgL-50,2))/Math.sqrt(20+Math.pow(avgL-50,2));
  const Sc=1+0.045*avgCp;
  const Sh=1+0.015*avgCp*T;
  const Rt=-Math.sin(rad(2*dTheta))*Rc;
  return Math.sqrt(
    Math.pow(dLp/Sl,2) + Math.pow(dCp/Sc,2) + Math.pow(dHp/Sh,2)
    + Rt*(dCp/Sc)*(dHp/Sh)
  );
}
/* Weighted Delta-E for the C-tier preferences: scale L / a,b contributions
   so the user can bias toward matching lightness (tonal projects) vs. hue
   (bold contrast) vs. a balanced default. Applied by pre-scaling the LAB
   components before a plain Euclidean-ish combine inside deltaE — simplest
   honest way to expose the knob without re-deriving CIEDE2000 weights. */
function weightedDeltaE(labTarget, labCand, mode){
  const base = deltaE2000(labTarget, labCand);
  if(mode==='balanced' || !mode) return base;
  // Nudge: recompute a simple weighted LAB distance and blend it with the
  // perceptual base so the preference tilts results without ignoring E2000.
  const dL=labTarget.L-labCand.L, da=labTarget.a-labCand.a, db=labTarget.b-labCand.b;
  let wL=1, wAB=1;
  if(mode==='tonal'){ wL=2.2; wAB=0.6; }        // prioritize matching lightness
  else if(mode==='hue'){ wL=0.4; wAB=1.8; }     // prioritize matching hue/chroma
  const weighted=Math.sqrt(wL*dL*dL + wAB*(da*da+db*db));
  return 0.5*base + 0.5*weighted;
}
/* Turn a Delta-E-ish distance into a friendly 0–100 closeness score.
   ~0 ΔE = identical (100%); the eye stops caring much past ~40, so we map
   that range onto the percentage with a gentle curve. Higher = better. */
function closenessPercent(distance){
  const pct = 100 * Math.max(0, 1 - distance/60);
  return Math.round(pct);
}
/* Woolgather's own color vocabulary — a curated set of named regions in
   color space. nameColor() maps any hex to the perceptually-nearest name
   (via LAB/Delta-E, same engine as matching). These are sensible common
   names, NOT manufacturer colorway names — used for dream matches and
   shopping specs so "shop for sage green" reads better than a hex code. */
const COLOR_NAMES = [
  ['Black','#1c1c1c'],['Charcoal','#3a3a3d'],['Slate grey','#5f6670'],['Grey','#9098a1'],
  ['Silver','#c7ccd1'],['Cream','#efe7d3'],['Ivory','#f5f0e1'],['White','#fbfbf8'],
  ['Beige','#d8c6a8'],['Tan','#c8a97e'],['Camel','#b98f5a'],['Brown','#6f4e37'],
  ['Chocolate','#4b3327'],['Rust','#a8432a'],['Terracotta','#c66a45'],['Burnt orange','#c15a1b'],
  ['Orange','#e07b2a'],['Amber','#d99518'],['Mustard','#c6932f'],['Gold','#d4af37'],
  ['Yellow','#e8c93a'],['Chartreuse','#a6c34a'],['Olive','#6f7434'],['Moss','#5a6b3b'],
  ['Sage green','#8faf7c'],['Forest green','#3e6b49'],['Green','#4a9d5a'],['Emerald','#2f8f6b'],
  ['Teal','#3c7a72'],['Turquoise','#3fb2ac'],['Aqua','#6fc7c1'],['Sky blue','#84b6d6'],
  ['Blue','#3f6fb5'],['Navy','#2a3a63'],['Indigo','#3b3a7a'],['Periwinkle','#8f8fd6'],
  ['Lilac','#9b7ec0'],['Lavender','#b7a6d6'],['Purple','#7c4a92'],['Plum','#5c3a72'],
  ['Magenta','#a83a7a'],['Berry','#8a2f55'],['Wine','#7a2f4b'],['Maroon','#5e2436'],
  ['Pink','#e090b0'],['Dusty rose','#c98b95'],['Blush','#e6bcbf'],['Red','#c0392b'],['Coral','#e5786b']
];
function nameColor(hex){
  const lab = hexToLab(hex);
  let best=null, bestD=Infinity;
  for(const [name,h] of COLOR_NAMES){
    const d = deltaE2000(lab, hexToLab(h));
    if(d<bestD){ bestD=d; best=name; }
  }
  return best;
}
function hueDistance(a,b){ const d=Math.abs(a-b)%360; return d>180 ? 360-d : d; }
/* Hard-stop conic gradient — reads as distinct wedges of color in order,
   not a blurred blend, which is what you want when the point is to see
   each color and its position rather than an averaged look. */
function buildConicGradient(colors){
  if(!colors || colors.length===0) return '#ccc';
  if(colors.length===1) return colors[0];
  const step = 100/colors.length;
  const stops = colors.map((c,i)=>`${c} ${(i*step).toFixed(2)}% ${((i+1)*step).toFixed(2)}%`).join(', ');
  return `conic-gradient(${stops})`;
}

/* Browsers can't decode HEIC/HEIF into an <img>/<canvas> — Apple's default
   photo format — so anything picked up as one gets converted to a normal
   JPEG first, entirely client-side, before it ever reaches the resize step
   below or gets uploaded anywhere. */
function looksLikeHeic(file){
  if(!file) return false;
  if(/^image\/hei[cf]/i.test(file.type||'')) return true;
  return /\.hei[cf]$/i.test(file.name||'');
}
async function toRenderableImageBlob(file){
  if(!looksLikeHeic(file)) return file;
  if(typeof heic2any === 'undefined'){
    throw new Error("Couldn't load HEIC support — check your connection and try again, or convert the photo to JPEG first.");
  }
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  return Array.isArray(result) ? result[0] : result;
}
/* A looser check than relying on file.type alone, since some browsers/OSes
   report an empty or generic MIME type for HEIC files picked via a file
   input or drag-and-drop. */
function isAcceptableImageFile(file){
  if(!file) return false;
  if(/^image\//i.test(file.type||'')) return true;
  return /\.(heic|heif|jpe?g|png|gif|webp|bmp)$/i.test(file.name||'');
}

/* Resizes+recompresses an image client-side before it ever leaves the
   browser, so a 8MB phone photo doesn't become an 8MB upload. */
function compressImageFile(file, maxDim=1200, quality=0.82){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if(width > maxDim || height > maxDim){
        if(width > height){ height = Math.round(height * maxDim/width); width = maxDim; }
        else { width = Math.round(width * maxDim/height); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        blob ? resolve(blob) : reject(new Error('Could not process image'));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')); };
    img.src = url;
  });
}

function kMeansColors(pixels, k=5, iterations=6){
  if(pixels.length===0) return [];
  const kk = Math.min(k, pixels.length);
  const centroids = [];
  const step = Math.max(1, Math.floor(pixels.length/kk));
  for(let i=0;i<kk;i++) centroids.push(pixels[Math.min(i*step, pixels.length-1)].slice());
  let assignments = new Array(pixels.length).fill(0);
  for(let iter=0; iter<iterations; iter++){
    for(let i=0;i<pixels.length;i++){
      let best=0, bestDist=Infinity;
      for(let c=0;c<centroids.length;c++){
        const dr = pixels[i][0]-centroids[c][0];
        const dg = pixels[i][1]-centroids[c][1];
        const db = pixels[i][2]-centroids[c][2];
        const d = dr*dr+dg*dg+db*db;
        if(d<bestDist){ bestDist=d; best=c; }
      }
      assignments[i]=best;
    }
    const sums = centroids.map(()=>[0,0,0,0]);
    for(let i=0;i<pixels.length;i++){
      const c = assignments[i];
      sums[c][0]+=pixels[i][0]; sums[c][1]+=pixels[i][1]; sums[c][2]+=pixels[i][2]; sums[c][3]+=1;
    }
    for(let c=0;c<centroids.length;c++){
      if(sums[c][3]>0) centroids[c] = [sums[c][0]/sums[c][3], sums[c][1]/sums[c][3], sums[c][2]/sums[c][3]];
    }
  }
  const counts = new Array(centroids.length).fill(0);
  assignments.forEach(a=>counts[a]++);
  return centroids.map((c,i)=>({hex:rgbToHex(c), count:counts[i]}))
    .filter(c=>c.count>0)
    .sort((a,b)=>b.count-a.count);
}

function categorizeFiber(text){
  const t = (text||'').toLowerCase();
  const map = [
    ["Wool",["wool","merino","shetland","lambswool"]],
    ["Alpaca",["alpaca"]],
    ["Cotton",["cotton"]],
    ["Acrylic",["acrylic"]],
    ["Silk",["silk"]],
    ["Linen",["linen","flax"]],
    ["Mohair",["mohair"]],
    ["Cashmere",["cashmere"]],
    ["Bamboo",["bamboo"]]
  ];
  for(const [label,keys] of map) if(keys.some(k=>t.includes(k))) return label;
  if(!t.trim()) return "Unspecified";
  return "Other / blend";
}

/* =================================================================
   Label OCR parsing — turns raw OCR text into confident field guesses.
   Philosophy (from the trustworthiness research): only fill a field when
   we're reasonably confident; a blank beats a confident-wrong guess. We
   reconcile against known vocabulary (brands from presets, weight names,
   fiber terms) rather than trusting the raw read. The photo → text step
   is tesseract.js; this function is the "make sense of it" step.
================================================================= */
function parseYarnLabel(rawText){
  const text = rawText || '';
  const lower = text.toLowerCase();
  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
  const out = { brand:null, line:null, fiber:null, weightCategory:null, skeinYardage:null, skeinWeightGrams:null, colorway:null, dyeLot:null };

  // --- Brand: match against known preset brands (fuzzy, case-insensitive) ---
  const brands = presetBrands();
  for(const b of brands){
    if(lower.includes(b.toLowerCase())){ out.brand = b; break; }
  }
  // If brand found, try to find its matching line from presets in the text.
  if(out.brand){
    const lines2 = YARN_PRESETS.filter(p=>p.brand===out.brand);
    for(const p of lines2){
      if(lower.includes(p.line.toLowerCase())){ out.line = p.line; break; }
    }
  }

  // --- Weight category: match known weight words (+ common synonyms) ---
  const weightSynonyms = {
    'Lace':['lace','2 ply','2-ply'],
    'Fingering':['fingering','sock','4 ply','4-ply','super fine'],
    'Sport':['sport'],
    'DK':['dk','double knit','light worsted'],
    'Worsted':['worsted','afghan','medium','aran','10 ply','10-ply'],
    'Bulky':['bulky','chunky','12 ply'],
    'Super Bulky':['super bulky','super chunky','roving']
  };
  for(const [cat,syns] of Object.entries(weightSynonyms)){
    if(syns.some(s=>lower.includes(s))){ out.weightCategory = cat; break; }
  }

  // --- Fiber: only accept if a known fiber term appears (reuse categorizer) ---
  const fiberTerms = ['wool','merino','alpaca','cotton','acrylic','silk','linen','flax','mohair','cashmere','bamboo','nylon','polyester','superwash'];
  if(fiberTerms.some(t=>lower.includes(t))){
    // Try to grab the actual fiber phrase (e.g. "100% Superwash Merino Wool").
    const fiberLine = lines.find(l=>/%|\bwool\b|\bcotton\b|\bacrylic\b|\balpaca\b|\bmerino\b/i.test(l) && l.length<60);
    out.fiber = fiberLine || null;
  }

  // --- Yardage: look for "### yd/yds/yards" or "### m/meters" ---
  const ydMatch = text.match(/(\d{2,4})\s*(?:yd|yds|yards|yardage)/i);
  const mMatch = text.match(/(\d{2,4})\s*(?:m|meter|meters|metres)\b/i);
  if(ydMatch) out.skeinYardage = Number(ydMatch[1]);
  else if(mMatch) out.skeinYardage = Math.round(Number(mMatch[1]) * 1.0936); // m→yd

  // --- Skein weight: "### g/grams/gr" or "### oz" ---
  const gMatch = text.match(/(\d{2,4})\s*(?:g|gr|grams|gramme)\b/i);
  const ozMatch = text.match(/([\d.]+)\s*(?:oz|ounce)/i);
  if(gMatch) out.skeinWeightGrams = Number(gMatch[1]);
  else if(ozMatch) out.skeinWeightGrams = Math.round(Number(ozMatch[1]) * 28.35); // oz→g

  // --- Dye lot: "lot ####" or "dye lot: ####" ---
  const lotMatch = text.match(/(?:dye\s*lot|lot|batch)\s*[:#]?\s*([A-Za-z0-9-]{2,12})/i);
  if(lotMatch) out.dyeLot = lotMatch[1];

  // --- Colorway / color number: "color ###" or "colorway: ___" ---
  const colorMatch = text.match(/(?:colou?rway|colou?r|shade)\s*[:#]?\s*([A-Za-z0-9 -]{1,24})/i);
  if(colorMatch) out.colorway = colorMatch[1].trim();

  // Confidence: how many fields did we actually resolve?
  out._fieldsFound = Object.entries(out).filter(([k,v])=>k[0]!=='_' && v!=null && v!=='').length;
  return out;
}

/* Icons (minimal hand-drawn line icons) */
const ICONS = {
  plus: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  trash: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 6 7 20 7"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>',
  upload: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  reset: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12a9 9 0 1 1 3 6.7"/><polyline points="3 17 3 21 7 21"/></svg>',
  palette: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 0 18c1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H16a4 4 0 0 0 4-4c0-4.4-3.6-8-8-8z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>',
  clipboard: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="4" width="10" height="16" rx="1"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 10h6M9 14h6"/></svg>',
  sparkles: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>',
  package: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
  link: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg>',
  pencil: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  book: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
  bookmark: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>',
  image: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  dots: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="5" cy="12" r="0.6"/><circle cx="12" cy="12" r="0.6"/><circle cx="19" cy="12" r="0.6"/></svg>',
  gear: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  cloudoff: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l20 20"/><path d="M5.8 8.02A5 5 0 0 0 6 18h11a4 4 0 0 0 1.9-.48"/><path d="M9.5 5.3A5.5 5.5 0 0 1 18 9a4.5 4.5 0 0 1 2.9 7.5"/></svg>',
  cart: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.4a1.5 1.5 0 0 0 1.5 1.2h8.3a1.5 1.5 0 0 0 1.5-1.2L22 7H6"/></svg>'
};

/* =================================================================
   Master render
================================================================= */
/* Central tab registry — drives both the desktop tab bar and the mobile
   bottom nav. `primary:true` tabs get a permanent slot in the mobile
   bottom bar; the rest live in the "More" sheet. `addLabel` (when set)
   is what the floating + button does on that tab. */
function tabRegistry(){
  const tabs = [
    { id:'overview', label:'Overview', icon:ICONS.clipboard, primary:true },
    { id:'stash', label:'Stash', icon:ICONS.package, primary:true, addLabel:'Add yarn' },
    { id:'projects', label:'Projects', icon:ICONS.sparkles, primary:true, addLabel:'Add project' },
    { id:'patterns', label:'Patterns', icon:ICONS.book, addLabel:'Add pattern' },
    { id:'palette', label:'Palette lab', icon:ICONS.palette },
    { id:'showcase', label:'Showcase', icon:ICONS.image, addLabel:'Add project' },
    { id:'shopping', label:'Shopping list', icon:ICONS.cart },
    { id:'gauge', label:'Gauge calculator', icon:ICONS.clipboard },
  ];
  if(isAdmin()) tabs.push({ id:'presets', label:'Presets', icon:ICONS.bookmark });
  return tabs;
}

function render(){
  const app = document.getElementById('app');

  if(!STATE.authChecked){
    app.innerHTML = `<div class="wrap"><p class="note">Connecting…</p></div>`;
    return;
  }
  if(!STATE.user){
    app.innerHTML = `<div class="wrap">
      <header class="app-header">
        <div><h1>Woolgather</h1><p>A quiet ledger for yarn, thread, and the projects they become.</p></div>
      </header>
      ${renderSignedOut()}
    </div>`;
    return;
  }

  // Signed in but email not verified (password accounts only) — gate the app.
  if(window.FB.isEmailVerified && !window.FB.isEmailVerified()){
    app.innerHTML = `<div class="wrap">
      <header class="app-header">
        <div><h1>Woolgather</h1><p>A quiet ledger for yarn, thread, and the projects they become.</p></div>
      </header>
      ${renderVerifyGate()}
    </div>`;
    return;
  }

  const tabs = tabRegistry();
  const desktopTabs = tabs.map(t =>
    `<button class="${STATE.tab===t.id?'active':''}" onclick="switchTab('${t.id}')">${t.icon} ${t.label}</button>`
  ).join('');

  // Desktop header actions (hidden on mobile via CSS; mobile uses Settings in More)
  const headerRight = window.WG_DEMO
    ? `<div class="header-actions">
         <span class="note">You're viewing a demo</span>
         <a class="btn btn-primary btn-small" href="${window.WG_SIGNUP_URL || '/'}">Create your gathering</a>
         <a class="btn btn-ghost btn-small" href="${window.WG_SIGNUP_URL || '/'}">Log in</a>
       </div>`
    : `<div class="header-actions">
         <span class="note">${esc(STATE.user.displayName || STATE.user.email || 'Signed in')}</span>
         <button class="btn btn-ghost btn-small" onclick="openSettings()">${ICONS.gear} Settings</button>
         <button class="btn btn-ghost btn-small" onclick="window.FB.signOutUser()">Sign out</button>
       </div>`;

  app.innerHTML = `
    <div class="wrap">
      <header class="app-header">
        <div>
          <h1>Woolgather</h1>
          <p class="header-tagline">A quiet ledger for yarn, thread, and the projects they become.</p>
        </div>
        ${headerRight}
      </header>
      ${STATE.online ? '' : `<div class="offline-banner">${ICONS.cloudoff} Offline — viewing only. Reconnect to add or edit.</div>`}
      <nav class="tabs">${desktopTabs}</nav>
      <div id="inner-tab-content"></div>
    </div>
    ${renderMobileNav(tabs)}
    ${renderFab(tabs)}
    ${renderMoreSheet(tabs)}
  `;
  fitTabs();
  renderTab();
}
/* Desktop tab row: one line if the tabs fit (tightening the spacing first),
   otherwise two even rows — never a lone tab wrapped onto a second line. */
function fitTabs(){
  const nav = document.querySelector('nav.tabs');
  if(!nav || !nav.offsetParent) return;          // hidden on mobile
  const n = nav.children.length;
  nav.style.setProperty('--tab-cols', Math.ceil(n/2));
  nav.classList.remove('tight', 'two-rows');
  const overflows = () => nav.scrollWidth > nav.clientWidth + 1;
  if(!overflows()) return;
  nav.classList.add('tight');
  if(!overflows()) return;
  nav.classList.remove('tight');
  nav.classList.add('two-rows');
}

function renderMobileNav(tabs){
  const primary = tabs.filter(t=>t.primary);
  const moreActive = !primary.some(t=>t.id===STATE.tab);
  const primaryBtns = primary.map(t =>
    `<button class="${STATE.tab===t.id?'active':''}" onclick="switchTab('${t.id}')">${t.icon}<span>${t.label}</span></button>`
  ).join('');
  return `<nav class="mobile-nav">
    ${primaryBtns}
    <button class="${moreActive?'active':''}" onclick="openMoreSheet()">${ICONS.dots}<span>More</span></button>
  </nav>`;
}

function renderFab(tabs){
  if(!STATE.online) return '';   // read-only when offline — no add button
  const current = tabs.find(t=>t.id===STATE.tab);
  if(!current || !current.addLabel) return '';
  const action = current.id==='stash' ? 'showYarnForm()' : current.id==='patterns' ? 'showPatternForm()' : 'showProjectForm()';
  return `<button class="fab" onclick="${action}" aria-label="${esc(current.addLabel)}">${ICONS.plus}</button>`;
}

function renderMoreSheet(tabs){
  const secondary = tabs.filter(t=>!t.primary);
  const secItems = secondary.map(t =>
    `<button class="${STATE.tab===t.id?'active':''}" onclick="switchTab('${t.id}'); closeMoreSheet();">${t.icon}<span>${t.label}</span></button>`
  ).join('');
  return `<div class="sheet-backdrop" id="more-sheet" onclick="if(event.target===this)closeMoreSheet()">
    <div class="sheet">
      <div class="sheet-handle"></div>
      ${secItems}
      <div class="sheet-divider"></div>
      <button onclick="closeMoreSheet(); openSettings();">${ICONS.gear}<span>Settings</span></button>
    </div>
  </div>`;
}

function openMoreSheet(){ document.getElementById('more-sheet').classList.add('open'); }
function closeMoreSheet(){ const s=document.getElementById('more-sheet'); if(s) s.classList.remove('open'); }

function openSettings(){
  STATE.settingsOpen = true;
  renderSettingsSheet();
}
function renderSettingsSheet(){
  let existing = document.getElementById('settings-sheet');
  if(existing) existing.remove();
  if(!STATE.settingsOpen) return;
  const div = document.createElement('div');
  div.className = 'sheet-backdrop open';
  div.id = 'settings-sheet';
  div.onclick = (e)=>{ if(e.target===div) closeSettings(); };
  div.innerHTML = window.WG_DEMO
    ? `<div class="sheet">
        <div class="sheet-handle"></div>
        <p style="padding:2px 22px 10px; font-family:'Fraunces',serif; font-weight:600;">You're exploring the demo</p>
        <p class="note" style="padding:0 22px 12px;">Everything here is sample data — changes reset on refresh. Create a free account to build your own stash.</p>
        <a class="btn btn-primary" style="margin:0 22px 8px; display:block; text-align:center;" href="${window.WG_SIGNUP_URL || '/'}">Sign up free</a>
        <a class="btn btn-ghost" style="margin:0 22px 12px; display:block; text-align:center;" href="${window.WG_SIGNUP_URL || '/'}">Log in</a>
        <div class="sheet-divider"></div>
        <button onclick="closeSettings(); openTipJar();">💛<span>Support the developer</span></button>
        <button onclick="closeSettings(); openAbout();">${ICONS.gear}<span>About Woolgather</span></button>
      </div>`
    : `<div class="sheet">
        <div class="sheet-handle"></div>
        <p style="padding:2px 22px 10px; font-family:'Fraunces',serif; font-weight:600;">Settings</p>
        <p class="note" style="padding:0 22px 12px;">${esc(STATE.user.displayName || STATE.user.email || 'Signed in')}</p>
        <div style="padding:0 22px 12px;">
          <span class="note" style="display:block; margin-bottom:6px;">Length unit</span>
          <div style="display:flex; gap:6px;">
            <button class="harmony-btn ${STATE.unitPref==='yd'?'active':''}" onclick="setUnitPref('yd')">Yards</button>
            <button class="harmony-btn ${STATE.unitPref==='m'?'active':''}" onclick="setUnitPref('m')">Meters</button>
          </div>
        </div>
        <div style="padding:0 22px 12px;">
          <span class="note" style="display:block; margin-bottom:6px;">Appearance</span>
          <div style="display:flex; gap:6px;">
            <button class="harmony-btn ${STATE.theme==='light'?'active':''}" onclick="setTheme('light')">Light</button>
            <button class="harmony-btn ${STATE.theme==='dark'?'active':''}" onclick="setTheme('dark')">Dark</button>
            <button class="harmony-btn ${STATE.theme==='device'?'active':''}" onclick="setTheme('device')">Device</button>
          </div>
        </div>
        <button onclick="window.FB.signOutUser()">${ICONS.reset}<span>Sign out</span></button>
        <button onclick="closeSettings(); exportStash('json');">${ICONS.package}<span>Back up my data (JSON)</span></button>
        <button onclick="closeSettings(); exportStash('csv');">${ICONS.package}<span>Export stash (CSV)</span></button>
        <button onclick="closeSettings(); resetAll();" class="danger-text">${ICONS.trash}<span>Clear my data</span></button>
        <div class="sheet-divider"></div>
        <button onclick="closeSettings(); openTipJar();">💛<span>Support the developer</span></button>
        <button onclick="closeSettings(); openAbout();">${ICONS.gear}<span>About Woolgather</span></button>
        <button onclick="closeSettings(); openSupportForm();">${ICONS.link}<span>Contact / support</span></button>
        <button onclick="closeSettings(); startDeleteAccount();" class="danger-text">${ICONS.trash}<span>Delete account</span></button>
      </div>`;
  document.getElementById('app').appendChild(div);
}
function setUnitPref(u){
  STATE.unitPref = u;
  persist();
  renderSettingsSheet();  // refresh the toggle's active state
  renderTab();            // re-render current tab with new units
}
function setTheme(theme){
  STATE.theme = theme;
  applyTheme();
  persist();
  renderSettingsSheet();
}

function completePreferencesSetup(){
  STATE.preferencesSetup = true;
  persist();
  closePreferencesSetup();
}

function closePreferencesSetup(){
  const modal = document.getElementById('preferences-setup');
  if(modal) modal.remove();
}

function showPreferencesSetup(){
  let modal = document.getElementById('preferences-setup');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'preferences-setup';
    modal.className = 'sheet-backdrop open';
    document.body.appendChild(modal);
  }
  modal.innerHTML = buildPreferencesSetupHTML();
}
function buildPreferencesSetupHTML(){
  return `
    <div class="sheet preferences-setup-modal">
      <div class="sheet-head">
        <div>
          <div class="sheet-title">Make WoolGather yours</div>
          <div class="sheet-sub">Choose your preferences. You can change these anytime in Settings.</div>
        </div>
      </div>

      <div class="preferences-setup-body">
        <div class="preferences-group">
          <span class="note">Length unit</span>
          <div class="preferences-options">
            <button class="harmony-btn ${STATE.unitPref === 'yd' ? 'active' : ''}"
              onclick="setSetupPref('unit','yd')">Yards</button>
            <button class="harmony-btn ${STATE.unitPref === 'm' ? 'active' : ''}"
              onclick="setSetupPref('unit','m')">Meters</button>
          </div>
        </div>

        <div class="preferences-group">
          <span class="note">Appearance</span>
          <div class="preferences-options">
            <button class="harmony-btn ${STATE.theme === 'light' ? 'active' : ''}"
              onclick="setSetupPref('theme','light')">Light</button>
            <button class="harmony-btn ${STATE.theme === 'dark' ? 'active' : ''}"
              onclick="setSetupPref('theme','dark')">Dark</button>
            <button class="harmony-btn ${STATE.theme === 'device' ? 'active' : ''}"
              onclick="setSetupPref('theme','device')">Device</button>
          </div>
        </div>

        <button class="preferences-save" onclick="completePreferencesSetup()">
          Save preferences
        </button>
      </div>
    </div>`;
}
/* Sets a preference from the setup modal and refreshes just the modal's
   contents in place (so the active highlight moves) — the old code re-called
   the open function, which early-returned and left the buttons feeling dead. */
function setSetupPref(kind, val){
  if(kind==='unit') STATE.unitPref = val;
  else if(kind==='theme'){ STATE.theme = val; applyTheme(); }
  const modal = document.getElementById('preferences-setup');
  if(modal) modal.innerHTML = buildPreferencesSetupHTML();
}

/* Delete account — deliberately steers toward the less-drastic "Clear all
   data" first, then requires an explicit irreversible confirmation, then
   tears down Firestore data, Storage photos, and the Auth user itself. */
/* Contact / support — an in-app form written to the 'support' Firestore
   collection. A Cloud Function watches that collection and emails it to you
   (see support-email setup). Uses the styled modal, not a browser dialog. */
/* Tip jar — "support the developer." Points at whatever tip links you set in
   window.WG_TIP_LINKS (Ko-fi, Buy Me a Coffee, PayPal, etc.). Opening a real
   payment link is the Prohibited-action-safe approach: it just navigates to
   your funded page; no payment happens inside the app. */
function openTipJar(){
  const links = (typeof window !== 'undefined' && window.WG_TIP_LINKS) || [];
  const root = document.getElementById('wg-modal-root');
  const linkBtns = links.length
    ? links.map(l=>`<a class="btn btn-primary" style="display:block; text-align:center; margin-bottom:8px;" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')
    : `<p class="note">Tip links aren't set up yet.</p>`;
  root.innerHTML = `<div class="wg-modal-backdrop" id="wg-modal-bd">
    <div class="wg-modal" role="dialog" aria-modal="true">
      <h3>Support the developer 💛</h3>
      <p>Woolgather is built and maintained by one person, and it's free to use. If it's saved you a tangled skein or two, a small tip helps keep it running and ad-free.</p>
      ${linkBtns}
      <div class="wg-modal-actions">
        <button class="btn btn-ghost" id="tip-close">Close</button>
      </div>
    </div>
  </div>`;
  const bd = document.getElementById('wg-modal-bd');
  requestAnimationFrame(()=> bd.classList.add('open'));
  const close = ()=>{ bd.classList.remove('open'); setTimeout(()=>{ root.innerHTML=''; }, 160); };
  document.getElementById('tip-close').onclick = close;
  bd.onclick = (e)=>{ if(e.target===bd) close(); };
}
/* About / product info — including the explicit "no generative AI in the
   product" statement. */
function openAbout(){
  const root = document.getElementById('wg-modal-root');
  root.innerHTML = `<div class="wg-modal-backdrop" id="wg-modal-bd">
    <div class="wg-modal" role="dialog" aria-modal="true" style="max-width:460px;">
      <h3>About Woolgather</h3>
      <div style="font-size:0.9rem; line-height:1.55; color:var(--ink); max-height:60vh; overflow-y:auto;">
        <p style="margin:0 0 12px;">Woolgather is a personal fiber-arts companion: a stash tracker, project log, palette lab, and shopping helper for knitters and crocheters. Your yarn, projects, and palettes sync to your account across every device you sign into.</p>
        <p style="margin:0 0 12px;"><strong>How it works.</strong> It's a web app (installable to your home screen) backed by a small, standard cloud database for your account and data. Colour matching uses real colour science — perceptual CIELAB / Delta-E maths — not guesswork. Label scanning runs a classic open-source OCR engine locally in your browser. Everything's designed to work offline for viewing once loaded.</p>
        <p style="margin:0 0 12px;"><strong>No generative AI.</strong> Woolgather does not use generative AI for any part of the product — no AI-generated images, text, colour suggestions, or recommendations. Every feature is built from deterministic code and established colour/OCR algorithms you could trace line by line. What you see is hand-built, not machine-invented.</p>
        <p class="note" style="margin:0;">Made with care by Mikayla Norton.</p>
      </div>
      <div class="wg-modal-actions" style="margin-top:14px;">
        <button class="btn btn-ghost" id="about-close">Close</button>
      </div>
    </div>
  </div>`;
  const bd = document.getElementById('wg-modal-bd');
  requestAnimationFrame(()=> bd.classList.add('open'));
  const close = ()=>{ bd.classList.remove('open'); setTimeout(()=>{ root.innerHTML=''; }, 160); };
  document.getElementById('about-close').onclick = close;
  bd.onclick = (e)=>{ if(e.target===bd) close(); };
}
function openSupportForm(){
  const root = document.getElementById('wg-modal-root');
  root.innerHTML = `<div class="wg-modal-backdrop" id="wg-modal-bd">
    <div class="wg-modal" role="dialog" aria-modal="true">
      <h3>Contact / support</h3>
      <p>Found a bug or have a suggestion? Send it straight to the maker.</p>
      <textarea id="support-msg" rows="4" style="width:100%; box-sizing:border-box; margin-bottom:12px; font-family:inherit; font-size:0.87rem; padding:8px 10px; border-radius:6px; border:1px solid var(--border);" placeholder="What's on your mind?"></textarea>
      <div class="wg-modal-actions">
        <button class="btn btn-ghost" id="support-cancel">Cancel</button>
        <button class="btn btn-primary" id="support-send">Send</button>
      </div>
    </div>
  </div>`;
  const bd = document.getElementById('wg-modal-bd');
  requestAnimationFrame(()=> bd.classList.add('open'));
  const close = ()=>{ bd.classList.remove('open'); setTimeout(()=>{ root.innerHTML=''; }, 160); };
  document.getElementById('support-cancel').onclick = close;
  bd.onclick = (e)=>{ if(e.target===bd) close(); };
  document.getElementById('support-send').onclick = async ()=>{
    const msg = document.getElementById('support-msg').value.trim();
    if(!msg){ wgToast('Please enter a message first.', 'error'); return; }
    if(window.WG_DEMO){ close(); wgToast('Thanks! (Support is disabled in the demo.)', 'success'); return; }
    if(!STATE.online){ wgToast("You're offline — try sending when reconnected.", 'error'); return; }
    try{
      await window.FB.sendSupport({
        message: msg,
        fromUid: STATE.user ? STATE.user.uid : null,
        fromEmail: STATE.user ? (STATE.user.email || null) : null,
        userAgent: navigator.userAgent,
        createdAt: new Date().toISOString()
      });
      close();
      wgToast('Message sent — thank you!', 'success');
    }catch(err){
      console.error('support send failed', err);
      wgToast("Couldn't send just now — please try again.", 'error');
    }
  };
}

async function startDeleteAccount(){
  const softer = await wgConfirm(
    "If you only want to empty your stash and projects, use \u201cClear my data\u201d instead \u2014 it keeps your login. Delete account removes everything permanently, including your login. Continue to permanent deletion?",
    { title:'Before you delete', okLabel:'Continue', danger:true }
  );
  if(!softer) return;
  const sure = await wgConfirm(
    "This permanently deletes your account, all your yarns, projects, palettes, photos, and login. This cannot be undone.",
    { title:'Delete account permanently?', okLabel:'Delete everything', danger:true }
  );
  if(!sure) return;
  try{
    // Best-effort: delete the user's project photos from Storage first (the
    // app holds their URLs; the auth-user teardown can't reach them after).
    const photoUrls = [];
    STATE.projects.forEach(p => (p.photos||[]).forEach(u => photoUrls.push(u)));
    STATE.patterns.forEach(p => (p.files||[]).forEach(f => photoUrls.push(f.url)));
    for(const url of photoUrls){ try{ await window.FB.deletePhoto(url); }catch(e){} }
    await window.FB.deleteAccount();
    wgToast('Your account has been deleted.', 'success');
  }catch(err){
    if(err && err.code === 'auth/requires-recent-login'){
      wgToast('For security, please sign out and back in, then delete again.', 'error');
    } else {
      wgToast(friendlyAuthError ? friendlyAuthError(err) : 'Could not delete account.', 'error');
    }
  }
}
function closeSettings(){ STATE.settingsOpen = false; const s=document.getElementById('settings-sheet'); if(s) s.remove(); }

function renderSignedOut(){
  const mode = STATE.authMode || 'signin'; // 'signin' | 'signup'
  return `<div class="auth-card">
    <div class="card">
      <h2 style="font-family:'Fraunces',serif; font-size:1.2rem; margin:0 0 4px;">${mode==='signup'?'Create your account':'Sign in to Woolgather'}</h2>
      <p class="note" style="margin:0 0 16px;">Your yarn, projects, and palettes sync to your account across every device you sign into.</p>
      <form onsubmit="handleEmailAuth(event)">
        <label class="field" style="margin-bottom:10px;">Email
          <input id="auth-email" type="email" required autocomplete="email" placeholder="you@example.com" />
        </label>
        <label class="field" style="margin-bottom:6px;">Password
          <input id="auth-password" type="password" required autocomplete="${mode==='signup'?'new-password':'current-password'}" placeholder="${mode==='signup'?'At least 6 characters':'Your password'}" />
        </label>
        ${mode==='signin' ? `<p style="margin:0 0 14px;"><button type="button" onclick="handleForgotPassword()" style="background:none;border:none;padding:0;color:var(--plum);font-size:0.78rem;cursor:pointer;text-decoration:underline;">Forgot password?</button></p>` : '<div style="height:8px;"></div>'}
        <button type="submit" class="btn btn-primary full-width">${mode==='signup'?'Create account':'Sign in'}</button>
      </form>
      <p class="note" style="text-align:center; margin:14px 0;">
        ${mode==='signup'
          ? `Already have an account? <button onclick="STATE.authMode='signin'; render();" style="background:none;border:none;padding:0;color:var(--plum);font-size:0.8rem;cursor:pointer;text-decoration:underline;">Sign in</button>`
          : `New here? <button onclick="STATE.authMode='signup'; render();" style="background:none;border:none;padding:0;color:var(--plum);font-size:0.8rem;cursor:pointer;text-decoration:underline;">Create an account</button>`}
      </p>
      <div style="display:flex; align-items:center; gap:10px; margin:6px 0 14px; color:var(--ink-soft); font-size:0.75rem;">
        <span class="hairline"></span>or<span class="hairline"></span>
      </div>
      <button class="btn btn-ghost full-width" onclick="window.FB.signIn()">${ICONS.sparkles} Continue with Google</button>
    </div>
  </div>`;
}
async function handleEmailAuth(e){
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const mode = STATE.authMode || 'signin';
  if(!email || !password) return;
  try{
    if(mode==='signup'){
      await window.FB.signUpEmail(email, password);
      wgToast('Account created — check your email to verify. If you don’t see it in your inbox, check your spam/junk folder.', 'success');
    } else {
      await window.FB.signInEmail(email, password);
    }
    // onAuthChange handles the rest (render + verification gate).
  }catch(err){
    wgToast(friendlyAuthError(err), 'error');
  }
}
async function handleForgotPassword(){
  const email = await wgPrompt('Enter your account email and we\'ll send a reset link.', {title:'Reset password', defaultValue: (document.getElementById('auth-email')||{}).value||'', placeholder:'you@example.com', okLabel:'Send link'});
  if(email===null) return;
  if(!email.trim()){ wgToast('Please enter your email.', 'error'); return; }
  try{
    await window.FB.resetPassword(email.trim());
    wgToast('Password reset email sent — check your inbox. If you don’t see it in your inbox, check your spam/junk folder', 'success');
  }catch(err){
    wgToast(friendlyAuthError(err), 'error');
  }
}
/* Map Firebase auth error codes to human messages. */
function friendlyAuthError(err){
  const code = (err && err.code) || '';
  const map = {
    'auth/invalid-email':'That doesn\'t look like a valid email address.',
    'auth/user-not-found':'No account found with that email — try creating one.',
    'auth/wrong-password':'Incorrect password. Try again or reset it.',
    'auth/invalid-credential':'Email or password is incorrect.',
    'auth/email-already-in-use':'That email is already registered — try signing in instead.',
    'auth/weak-password':'Password should be at least 6 characters.',
    'auth/too-many-requests':'Too many attempts — please wait a moment and try again.',
    'auth/network-request-failed':'Network problem — check your connection.',
    'auth/popup-closed-by-user':'Sign-in was cancelled.'
  };
  return map[code] || (err && err.message) || 'Something went wrong. Please try again.';
}
/* Verification gate — shown when a password user hasn't verified their email
   yet. They can resend, or re-check after clicking the link in their inbox. */
function renderVerifyGate(){
  return `<div class="auth-card">
    <div class="card">
      <h2 style="font-family:'Fraunces',serif; font-size:1.2rem; margin:0 0 4px;">Verify your email</h2>
      <p class="note" style="margin:0 0 14px;">We sent a verification link to <strong class="muted-ink">${esc(STATE.user.email||'your email')}</strong>. Click it, then tap "I've verified" below.</p>
      <p class="note" style="margin:0 0 14px;">If you don’t see it in your inbox, check your spam/junk folder.</p>
      <button class="btn btn-primary" style="width:100%; margin-bottom:8px;" onclick="handleCheckVerified()">I've verified — continue</button>
      <button class="btn btn-ghost" style="width:100%; margin-bottom:8px;" onclick="handleResendVerification()">Resend verification email</button>
      <button class="btn btn-ghost full-width" onclick="window.FB.signOutUser()">Sign out</button>
    </div>
  </div>`;
}
async function handleCheckVerified(){
  try{
    await window.FB.reloadUser();
    if(window.FB.isEmailVerified()){
      wgToast('Email verified — welcome!', 'success');
      render();
    } else {
      wgToast("Not verified yet — click the link in your email first. If you don’t see it in your inbox, check your spam/junk folder", 'error');
    }
  }catch(err){ wgToast(friendlyAuthError(err), 'error'); }
}
async function handleResendVerification(){
  try{
    await window.FB.resendVerification();
    wgToast('Verification email resent. If you don’t see it in your inbox, check your spam/junk folder.', 'success');
  }catch(err){ wgToast(friendlyAuthError(err), 'error'); }
}

function renderTab(){
  const el = document.getElementById('inner-tab-content');
  if(!el) return;
  if(STATE.tab==='overview') el.innerHTML = renderOverview();
  else if(STATE.tab==='stash') el.innerHTML = renderStash();
  else if(STATE.tab==='projects') el.innerHTML = renderProjects();
  else if(STATE.tab==='patterns') el.innerHTML = renderPatterns();
  else if(STATE.tab==='palette') el.innerHTML = renderPalette();
  else if(STATE.tab==='showcase') el.innerHTML = renderShowcase();
  else if(STATE.tab==='shopping') el.innerHTML = renderShopping();
  else if(STATE.tab==='gauge') el.innerHTML = renderGauge();
  else if(STATE.tab==='presets') el.innerHTML = renderPresetsAdmin();
  if(STATE.tab==='patterns') refreshPatternPdfReads();

  if(STATE.tab==='overview') renderCharts();
  syncFormScrollLock();
}

function switchTab(tab){
  cleanupOpenForms();
  STATE.tab = tab;
  render();
}

async function resetAll(){
  if(!STATE.user) return;
  if(!(await wgConfirm("Clear every yarn and project you've logged? This can't be undone.", {title:'Clear all data', okLabel:'Clear everything', danger:true}))) return;
  STATE.yarns = [];
  STATE.projects = [];
  await persist();
  render();
}

/* =================================================================
   Overview
================================================================= */
function computeStats(){
  const yarns = STATE.yarns, projects = STATE.projects;
  const totalYardage = yarns.reduce((s,y)=>s+yarnTotalYardage(y),0);
  const finished = projects.filter(p=>p.status==='Finished');
  const usedYardage = finished.reduce((s,p)=>s+projectYardageUsed(p),0);
  const utilization = totalYardage>0 ? Math.min(100,(usedYardage/totalYardage)*100) : 0;
  const wip = projects.filter(p=>p.status==='WIP');
  const oldestWip = wip.reduce((old,p)=> (!old || new Date(p.startDate) < new Date(old.startDate)) ? p : old, null);
  const oldestWipDays = oldestWip ? daysBetween(oldestWip.startDate, todayStr()) : null;
  const finishedWithDates = finished.filter(p=>p.startDate && p.finishDate);
  const avgFinishDays = finishedWithDates.length
    ? Math.round(finishedWithDates.reduce((s,p)=>s+daysBetween(p.startDate,p.finishDate),0)/finishedWithDates.length)
    : null;
  const usedYarnIds = new Set();
  projects.forEach(p=>(p.yarnIds||[]).forEach(id=>usedYarnIds.add(id)));
  const unused = yarns.filter(y=>!usedYarnIds.has(y.id) && yarnStatus(y)!=='allocated');
  const unusedWithDate = unused.filter(y=>y.purchaseDate);
  const avgUnusedAge = unusedWithDate.length
    ? Math.round(unusedWithDate.reduce((s,y)=>s+(daysBetween(y.purchaseDate, todayStr())||0),0)/unusedWithDate.length)
    : null;
  const fiberMap = {};
  yarns.forEach(y=>{ const cat = categorizeFiber(y.fiber); fiberMap[cat] = (fiberMap[cat]||0) + yarnTotalYardage(y); });
  const fiberData = Object.entries(fiberMap).map(([fiber,yards])=>({fiber, yards:Math.round(yards)})).sort((a,b)=>b.yards-a.yards);
  const statusCounts = {};
  projects.forEach(p=>{ statusCounts[p.status] = (statusCounts[p.status]||0)+1; });
  const statusData = Object.entries(statusCounts).map(([name,value])=>({name,value}));
  return { totalYardage, utilization, wipCount:wip.length, oldestWipDays, avgFinishDays, unused, unusedWithDateCount:unusedWithDate.length, avgUnusedAge, fiberData, statusData };
}

function renderOverview(){
  if(STATE.yarns.length===0 && STATE.projects.length===0){
    return `<div class="empty" style="max-width:560px; margin:0 auto;">
      <p class="title">Welcome to Woolgather 🧶</p>
      <p class="body">Your quiet ledger for yarn, projects, and palettes — no ads, no AI, just a calm place to track your craft. Here's what you can do:</p>
      <div class="onboard-grid">
        <div class="onboard-card"><span class="onboard-icon">${ICONS.package}</span><strong>Log your stash</strong><span class="note">Yarn, colors, and how much you have left. Scan a label to autofill, or weigh a scrap to log leftovers.</span></div>
        <div class="onboard-card"><span class="onboard-icon">${ICONS.sparkles}</span><strong>Track projects</strong><span class="note">Link yarn, count rows, note your gauge, and see finished makes in the Showcase.</span></div>
        <div class="onboard-card"><span class="onboard-icon">${ICONS.palette}</span><strong>Match colors</strong><span class="note">The Palette Lab uses real color science to find harmonies in your stash — or colors to shop for.</span></div>
        <div class="onboard-card"><span class="onboard-icon">${ICONS.cart}</span><strong>Plan &amp; shop</strong><span class="note">Turn project gaps into a shopping list, and check gauge before you cast on.</span></div>
      </div>
      <button class="btn btn-primary" style="margin-top:18px;" onclick="switchTab('stash')">${ICONS.plus} Add your first yarn</button>
      <p class="note" style="margin-top:10px;">Everything saves to your account and syncs across your devices.</p>
    </div>`;
  }
  const s = computeStats();
  let html = `<div class="stat-grid">
    ${statTile('Yarns logged', STATE.yarns.length)}
    ${statTile('Total '+unitLabel(), toDisplayLength(s.totalYardage).toLocaleString())}
    ${statTile('Stash used', s.utilization.toFixed(0)+'%', 'in finished projects')}
    ${statTile('In progress', s.wipCount)}
    ${statTile('Oldest WIP', s.oldestWipDays!=null ? s.oldestWipDays+'d' : '—')}
    ${statTile('Avg. time to finish', s.avgFinishDays!=null ? s.avgFinishDays+'d' : '—')}
  </div>
  <div class="chart-grid">
    <div class="card chart-card">
      <p class="chart-title">Yarn owned by fiber (${unitLabel()})</p>
      ${s.fiberData.length ? '<div class="chart-holder"><canvas id="fiberChart"></canvas></div>' : '<p class="note">Add some yarn to see this.</p>'}
    </div>
    <div class="card chart-card">
      <p class="chart-title">Projects by status</p>
      ${s.statusData.length ? '<div class="chart-holder"><canvas id="statusChart"></canvas></div>' : '<p class="note">Log a project to see this.</p>'}
    </div>
  </div>`;
  if(s.unused.length>0){
    html += `<div class="card note" style="margin-top:4px;">
      <strong class="muted-ink">${s.unused.length}</strong> skein${s.unused.length===1?'':'s'} in your stash
      ${s.unused.length===1?"hasn't":"haven't"} been used in a project yet${s.avgUnusedAge!=null ? ` — sitting there for ${s.avgUnusedAge} days on average (based on ${s.unusedWithDateCount} with a purchase date logged).` : '.'}
    </div>`;
  }
  return html;
}
function statTile(label,value,sub){
  return `<div class="card stat-tile"><p class="label">${esc(label)}</p><p class="value">${esc(value)}</p>${sub?`<p class="sub">${esc(sub)}</p>`:''}</div>`;
}

function renderCharts(){
  const s = computeStats();
  if(typeof Chart === 'undefined') return;
  Chart.defaults.font.family = "'Work Sans', sans-serif";
  Chart.defaults.color = '#6E6178';

  const fiberCanvas = document.getElementById('fiberChart');
  if(fiberCanvas && s.fiberData.length){
    if(fiberChartInstance) fiberChartInstance.destroy();
    fiberChartInstance = new Chart(fiberCanvas, {
      type:'bar',
      data:{ labels:s.fiberData.map(d=>d.fiber), datasets:[{ data:s.fiberData.map(d=>toDisplayLength(d.yards)), backgroundColor: s.fiberData.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]), borderRadius:4 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:(ctx)=>ctx.parsed.x+' '+unitLabel() } } },
        scales:{ x:{ grid:{display:false} }, y:{ grid:{display:false} } } }
    });
  }
  const statusCanvas = document.getElementById('statusChart');
  if(statusCanvas && s.statusData.length){
    if(statusChartInstance) statusChartInstance.destroy();
    statusChartInstance = new Chart(statusCanvas, {
      type:'doughnut',
      data:{ labels:s.statusData.map(d=>d.name), datasets:[{ data:s.statusData.map(d=>d.value), backgroundColor:s.statusData.map(d=>STATUS_COLORS[d.name]||'#6E6178'), borderWidth:2, borderColor:'#F1EEF3' }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{size:11} } } } }
    });
  }
}

/* =================================================================
   Stash
================================================================= */
function renderStash(){
  let html = `<div class="row-between mb-4">
    <p class="note">${STATE.yarns.length} skein${STATE.yarns.length===1?'':'s'} logged</p>
    ${!STATE.showYarnForm ? `<div class="row">
      ${STATE.online && !STATE.orderImport ? `<button class="btn btn-ghost" onclick="openOrderImport()">${ICONS.upload} Import order</button>` : ''}
      <button class="btn btn-primary" onclick="showYarnForm()">${ICONS.plus} Add yarn</button>
    </div>` : ''}
  </div>`;
  if(STATE.orderImport && !STATE.showYarnForm) html += renderOrderImport();
  if(STATE.showYarnForm) html += renderYarnForm();
  if(STATE.yarns.length===0){
    html += `<div class="empty"><p class="title">Your stash is empty</p><p class="body">Log a skein — its color, fiber, and yardage — and it'll start showing up across the app.</p></div>`;
    return html;
  }

  // Search / filter / sort controls — only worth showing once the stash is
  // big enough to need them.
  if(STATE.yarns.length >= 6){
    const weightOpts = ['All weights', ...WEIGHTS];
    const fiberCats = ['All fibers', ...[...new Set(STATE.yarns.map(y=>categorizeFiber(y.fiber)))].sort()];
    html += `<div class="stash-controls">
      <input type="text" placeholder="Search brand, line, colorway…" value="${esc(STATE.stashSearch||'')}" oninput="setStashSearch(this.value)" style="flex:1; min-width:140px;" />
      <select onchange="STATE.stashFilterWeight=this.value; renderTab();">
        ${weightOpts.map(w=>`<option value="${esc(w)}" ${(STATE.stashFilterWeight||'All weights')===w?'selected':''}>${w==='All weights'?w:esc(weightLabel(w))}</option>`).join('')}
      </select>
      <select onchange="STATE.stashFilterFiber=this.value; renderTab();">
        ${fiberCats.map(f=>`<option ${(STATE.stashFilterFiber||'All fibers')===f?'selected':''}>${f}</option>`).join('')}
      </select>
      ${STATE.yarns.some(y=>yarnScraps(y).length) ? `<select onchange="STATE.stashFilterScrap=this.value; renderTab();">
        ${[['all','All yarn'],['scrap','Has scraps'],['full','Has full skeins']].map(([v,l])=>`<option value="${v}" ${(STATE.stashFilterScrap||'all')===v?'selected':''}>${l}</option>`).join('')}
      </select>` : ''}
      <select onchange="setSort('stashSort', this.value)" aria-label="Sort stash">
        ${[['recent','Newest'],['updated','Recently updated'],['name','Name A–Z'],['color','Color'],['weight','Weight (light → heavy)'],['yardage','Most yarn left']].map(([v,l])=>`<option value="${v}" ${(STATE.stashSort||'recent')===v?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>`;
  }

  const shown = filteredSortedYarns();
  if(shown.length===0){
    html += `<div class="empty"><p class="title">No matches</p><p class="body">No yarn matches your search or filters. Try clearing them.</p></div>`;
  } else {
    if(shown.length !== STATE.yarns.length){
      html += `<p class="note" style="margin-bottom:10px;">Showing ${shown.length} of ${STATE.yarns.length}</p>`;
    }
    html += `<div class="yarn-grid">${shown.map(renderYarnCard).join('')}</div>`;
  }
  return html;
}
function setStashSearch(v){
  STATE.stashSearch = v;
  // Re-render only the grid area would be ideal, but full tab re-render keeps
  // the input focused poorly; instead update the grid in place.
  const shown = filteredSortedYarns();
  const grid = document.querySelector('#inner-tab-content .yarn-grid');
  const note = document.querySelector('#inner-tab-content .stash-count-note');
  if(grid){
    grid.innerHTML = shown.map(renderYarnCard).join('');
  }
}
function weightRank(w){ const i = WEIGHTS.indexOf(w); return i<0 ? 99 : i; }
// Last-edited stamp for "Recently updated"; entries saved before this existed
// fall back to the date they were added.
function updatedKey(x){ return x.updatedAt || x.dateAdded || x.createdAt || ''; }
function filteredSortedYarns(){
  let list = [...STATE.yarns];
  const q = (STATE.stashSearch||'').toLowerCase().trim();
  if(q){
    list = list.filter(y => [y.brand,y.line,y.name,y.colorway,y.fiber].filter(Boolean).some(f=>f.toLowerCase().includes(q)));
  }
  const fw = STATE.stashFilterWeight;
  if(fw && fw!=='All weights') list = list.filter(y=>y.weightCategory===fw);
  const ff = STATE.stashFilterFiber;
  if(ff && ff!=='All fibers') list = list.filter(y=>categorizeFiber(y.fiber)===ff);
  const fs = STATE.stashFilterScrap;
  if(fs==='scrap') list = list.filter(y=>yarnScraps(y).length>0);
  else if(fs==='full') list = list.filter(y=>{ const sy=Number(y.skeinYardage)||0; return sy>0 ? fullYards(y)>=sy-0.5 : fullYards(y)>0; });
  const sort = STATE.stashSort || 'recent';
  if(sort==='name') list.sort((a,b)=>yarnDisplayName(a).localeCompare(yarnDisplayName(b)));
  else if(sort==='yardage') list.sort((a,b)=>(Number(b.yardageRemaining)||0)-(Number(a.yardageRemaining)||0));
  else if(sort==='weight') list.sort((a,b)=>weightRank(a.weightCategory)-weightRank(b.weightCategory) || yarnDisplayName(a).localeCompare(yarnDisplayName(b)));
  else if(sort==='updated') list.sort((a,b)=>updatedKey(b).localeCompare(updatedKey(a)));
  else if(sort==='color') list.sort((a,b)=>hexToHsl(a.colorHex||'#000').h - hexToHsl(b.colorHex||'#000').h);
  else list.reverse(); // recent = newest first (added order reversed)
  return list;
}

function showYarnForm(id){
  if(!STATE.online){ wgToast("You're offline — view-only until you reconnect.", "error"); return; }
  STATE.showYarnForm = true;
  STATE.editingYarnId = id || null;
  const editing = id ? STATE.yarns.find(y=>y.id===id) : null;
  pendingColorHex = editing ? editing.colorHex : '#5C3A72';
  extractedSwatches = [];
  pendingYarnIsMulticolor = !!(editing && editing.isMulticolor);
  pendingYarnScraps = editing ? yarnScraps(editing).map(c=>({ ...c })) : [];
  pendingYarnColors = editing && editing.colors ? [...editing.colors] : [];
  pendingYarnPrimaryIndex = editing && typeof editing.primaryIndex === 'number' ? editing.primaryIndex : 0;
  pendingYarnMatchMode = editing && editing.matchMode ? editing.matchMode : 'simple';
  multicolorExtractedSwatches = [];
  renderTab();
}
function hideYarnForm(){ cleanupOpenForms(); renderTab(); }

function renderYarnForm(){
  const editing = STATE.editingYarnId ? STATE.yarns.find(y=>y.id===STATE.editingYarnId) : null;
  const v = (field, fallback='') => editing ? esc(editing[field] ?? fallback) : fallback;
  const brandOptions = presetBrands().map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('');
  const inner = `
  <form class="card form-grid" onsubmit="handleSaveYarn(event)" style="margin-bottom:22px;">
    ${editing ? '' : `
    <div class="span2 ocr-scan-box" ondragover="onPhotoDropzoneDragOver(event)" ondragleave="onPhotoDropzoneDragLeave(event)" ondrop="onLabelScanDrop(event)">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span style="font-size:0.85rem; font-weight:500;">${ICONS.image} Scan a label to prefill</span>
        <button type="button" class="btn btn-ghost btn-small" onclick="document.getElementById('yf-ocr-photo').click()">${ICONS.upload} Choose photo</button>
        <input id="yf-ocr-photo" type="file" accept="image/*,.heic,.heif" capture="environment" class="hidden" onchange="handleLabelScan(event)" />
        <span id="yf-ocr-status" class="note" style="display:none;"></span>
      </div>
      <p class="note" style="margin:6px 0 0;">Drag a label photo here, or choose one — reads printed text and fills what it's confident about. Always double-check before saving. Works best on a flat, well-lit label.</p>
    </div>
    <label class="field">Brand preset (optional)
      <input id="yf-brand-select" list="yf-brand-presets" placeholder="Type to search presets…" onchange="onBrandChange()" oninput="onBrandChange()" />
      <datalist id="yf-brand-presets">${brandOptions}</datalist>
    </label>
    <label class="field">Line
      <input id="yf-line-select" list="yf-line-presets" placeholder="— pick a brand first —" onchange="onLineChange()" oninput="onLineChange()" disabled />
      <datalist id="yf-line-presets"></datalist>
    </label>`}

    <label class="field">Brand
      <input id="yf-brand" placeholder="Malabrigo" value="${v('brand')}" list="yf-brand-history" onchange="autofillFromHistory()" />
      <datalist id="yf-brand-history">${[...new Set(STATE.yarns.map(y=>y.brand).filter(Boolean))].map(b=>`<option value="${esc(b)}"></option>`).join('')}</datalist>
    </label>
    <label class="field">Line
      <input id="yf-line" required placeholder="Rios" value="${editing ? esc(editing.line ?? editing.name ?? '') : ''}" list="yf-line-history" onchange="autofillFromHistory()" />
      <datalist id="yf-line-history">${[...new Set(STATE.yarns.map(y=>y.line).filter(Boolean))].map(l=>`<option value="${esc(l)}"></option>`).join('')}</datalist>
    </label>
    <label class="field">Colorway
      <input id="yf-colorway" placeholder="Ravelry Red" value="${v('colorway')}" />
    </label>
    <label class="field">Colorway number (optional)
      <input id="yf-colorwaynum" placeholder="e.g. 611" value="${v('colorwayNumber')}" />
    </label>
    <label class="field">Dye lot (optional)
      <input id="yf-dyelot" placeholder="e.g. 4521" value="${v('dyeLot')}" />
    </label>

    <label class="field">Fiber content
      <input id="yf-fiber" placeholder="100% superwash merino" value="${v('fiber')}" />
    </label>
    <label class="field">Weight category
      <select id="yf-weightcat">${WEIGHTS.map(w=>`<option value="${esc(w)}" ${(editing?editing.weightCategory===w:w==='Worsted')?'selected':''}>${esc(weightLabel(w))}</option>`).join('')}</select>
    </label>

    <label class="field">Skein weight (g)
      <input id="yf-skeinweight" type="number" min="0" placeholder="100" value="${v('skeinWeightGrams')}" />
    </label>
    <label class="field">Length per skein (${unitLabel()})
      <input id="yf-skeinyardage" type="number" min="0" placeholder="220" value="${editing ? toDisplayLength(editing.skeinYardage) : ''}" />
    </label>

    <label class="field">Full skeins
      <input id="yf-quantity" type="number" min="0" step="1" placeholder="1" value="${editing ? esc(editing.quantity) : 1}" />
      <span class="note" style="font-size:0.7rem;">Only have scraps? Enter 0 and add them below.</span>
    </label>
    <div class="span2 scrap-editor">
      <span class="note" style="display:block; margin-bottom:6px;">Scraps / partial balls — add each leftover ball of this colorway. Weigh it (needs skein weight + length above) or enter its length.</span>
      <div id="yf-scrap-list">${buildPendingScrapsHTML()}</div>
      <div class="row mt-2">
        <input id="yf-scrap-amt" type="number" min="0" step="any" placeholder="33" style="width:80px;" aria-label="Scrap amount" />
        <select id="yf-scrap-unit" aria-label="Scrap unit">
          <option value="g">g</option>
          <option value="len">${unitLabel()}</option>
        </select>
        <button type="button" class="btn btn-ghost btn-small" onclick="addPendingScrap()">${ICONS.plus} Add scrap</button>
        <span id="yf-scrap-result" class="note" style="font-size:0.72rem;"></span>
      </div>
    </div>
    <label class="field">Cost per skein (optional)
      <input id="yf-cost" type="number" min="0" step="0.01" value="${v('cost')}" />
    </label>

    <label class="field">Purchase date (optional estimate)
      <input id="yf-purchasedate" type="date" value="${v('purchaseDate')}" />
    </label>

    <label class="field span2" style="flex-direction:row; align-items:center; justify-content:flex-start; gap:8px; text-align:left;">
      <input type="checkbox" id="yf-multicolor" ${pendingYarnIsMulticolor?'checked':''} onchange="toggleMulticolor(this.checked)" style="width:auto; flex-shrink:0;" />
      <span class="muted-ink">This yarn is multicolor (variegated / self-striping / speckled)</span>
    </label>

    <div class="span2" id="yf-color-section" style="display:flex; flex-wrap:wrap; align-items:center; gap:14px;">
      ${buildColorSectionHTML()}
    </div>

    <div class="span2 form-actions-inline row-end">
      <button type="button" class="btn btn-ghost" onclick="hideYarnForm()">Cancel</button>
      <button type="submit" class="btn btn-primary">${editing ? 'Save changes' : 'Add to stash'}</button>
    </div>
  </form>`;
  return wrapFormForMobile(inner, editing ? 'Edit yarn' : 'Add yarn', 'submitYarnForm()', 'hideYarnForm()');
}
/* Full-screen form top-bar Save button triggers the real form submit. */
function submitYarnForm(){
  const f = document.querySelector('#inner-tab-content form, .fullscreen-form form');
  if(f) f.requestSubmit ? f.requestSubmit() : f.querySelector('[type=submit]').click();
}

function onBrandChange(){
  const brand = document.getElementById('yf-brand-select').value;
  const lineInput = document.getElementById('yf-line-select');
  const lineList = document.getElementById('yf-line-presets');
  // Only populate lines once the typed brand exactly matches a known preset
  // brand (datalist lets them type freely; we act on a real match).
  const matchBrand = presetBrands().find(b => b.toLowerCase() === (brand||'').toLowerCase());
  if(!matchBrand){
    lineList.innerHTML = '';
    lineInput.placeholder = '— pick a brand first —';
    lineInput.disabled = true;
    return;
  }
  const lines = presetLinesForBrand(matchBrand);
  lineList.innerHTML = lines.map(p=>`<option value="${esc(p.line)}">${esc(p.line)}</option>`).join('');
  lineInput.placeholder = 'Type to search lines…';
  lineInput.disabled = false;
}
function onLineChange(){
  const brand = document.getElementById('yf-brand-select').value;
  const line = document.getElementById('yf-line-select').value;
  if(!brand || !line) return;
  // Match case-insensitively against presets, since the fields are free text now.
  const matchBrand = presetBrands().find(b => b.toLowerCase() === brand.toLowerCase());
  const preset = matchBrand ? presetLinesForBrand(matchBrand).find(p => p.line.toLowerCase() === line.toLowerCase()) : null;
  if(!preset) return;
  document.getElementById('yf-brand').value = preset.brand || matchBrand;
  document.getElementById('yf-line').value = preset.line;
  document.getElementById('yf-fiber').value = preset.fiber;
  document.getElementById('yf-weightcat').value = preset.weightCategory;
  document.getElementById('yf-skeinweight').value = preset.skeinWeightGrams;
  document.getElementById('yf-skeinyardage').value = toDisplayLength(preset.skeinYardage);
}
/* Auto-fill specs from the user's OWN stash history: if the entered brand+line
   matches a yarn they've logged before, fill any *empty* spec fields (fiber,
   weight, skein weight, yardage) from that past entry. Only fills blanks, so
   it never clobbers what the user has already typed. */
function autofillFromHistory(){
  const brand = (document.getElementById('yf-brand').value||'').trim().toLowerCase();
  const line = (document.getElementById('yf-line').value||'').trim().toLowerCase();
  if(!brand && !line) return;
  const match = STATE.yarns.find(y =>
    (y.brand||'').trim().toLowerCase()===brand &&
    (y.line||'').trim().toLowerCase()===line && (brand||line)
  );
  if(!match) return;
  const fillIfEmpty = (id, val)=>{ const el=document.getElementById(id); if(el && !el.value && val!=null && val!=='') el.value = val; };
  fillIfEmpty('yf-fiber', match.fiber);
  if(match.weightCategory){ const el=document.getElementById('yf-weightcat'); if(el) el.value = match.weightCategory; }
  fillIfEmpty('yf-skeinweight', match.skeinWeightGrams || '');
  fillIfEmpty('yf-skeinyardage', match.skeinYardage ? toDisplayLength(match.skeinYardage) : '');
}

function handlePhotoUpload(e){
  const file = e.target.files[0];
  if(file) processSinglePhotoFile(file);
}

/* Label OCR: photo → tesseract.js → parseYarnLabel → prefill only the
   fields we're confident about (leaving others for the user), then show a
   summary toast. Never overwrites a field the user already typed. */
async function handleLabelScan(e){
  const file = e.target.files[0];
  e.target.value = '';
  processLabelScan(file);
}
function onLabelScanDrop(e){
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  processLabelScan(file);
}
/* Tesseract.js is loaded lazily, on first actual use, rather than as a
   blocking <script> tag on every page load — it's a large library only
   needed by the rare "scan a label" flow, and blocking the whole app's
   first paint on it for every visitor was the single biggest contributor
   to slow first loads. Cached by the browser/SW after the first load. */
let _tesseractLoading = null;
function ensureTesseractLoaded(){
  if(typeof Tesseract !== 'undefined') return Promise.resolve();
  if(_tesseractLoading) return _tesseractLoading;
  _tesseractLoading = new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    s.onload = () => resolve();
    s.onerror = () => { _tesseractLoading = null; reject(new Error('load failed')); };
    document.head.appendChild(s);
  });
  return _tesseractLoading;
}
async function processLabelScan(file){
  if(!file || !isAcceptableImageFile(file)) return;
  const statusEl = document.getElementById('yf-ocr-status');
  const setStatus = (t)=>{ if(statusEl){ statusEl.style.display='inline'; statusEl.textContent=t; } };
  setStatus('Loading label reader…');
  try{
    await ensureTesseractLoaded();
  }catch(e){
    setStatus('');
    wgToast("Couldn't load the label reader — check your connection and try again.", "error");
    return;
  }
  setStatus('Reading label…');
  try{
    const usable = await toRenderableImageBlob(file);
    const { data } = await Tesseract.recognize(usable, 'eng', {
      logger: m => { if(m.status==='recognizing text') setStatus(`Reading label… ${Math.round(m.progress*100)}%`); }
    });
    const parsed = parseYarnLabel(data.text || '');
    if(parsed._fieldsFound === 0){
      setStatus('');
      wgToast("Couldn't read much from that photo — try a flatter, brighter shot, or enter details manually.", "error");
      return;
    }
    const fillIfEmpty = (id, val)=>{
      if(val==null || val==='') return false;
      const el = document.getElementById(id);
      if(el && !el.value){ el.value = val; return true; }
      return false;
    };
    let filled = 0;
    if(parsed.brand && fillIfEmpty('yf-brand', parsed.brand)) filled++;
    if(parsed.line && fillIfEmpty('yf-line', parsed.line)) filled++;
    if(parsed.fiber && fillIfEmpty('yf-fiber', parsed.fiber)) filled++;
    if(parsed.colorway && fillIfEmpty('yf-colorway', parsed.colorway)) filled++;
    if(parsed.dyeLot && fillIfEmpty('yf-dyelot', parsed.dyeLot)) filled++;
    if(parsed.skeinYardage && fillIfEmpty('yf-skeinyardage', toDisplayLength(parsed.skeinYardage))) filled++;
    if(parsed.skeinWeightGrams && fillIfEmpty('yf-skeinweight', parsed.skeinWeightGrams)) filled++;
    if(parsed.weightCategory){ const el=document.getElementById('yf-weightcat'); if(el){ el.value=parsed.weightCategory; filled++; } }
    setStatus('');
    wgToast(filled ? `Prefilled ${filled} field${filled===1?'':'s'} — please double-check before saving.` : 'Read the label, but those fields were already filled.', filled?'success':undefined);
  }catch(err){
    console.error('OCR failed', err);
    setStatus('');
    wgToast("Couldn't read that label. You can still enter details manually.", "error");
  }
}
async function processSinglePhotoFile(file){
  document.getElementById('yf-extracting').style.display = 'inline';
  let usable;
  try{ usable = await toRenderableImageBlob(file); }
  catch(err){ document.getElementById('yf-extracting').style.display = 'none'; wgToast(err.message, 'error'); return; }
  const img = new Image();
  const url = URL.createObjectURL(usable);
  img.onload = () => {
    const size = 50;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0,0,size,size).data;
    const pixels = [];
    for(let i=0;i<data.length;i+=4){ if(data[i+3] < 100) continue; pixels.push([data[i],data[i+1],data[i+2]]); }
    extractedSwatches = kMeansColors(pixels, 5, 6).slice(0,5);
    document.getElementById('yf-extracting').style.display = 'none';
    renderSwatchRow();
    URL.revokeObjectURL(url);
  };
  img.onerror = () => { document.getElementById('yf-extracting').style.display = 'none'; URL.revokeObjectURL(url); wgToast('Could not read that photo.', 'error'); };
  img.src = url;
}
function renderSwatchRow(){
  const el = document.getElementById('yf-swatches');
  if(!el) return;
  el.innerHTML = extractedSwatches.map(s=>`<button type="button" class="swatch-btn ${pendingColorHex===s.hex?'selected':''}" style="background:${s.hex}" title="${s.hex}" onclick="pickSwatch('${s.hex}')"></button>`).join('');
}
function pickSwatch(hex){
  pendingColorHex = hex;
  document.getElementById('yf-colorhex').value = hex;
  renderSwatchRow();
}

/* =================================================================
   Multicolor yarn color-builder — its own self-contained section so
   toggling/adding/reordering colors never touches the rest of the form.
================================================================= */
function refreshColorSection(){
  const el = document.getElementById('yf-color-section');
  if(el) el.innerHTML = buildColorSectionHTML();
}

function toggleMulticolor(checked){
  pendingYarnIsMulticolor = checked;
  if(checked && pendingYarnColors.length===0){
    pendingYarnColors = [pendingColorHex];
    pendingYarnPrimaryIndex = 0;
  }
  refreshColorSection();
}

function buildColorSectionHTML(){
  if(!pendingYarnIsMulticolor){
    return `
      <label class="field">Color
        <input id="yf-colorhex" type="color" value="${pendingColorHex}" onchange="pendingColorHex=this.value" />
      </label>
      <div>
        <div class="photo-dropzone" ondragover="onPhotoDropzoneDragOver(event)" ondragleave="onPhotoDropzoneDragLeave(event)" ondrop="onPhotoDropzoneDrop(event)">
          <span class="note">Drag a photo here, or</span>
          <button type="button" class="btn btn-ghost btn-small" onclick="document.getElementById('yf-photo').click()">${ICONS.upload} Upload photo</button>
          <input id="yf-photo" type="file" accept="image/*,.heic,.heif" class="hidden" onchange="handlePhotoUpload(event)" />
        </div>
        <span id="yf-extracting" class="note" style="display:none; margin-top:8px;">Clustering colors…</span>
        <div id="yf-swatches" class="swatch-row"></div>
      </div>`;
  }

  const chips = pendingYarnColors.map((hex,i)=>`
    <div class="color-chip" draggable="true" data-index="${i}"
         ondragstart="onColorDragStart(event)" ondragover="onColorDragOver(event)"
         ondrop="onColorDrop(event)" ondragend="onColorDragEnd(event)">
      <button type="button" class="chip-move" title="Move left" onclick="moveColor(${i},-1)" ${i===0?'disabled':''} aria-label="Move color left">‹</button>
      <span class="color-chip-swatch" style="background:${hex}; ${i===pendingYarnPrimaryIndex ? 'outline:2px solid var(--plum); outline-offset:2px;' : ''}"></span>
      <button type="button" class="chip-star ${i===pendingYarnPrimaryIndex?'active':''}" title="Set as primary color (used for Palette Lab matching)" onclick="setPrimaryColor(${i})">★</button>
      <button type="button" class="chip-remove" title="Remove this color" onclick="removeMulticolorColor(${i})">✕</button>
      <button type="button" class="chip-move" title="Move right" onclick="moveColor(${i},1)" ${i===pendingYarnColors.length-1?'disabled':''} aria-label="Move color right">›</button>
    </div>`).join('');

  const count = pendingYarnColors.length;
  const modeControl = count>=2 && count<=3
    ? `<div class="note" style="margin-top:8px;">
        Palette Lab matching:
        <label style="margin-left:6px;"><input type="radio" name="yf-matchmode" ${pendingYarnMatchMode==='simple'?'checked':''} onchange="pendingYarnMatchMode='simple'" /> Simple (primary color only)</label>
        <label style="margin-left:12px;"><input type="radio" name="yf-matchmode" ${pendingYarnMatchMode==='full'?'checked':''} onchange="pendingYarnMatchMode='full'" /> Full (match on any of its colors)</label>
      </div>`
    : count>=4
      ? `<p class="note" style="margin-top:8px;">4+ colors — shown here for reference and visualizing the mix, but not used in Palette Lab matching.</p>`
      : `<p class="note" style="margin-top:8px;">Add at least one more color.</p>`;

  return `
    <div class="conic-swatch" style="background:${buildConicGradient(pendingYarnColors)};" title="Preview"></div>
    <div>
      <div class="color-chip-row">${chips}</div>
      <div style="display:flex; align-items:center; gap:8px; margin-top:8px; flex-wrap:wrap;">
        <input id="yf-new-color" type="color" value="#5C3A72" />
        <button type="button" class="btn btn-ghost btn-small" onclick="addManualColor()">${ICONS.plus} Add color</button>
      </div>
      <div class="photo-dropzone" style="margin:8px 0 0;" ondragover="onPhotoDropzoneDragOver(event)" ondragleave="onPhotoDropzoneDragLeave(event)" ondrop="onPhotoDropzoneDrop(event)">
        <span class="note">Drag a photo here, or</span>
        <button type="button" class="btn btn-ghost btn-small" onclick="document.getElementById('yf-photo-multi').click()">${ICONS.upload} Upload photo</button>
        <input id="yf-photo-multi" type="file" accept="image/*,.heic,.heif" class="hidden" onchange="handleMulticolorPhotoUpload(event)" />
      </div>
      <span id="yf-multi-extracting" class="note" style="display:none; margin-top:8px;">Clustering colors…</span>
      <div id="yf-multi-swatches" class="swatch-row">${multicolorExtractedSwatches.map(s=>`<button type="button" class="swatch-btn" style="background:${s.hex}" title="Tap to add ${s.hex}" onclick="addExtractedMulticolor('${s.hex}')"></button>`).join('')}</div>
      </div>
      ${modeControl}
    </div>`;
}

function addManualColor(){
  const val = document.getElementById('yf-new-color').value;
  pendingYarnColors.push(val);
  refreshColorSection();
}
function addExtractedMulticolor(hex){
  pendingYarnColors.push(hex);
  refreshColorSection();
}
function removeMulticolorColor(i){
  pendingYarnColors.splice(i,1);
  if(pendingYarnPrimaryIndex>=pendingYarnColors.length) pendingYarnPrimaryIndex = Math.max(0, pendingYarnColors.length-1);
  else if(i<pendingYarnPrimaryIndex) pendingYarnPrimaryIndex--;
  refreshColorSection();
}
function setPrimaryColor(i){ pendingYarnPrimaryIndex = i; refreshColorSection(); }

/* Touch reorder: swap the color at index i with its neighbor (dir -1 left,
   +1 right). Keeps the primary-color designation attached to whichever
   physical color it was on. Same end result as a drag of one position. */
function moveColor(i, dir){
  const j = i + dir;
  if(j < 0 || j >= pendingYarnColors.length) return;
  const tmp = pendingYarnColors[i];
  pendingYarnColors[i] = pendingYarnColors[j];
  pendingYarnColors[j] = tmp;
  if(pendingYarnPrimaryIndex === i) pendingYarnPrimaryIndex = j;
  else if(pendingYarnPrimaryIndex === j) pendingYarnPrimaryIndex = i;
  refreshColorSection();
}

function onColorDragStart(e){
  colorDragSrcIndex = Number(e.currentTarget.dataset.index);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function onColorDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function onColorDragEnd(e){ e.currentTarget.classList.remove('dragging'); colorDragSrcIndex = null; }
function onColorDrop(e){
  e.preventDefault();
  const targetIndex = Number(e.currentTarget.dataset.index);
  if(colorDragSrcIndex===null || colorDragSrcIndex===targetIndex) return;
  const moved = pendingYarnColors.splice(colorDragSrcIndex,1)[0];
  pendingYarnColors.splice(targetIndex,0,moved);
  if(pendingYarnPrimaryIndex===colorDragSrcIndex) pendingYarnPrimaryIndex = targetIndex;
  else if(colorDragSrcIndex<pendingYarnPrimaryIndex && targetIndex>=pendingYarnPrimaryIndex) pendingYarnPrimaryIndex--;
  else if(colorDragSrcIndex>pendingYarnPrimaryIndex && targetIndex<=pendingYarnPrimaryIndex) pendingYarnPrimaryIndex++;
  colorDragSrcIndex = null;
  refreshColorSection();
}

function handleMulticolorPhotoUpload(e){
  const file = e.target.files[0];
  if(file) processMulticolorPhotoFile(file);
}
async function processMulticolorPhotoFile(file){
  document.getElementById('yf-multi-extracting').style.display = 'inline';
  let usable;
  try{ usable = await toRenderableImageBlob(file); }
  catch(err){ document.getElementById('yf-multi-extracting').style.display = 'none'; wgToast(err.message, 'error'); return; }
  const img = new Image();
  const url = URL.createObjectURL(usable);
  img.onload = () => {
    const size = 50;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0,0,size,size).data;
    const pixels = [];
    for(let i=0;i<data.length;i+=4){ if(data[i+3] < 100) continue; pixels.push([data[i],data[i+1],data[i+2]]); }
    multicolorExtractedSwatches = kMeansColors(pixels, 6, 6).slice(0,6);
    document.getElementById('yf-multi-extracting').style.display = 'none';
    refreshColorSection();
    URL.revokeObjectURL(url);
  };
  img.onerror = () => { document.getElementById('yf-multi-extracting').style.display = 'none'; URL.revokeObjectURL(url); wgToast('Could not read that photo.', 'error'); };
  img.src = url;
}

function onPhotoDropzoneDragOver(e){ e.preventDefault(); e.currentTarget.classList.add('dragover'); }
function onPhotoDropzoneDragLeave(e){ e.currentTarget.classList.remove('dragover'); }
function onPhotoDropzoneDrop(e){
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if(!isAcceptableImageFile(file)) return;
  if(pendingYarnIsMulticolor) processMulticolorPhotoFile(file);
  else processSinglePhotoFile(file);
}

function handleSaveYarn(e){
  e.preventDefault();
  const brand = document.getElementById('yf-brand').value.trim();
  const line = document.getElementById('yf-line').value.trim();
  if(!line) return;
  const name = [brand, line].filter(Boolean).join(' ');
  const multicolor = pendingYarnIsMulticolor && pendingYarnColors.length>=2;
  const primaryIndex = multicolor ? Math.min(pendingYarnPrimaryIndex, pendingYarnColors.length-1) : 0;
  const fields = {
    name,
    brand,
    line,
    colorway: document.getElementById('yf-colorway').value.trim(),
    colorwayNumber: document.getElementById('yf-colorwaynum').value.trim(),
    dyeLot: document.getElementById('yf-dyelot').value.trim(),
    fiber: document.getElementById('yf-fiber').value.trim(),
    weightCategory: document.getElementById('yf-weightcat').value,
    skeinWeightGrams: Number(document.getElementById('yf-skeinweight').value) || 0,
    skeinYardage: fromInputLength(document.getElementById('yf-skeinyardage').value) || 0,
    quantity: document.getElementById('yf-quantity').value==='' ? 1 : Math.max(0, Number(document.getElementById('yf-quantity').value)||0),
    // (accepts decimals like 1.5 for partial/scrap skeins)
    cost: document.getElementById('yf-cost').value === '' ? null : Number(document.getElementById('yf-cost').value),
    purchaseDate: document.getElementById('yf-purchasedate').value || null,
    isMulticolor: multicolor,
    colors: multicolor ? [...pendingYarnColors] : [],
    primaryIndex: primaryIndex,
    matchMode: multicolor && pendingYarnColors.length<=3 ? pendingYarnMatchMode : 'simple',
    colorHex: multicolor ? pendingYarnColors[primaryIndex] : pendingColorHex
  };

  // Scraps edited in the form. On edit, the total on hand moves by however
  // much the scraps changed; a new yarn starts with its full skeins + scraps.
  const scraps = pendingYarnScraps.filter(c=>c.yards>0).map(c=>({ ...c }));
  const newScrapYd = scraps.reduce((t,c)=>t+c.yards, 0);
  pendingYarnScraps = [];

  if(STATE.editingYarnId){
    STATE.yarns = STATE.yarns.map(y => y.id===STATE.editingYarnId ? {
      ...y, ...fields, scraps,
      yardageRemaining: (Number(y.yardageRemaining)||0) - scrapYards(y) + newScrapYd,
      updatedAt: new Date().toISOString()
    } : y);
  } else {
    const yarn = { id: uid(), ...fields, scraps, status:'available', allocatedTo:null, dateAdded: todayStr(), updatedAt: new Date().toISOString() };
    yarn.yardageRemaining = yarnTotalYardage(yarn) + newScrapYd;
    STATE.yarns.push(yarn);
  }
  persist();
  STATE.showYarnForm = false;
  STATE.editingYarnId = null;
  renderTab();
  scrollToTop();
}

async function deleteYarn(id){
  if(!(await wgConfirm('Remove this yarn from your stash? This cannot be undone.', {title:'Remove yarn', okLabel:'Remove', danger:true}))) return;
  STATE.yarns = STATE.yarns.filter(y=>y.id!==id);
  persist();
  renderTab();
}
function changeRemaining(id, val){
  const n = val==='' ? 0 : fromInputLength(val);
  STATE.yarns = STATE.yarns.map(y => y.id===id ? {...y, yardageRemaining:n} : y);
  persist();
}
/* Export / backup. JSON = complete backup of everything (re-importable later);
   CSV = the stash as a flat, spreadsheet-friendly table. Both download client-
   side via a Blob — no server involved. */
function downloadFile(filename, text, mime){
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function exportStash(format){
  const stamp = todayStr();
  if(format==='json'){
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'Woolgather',
      yarns: STATE.yarns,
      projects: STATE.projects,
      palettes: STATE.paletteSavedPalettes,
      shoppingList: STATE.shoppingList,
      patterns: STATE.patterns
    };
    downloadFile(`woolgather-backup-${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json');
    wgToast('Backup downloaded.', 'success');
    return;
  }
  // CSV — stash only, flat and readable.
  const cols = ['Brand','Line','Colorway','Colorway #','Dye lot','Fiber','Weight','Skein weight (g)','Length/skein','Quantity','Length remaining','Unit','Cost/skein','Scraps','Status'];
  const csvEsc = (v)=>{ const s=(v==null?'':String(v)); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
  const rows = STATE.yarns.map(y=>[
    y.brand, y.line, y.colorway, y.colorwayNumber, y.dyeLot, y.fiber, y.weightCategory,
    y.skeinWeightGrams, toDisplayLength(y.skeinYardage), y.quantity,
    toDisplayLength(y.yardageRemaining), unitLabel(), y.cost, yarnScraps(y).map(c=>toDisplayLength(c.yards)).join(' / '), y.status
  ].map(csvEsc).join(','));
  const csv = cols.join(',') + '\n' + rows.join('\n');
  downloadFile(`woolgather-stash-${stamp}.csv`, csv, 'text/csv');
  wgToast('Stash CSV downloaded.', 'success');
}
/* Yarn-form scrap editor: add/remove partial balls before saving. Weight is
   converted to length with the skein ratio typed into the form above. */
function formSkeinSpecs(){
  return {
    skeinWeightGrams: Number(document.getElementById('yf-skeinweight').value) || 0,
    skeinYardage: fromInputLength(document.getElementById('yf-skeinyardage').value) || 0
  };
}
function buildPendingScrapsHTML(){
  if(!pendingYarnScraps.length) return `<p class="note no-margin" style="font-size:0.75rem;">No scraps.</p>`;
  // While the form is first being built its inputs don't exist yet; use the
  // yarn being edited for the weight ratio.
  const specs = document.getElementById('yf-skeinweight') ? formSkeinSpecs()
    : (STATE.yarns.find(y=>y.id===STATE.editingYarnId) || {});
  return `<div class="scrap-chips">${pendingYarnScraps.map(c=>`<span class="scrap-chip">${esc(scrapLabel(specs, c))}
    <button type="button" onclick="removePendingScrap('${c.id}')" aria-label="Remove scrap">✕</button></span>`).join('')}</div>`;
}
function addPendingScrap(){
  const amt = Number(document.getElementById('yf-scrap-amt').value)||0;
  const unit = document.getElementById('yf-scrap-unit').value;
  const resultEl = document.getElementById('yf-scrap-result');
  if(amt<=0){ resultEl.textContent = 'Enter an amount first.'; return; }
  let yards;
  if(unit==='g'){
    yards = gramsToYards(formSkeinSpecs(), amt);
    if(yards==null){ resultEl.textContent = 'Add skein weight and length above to add by weight.'; return; }
  } else yards = Math.round(fromInputLength(amt));
  pendingYarnScraps.push({ id: uid(), yards });
  document.getElementById('yf-scrap-amt').value = '';
  resultEl.textContent = '';
  document.getElementById('yf-scrap-list').innerHTML = buildPendingScrapsHTML();
}
function removePendingScrap(id){
  pendingYarnScraps = pendingYarnScraps.filter(c=>c.id!==id);
  document.getElementById('yf-scrap-list').innerHTML = buildPendingScrapsHTML();
}
/* Scraps on a stash card: add one by weighing it, re-weigh one, or remove
   one. Each keeps yardageRemaining in step with the scrap list. */
async function promptScrapAmount(y, message, title){
  const byWeight = yardsToGrams(y, 1)!=null;
  const val = await wgPrompt(message, { title, placeholder: byWeight ? 'grams' : unitLabel(), okLabel:'Save' });
  if(val===null) return null;
  const n = Number(val)||0;
  if(n<=0){ wgToast(byWeight ? 'Enter a weight in grams.' : 'Enter a length.', 'error'); return null; }
  return byWeight ? gramsToYards(y, n) : Math.round(fromInputLength(n));
}
async function addScrapToYarn(id){
  const y = STATE.yarns.find(yy=>yy.id===id);
  if(!y) return;
  const yards = await promptScrapAmount(y, `Weigh the leftover ball of ${yarnDisplayName(y)}.`, 'Add a scrap');
  if(yards==null) return;
  STATE.yarns = STATE.yarns.map(yy => yy.id===id ? { ...yy, scraps:[...yarnScraps(yy), { id: uid(), yards }], yardageRemaining:(Number(yy.yardageRemaining)||0) + yards, updatedAt:new Date().toISOString() } : yy);
  persist();
  wgToast(`Scrap added — ≈ ${toDisplayLength(yards)} ${unitLabel()}.`, 'success');
  renderTab();
}
async function reweighScrap(id, scrapId){
  const y = STATE.yarns.find(yy=>yy.id===id);
  const c = y && yarnScraps(y).find(cc=>cc.id===scrapId);
  if(!c) return;
  const yards = await promptScrapAmount(y, `Weigh this scrap of ${yarnDisplayName(y)} (was ${scrapLabel(y, c)}).`, 'Re-weigh scrap');
  if(yards==null) return;
  const delta = yards - c.yards;
  STATE.yarns = STATE.yarns.map(yy => yy.id===id ? { ...yy, scraps: yarnScraps(yy).map(cc=>cc.id===scrapId ? { ...cc, yards } : cc), yardageRemaining:(Number(yy.yardageRemaining)||0) + delta, updatedAt:new Date().toISOString() } : yy);
  persist();
  wgToast(`Updated — ≈ ${toDisplayLength(yards)} ${unitLabel()} in that scrap.`, 'success');
  renderTab();
}
function removeScrap(id, scrapId){
  STATE.yarns = STATE.yarns.map(yy => {
    if(yy.id!==id) return yy;
    const c = yarnScraps(yy).find(cc=>cc.id===scrapId);
    if(!c) return yy;
    return { ...yy, scraps: yarnScraps(yy).filter(cc=>cc.id!==scrapId), yardageRemaining: (Number(yy.yardageRemaining)||0) - c.yards, updatedAt:new Date().toISOString() };
  });
  persist();
  renderTab();
}
function toggleYarnStatus(id, projectId){
  STATE.yarns = STATE.yarns.map(y => {
    if(y.id!==id) return y;
    const next = yarnStatus(y)==='allocated' ? 'available' : 'allocated';
    return { ...y, status: next, allocatedTo: next==='allocated' ? (projectId || y.allocatedTo || null) : null };
  });
  persist();
  refreshYarnPicker();
}
/* Updates just the yarn-picker portion of an open project form, instead of
   re-rendering the whole form (which would wipe out anything typed into the
   other fields of a not-yet-saved project). Falls back to a normal tab
   re-render when called from outside the project form (e.g. the Stash tab's
   "Mark allocated" button on a yarn card). */
function refreshYarnPicker(){
  const el = document.getElementById('pf-yarn-picker');
  if(el) el.innerHTML = buildYarnPickerHTML();
  else renderTab();
}

function renderYarnCard(y){
  const total = yarnTotalYardage(y);
  const subtitle = [y.colorway, y.colorwayNumber ? '#'+y.colorwayNumber : ''].filter(Boolean).map(esc).join(' · ');
  const allocated = yarnStatus(y)==='allocated';
  const allocatedProject = allocated && y.allocatedTo ? STATE.projects.find(p=>p.id===y.allocatedTo) : null;
  const multi = y.isMulticolor && y.colors && y.colors.length>=2;
  const swatchBg = multi ? buildConicGradient(y.colors) : y.colorHex;
  const swatchTitle = multi && y.colors.length>=4 ? ' title="4+ colors — reference only, not used in Palette Lab matching"' : '';
  // Reverse lookup: which projects/palettes reference this yarn.
  const usedInProjects = STATE.projects.filter(p=>(p.yarnIds||[]).includes(y.id));
  const usedInPalettes = STATE.paletteSavedPalettes.filter(pl=>(pl.slots||[]).some(s=>s.yarnId===y.id) || pl.baseYarnId===y.id);
  const usageBits = [];
  if(usedInProjects.length) usageBits.push(`${usedInProjects.length} project${usedInProjects.length===1?'':'s'}`);
  if(usedInPalettes.length) usageBits.push(`${usedInPalettes.length} palette${usedInPalettes.length===1?'':'s'}`);
  const usageLine = usageBits.length
    ? `<p class="note" style="margin-top:8px; font-size:0.7rem;" title="${esc([...usedInProjects.map(p=>p.name),...usedInPalettes.map(p=>p.name)].join(', '))}">Used in ${usageBits.join(' · ')}</p>`
    : '';
  return `<div class="card yarn-card">
    <div class="yarn-hole"></div>
    <div class="yarn-top">
      <div class="yarn-swatch-name">
        <span class="swatch" style="background:${swatchBg}"${swatchTitle}></span>
        <div style="min-width:0;">
          <p class="yarn-name">${esc(y.name)}</p>
          ${subtitle ? `<p class="yarn-sub">${subtitle}</p>` : ''}
        </div>
      </div>
      <div style="display:flex; gap:4px; flex-shrink:0;">
        <button class="del-btn" onclick="addScrapToYarn('${y.id}')" aria-label="Add a scrap" title="Add a leftover ball (scrap) of this yarn">⚖️</button>
        <button class="del-btn" onclick="showYarnForm('${y.id}')" aria-label="Edit yarn">${ICONS.pencil}</button>
        <button class="del-btn" onclick="deleteYarn('${y.id}')" aria-label="Remove yarn">${ICONS.trash}</button>
      </div>
    </div>
    <div class="yarn-meta">
      <span>${esc(categorizeFiber(y.fiber))}</span>
      <span>${esc(y.weightCategory||'')}</span>
    </div>
    ${y.dyeLot ? `<p class="note" style="margin:6px 0 0; font-size:0.7rem;">Dye lot ${esc(y.dyeLot)}</p>` : ''}
    ${renderYarnScrapsLine(y)}
    <div class="yarn-bottom">
      <span>
        <input type="number" value="${toDisplayLength(y.yardageRemaining)}" onchange="changeRemaining('${y.id}', this.value)" />
        / ${toDisplayLength(Math.max(total, Number(y.yardageRemaining)||0))} ${unitLabel()} ${Number(y.quantity)>0 ? `<span class="note">(${y.quantity}× ${toDisplayLength(y.skeinYardage)}${unitLabel()})</span>` : ''}
      </span>
      ${y.cost ? `<span class="note">$${(Number(y.cost)*y.quantity).toFixed(2)}</span>` : ''}
    </div>
    <div style="margin-top:8px; display:flex; align-items:center; justify-content:space-between;">
      <button type="button" class="harmony-btn ${allocated?'active':''}" onclick="toggleYarnStatus('${y.id}')" style="font-size:0.68rem; padding:3px 9px;">
        ${allocated ? 'Allocated' + (allocatedProject ? ' · '+esc(allocatedProject.name) : '') : 'Mark allocated'}
      </button>
    </div>
    ${usageLine}
  </div>`;
}

function renderYarnScrapsLine(y){
  const scraps = yarnScraps(y);
  if(!scraps.length) return '';
  const full = fullSkeinCount(y);
  return `<div class="scrap-line">
    <span class="note" style="font-size:0.72rem;">${full!=null ? `${full} full skein${full===1?'':'s'} + ` : ''}${scraps.length} scrap${scraps.length===1?'':'s'}:</span>
    <div class="scrap-chips">${scraps.map(c=>`<span class="scrap-chip">
      <button type="button" class="scrap-chip-main" onclick="reweighScrap('${y.id}','${c.id}')" title="Re-weigh this scrap">${esc(scrapLabel(y, c))}</button>
      <button type="button" onclick="removeScrap('${y.id}','${c.id}')" aria-label="Remove scrap" title="Remove this scrap">✕</button>
    </span>`).join('')}</div>
  </div>`;
}

/* =================================================================
   Projects
================================================================= */
function renderProjects(){
  const wip = STATE.projects.filter(p=>p.status==='WIP');
  let html = `<div class="row-between mb-4">
    <p class="note">${STATE.projects.length} project${STATE.projects.length===1?'':'s'} · ${wip.length} in progress</p>
    ${!STATE.showProjectForm ? `<button class="btn btn-primary" onclick="showProjectForm()">${ICONS.plus} Add project</button>` : ''}
  </div>`;
  if(STATE.showProjectForm) html += renderProjectForm();
  if(STATE.projects.length===0){
    html += `<div class="empty"><p class="title">No projects yet</p><p class="body">Log a project — planned, in progress, or finished — and link the yarn (and videos or blog posts) you're using.</p></div>`;
    return html;
  }
  // Status filter + sort once there are enough projects to warrant it.
  if(STATE.projects.length >= 6){
    html += `<div class="stash-controls">
      <select onchange="STATE.projFilterStatus=this.value; renderTab();">
        ${['All statuses',...STATUSES].map(s=>`<option ${(STATE.projFilterStatus||'All statuses')===s?'selected':''}>${s}</option>`).join('')}
      </select>
      <select onchange="setSort('projSort', this.value)" aria-label="Sort projects">
        ${[['recent','Newest'],['updated','Recently updated'],['name','Name A–Z'],['status','By status'],['start','Start date']].map(([v,l])=>`<option value="${v}" ${(STATE.projSort||'recent')===v?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>`;
  }
  let list = [...STATE.projects];
  const fs = STATE.projFilterStatus;
  if(fs && fs!=='All statuses') list = list.filter(p=>p.status===fs);
  const sort = STATE.projSort || 'recent';
  if(sort==='name') list.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sort==='status'){ const order={WIP:0,Planned:1,Finished:2,Frogged:3}; list.sort((a,b)=>(order[a.status]??9)-(order[b.status]??9)); }
  else if(sort==='start') list.sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||''));
  else if(sort==='updated') list.sort((a,b)=>updatedKey(b).localeCompare(updatedKey(a)));
  else list.reverse();

  if(list.length===0){
    html += `<div class="empty"><p class="title">No matches</p><p class="body">No projects match this filter.</p></div>`;
  } else {
    html += `<div class="card">${list.map(renderProjectRow).join('')}</div>`;
  }
  return html;
}

/* Shared cleanup for both yarn and project forms. If a brand-new project
   draft is discarded: (1) free any stash yarns that were allocated to it,
   and (2) give back any yardage that was deducted from stash during this
   session, since none of that should stick to a project that was never
   saved. Editing an *existing* project does not revert on cancel — yardage
   already recorded as used represents real-world consumption, not a draft. */
function cleanupOpenForms(){
  if(STATE.showProjectForm && STATE.editingProjectId && !STATE.projects.find(p=>p.id===STATE.editingProjectId)){
    let changed = false;
    STATE.yarns = STATE.yarns.map(y=>{
      let updated = y;
      if(y.allocatedTo===STATE.editingProjectId){ changed = true; updated = { ...updated, status:'available', allocatedTo:null }; }
      const usage = pendingProjectYarnUsage.find(u=>u.yarnId===y.id);
      if(usage && usage.yardageUsed){ changed = true; updated = { ...updated, yardageRemaining:(Number(updated.yardageRemaining)||0) + usage.yardageUsed }; }
      return updated;
    });
    if(changed) persist();
    // Discarding a brand-new draft — clean up any photos already uploaded
    // to Storage during this session so nothing's left orphaned.
    pendingProjectPhotos.forEach(url => window.FB.deletePhoto(url));
  }
  if(STATE.showPatternForm) discardPatternDraftFiles();
  STATE.showYarnForm = false;
  STATE.showProjectForm = false;
  STATE.showPatternForm = false;
  STATE.editingYarnId = null;
  STATE.editingProjectId = null;
  STATE.editingPatternId = null;
  pendingProjectPatternId = null;
  pendingProjectPatternSize = null;
  pendingProjectYarnUsage = [];
  pendingProjectYarnRequired = [];
  pendingProjectPhotos = [];
  pendingProjectCounters = [];
}

function showProjectForm(id){
  if(!STATE.online){ wgToast("You're offline — view-only until you reconnect.", "error"); return; }
  STATE.showProjectForm = true;
  STATE.editingProjectId = id || uid(); // real id when editing, draft id reserved up front when adding
  const editing = id ? STATE.projects.find(p=>p.id===id) : null;
  pendingProjectYarnIds = editing ? [...(editing.yarnIds||[])] : [];
  pendingProjectLinks = editing ? (editing.links||[]).map(l=>({...l})) : [];
  pendingProjectYarnUsage = editing ? (editing.yarnUsage||[]).map(u=>({...u})) : [];
  pendingProjectYarnRequired = editing ? (editing.yarnRequired||[]).map(u=>({...u})) : [];
  pendingProjectPhotos = editing ? [...(editing.photos||[])] : [];
  pendingProjectCounters = editing ? (editing.counters||[]).map(c=>({...c})) : [];
  pendingProjectPatternId = editing ? (editing.patternId||null) : null;
  pendingProjectPatternSize = editing ? (editing.patternSize||null) : null;
  renderTab();
}
function hideProjectForm(){ cleanupOpenForms(); renderTab(); }

/* Photo gallery — up to 3 per project. Uploads happen immediately (same
   philosophy as the yarn picker's allocate/remove actions), scoped to
   STATE.editingProjectId, which is reserved up front even for a brand-new
   project so the Storage path is stable before the project is ever saved. */
/* Row-counter configuration UI (inside the project edit form). Add/name/
   remove counters and set an optional "repeat every N" here; the actual
   +/− tapping happens from the project row. Edits are in-memory until the
   project is saved, consistent with the rest of the form. */
function buildCountersConfigHTML(){
  const rows = pendingProjectCounters.map((c,i)=>`
    <div class="row" style="margin-bottom:8px;">
      <input type="text" value="${esc(c.name||'')}" placeholder="Counter name" style="flex:1; min-width:100px;" onchange="updatePendingCounter(${i},'name',this.value)" />
      <label class="note" style="display:flex; align-items:center; gap:4px; white-space:nowrap;">start
        <input type="number" min="0" value="${Number(c.value)||0}" style="width:56px;" onchange="updatePendingCounter(${i},'value',this.value)" />
      </label>
      <label class="note" style="display:flex; align-items:center; gap:4px; white-space:nowrap;">repeat&nbsp;every
        <input type="number" min="0" value="${c.repeat||''}" placeholder="—" style="width:52px;" onchange="updatePendingCounter(${i},'repeat',this.value)" />
      </label>
      <button type="button" class="del-btn" onclick="removePendingCounter(${i})" aria-label="Remove counter">${ICONS.trash}</button>
    </div>`).join('');
  return `${rows}
    <button type="button" class="btn btn-ghost btn-small" onclick="addPendingCounter()">${ICONS.plus} Add counter</button>`;
}
function refreshCountersConfig(){
  const el = document.getElementById('pf-counters');
  if(el) el.innerHTML = buildCountersConfigHTML();
}
function addPendingCounter(){
  pendingProjectCounters.push({ id: uid(), name:'', value:0, repeat:null });
  refreshCountersConfig();
}
function removePendingCounter(i){
  pendingProjectCounters.splice(i,1);
  refreshCountersConfig();
}
function updatePendingCounter(i, field, val){
  const c = pendingProjectCounters[i];
  if(!c) return;
  if(field==='name') c.name = val;
  else if(field==='value') c.value = Math.max(0, Number(val)||0);
  else if(field==='repeat') c.repeat = val==='' ? null : Math.max(0, Number(val)||0) || null;
  // no re-render needed for text typing; repeat/value re-render not required either
}

function buildProjectPhotosHTML(){
  const thumbs = pendingProjectPhotos.map((url,i)=>`
    <div class="photo-thumb">
      <img src="${esc(url)}" alt="" />
      <button type="button" class="photo-thumb-remove" onclick="removeProjectPhoto(${i})" aria-label="Remove photo">✕</button>
    </div>`).join('');
  const canAddMore = pendingProjectPhotos.length < 3;
  return `
    <div class="photo-thumb-row">${thumbs}</div>
    ${canAddMore
      ? `<div class="photo-dropzone photo-dropzone-lg" ondragover="onPhotoDropzoneDragOver(event)" ondragleave="onPhotoDropzoneDragLeave(event)" ondrop="onProjectPhotoDrop(event)">
           <span class="note">Drag a photo here, or</span>
           <button type="button" class="btn btn-ghost btn-small" onclick="document.getElementById('pf-photo-input').click()">${ICONS.upload} Add photo (${pendingProjectPhotos.length}/3)</button>
           <input id="pf-photo-input" type="file" accept="image/*,.heic,.heif" class="hidden" onchange="handleProjectPhotoUpload(event)" />
         </div>
         <p id="pf-photo-status" class="note" style="display:none; text-align:center; margin-top:6px;">Uploading…</p>`
      : `<p class="note">Maximum of 3 photos for this project.</p>`}
  `;
}
function refreshProjectPhotos(){
  const el = document.getElementById('pf-photos');
  if(el) el.innerHTML = buildProjectPhotosHTML();
}
function handleProjectPhotoUpload(e){
  const file = e.target.files[0];
  e.target.value = '';
  if(file) processProjectPhotoFile(file);
}
function onProjectPhotoDrop(e){
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if(file) processProjectPhotoFile(file);
}
async function processProjectPhotoFile(file){
  if(!isAcceptableImageFile(file)) return;
  if(pendingProjectPhotos.length >= 3 || !STATE.user) return;
  const statusEl = document.getElementById('pf-photo-status');
  if(statusEl) statusEl.style.display = 'block';
  try{
    const usable = await toRenderableImageBlob(file);
    const blob = await compressImageFile(usable);
    const url = await window.FB.uploadProjectPhoto(STATE.user.uid, STATE.editingProjectId, blob, `${uid()}.jpg`);
    pendingProjectPhotos.push(url);
  }catch(err){
    console.error('Photo upload failed', err);
    wgToast(err.message || "Couldn't upload that photo — try again.", "error");
  }
  refreshProjectPhotos();
}
function removeProjectPhoto(i){
  const url = pendingProjectPhotos[i];
  pendingProjectPhotos.splice(i,1);
  refreshProjectPhotos();
  if(url) window.FB.deletePhoto(url);
}

/* Yarn picker: unlinked stash yarns show as tap-to-add chips; once linked,
   a yarn drops into its own row with live controls — yards used so far
   (which actually deducts from stash as you go), allocate, remove-from-
   stash, and unlink. Rebuilt in isolation by refreshYarnPicker() so the
   rest of the project form is never touched. */
function buildYarnPickerHTML(){
  if(STATE.yarns.length===0) return `<p class="note">Add yarn to your stash first to link it here.</p>`;
  const linked = STATE.yarns.filter(y=>pendingProjectYarnIds.includes(y.id));
  const unlinked = STATE.yarns.filter(y=>!pendingProjectYarnIds.includes(y.id));

  const chips = unlinked.length
    ? `<div class="yarn-picker">${unlinked.map(y=>`
        <button type="button" class="yarn-chip" onclick="toggleProjectYarn('${y.id}')">
          <span class="dot" style="background:${(y.isMulticolor && y.colors && y.colors.length>=2) ? buildConicGradient(y.colors) : y.colorHex}"></span>${esc(yarnDisplayName(y))}
        </button>`).join('')}</div>`
    : `<p class="note">Every stash yarn is already linked to this project.</p>`;

  const rows = linked.map(y=>{
    const allocated = yarnStatus(y)==='allocated';
    const usage = pendingProjectYarnUsage.find(u=>u.yarnId===y.id);
    const used = usage ? usage.yardageUsed : 0;
    const req = pendingProjectYarnRequired.find(u=>u.yarnId===y.id);
    const required = req ? req.yardage : '';
    const reqNum = Number(required)||0;
    const remaining = Number(y.yardageRemaining)||0;
    const shortfall = reqNum > remaining ? reqNum - remaining : 0;
    // Show the "used" value in whatever entry unit was last chosen this session
    // (skeins/grams/length), so the field doesn't snap back to length on re-render.
    const usedDisplay = yardsToUsedEntry(used, _usedModeMemory[y.id], y);
    return `<div style="padding:9px 2px; border-bottom:1px dashed var(--border);">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span class="dot" style="background:${(y.isMulticolor && y.colors && y.colors.length>=2) ? buildConicGradient(y.colors) : y.colorHex}; flex-shrink:0;"></span>
        <span style="font-size:0.82rem; flex:1; min-width:110px;">${esc(yarnDisplayName(y))}</span>
        <button type="button" class="btn btn-ghost btn-small" onclick="toggleYarnStatus('${y.id}','${STATE.editingProjectId}')" title="Not fully used? Set it aside so it's excluded from your 'unused stash' count.">${allocated?'Un-allocate':'Allocate'}</button>
        <button type="button" class="btn btn-ghost btn-small" onclick="removeYarnFromStashInline('${y.id}')" title="Skein is gone — remove it from the stash entirely">${ICONS.trash}</button>
        <button type="button" class="btn btn-ghost btn-small" onclick="toggleProjectYarn('${y.id}')" title="Unlink from this project (gives back any yardage recorded here)">✕</button>
      </div>
      <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:6px; padding-left:18px;">
        <label style="display:flex; align-items:center; gap:4px; font-size:0.72rem; color:var(--ink-soft);">
          Need <input type="number" min="0" value="${required===''?'':toDisplayLength(required)}" placeholder="0" style="width:60px;" onchange="updateProjectYarnRequired('${y.id}', this.value)" /> ${unitLabel()}
        </label>
        <label style="display:flex; align-items:center; gap:4px; font-size:0.72rem; color:var(--ink-soft);">
          Used <input type="number" min="0" step="any" value="${usedDisplay}" style="width:60px;" id="usedin-${y.id}" onchange="updateProjectYarnUsageModal('${y.id}')" />
          <select id="usedmode-${y.id}" style="font-size:0.7rem; padding:2px 4px;" onchange="onUsedModeChange('${y.id}')">
            <option value="len" ${_usedModeMemory[y.id]!=='skeins'&&_usedModeMemory[y.id]!=='grams'?'selected':''}>${unitLabel()}</option>
            ${(Number(y.skeinYardage)>0 && Number(y.skeinWeightGrams)>0) ? `<option value="skeins" ${_usedModeMemory[y.id]==='skeins'?'selected':''}>skeins</option><option value="grams" ${_usedModeMemory[y.id]==='grams'?'selected':''}>g</option>` : ''}
          </select>
        </label>
        ${(Number(y.skeinYardage)>0 || yarnScraps(y).length) ? `<label style="display:flex; align-items:center; gap:4px; font-size:0.72rem; color:var(--ink-soft);">
          from <select id="usedsrc-${y.id}" style="font-size:0.7rem; padding:2px 4px;" onchange="_usedSourceMemory['${y.id}']=this.value" title="Which ball the next amount you record comes out of">
            <option value="new">new skein</option>
            ${yarnScraps(y).map(c=>`<option value="${c.id}" ${_usedSourceMemory[y.id]===c.id?'selected':''}>scrap · ${esc(scrapLabel(y, c))}</option>`).join('')}
          </select>
        </label>` : ''}
        <span class="note" style="font-size:0.7rem; white-space:nowrap;">${toDisplayLength(remaining)} ${unitLabel()} in stash</span>
        ${shortfall>0 ? `<span class="note" style="font-size:0.7rem; color:var(--wine); white-space:nowrap;">short ${toDisplayLength(shortfall)} ${unitLabel()}</span>` : (reqNum>0 ? `<span class="note" style="font-size:0.7rem; color:var(--forest);">enough</span>` : '')}
      </div>
    </div>`;
  }).join('');

  return `${chips}${linked.length ? `<div style="margin-top:10px;">${rows}</div>` : ''}`;
}

function toggleProjectYarn(id){
  const isLinked = pendingProjectYarnIds.includes(id);
  if(isLinked){
    const usage = pendingProjectYarnUsage.find(u=>u.yarnId===id);
    if(usage && usage.yardageUsed){
      STATE.yarns = STATE.yarns.map(y => y.id===id ? { ...y, yardageRemaining:(Number(y.yardageRemaining)||0) + usage.yardageUsed } : y);
      persist();
    }
    pendingProjectYarnUsage = pendingProjectYarnUsage.filter(u=>u.yarnId!==id);
    pendingProjectYarnRequired = pendingProjectYarnRequired.filter(u=>u.yarnId!==id);
    pendingProjectYarnIds = pendingProjectYarnIds.filter(x=>x!==id);
  } else {
    pendingProjectYarnIds = [...pendingProjectYarnIds, id];
  }
  refreshYarnPicker();
}
/* Selecting a saved palette on a project: link each of the palette's yarns
   that's still in stock to the project, and report which are gone (deleted)
   or out of yardage — so the user immediately sees what they can and can't
   make from that palette. */
function applyPaletteToProject(paletteId){
  const statusEl = document.getElementById('pf-palette-status');
  if(!paletteId){ if(statusEl) statusEl.innerHTML=''; return; }
  const pal = STATE.paletteSavedPalettes.find(p=>p.id===paletteId);
  if(!pal){ if(statusEl) statusEl.innerHTML=''; return; }
  const yarnIds = [];
  if(pal.baseYarnId) yarnIds.push(pal.baseYarnId);
  (pal.slots||[]).forEach(s=>{ if(s.yarnId) yarnIds.push(s.yarnId); });

  const linked=[], gone=[], empty=[];
  [...new Set(yarnIds)].forEach(id=>{
    const y = STATE.yarns.find(yy=>yy.id===id);
    if(!y){ gone.push(id); return; }
    if((Number(y.yardageRemaining)||0) <= 0){ empty.push(y); }
    if(!pendingProjectYarnIds.includes(id)) pendingProjectYarnIds.push(id);
    linked.push(y);
  });

  const parts = [];
  if(linked.length) parts.push(`<span style="color:var(--forest);">Linked ${linked.length} yarn${linked.length===1?'':'s'} from this palette.</span>`);
  if(empty.length) parts.push(`<span class="danger-text">Out of stock: ${empty.map(y=>esc(yarnDisplayName(y))).join(', ')}.</span>`);
  if(gone.length) parts.push(`<span class="danger-text">${gone.length} palette yarn${gone.length===1?'':'s'} no longer in your stash.</span>`);
  if(statusEl) statusEl.innerHTML = `<p class="note" style="margin:0; line-height:1.5;">${parts.join(' ')}</p>`;
  refreshYarnPicker();
}
/* The actual stash-quantity-tracking feature: editing "yards used" for a
   linked yarn deducts only the *change* from last time from that yarn's
   yardageRemaining, so re-editing the number as a project progresses
   (rather than only recording a final total) keeps the stash accurate. */
/* Core: set a yarn's used-yardage for this project, given a CANONICAL YARDS
   value. Adjusts stash remaining by the delta. */
function setProjectYarnUsageYards(yarnId, yardsUsed){
  const newVal = Math.max(0, Math.round(yardsUsed)||0);
  const entry = pendingProjectYarnUsage.find(u=>u.yarnId===yarnId);
  const prevVal = entry ? entry.yardageUsed : 0;
  const delta = newVal - prevVal;
  // More used: take it from the ball the user picked (a new skein or a
  // scrap). Less used (a correction): give it back to the total.
  const srcEl = document.getElementById('usedsrc-'+yarnId);
  const source = srcEl ? srcEl.value : 'new';
  STATE.yarns = STATE.yarns.map(y => {
    if(y.id!==yarnId) return y;
    return delta>0 ? applyYarnUse(y, delta, source) : { ...y, yardageRemaining:(Number(y.yardageRemaining)||0) - delta };
  });
  if(source!=='new' && !yarnScraps(STATE.yarns.find(y=>y.id===yarnId)||{}).some(c=>c.id===source)) delete _usedSourceMemory[yarnId];
  if(entry) entry.yardageUsed = newVal;
  else pendingProjectYarnUsage.push({ yarnId, yardageUsed: newVal });
  persist();
  refreshYarnPicker();
}
/* Session-only memory of the chosen entry unit (len/skeins/grams) per yarn
   in the project usage picker. Not persisted to Firebase — resets on reload
   to the yd/m preference — but held during the session so the dropdown and
   field don't snap back to length after every entry. */
const _usedModeMemory = {};
const _usedSourceMemory = {};   // per-yarn chosen source ('new' or a scrap id), session-only
/* Convert canonical yards to the value shown in a given entry mode. */
function yardsToUsedEntry(yards, mode, yarn){
  const y = Number(yards)||0;
  if(mode==='skeins' && yarn && Number(yarn.skeinYardage)>0){
    return Math.round((y/Number(yarn.skeinYardage))*100)/100;  // 2 dp
  }
  if(mode==='grams' && yarn && Number(yarn.skeinWeightGrams)>0 && Number(yarn.skeinYardage)>0){
    return Math.round((y/Number(yarn.skeinYardage))*Number(yarn.skeinWeightGrams));
  }
  return toDisplayLength(y);
}
/* Kept for compatibility: interpret a plain length-unit input. */
function updateProjectYarnUsage(yarnId, val){
  setProjectYarnUsageYards(yarnId, fromInputLength(val));
}
/* Reads the Used field + its input-mode selector, converts to canonical
   yards using the yarn's skein specs when mode is skeins/grams, and applies.
   skeins→yards = skeins × yardsPerSkein; grams→yards = (grams/gramsPerSkein) × yardsPerSkein. */
function updateProjectYarnUsageModal(yarnId){
  const numEl = document.getElementById('usedin-'+yarnId);
  const modeEl = document.getElementById('usedmode-'+yarnId);
  if(!numEl) return;
  const n = Number(numEl.value)||0;
  const mode = modeEl ? modeEl.value : 'len';
  _usedModeMemory[yarnId] = mode;   // remember the chosen unit for this session
  const y = STATE.yarns.find(yy=>yy.id===yarnId);
  let yards;
  if(mode==='skeins' && y && Number(y.skeinYardage)>0){
    yards = n * Number(y.skeinYardage);
  } else if(mode==='grams' && y && Number(y.skeinWeightGrams)>0 && Number(y.skeinYardage)>0){
    yards = (n / Number(y.skeinWeightGrams)) * Number(y.skeinYardage);
  } else {
    yards = fromInputLength(n);   // length mode (yd or m per preference)
  }
  setProjectYarnUsageYards(yarnId, yards);
}
/* Switching input mode: remember the new mode, then re-render so the field
   redisplays the same underlying amount in the newly-chosen unit. */
function onUsedModeChange(yarnId){
  const modeEl = document.getElementById('usedmode-'+yarnId);
  _usedModeMemory[yarnId] = modeEl ? modeEl.value : 'len';
  refreshYarnPicker();
}
/* Per-yarn "need" for this project — pure requirement, doesn't touch stock.
   Editing it just re-renders so the per-yarn shortfall updates live. */
function updateProjectYarnRequired(yarnId, val){
  const newVal = val==='' ? '' : Math.max(0, fromInputLength(val));
  const entry = pendingProjectYarnRequired.find(u=>u.yarnId===yarnId);
  if(entry) entry.yardage = newVal;
  else pendingProjectYarnRequired.push({ yarnId, yardage: newVal });
  refreshYarnPicker();
}
async function removeYarnFromStashInline(yarnId){
  if(!(await wgConfirm('Remove this yarn from your stash entirely? This cannot be undone.', {title:'Remove yarn', okLabel:'Remove', danger:true}))) return;
  STATE.yarns = STATE.yarns.filter(y=>y.id!==yarnId);
  pendingProjectYarnIds = pendingProjectYarnIds.filter(id=>id!==yarnId);
  pendingProjectYarnUsage = pendingProjectYarnUsage.filter(u=>u.yarnId!==yarnId);
  pendingProjectYarnRequired = pendingProjectYarnRequired.filter(u=>u.yarnId!==yarnId);
  persist();
  refreshYarnPicker();
}

function renderProjectForm(){
  const editing = STATE.projects.find(p=>p.id===STATE.editingProjectId) || null;
  const v = (field, fallback='') => editing ? esc(editing[field] ?? fallback) : fallback;
  const hasGarmentInfo = !!(editing && (editing.garmentSize || editing.garmentGender));
  const isStandardSize = editing && editing.garmentSize && GARMENT_SIZES.includes(editing.garmentSize);
  const isCustomSize = editing && editing.garmentSize && !isStandardSize;

  const inner = `
  <form class="card form-grid" onsubmit="handleSaveProject(event)" style="margin-bottom:22px;">
    <label class="field">Project name
      <input id="pf-name" required placeholder="Gift cowl for Dana" value="${v('name')}" />
    </label>
    <div class="field pf-pattern-field">
      <label for="pf-pattern">Pattern (optional)</label>
      ${buildProjectPatternPicker()}
      <input id="pf-pattern" value="${v('patternName')}" placeholder="${STATE.patterns.length ? 'Or type a pattern name' : ''}" />
      <div id="pf-pattern-size">${buildProjectPatternSizeHTML()}</div>
    </div>
    <label class="field">Hook / needle size (optional)
      <input id="pf-needlesize" placeholder="e.g. 4.5 mm / US 7" value="${v('needleSize')}" />
    </label>
    <div class="field span2">
      <span class="note" style="display:block; margin-bottom:4px;">Gauge achieved (optional) — record what you got, to reproduce it later</span>
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; font-size:0.8rem; color:var(--ink-soft);">
        <input id="pf-gauge-sts" type="number" min="0" step="any" placeholder="18" style="width:60px;" value="${editing && editing.gauge ? esc(editing.gauge.sts??'') : ''}" /> sts ×
        <input id="pf-gauge-rows" type="number" min="0" step="any" placeholder="24" style="width:60px;" value="${editing && editing.gauge ? esc(editing.gauge.rows??'') : ''}" /> rows per
        <select id="pf-gauge-unit">
          <option value="in" ${editing && editing.gauge && editing.gauge.unit==='cm'?'':'selected'}>4 in</option>
          <option value="cm" ${editing && editing.gauge && editing.gauge.unit==='cm'?'selected':''}>10 cm</option>
        </select>
      </div>
    </div>
    <label class="field">Status
      <select id="pf-status">${STATUSES.map(s=>`<option ${(editing ? editing.status===s : s==='Planned')?'selected':''}>${s}</option>`).join('')}</select>
    </label>
    <label class="field">Start date
      <input id="pf-startdate" type="date" value="${editing ? esc(editing.startDate) : todayStr()}" />
    </label>
    <label class="field">Finish date (optional)
      <input id="pf-finishdate" type="date" value="${v('finishDate')}" />
    </label>

    <details class="span2" ${hasGarmentInfo?'open':''} style="border:1px solid var(--border); border-radius:8px; padding:10px 14px;">
      <summary style="cursor:pointer; font-size:0.85rem; color:var(--ink-soft);">Garment details (optional)</summary>
      <div class="form-grid" style="margin-top:12px; margin-bottom:0;">
        <label class="field">Size
          <select id="pf-garment-size" onchange="onGarmentSizeChange()">
            <option value="">—</option>
            ${GARMENT_SIZES.map(s=>`<option ${isStandardSize && editing.garmentSize===s?'selected':''}>${s}</option>`).join('')}
            <option value="__custom__" ${isCustomSize?'selected':''}>Custom…</option>
          </select>
        </label>
        <label class="field" id="pf-garment-size-custom-wrap" style="display:${isCustomSize?'flex':'none'};">Custom size
          <input id="pf-garment-size-custom" placeholder="e.g. 6-12 months" value="${isCustomSize ? esc(editing.garmentSize) : ''}" />
        </label>
        <label class="field">Fit
          <select id="pf-garment-gender">
            <option value="">—</option>
            <option ${editing && editing.garmentGender==="Unisex"?'selected':''}>Unisex</option>
            <option ${editing && editing.garmentGender==="Women's"?'selected':''}>Women's</option>
            <option ${editing && editing.garmentGender==="Men's"?'selected':''}>Men's</option>
          </select>
        </label>
      </div>
    </details>

    ${STATE.paletteSavedPalettes.length ? `
    <label class="field span2">Palette (optional)
      <select id="pf-palette" onchange="applyPaletteToProject(this.value)">
        <option value="">— none —</option>
        ${STATE.paletteSavedPalettes.map(p=>`<option value="${p.id}" ${editing && editing.paletteId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
      </select>
      <div id="pf-palette-status" style="margin-top:6px;"></div>
    </label>` : ''}

    <div class="span2">
      <span class="note field-label">Photos (up to 3) — shown on the Showcase tab once this project is Finished</span>
      <div id="pf-photos">${buildProjectPhotosHTML()}</div>
    </div>

    <div class="span2">
      <span class="note field-label">Row counters — add named counters (rows, repeats, pattern sections). Tap +/− from the project list while you work.</span>
      <div id="pf-counters">${buildCountersConfigHTML()}</div>
    </div>

    <div class="span2">
      <span class="note field-label">Yarns used — tap to link, then track yards used, allocate, or remove as the project goes. (The simple total above is only used if you don't track per-yarn usage here.)</span>
      <div id="pf-yarn-picker">${buildYarnPickerHTML()}</div>
    </div>

    <label class="field span2">Notes (optional)
      <textarea id="pf-notes" rows="4" placeholder="Modifications, where you left off, what you'd change next time…">${v('notes')}</textarea>
    </label>

    <div class="span2">
      <span class="note field-label">Links (pattern, YouTube tutorial, blog post…)</span>
      <div class="link-input-row">
        <input id="pf-link-url" placeholder="https://youtube.com/watch?v=..." class="grow" />
        <button type="button" class="btn btn-ghost btn-small" onclick="addProjectLink()">${ICONS.link} Add link</button>
      </div>
      <div id="pf-link-previews" class="link-preview-row">${pendingProjectLinks.map(l => `
        <span class="link-preview-chip">
          ${l.thumbnail ? `<img src="${esc(l.thumbnail)}" alt="" />` : ''}
          ${esc(l.title)}
          <button type="button" onclick="removePendingLink('${l.id}')">✕</button>
        </span>`).join('')}</div>
    </div>

    <div class="span2 form-actions-inline row-end">
      <button type="button" class="btn btn-ghost" onclick="hideProjectForm()">Cancel</button>
      <button type="submit" class="btn btn-primary">${editing ? 'Save changes' : 'Add project'}</button>
    </div>
  </form>`;
  return wrapFormForMobile(inner, editing ? 'Edit project' : 'Add project', 'submitProjectForm()', 'hideProjectForm()');
}
function submitProjectForm(){
  const f = document.querySelector('#inner-tab-content form, .fullscreen-form form');
  if(f) f.requestSubmit ? f.requestSubmit() : f.querySelector('[type=submit]').click();
}
function onGarmentSizeChange(){
  const val = document.getElementById('pf-garment-size').value;
  document.getElementById('pf-garment-size-custom-wrap').style.display = val==='__custom__' ? 'flex' : 'none';
}

async function addProjectLink(){
  const input = document.getElementById('pf-link-url');
  const url = (input.value||'').trim();
  if(!url) return;
  input.value = '';
  let parsed;
  try{ parsed = new URL(url); }catch(e){ return; }
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i);
  const vim = url.match(/vimeo\.com\/(\d+)/i);
  const linkObj = { id:uid(), url, type: yt?'youtube':vim?'vimeo':'link', title:parsed.hostname.replace('www.',''), thumbnail:null };
  pendingProjectLinks.push(linkObj);
  renderLinkPreviews();
  try{
    if(yt){
      const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if(r.ok){ const data = await r.json(); linkObj.title = data.title; linkObj.thumbnail = data.thumbnail_url; }
    } else if(vim){
      const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
      if(r.ok){ const data = await r.json(); linkObj.title = data.title; linkObj.thumbnail = data.thumbnail_url; }
    } else if(LINK_PREVIEW_ENDPOINT && !LINK_PREVIEW_ENDPOINT.startsWith('REPLACE_ME')){
      // Generic pattern/blog link — ask our own Cloud Function to read the
      // page's og:image, since the browser can't fetch another site's HTML
      // directly (CORS). Falls back silently to the plain bookmark card
      // (title/domain already set above) if this fails for any reason.
      const idToken = await window.FB.getIdToken();
      const r = await fetch(`${LINK_PREVIEW_ENDPOINT}?url=${encodeURIComponent(url)}`, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {}
      });
      if(r.ok){
        const data = await r.json();
        if(data.title) linkObj.title = data.title;
        if(data.image) linkObj.thumbnail = data.image;
      }
    }
  }catch(err){ /* fall back to hostname title already set */ }
  renderLinkPreviews();
}
function removePendingLink(id){
  pendingProjectLinks = pendingProjectLinks.filter(l=>l.id!==id);
  renderLinkPreviews();
}
function renderLinkPreviews(){
  const el = document.getElementById('pf-link-previews');
  if(!el) return;
  el.innerHTML = pendingProjectLinks.map(l => `
    <span class="link-preview-chip">
      ${l.thumbnail ? `<img src="${esc(l.thumbnail)}" alt="" />` : ''}
      ${esc(l.title)}
      <button type="button" onclick="removePendingLink('${l.id}')">✕</button>
    </span>`).join('');
}

function handleSaveProject(e){
  e.preventDefault();
  const name = document.getElementById('pf-name').value.trim();
  if(!name) return;
  const existing = STATE.projects.find(p=>p.id===STATE.editingProjectId);
  const sizeSelect = document.getElementById('pf-garment-size').value;
  const garmentSize = sizeSelect === '__custom__' ? document.getElementById('pf-garment-size-custom').value.trim() : sizeSelect;
  // Making a pattern in a given size with one yarn: that size's yardage
  // becomes the yarn's "need", unless one is already set.
  const sizePat = STATE.patterns.find(p=>p.id===pendingProjectPatternId);
  const sizeRow = sizePat && (sizePat.sizes||[]).find(x=>x.label===pendingProjectPatternSize);
  if(sizeRow && pendingProjectYarnIds.length===1 && !pendingProjectYarnRequired.some(u=>u.yarnId===pendingProjectYarnIds[0] && Number(u.yardage) > 0)){
    pendingProjectYarnRequired = pendingProjectYarnRequired.filter(u=>u.yarnId!==pendingProjectYarnIds[0]);
    pendingProjectYarnRequired.push({ yarnId: pendingProjectYarnIds[0], yardage: sizeRow.yardage });
  }
  const fields = {
    name,
    patternName: document.getElementById('pf-pattern').value.trim(),
    needleSize: document.getElementById('pf-needlesize').value.trim() || null,
    notes: document.getElementById('pf-notes').value.trim() || null,
    patternId: pendingProjectPatternId || null,
    patternSize: pendingProjectPatternId ? (pendingProjectPatternSize || null) : null,
    gauge: (()=>{
      const s = document.getElementById('pf-gauge-sts').value;
      const r = document.getElementById('pf-gauge-rows').value;
      if(s==='' && r==='') return null;
      // Keep details saved from the gauge calculator (craft, stitch type, terms).
      const prev = (existing && existing.gauge) || {};
      return { ...prev, sts: s===''?null:Number(s), rows: r===''?null:Number(r), unit: document.getElementById('pf-gauge-unit').value };
    })(),
    status: document.getElementById('pf-status').value,
    startDate: document.getElementById('pf-startdate').value || todayStr(),
    finishDate: document.getElementById('pf-finishdate').value || null,
    garmentSize: garmentSize || null,
    garmentGender: document.getElementById('pf-garment-gender').value || null,
    paletteId: (document.getElementById('pf-palette') ? document.getElementById('pf-palette').value : (existing && existing.paletteId)) || null,
    yarnIds: [...pendingProjectYarnIds],
    yarnUsage: pendingProjectYarnUsage.map(u=>({...u})),
    yarnRequired: pendingProjectYarnRequired.map(u=>({...u})),
    photos: [...pendingProjectPhotos],
    counters: pendingProjectCounters.map(c=>({...c})),
    links: pendingProjectLinks.map(l=>({ id:l.id, url:l.url, type:l.type, title:l.title, thumbnail:l.thumbnail }))
  };
  if(existing){
    STATE.projects = STATE.projects.map(p => p.id===STATE.editingProjectId ? { ...p, ...fields, updatedAt: new Date().toISOString() } : p);
  } else {
    STATE.projects.push({ id: STATE.editingProjectId, ...fields, createdAt: todayStr(), updatedAt: new Date().toISOString() });
  }
  persist();
  STATE.showProjectForm = false;
  STATE.editingProjectId = null;
  pendingProjectYarnUsage = [];
  pendingProjectYarnRequired = [];
  pendingProjectPhotos = [];
  pendingProjectCounters = [];
  renderTab();
  scrollToTop();
}

async function deleteProject(id){
  if(!(await wgConfirm("Delete this project? This cannot be undone.", {title:'Delete project', okLabel:'Delete', danger:true}))) return;
  const proj = STATE.projects.find(p=>p.id===id);
  if(proj && proj.photos) proj.photos.forEach(url => window.FB.deletePhoto(url));
  STATE.yarns = STATE.yarns.map(y => y.allocatedTo===id ? { ...y, status:'available', allocatedTo:null } : y);
  STATE.projects = STATE.projects.filter(p=>p.id!==id);
  persist();
  renderTab();
}
function updateProjectStatus(id, status){
  STATE.projects = STATE.projects.map(p => p.id===id ? {...p, status} : p);
  persist();
  renderTab();
}
/* Duplicate a project — copies the PLAN (name, pattern, needle, gauge, linked
   yarns, per-yarn "need", counter setup) but resets PROGRESS: status back to
   Planned, no dates, no photos, and usage cleared (so it doesn't double-deduct
   stock or double-reference the original's uploaded photos). For remaking the
   same thing without re-entering everything. */
function duplicateProject(id){
  const src = STATE.projects.find(p=>p.id===id);
  if(!src) return;
  const copy = {
    ...JSON.parse(JSON.stringify(src)),
    id: uid(),
    name: (src.name||'Project') + ' (copy)',
    status: 'Planned',
    startDate: todayStr(),
    finishDate: null,
    yarnUsage: [],                 // reset progress so stock isn't double-counted
    photos: [],                    // don't share the original's uploaded images
    createdAt: todayStr(),
    updatedAt: new Date().toISOString()
  };
  // Keep counters' configuration but zero their live progress.
  if(Array.isArray(copy.counters)){
    copy.counters = copy.counters.map(c=>({ ...c, value:0, stitches:null }));
  }
  STATE.projects.push(copy);   // array is oldest→newest, so "Newest" shows it first
  persist();
  wgToast('Project duplicated — progress reset, plan kept.', 'success');
  renderTab();
  scrollToTop();
}

function renderProjectRow(p){
  const usedYarns = STATE.yarns.filter(y => (p.yarnIds||[]).includes(y.id));
  const daysActive = p.status==='WIP' ? daysBetween(p.startDate, todayStr()) : null;
  const garmentBadge = (p.garmentSize || p.garmentGender) ? [p.garmentGender, p.garmentSize].filter(Boolean).join(' · ') : null;
  const attachedPalette = p.paletteId ? STATE.paletteSavedPalettes.find(pp=>pp.id===p.paletteId) : null;
  const gapInfo = projectYardageGap(p);
  const gapBadge = gapInfo && gapInfo.gap>0 ? `<span class="note danger-text">need ${toDisplayLength(gapInfo.gap)} ${unitLabel()}</span>` : (gapInfo ? `<span class="note" style="color:var(--forest);">enough on hand</span>` : '');
  const linkStrip = (p.links||[]).length ? `<div class="link-strip">${p.links.map(l => l.thumbnail
      ? `<a class="link-card" href="${esc(l.url)}" target="_blank" rel="noopener"><img src="${esc(l.thumbnail)}" alt=""/><span class="link-title">${esc(l.title)}</span></a>`
      : `<a class="link-card generic" href="${esc(l.url)}" target="_blank" rel="noopener">${ICONS.link}<span class="link-title">${esc(l.title)}</span></a>`
    ).join('')}</div>` : '';
  const counters = p.counters || [];
  const expanded = STATE.expandedCounters === p.id;
  const counterToggle = counters.length
    ? `<button class="del-btn" onclick="toggleCounterPanel('${p.id}')" aria-label="Counters" title="Row counters">${ICONS.clipboard}</button>`
    : '';
  const counterPanel = (counters.length && expanded)
    ? `<div class="counter-panel">${counters.map(c=>renderCounter(p.id, c)).join('')}</div>`
    : '';
  return `<div class="project-row">
    <span class="status-dot" style="background:${STATUS_COLORS[p.status]}"></span>
    <div class="grow">
      <p class="project-name">${esc(p.name)}${p.patternName ? ` <span class="pattern">— ${p.patternId && STATE.patterns.some(pt=>pt.id===p.patternId) ? `<button type="button" class="pattern-inline-link" onclick="openPatternInLibrary('${p.patternId}')" title="Open in pattern library">${ICONS.book} ${esc(p.patternName)}</button>` : esc(p.patternName)}${p.patternSize ? ` · size ${esc(p.patternSize)}` : ''}</span>` : ''}</p>
      <div class="project-meta">
        ${usedYarns.map(y=>`<span class="dot" style="background:${y.colorHex}" title="${esc(y.name)}"></span>`).join('')}
        ${garmentBadge ? `<span class="note">${esc(garmentBadge)}</span>` : ''}
        ${p.needleSize ? `<span class="note">🪡 ${esc(p.needleSize)}</span>` : ''}
        ${p.gauge && (p.gauge.sts||p.gauge.rows) ? `<span class="note">📐 ${p.gauge.sts||'?'}×${p.gauge.rows||'?'}/${p.gauge.unit==='cm'?'10cm':'4in'}${p.gauge.stitchType?` ${esc(p.gauge.stitchType)}${p.gauge.terms==='uk'?' (UK)':''}`:''}</span>` : ''}
        ${attachedPalette ? `<span class="note">${ICONS.palette} ${esc(attachedPalette.name)}</span>` : ''}
        ${gapBadge}
        ${counters.length ? `<span class="note">${counters.length} counter${counters.length===1?'':'s'}</span>` : ''}
        ${daysActive!=null ? `<span class="days">${daysActive}d in progress</span>` : ''}
      </div>
      ${p.notes ? renderProjectNotes(p.notes) : ''}
      ${linkStrip}
      ${counterPanel}
    </div>
    <select class="status-select" onchange="updateProjectStatus('${p.id}', this.value)">
      ${STATUSES.map(s=>`<option ${s===p.status?'selected':''}>${s}</option>`).join('')}
    </select>
    ${counterToggle}
    ${gapInfo && gapInfo.gap>0 ? `<button class="del-btn" onclick="shopProjectGap('${p.id}')" aria-label="Add gap to shopping list" title="Add the ${Math.round(gapInfo.gap)} yd gap to your shopping list">${ICONS.cart}</button>` : ''}
    <button class="del-btn" onclick="duplicateProject('${p.id}')" aria-label="Duplicate project" title="Make a copy of this project">⧉</button>
    <button class="del-btn" onclick="showProjectForm('${p.id}')" aria-label="Edit project">${ICONS.pencil}</button>
    <button class="del-btn" onclick="deleteProject('${p.id}')" aria-label="Delete project">${ICONS.trash}</button>
  </div>`;
}
/* Project notes on the list row: first line as a one-line preview; tap to
   expand the full text (line breaks preserved). */
function renderProjectNotes(notes){
  const first = notes.split('\n')[0];
  const more = notes.length > first.length || first.length > 80;
  if(!more) return `<p class="project-notes note">📝 ${esc(first)}</p>`;
  return `<details class="project-notes note">
    <summary>📝 ${esc(first.length>80 ? first.slice(0,80)+'…' : first)}</summary>
    <div class="project-notes-full">${esc(notes)}</div>
  </details>`;
}
/* --- Row counters (used from the project row; configured in the edit form) --- */
function renderCounter(projectId, c){
  const atRepeat = c.repeat && c.value>0 && c.value % c.repeat === 0;
  const repeatInfo = c.repeat
    ? `<span class="note" style="font-size:0.68rem;">${atRepeat?'↺ repeat!':'every '+c.repeat}</span>`
    : '';
  return `<div class="counter-row">
    <span class="counter-name">${esc(c.name||'Counter')}</span>
    <button class="counter-btn" onclick="adjustCounter('${projectId}','${c.id}',-1)" aria-label="Decrease">−</button>
    <span class="counter-value ${atRepeat?'at-repeat':''}">${c.value||0}</span>
    <button class="counter-btn" onclick="adjustCounter('${projectId}','${c.id}',1)" aria-label="Increase">+</button>
    ${repeatInfo}
    <label class="counter-sts" title="Current stitch count on this row">
      <input type="number" min="0" inputmode="numeric" value="${c.stitches!=null?c.stitches:''}" placeholder="—" onchange="setCounterStitches('${projectId}','${c.id}',this.value)" /> sts
    </label>
    <button class="counter-btn subtle" onclick="resetCounter('${projectId}','${c.id}')" aria-label="Reset" title="Reset to 0">↺</button>
  </div>`;
}
/* Current stitch count on this counter's row — a free number the user jots
   and updates as the pattern shapes (e.g. after an increase row). Saved with
   the counter; deferred save and no re-render, so the field keeps focus while
   typing. */
function setCounterStitches(projectId, counterId, val){
  const p = STATE.projects.find(pp=>pp.id===projectId);
  const c = p && p.counters && p.counters.find(cc=>cc.id===counterId);
  if(!c) return;
  c.stitches = val==='' ? null : Math.max(0, Number(val)||0);
  persistSoon();
}
function toggleCounterPanel(projectId){
  STATE.expandedCounters = STATE.expandedCounters===projectId ? null : projectId;
  renderTab();
}
function adjustCounter(projectId, counterId, delta){
  const p = STATE.projects.find(pp=>pp.id===projectId);
  if(!p || !p.counters) return;
  const c = p.counters.find(cc=>cc.id===counterId);
  if(!c) return;
  c.value = Math.max(0, (Number(c.value)||0) + delta);
  persistSoon();                 // deferred save (10s checkpoint + flush-on-exit)
  // Update just this counter's number in place to stay responsive under rapid taps.
  renderTab();
}
function resetCounter(projectId, counterId){
  const p = STATE.projects.find(pp=>pp.id===projectId);
  const c = p && p.counters && p.counters.find(cc=>cc.id===counterId);
  if(!c) return;
  c.value = 0;
  c.stitches = null;   // clearing the counter clears its recorded stitch count too
  persistSoon();
  renderTab();
}
/* Push a project's yardage gap onto the shopping list. Records the source
   (this project) for future dedup, but the shopping list shows it cleanly. */
function shopProjectGap(id){
  if(!STATE.online){ wgToast("You're offline — adding to the shopping list needs a connection.", "error"); return; }
  const p = STATE.projects.find(pp=>pp.id===id);
  const gapInfo = projectYardageGap(p);
  if(!p || !gapInfo || gapInfo.gap<=0) return;
  // Infer weight from the project's linked yarns if consistent.
  const linked = STATE.yarns.filter(y=>(p.yarnIds||[]).includes(y.id));
  const weights = [...new Set(linked.map(y=>y.weightCategory).filter(Boolean))];
  addShoppingItem({
    weight: weights.length===1 ? weights[0] : null,
    yardage: Math.round(gapInfo.gap),
    quantity: 1,
    note: 'Project gap',
    sourceType: 'project', sourceId: p.id, sourceName: p.name
  });
  wgToast(`Added ~${Math.round(gapInfo.gap)} yd to your shopping list for "${p.name}".`, "success");
  renderTab();
}

/* =================================================================
   Palette lab
================================================================= */
function getHarmonyRoles(baseHue, type){
  switch(type){
    case 'Complementary': return [{role:'Complement', hue:(baseHue+180)%360}];
    case 'Analogous': return [{role:'Analogous −30°', hue:(baseHue+330)%360}, {role:'Analogous +30°', hue:(baseHue+30)%360}];
    case 'Triadic': return [{role:'Triad', hue:(baseHue+120)%360}, {role:'Triad', hue:(baseHue+240)%360}];
    case 'Split-Complementary': return [{role:'Split', hue:(baseHue+150)%360}, {role:'Split', hue:(baseHue+210)%360}];
    default: return [];
  }
}
/* A yarn qualifies for the Palette Lab at all only if it's solid, or
   multicolor with 3 colors or fewer (see isMulticolor/colors on the yarn
   schema). Even eligible multicolor yarns always use their primary color
   when acting as the BASE — a harmony is rotated around one anchor hue,
   which isn't a meaningful operation against "all of a yarn's colors" at
   once. matchMode only changes behavior when the yarn is a *candidate*
   being checked against someone else's harmony: 'full' checks all of its
   colors and reports back whichever one actually won the match. */
function eligibleForPalette(y){
  if(!y.colorHex) return false;
  if(!y.isMulticolor) return true;
  return y.colors && y.colors.length>=1 && y.colors.length<=3;
}
/* Weight-compatible = within one step of the base yarn's weight category
   on the WEIGHTS list (e.g. DK matches Sport and Worsted, not Aran).
   Missing weight data on either side is treated as compatible rather
   than silently excluded, since we shouldn't punish incomplete entries. */
function weightIndex(weightCategory){
  const idx = WEIGHTS.indexOf(weightCategory);
  return idx===-1 ? null : idx;
}
function weightCompatible(baseWeight, candidateWeight){
  const bi = weightIndex(baseWeight), ci = weightIndex(candidateWeight);
  if(bi===null || ci===null) return true;
  return Math.abs(bi-ci) <= 1;
}
function isNeutralYarn(y){
  // Neutrals in fiber-arts terms: not just greys/black/white, but the warm
  // "workhorse" neutrals too — brown, tan, beige, camel, cream. A yarn is
  // neutral if it's genuinely low-saturation (greys/black/white), or a muted
  // warm/earthy tone (the brown→cream family), which all read as neutral
  // grounds in real projects. Vivid warm colors (rust, mustard, orange) stay
  // out via the saturation ceiling scaled by how vivid they'd read.
  const { h, s, l } = hexToHsl(y.colorHex);
  // True achromatic neutrals: greys/black have almost no saturation. Kept
  // strict (< 10) so muted-but-real colors like pistachio or moss green —
  // which still carry a clear hue at s≈16–18 — are NOT mistaken for grey.
  if(s < 10) return true;
  if(l > 95) return true;                         // near-whites / naturals
  // Warm/earthy band (reds→yellows, ~10–55°). These are neutral when muted;
  // the ceiling is looser for very dark (brown) and very pale (cream) tones,
  // tighter in the mid-range so vivid rusts/mustards are excluded.
  const warmHue = h >= 10 && h <= 55;
  if(warmHue){
    if((l < 45 || l > 78) && s < 60) return true;  // dark browns / pale creams — generous
    if(s < 42) return true;                        // tan / camel / beige mid-range — muted only
  }
  return false;
}
/* Returns, for each harmony role, a *ranked* list of candidate matches
   (best first) rather than only the winner — this is what lets the user
   cycle through alternatives per slot. Neutral handling: when includeNeutral
   is on, the LAST role is retargeted to prefer near-neutral yarns. */
function suggestPalette(yarns, baseYarn, type, includeNeutral){
  const baseHsl = hexToHsl(baseYarn.colorHex);
  const roles = getHarmonyRoles(baseHsl.h, type);
  const mode = STATE.paletteMatchMode;

  return roles.map((r, roleIdx) => {
    const neutralSlot = includeNeutral && roleIdx === roles.length-1;
    const targetHex = hslToHex(r.hue, baseHsl.s, baseHsl.l);
    const targetLab = hexToLab(targetHex);

    // Score every eligible candidate yarn for this slot.
    const scored = [];
    yarns.forEach(y=>{
      if(y.id===baseYarn.id) return;
      if(!weightCompatible(baseYarn.weightCategory, y.weightCategory)) return;
      if(neutralSlot && !isNeutralYarn(y)) return;   // neutral slot: neutrals only
      if(!neutralSlot && isNeutralYarn(y)) { /* neutrals still allowed elsewhere, just not preferred */ }
      const candidateHexes = (y.isMulticolor && y.matchMode==='full' && y.colors && y.colors.length<=3)
        ? y.colors : [y.colorHex];
      let bestForYarn=Infinity, bestHexForYarn=y.colorHex;
      candidateHexes.forEach(hex=>{
        const dist = weightedDeltaE(targetLab, hexToLab(hex), mode);
        if(dist<bestForYarn){ bestForYarn=dist; bestHexForYarn=hex; }
      });
      scored.push({ yarn:y, matchedHex:bestHexForYarn, distance:bestForYarn });
    });
    scored.sort((a,b)=>a.distance-b.distance);

    return {
      role: neutralSlot ? 'Neutral' : r.role,
      hue: r.hue,
      targetHex,
      neutralSlot,
      candidates: scored.map(s=>({
        yarnId: s.yarn.id, matchedHex: s.matchedHex,
        distance: s.distance, closeness: closenessPercent(s.distance)
      }))
    };
  });
}
/* Resolve the currently-displayed pick for each slot given the user's
   per-slot choice index (from cycling) and de-duplication so two slots
   don't show the same yarn. Returns display-ready rows. */
function resolvePaletteSlots(slots){
  const used = new Set([STATE.paletteBaseId]);
  return slots.map((slot, i) => {
    const choiceIdx = STATE.paletteSlotChoice[i] || 0;
    // Walk from the chosen index, skipping yarns already used by earlier slots.
    let pick=null, pickList=slot.candidates;
    // First pass honoring the exact choice index if it's free:
    for(let step=0; step<pickList.length; step++){
      const idx=(choiceIdx+step)%pickList.length;
      if(!used.has(pickList[idx].yarnId)){ pick=pickList[idx]; break; }
    }
    if(pick) used.add(pick.yarnId);
    const yarn = pick ? STATE.yarns.find(y=>y.id===pick.yarnId) : null;
    return { ...slot, pick, yarn, altCount: slot.candidates.length };
  });
}

const HARMONY_DESCRIPTIONS = {
  'Complementary': 'One opposite hue — bold, high-contrast pairing.',
  'Analogous': 'Neighboring hues — calm, cohesive, low-contrast.',
  'Triadic': 'Three evenly-spaced hues — vibrant and balanced.',
  'Split-Complementary': 'A near-opposite pair instead of one direct opposite — contrast with less tension.'
};

function renderPalette(){
  const colored = STATE.yarns.filter(eligibleForPalette);
  const excludedCount = STATE.yarns.filter(y=>y.colorHex && !eligibleForPalette(y)).length;
  if(colored.length < 2){
    return `<div class="empty"><p class="title">Add a few more colors</p><p class="body">The palette lab matches color-theory harmonies against yarn you actually own. Log at least two colored skeins in your stash to try it. (4+ color multicolor yarns aren't eligible for matching.)</p></div>`;
  }
  if(!STATE.paletteBaseId || !colored.find(y=>y.id===STATE.paletteBaseId)) STATE.paletteBaseId = colored[0].id;
  const base = colored.find(y=>y.id===STATE.paletteBaseId);
  const slots = suggestPalette(colored, base, STATE.paletteHarmony, STATE.paletteIncludeNeutral);
  const resolved = resolvePaletteSlots(slots);

  const baseSwatchBg = base.isMulticolor && base.colors && base.colors.length>=2 ? buildConicGradient(base.colors) : base.colorHex;

  const basePick = `<div class="palette-pick">
      <span class="palette-swatch" style="background:${baseSwatchBg}"></span>
      <p style="margin:0; font-weight:500; font-size:0.85rem;">${esc(yarnDisplayName(base))}</p>
      <p class="note no-margin">Base</p>
    </div>`;

  const slotPicks = resolved.map((r,i)=>{
    if(!r.yarn){
      return `<div class="palette-pick">
        <span class="palette-swatch" style="background:var(--bg); border:1px dashed var(--border);"></span>
        <p class="note no-margin">${esc(r.role)}</p>
        <p class="note no-margin">${r.neutralSlot ? 'no true neutral in your stash' : 'no match in your stash'}</p>
      </div>`;
    }
    const via = r.yarn.isMulticolor && r.pick.matchedHex && r.pick.matchedHex!==r.yarn.colorHex;
    const locked = STATE.paletteSlotChoice['lock'+i];
    return `<div class="palette-pick">
      <span class="palette-swatch" style="background:${r.pick.matchedHex || r.yarn.colorHex}"></span>
      <p style="margin:0; font-weight:500; font-size:0.85rem;">${esc(yarnDisplayName(r.yarn))}</p>
      <p class="note no-margin">${esc(r.role)} · ${r.pick.closeness}% match${via?' · via one of its colors':''}</p>
      <div style="display:flex; gap:6px; margin-top:6px; align-items:center;">
        <button class="harmony-btn" style="font-size:0.68rem; padding:3px 8px;" onclick="cyclePaletteSlot(${i})" ${r.altCount<2?'disabled':''} title="Show next-closest option">Swap ⟳</button>
        <button class="harmony-btn ${locked?'active':''}" style="font-size:0.68rem; padding:3px 8px;" onclick="togglePaletteLock(${i})" title="Lock this pick">${locked?'Locked':'Lock'}</button>
      </div>
    </div>`;
  }).join('');

  const stretched = resolved.some(r=>r.pick && r.pick.closeness<70);
  const unfilled = resolved.some(r=>!r.yarn);

  // Dream matches: the ideal target color for each slot, named, shown as a
  // shoppable gap. This is the "what would complete this palette" section —
  // the target colors regardless of whether your stash can fill them.
  const baseHslForDream = hexToHsl(base.colorHex);
  const dreamMatches = suggestPalette(colored, base, STATE.paletteHarmony, STATE.paletteIncludeNeutral).map((slot,i)=>{
    const resolvedSlot = resolved[i];
    // For a neutral slot, the "ideal" isn't a hue-rotated color — it's an
    // actual neutral. Present a soft greige/cream target so the name and the
    // shop suggestion are honestly neutral, not a stray color.
    const targetHex = slot.neutralSlot ? '#cfc7b8' : slot.targetHex;
    const name = slot.neutralSlot ? 'a neutral (cream / grey / tan)' : nameColor(targetHex);
    // A multicolor yarn can't satisfy a dream slot — we can't point to which
    // of its strands is "the" color, so it shouldn't count as owning it.
    const singleColorMatch = resolvedSlot.yarn && !resolvedSlot.yarn.isMulticolor;
    // 85% closeness ≈ ΔE 9 — genuinely the same colour, not just "nearest".
    // (70% was ΔE 18, loose enough that e.g. a navy could pass as a purple.)
    const closeEnough = singleColorMatch && resolvedSlot.pick && resolvedSlot.pick.closeness>=85;
    const owned = closeEnough && yarnStatus(resolvedSlot.yarn)!=='allocated';
    const allocatedOnly = closeEnough && yarnStatus(resolvedSlot.yarn)==='allocated';
    return { role:slot.role, hex:targetHex, name, owned, allocatedOnly, neutralSlot:slot.neutralSlot };
  });
  const dreamCard = `<div class="card palette-picks">${dreamMatches.map((d,i)=>`
    <div class="palette-pick">
      <span class="palette-swatch" style="background:${d.hex}"></span>
      <p style="margin:0; font-weight:500; font-size:0.85rem;">${esc(d.name)}</p>
      <p class="note no-margin">${esc(d.role)}${d.owned?' · in stash ✓':(d.allocatedOnly?' · owned but allocated':'')}</p>
      ${!d.owned ? `<button class="harmony-btn" style="font-size:0.68rem; padding:3px 8px; margin-top:6px;" onclick="shopDreamMatch('${STATE.paletteBaseId}','${STATE.paletteHarmony}',${i})" title="${d.allocatedOnly?'Your close match is allocated elsewhere — add another to your shopping list':'Add this color to your shopping list'}">${ICONS.cart} Shop</button>` : ''}
    </div>`).join('')}</div>`;

  const MATCH_MODES = [['balanced','Balanced'],['tonal','Match lightness'],['hue','Match hue']];

  // Saved palettes list
  const savedList = STATE.paletteSavedPalettes.length ? `
    <h2 style="font-size:1.05rem; margin:26px 0 10px;">Saved palettes</h2>
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${STATE.paletteSavedPalettes.map(renderSavedPaletteCard).join('')}
    </div>` : '';

  return `
  <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end; margin-bottom:18px;">
    <label class="field" style="flex:1; min-width:0; max-width:100%;">Base yarn
      <select class="palette-base-select" onchange="setPaletteBase(this.value)">
        ${colored.map(y=>`<option value="${y.id}" ${y.id===base.id?'selected':''}>${esc(yarnDisplayName(y))}</option>`).join('')}
      </select>
    </label>
    <div style="display:flex; gap:6px; flex-wrap:wrap;">
      ${HARMONIES.map(h=>`<button class="harmony-btn ${STATE.paletteHarmony===h?'active':''}" title="${esc(HARMONY_DESCRIPTIONS[h])}" onclick="setPaletteHarmony('${h}')">${h}</button>`).join('')}
    </div>
  </div>
  <p class="note" style="margin:-10px 0 4px;">${esc(HARMONY_DESCRIPTIONS[STATE.paletteHarmony])}</p>
  <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin:0 0 10px;">
    <span class="note">Match priority:</span>
    ${MATCH_MODES.map(([id,label])=>`<button class="harmony-btn ${STATE.paletteMatchMode===id?'active':''}" style="font-size:0.72rem; padding:4px 10px;" onclick="setPaletteMatchMode('${id}')">${label}</button>`).join('')}
    <button class="harmony-btn ${STATE.paletteIncludeNeutral?'active':''}" style="font-size:0.72rem; padding:4px 10px; margin-left:6px;" onclick="togglePaletteNeutral()" title="Fill one slot with your closest neutral instead of a color">+ Neutral</button>
  </div>
  <h2 style="font-size:1.05rem; margin:22px 0 8px;">Stash matches</h2>
  <div class="card palette-picks">${basePick}${slotPicks}</div>
  <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
    <button class="btn btn-primary" onclick="saveCurrentPalette()">${ICONS.bookmark} Save this palette</button>
    <button class="btn btn-ghost" onclick="resetPaletteChoices()">Reset swaps</button>
  </div>
  <p class="note" style="margin-top:10px;">Matches are ranked by perceptual color similarity (how close they look to the eye), limited to yarn within one weight category of the base. Tap Swap to cycle a slot to its next-closest option, or Lock to keep one.</p>
  ${stretched ? `<p class="note" style="margin-top:6px;">Some slots don't have a strong match in your stash — the closest options are a bit of a stretch. Might be time to add to the stash, or try a different harmony.</p>` : ''}
  ${unfilled ? `<p class="note" style="margin-top:6px;">One or more roles didn't have a compatible match in your stash.</p>` : ''}
  ${excludedCount>0 ? `<p class="note" style="margin-top:6px;">${excludedCount} skein${excludedCount===1?'':'s'} with 4+ colors ${excludedCount===1?"isn't":"aren't"} eligible for matching.</p>` : ''}

  <h2 style="font-size:1.05rem; margin:26px 0 8px;">Dream matches</h2>
  <p class="note" style="margin:0 0 8px;">The ideal color for each slot — what would complete this harmony. Tap Shop to send colors you don't own to your shopping list.</p>
  ${dreamCard}
  ${dreamMatches.some(d=>!d.owned) ? `<button class="btn btn-ghost btn-small" style="margin-top:10px;" onclick="shopAllDreamMatches('${STATE.paletteBaseId}','${STATE.paletteHarmony}')">${ICONS.cart} Shop all missing colors</button>` : ''}
  ${savedList}
  `;
}

/* Builder controls — changing base/harmony/mode resets per-slot swaps and
   locks, since the slots themselves change. */
function setPaletteBase(id){ STATE.paletteBaseId=id; STATE.paletteSlotChoice={}; renderTab(); }
function setPaletteHarmony(h){ STATE.paletteHarmony=h; STATE.paletteSlotChoice={}; renderTab(); }
function setPaletteMatchMode(m){ STATE.paletteMatchMode=m; STATE.paletteSlotChoice={}; renderTab(); }
function togglePaletteNeutral(){ STATE.paletteIncludeNeutral=!STATE.paletteIncludeNeutral; STATE.paletteSlotChoice={}; renderTab(); }
function resetPaletteChoices(){ STATE.paletteSlotChoice={}; renderTab(); }
/* Send a dream-match (ideal target color for a slot) to the shopping list,
   named and weight-tagged, recording the source palette for future dedup. */
/* The shoppable target for a dream-match slot: an actual neutral swatch/name
   for the neutral slot, otherwise the hue-rotated harmony target. */
function dreamTargetFor(slot){
  if(slot.neutralSlot) return { hex:'#cfc7b8', name:'neutral (cream / grey / tan)' };
  return { hex:slot.targetHex, name:nameColor(slot.targetHex) };
}
function shopDreamMatch(baseId, harmony, slotIndex){
  if(!STATE.online){ wgToast("You're offline — adding to the shopping list needs a connection.", "error"); return; }
  const colored = STATE.yarns.filter(eligibleForPalette);
  const base = colored.find(y=>y.id===baseId);
  if(!base) return;
  const slots = suggestPalette(colored, base, harmony, STATE.paletteIncludeNeutral);
  const slot = slots[slotIndex];
  if(!slot) return;
  const t = dreamTargetFor(slot);
  addShoppingItem({
    colorName: t.name,
    hex: t.hex,
    weight: base.weightCategory || null,
    quantity: 1,
    note: harmony+' palette',
    sourceType:'palette', sourceId: base.id, sourceName: `${yarnDisplayName(base).split(' - ')[0]} ${harmony} palette`
  });
  wgToast(`Added ${t.name} to your shopping list.`, "success");
  renderTab();
}
/* Bulk version: add every dream-match color the user doesn't already own a
   close match for. Skips slots already well-covered by stash (>=70% match). */
function shopAllDreamMatches(baseId, harmony){
  if(!STATE.online){ wgToast("You're offline — adding to the shopping list needs a connection.", "error"); return; }
  const colored = STATE.yarns.filter(eligibleForPalette);
  const base = colored.find(y=>y.id===baseId);
  if(!base) return;
  const slots = suggestPalette(colored, base, harmony, STATE.paletteIncludeNeutral);
  const resolved = resolvePaletteSlots(slots);
  let added=0;
  slots.forEach((slot,i)=>{
    const rs = resolved[i];
    const owned = rs.yarn && !rs.yarn.isMulticolor && rs.pick && rs.pick.closeness>=85 && yarnStatus(rs.yarn)!=='allocated';
    if(owned) return;
    const t = dreamTargetFor(slot);
    addShoppingItem({
      colorName: t.name,
      hex: t.hex,
      weight: base.weightCategory || null,
      quantity: 1,
      note: harmony+' palette',
      sourceType:'palette', sourceId: base.id, sourceName: `${yarnDisplayName(base).split(' - ')[0]} ${harmony} palette`
    });
    added++;
  });
  wgToast(added ? `Added ${added} color${added===1?'':'s'} to your shopping list.` : 'Your stash already covers this palette.', added?'success':undefined);
  renderTab();
}

function cyclePaletteSlot(i){
  if(STATE.paletteSlotChoice['lock'+i]) return; // locked slots don't cycle
  const cur = STATE.paletteSlotChoice[i] || 0;
  STATE.paletteSlotChoice[i] = cur + 1;   // resolve wraps modulo candidate count
  renderTab();
}
function togglePaletteLock(i){
  STATE.paletteSlotChoice['lock'+i] = !STATE.paletteSlotChoice['lock'+i];
  renderTab();
}

/* Save the currently-displayed arrangement as a named palette. Stores yarn
   IDs + the matched hex for each slot, so it survives even if matching logic
   changes later, and can show a "no longer in stash" state if a yarn is gone. */
async function saveCurrentPalette(){
  if(!STATE.online){ wgToast("You're offline — saving palettes needs a connection.", "error"); return; }
  const colored = STATE.yarns.filter(eligibleForPalette);
  const base = colored.find(y=>y.id===STATE.paletteBaseId);
  if(!base) return;
  const slots = suggestPalette(colored, base, STATE.paletteHarmony, STATE.paletteIncludeNeutral);
  const resolved = resolvePaletteSlots(slots);
  const name = await wgPrompt('', {title:'Save palette', defaultValue:`${yarnDisplayName(base).split(' - ')[0]} ${STATE.paletteHarmony}`, placeholder:'Palette name', okLabel:'Save'});
  if(name===null) return;
  const palette = {
    id: uid(),
    name: name.trim() || 'Untitled palette',
    harmony: STATE.paletteHarmony,
    matchMode: STATE.paletteMatchMode,
    baseYarnId: base.id,
    slots: resolved.filter(r=>r.yarn).map(r=>({ role:r.role, yarnId:r.yarn.id, hex:r.pick.matchedHex||r.yarn.colorHex, closeness:r.pick.closeness })),
    createdAt: todayStr()
  };
  STATE.paletteSavedPalettes.unshift(palette);
  persist();
  wgToast('Palette saved.', 'success');
  renderTab();
  scrollToTop();
}
async function deleteSavedPalette(id){
  if(!(await wgConfirm('Delete this saved palette?', {title:'Delete palette', okLabel:'Delete', danger:true}))) return;
  STATE.paletteSavedPalettes = STATE.paletteSavedPalettes.filter(p=>p.id!==id);
  persist();
  renderTab();
}
function renderSavedPaletteCard(p){
  const base = STATE.yarns.find(y=>y.id===p.baseYarnId);
  const baseHex = base ? (base.isMulticolor && base.colors && base.colors.length>=2 ? buildConicGradient(base.colors) : base.colorHex) : '#ccc';
  const dots = [`<span class="palette-swatch" style="width:34px;height:34px;background:${baseHex}" title="${base?esc(yarnDisplayName(base)):'(base no longer in stash)'}"></span>`]
    .concat(p.slots.map(s=>{
      const y = STATE.yarns.find(yy=>yy.id===s.yarnId);
      const title = y ? esc(yarnDisplayName(y)) : '(no longer in stash)';
      const border = y ? '' : 'opacity:0.4; border:1px dashed var(--border);';
      return `<span class="palette-swatch" style="width:34px;height:34px;background:${s.hex};${border}" title="${title}"></span>`;
    })).join('');
  return `<div class="card" style="display:flex; align-items:center; gap:12px;">
    <div style="display:flex; gap:6px; flex-wrap:wrap;">${dots}</div>
    <div class="grow">
      <p style="margin:0; font-weight:600; font-size:0.9rem;">${esc(p.name)}</p>
      <p class="note" style="margin:1px 0 0;">${esc(p.harmony)}${p.createdAt?' · '+esc(p.createdAt):''}</p>
    </div>
    <button class="del-btn" onclick="deleteSavedPalette('${p.id}')" aria-label="Delete palette">${ICONS.trash}</button>
  </div>`;
}

/* =================================================================
   Presets admin — visible and usable only by ADMIN_EMAIL. Appends
   directly to the Firestore "lines" array; everyone else still only
   gets read access (enforced by security rules, not just this check).
================================================================= */
/* =================================================================
   Showcase — finished projects only, photo-forward. Uses uploaded
   photos if present, falls back to a linked pattern/video's thumbnail,
   else a plain placeholder. Private/signed-in-only, same as every
   other tab — no public route.
================================================================= */
function renderShowcase(){
  const finished = STATE.projects.filter(p=>p.status==='Finished');
  let html = STATE.showProjectForm ? renderProjectForm() : '';
  if(finished.length===0){
    html += `<div class="empty"><p class="title">Nothing finished yet</p><p class="body">Once a project's status is set to Finished, it shows up here. Add a photo or two right from its card to make this a real gallery.</p></div>`;
  } else {
    html += `<div class="showcase-grid">${finished.map(renderShowcaseCard).join('')}</div>`;
  }
  return html;
}
function renderShowcaseCard(p){
  const usedYarns = STATE.yarns.filter(y => (p.yarnIds||[]).includes(y.id));
  const photos = p.photos || [];
  const fallbackThumb = (p.links||[]).map(l=>l.thumbnail).find(Boolean);
  const mainImage = photos[0] || fallbackThumb || null;
  const garmentBadge = (p.garmentSize || p.garmentGender) ? [p.garmentGender, p.garmentSize].filter(Boolean).join(' · ') : null;
  return `<div class="card showcase-card">
    ${mainImage
      ? `<img class="showcase-photo" src="${esc(mainImage)}" alt="${esc(p.name)}" style="cursor:zoom-in;" onclick="openLightbox('${p.id}')" />`
      : `<div class="showcase-placeholder">No photo yet</div>`}
    <div class="showcase-body">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
        <p style="margin:0; font-weight:600; font-family:'Fraunces',serif;">${esc(p.name)}</p>
        <button class="del-btn" onclick="showProjectForm('${p.id}')" aria-label="Edit project, add photos" title="Edit / add photos" style="flex-shrink:0;">${ICONS.pencil}</button>
      </div>
      ${p.patternName ? `<p class="note" style="margin:2px 0 0;">${esc(p.patternName)}</p>` : ''}
      <div style="display:flex; align-items:center; gap:6px; margin-top:8px; flex-wrap:wrap;">
        ${usedYarns.map(y=>`<span class="dot" style="background:${y.colorHex}" title="${esc(y.name)}"></span>`).join('')}
        ${garmentBadge ? `<span class="note">${esc(garmentBadge)}</span>` : ''}
        ${photos.length>1 ? `<span class="note">${photos.length} photos</span>` : ''}
        ${p.finishDate ? `<span class="note">${esc(p.finishDate)}</span>` : ''}
      </div>
    </div>
  </div>`;
}

/* Photo lightbox for the Showcase — tap a project photo to view it large,
   with prev/next paging when a project has multiple photos. */
let _lightbox = { photos: [], i: 0 };
function openLightbox(projectId){
  const p = STATE.projects.find(pp=>pp.id===projectId);
  if(!p) return;
  const photos = (p.photos||[]).slice();
  if(!photos.length){
    const thumb = (p.links||[]).map(l=>l.thumbnail).find(Boolean);
    if(thumb) photos.push(thumb);
  }
  if(!photos.length) return;
  _lightbox = { photos, i: 0 };
  drawLightbox();
}
function drawLightbox(){
  const root = document.getElementById('wg-modal-root');
  const { photos, i } = _lightbox;
  const multi = photos.length > 1;
  root.innerHTML = `<div class="wg-modal-backdrop open" id="wg-lightbox" style="align-items:center;">
    <div class="lightbox-inner">
      <img src="${esc(photos[i])}" alt="" class="lightbox-img" />
      ${multi ? `<div class="lightbox-controls">
        <button class="btn btn-ghost btn-small" onclick="lightboxStep(-1)" aria-label="Previous">‹</button>
        <span class="note">${i+1} / ${photos.length}</span>
        <button class="btn btn-ghost btn-small" onclick="lightboxStep(1)" aria-label="Next">›</button>
      </div>` : ''}
      <button class="lightbox-close" onclick="closeLightbox()" aria-label="Close">✕</button>
    </div>
  </div>`;
  const bd = document.getElementById('wg-lightbox');
  bd.onclick = (e)=>{ if(e.target===bd) closeLightbox(); };
}
function lightboxStep(d){
  const n = _lightbox.photos.length;
  _lightbox.i = (_lightbox.i + d + n) % n;
  drawLightbox();
}
function closeLightbox(){
  const root = document.getElementById('wg-modal-root');
  if(root) root.innerHTML = '';
}
document.addEventListener('keydown', (e)=>{
  if(!document.getElementById('wg-lightbox')) return;
  if(e.key==='Escape') closeLightbox();
  else if(e.key==='ArrowLeft') lightboxStep(-1);
  else if(e.key==='ArrowRight') lightboxStep(1);
});

/* =================================================================
   Shopping list — first-class saved object. Gaps from projects and
   dream-match palette slots flow in here. Each item records its source
   (project/palette id) for future dedup, but the list is shown cleanly
   grouped; source is only surfaced on tap. External search (Google /
   Ravelry) is generated from each item's spec — Woolgather owns the
   decision, the retailer owns product discovery.
================================================================= */
function shoppingSearchQuery(item){
  return [item.colorName, item.weight, item.fiber, item.yardage ? ('~'+toDisplayLength(item.yardage)+(STATE.unitPref==='m'?' meters':' yards')) : '', 'yarn']
    .filter(Boolean).join(' ');
}
function googleSearchUrl(item){
  return 'https://www.google.com/search?q=' + encodeURIComponent(shoppingSearchQuery(item));
}
function ravelrySearchUrl(item){
  // Ravelry's free-text yarn search matches on yarn/brand names and
  // attributes like weight & fiber — NOT descriptive colour phrases
  // ("sage green" returns nothing). So we search by weight + fiber, which
  // reliably returns results; colour is better narrowed with Ravelry's own
  // filters once there. Fall back to a generic term if we have neither.
  const q = [item.weight, item.fiber].filter(Boolean).join(' ') || 'yarn';
  return 'https://www.ravelry.com/yarns/search#query=' + encodeURIComponent(q);
}
function addShoppingItem(item){
  STATE.shoppingList.unshift({
    id: uid(),
    colorName: item.colorName || null,
    hex: item.hex || null,
    weight: item.weight || null,
    fiber: item.fiber || null,
    yardage: item.yardage || null,
    quantity: item.quantity || 1,
    note: item.note || null,
    sourceType: item.sourceType || 'manual',   // 'project' | 'palette' | 'manual'
    sourceId: item.sourceId || null,
    sourceName: item.sourceName || null,
    done: false,
    createdAt: todayStr()
  });
  persist();
}
function removeShoppingItem(id){
  STATE.shoppingList = STATE.shoppingList.filter(i=>i.id!==id);
  persist();
  renderTab();
}
function toggleShoppingDone(id){
  STATE.shoppingList = STATE.shoppingList.map(i=> i.id===id ? {...i, done:!i.done} : i);
  persist();
  renderTab();
}
async function clearDoneShopping(){
  if(!STATE.shoppingList.some(i=>i.done)) return;
  if(!(await wgConfirm('Remove all checked-off items?', {title:'Clear checked', okLabel:'Remove', danger:true}))) return;
  STATE.shoppingList = STATE.shoppingList.filter(i=>!i.done);
  persist();
  renderTab();
}
/* Add a manual item via quick prompts (kept simple; a full form can come
   later). Colour name is optional free text. */
function addManualShoppingItem(){
  if(!STATE.online){ wgToast("You're offline — adding to the shopping list needs a connection.", "error"); return; }
  STATE.showShoppingForm = true;
  STATE.editingShoppingId = null;
  renderTab();
}
function editShoppingItem(id){
  if(!STATE.online){ wgToast("You're offline — editing needs a connection.", "error"); return; }
  STATE.showShoppingForm = true;
  STATE.editingShoppingId = id;
  renderTab();
}
function hideShoppingForm(){ STATE.showShoppingForm = false; STATE.editingShoppingId = null; renderTab(); }
function submitShoppingForm(e){
  if(e) e.preventDefault();
  const fields = {
    colorName: document.getElementById('sf-color').value.trim()||null,
    weight: document.getElementById('sf-weight').value||null,
    fiber: document.getElementById('sf-fiber').value.trim()||null,
    yardage: document.getElementById('sf-yardage').value===''?null:fromInputLength(document.getElementById('sf-yardage').value),
    quantity: Number(document.getElementById('sf-qty').value)||1
  };
  if(STATE.editingShoppingId){
    STATE.shoppingList = STATE.shoppingList.map(i=> i.id===STATE.editingShoppingId ? {...i, ...fields} : i);
    persist();
    wgToast('Item updated.', 'success');
  } else {
    addShoppingItem({ ...fields, sourceType:'manual' });
    wgToast('Added to shopping list.', 'success');
  }
  STATE.showShoppingForm = false;
  STATE.editingShoppingId = null;
  renderTab();
  scrollToTop();
}
function renderShoppingForm(){
  const editing = STATE.editingShoppingId ? STATE.shoppingList.find(i=>i.id===STATE.editingShoppingId) : null;
  const v = (f,d='') => editing ? (editing[f] ?? d) : d;
  return `<form class="card form-grid" onsubmit="submitShoppingForm(event)" style="margin-bottom:16px;">
    <label class="field">Color (optional)
      <input id="sf-color" placeholder="e.g. sage green" value="${esc(v('colorName'))}" />
    </label>
    <label class="field">Weight (optional)
      <select id="sf-weight"><option value="">—</option>${WEIGHTS.map(w=>`<option ${editing&&editing.weight===w?'selected':''}>${w}</option>`).join('')}</select>
    </label>
    <label class="field">Fiber (optional)
      <input id="sf-fiber" placeholder="e.g. wool" value="${esc(v('fiber'))}" />
    </label>
    <label class="field">Length needed (${unitLabel()}, optional)
      <input id="sf-yardage" type="number" min="0" placeholder="e.g. 220" value="${v('yardage')===''||v('yardage')==null?'':toDisplayLength(v('yardage'))}" />
    </label>
    <label class="field">Quantity (skeins)
      <input id="sf-qty" type="number" min="1" value="${editing?esc(editing.quantity):1}" />
    </label>
    <div></div>
    <div class="span2 row-end">
      <button type="button" class="btn btn-ghost" onclick="hideShoppingForm()">Cancel</button>
      <button type="submit" class="btn btn-primary">${editing?'Save changes':'Add item'}</button>
    </div>
  </form>`;
}

/* =================================================================
   Gauge calculator (standalone). Enter a swatch — stitches counted across a
   measured width and rows counted down a measured height (in or cm) — plus
   the conditions (knit/crochet, stitch type, hook/needle). Everything else
   is the same simple proportion:
       stitches needed = target width  × swatch stitches ÷ swatch width
       rows needed     = target length × swatch rows     ÷ swatch height
   Sections: your gauge; compare to the pattern (stitches AND rows) and
   convert the pattern's counts to yours; size → stitches/rows (rounded to
   a stitch multiple); and spacing increases/decreases evenly. Counts are
   true stitches only — no turning-chain/foundation extras are added, since
   patterns handle those differently (e.g. stacked single crochets).
================================================================= */

/* ---- Pure math (covered by tests.html) ---- */
// Stitches/rows per one unit of measure, or null if not enough input.
function gaugeRate(count, span){
  count = Number(count); span = Number(span);
  return count>0 && span>0 ? count/span : null;
}
// The core proportion: how many stitches (or rows) for a target size.
function countForSize(size, count, span){
  const rate = gaugeRate(count, span);
  size = Number(size);
  return rate && size>0 ? Math.round(size*rate) : null;
}
// Valid counts for a stitch pattern "multiple of `mult` + `plus`" nearest to
// n: the closest at-or-below and at-or-above. Equal when n is already valid.
function nearestMultiples(n, mult, plus){
  n = Number(n); mult = Math.floor(Number(mult)); plus = Math.floor(Number(plus)||0);
  if(!(n>0) || !(mult>=1)) return null;
  if(n <= plus) return { below:null, above:plus>0?plus:mult };
  const k = Math.floor((n - plus) / mult);
  const below = plus + k*mult;
  const above = below===n ? n : below + mult;
  return { below: below>0 ? below : null, above };
}
// A pattern count at the pattern's gauge → the count at your gauge.
function translateCount(count, yourRate, patternRate){
  count = Number(count); yourRate = Number(yourRate); patternRate = Number(patternRate);
  return count>0 && yourRate>0 && patternRate>0 ? Math.round(count*yourRate/patternRate) : null;
}
// Spread `changes` increases or decreases as evenly as possible across a row
// of `sts` stitches. Returns groups of { size, times } — `size` is how many
// existing stitches each repeat consumes — or { error }.
function spreadShaping(sts, changes, kind){
  sts = Math.floor(Number(sts)); changes = Math.floor(Number(changes));
  if(!(sts>0) || !(changes>0)) return null;
  const minSize = kind==='dec' ? 2 : 1;
  if(sts < changes*minSize){
    return { error: kind==='dec'
      ? `Too many decreases — each one uses 2 stitches, so ${sts} stitches allow at most ${Math.floor(sts/2)}.`
      : `Too many increases — at most one per stitch (${sts}).` };
  }
  const q = Math.floor(sts/changes), r = sts % changes;
  const groups = [];
  if(r) groups.push({ size:q+1, times:r });
  groups.push({ size:q, times:changes-r });
  return { groups, result: kind==='dec' ? sts-changes : sts+changes };
}

/* US ↔ UK crochet names (UK names are one step "taller"). Used only to show
   a hint next to the free-text stitch type when it's a recognized
   abbreviation. */
const CROCHET_US_TO_UK = { sc:'dc', hdc:'htr', dc:'tr', tr:'dtr', dtr:'trtr' };
const CROCHET_NAMES = { sc:'single crochet', hdc:'half double crochet', dc:'double crochet', tr:'treble', dtr:'double treble', htr:'half treble', trtr:'triple treble' };
function crochetTermHint(stitch, terms){
  const key = (stitch||'').trim().toLowerCase();
  if(!key) return '';
  const map = terms==='uk'
    ? Object.fromEntries(Object.entries(CROCHET_US_TO_UK).map(([us,uk])=>[uk,us]))
    : CROCHET_US_TO_UK;
  const other = map[key];
  if(!other) return '';
  return terms==='uk'
    ? `UK ${key} = US ${other} (${CROCHET_NAMES[other]})`
    : `US ${key} = UK ${other}`;
}
// Wording for one shaping repeat, e.g. "K5, M1" or "4 sc, 2 sc in next".
function shapingRepeatText(size, kind, craft, stitchWord){
  if(craft==='crochet'){
    const st = stitchWord || 'st';
    if(kind==='dec') return size>2 ? `${size-2} ${st}, ${st}2tog` : `${st}2tog`;
    return size>1 ? `${size-1} ${st}, 2 ${st} in next` : `2 ${st} in next`;
  }
  if(kind==='dec') return size>2 ? `K${size-2}, k2tog` : 'k2tog';
  return `K${size}, M1`;
}

/* ---- UI ---- */
function gaugeRefSpan(){ return STATE.gauge.measUnit==='cm' ? 10 : 4; }
function gaugeUnit(){ return STATE.gauge.measUnit==='cm' ? 'cm' : 'in'; }
function round1(n){ return Math.round(n*10)/10; }
// Typing only refreshes the result panels (keeps focus); fields that change
// labels (craft, unit, terms) re-render the whole tab.
// Switch inches ↔ cm; swatch sizes still at the default (4 in / 10 cm)
// follow along so the swatch reads naturally in the new unit.
function gaugeSetUnit(unit){
  const g = STATE.gauge, from = g.measUnit==='cm' ? 10 : 4, to = unit==='cm' ? 10 : 4;
  if(Number(g.swW)===from || g.swW==='') g.swW = to;
  if(Number(g.swH)===from || g.swH==='') g.swH = to;
  g.measUnit = unit;
}
function gaugeUpdate(field, val){
  if(field==='measUnit'){ gaugeSetUnit(val); renderTab(); return; }
  STATE.gauge[field] = val;
  if(['craft','terms'].includes(field)){ renderTab(); return; }
  refreshGaugeOutputs();
}
function gaugeToggle(key, open){ STATE.gauge.open = { ...(STATE.gauge.open||{}), [key]: open }; }
const GAUGE_OUTPUTS = {
  'g-out-gauge': ()=>buildYourGaugeHTML(),
  'g-out-compare': ()=>buildGaugeCompareHTML(),
  'g-out-size': ()=>buildGaugeSizeHTML(),
  'g-out-shape': ()=>buildGaugeShapeHTML(),
  'g-out-hint': ()=>buildTermHintHTML()
};
function refreshGaugeOutputs(){
  Object.entries(GAUGE_OUTPUTS).forEach(([id, fn])=>{
    const el = document.getElementById(id);
    if(el) el.innerHTML = fn();
  });
}
function gaugeRates(){
  const g = STATE.gauge;
  return { sts: gaugeRate(g.sts, g.swW), rows: gaugeRate(g.rows, g.swH) };
}
function buildTermHintHTML(){
  const g = STATE.gauge;
  if(g.craft!=='crochet') return '';
  const hint = crochetTermHint(g.stitchType, g.terms);
  return hint ? `<span class="note">${esc(hint)}</span>` : '';
}
function buildYourGaugeHTML(){
  const { sts, rows } = gaugeRates();
  const unit = gaugeUnit(), ref = gaugeRefSpan();
  if(!sts && !rows) return `<p class="note">Enter stitches and the width they cover (and rows and the height they cover) to see your gauge.</p>`;
  return `<div class="gauge-result-card">
    ${sts ? `<p class="no-margin">${round1(sts)} sts / ${unit} · <strong>${round1(sts*ref)} sts per ${ref} ${unit}</strong></p>` : ''}
    ${rows ? `<p class="no-margin">${round1(rows)} rows / ${unit} · <strong>${round1(rows*ref)} rows per ${ref} ${unit}</strong></p>` : ''}
  </div>`;
}
function gaugeVerdictHTML(kindLabel, mine, target, ref, unit){
  const diffPct = ((mine - target) / target) * 100;
  const absPct = Math.abs(Math.round(diffPct));
  const dim = kindLabel==='stitches' ? 'wider' : 'longer';
  const dimSmall = kindLabel==='stitches' ? 'narrower' : 'shorter';
  let verdict, cls, advice;
  if(absPct <= 3){ verdict = `${kindLabel[0].toUpperCase()+kindLabel.slice(1)}: on gauge ✓`; cls='ok-text'; advice=''; }
  else if(diffPct > 0){
    verdict = `${kindLabel[0].toUpperCase()+kindLabel.slice(1)}: ${absPct}% too many (tight)`; cls='danger-text';
    advice = `Following the pattern as written comes out about ${absPct}% ${dimSmall}. Try a larger hook/needle, or use the converted counts below.`;
  } else {
    verdict = `${kindLabel[0].toUpperCase()+kindLabel.slice(1)}: ${absPct}% too few (loose)`; cls='danger-text';
    advice = `Following the pattern as written comes out about ${absPct}% ${dim}. Try a smaller hook/needle, or use the converted counts below.`;
  }
  return `<p class="no-margin ${cls}" style="font-weight:600;">${esc(verdict)}</p>
    <p class="note no-margin">Pattern: ${target} per ${ref} ${unit} · You: ${round1(mine)}</p>
    ${advice ? `<p class="no-margin" style="font-size:0.85rem;">${advice}</p>` : ''}`;
}
function buildGaugeCompareHTML(){
  const g = STATE.gauge, unit = gaugeUnit(), ref = gaugeRefSpan();
  const { sts, rows } = gaugeRates();
  const tSts = Number(g.targetSts)||0, tRows = Number(g.targetRows)||0;
  if(!tSts && !tRows) return `<p class="note">Enter the pattern's gauge to compare.</p>`;
  const parts = [];
  if(tSts && sts) parts.push(gaugeVerdictHTML('stitches', sts*ref, tSts, ref, unit));
  if(tRows && rows) parts.push(gaugeVerdictHTML('rows', rows*ref, tRows, ref, unit));
  // Pattern count → your count, at each gauge.
  const ps = translateCount(g.patSts, sts, tSts/ref);
  const pr = translateCount(g.patRows, rows, tRows/ref);
  if(ps!=null) parts.push(`<p class="no-margin">Pattern's <strong>${Number(g.patSts)} sts</strong> → <strong>${ps} sts</strong> at your gauge</p>`);
  if(pr!=null) parts.push(`<p class="no-margin">Pattern's <strong>${Number(g.patRows)} rows</strong> → <strong>${pr} rows</strong> at your gauge</p>`);
  if(!parts.length) return `<p class="note">Enter your swatch above to compare.</p>`;
  return `<div class="gauge-result-card stack-gap">${parts.join('')}</div>`;
}
function buildGaugeSizeHTML(){
  const g = STATE.gauge, unit = gaugeUnit();
  const { sts, rows } = gaugeRates();
  const out = [];
  const nSts = countForSize(g.sizeW, g.sts, g.swW);
  const nRows = countForSize(g.sizeL, g.rows, g.swH);
  if(nSts!=null){
    out.push(`<p class="no-margin">For <strong>${Number(g.sizeW)} ${unit}</strong> wide: <strong>${nSts} stitches</strong></p>`);
    const m = Number(g.multiple)>=1 ? nearestMultiples(nSts, g.multiple, g.multPlus) : null;
    if(m && !(m.below===nSts && m.above===nSts)){
      const opt = n => `<strong>${n} sts</strong> (${round1(n/sts)} ${unit})`;
      const opts = [m.below, m.above].filter(n=>n!=null && n>0);
      out.push(`<p class="no-margin" style="font-size:0.85rem;">To fit a multiple of ${Math.floor(g.multiple)}${Number(g.multPlus)?` + ${Math.floor(g.multPlus)}`:''}: ${opts.map(opt).join(' or ')}</p>`);
    } else if(m){
      out.push(`<p class="note no-margin">Already fits the multiple of ${Math.floor(g.multiple)}${Number(g.multPlus)?` + ${Math.floor(g.multPlus)}`:''} ✓</p>`);
    }
  }
  if(nRows!=null) out.push(`<p class="no-margin">For <strong>${Number(g.sizeL)} ${unit}</strong> long: <strong>${nRows} rows</strong></p>`);
  if(!out.length){
    return `<p class="note">${(g.sizeW||g.sizeL) && !(sts||rows) ? 'Enter your swatch above first.' : 'Enter a width and/or length.'}</p>`;
  }
  return `<div class="gauge-result-card stack-gap">${out.join('')}
    <p class="note no-margin">A starting point, not always the final number — adjust for the stitch-pattern multiple, any increases/decreases, and whether the piece is built in stitches or rows.</p>
  </div>`;
}
function buildGaugeShapeHTML(){
  const g = STATE.gauge;
  const kind = g.shapeKind==='dec' ? 'dec' : 'inc';
  const res = spreadShaping(g.shapeSts, g.shapeN, kind);
  if(!res) return `<p class="note">Enter your current stitch count and how many to ${kind==='dec'?'decrease':'increase'}.</p>`;
  if(res.error) return `<p class="danger-text no-margin">${esc(res.error)}</p>`;
  // Short abbreviations from the stitch-type box (sc, hdc…) read naturally in
  // crochet instructions; anything longer falls back to "st".
  const word = (g.stitchType||'').trim();
  const stitchWord = g.craft==='crochet' && /^[a-z]{1,4}$/i.test(word) ? word.toLowerCase() : null;
  const steps = res.groups.map(gr => `[${shapingRepeatText(gr.size, kind, g.craft, stitchWord)}] ${gr.times} time${gr.times===1?'':'s'}`);
  return `<div class="gauge-result-card stack-gap">
    <p class="no-margin">Work ${steps.join(', then ')}.</p>
    <p class="no-margin"><strong>${Number(g.shapeSts)} → ${res.result} sts</strong></p>
    ${res.groups.length>1 ? `<p class="note no-margin">For the most even spread, alternate the two repeats instead of working them in blocks.</p>` : ''}
  </div>`;
}
function saveGaugeToProject(){
  const sel = document.getElementById('g-save-project');
  const id = sel && sel.value;
  if(!id){ wgToast('Pick a project first.', 'error'); return; }
  const g = STATE.gauge, ref = gaugeRefSpan();
  const { sts, rows } = gaugeRates();
  if(!sts && !rows){ wgToast('Enter your swatch first.', 'error'); return; }
  const gauge = {
    sts: sts ? round1(sts*ref) : null,
    rows: rows ? round1(rows*ref) : null,
    unit: gaugeUnit(),
    craft: g.craft,
    stitchType: (g.stitchType||'').trim() || null,
    terms: g.craft==='crochet' ? (g.terms||'us') : null
  };
  STATE.projects = STATE.projects.map(p => p.id===id ? {
    ...p, gauge,
    needleSize: p.needleSize || (g.needleSize||'').trim() || null,
    updatedAt: new Date().toISOString()
  } : p);
  persist();
  const proj = STATE.projects.find(p=>p.id===id);
  wgToast(`Gauge saved to ${proj ? proj.name : 'project'}.`, 'success');
}
function gaugeNum(field, placeholder, extra=''){
  return `<input type="number" min="0" step="any" inputmode="decimal" value="${esc(STATE.gauge[field]??'')}" placeholder="${placeholder}" oninput="gaugeUpdate('${field}', this.value)" ${extra} />`;
}
function gaugeSection(key, title, body){
  const open = STATE.gauge.open && STATE.gauge.open[key];
  return `<details class="card mb-4" ${open?'open':''} ontoggle="gaugeToggle('${key}', this.open)">
    <summary class="gauge-summary">${title}</summary>
    ${body}
  </details>`;
}
function renderGauge(){
  const g = STATE.gauge;
  // First visit: measure in cm if the user works in meters.
  if(!g._unitInit){ g._unitInit = true; if(STATE.unitPref==='m'){ g.measUnit='cm'; g.swW=10; g.swH=10; } }
  const unit = gaugeUnit(), ref = gaugeRefSpan();
  const crochet = g.craft==='crochet';
  const projects = STATE.projects.filter(p=>p.status!=='Frogged');
  return `
  <p class="note" style="margin:0 0 16px;">${crochet?'Crochet':'Knit'} a swatch, then count stitches across and rows down, and measure each. Gauge decides whether your finished piece comes out the right size.</p>
  <div class="card form-grid mb-4">
    <label class="field">Craft
      <select onchange="gaugeUpdate('craft', this.value)">
        <option value="knit" ${!crochet?'selected':''}>Knit</option>
        <option value="crochet" ${crochet?'selected':''}>Crochet</option>
      </select>
    </label>
    ${crochet ? `<div class="field gauge-field">Stitch terms
      <div class="row">
        <button type="button" class="harmony-btn ${g.terms!=='uk'?'active':''}" onclick="gaugeUpdate('terms','us')">US</button>
        <button type="button" class="harmony-btn ${g.terms==='uk'?'active':''}" onclick="gaugeUpdate('terms','uk')">UK</button>
      </div>
    </div>` : ''}
    <label class="field">Stitch type (optional)
      <input value="${esc(g.stitchType)}" placeholder="${crochet ? (g.terms==='uk'?'e.g. dc, htr, tr':'e.g. sc, hdc, dc') : 'e.g. stockinette, garter'}" oninput="gaugeUpdate('stitchType', this.value)" />
      <span id="g-out-hint">${buildTermHintHTML()}</span>
    </label>
    <label class="field">${crochet?'Hook':'Needle'} size (optional)
      <input value="${esc(g.needleSize)}" placeholder="e.g. 4.5 mm${crochet?' / 7':' / US 7'}" oninput="gaugeUpdate('needleSize', this.value)" />
    </label>
    <label class="field">Measure in
      <select onchange="gaugeUpdate('measUnit', this.value)">
        <option value="in" ${unit==='in'?'selected':''}>inches</option>
        <option value="cm" ${unit==='cm'?'selected':''}>cm</option>
      </select>
    </label>
    <div class="field gauge-field span2">Your swatch
      <div class="gauge-swatch-grid">
        <span>Stitches</span>${gaugeNum('sts', unit==='cm'?'14':'18', 'aria-label="Stitches counted"')}
        <span>across</span>${gaugeNum('swW', ref, 'aria-label="Width measured"')}<span>${unit}</span>
        <span>Rows</span>${gaugeNum('rows', unit==='cm'?'12':'24', 'aria-label="Rows counted"')}
        <span>down</span>${gaugeNum('swH', ref, 'aria-label="Height measured"')}<span>${unit}</span>
      </div>
    </div>
    <div class="span2" id="g-out-gauge">${buildYourGaugeHTML()}</div>
    ${projects.length ? `<div class="span2 row">
      <select id="g-save-project" aria-label="Project to save gauge to" class="grow" style="max-width:280px;">
        <option value="">Save this gauge to a project…</option>
        ${projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}
      </select>
      <button type="button" class="btn btn-ghost btn-small" onclick="saveGaugeToProject()">Save</button>
    </div>` : ''}
  </div>

  ${gaugeSection('size', 'How many stitches &amp; rows for a size?', `
    <p class="note" style="margin:8px 0;">Want a sleeve 25 ${unit} wide? Stitches = 25 × your stitches ÷ your swatch width. Same for rows and length.</p>
    <div class="form-grid" style="margin-bottom:10px;">
      <label class="field">Target width (${unit})${gaugeNum('sizeW', unit==='cm'?'25':'10')}</label>
      <label class="field">Target length (${unit})${gaugeNum('sizeL', unit==='cm'?'30':'12')}</label>
      <div class="field gauge-field span2">Stitch pattern multiple (optional)
        <div class="row">multiple of ${gaugeNum('multiple','e.g. 6','style="width:80px;"')} + ${gaugeNum('multPlus','0','style="width:70px;"')}</div>
      </div>
    </div>
    <div id="g-out-size">${buildGaugeSizeHTML()}</div>`)}

  ${gaugeSection('compare', 'Compare to your pattern', `
    <p class="note" style="margin:8px 0;">Enter the gauge your pattern calls for, per ${ref} ${unit}.</p>
    <div class="form-grid" style="margin-bottom:10px;">
      <label class="field">Pattern stitches per ${ref} ${unit}${gaugeNum('targetSts', unit==='cm'?'16':'20')}</label>
      <label class="field">Pattern rows per ${ref} ${unit}${gaugeNum('targetRows', unit==='cm'?'14':'24')}</label>
      <label class="field">Convert a pattern stitch count (optional)${gaugeNum('patSts','e.g. 80')}</label>
      <label class="field">Convert a pattern row count (optional)${gaugeNum('patRows','e.g. 40')}</label>
    </div>
    <div id="g-out-compare">${buildGaugeCompareHTML()}</div>`)}

  ${gaugeSection('shape', 'Spread increases or decreases evenly', `
    <div class="form-grid" style="margin:8px 0 10px;">
      <label class="field">Current stitches${gaugeNum('shapeSts','60')}</label>
      <div class="field gauge-field">How many
        <div class="row">
          <select onchange="gaugeUpdate('shapeKind', this.value)" aria-label="Increase or decrease">
            <option value="inc" ${g.shapeKind!=='dec'?'selected':''}>Increase</option>
            <option value="dec" ${g.shapeKind==='dec'?'selected':''}>Decrease</option>
          </select>
          ${gaugeNum('shapeN','10','style="width:80px;" aria-label="Number of stitches"')}
        </div>
      </div>
    </div>
    <div id="g-out-shape">${buildGaugeShapeHTML()}</div>`)}
  `;
}

/* =================================================================
   Order import — read a purchase confirmation and turn the yarn in it into
   stash entries. Input: pasted email text, a saved .eml file, a PDF receipt
   or a screenshot/photo. Everything runs on this device with fixed rules
   (no AI, nothing uploaded): find lines that look like yarn (known brands,
   yarn words), pick up quantity, price, colorway, grams and length nearby,
   fill in specs from the brand/line presets, then let the user review and
   edit every item before anything is added.
================================================================= */

/* ---- .eml (MIME) decoding ---- */
function decodeQuotedPrintableBytes(str){
  const s = str.replace(/=\r?\n/g, '');
  const bytes = [];
  for(let i=0; i<s.length; i++){
    if(s[i]==='=' && /^[0-9A-F]{2}$/i.test(s.substr(i+1,2))){ bytes.push(parseInt(s.substr(i+1,2),16)); i+=2; }
    else { const c = s.charCodeAt(i); if(c<256) bytes.push(c); else bytes.push(...new TextEncoder().encode(s[i])); }
  }
  return new Uint8Array(bytes);
}
function decodeBytes(bytes, charset){
  try{ return new TextDecoder((charset||'utf-8').toLowerCase()).decode(bytes); }
  catch(e){ return new TextDecoder('utf-8').decode(bytes); }
}
function decodeBodyPart(body, encoding, charset){
  encoding = (encoding||'').toLowerCase().trim();
  if(encoding==='base64'){
    try{
      const bin = atob(body.replace(/[^A-Za-z0-9+/=]/g,''));
      return decodeBytes(Uint8Array.from(bin, c=>c.charCodeAt(0)), charset);
    }catch(e){ return ''; }
  }
  if(encoding==='quoted-printable') return decodeBytes(decodeQuotedPrintableBytes(body), charset);
  return body;
}
// RFC 2047 encoded words in headers, e.g. =?UTF-8?Q?Your_order?=
function decodeMimeHeader(v){
  return (v||'').replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (m, cs, enc, txt)=>{
    if(enc.toUpperCase()==='B') return decodeBodyPart(txt, 'base64', cs);
    return decodeBytes(decodeQuotedPrintableBytes(txt.replace(/_/g,' ')), cs);
  }).replace(/\?=\s+=\?/g,'');
}
function splitMimeEntity(raw){
  const m = raw.match(/\r?\n\r?\n/);
  const headText = m ? raw.slice(0, m.index) : raw;
  const body = m ? raw.slice(m.index + m[0].length) : '';
  const headers = {};
  headText.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach(line=>{
    const i = line.indexOf(':');
    if(i>0){ const k = line.slice(0,i).trim().toLowerCase(); if(!(k in headers)) headers[k] = line.slice(i+1).trim(); }
  });
  return { headers, body };
}
function mimeParam(header, name){
  const m = (header||'').match(new RegExp(name+'\\s*=\\s*("([^"]*)"|[^;\\s]+)', 'i'));
  return m ? (m[2]!=null ? m[2] : m[1]) : null;
}
// Returns { plain, html } text collected from a MIME entity (recursive).
function mimeEntityText(headers, body){
  const ct = headers['content-type'] || 'text/plain';
  if(/^multipart\//i.test(ct)){
    const boundary = mimeParam(ct, 'boundary');
    if(!boundary) return { plain: body, html: '' };
    const parts = body.split(new RegExp('\\r?\\n?--' + boundary.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '(?:--)?[ \\t]*\\r?\\n?'));
    const out = { plain:'', html:'' };
    parts.slice(1).forEach(p=>{
      if(!p.trim()) return;
      const e = splitMimeEntity(p);
      if(/attachment/i.test(e.headers['content-disposition']||'')) return;
      const t = mimeEntityText(e.headers, e.body);
      out.plain += t.plain ? t.plain + '\n' : '';
      out.html += t.html ? t.html + '\n' : '';
    });
    return out;
  }
  const text = decodeBodyPart(body, headers['content-transfer-encoding'], mimeParam(ct,'charset'));
  if(/text\/html/i.test(ct)) return { plain:'', html:text };
  if(/text\/plain/i.test(ct) || !/\//.test(ct)) return { plain:text, html:'' };
  return { plain:'', html:'' };
}
// Table cells joined with " | " so a product, its quantity and price stay on
// one line; block elements become line breaks.
function htmlToText(html){
  const marked = html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<br\s*\/?>|<\/(tr|p|div|li|h[1-6]|table)>/gi, '\n');
  const doc = new DOMParser().parseFromString(marked, 'text/html');
  return (doc.body ? doc.body.textContent : '').replace(/ /g,' ');
}
function parseEml(raw){
  const { headers, body } = splitMimeEntity(raw);
  const t = mimeEntityText(headers, body);
  // Plain text is usually laid out line-per-item; HTML is the fallback (or
  // preferred when the plain part is a stub like "view this in a browser").
  const plain = (t.plain||'').trim();
  const text = plain.length > 200 || !t.html ? plain : htmlToText(t.html);
  return { from: decodeMimeHeader(headers.from), subject: decodeMimeHeader(headers.subject), date: headers.date || null, text };
}

/* ---- Rules for finding yarn in order text ---- */
const ORDER_SKIP_RE = /\b(sub-?total|grand total|total|shipping|delivery|postage|tax|vat|discount|coupon|promo|gift ?card|order (number|no\.?|#)|invoice|payment|paid|visa|mastercard|amex|paypal|billing|address|ship(ping)? to|bill to|tracking|unsubscribe|privacy|copyright|view in (your )?browser|customer service|reward|points|estimated|returns?)\b|©/i;
const ORDER_ATTR_RE = /^(colou?r(way)?|shade|col\.?|dye ?lot|lot|qty|quantity|weight|size|variant|option|price|unit price|sku|item #?)\s*[:#.\-]\s*(.*)$/i;
const NON_YARN_RE = /\b(needles?|hooks?|stitch markers?|notions|scissors|ruler|patterns?|books?|gift ?wrap|tote|blocking|mats?|swift|winder|buttons?)\b/i;
const YARN_WORD_RE = /\b(yarns?|wool|merino|alpaca|mohair|cashmere|cotton|acrylic|silk|linen|bamboo|nylon|superwash|skeins?|hanks?|fingering|sock|sport|dk|worsted|aran|chunky|bulky|lace weight|ply|tweed|boucle|chenille)\b/i;
const PRICE_RE = /(?:[$£€]|\b(?:USD|CAD|AUD|GBP|EUR)\s?)\s?(\d{1,4}(?:[.,]\d{2})?)|(\d{1,4}[.,]\d{2})\s?(?:USD|CAD|AUD|GBP|EUR|€|£)/gi;
function orderPrices(line){
  const out = []; let m; PRICE_RE.lastIndex = 0;
  while((m = PRICE_RE.exec(line))) out.push(Number((m[1]||m[2]).replace(',','.')));
  return out;
}
function orderQty(line){
  let m = line.match(/\b(?:qty|quantity)\s*[:x]?\s*(\d{1,3})\b/i)
       || line.match(/[x×]\s*(\d{1,3})\b(?!\s*(?:g|gr|grams?|m|yds?|yards?|mm|cm)\b)/i)
       || line.match(/^\s*(\d{1,3})\s*[x×]\s/i);
  return m ? Number(m[1]) : null;
}
function orderSpecs(text){
  const g = text.match(/\b(\d{2,4})\s?(?:g|gr|grams?)\b/i);
  const yd = text.match(/\b(\d{2,5})\s?(?:yds?|yards?)\b/i);
  const m = text.match(/\b(\d{2,5})\s?(?:m|meters?|metres?)\b/i);
  return {
    grams: g ? Number(g[1]) : null,
    yards: yd ? Number(yd[1]) : (m ? Math.round(Number(m[1]) * YD_PER_M) : null)
  };
}
function orderWeight(text){
  const t = ' ' + text.toLowerCase() + ' ';
  // Most specific first (super bulky before bulky, light fingering before fingering…).
  const order = ['Super Bulky','Lace','Fingering','Sport','DK','Worsted','Bulky'];
  for(const w of order){
    const names = [w.toLowerCase(), ...((WEIGHT_META[w]&&WEIGHT_META[w].aliases)||[])].filter(n=>!['fine','craft','baby','thread'].includes(n));
    if(names.some(n=>new RegExp('[^a-z]'+n.replace(/[-]/g,'[- ]?')+'[^a-z]').test(t))) return w;
  }
  return null;
}
function guessColorHex(colorway){
  const t = (colorway||'').toLowerCase();
  if(!t) return null;
  const synonyms = { gray:'Grey', grey:'Grey', rose:'Dusty rose', natural:'Cream', oatmeal:'Beige', denim:'Blue', mint:'Aqua', violet:'Purple', scarlet:'Red', crimson:'Red', ochre:'Mustard', sand:'Beige', ecru:'Cream', khaki:'Olive' };
  const named = [...COLOR_NAMES].sort((a,b)=>b[0].length-a[0].length);
  for(const [name,hex] of named){ if(new RegExp('\\b'+name.toLowerCase()+'\\b').test(t)) return hex; }
  for(const [word,name] of Object.entries(synonyms)){
    if(new RegExp('\\b'+word+'\\b').test(t)){ const c = COLOR_NAMES.find(([n])=>n===name); if(c) return c[1]; }
  }
  return null;
}
function knownBrandList(){
  const brands = new Set([...presetBrands(), ...((typeof STATE!=='undefined' && STATE.yarns) ? STATE.yarns.map(y=>y.brand) : [])].filter(Boolean));
  return [...brands].sort((a,b)=>b.length-a.length);
}
function containsWord(text, word){
  const t = text.toLowerCase(), w = word.toLowerCase();
  let i = t.indexOf(w);
  while(i>=0){
    const before = t[i-1], after = t[i+w.length];
    if((!before || !/[a-z0-9]/.test(before)) && (!after || !/[a-z0-9]/.test(after))) return true;
    i = t.indexOf(w, i+1);
  }
  return false;
}
// Full brand name first; then a short form ("Cascade" for "Cascade Yarns").
function findBrandIn(text, brands){
  const full = brands.find(b=>containsWord(text, b));
  if(full) return full;
  return brands.find(b=>{
    const short = b.replace(/\s+(yarns?|brand|wool company|company|co\.?)$/i,'').trim();
    return short!==b && short.length>=4 && containsWord(text, short);
  }) || null;
}
// Split a product title into brand / line / colorway, with preset specs.
function parseOrderTitle(title, brands){
  // Drop quantity markers and spec groups like "(100g, 220 yds)" — specs are
  // read separately from the whole line.
  let t = title.replace(/\s*\|\s*/g,' ')
    .replace(/\(([^()]*\d\s?(?:g|gr|grams?|yds?|yards?|m|meters?|metres?)\b[^()]*)\)/gi,' ')
    .replace(/\s*[x×]\s*\d{1,3}\b(?!\s*(?:g|gr|grams?|m|yds?|yards?|mm|cm)\b)/gi,' ')
    .replace(/\b(?:qty|quantity)\s*:?\s*\d+\b/gi,' ')
    .replace(/\s+/g,' ').trim();
  const brand = findBrandIn(t, brands);
  let colorway = null;
  const paren = t.match(/\(([^()]*[A-Za-z][^()]*)\)\s*$/);
  if(paren && !/\d\s?(g|yds?|m)\b/i.test(paren[1])){ colorway = paren[1].trim(); t = t.slice(0, paren.index).trim(); }
  if(!colorway){
    const parts = t.split(/\s+[-–—\/]\s+|,\s+(?:colou?r|shade)\s*:?\s*/i);
    if(parts.length>1){ colorway = parts.pop().trim(); t = parts.join(' - ').trim(); }
  }
  let line = t;
  let preset = null;
  let guessedBrand = null;
  if(!brand){
    // Unknown brand: product titles almost always start with it ("Scheepjes
    // Catona", "Paintbox Yarns Simply DK") — a guess the user can edit.
    const w = t.split(' ');
    if(w.length>=2){
      const n = /^yarns?$/i.test(w[1]) && w.length>=3 ? 2 : 1;
      guessedBrand = w.slice(0,n).join(' ');
      line = w.slice(n).join(' ');
    }
  }
  if(brand){
    const lines = presetLinesForBrand(brand).sort((a,b)=>b.line.length-a.line.length);
    preset = lines.find(p=>t.toLowerCase().includes(p.line.toLowerCase())) || null;
    const short = brand.replace(/\s+(yarns?|brand|wool company|company|co\.?)$/i,'').trim();
    const strip = new RegExp('\\b(' + [brand, short].map(b=>b.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')\\b','i');
    line = preset ? preset.line : t.replace(strip,'');
  }
  line = line.replace(/\b\d{2,5}\s?(?:g|gr|grams?|yds?|yards?|m|meters?|metres?)\b/gi,'')
             .replace(/\b(?:qty|quantity)\s*:?\s*\d+\b/gi,'').replace(/[x×]\s*\d{1,3}\b/g,'')
             .replace(/\s*[-–—,:]\s*$/,'').replace(/^\s*[-–—,:]\s*/,'').replace(/\s+/g,' ').trim();
  if(colorway && /^\s*$/.test(colorway)) colorway = null;
  return { brand: brand || guessedBrand, knownBrand: !!brand, line, colorway, preset };
}
// Pure: text → { store, date, items[] }. Each item carries a score; higher
// means more yarn-like signals (brand, yarn words, qty, price, colorway).
function parseOrderText(text, opts={}){
  const brands = opts.brands || knownBrandList();
  const lines = (text||'').split(/\r?\n/).map(l=>l.replace(/\s+/g,' ').trim()).filter(l=>l && l!=='|' && /[A-Za-z0-9]/.test(l));
  const items = [];
  let cur = null, curAge = 0;
  for(const raw of lines){
    const line = raw.replace(/^\|\s*|\s*\|$/g,'').trim();
    const attr = line.match(ORDER_ATTR_RE);
    if(attr && cur){
      const key = attr[1].toLowerCase(), val = attr[3].trim();
      if(/^colou?r|shade|col/.test(key) && val && !cur.colorway) cur.colorway = val.replace(/\s*\|.*$/,'');
      else if(/lot/.test(key) && val) cur.dyeLot = val.split(/\s*\|/)[0];
      else if(/qty|quantity/.test(key) && /^\d/.test(val)) cur.quantity = Number(val.match(/\d+/)[0]);
      else if(/weight|size|variant|option/.test(key)){ const w = orderWeight(val); if(w && !cur.weightCategory) cur.weightCategory = w; }
      const p = orderPrices(line);
      if(p.length){ if(/^(unit )?price/.test(key) || /\b(each|ea\.?|per)\b/i.test(line)) cur._unit = p[0]; else cur._prices.push(...p); }
      cur.score += 1; curAge++;
      continue;
    }
    const brand = findBrandIn(line, brands);
    if(ORDER_SKIP_RE.test(line) && !brand){ cur = null; continue; }
    // A short plain line straight after a product title is usually its
    // variant/colorway (Shopify puts "Teal Feather" or "Worsted / Teal" on
    // its own line) — even if it contains a yarn word like "worsted".
    if(cur && curAge===0 && !brand && !cur.colorway && /^[A-Za-z][A-Za-z0-9 '’&\/.-]{1,40}$/.test(line) && !/\d{2,}/.test(line)){
      const parts = line.split(/\s*\/\s*/);
      const w = parts.map(orderWeight).find(Boolean); if(w && !cur.weightCategory) cur.weightCategory = w;
      const name = parts.filter(x=>!orderWeight(x)).join(' / ').trim();
      if(name) cur.colorway = name;
      curAge++; cur.score += 1;
      continue;
    }
    const sp0 = orderSpecs(line);
    const yarnish = YARN_WORD_RE.test(line) || !!(sp0.grams || sp0.yards);
    const looksLikeTitle = line.length>=4 && line.length<=140 && /[A-Za-z]{3}/.test(line) && !/^\s*[\d$£€.,|\s]+$/.test(line);
    if(looksLikeTitle && (brand || yarnish)){
      const cells = line.split(/\s*\|\s*/).filter(Boolean);
      const title = cells[0];
      const t = parseOrderTitle(title, brands);
      cur = {
        raw: line, brand: t.brand || '', knownBrand: t.knownBrand, line: t.line, colorway: t.colorway, preset: t.preset,
        quantity: orderQty(line), _prices: orderPrices(line), dyeLot: null,
        weightCategory: null, specs: orderSpecs(line), score: (brand?2:0) + (yarnish?1:0) - (NON_YARN_RE.test(title)?3:0)
      };
      // Bare quantity cell in a table row ("Rios | 2 | $28.00").
      if(cur.quantity==null){ const q = cells.slice(1).find(c=>/^\d{1,3}$/.test(c)); if(q) cur.quantity = Number(q); }
      items.push(cur); curAge = 0;
      continue;
    }
    // Free-form detail lines just below a title (qty/price/specs).
    // Any other line with real words is something else (a product we don't
    // recognise, a note…) — stop attaching details to the current item.
    const leftover = line.replace(PRICE_RE,' ').replace(/\b(?:qty|quantity|each|ea|per|unit|price|x|×)\b/gi,' ')
      .replace(/\b\d{1,5}\s?(?:g|gr|grams?|yds?|yards?|m|meters?|metres?)\b/gi,' ');
    if(cur && /[A-Za-z]{3,}/.test(leftover) && !orderWeight(line)){ cur = null; continue; }
    if(cur && curAge < 4){
      const q = orderQty(line); if(q!=null && cur.quantity==null) cur.quantity = q;
      const p = orderPrices(line);
      if(p.length){ if(/\b(each|ea\.?|per)\b/i.test(line)) cur._unit = p[0]; else cur._prices.push(...p); }
      const sp = orderSpecs(line); if(sp.grams && !cur.specs.grams) cur.specs.grams = sp.grams; if(sp.yards && !cur.specs.yards) cur.specs.yards = sp.yards;
      const w = orderWeight(line); if(w && !cur.weightCategory) cur.weightCategory = w;
      curAge++;
    }
  }
  const out = items.map(it=>{
    const qty = it.quantity || 1;
    let cost = null;
    if(it._unit!=null) cost = it._unit;
    else if(it._prices.length){
      // Two prices with qty>1 → the smaller is the unit price; a single price
      // with qty>1 is usually the line total.
      cost = it._prices.length>1 ? Math.min(...it._prices) : (qty>1 ? it._prices[0]/qty : it._prices[0]);
      cost = Math.round(cost*100)/100;
    }
    const pr = it.preset;
    const score = it.score + (it.quantity?1:0) + (it._prices.length||it._unit!=null?1:0) + (it.colorway?1:0);
    return {
      brand: it.brand, line: it.line || (pr ? pr.line : ''), colorway: it.colorway || '', dyeLot: it.dyeLot || '',
      quantity: qty, cost,
      weightCategory: it.weightCategory || (pr && pr.weightCategory) || orderWeight(it.raw) || '',
      fiber: (pr && pr.fiber) || '',
      skeinWeightGrams: it.specs.grams || (pr && pr.skeinWeightGrams) || null,
      skeinYardage: it.specs.yards || (pr && pr.skeinYardage) || null,
      colorHex: guessColorHex(it.colorway),
      score, include: score >= 4 || (it.knownBrand && score >= 3)
    };
  }).filter(it=>it.score>=2 && (it.line || it.brand));
  // Store and order date.
  let store = opts.from ? opts.from.replace(/<[^>]*>/,'').replace(/"/g,'').trim() : '';
  if(!store){ const m = (text||'').match(/thank you for (?:your order|shopping|ordering)(?: with| from| at)\s+([A-Z][\w&' .-]{1,40}?)[!.,\n]/i); if(m) store = m[1].trim(); }
  let date = null;
  const dm = opts.date || ((text||'').match(/\b(?:order(?:ed)?|purchase|placed)(?: date| on)?\s*:?\s*([A-Z][a-z]{2,8}\.? \d{1,2},? \d{4}|\d{1,2} [A-Z][a-z]{2,8} \d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i)||[])[1];
  if(dm){ const d = new Date(dm); if(!isNaN(d)) date = d.toISOString().slice(0,10); }
  return { store, date, items: out };
}

/* ---- Reading files ---- */
let _pdfjsLoading = null;
function ensurePdfjsLoaded(){
  if(typeof pdfjsLib !== 'undefined') return Promise.resolve();
  if(_pdfjsLoading) return _pdfjsLoading;
  _pdfjsLoading = new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; resolve(); };
    s.onerror = () => { _pdfjsLoading = null; reject(new Error('load failed')); };
    document.head.appendChild(s);
  });
  return _pdfjsLoading;
}
async function pdfToText(file, setStatus){
  await ensurePdfjsLoaded();
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = Math.min(pdf.numPages, 10);
  let text = '';
  for(let n=1; n<=pages; n++){
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    // Rebuild lines from positioned text runs; wide gaps become " | ".
    const rows = new Map();
    content.items.forEach(it=>{
      const y = Math.round(it.transform[5]);
      const key = [...rows.keys()].find(k=>Math.abs(k-y)<=2) ?? y;
      if(!rows.has(key)) rows.set(key, []);
      rows.get(key).push({ x: it.transform[4], w: it.width||0, s: it.str });
    });
    [...rows.entries()].sort((a,b)=>b[0]-a[0]).forEach(([,runs])=>{
      runs.sort((a,b)=>a.x-b.x);
      let line = '', end = null;
      runs.forEach(r=>{ if(end!=null) line += (r.x - end > 25) ? ' | ' : (r.x - end > 1 ? ' ' : ''); line += r.s; end = r.x + r.w; });
      text += line + '\n';
    });
  }
  if(text.replace(/[\s|]/g,'').length >= 30) return text;
  // Scanned PDF (no text layer): render pages and read them like a photo.
  let ocr = '';
  for(let n=1; n<=Math.min(pdf.numPages, 3); n++){
    if(setStatus) setStatus(`Reading scanned page ${n}…`);
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const blob = await new Promise(r=>canvas.toBlob(r, 'image/png'));
    ocr += await imageToText(blob, setStatus) + '\n';
  }
  return ocr;
}
async function imageToText(blob, setStatus){
  await ensureTesseractLoaded();
  const { data } = await Tesseract.recognize(blob, 'eng', {
    logger: m => { if(setStatus && m.status==='recognizing text') setStatus(`Reading… ${Math.round(m.progress*100)}%`); }
  });
  return data.text || '';
}

/* ---- UI ---- */
function openOrderImport(){
  if(!STATE.online){ wgToast("You're offline — view-only until you reconnect.", "error"); return; }
  cleanupOpenForms();
  STATE.tab = 'stash';
  STATE.orderImport = { items: null, store:'', date:'' };
  render();
}
function closeOrderImport(){ STATE.orderImport = null; renderTab(); }
function setImportStatus(t){ const el = document.getElementById('imp-status'); if(el) el.textContent = t || ''; }
async function readOrderFromInputs(fileList){
  const file = fileList && fileList[0];
  let text = '', from = '', date = null;
  try{
    if(file){
      const name = (file.name||'').toLowerCase();
      if(/\.eml$/.test(name) || /message\/rfc822/.test(file.type||'')){
        setImportStatus('Reading email…');
        const e = parseEml(await file.text()); text = e.text; from = e.from; date = e.date;
      } else if(/\.pdf$/.test(name) || /pdf/.test(file.type||'')){
        setImportStatus('Loading PDF reader…');
        text = await pdfToText(file, setImportStatus);
      } else if(isAcceptableImageFile(file)){
        setImportStatus('Loading text reader…');
        text = await imageToText(await toRenderableImageBlob(file), setImportStatus);
      } else if(/\.(txt|html?)$/.test(name) || /^text\//.test(file.type||'')){
        const raw = await file.text();
        text = /\.html?$/.test(name) || /html/.test(file.type||'') ? htmlToText(raw) : raw;
      } else { wgToast('Use a .eml, PDF, image or text file.', 'error'); return; }
    } else {
      text = (document.getElementById('imp-text')||{}).value || '';
      // A pasted raw email source (headers + MIME) gets decoded too.
      if(/^(received|from|return-path|delivered-to|mime-version):/im.test(text) && /content-type:/i.test(text)){
        const e = parseEml(text); text = e.text; from = e.from; date = e.date;
      }
    }
  }catch(err){
    console.error('Order import read failed', err);
    setImportStatus('');
    wgToast("Couldn't read that file — try pasting the email text instead.", 'error');
    return;
  }
  setImportStatus('');
  if(!text.trim()){ wgToast('Paste an order email or choose a file first.', 'error'); return; }
  const res = parseOrderText(text, { from, date });
  STATE.orderImport = { items: res.items.map(it=>({ ...it, id: uid(), colorHex: it.colorHex || '#B8B0BF', colorGuessed: !!it.colorHex })), store: res.store, date: res.date || todayStr() };
  renderTab();
  if(!res.items.length) wgToast("Didn't find any yarn in that order — you can add items by hand below.", 'error');
}
function importExistingMatch(it){
  const k = s => (s||'').toLowerCase().trim();
  return STATE.yarns.find(y=>k(y.brand)===k(it.brand) && k(y.line)===k(it.line) && k(y.colorway)===k(it.colorway) && k(it.colorway)) || null;
}
function updateImportItem(id, field, val){
  const imp = STATE.orderImport; if(!imp || !imp.items) return;
  imp.items = imp.items.map(it => it.id===id ? { ...it, [field]: val } : it);
  if(field==='colorway' || field==='brand' || field==='line') renderTab();
}
function addImportRow(){
  const imp = STATE.orderImport; if(!imp) return;
  imp.items = [...(imp.items||[]), { id: uid(), brand:'', line:'', colorway:'', dyeLot:'', quantity:1, cost:null, weightCategory:'', fiber:'', skeinWeightGrams:null, skeinYardage:null, colorHex:'#B8B0BF', include:true }];
  renderTab();
}
function renderImportItem(it){
  const match = importExistingMatch(it);
  const f = (field, attrs='') => `oninput="updateImportItem('${it.id}','${field}', this.value)" ${attrs}`;
  return `<div class="card import-item ${it.include?'':'import-item-off'}">
    <label class="row" style="gap:8px;">
      <input type="checkbox" ${it.include?'checked':''} onchange="updateImportItem('${it.id}','include', this.checked); this.closest('.import-item').classList.toggle('import-item-off', !this.checked);" style="width:auto;" />
      <input type="color" value="${esc(it.colorHex)}" ${f('colorHex')} title="${it.colorGuessed?'Color guessed from the colorway name — adjust if needed':'Pick the yarn color'}" aria-label="Yarn color" />
      <strong class="grow" style="font-size:0.85rem;">${esc([it.brand, it.line].filter(Boolean).join(' ') || 'New item')}${it.colorway?` · ${esc(it.colorway)}`:''}</strong>
    </label>
    ${match ? `<p class="note ok-text" style="margin:6px 0 0;">Already in your stash — will add ${esc(it.quantity)} skein(s) to it.</p>` : ''}
    <div class="import-grid">
      <label class="field">Brand<input value="${esc(it.brand)}" onchange="updateImportItem('${it.id}','brand', this.value)" /></label>
      <label class="field">Line<input value="${esc(it.line)}" onchange="updateImportItem('${it.id}','line', this.value)" /></label>
      <label class="field">Colorway<input value="${esc(it.colorway)}" onchange="updateImportItem('${it.id}','colorway', this.value)" /></label>
      <label class="field">Skeins<input type="number" min="1" step="1" value="${esc(it.quantity)}" ${f('quantity')} /></label>
      <label class="field">Weight<select onchange="updateImportItem('${it.id}','weightCategory', this.value)"><option value="">—</option>${WEIGHTS.map(w=>`<option ${it.weightCategory===w?'selected':''}>${w}</option>`).join('')}</select></label>
      <label class="field">g / skein<input type="number" min="0" value="${esc(it.skeinWeightGrams??'')}" ${f('skeinWeightGrams')} /></label>
      <label class="field">${unitLabel()} / skein<input type="number" min="0" value="${it.skeinYardage ? toDisplayLength(it.skeinYardage) : ''}" oninput="updateImportItem('${it.id}','skeinYardage', fromInputLength(this.value))" /></label>
      <label class="field">Cost / skein<input type="number" min="0" step="0.01" value="${esc(it.cost??'')}" ${f('cost')} /></label>
    </div>
  </div>`;
}
function renderOrderImport(){
  const imp = STATE.orderImport;
  if(!imp) return '';
  if(!imp.items){
    return `<div class="card mb-4 order-import">
      <div class="row-between"><p class="no-margin" style="font-family:'Fraunces',serif; font-weight:600;">Import from an order email</p>
        <button class="del-btn" onclick="closeOrderImport()" aria-label="Close">✕</button></div>
      <p class="note" style="margin:6px 0 10px;">Paste your order confirmation, or choose a saved email (.eml), PDF receipt or screenshot. It's read on this device — nothing is uploaded — and you'll review everything before it's added.</p>
      <textarea id="imp-text" rows="6" class="full-width" placeholder="Paste the order email here…"></textarea>
      <div class="row mt-2">
        <button class="btn btn-primary btn-small" onclick="readOrderFromInputs(null)">Find yarn</button>
        <label class="btn btn-ghost btn-small" style="cursor:pointer;">${ICONS.upload} Choose file
          <input type="file" accept=".eml,message/rfc822,.pdf,application/pdf,image/*,.heic,.heif,.txt,.html,text/plain,text/html" style="display:none;" onchange="readOrderFromInputs(this.files); this.value='';" />
        </label>
        <span id="imp-status" class="note"></span>
      </div>
    </div>`;
  }
  const n = imp.items.filter(i=>i.include).length;
  return `<div class="card mb-4 order-import">
    <div class="row-between"><p class="no-margin" style="font-family:'Fraunces',serif; font-weight:600;">Review your order</p>
      <button class="del-btn" onclick="closeOrderImport()" aria-label="Close">✕</button></div>
    <p class="note" style="margin:6px 0 10px;">Found ${imp.items.length} item${imp.items.length===1?'':'s'}. Check the details — colors are a guess from the colorway name. Unticked items are skipped.</p>
    <div class="row mb-3">
      <label class="field" style="flex:1; min-width:140px;">Store<input value="${esc(imp.store)}" oninput="STATE.orderImport.store=this.value" /></label>
      <label class="field">Purchase date<input type="date" value="${esc(imp.date)}" oninput="STATE.orderImport.date=this.value" /></label>
    </div>
    <div class="stack-gap">${imp.items.map(renderImportItem).join('')}</div>
    <div class="row mt-3">
      <button class="btn btn-ghost btn-small" onclick="addImportRow()">${ICONS.plus} Add item</button>
      <button class="btn btn-ghost btn-small" onclick="STATE.orderImport.items=null; renderTab();">Start over</button>
      <span class="grow"></span>
      <button class="btn btn-primary" onclick="commitOrderImport()">Add ${n} to stash</button>
    </div>
  </div>`;
}
function commitOrderImport(){
  const imp = STATE.orderImport;
  if(!imp || !imp.items) return;
  const chosen = imp.items.filter(i=>i.include && (i.line||'').trim());
  if(!chosen.length){ wgToast('Tick at least one item with a line name.', 'error'); return; }
  const noWeight = chosen.find(i=>!i.weightCategory);
  if(noWeight){ wgToast(`Pick a yarn weight for ${[noWeight.brand, noWeight.line].filter(Boolean).join(' ')}.`, 'error'); return; }
  const now = new Date().toISOString();
  let added = 0, merged = 0;
  chosen.forEach(it=>{
    const qty = Math.max(1, Math.round(Number(it.quantity)||1));
    const skeinYd = Math.round(Number(it.skeinYardage)||0);
    const match = importExistingMatch(it);
    if(match){
      STATE.yarns = STATE.yarns.map(y => y.id===match.id ? { ...y, quantity:(Number(y.quantity)||0)+qty, yardageRemaining:(Number(y.yardageRemaining)||0) + qty*(Number(y.skeinYardage)||skeinYd), updatedAt:now } : y);
      merged++; return;
    }
    const brand = (it.brand||'').trim(), line = (it.line||'').trim();
    const yarn = {
      id: uid(), name: [brand, line].filter(Boolean).join(' '), brand, line,
      colorway: (it.colorway||'').trim(), colorwayNumber:'', dyeLot: (it.dyeLot||'').trim(),
      fiber: it.fiber || '', weightCategory: it.weightCategory,
      skeinWeightGrams: Number(it.skeinWeightGrams)||0, skeinYardage: skeinYd, quantity: qty,
      cost: it.cost===''||it.cost==null ? null : Number(it.cost),
      purchaseDate: imp.date || null, purchasedFrom: (imp.store||'').trim() || null,
      isMulticolor:false, colors:[], primaryIndex:0, matchMode:'simple', colorHex: it.colorHex || '#B8B0BF',
      scraps: [], status:'available', allocatedTo:null, dateAdded: todayStr(), updatedAt: now
    };
    yarn.yardageRemaining = qty * skeinYd;
    STATE.yarns.push(yarn);
    added++;
  });
  persist();
  STATE.orderImport = null;
  renderTab();
  scrollToTop();
  wgToast([added ? `Added ${added} yarn${added===1?'':'s'}` : '', merged ? `topped up ${merged}` : ''].filter(Boolean).join(', ') + '.', 'success');
}

/* =================================================================
   Pattern PDF reader — entirely in the browser with PDF.js (Mozilla's
   open-source PDF renderer), loaded only the first time a PDF is added.
   Two jobs, both deterministic:
   1. Preview: pull out the largest photo embedded in the first pages
      (usually the cover shot); if there is none, draw page 1 instead.
   2. Details: read the PDF's text layer and pick out name, designer,
      gauge, hook/needle, yardage, yarn weight, craft and skill level with
      plain pattern-matching rules (parsePatternText). Scanned PDFs with no
      text layer get a preview only — there's no OCR here.
================================================================= */
const PDFJS_BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';
const PDF_TEXT_PAGES = 8;     // materials can follow a contents page, terms and notes
const PDF_IMAGE_PAGES = 3;
const PDF_MAX_PREVIEWS = 5;
// Bump when parsePatternText learns something new: PDFs read by an older
// version are re-read once in the background (refreshPatternPdfReads).
const PDF_PARSER_VERSION = 2;   // photos + page 1 offered as cover choices
const PDF_THUMB_MAX = 800;    // px, longest side of the stored preview
let pdfjsPromise = null;
function loadPdfJs(){
  if(!pdfjsPromise){
    pdfjsPromise = import(PDFJS_BASE + 'pdf.min.mjs').then(lib => {
      lib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.min.mjs';
      return lib;
    }).catch(err => { pdfjsPromise = null; throw err; });
  }
  return pdfjsPromise;
}
async function analyzePatternPdf(file, opts = {}){
  const wantPreviews = opts.previews !== false;
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported:false }).promise;
  try{
    const lines = [];
    const found = [];
    for(let n = 1; n <= Math.min(doc.numPages, wantPreviews ? Math.max(PDF_TEXT_PAGES, PDF_IMAGE_PAGES) : PDF_TEXT_PAGES); n++){
      const page = await doc.getPage(n);
      if(n <= PDF_TEXT_PAGES) lines.push(...pdfTextLines(await page.getTextContent(), n));
      if(wantPreviews && n <= PDF_IMAGE_PAGES){
        const imgs = await pdfPageImages(page, lib.OPS).catch(() => []);
        // Page 1 gets a head start: the cover photo beats a bigger step photo later on.
        imgs.forEach(im => { if(!found.some(f => f.id === im.id)) found.push({ ...im, score: im.score * (n===1 ? 1.5 : 1) }); });
      }
    }
    // Preview options, best first: the biggest photos, then page 1 as a whole
    // (the person picks which one the card shows).
    found.sort((a,b) => b.score - a.score);
    const thumbs = [];
    for(const f of found.slice(0, PDF_MAX_PREVIEWS - 1)){
      const blob = await pdfImageToJpeg(f.img).catch(() => null);
      if(blob) thumbs.push(blob);
    }
    const pageOne = wantPreviews ? await renderPdfPageToJpeg(await doc.getPage(1)).catch(() => null) : null;
    if(pageOne) thumbs.push(pageOne);
    return { thumbs, hasText: lines.some(l => /[a-z]{3}/i.test(l.text)), found: parsePatternText(lines) };
  } finally {
    doc.destroy();
  }
}
/* Text items → visual lines (same baseline), keeping font size so the title
   can be picked out as the biggest text on page 1. */
function pdfTextLines(content, pageNum){
  const raw = content.items.filter(it => it.str && it.str.trim())
    .map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width||0, size: Math.hypot(it.transform[2], it.transform[3]) || it.height || 10 }));
  // Display fonts often draw the same word twice (fill + outline/shadow) —
  // keep one, or "LACEY" reads as "LACEYLACEY".
  const items = raw.filter((it, i) => !raw.slice(0, i).some(o => o.str === it.str && Math.abs(o.x - it.x) < it.size*0.4 && Math.abs(o.y - it.y) < it.size*0.4));
  items.sort((a,b) => b.y - a.y);
  // Group into rows by baseline, then read each row left to right.
  const rows = [];
  for(const it of items){
    const row = rows.find(r => Math.abs(it.y - r.y) <= Math.max(r.size, it.size) * 0.5);
    if(row){ row.items.push(it); row.size = Math.max(row.size, it.size); }
    else rows.push({ y: it.y, size: it.size, items: [it] });
  }
  rows.sort((a,b) => b.y - a.y);
  const lines = [];
  for(const row of rows){
    row.items.sort((a,b) => a.x - b.x);
    let cur = null;
    for(const it of row.items){
      const gap = cur ? it.x - cur.endX : 0;
      // A wide gap is a column gutter: start a separate line so two columns
      // side by side don't run together ("…1,381 yd (1,263 m)Hook: 4 mm").
      if(cur && gap <= Math.min(cur.size, it.size) * 1.8){
        const needSpace = !/\s$/.test(cur.text) && !/^\s/.test(it.str) && gap > Math.min(cur.size, it.size) * 0.15;
        cur.text += (needSpace ? ' ' : '') + it.str;
        cur.endX = Math.max(cur.endX, it.x + it.w);
        cur.size = Math.max(cur.size, it.size);
      } else {
        cur = { text: it.str, endX: it.x + it.w, size: it.size, page: pageNum };
        lines.push(cur);
      }
    }
  }
  return lines.map(l => ({ text: l.text.replace(/\s+/g,' ').trim(), size: Math.round(l.size*10)/10, page: l.page }));
}
/* Walks a page's drawing operations, tracking how much the current transform
   scales things (its determinant), so each embedded image is scored by the
   area it actually covers on the page — not its pixel count, since tiny
   logos are often high-res. Thin banners and icons are skipped. */
async function pdfPageImages(page, OPS){
  const ops = await page.getOperatorList();
  const view = page.view;
  const pageArea = Math.abs((view[2]-view[0]) * (view[3]-view[1])) || 1;
  const stack = [];
  let det = 1;
  const candidates = [];
  for(let i = 0; i < ops.fnArray.length; i++){
    const fn = ops.fnArray[i], args = ops.argsArray[i];
    if(fn === OPS.save) stack.push(det);
    else if(fn === OPS.restore) det = stack.length ? stack.pop() : det;
    else if(fn === OPS.transform) det *= args[0]*args[3] - args[1]*args[2];
    else if(fn === OPS.paintFormXObjectBegin){
      stack.push(det);
      const m = args[0];
      if(m) det *= m[0]*m[3] - m[1]*m[2];
    }
    else if(fn === OPS.paintFormXObjectEnd) det = stack.length ? stack.pop() : det;
    else if(fn === OPS.paintImageXObject){
      const [id, w, h] = args;
      if(!w || !h || Math.min(w,h) < 120 || Math.max(w,h)/Math.min(w,h) > 3) continue;
      const share = Math.abs(det) / pageArea;
      if(share < 0.04) continue;
      candidates.push({ id, score: share });
    }
  }
  candidates.sort((a,b) => b.score - a.score);
  const out = [];
  for(const c of candidates){
    if(out.some(o => o.id === c.id)) continue;   // same photo drawn twice
    if(out.length >= PDF_MAX_PREVIEWS) break;
    const img = await pdfObject(page, c.id);
    if(img && (img.bitmap || (img.data && (img.kind === 2 || img.kind === 3)))) out.push({ id: c.id, img, score: c.score });
  }
  return out;
}
function pdfObject(page, id){
  const objs = String(id).startsWith('g_') ? page.commonObjs : page.objs;
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), 4000);
    try{ objs.get(id, obj => { clearTimeout(timer); resolve(obj); }); }
    catch(e){ clearTimeout(timer); resolve(null); }
  });
}
function pdfImageToJpeg(img){
  const w = img.width || (img.bitmap && img.bitmap.width), h = img.height || (img.bitmap && img.bitmap.height);
  let src;
  if(img.bitmap) src = img.bitmap;
  else {
    src = document.createElement('canvas');
    src.width = w; src.height = h;
    let rgba = img.data;
    if(img.kind === 2){                        // RGB → RGBA
      rgba = new Uint8ClampedArray(w*h*4);
      for(let p = 0, q = 0; p < w*h*3; p += 3, q += 4){ rgba[q]=img.data[p]; rgba[q+1]=img.data[p+1]; rgba[q+2]=img.data[p+2]; rgba[q+3]=255; }
    }
    src.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, w*h*4), w, h), 0, 0);
  }
  return canvasToJpeg(src, w, h);
}
async function renderPdfPageToJpeg(page){
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: PDF_THUMB_MAX / Math.max(base.width, base.height) });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvasToJpeg(canvas, canvas.width, canvas.height);
}
// Scales into a white-backed canvas (transparent areas would turn black as JPEG).
function canvasToJpeg(src, w, h){
  const k = Math.min(1, PDF_THUMB_MAX / Math.max(w, h));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(w*k)); out.height = Math.max(1, Math.round(h*k));
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return new Promise((resolve, reject) => out.toBlob(b => b ? resolve(b) : reject(new Error('Could not make preview')), 'image/jpeg', 0.82));
}

/* Pure: pattern text lines ({text,size,page} or plain strings) → whatever
   details can be found; anything not found is null. Rules, not guesses: each
   field needs its own keyword nearby, so prose rarely trips them. */
function parsePatternText(lines){
  const L = (lines||[]).map(l => typeof l === 'string' ? { text:l, size:10, page:1 } : l).filter(l => l.text && l.text.trim());
  const text = L.map(l => l.text).join('\n').replace(/[’‘]/g, "'").replace(/[“”″]/g, '"').replace(/[–—]/g, '-');
  const flat = text.replace(/\s+/g, ' ');
  return {
    name: patternTitleFromLines(L),
    designer: patternDesignerFromText(text),
    craft: patternCraftFromText(flat),
    gauge: patternGaugeFromText(flat),
    needleSize: patternNeedleFromText(flat),
    ...patternYardageAndSizes(L, flat, text),
    weightCategory: patternWeightFromText(flat),
    skillLevel: patternSkillFromText(text)
  };
}
const PDF_GENERIC_TITLE = /^(?:free\s+)?(?:knit(?:ting)?|crochet|pattern|knitting pattern|crochet pattern|free pattern|materials|gauge|tension|notes?|abbreviations|instructions|sizes?|page \d+|\d+)$/i;
function patternTitleFromLines(L){
  const first = L.filter(l => (l.page||1) === 1);
  const usable = first.filter(l => /[a-z]{2}/i.test(l.text) && l.text.length <= 80 && !PDF_GENERIC_TITLE.test(l.text.trim())
    && !/^(?:designed\s+by|design\s+by|pattern\s+by|by\s|©|copyright|www\.|https?:)/i.test(l.text.trim()));
  if(!usable.length) return null;
  const top = Math.max(...usable.map(l => l.size||0));
  const idx = first.indexOf(usable.find(l => (l.size||0) === top));
  // A title can wrap: take the next line too if it's the same size.
  let title = first[idx].text.trim();
  const next = first[idx+1];
  if(next && Math.abs((next.size||0) - top) < 0.6 && usable.includes(next) && !/\d/.test(next.text) && next.text.length <= 40) title += ' ' + next.text.trim();
  title = title.replace(/\s+/g, ' ').replace(/[\s:|\-]+$/, '');
  if(title.length < 2) return null;
  if(title === title.toUpperCase() && /[A-Z]{3}/.test(title)) title = title.toLowerCase().replace(/(^|[\s\-(/])([a-z])/g, (m,a,b) => a + b.toUpperCase());
  return title;
}
function patternDesignerFromText(text){
  // Keywords match any case; a name must be Capitalized (no 'i' flag).
  const ci = w => w.replace(/[a-z]/g, c => `[${c}${c.toUpperCase()}]`);
  const NAME = "([A-Z][\\w'.\\-]*(?:[ \\t]+(?:[A-Z][\\w'.\\-]*|de|van|von|der|la|le|du|di)){0,4})";
  const HANDLE = '@([A-Za-z0-9_.]{3,30})';
  const BY = `(?:${ci('designed')}|${ci('design')}|${ci('pattern')}|${ci('written')}|${ci('created')}|${ci('owned')})\\s+${ci('by')}\\s*:?\\s*`;
  // Most specific first; [regex, is a social handle]
  const tries = [
    [new RegExp(BY + NAME), false],
    [new RegExp(BY + HANDLE), true],
    [new RegExp(`${ci('designer')}\\s*:\\s*` + NAME), false],
    [new RegExp(`${ci('pattern creator')}\\s*[-:]\\s*` + NAME), false],
    [new RegExp(`(?:©|\\([cC]\\)|${ci('copyright')})\\s*(?:\\d{4}(?:\\s*-\\s*\\d{4})?\\s*,?\\s*)?(?:${ci('by')}\\s+)?` + NAME), false],
    [new RegExp(`^\\s*${ci('by')}\\s+` + NAME + '\\s*$', 'm'), false],
    [new RegExp(HANDLE + `\\s+${ci('on')}\\s+(?:${ci('instagram')}|IG\\b)`), true],
    [new RegExp(`${ci('tag me')}\\s+(?:${ci('on')}\\s+\\w+\\s+)?` + HANDLE), true]
  ];
  for(const [re, isHandle] of tries){
    const m = text.match(re);
    if(!m) continue;
    if(isHandle) return '@' + m[1].replace(/\.+$/, '');
    let name = m[1].split(/\.\s/)[0].replace(/\s+(?:All|ALL|Rights|Reserved|Designs?|DESIGNS?|Pattern|For|Photos?|Photography|Yarn|Published|Ltd|Inc|LLC)\b.*$/,'').replace(/[.,\s]+$/,'').trim();
    if(name.length < 2 || /^(?:The|This|All|Copyright|Gauge|Yarn|Using|Size|You|Your|Me)$/i.test(name)) continue;
    if(name === name.toUpperCase()) name = name.toLowerCase().replace(/(^|[\s\-'])([a-z])/g, (x,a,b) => a + b.toUpperCase());
    return name;
  }
  return null;
}
function patternCraftFromText(flat){
  const count = re => (flat.match(re) || []).length;
  const crochet = count(/\b(?:sc|hdc|dc|tr|sl st|ch-?\d*|ch-sp|sc2tog|dc2tog|crochet(?:ed)?|hook)\b/gi);
  const knit = count(/\b(?:k|p)\d+\b|\b(?:k2tog|p2tog|ssk|ssp|kfb|m1[lr]?|knit(?:ting|wise)?|purl(?:wise)?|(?<!(?:tapestry|yarn|darning|sewing|blunt) )needles?|cast on|bind off|co|bo|pm|sm|st st|stockinette|garter)\b/gi);
  if(crochet >= 3 && crochet >= knit * 2) return 'crochet';
  if(knit >= 3 && knit >= crochet * 2) return 'knit';
  return null;
}
function patternGaugeFromText(flat){
  // Each count needs its measurement close behind it ("18 sts and 24 rows =
  // 4 in", "5 ROWS = 3.5 cm") — a stray "5 dc" in prose isn't a gauge.
  const MEAS = /(\d{1,2}(?:\.\d+)?)\s*(?:"|''|in(?:c|ch|ches)?\b\.?|cm\b)/i;
  const measAfter = (win, at) => {
    const m = win.slice(at, at + 45).match(MEAS);
    if(!m) return null;
    const isCm = /cm/i.test(m[0]);
    const size = Number(m[1]);
    return size > 0 ? { unit: isCm ? 'cm' : 'in', k: (isCm ? 10 : 4) / size } : null;
  };
  const re = /\b(?:gauge|tension)\b/gi;
  let m;
  while((m = re.exec(flat))){
    const win = flat.slice(m.index, m.index + 320);
    // The first count with its own measurement wins; else the first count.
    const pickCount = re => {
      const all = [...win.matchAll(re)];
      const hit = all.find(h => measAfter(win, h.index + h[0].length)) || all[0] || null;
      return [hit, hit ? measAfter(win, hit.index + hit[0].length) : null];
    };
    const [sts, sm] = pickCount(/(\d{1,2}(?:\.\d+)?)\s*(?:sts|stitches|st|sc|hdc|dc|tr|v-?sts)\b/gi);
    const [rows, rm] = pickCount(/(\d{1,2}(?:\.\d+)?)\s*(?:rows|rnds|rounds|r)\b/gi);
    // "Gauge: 4"/10 cm = 18 sts and 24 rows" — the square comes first.
    const first = [sts, rows].filter(Boolean).sort((a,b) => a.index - b.index)[0];
    const before = first ? win.slice(Math.max(0, first.index - 30), first.index).match(new RegExp(MEAS.source + String.raw`[^\d]{0,12}$`, 'i')) : null;
    const shared = before ? { unit: /cm/i.test(before[0]) && !/"|in/i.test(before[0]) ? 'cm' : 'in', k: (/cm/i.test(before[0]) && !/"|in/i.test(before[0]) ? 10 : 4) / Number(before[1]) } : null;
    if(!sm && !rm && !shared) continue;
    const unit = (sm || rm || shared).unit;
    // Each count uses its own measurement (or a shared one stated first);
    // one in a different unit from the first is dropped.
    const fix = (hit, meas) => {
      const ms = meas || shared;
      if(!hit || !ms || ms.unit !== unit) return null;
      return Math.round(Number(hit[1]) * ms.k * 10) / 10;
    };
    const s = fix(sts, sm), r = fix(rows, rm);
    if(s == null && r == null) continue;
    if((s == null || (s >= 4 && s <= 60)) && (r == null || (r >= 2 && r <= 90))) return { sts: s, rows: r, unit };
  }
  return null;
}
function patternNeedleFromText(flat){
  const re = /\b(?:needles?|hook|dpns?|circulars?|crochet hook)\b/gi;
  const sizes = [];
  let m;
  while((m = re.exec(flat))){
    const start = Math.max(0, m.index - 70);
    const win = flat.slice(start, m.index + 110);
    const mmRe = /(\d{1,2}(?:[.,]\d{1,2})?)\s*mm\b/gi;
    let mm, any = false;
    while((mm = mmRe.exec(win))){
      const v = Number(mm[1].replace(',', '.'));
      if(v < 1.5 || v > 25) continue;
      if(/^\s*(?:larger|smaller|bigger|up|down|more|less)\b/i.test(win.slice(mm.index + mm[0].length))) continue;
      if(/\d\s*-\s*$/.test(win.slice(Math.max(0, mm.index - 3), mm.index))) continue;
      any = true;
      const near = win.slice(Math.max(0, mm.index - 22), mm.index + mm[0].length + 22);
      const us = near.match(/\bUS\s*(?:size\s*)?#?\s*(\d{1,2}(?:\.\d+)?)\b/i);
      const letter = near.match(/\b([B-SU])\s*[/-]\s*(\d{1,2}(?:\.\d+)?)(?![\d.])(?!\s*(?:oz|g\b|gr|yd|m\b|%))/);
      const label = `${v} mm` + (us ? ` / US ${us[1]}` : letter ? ` / ${letter[1]}-${letter[2]}` : '');
      if(!sizes.some(s => s.mm === v)) sizes.push({ mm: v, label });
      else if(label.includes('/')){ const s = sizes.find(s => s.mm === v); if(!s.label.includes('/')) s.label = label; }
    }
    if(!any){
      const us = win.match(/\bUS\s*(?:size\s*)?#?\s*(\d{1,2}(?:\.\d+)?)\b/i);
      if(us && !sizes.some(s => s.label === `US ${us[1]}`)) sizes.push({ mm: null, label: `US ${us[1]}` });
    }
  }
  return sizes.length ? sizes.slice(0, 3).map(s => s.label).join(', ') : null;
}
/* Yardage needed, in yards. Prefer a stated total ("approx 880 (960, 1040)
   yds" → the largest size); otherwise per-skein length × skein count. */
function patternYardageFromText(flat){
  const NUMS = String.raw`(\d[\d,.]*(?:\s*[([{/,;-]\s*\d[\d,.]*\s*[)\]}]?)*)`;
  const amountRe = new RegExp(NUMS + String.raw`\s*[)\]}]?\s*(yds?|yards?|m|meters?|metres?)\b\.?`, 'gi');
  const parseNums = s => s.split(/[\s([{/;)\]}-]+|,\s+|,(?!\d{3}\b)/).map(t => Number(t.replace(/,/g,''))).filter(n => n > 0);
  const found = [];
  let m;
  while((m = amountRe.exec(flat))){
    const nums = parseNums(m[1]);
    if(!nums.length) continue;
    const isYd = /^y/i.test(m[2]);
    const after = flat.slice(m.index + m[0].length, m.index + m[0].length + 30);
    const before = flat.slice(Math.max(0, m.index - 45), m.index);
    const perSkein = /^\s*(?:\/|per|in|=|-)?\s*(?:\d+\s*m\b\.?\s*)?(?:\/|per|in|=|-)?\s*(?:a\s+|each\s+|one\s+)?(?:\d+\s*(?:g|gr|grams?|oz)\b|skein|ball|hank|cake)/i.test(after)
      || /\d+\s*(?:g|gr|grams?|oz)\s*(?:\/|=|-|\()\s*$/i.test(before);
    const total = /(?:approx|approximately|about|total|you(?:'ll| will) need|requires?|yardage|amount)\W*(?:\w+\W+){0,3}$/i.test(before);
    found.push({ nums, isYd, perSkein, total, at: m.index });
  }
  const toYd = f => Math.round(Math.max(...f.nums) * (f.isYd ? 1 : YD_PER_M));
  const plausible = y => y >= 15 && y <= 15000;
  const pick = list => (list.find(f => f.isYd) || list[0]);
  const totals = found.filter(f => !f.perSkein && f.total);
  if(totals.length){ const y = toYd(pick(totals)); if(plausible(y)) return y; }
  const byGrams = patternYardageFromGrams(flat);
  if(byGrams && plausible(byGrams)) return byGrams;
  const skein = pick(found.filter(f => f.perSkein));
  if(skein){
    const per = skein.isYd ? Math.max(...skein.nums) : Math.max(...skein.nums) * YD_PER_M;
    const countRe = new RegExp(NUMS + String.raw`\s*[)\]}]?\s*(?:skeins?|balls?|hanks?|cakes?)\b`, 'gi');
    let c, best = 0;
    while((c = countRe.exec(flat))){
      const n = Math.max(...parseNums(c[1]));
      // Only a count stated near that yarn's length — not one from another yarn or page.
      if(n >= 1 && n <= 40 && Math.abs(c.index - skein.at) < 220) best = Math.max(best, n);
    }
    const byWeight = /\b(\d{1,2})\s*[x×]\s*\d+\s*(?:g|gr|grams?|oz)\b/gi;   // "2 x 50g balls"
    while((c = byWeight.exec(flat))) best = Math.max(best, Number(c[1]));
    if(best){ const y = Math.round(per * best); if(plausible(y)) return y; }
  }
  const rest = found.filter(f => !f.perSkein);
  if(rest.length){ const y = toYd(pick(rest)); if(plausible(y)) return y; }
  return null;
}
/* "I used approx. 200 g of cotton (200 g/600 m)" — weight used × the yarn's
   length per weight, summed over each yarn mentioned. Made-to-measure
   patterns often only give amounts this way. */
function patternYardageFromGrams(flat){
  const ratioRe = /(\d+(?:[.,]\d+)?)\s*(g|gr|grams?|oz)\s*\/\s*(\d[\d,]*(?:\.\d+)?)\s*(yds?|yards?|m|meters?|metres?)\b|(\d[\d,]*(?:\.\d+)?)\s*(yds?|yards?|m|meters?|metres?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*(g|gr|grams?|oz)\b/gi;
  const usedRe = /\b(?:used|use|need|needs|you'll need|you will need|requires?|approx\.?|approximately|about|around|~)\s*(?:approx\.?\s*|about\s*|~\s*)?(\d+(?:[.,]\d+)?)\s*(g|gr|grams?|oz)\b(?!\s*\/)/gi;
  const ratios = [];
  let m;
  while((m = ratioRe.exec(flat))){
    const w = Number((m[1]||m[7]).replace(',', '.')), wUnit = m[2]||m[8];
    const len = Number((m[3]||m[5]).replace(/,/g, '')), lUnit = m[4]||m[6];
    if(!w || !len) continue;
    const grams = /oz/i.test(wUnit) ? w * 28.35 : w;
    const yd = /^y/i.test(lUnit) ? len : len * YD_PER_M;
    ratios.push({ at: m.index, end: m.index + m[0].length, ydPerGram: yd / grams });
  }
  if(!ratios.length) return null;
  let total = 0;
  const usedRatios = new Set();
  while((m = usedRe.exec(flat))){
    const amt = Number(m[1].replace(',', '.'));
    const grams = /oz/i.test(m[2]) ? amt * 28.35 : amt;
    if(grams < 5 || grams > 5000) continue;
    // The yarn's ratio: the nearest one within a couple of sentences.
    const near = ratios.filter(r => !usedRatios.has(r) && Math.abs(r.at - m.index) < 260)
      .sort((a,b) => Math.abs(a.at - m.index) - Math.abs(b.at - m.index))[0];
    if(!near) continue;
    usedRatios.add(near);
    total += grams * near.ydPerGram;
  }
  return total ? Math.round(total) : null;
}
/* Sizes or versions, each with its own yardage ([{label, yardage}], yards),
   or null. Handles a line per size ("XS – 11 oz / 1,126 yd"), a size list
   with matching yardage list ("Sizes: XS (S, M)" + "880 (960, 1040) yds"),
   and versions in prose ("350 yards for the short sleeves, and 700 yards
   for the long sleeves"). */
const SIZE_LABEL = String.raw`(?:XXS|XS|XXL|XXXL|XL|[2-6]\s?XL?|[SML]|one size|small|medium|large|x-?large|\d{1,2}\s*-\s*\d{1,2}\s*(?:mo(?:nths?)?|yrs?|years?)|\d{1,2}\s*(?:mo(?:nths?)?|yrs?|years?))`;
function patternSizesFromText(L, flat, text){
  const AMT = String.raw`(\d[\d,]*(?:\.\d+)?)\s*(yds?|yards?|m|meters?|metres?)\b`;
  const toYd = (n, unit) => Math.round(Number(String(n).replace(/,(?=\d{3}\b)/g, '').replace(',', '.')) * (/^y/i.test(unit) ? 1 : YD_PER_M));
  const clean = l => l.replace(/\s+/g, ' ').replace(/^size\s+/i, '').trim().toUpperCase().replace(/^(\d)\s?X$/, '$1X').replace(/^ONE SIZE$/, 'One size');
  const ok = list => {
    const seen = new Set();
    const out = list.filter(s => s.yardage >= 15 && s.yardage <= 15000 && !seen.has(s.label) && seen.add(s.label));
    return out.length >= 2 ? out : null;
  };
  // 1. A line (or "; "-separated chunk) per size: label, separator, then a length.
  const rowRe = new RegExp(String.raw`^\s*(?:size\s+)?(${SIZE_LABEL})\s*(?:[-:=|)]|\s)\s*(.{0,40}?)` + AMT, 'i');
  const rows = [];
  for(const l of L){
    for(const chunk of l.text.replace(/[–—]/g, '-').split(/\s*[;|]\s*/)){
      const m = chunk.match(rowRe);
      if(!m) continue;
      // Prefer a yard figure later on the line ("312 g / 1,126 yd (1,030 m)")
      const yd = chunk.slice(m.index).match(/(\d[\d,]*(?:\.\d+)?)\s*(yds?|yards?)\b/i);
      rows.push({ label: clean(m[1]), yardage: yd ? toYd(yd[1], 'yd') : toYd(m[3], m[4]) });
    }
  }
  const byRow = ok(rows);
  if(byRow) return byRow;
  // 2. "Sizes: XS (S, M, L) [XL, 2XL]" with "880 (960, 1040, 1100) [1200, 1300] yds"
  const listRe = new RegExp(String.raw`\bsizes?\s*:?\s*((?:${SIZE_LABEL})(?:\s*[(\[{,/]\s*(?:${SIZE_LABEL})\s*[)\]}]?)+)`, 'i');
  const lm = flat.replace(/[–—]/g, '-').match(listRe);
  if(lm){
    const labels = lm[1].split(/\s*[(\[{,/)\]}]+\s*/).filter(Boolean).map(clean);
    const numsRe = /(\d[\d,.]*(?:\s*[(\[{,/;]\s*\d[\d,.]*\s*[)\]}]?)+)\s*[)\]}]?\s*(yds?|yards?|m|meters?|metres?)\b/gi;
    const lists = [];
    let m;
    while((m = numsRe.exec(flat))){
      const nums = m[1].split(/[\s(\[{/;)\]}]+|,\s+|,(?!\d{3}\b)/).map(t => t.replace(/,/g, '')).filter(t => +t > 0);
      if(nums.length === labels.length) lists.push({ nums, unit: m[2], at: m.index });
    }
    const yards = lists.filter(x => /^y/i.test(x.unit));
    const use = yards.length ? yards : lists;
    if(use.length){
      // Several colours (MC / CC) each with their own list: add them up per size.
      const colour = use.filter(x => /\b(?:MC|CC\d?|main colou?r|contrast(?:ing)? colou?r|colou?r\s*[A-Z1-9]|yarn\s*[A-Z1-9])\b[^\d]{0,30}$/i.test(flat.slice(Math.max(0, x.at - 40), x.at)));
      const chosen = colour.length >= 2 ? colour : [use[0]];
      const sized = ok(labels.map((label, i) => ({ label, yardage: chosen.reduce((sum, x) => sum + toYd(x.nums[i], x.unit), 0) })));
      if(sized) return sized;
    }
  }
  // 3. Versions in prose: "<length> … for the <version>"
  // Line breaks end a version name ("…for the long sleeves⏎Because…").
  const verRe = new RegExp(AMT + String.raw`[^.;]{0,70}?\bfor (?:the |a |my |your )?([a-z][a-z0-9 -]{2,28}?)(?=[ \t]*(?:[,.;)\n]|\band\b|\bor\b|$))`, 'gi');
  const versions = [];
  let v;
  while((v = verRe.exec(text))){
    const label = v[3].trim().replace(/\s+(?:version|option|style)$/i, '');
    if(/^(?:this|the pattern|this pattern|pattern|project|my project|reference|example|sample|swatch|gauge)/i.test(label)) continue;
    const prev = versions.find(x => x.label.toLowerCase() === label.toLowerCase());
    if(prev) continue;
    versions.push({ label: label[0].toUpperCase() + label.slice(1), yardage: toYd(v[1], v[2]) });
  }
  return ok(versions);
}
function patternYardageAndSizes(L, flat, text){
  const sizes = patternSizesFromText(L, flat, text || flat);
  // With sizes, the per-size amounts are the yardage; no single figure.
  return { sizes, yardage: sizes ? null : patternYardageFromText(flat) };
}
function patternWeightFromText(flat){
  const rules = [
    ['Super Bulky', /\bsuper[\s-]*(?:bulky|chunky)\b|\bjumbo\b|\broving\b/gi],
    ['Bulky', /\b(?<!super[\s-]*)(?:bulky|chunky)\b|\b(?:12|14)[\s-]*ply\b/gi],
    ['Worsted', /\b(?<!light[\s-]*)worsted\b|\baran\b|\b10[\s-]*ply\b/gi],
    ['DK', /\bdk\b|\bdouble knit(?:ting)?\b|\blight[\s-]*worsted\b|\b8[\s-]*ply\b/gi],
    ['Sport', /\bsport(?:[\s-]*weight)?\b|\b5[\s-]*ply\b/gi],
    ['Fingering', /\bfingering\b|\bsock[\s-]*(?:weight|yarn)\b|\b(?:3|4)[\s-]*ply\b/gi],
    ['Lace', /\blace[\s-]*weight\b|\b(?:lace|cobweb)[\s-]*yarn\b|\b(?:1|2)[\s-]*ply\b/gi]
  ];
  const CYC = ['Lace','Fingering','Sport','DK','Worsted','Bulky','Super Bulky','Super Bulky'];
  const scores = {};
  let firstAt = {};
  for(const [w, re] of rules){
    let m;
    while((m = re.exec(flat))){ scores[w] = (scores[w]||0) + 1; if(firstAt[w] == null) firstAt[w] = m.index; }
  }
  const cyc = flat.match(/\b(?:cyc|weight|category)\s*#?\s*\(?([0-7])\)?(?!\s*(?:mm|g|oz|ply|sts|rows|"|in|cm))/i) || flat.match(/#([0-7])\s*-?\s*(?:lace|super fine|fine|light|medium|bulky|super bulky|jumbo)\b/i);
  if(cyc){ const w = CYC[Number(cyc[1])]; scores[w] = (scores[w]||0) + 2; if(firstAt[w] == null) firstAt[w] = cyc.index; }
  const ranked = Object.keys(scores).sort((a,b) => (scores[b] - scores[a]) || (firstAt[a] - firstAt[b]));
  return ranked[0] || null;
}
function patternSkillFromText(text){
  const map = { 'beginner':'Beginner', 'basic':'Beginner', 'easy':'Easy', 'advanced beginner':'Easy', 'adventurous beginner':'Easy',
    'intermediate':'Intermediate', 'experienced':'Experienced', 'advanced':'Experienced', 'expert':'Experienced' };
  const WORD = '(advanced beginner|adventurous beginner|beginner|basic|easy|intermediate|experienced|advanced|expert)';
  const labelled = text.match(new RegExp('(?:skill(?:\\s*level)?|level|difficulty|experience)\\s*[:\\-]?\\s*' + WORD + '\\b', 'i'))
    || text.match(new RegExp('^\\s*' + WORD + '\\s*(?:level|pattern)?\\s*$', 'im'));
  return labelled ? map[labelled[1].toLowerCase()] : null;
}

/* =================================================================
   Pattern library. Each pattern keeps its details (designer, craft, yarn
   weight, yardage, hook/needle, gauge, skill, tags, status, notes), a
   source link, and any uploaded PDFs/images. Files go to Firebase Storage
   under patterns/{uid}/{patternId}/ — only their URLs live in the user's
   Firestore doc, which has a 1 MB limit. Uploads happen as files are
   picked (draft id reserved up front, like project photos); removals are
   deferred until save so Cancel never loses a file.
================================================================= */
const PATTERN_STATUSES = [['saved','Saved'],['queued','In my queue'],['made','Made it']];
const PATTERN_SKILLS = ['Beginner','Easy','Intermediate','Experienced'];
const PATTERN_FILE_MAX = 30 * 1024 * 1024;   // matches the Storage rule
let pendingPatternFiles = [];        // files currently on the form ({url,name,type,size})
let pendingPatternUploads = [];      // URLs uploaded during this form session
let pendingPatternRemovals = [];     // URLs removed during this form session
let pendingPatternCover = null;      // chosen cover URL, 'none', or null (= first available)
let pendingPatternSizes = [];        // [{label, yardage}] — yardage in canonical yards
let pendingProjectPatternId = null;  // pattern a new project was started from
let pendingProjectPatternSize = null; // chosen size/version of that pattern (label)

function patternStatusLabel(v){ const s = PATTERN_STATUSES.find(([k])=>k===v); return s ? s[1] : 'Saved'; }
function showPatternForm(id){
  if(!STATE.online){ wgToast("You're offline — view-only until you reconnect.", "error"); return; }
  cleanupOpenForms();
  STATE.tab = 'patterns';
  STATE.showPatternForm = true;
  STATE.editingPatternId = id || uid();
  const editing = id ? STATE.patterns.find(p=>p.id===id) : null;
  pendingPatternFiles = editing ? (editing.files||[]).map(f=>({ ...f })) : [];
  pendingPatternCover = editing ? (editing.coverUrl || null) : null;
  pendingPatternSizes = editing ? (editing.sizes||[]).map(x=>({ ...x })) : [];
  pendingPatternUploads = [];
  pendingPatternRemovals = [];
  render();
}
function hidePatternForm(){ cleanupOpenForms(); renderTab(); }
// Called from cleanupOpenForms: drop files uploaded for a form that's being
// discarded (they were never saved anywhere).
function discardPatternDraftFiles(){
  pendingPatternUploads.forEach(url => window.FB.deletePhoto(url));
  pendingPatternFiles = []; pendingPatternUploads = []; pendingPatternRemovals = []; pendingPatternCover = null; pendingPatternSizes = [];
}
function buildPatternFilesHTML(){
  if(!pendingPatternFiles.length) return '';
  return `<div class="scrap-chips mt-2">${pendingPatternFiles.map((f,i)=>`<span class="scrap-chip">
    <a href="${esc(f.url)}" target="_blank" rel="noopener" class="pattern-file-link">${patternFilePreview(f, resolvePatternCover(pendingPatternFiles, pendingPatternCover)) ? `<img class="pattern-file-thumb" src="${esc(patternFilePreview(f, resolvePatternCover(pendingPatternFiles, pendingPatternCover)))}" alt="" />` : /pdf/i.test(f.type||'')?'📄':'🖼️'} ${esc(f.name)}</a>
    ${/pdf/i.test(f.type||'') ? `<button type="button" onclick="rereadPatternFile(${i})" aria-label="Read details from this PDF again" title="Read details again">↻</button>` : ''}
    <button type="button" onclick="removePatternFile(${i})" aria-label="Remove file">✕</button></span>`).join('')}</div>`;
}
// Every image a file offers as a cover: an image file is its own; a PDF has
// the photos (and page 1) pulled out on upload.
function patternFilePreviews(f){
  if(!f) return [];
  if(f.previews && f.previews.length) return f.previews;
  if(f.thumbUrl) return [f.thumbUrl];
  return /^image\//i.test(f.type||'') ? [f.url] : [];
}
// Storage files belonging to one pattern file (the file plus its previews).
function patternFileStorageUrls(f){
  return [...new Set([f.url, f.thumbUrl, ...(f.previews||[])].filter(Boolean))];
}
/* The cover: the chosen image if it's still there, else the first one any
   file offers. 'none' means the person turned the cover off. */
function resolvePatternCover(files, chosen){
  if(chosen === 'none') return null;
  const all = (files||[]).flatMap(patternFilePreviews);
  return all.includes(chosen) ? chosen : (all[0] || null);
}
function patternCoverUrl(pat){ return resolvePatternCover(pat.files, pat.coverUrl); }
// The thumbnail a file shows in lists: the cover if it came from this file.
function patternFilePreview(f, cover){
  const list = patternFilePreviews(f);
  return cover && list.includes(cover) ? cover : (list[0] || null);
}
function buildPatternCoverPickerHTML(){
  const all = pendingPatternFiles.flatMap(patternFilePreviews);
  if(!all.length) return '';
  const current = resolvePatternCover(pendingPatternFiles, pendingPatternCover);
  return `<span class="note field-label" style="display:block; margin-top:10px;">Cover image</span>
    <div class="cover-picker" role="radiogroup" aria-label="Cover image">
      ${all.map((u,i)=>`<button type="button" role="radio" aria-checked="${u===current}" class="cover-option ${u===current?'selected':''}" onclick="pickPatternCover(${i})" aria-label="Use image ${i+1} as the cover"><img src="${esc(u)}" alt="" loading="lazy" /></button>`).join('')}
      <button type="button" role="radio" aria-checked="${!current}" class="cover-option cover-none ${!current?'selected':''}" onclick="pickPatternCover(-1)">No cover</button>
    </div>`;
}
function pickPatternCover(i){
  pendingPatternCover = i < 0 ? 'none' : (pendingPatternFiles.flatMap(patternFilePreviews)[i] || null);
  refreshPatternFiles();
}
function refreshPatternFiles(){
  const el = document.getElementById('patf-files');
  if(el) el.innerHTML = buildPatternFilesHTML() + buildPatternCoverPickerHTML();
}
function onPatternFileDrop(e){
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  uploadPatternFiles(e.dataTransfer && e.dataTransfer.files);
}
async function uploadPatternFiles(fileList){
  const files = [...(fileList||[])];
  if(!files.length || !STATE.user) return;
  const statusEl = document.getElementById('patf-upload-status');
  for(const file of files){
    const isPdf = /pdf/i.test(file.type||'') || /\.pdf$/i.test(file.name||'');
    if(!isPdf && !isAcceptableImageFile(file)){ wgToast(`${file.name}: only PDFs and images can be uploaded.`, 'error'); continue; }
    if(file.size > PATTERN_FILE_MAX){ wgToast(`${file.name} is over 30 MB.`, 'error'); continue; }
    if(statusEl) statusEl.textContent = `Uploading ${file.name}…`;
    try{
      // HEIC photos are converted so every browser can open them; other
      // images and PDFs upload untouched so pattern text stays sharp.
      const blob = isPdf ? file : await toRenderableImageBlob(file);
      const type = isPdf ? 'application/pdf' : (blob.type || file.type || 'image/jpeg');
      const ext = isPdf ? 'pdf' : (type.split('/')[1] || 'jpg').replace('jpeg','jpg');
      const safe = (file.name||'pattern').replace(/\.[^.]+$/,'').replace(/[^\w\- ]+/g,'').trim().slice(0,60) || 'pattern';
      // Read the PDF while it uploads; a failed read never blocks the upload.
      const reading = isPdf ? analyzePatternPdf(file).catch(err => { console.warn('PDF read failed', err); return null; }) : null;
      const fileId = uid().slice(0,8);
      const url = await window.FB.uploadPatternFile(STATE.user.uid, STATE.editingPatternId, blob, `${fileId}-${safe}.${ext}`, type);
      pendingPatternUploads.push(url);
      const entry = { url, name: file.name || `${safe}.${ext}`, type, size: blob.size||file.size||0 };
      if(reading){
        if(statusEl) statusEl.textContent = `Reading ${file.name}…`;
        const res = await reading;
        const previews = [];
        for(const [k, thumb] of ((res && res.thumbs) || []).entries()){
          try{
            const pu = await window.FB.uploadPatternFile(STATE.user.uid, STATE.editingPatternId, thumb, `${fileId}-${safe}-preview${k+1}.jpg`, 'image/jpeg');
            pendingPatternUploads.push(pu);
            previews.push(pu);
          }catch(err){ console.warn('PDF preview upload failed', err); }
        }
        if(previews.length){ entry.previews = previews; entry.thumbUrl = previews[0]; }
        if(res){ entry.parsedVersion = PDF_PARSER_VERSION; applyPdfFindings(res, file.name); }
      }
      pendingPatternFiles.push(entry);
    }catch(err){
      console.error('Pattern upload failed', err);
      wgToast(`Couldn't upload ${file.name} — try again.`, 'error');
    }
  }
  if(statusEl) statusEl.textContent = '';
  refreshPatternFiles();
}
/* Fill the form from what was found in a PDF — only fields still empty (craft
   only if it hasn't been picked), so nothing typed is ever overwritten.
   Filled fields are tinted until edited, and listed so they get a look. */
function applyPdfFindings(res, fileName){
  const f = res.found || {};
  const filled = [];
  const field = id => document.getElementById(id);
  const fill = (id, val, label) => {
    const el = field(id);
    if(!el || val == null || val === '' || String(el.value).trim() !== '') return false;
    el.value = val;
    el.classList.add('from-pdf');
    el.addEventListener('input', () => el.classList.remove('from-pdf'), { once:true });
    el.addEventListener('change', () => el.classList.remove('from-pdf'), { once:true });
    if(label) filled.push(label);
    return true;
  };
  fill('patf-name', f.name, 'name');
  fill('patf-designer', f.designer, 'designer');
  const craft = field('patf-craft');
  if(f.craft && craft && !craft.dataset.touched && craft.value !== f.craft){
    craft.value = f.craft; craft.dataset.touched = '1'; craft.classList.add('from-pdf'); filled.push('craft');
  }
  fill('patf-weight', f.weightCategory, 'yarn weight');
  fill('patf-yardage', f.yardage ? toDisplayLength(f.yardage) : null, 'yardage');
  if(f.sizes && f.sizes.length && !pendingPatternSizes.some(x => x.label || x.yardage)){
    pendingPatternSizes = f.sizes.map(x => ({ ...x }));
    refreshPatternSizes();
    filled.push(`yardage for ${f.sizes.length} sizes`);
  }
  fill('patf-needle', f.needleSize, 'hook/needle');
  fill('patf-skill', f.skillLevel, 'skill level');
  if(f.gauge && field('patf-gauge-sts') && !field('patf-gauge-sts').value && !field('patf-gauge-rows').value){
    const a = fill('patf-gauge-sts', f.gauge.sts), b = fill('patf-gauge-rows', f.gauge.rows);
    if(a || b){ field('patf-gauge-unit').value = f.gauge.unit === 'cm' ? 'cm' : 'in'; filled.push('gauge'); }
  }
  const note = field('patf-pdf-note');
  if(!note) return;
  if(filled.length) note.textContent = `Filled in from ${fileName}: ${filled.join(', ')} — give them a quick check.`;
  else if(!res.hasText) note.textContent = `${fileName} looks scanned (no text inside), so only a preview was made — add the details by hand.`;
  else note.textContent = `Nothing new to fill in from ${fileName}.`;
}
/* Sizes editor (pattern form). Inputs update state as you type; the list
   only re-renders when a row is added or removed, so focus isn't lost. */
function buildPatternSizesHTML(){
  return `<div class="size-rows">${pendingPatternSizes.map((x,i)=>`<div class="size-row">
      <input type="text" placeholder="Size" value="${esc(x.label||'')}" oninput="pendingPatternSizes[${i}].label=this.value" aria-label="Size or version name" />
      <input type="number" min="0" step="any" placeholder="${unitLabel()}" value="${x.yardage ? toDisplayLength(x.yardage) : ''}" oninput="pendingPatternSizes[${i}].yardage=this.value==='' ? null : Math.round(fromInputLength(this.value))" aria-label="Yardage for this size" />
      <button type="button" class="del-btn" onclick="removePatternSize(${i})" aria-label="Remove size">✕</button>
    </div>`).join('')}</div>
    <button type="button" class="btn btn-ghost btn-small mt-1" onclick="addPatternSize()">${ICONS.plus} Add size</button>`;
}
function refreshPatternSizes(){ const el = document.getElementById('patf-sizes'); if(el) el.innerHTML = buildPatternSizesHTML(); }
function addPatternSize(){ pendingPatternSizes.push({ label:'', yardage:null }); refreshPatternSizes(); }
function removePatternSize(i){ pendingPatternSizes.splice(i,1); refreshPatternSizes(); }
function cleanPatternSizes(list){
  return (list||[]).map(x => ({ label: String(x.label||'').trim(), yardage: Number(x.yardage)||null }))
    .filter(x => x.label && x.yardage > 0);
}
/* Re-read one already-uploaded PDF (e.g. after the reading rules improved)
   and fill whatever is still empty on the form. */
async function rereadPatternFile(i){
  const f = pendingPatternFiles[i];
  const statusEl = document.getElementById('patf-upload-status');
  if(!f) return;
  if(statusEl) statusEl.textContent = `Reading ${f.name}…`;
  try{
    const blob = await (await fetch(f.url)).blob();
    const res = await analyzePatternPdf(blob, { previews:false });
    f.parsedVersion = PDF_PARSER_VERSION;
    applyPdfFindings(res, f.name);
  }catch(err){
    console.warn('PDF re-read failed', err);
    wgToast(`Couldn't read ${f.name} again right now.`, 'error');
  }
  if(statusEl) statusEl.textContent = '';
}
function removePatternFile(i){
  const f = pendingPatternFiles[i];
  if(!f) return;
  pendingPatternFiles.splice(i,1);
  pendingPatternRemovals.push(...patternFileStorageUrls(f));
  refreshPatternFiles();
}
/* PDFs read by an older version of the rules get read again, once, in the
   background — only filling details that are still empty (sizes, yardage,
   designer, gauge, hook, weight, skill). Nothing already set is changed.
   Needs the browser to be allowed to download the file from Storage; if
   that fails, nothing is marked and it's tried again next visit. */
let pdfRefreshState = 'idle';   // idle | running | done
async function refreshPatternPdfReads(){
  if(pdfRefreshState !== 'idle' || !STATE.online || !STATE.user) return;
  const todo = [];
  STATE.patterns.forEach(p => (p.files||[]).forEach(f => {
    if(/pdf/i.test(f.type||'') && (f.parsedVersion||1) < PDF_PARSER_VERSION) todo.push({ patId: p.id, url: f.url });
  }));
  if(!todo.length){ pdfRefreshState = 'done'; return; }
  pdfRefreshState = 'running';
  let updated = 0, failed = 0;
  for(const t of todo){
    if(STATE.showPatternForm && STATE.editingPatternId === t.patId) continue;   // being edited — leave it
    let res;
    try{
      const blob = await (await fetch(t.url)).blob();
      res = await analyzePatternPdf(blob, { previews:false });
    }catch(err){ console.warn('PDF re-read failed', t.url, err); failed++; continue; }
    const pat = STATE.patterns.find(p => p.id === t.patId);
    if(!pat) continue;
    const merged = mergePdfFindings(pat, res.found);
    merged.files = (merged.files||[]).map(f => f.url === t.url ? { ...f, parsedVersion: PDF_PARSER_VERSION } : f);
    if(merged.changed) updated++;
    delete merged.changed;
    STATE.patterns = STATE.patterns.map(p => p.id === pat.id ? merged : p);
  }
  // Failures aren't marked, so they're retried on the next visit — not in a loop now.
  pdfRefreshState = 'done';
  if(failed < todo.length) await persist();
  if(updated){
    if(STATE.tab === 'patterns' && !STATE.showPatternForm) renderTab();
    wgToast(`Read ${updated} pattern PDF${updated===1?'':'s'} again — added sizes and yardage where they were missing.`, 'success');
  }
}
/* Pure: fill a pattern's empty details from PDF findings. Returns a new
   pattern with changed=true if anything was added. */
function mergePdfFindings(pat, found){
  const out = { ...pat };
  let changed = false;
  const f = found || {};
  if(f.sizes && f.sizes.length && !(pat.sizes||[]).length){ out.sizes = f.sizes.map(x=>({ ...x })); changed = true; }
  if(f.yardage && !pat.yardage && !(out.sizes||[]).length){ out.yardage = f.yardage; changed = true; }
  ['designer','needleSize','weightCategory','skillLevel'].forEach(k => {
    if(f[k] && !pat[k]){ out[k] = f[k]; changed = true; }
  });
  if(f.gauge && !(pat.gauge && (pat.gauge.sts || pat.gauge.rows))){ out.gauge = { ...f.gauge }; changed = true; }
  out.changed = changed;
  return out;
}
/* ---------- Bulk add patterns ----------
   Pick many PDFs/images at once. Each PDF is read in the browser first
   (nothing uploads until Save), files are grouped into patterns by their
   names — lookbooks, charts and updates join their pattern — and files
   already in the library are skipped. All rule-based. */
// Words that say what kind of file it is rather than which pattern.
const BULK_FILE_ROLE_WORDS = ['lookbook','look book','pattern','patterns','crochet','knit','knitting','pdf','chart','charts','colour update','color update','update','updated','english','eng','compressed','final','fast','link','links','printable','print'];
const BULK_SECONDARY_RE = /look ?book|chart|update|link|photos?\b|gallery/i;
// A file name reduced to the words naming the pattern:
// 'TheTesseraeJumperColourUpdate.pdf' and 'The_Tesserae_Jumper.pdf' → 'tesserae jumper'.
function patternFileKey(name){
  let s = String(name||'').replace(/(\.pdf)+$/i,'').replace(/\.(jpe?g|png|webp|gif|heic|heif)$/i,'');
  s = s.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g,'$1 $2');
  s = ' ' + s.toLowerCase().replace(/[_\-.+&,()\[\]]+/g,' ').replace(/[^a-z0-9 ]+/g,'') + ' ';
  s = s.replace(/v\d+(?= )/g,' ').replace(/ (ed|exp|version|vol) ?\d+(?= )/g,' ').replace(/ \d{1,2}(?= )/g,' ');
  BULK_FILE_ROLE_WORDS.forEach(w => { s = s.split(` ${w} `).join(' '); s = s.split(` ${w} `).join(' '); });
  s = s.replace(/ (the|a|an|and|by) /g,' ').replace(/ (the|a|an|and|by) /g,' ');
  return s.trim().replace(/\s+/g,' ');
}
// Two keys belong together when one's words start the other's ('venus' + 'venus full set').
function patternKeysMatch(a, b){
  if(!a || !b) return false;
  const x = a.split(' '), y = b.split(' ');
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.every((w,i) => long[i] === w);
}
function isSecondaryPatternFile(name){ return BULK_SECONDARY_RE.test(String(name||'').replace(/([a-z])([A-Z])/g,'$1 $2')); }
// A readable pattern name: the one read from the PDF when it fits the file
// name, else the file name tidied up.
function bulkPatternName(fileName, foundName){
  const key = patternFileKey(fileName);
  const words = new Set(key.split(' ').filter(w => w.length >= 3));
  let n = String(foundName||'').split(/ [-–|] /)[0].replace(/\b(look ?book|pdf|pattern)\b/gi,'').replace(/\s+/g,' ').trim();
  const fits = n && patternFileKey(n).split(' ').some(w => words.has(w));
  if(!fits) n = String(fileName||'').replace(/(\.pdf)+$/i,'').replace(/\.[a-z0-9]{2,4}$/i,'').replace(/([a-z])([A-Z])/g,'$1 $2')
    .replace(/[_]+/g,' ').replace(/\b(look ?book|crochet pattern|knitting pattern|pattern|v\d+)\b/gi,'').replace(/\s+/g,' ').trim();
  if(n && n === n.toUpperCase()) n = n.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
  return n.charAt(0).toUpperCase() + n.slice(1);
}
/* Group files into patterns. items: [{ name, size, foundName }].
   patterns: the library. Returns { groups: [{ name, existingId, items:[index…] }], duplicates:[index…] } —
   main pattern file first in each group. */
function groupPatternFiles(items, patterns){
  const known = (patterns||[]).map(p => ({ id:p.id, key:patternFileKey(p.name), files:(p.files||[]).map(f => ({ key:patternFileKey(f.name), size:f.size })) }));
  const duplicates = [], groups = [];
  const order = items.map((it,i) => ({ i, key: patternFileKey(it.name) })).sort((a,b) => a.key.split(' ').length - b.key.split(' ').length || a.i - b.i);
  for(const { i, key } of order){
    const it = items[i];
    if(known.some(p => p.files.some(f => f.size === it.size && f.key === key))){ duplicates.push(i); continue; }
    let g = groups.find(g => patternKeysMatch(g.key, key));
    if(!g){
      const ex = key && known.find(p => p.key === key || (patternKeysMatch(p.key, key) && p.key.split(' ').length >= 2) || p.files.some(f => f.key === key));
      g = { key, existingId: ex ? ex.id : null, items: [] };
      groups.push(g);
    }
    g.items.push(i);
  }
  groups.forEach(g => {
    g.items.sort((a,b) => isSecondaryPatternFile(items[a].name) - isSecondaryPatternFile(items[b].name) || a - b);
    const main = items[g.items[0]];
    g.name = bulkPatternName(main.name, main.foundName);
  });
  return { groups: groups.map(({ name, existingId, items }) => ({ name, existingId, items })), duplicates: duplicates.sort((a,b)=>a-b) };
}
// Details from several files of one pattern: the first file's win, later ones fill gaps.
function mergeFoundDetails(list){
  let out = { sizes: [], yardage: null, gauge: null };
  let craft = null;
  for(const f of list){
    if(!f) continue;
    out = mergePdfFindings(out, f);
    if(!craft && f.craft) craft = f.craft;
  }
  delete out.changed;
  out.craft = craft;
  return out;
}

let bulkPatterns = null;   // { phase:'reading'|'review'|'saving', items, groups, duplicates, done, total }
function startBulkPatternImport(fileList){
  const files = [...(fileList||[])];
  if(!files.length || !STATE.user) return;
  if(!STATE.online){ wgToast("You're offline — view-only until you reconnect.", "error"); return; }
  cleanupOpenForms();
  const items = [];
  for(const file of files){
    const isPdf = /pdf/i.test(file.type||'') || /\.pdf$/i.test(file.name||'');
    if(!isPdf && !isAcceptableImageFile(file)){ wgToast(`${file.name}: only PDFs and images can be added.`, 'error'); continue; }
    items.push({ file, name: file.name || 'pattern', size: file.size || 0, isPdf, over: file.size > PATTERN_FILE_MAX, res: null });
  }
  if(!items.length) return;
  bulkPatterns = { phase:'reading', items, groups:[], duplicates:[], done:0, total:items.length };
  renderTab();
  readBulkPatternFiles();
}
async function readBulkPatternFiles(){
  const b = bulkPatterns;
  for(const it of b.items){
    if(bulkPatterns !== b) return;   // cancelled
    if(it.isPdf) it.res = await analyzePatternPdf(it.file).catch(err => { console.warn('PDF read failed', err); return null; });
    it.foundName = it.res && it.res.found ? it.res.found.name : null;
    b.done++;
    const el = document.getElementById('bulk-pat-progress');
    if(el) el.textContent = `Reading ${b.done} of ${b.total}…`;
  }
  if(bulkPatterns !== b) return;
  const { groups, duplicates } = groupPatternFiles(b.items, STATE.patterns);
  b.groups = groups.map(g => ({ ...g, id: uid().slice(0,8), include: true }));
  b.duplicates = duplicates;
  b.phase = 'review';
  renderTab();
}
function cancelBulkPatterns(){ bulkPatterns = null; renderTab(); }
// Move a file to another group, or to a pattern of its own ('new').
function bulkMoveItem(i, target){
  const b = bulkPatterns; if(!b) return;
  b.groups.forEach(g => { g.items = g.items.filter(x => x !== i); });
  b.duplicates = b.duplicates.filter(x => x !== i);
  if(target === 'skip') b.duplicates.push(i);
  else if(target === 'new'){
    const it = b.items[i];
    b.groups.push({ id: uid().slice(0,8), name: bulkPatternName(it.name, it.foundName), existingId: null, items: [i], include: true });
  } else {
    const g = b.groups.find(g => g.id === target);
    if(g) g.items.push(i);
  }
  b.groups = b.groups.filter(g => g.items.length);
  renderTab();
}
function renderBulkPatterns(){
  const b = bulkPatterns;
  if(b.phase === 'reading' || b.phase === 'saving'){
    return `<div class="card mb-4"><p><strong>${b.phase === 'reading' ? 'Reading your files' : 'Saving patterns'}</strong></p>
      <p class="note" id="bulk-pat-progress">${b.phase === 'reading' ? `Reading ${b.done} of ${b.total}…` : `Uploading ${b.done} of ${b.total}…`}</p>
      ${b.phase === 'reading' ? `<button class="btn btn-ghost btn-small mt-2" onclick="cancelBulkPatterns()">Cancel</button>` : ''}</div>`;
  }
  const options = (i, current) => [
    ...b.groups.map(g => `<option value="${g.id}" ${g.id===current?'selected':''}>${esc(g.existingId ? (STATE.patterns.find(p=>p.id===g.existingId)||{}).name : g.name)}</option>`),
    `<option value="new">New pattern</option>`, `<option value="skip" ${current==='skip'?'selected':''}>Don't add</option>`].join('');
  const fileRow = (i, groupId) => { const it = b.items[i]; return `<div class="bulk-file-row">
      <span class="bulk-file-name">${it.isPdf?'📄':'🖼️'} ${esc(it.name)}${it.over ? ` <span class="note">— over ${Math.round(PATTERN_FILE_MAX/1048576)} MB, only details and preview images are kept</span>` : ''}${it.isPdf && it.res && !it.res.hasText ? ` <span class="note">— scanned, preview only</span>` : ''}</span>
      <select onchange="bulkMoveItem(${i}, this.value)" aria-label="Which pattern this file belongs to">${options(i, groupId)}</select></div>`; };
  const included = b.groups.filter(g => g.include);
  return `<div class="card mb-4">
    <p><strong>Add ${b.items.length} file${b.items.length===1?'':'s'}</strong></p>
    <p class="note">Files are grouped by name: lookbooks, charts and updates join their pattern. Check the names, move any file that landed in the wrong place, then save. Details read from each PDF fill in automatically — give them a look afterwards.</p>
    ${b.groups.map(g => { const ex = g.existingId && STATE.patterns.find(p=>p.id===g.existingId); return `<div class="bulk-group${g.include?'':' bulk-off'}">
      <label class="bulk-group-head"><input type="checkbox" ${g.include?'checked':''} onchange="bulkPatterns.groups.find(x=>x.id==='${g.id}').include=this.checked; renderTab();" aria-label="Add this pattern" />
        ${ex ? `<span>Add to <strong>${esc(ex.name)}</strong> <span class="note">(already in your library)</span></span>`
             : `<input type="text" value="${esc(g.name)}" oninput="bulkPatterns.groups.find(x=>x.id==='${g.id}').name=this.value" aria-label="Pattern name" />`}
      </label>
      ${g.items.map(i => fileRow(i, g.id)).join('')}
    </div>`; }).join('')}
    ${b.duplicates.length ? `<details class="mt-2"><summary class="note">${b.duplicates.length} file${b.duplicates.length===1?' is':'s are'} already in your library or left out</summary>${b.duplicates.map(i => fileRow(i, 'skip')).join('')}</details>` : ''}
    <div class="row-between mt-3">
      <button class="btn btn-ghost" onclick="cancelBulkPatterns()">Cancel</button>
      <button class="btn btn-primary" onclick="saveBulkPatterns()" ${included.length?'':'disabled'}>Save ${included.length} pattern${included.length===1?'':'s'}</button>
    </div>
  </div>`;
}
async function saveBulkPatterns(){
  const b = bulkPatterns; if(!b || b.phase !== 'review') return;
  const groups = b.groups.filter(g => g.include && g.items.length && (g.existingId || String(g.name||'').trim()));
  if(!groups.length) return;
  b.phase = 'saving'; b.done = 0; b.total = groups.reduce((n,g) => n + g.items.length, 0);
  renderTab();
  const progress = () => { const el = document.getElementById('bulk-pat-progress'); if(el) el.textContent = `Uploading ${b.done} of ${b.total}…`; };
  let failed = 0, added = 0, updated = 0;
  for(const g of groups){
    const existing = g.existingId && STATE.patterns.find(p=>p.id===g.existingId);
    const patId = existing ? existing.id : uid();
    const files = [];
    for(const i of g.items){
      const it = b.items[i];
      try{
        const safe = it.name.replace(/\.[^.]+$/,'').replace(/[^\w\- ]+/g,'').trim().slice(0,60) || 'pattern';
        const fileId = uid().slice(0,8);
        const previews = [];
        for(const [k, thumb] of ((it.res && it.res.thumbs) || []).entries()){
          try{ previews.push(await window.FB.uploadPatternFile(STATE.user.uid, patId, thumb, `${fileId}-${safe}-preview${k+1}.jpg`, 'image/jpeg')); }
          catch(err){ console.warn('PDF preview upload failed', err); }
        }
        if(it.over){
          // Too big to store: keep its preview images (details are kept below).
          previews.forEach((url, k) => files.push({ url, name: `${safe} preview ${k+1}.jpg`, type: 'image/jpeg', size: (it.res.thumbs[k] && it.res.thumbs[k].size) || 0 }));
          if(!previews.length) failed++;
        } else if(it.isPdf){
          const url = await window.FB.uploadPatternFile(STATE.user.uid, patId, it.file, `${fileId}-${safe}.pdf`, 'application/pdf');
          const entry = { url, name: it.name, type: 'application/pdf', size: it.size };
          if(previews.length){ entry.previews = previews; entry.thumbUrl = previews[0]; }
          if(it.res) entry.parsedVersion = PDF_PARSER_VERSION;
          files.push(entry);
        } else {
          const blob = await toRenderableImageBlob(it.file);
          const type = blob.type || it.file.type || 'image/jpeg';
          const ext = (type.split('/')[1] || 'jpg').replace('jpeg','jpg');
          const url = await window.FB.uploadPatternFile(STATE.user.uid, patId, blob, `${fileId}-${safe}.${ext}`, type);
          files.push({ url, name: it.name, type, size: blob.size || it.size });
        }
      }catch(err){ console.error('Bulk pattern upload failed', err); failed++; }
      b.done++; progress();
    }
    if(!files.length) continue;
    const found = mergeFoundDetails(g.items.map(i => b.items[i].res && b.items[i].res.found));
    const now = new Date().toISOString();
    if(existing){
      const merged = mergePdfFindings(existing, found); delete merged.changed;
      STATE.patterns = STATE.patterns.map(p => p.id === existing.id ? { ...merged, files: [...(existing.files||[]), ...files], updatedAt: now } : p);
      updated++;
    } else {
      const sizes = cleanPatternSizes(found.sizes);
      STATE.patterns.push({ id: patId, name: String(g.name).trim(), designer: found.designer || null, craft: found.craft || 'knit', status: 'saved',
        sourceUrl: null, weightCategory: found.weightCategory || null, yardage: sizes.length ? null : (found.yardage || null),
        needleSize: found.needleSize || null, skillLevel: found.skillLevel || null, gauge: found.gauge || null, tags: [], notes: null,
        files, sizes, coverUrl: null, updatedAt: now, createdAt: todayStr() });
      added++;
    }
  }
  bulkPatterns = null;
  await persist();
  renderTab();
  const parts = [added && `${added} pattern${added===1?'':'s'} added`, updated && `${updated} updated`].filter(Boolean).join(', ');
  wgToast(failed ? `${parts || 'Nothing saved'} — ${failed} file${failed===1?'':'s'} couldn't upload.` : `${parts}. Give the details a quick check.`, failed ? 'error' : undefined);
}
function renderPatternForm(){
  const editing = STATE.patterns.find(p=>p.id===STATE.editingPatternId) || null;
  const v = (field, fallback='') => editing ? esc(editing[field] ?? fallback) : fallback;
  const g = (editing && editing.gauge) || {};
  const inner = `
  <form class="card form-grid" onsubmit="handleSavePattern(event)" style="margin-bottom:22px;">
    <label class="field">Pattern name
      <input id="patf-name" required placeholder="Gardenia Shawl" value="${v('name')}" />
    </label>
    <label class="field">Designer (optional)
      <input id="patf-designer" value="${v('designer')}" />
    </label>
    <label class="field">Craft
      <select id="patf-craft" onchange="this.dataset.touched='1'">${[['knit','Knit'],['crochet','Crochet'],['other','Other']].map(([k,l])=>`<option value="${k}" ${(editing?editing.craft:'knit')===k?'selected':''}>${l}</option>`).join('')}</select>
    </label>
    <label class="field">Status
      <select id="patf-status">${PATTERN_STATUSES.map(([k,l])=>`<option value="${k}" ${(editing?editing.status:'saved')===k?'selected':''}>${l}</option>`).join('')}</select>
    </label>
    <div class="field span2">
      <span class="note field-label">Pattern files (PDFs or images, up to 30 MB each — private to you). Adding a PDF makes a preview and fills in any empty details it can find.</span>
      <label class="photo-dropzone" style="max-width:none;" ondragover="event.preventDefault(); this.classList.add('dragover');" ondragleave="this.classList.remove('dragover');" ondrop="onPatternFileDrop(event)">
        <span class="note">${ICONS.upload} Drop files here or tap to choose</span>
        <input type="file" accept="application/pdf,.pdf,image/*,.heic,.heif" multiple style="display:none;" onchange="uploadPatternFiles(this.files); this.value='';" />
      </label>
      <span id="patf-upload-status" class="note" style="font-size:0.75rem;"></span>
      <span id="patf-pdf-note" class="note" style="font-size:0.75rem; display:block;" aria-live="polite"></span>
      <div id="patf-files">${buildPatternFilesHTML() + buildPatternCoverPickerHTML()}</div>
    </div>
    <label class="field span2">Source link (optional)
      <input id="patf-url" type="url" placeholder="https://www.ravelry.com/patterns/library/…" value="${v('sourceUrl')}" />
    </label>
    <label class="field">Yarn weight (optional)
      <select id="patf-weight"><option value="">—</option>${WEIGHTS.map(w=>`<option value="${w}" ${editing&&editing.weightCategory===w?'selected':''}>${esc(weightLabel(w))}</option>`).join('')}</select>
    </label>
    <label class="field">Yardage needed (${unitLabel()}, optional)
      <input id="patf-yardage" type="number" min="0" step="any" placeholder="If one size" value="${editing && editing.yardage ? toDisplayLength(editing.yardage) : ''}" />
    </label>
    <div class="field span2">
      <span class="note field-label">Sizes or versions (optional) — yardage for each, in ${unitLabel()}. When listed, these are used instead of the single yardage.</span>
      <div id="patf-sizes">${buildPatternSizesHTML()}</div>
    </div>
    <label class="field">Hook / needle size (optional)
      <input id="patf-needle" placeholder="e.g. 4.5 mm / US 7" value="${v('needleSize')}" />
    </label>
    <label class="field">Skill level (optional)
      <select id="patf-skill"><option value="">—</option>${PATTERN_SKILLS.map(s=>`<option ${editing&&editing.skillLevel===s?'selected':''}>${s}</option>`).join('')}</select>
    </label>
    <div class="field span2">
      <span class="note" style="display:block; margin-bottom:4px;">Gauge the pattern calls for (optional)</span>
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; font-size:0.8rem; color:var(--ink-soft);">
        <input id="patf-gauge-sts" type="number" min="0" step="any" placeholder="18" style="width:60px;" value="${esc(g.sts??'')}" /> sts ×
        <input id="patf-gauge-rows" type="number" min="0" step="any" placeholder="24" style="width:60px;" value="${esc(g.rows??'')}" /> rows per
        <select id="patf-gauge-unit">
          <option value="in" ${g.unit==='cm'?'':'selected'}>4 in</option>
          <option value="cm" ${g.unit==='cm'?'selected':''}>10 cm</option>
        </select>
      </div>
    </div>
    <label class="field span2">Tags (optional, comma-separated)
      <input id="patf-tags" placeholder="sweater, top-down, gift" value="${editing ? esc((editing.tags||[]).join(', ')) : ''}" />
    </label>
    <label class="field span2">Notes (optional)
      <textarea id="patf-notes" rows="3" placeholder="Sizes, modifications, errata…">${v('notes')}</textarea>
    </label>
    <div class="span2 form-actions-inline row-end">
      <button type="button" class="btn btn-ghost" onclick="hidePatternForm()">Cancel</button>
      <button type="submit" class="btn btn-primary">${editing ? 'Save changes' : 'Add pattern'}</button>
    </div>
  </form>`;
  return wrapFormForMobile(inner, editing ? 'Edit pattern' : 'Add pattern', 'submitPatternForm()', 'hidePatternForm()');
}
function submitPatternForm(){
  const f = document.querySelector('#inner-tab-content form, .fullscreen-form form');
  if(f) f.requestSubmit ? f.requestSubmit() : f.querySelector('[type=submit]').click();
}
function handleSavePattern(e){
  if(e) e.preventDefault();
  const name = document.getElementById('patf-name').value.trim();
  if(!name) return;
  const existing = STATE.patterns.find(p=>p.id===STATE.editingPatternId);
  const gs = document.getElementById('patf-gauge-sts').value, gr = document.getElementById('patf-gauge-rows').value;
  const yd = document.getElementById('patf-yardage').value;
  const fields = {
    name,
    designer: document.getElementById('patf-designer').value.trim() || null,
    craft: document.getElementById('patf-craft').value,
    status: document.getElementById('patf-status').value || 'saved',
    sourceUrl: document.getElementById('patf-url').value.trim() || null,
    weightCategory: document.getElementById('patf-weight').value || null,
    yardage: yd==='' ? null : Math.round(fromInputLength(yd)),
    needleSize: document.getElementById('patf-needle').value.trim() || null,
    skillLevel: document.getElementById('patf-skill').value || null,
    gauge: (gs==='' && gr==='') ? null : { sts: gs===''?null:Number(gs), rows: gr===''?null:Number(gr), unit: document.getElementById('patf-gauge-unit').value },
    tags: document.getElementById('patf-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    notes: document.getElementById('patf-notes').value.trim() || null,
    files: pendingPatternFiles.map(f=>({ ...f })),
    sizes: cleanPatternSizes(pendingPatternSizes),
    coverUrl: pendingPatternCover === 'none' ? 'none' : (resolvePatternCover(pendingPatternFiles, pendingPatternCover) || null),
    updatedAt: new Date().toISOString()
  };
  if(existing){
    STATE.patterns = STATE.patterns.map(p => p.id===existing.id ? { ...p, ...fields } : p);
  } else {
    STATE.patterns.push({ id: STATE.editingPatternId, ...fields, createdAt: todayStr() });
  }
  // Files removed on the form are only deleted now that the change is saved.
  pendingPatternRemovals.forEach(url => window.FB.deletePhoto(url));
  pendingPatternFiles = []; pendingPatternUploads = []; pendingPatternRemovals = []; pendingPatternCover = null; pendingPatternSizes = [];
  persist();
  STATE.showPatternForm = false;
  STATE.editingPatternId = null;
  renderTab();
  scrollToTop();
}
async function deletePattern(id){
  const pat = STATE.patterns.find(p=>p.id===id);
  if(!pat) return;
  if(!(await wgConfirm(`Delete "${pat.name}" and its uploaded files? This cannot be undone.`, {title:'Delete pattern', okLabel:'Delete', danger:true}))) return;
  (pat.files||[]).forEach(f => patternFileStorageUrls(f).forEach(u => window.FB.deletePhoto(u)));
  STATE.patterns = STATE.patterns.filter(p=>p.id!==id);
  STATE.projects = STATE.projects.map(p => p.patternId===id ? { ...p, patternId:null } : p);
  persist();
  renderTab();
}
function updatePatternStatus(id, status){
  STATE.patterns = STATE.patterns.map(p => p.id===id ? { ...p, status, updatedAt:new Date().toISOString() } : p);
  persist();
}
/* Yardage a pattern needs: its sizes' smallest–largest, or the single figure. */
function patternYardageRange(pat){
  const ys = (pat.sizes||[]).map(x=>Number(x.yardage)).filter(n=>n>0);
  if(ys.length) return { min: Math.min(...ys), max: Math.max(...ys), count: ys.length };
  return pat.yardage ? { min: pat.yardage, max: pat.yardage, count: 0 } : null;
}
function formatYardageRange(r){
  const f = n => toDisplayLength(n).toLocaleString();
  return r.min === r.max ? `${f(r.min)} ${unitLabel()}` : `${f(r.min)}–${f(r.max)} ${unitLabel()}`;
}
/* Pure: which sizes a given length covers → "XS–L", "XS", or null. Sizes
   are taken in order of yardage, so this is the run from the smallest. */
function patternSizesCovered(sizes, have){
  const sorted = (sizes||[]).filter(x=>x.yardage>0).slice().sort((a,b)=>a.yardage-b.yardage);
  const ok = sorted.filter(x => x.yardage <= have);
  if(!ok.length) return null;
  return ok.length === 1 ? ok[0].label : `${ok[0].label}–${ok[ok.length-1].label}`;
}
/* Stash check: which single stash yarns of the pattern's weight have enough
   length on their own (for sized patterns, enough for at least the
   smallest size). */
function patternStashMatches(pat){
  const r = patternYardageRange(pat);
  if(!pat.weightCategory || !r) return null;
  const same = STATE.yarns.filter(y=>y.weightCategory===pat.weightCategory && (Number(y.yardageRemaining)||0)>0);
  const enough = same.filter(y=>(Number(y.yardageRemaining)||0) >= r.min)
    .sort((a,b)=>(Number(b.yardageRemaining)||0)-(Number(a.yardageRemaining)||0));
  const best = same.slice().sort((a,b)=>(Number(b.yardageRemaining)||0)-(Number(a.yardageRemaining)||0))[0] || null;
  return { enough, best, sameCount: same.length, need: r.min, sized: r.count > 0 };
}
function renderPatternStashLine(pat){
  const m = patternStashMatches(pat);
  if(!m) return '';
  if(m.enough.length){
    return `<details class="note pattern-stash"><summary class="ok-text">🧶 ${m.enough.length} stash yarn${m.enough.length===1?' has':'s have'} enough${m.sized ? ' for some sizes' : ''}</summary>
      <div class="scrap-chips mt-1">${m.enough.slice(0,8).map(y=>{
        const covers = m.sized ? patternSizesCovered(pat.sizes, Number(y.yardageRemaining)||0) : null;
        return `<span class="scrap-chip"><span class="dot" style="background:${y.colorHex}; width:9px; height:9px; border-radius:50%; display:inline-block;"></span> ${esc(yarnDisplayName(y))} (${toDisplayLength(y.yardageRemaining)} ${unitLabel()}${covers ? ` · ${esc(covers)}` : ''})&nbsp;</span>`;
      }).join('')}</div>
    </details>`;
  }
  if(m.best) return `<p class="note pattern-stash no-margin">🧶 No single ${esc(pat.weightCategory)} yarn has ${toDisplayLength(m.need)} ${unitLabel()}${m.sized ? ' (smallest size)' : ''} — most is ${esc(yarnDisplayName(m.best))} (${toDisplayLength(m.best.yardageRemaining)} ${unitLabel()})</p>`;
  return `<p class="note pattern-stash no-margin">🧶 No ${esc(pat.weightCategory)} yarn in your stash yet</p>`;
}
/* Start a project from a pattern: open the project form with that pattern
   picked from the library (see pickProjectPattern). */
function startProjectFromPattern(id){
  const pat = STATE.patterns.find(p=>p.id===id);
  if(!pat) return;
  cleanupOpenForms();
  STATE.tab = 'projects';
  showProjectForm();
  render();
  const pick = document.getElementById('pf-pattern-pick');
  if(pick) pick.value = pat.id;
  pickProjectPattern(pat.id);
}
/* Project form: choose the pattern from the library, grouped by pattern
   status (queued first, since that's what you're likely starting). */
function buildProjectPatternPicker(){
  if(!STATE.patterns.length) return '';
  const groups = [['queued','In my queue'],['saved','Saved'],['made','Made it']];
  const byName = (a,b) => a.name.localeCompare(b.name);
  const opt = p => `<option value="${p.id}" ${pendingProjectPatternId===p.id?'selected':''}>${esc(p.name)}${p.designer ? ` — ${esc(p.designer)}` : ''}</option>`;
  return `<select id="pf-pattern-pick" onchange="pickProjectPattern(this.value)" aria-label="Choose from my patterns">
    <option value="">Choose from my patterns…</option>
    ${groups.map(([k,l]) => {
      const list = STATE.patterns.filter(p => (p.status||'saved')===k).sort(byName);
      return list.length ? `<optgroup label="${l}">${list.map(opt).join('')}</optgroup>` : '';
    }).join('')}
  </select>`;
}
/* Link the project to a library pattern and fill in what it knows: the
   pattern name, plus project name, hook/needle and gauge where those are
   still empty — nothing typed is overwritten. The pattern's source link is
   added too. Switching patterns swaps out what the previous pick filled. */
function pickProjectPattern(id){
  const el = elId => document.getElementById(elId);
  const prev = STATE.patterns.find(p=>p.id===pendingProjectPatternId);
  const pat = STATE.patterns.find(p=>p.id===id) || null;
  pendingProjectPatternId = pat ? pat.id : null;
  if(!pat || !(pat.sizes||[]).some(x => x.label === pendingProjectPatternSize)) pendingProjectPatternSize = null;
  if(prev){
    pendingProjectLinks = pendingProjectLinks.filter(l => l.fromPattern !== prev.id);
    ['pf-pattern','pf-name'].forEach(f => { if(el(f) && el(f).value.trim() === prev.name) el(f).value = ''; });
    if(el('pf-needlesize') && prev.needleSize && el('pf-needlesize').value.trim() === prev.needleSize) el('pf-needlesize').value = '';
    const g = prev.gauge;
    if(g && el('pf-gauge-sts') && el('pf-gauge-sts').value === String(g.sts ?? '') && el('pf-gauge-rows').value === String(g.rows ?? '')){
      el('pf-gauge-sts').value = ''; el('pf-gauge-rows').value = '';
    }
  }
  if(pat){
    const fillIfEmpty = (f, val) => { const e = el(f); if(e && val != null && val !== '' && !String(e.value).trim()) e.value = val; };
    if(el('pf-pattern')) el('pf-pattern').value = pat.name;
    fillIfEmpty('pf-name', pat.name);
    fillIfEmpty('pf-needlesize', pat.needleSize);
    if(pat.gauge && el('pf-gauge-sts') && !el('pf-gauge-sts').value && !el('pf-gauge-rows').value){
      fillIfEmpty('pf-gauge-sts', pat.gauge.sts);
      fillIfEmpty('pf-gauge-rows', pat.gauge.rows);
      el('pf-gauge-unit').value = pat.gauge.unit === 'cm' ? 'cm' : 'in';
    }
    if(pat.sourceUrl && !pendingProjectLinks.some(l => l.url === pat.sourceUrl))
      pendingProjectLinks.push({ id: uid(), url: pat.sourceUrl, type:'link', title: pat.name, thumbnail:null, fromPattern: pat.id });
  }
  renderLinkPreviews();
  refreshProjectPatternSize();
}
/* Size/version of the linked pattern this project is made in, and the
   yardage the pattern calls for in it. */
function buildProjectPatternSizeHTML(){
  const pat = STATE.patterns.find(p=>p.id===pendingProjectPatternId);
  const sizes = (pat && pat.sizes) || [];
  if(!sizes.length) return '';
  const chosen = sizes.find(x => x.label === pendingProjectPatternSize);
  return `<select id="pf-pattern-size-pick" onchange="pickProjectPatternSize(this.value)" aria-label="Pattern size" style="margin-top:6px;">
      <option value="">Which size are you making?</option>
      ${sizes.map(x=>`<option value="${esc(x.label)}" ${chosen===x?'selected':''}>${esc(x.label)} — ${toDisplayLength(x.yardage).toLocaleString()} ${unitLabel()}</option>`).join('')}
    </select>
    ${chosen ? `<span class="note" style="font-size:0.75rem; display:block; margin-top:4px;">Pattern calls for ${toDisplayLength(chosen.yardage).toLocaleString()} ${unitLabel()} in ${esc(chosen.label)}${pendingProjectYarnIds.length===1 ? " — saved as your yarn's need if it has none yet" : ''}.</span>` : ''}`;
}
function refreshProjectPatternSize(){ const el = document.getElementById('pf-pattern-size'); if(el) el.innerHTML = buildProjectPatternSizeHTML(); }
function pickProjectPatternSize(label){ pendingProjectPatternSize = label || null; refreshProjectPatternSize(); }
/* Load the pattern's gauge into the calculator as the target to compare to. */
function patternToGauge(id){
  const pat = STATE.patterns.find(p=>p.id===id);
  if(!pat) return;
  const g = STATE.gauge;
  if(pat.craft==='knit' || pat.craft==='crochet') g.craft = pat.craft;
  if(pat.needleSize) g.needleSize = pat.needleSize;
  if(pat.gauge){
    gaugeSetUnit(pat.gauge.unit==='cm' ? 'cm' : 'in');
    g.targetSts = pat.gauge.sts ?? '';
    g.targetRows = pat.gauge.rows ?? '';
  }
  g._unitInit = true;
  g.open = { ...(g.open||{}), compare:true };
  switchTab('gauge');
}
function openPatternInLibrary(id){
  const pat = STATE.patterns.find(p=>p.id===id);
  if(!pat) return;
  STATE.patternSearch = pat.name;
  STATE.patternFilterStatus = 'all';
  switchTab('patterns');
}
function renderPatternCard(pat){
  const meta = [
    pat.craft && pat.craft!=='other' ? (pat.craft==='crochet'?'Crochet':'Knit') : null,
    pat.weightCategory ? weightLabel(pat.weightCategory) : null,
    patternYardageRange(pat) ? formatYardageRange(patternYardageRange(pat)) + ((pat.sizes||[]).length ? ` · ${pat.sizes.length} sizes` : '') : null,
    pat.needleSize ? `🪡 ${pat.needleSize}` : null,
    pat.gauge && (pat.gauge.sts||pat.gauge.rows) ? `📐 ${pat.gauge.sts||'?'}×${pat.gauge.rows||'?'}/${pat.gauge.unit==='cm'?'10cm':'4in'}` : null,
    pat.skillLevel
  ].filter(Boolean);
  const projects = STATE.projects.filter(p=>p.patternId===pat.id);
  const cover = patternCoverUrl(pat);
  const coverFile = cover && (pat.files||[]).find(f=>patternFilePreviews(f).includes(cover));
  return `<div class="card pattern-card">
    ${cover ? `<a class="pattern-cover" href="${esc(coverFile.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(coverFile.name)}"><img src="${esc(cover)}" alt="" loading="lazy" /></a>` : ''}
    <p class="project-name pattern-title">${esc(pat.name)}</p>
    ${pat.designer ? `<p class="note no-margin pattern-designer">by ${esc(pat.designer)}</p>` : ''}
    <select class="status-select pattern-status" onchange="updatePatternStatus('${pat.id}', this.value)" aria-label="Pattern status">
        ${PATTERN_STATUSES.map(([k,l])=>`<option value="${k}" ${pat.status===k?'selected':''}>${l}</option>`).join('')}
    </select>
    ${meta.length ? `<p class="note pattern-meta">${meta.map(esc).join(' · ')}</p>` : ''}
    ${(pat.sizes||[]).length ? `<details class="note pattern-sizes"><summary>Yardage by size</summary>
      <table>${pat.sizes.map(x=>`<tr><td>${esc(x.label)}</td><td>${toDisplayLength(x.yardage).toLocaleString()} ${unitLabel()}</td></tr>`).join('')}</table>
    </details>` : ''}
    ${(pat.tags||[]).length ? `<div class="scrap-chips mt-1">${pat.tags.map(t=>`<button type="button" class="pattern-tag" onclick="setPatternSearch(${esc(JSON.stringify(t))}, true)">#${esc(t)}</button>`).join('')}</div>` : ''}
    ${(pat.files||[]).length || pat.sourceUrl ? `<div class="link-strip">
      ${(pat.files||[]).map(f=>patternFilePreview(f, cover)
        ? `<a class="link-card" href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(patternFilePreview(f, cover))}" alt="" loading="lazy" /><span class="link-title">${esc(f.name)}</span></a>`
        : `<a class="link-card generic" href="${esc(f.url)}" target="_blank" rel="noopener">${/pdf/i.test(f.type||'')?'📄':'🖼️'}<span class="link-title">${esc(f.name)}</span></a>`).join('')}
      ${pat.sourceUrl ? `<a class="link-card generic" href="${esc(pat.sourceUrl)}" target="_blank" rel="noopener">${ICONS.link}<span class="link-title">${esc(linkHostname(pat.sourceUrl))}</span></a>` : ''}
    </div>` : ''}
    ${pat.notes ? renderProjectNotes(pat.notes) : ''}
    ${renderPatternStashLine(pat)}
    ${projects.length ? `<p class="note" style="margin:6px 0 0; font-size:0.72rem;">Projects: ${projects.map(p=>esc(p.name)).join(', ')}</p>` : ''}
    <div class="pattern-actions">
      ${STATE.online ? `<button class="btn btn-ghost btn-small" onclick="startProjectFromPattern('${pat.id}')">${ICONS.sparkles} Start project</button>` : ''}
      ${pat.gauge && (pat.gauge.sts||pat.gauge.rows) ? `<button class="btn btn-ghost btn-small" onclick="patternToGauge('${pat.id}')">📐 Check gauge</button>` : ''}
      <span class="pattern-edit">
        <button class="del-btn" onclick="showPatternForm('${pat.id}')" aria-label="Edit pattern">${ICONS.pencil}</button>
        <button class="del-btn" onclick="deletePattern('${pat.id}')" aria-label="Delete pattern">${ICONS.trash}</button>
      </span>
    </div>
  </div>`;
}
function linkHostname(url){ try{ return new URL(url).hostname.replace(/^www\./,''); }catch(e){ return 'Link'; } }
function setPatternSearch(v, rerender){
  STATE.patternSearch = v;
  if(rerender){ renderTab(); return; }
  const grid = document.getElementById('pattern-grid');
  if(grid) grid.innerHTML = filteredSortedPatterns().map(renderPatternCard).join('');
}
function filteredSortedPatterns(){
  let list = [...STATE.patterns];
  const q = (STATE.patternSearch||'').toLowerCase().trim();
  if(q) list = list.filter(p=>[p.name,p.designer,p.notes,...(p.tags||[])].filter(Boolean).some(f=>f.toLowerCase().includes(q)));
  const fs = STATE.patternFilterStatus;
  if(fs && fs!=='all') list = list.filter(p=>(p.status||'saved')===fs);
  const fc = STATE.patternFilterCraft;
  if(fc && fc!=='all') list = list.filter(p=>p.craft===fc);
  const sort = STATE.patternSort || 'recent';
  if(sort==='name') list.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sort==='updated') list.sort((a,b)=>updatedKey(b).localeCompare(updatedKey(a)));
  else list.reverse();
  return list;
}
function renderPatterns(){
  let html = `<div class="row-between mb-4">
    <p class="note">${STATE.patterns.length} pattern${STATE.patterns.length===1?'':'s'}</p>
    ${!STATE.showPatternForm && !bulkPatterns && STATE.online ? `<div style="display:flex; gap:8px;">
      <label class="btn btn-ghost" title="Add many pattern files at once">${ICONS.upload} Bulk add<input type="file" accept="application/pdf,.pdf,image/*,.heic,.heif" multiple style="display:none;" onchange="startBulkPatternImport(this.files); this.value='';" /></label>
      <button class="btn btn-primary" onclick="showPatternForm()">${ICONS.plus} Add pattern</button></div>` : ''}
  </div>`;
  if(bulkPatterns) html += renderBulkPatterns();
  if(STATE.showPatternForm) html += renderPatternForm();
  if(STATE.patterns.length===0){
    html += `<div class="empty"><p class="title">Your pattern library is empty</p><p class="body">Save patterns you own or want to make — upload the PDF, note the yarn and gauge, and see what in your stash could work. Start a project from any pattern.</p></div>`;
    return html;
  }
  html += `<div class="stash-controls">
    <input type="text" placeholder="Search name, designer, tag…" value="${esc(STATE.patternSearch||'')}" oninput="setPatternSearch(this.value)" style="flex:1; min-width:140px;" aria-label="Search patterns" />
    <select onchange="STATE.patternFilterStatus=this.value; renderTab();" aria-label="Filter by status">
      ${[['all','All statuses'],...PATTERN_STATUSES].map(([k,l])=>`<option value="${k}" ${(STATE.patternFilterStatus||'all')===k?'selected':''}>${l}</option>`).join('')}
    </select>
    <select onchange="STATE.patternFilterCraft=this.value; renderTab();" aria-label="Filter by craft">
      ${[['all','Knit & crochet'],['knit','Knit'],['crochet','Crochet'],['other','Other']].map(([k,l])=>`<option value="${k}" ${(STATE.patternFilterCraft||'all')===k?'selected':''}>${l}</option>`).join('')}
    </select>
    <select onchange="setSort('patternSort', this.value)" aria-label="Sort patterns">
      ${[['recent','Newest'],['updated','Recently updated'],['name','Name A–Z']].map(([k,l])=>`<option value="${k}" ${(STATE.patternSort||'recent')===k?'selected':''}>${l}</option>`).join('')}
    </select>
  </div>`;
  const shown = filteredSortedPatterns();
  if(!shown.length) html += `<div class="empty"><p class="title">No matches</p><p class="body">No patterns match your search or filters.</p></div>`;
  html += `<div class="pattern-grid" id="pattern-grid">${shown.map(renderPatternCard).join('')}</div>`;
  return html;
}

function renderShopping(){
  const items = STATE.shoppingList;
  let html = buildInStoreSection();
  html += `<h2 style="font-size:1.05rem; margin:24px 0 10px;">Shopping list</h2>`;
  html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:8px;">
    <p class="note">${items.length} item${items.length===1?'':'s'}${items.some(i=>i.done)?` · ${items.filter(i=>i.done).length} checked`:''}</p>
    <div style="display:flex; gap:8px;">
      ${items.some(i=>i.done) ? `<button class="btn btn-ghost btn-small" onclick="clearDoneShopping()">Clear checked</button>` : ''}
      ${STATE.online && !STATE.showShoppingForm ? `<button class="btn btn-primary btn-small" onclick="addManualShoppingItem()">${ICONS.plus} Add item</button>` : ''}
    </div>
  </div>`;

  if(STATE.showShoppingForm) html += renderShoppingForm();

  if(items.length===0){
    html += `<div class="empty"><p class="title">Nothing to shop for yet</p><p class="body">Add items here manually, or send gaps here from a project ("need N more yards") or from Palette Lab dream matches. Each item gets Google and Ravelry search links.</p></div>`;
    return html;
  }

  // Group visually by color+weight+fiber so a project gap and a palette gap
  // for the same yarn collapse into one line (quantities summed, all sources
  // shown). Underlying items stay separate for per-source remove/check.
  const groups = groupShoppingItems(items);
  html += `<div style="display:flex; flex-direction:column; gap:10px;">${groups.map(renderShoppingGroup).join('')}</div>`;
  return html;
}
function shoppingSignature(it){
  return [ (it.colorName||'').toLowerCase().trim(), (it.weight||'').toLowerCase().trim(), (it.fiber||'').toLowerCase().trim() ].join('|');
}
function groupShoppingItems(items){
  const map = new Map();
  items.forEach(it=>{
    const key = shoppingSignature(it) + '|' + (it.done?'done':'todo');
    if(!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  });
  return [...map.values()];
}

/* In-store color check: snap/upload a photo of a skein you're looking at,
   extract its color (existing k-means), then show the closest colors already
   in your stash and whether any project/palette wants that color — all
   client-side, no OCR, no external service. Answers "do I already own
   something like this, and does anything need it?" */
function buildInStoreSection(){
  const captured = STATE.inStoreColor;
  const swatchStrip = STATE.inStoreExtracted.length
    ? `<div class="swatch-row" style="justify-content:center;">${STATE.inStoreExtracted.map(s=>`<button type="button" class="swatch-btn ${captured===s.hex?'selected':''}" style="background:${s.hex}" title="${s.hex}" onclick="pickInStoreColor('${s.hex}')"></button>`).join('')}</div>`
    : '';

  let result = '';
  if(captured){
    const capLab = hexToLab(captured);
    // Closest stash yarns by perceptual distance.
    const ranked = STATE.yarns.filter(y=>y.colorHex).map(y=>{
      const hexes = (y.isMulticolor && y.colors && y.colors.length) ? y.colors : [y.colorHex];
      let best=Infinity, bh=y.colorHex;
      hexes.forEach(h=>{ const d=deltaE2000(capLab, hexToLab(h)); if(d<best){best=d;bh=h;} });
      return { yarn:y, dist:best, hex:bh, closeness:closenessPercent(best) };
    }).sort((a,b)=>a.dist-b.dist).slice(0,4);

    const veryClose = ranked.filter(r=>r.closeness>=80);
    const ownedMsg = veryClose.length
      ? `<p class="note" style="margin:0 0 8px; color:var(--forest);">You already own ${veryClose.length} very similar skein${veryClose.length===1?'':'s'} — you may not need this.</p>`
      : `<p class="note" style="margin:0 0 8px;">Nothing in your stash is a close match — this could be a genuine gap-filler.</p>`;

    // Does any project gap or palette dream-match want this color?
    const wants = [];
    STATE.projects.forEach(p=>{
      const g = projectYardageGap(p);
      if(g && g.gap>0){
        const linked = STATE.yarns.filter(y=>(p.yarnIds||[]).includes(y.id));
        if(linked.some(y=>deltaE2000(capLab, hexToLab(y.colorHex))<15)){
          wants.push(`Project "${esc(p.name)}" still needs ~${Math.round(g.gap)} yd of a similar color`);
        }
      }
    });
    const wantsMsg = wants.length ? `<div class="card" style="margin:0 0 10px; font-size:0.82rem;">${wants.map(w=>`<p style="margin:2px 0;">✓ ${w}</p>`).join('')}</div>` : '';

    const rankedList = ranked.length
      ? `<div style="display:flex; flex-direction:column; gap:8px;">${ranked.map(r=>`
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="swatch" style="background:${r.hex}"></span>
            <span style="flex:1; min-width:0; font-size:0.85rem;">${esc(yarnDisplayName(r.yarn))}</span>
            <span class="note">${r.closeness}% similar</span>
          </div>`).join('')}</div>`
      : `<p class="note">Your stash is empty — nothing to compare against yet.</p>`;

    result = `
      <div style="display:flex; align-items:center; gap:12px; margin:10px 0;">
        <span class="palette-swatch" style="width:48px;height:48px;background:${captured}"></span>
        <div>
          <p style="margin:0; font-weight:600;">${esc(nameColor(captured))}</p>
          <p class="note" style="margin:1px 0 0;">Captured color</p>
        </div>
        <button class="btn btn-ghost btn-small" style="margin-left:auto;" onclick="clearInStoreColor()">Clear</button>
      </div>
      ${ownedMsg}
      ${wantsMsg}
      <p class="note" style="margin:6px 0 6px;">Closest in your stash:</p>
      ${rankedList}`;
  }

  return `<details ${captured?'open':''} class="card" style="margin-bottom:6px;">
    <summary style="cursor:pointer; font-weight:600; font-family:'Fraunces',serif;">${ICONS.image} In-store color check</summary>
    <p class="note" style="margin:8px 0;">Looking at a skein in a shop? Snap or upload a photo to see if you already own something like it — and whether any project wants that color.</p>
    <div class="photo-dropzone" ondragover="onPhotoDropzoneDragOver(event)" ondragleave="onPhotoDropzoneDragLeave(event)" ondrop="onInStoreDrop(event)">
      <span class="note">Drag a photo here, or</span>
      <button type="button" class="btn btn-ghost btn-small" onclick="document.getElementById('instore-photo').click()">${ICONS.upload} Upload / take photo</button>
      <input id="instore-photo" type="file" accept="image/*,.heic,.heif" capture="environment" class="hidden" onchange="handleInStorePhoto(event)" />
    </div>
    <span id="instore-extracting" class="note" style="display:none; margin-top:8px;">Reading colors…</span>
    ${swatchStrip}
    ${result}
  </details>`;
}
function handleInStorePhoto(e){
  const file=e.target.files[0]; e.target.value='';
  if(file) processInStorePhoto(file);
}
function onInStoreDrop(e){
  e.preventDefault(); e.currentTarget.classList.remove('dragover');
  const file=e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if(file) processInStorePhoto(file);
}
async function processInStorePhoto(file){
  if(!isAcceptableImageFile(file)) return;
  const statusEl=document.getElementById('instore-extracting');
  if(statusEl) statusEl.style.display='inline';
  let usable;
  try{ usable = await toRenderableImageBlob(file); }
  catch(err){ if(statusEl) statusEl.style.display='none'; wgToast(err.message, 'error'); return; }
  const img=new Image(); const url=URL.createObjectURL(usable);
  img.onload=()=>{
    const size=50, canvas=document.createElement('canvas');
    canvas.width=size; canvas.height=size;
    const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,size,size);
    const data=ctx.getImageData(0,0,size,size).data;
    const pixels=[];
    for(let i=0;i<data.length;i+=4){ if(data[i+3]<100) continue; pixels.push([data[i],data[i+1],data[i+2]]); }
    STATE.inStoreExtracted = kMeansColors(pixels,5,6).slice(0,5);
    STATE.inStoreColor = STATE.inStoreExtracted.length ? STATE.inStoreExtracted[0].hex : null;
    if(statusEl) statusEl.style.display='none';
    URL.revokeObjectURL(url);
    renderTab();
  };
  img.onerror=()=>{ if(statusEl) statusEl.style.display='none'; URL.revokeObjectURL(url); wgToast('Could not read that photo.', 'error'); };
  img.src=url;
}
function pickInStoreColor(hex){ STATE.inStoreColor=hex; renderTab(); }
function clearInStoreColor(){ STATE.inStoreColor=null; STATE.inStoreExtracted=[]; renderTab(); }

function renderShoppingGroup(group){
  const rep = group[0]; // representative for spec + search links
  const done = rep.done;
  const totalQty = group.reduce((s,i)=>s+(Number(i.quantity)||1),0);
  const spec = [rep.colorName, rep.weight, rep.fiber, rep.yardage?('~'+toDisplayLength(rep.yardage)+' '+unitLabel()):''].filter(Boolean).join(' · ') || 'Yarn';
  const sources = group.filter(i=>i.sourceType!=='manual' && i.sourceName).map(i=>i.sourceName);
  const uniqueSources = [...new Set(sources)];
  const srcLine = uniqueSources.length ? `<p class="note" style="margin:2px 0 0;">for: ${uniqueSources.map(esc).join(', ')}</p>` : '';
  const ids = group.map(i=>i.id);
  return `<div class="card" style="display:flex; align-items:flex-start; gap:12px; ${done?'opacity:0.55;':''}">
    <button onclick="toggleShoppingGroupDone('${ids.join(',')}')" aria-label="Toggle done" style="background:none;border:1px solid var(--border);border-radius:5px;width:22px;height:22px;flex-shrink:0;cursor:pointer;color:var(--forest);font-size:0.9rem;line-height:1;margin-top:2px;">${done?'✓':''}</button>
    ${rep.hex ? `<span class="swatch" style="background:${rep.hex}; margin-top:1px;"></span>` : ''}
    <div class="grow">
      <p style="margin:0; font-weight:500; font-size:0.9rem; ${done?'text-decoration:line-through;':''}">${totalQty>1?totalQty+'× ':''}${esc(spec)}</p>
      ${srcLine}
      <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
        <a class="btn btn-ghost btn-small" href="${esc(googleSearchUrl(rep))}" target="_blank" rel="noopener">Search Google</a>
        <a class="btn btn-ghost btn-small" href="${esc(ravelrySearchUrl(rep))}" target="_blank" rel="noopener">Search Ravelry</a>
        ${group.length===1 ? `<button class="btn btn-ghost btn-small" onclick="editShoppingItem('${rep.id}')">Edit</button>` : ''}
      </div>
    </div>
    <button class="del-btn" onclick="removeShoppingGroup('${ids.join(',')}')" aria-label="Remove">${ICONS.trash}</button>
  </div>`;
}
function toggleShoppingGroupDone(idsStr){
  const ids = idsStr.split(',');
  const anyUndone = STATE.shoppingList.some(i=>ids.includes(i.id) && !i.done);
  STATE.shoppingList = STATE.shoppingList.map(i=> ids.includes(i.id) ? {...i, done:anyUndone} : i);
  persist();
  renderTab();
}
function removeShoppingGroup(idsStr){
  const ids = idsStr.split(',');
  STATE.shoppingList = STATE.shoppingList.filter(i=>!ids.includes(i.id));
  persist();
  renderTab();
}

function renderPresetsAdmin(){
  if(!isAdmin()){
    return `<p class="note">Not available.</p>`;
  }
  const rows = [...YARN_PRESETS]
    .sort((a,b)=> a.brand.localeCompare(b.brand) || a.line.localeCompare(b.line))
    .map(p => `<div style="display:flex; justify-content:space-between; gap:12px; padding:7px 0; border-bottom:1px dashed var(--border); font-size:0.82rem;">
        <span>${esc(p.brand)} — ${esc(p.line)}</span>
        <span class="note">${esc(p.fiber)} · ${esc(p.weightCategory)} · ${p.skeinWeightGrams}g / ${p.skeinYardage}yd</span>
      </div>`).join('');

  return `
  <form class="card form-grid" onsubmit="event.preventDefault(); handleAddPreset();" style="margin-bottom:20px;">
    <label class="field">Brand
      <input id="pa-brand" required placeholder="Bernat" />
    </label>
    <label class="field">Line
      <input id="pa-line" required placeholder="Baby Blanket" />
    </label>
    <label class="field">Fiber content
      <input id="pa-fiber" placeholder="100% Acrylic" />
    </label>
    <label class="field">Weight category
      <select id="pa-weightcat">${WEIGHTS.map(w=>`<option ${w==='Worsted'?'selected':''}>${w}</option>`).join('')}</select>
    </label>
    <label class="field">Skein weight (g)
      <input id="pa-skeinweight" type="number" min="0" placeholder="100" />
    </label>
    <label class="field">Yardage per skein
      <input id="pa-skeinyardage" type="number" min="0" placeholder="220" />
    </label>
    <div class="span2" style="display:flex; justify-content:flex-end;">
      <button type="submit" class="btn btn-primary">${ICONS.plus} Add preset</button>
    </div>
  </form>
  <div class="card">
    <p class="note" style="margin-bottom:6px;">${YARN_PRESETS.length} preset${YARN_PRESETS.length===1?'':'s'} currently available in the stash form</p>
    ${rows}
  </div>`;
}

async function handleAddPreset(){
  const brand = document.getElementById('pa-brand').value.trim();
  const line = document.getElementById('pa-line').value.trim();
  if(!brand || !line) return;
  const newLine = {
    brand,
    line,
    fiber: document.getElementById('pa-fiber').value.trim(),
    weightCategory: document.getElementById('pa-weightcat').value,
    skeinWeightGrams: Number(document.getElementById('pa-skeinweight').value) || 0,
    skeinYardage: Number(document.getElementById('pa-skeinyardage').value) || 0
  };
  try{
    await window.FB.addPreset(newLine);
    YARN_PRESETS = [...YARN_PRESETS, newLine];
    renderTab();
  }catch(e){
    console.error('Could not add preset', e);
    wgToast("Couldn't save that preset — check the console for details.", "error");
  }
}

/* =================================================================
   Init — waits for the Firebase bridge (window.FB) to be ready,
   then reacts to sign-in / sign-out for as long as the page is open.
================================================================= */
function initApp(){
  // Accessibility: announce toasts to screen readers, and add a skip link.
  const toastRoot = document.getElementById('wg-toast-root');
  if(toastRoot){ toastRoot.setAttribute('aria-live','polite'); toastRoot.setAttribute('aria-atomic','true'); }
  if(!document.getElementById('wg-skip')){
    const skip = document.createElement('a');
    skip.id = 'wg-skip'; skip.className = 'wg-skip-link'; skip.href = '#app';
    skip.textContent = 'Skip to content';
    document.body.insertBefore(skip, document.body.firstChild);
  }
  render(); // shows "Connecting…"

  // Re-render when crossing the mobile/desktop breakpoint so the layout
  // (bottom nav vs. tab row, full-screen vs. inline forms) stays correct
  // through rotation/resize. Debounced, and only fires on an actual
  // breakpoint crossing rather than every pixel of resize.
  let wasMobile = isMobile();
  // Tab widths change once the web font arrives.
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(fitTabs);
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const nowMobile = isMobile();
      if(nowMobile !== wasMobile){ wasMobile = nowMobile; if(STATE.authChecked && STATE.user) render(); }
      else fitTabs();
    }, 150);
  });

  // React to connectivity changes: at Level 2 (read-only offline), editing
  // affordances (the + button) hide offline and the offline banner shows.
  function syncOnline(){
    const now = navigator.onLine;
    if(now !== STATE.online){
      STATE.online = now;
      // If a form was open when we dropped offline, close it — saves would fail.
      if(!now){ STATE.showYarnForm = false; STATE.showProjectForm = false; STATE.editingYarnId = null; STATE.editingProjectId = null; }
      if(STATE.authChecked && STATE.user) render();
    }
  }
  window.addEventListener('online', syncOnline);
  window.addEventListener('offline', syncOnline);

  window.FB.onAuthChange(async (user) => {
  STATE.authChecked = true;
  STATE.user = user || null;

  if(user){
    try{
      const data = await window.FB.loadUserData(user.uid);

      STATE.yarns = ((data && data.yarns) || []).map(normalizeLegacyYarn);
      STATE.projects = (data && data.projects) || [];
      STATE.paletteSavedPalettes = (data && data.palettes) || [];
      STATE.shoppingList = (data && data.shoppingList) || [];
      STATE.patterns = (data && data.patterns) || [];

      STATE.unitPref =
        (data && data.prefs && data.prefs.unitPref) || 'yd';

      STATE.theme =
        (data && data.prefs && data.prefs.theme) || 'device';

      STATE.preferencesSetup =
        data && data.prefs &&
        data.prefs.preferencesSetup === true;

      // Remembered sort choices (filters stay session-only).
      STATE.stashSort = (data && data.prefs && data.prefs.stashSort) || 'recent';
      STATE.projSort = (data && data.prefs && data.prefs.projSort) || 'recent';
      STATE.patternSort = (data && data.prefs && data.prefs.patternSort) || 'recent';

      applyTheme();

    }catch(e){
      console.error('Could not load your data', e);
      STATE.yarns = [];
      STATE.projects = [];
    }

    await loadPresetsFromFirestore();

  }else{
    STATE.yarns = [];
    STATE.projects = [];
  }

  render();
  maybeShowIosInstallHint();

  // Show the preference setup for users who haven't completed it.
  if(user && STATE.preferencesSetup !== true){
    setTimeout(() => {
      showPreferencesSetup();
    }, 300);
  }
});

}
/* iOS Safari gives no install prompt — show a gentle, dismissible hint on
   how to Add to Home Screen. Only on iOS, only in a browser tab (not when
   already launched as an installed app), and only once (dismissal sticks
   via localStorage — used purely for this UI preference, not app data). */
function maybeShowIosInstallHint(){
  if(window.WG_DEMO) return;   // demo doesn't prompt to install
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  let dismissed = false;
  try{ dismissed = localStorage.getItem('wg-ios-hint-dismissed') === '1'; }catch(e){}
  if(!isIos || isStandalone || dismissed) return;
  if(document.getElementById('ios-install-hint')) return;
  const el = document.createElement('div');
  el.className = 'ios-install-hint';
  el.id = 'ios-install-hint';
  el.innerHTML = `
    <img class="ih-icon" src="/icons/icon-180.png" alt="" />
    <div>Install Woolgather: tap the <b>Share</b> button, then <b>Add to Home Screen</b>.</div>
    <button class="ih-close" onclick="dismissIosHint()" aria-label="Dismiss">✕</button>`;
  document.body.appendChild(el);
}
function dismissIosHint(){
  try{ localStorage.setItem('wg-ios-hint-dismissed','1'); }catch(e){}
  const el = document.getElementById('ios-install-hint');
  if(el) el.remove();
}

if(window.FB){ initApp(); }
else {
  window.addEventListener('firebase-ready', initApp, { once:true });
  // If the Firebase SDK never loads (e.g. offline before it was cached),
  // don't hang on a blank screen — show a readable message after a delay.
  setTimeout(() => {
    if(!window.FB){
      const app = document.getElementById('app');
      if(app) app.innerHTML = `<div class="wrap"><div class="empty" style="margin-top:40px;">
        <p class="title">Couldn't finish loading</p>
        <p class="body">Woolgather needs to connect once while online to finish setting up offline mode. Please reopen the app with a connection, then it'll work offline afterward.</p>
      </div></div>`;
    }
  }, 6000);
}

/* ---- Service worker registration + update handling ----
   Registers /sw.js (must sit at the site root so it can control the whole
   app). When a new version is deployed and the SW updates, we show a small
   "Update available" bar rather than silently serving stale-then-fresh, so
   the user chooses when to reload into the new version. */
if('serviceWorker' in navigator && !window.WG_DEMO){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // A new SW has been found and is installing.
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if(!installing) return;
        installing.addEventListener('statechange', () => {
          // Installed + there's already a controller => this is an update,
          // not a first install. Offer to refresh.
          if(installing.state === 'installed' && navigator.serviceWorker.controller){
            showUpdateBar(reg);
          }
        });
      });
    }).catch((e) => console.warn('SW registration failed:', e));

    // When the controlling SW changes (after the user accepts an update),
    // reload once to pick up the new assets.
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if(reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
}
function showUpdateBar(reg){
  if(document.getElementById('sw-update-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'sw-update-bar';
  bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:80;background:var(--plum);color:#fff;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;box-shadow:0 6px 24px rgba(0,0,0,0.25);font-size:0.85rem;padding-bottom:calc(12px + env(safe-area-inset-bottom,0));';
  bar.innerHTML = `<span class="grow">A new version of Woolgather is ready.</span>
    <button style="background:#fff;color:var(--plum);border:none;border-radius:7px;padding:7px 12px;font-family:inherit;font-weight:600;cursor:pointer;">Refresh</button>`;
  bar.querySelector('button').onclick = () => {
    if(reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
  };
  document.body.appendChild(bar);
}
