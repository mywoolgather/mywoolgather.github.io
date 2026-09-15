/* =================================================================
   Design tokens / constants
================================================================= */
const STATUS_COLORS = { Planned:'#6E6178', WIP:'#8B5FA3', Finished:'#3E6B49', Frogged:'#7A2F4B' };
const CHART_COLORS = ['#3E6B49','#5C3A72','#9B7EC0','#8FAF7C','#6E6178'];
const WEIGHTS = ["Lace","Fingering","Sport","DK","Worsted","Aran","Bulky","Super Bulky"];
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
  "Worsted":     { cyc:4, aliases:["afghan","10-ply","medium"] },
  "Aran":        { cyc:4, aliases:["heavy worsted","12-ply"] },
  "Bulky":       { cyc:5, aliases:["chunky","craft","14-ply"] },
  "Super Bulky": { cyc:6, aliases:["super chunky","roving"] }
};
function weightLabel(name){
  const m = WEIGHT_META[name];
  if(!m) return name;
  const alias = m.aliases && m.aliases.length ? ` (${m.aliases.slice(0,2).join(', ')})` : '';
  return `${m.cyc} · ${name}${alias}`;
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
  const anyFormOpen = (STATE.showYarnForm || STATE.showProjectForm) && isMobile();
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
  { brand:"Drops", line:"Nepal", fiber:"65% Wool, 35% Alpaca", weightCategory:"Aran", skeinWeightGrams:50, skeinYardage:82 },
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
  stashSort: 'recent',
  projFilterStatus: 'All statuses',
  projSort: 'recent',
};
let pendingColorHex = '#5C3A72';
let extractedSwatches = [];
let pendingYarnIsMulticolor = false;
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
    await window.FB.saveUserData(STATE.user.uid, { yarns: STATE.yarns, projects: STATE.projects, palettes: STATE.paletteSavedPalettes, shoppingList: STATE.shoppingList, prefs: {unitPref: STATE.unitPref, theme: STATE.theme,   preferencesSetup: true} });
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
  if(!(STATE.showYarnForm || STATE.showProjectForm || STATE.showShoppingForm)) { _formSnapshot = null; return; }
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
function yarnTotalYardage(y){ return (Number(y.skeinYardage)||0) * (Number(y.quantity)||1); }
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
    'Worsted':['worsted','afghan','medium'],
    'Aran':['aran','10 ply','10-ply'],
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
    { id:'palette', label:'Palette lab', icon:ICONS.palette },
    { id:'showcase', label:'Showcase', icon:ICONS.image, addLabel:'Add project' },
    { id:'shopping', label:'Shopping list', icon:ICONS.cart },
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
         <a class="btn btn-primary btn-small" href="${window.WG_SIGNUP_URL || '/woolgather.html'}">Sign up free</a>
         <a class="btn btn-ghost btn-small" href="${window.WG_SIGNUP_URL || '/woolgather.html'}">Log in</a>
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
  renderTab();
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
  const action = current.id==='stash' ? 'showYarnForm()' : 'showProjectForm()';
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
        <a class="btn btn-primary" style="margin:0 22px 8px; display:block; text-align:center;" href="${window.WG_SIGNUP_URL || '/woolgather.html'}">Sign up free</a>
        <a class="btn btn-ghost" style="margin:0 22px; display:block; text-align:center;" href="${window.WG_SIGNUP_URL || '/woolgather.html'}">Log in</a>
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
        <button onclick="closeSettings(); resetAll();" class="danger-text">${ICONS.trash}<span>Clear my data</span></button>
        <div class="sheet-divider"></div>
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
  else if(STATE.tab==='palette') el.innerHTML = renderPalette();
  else if(STATE.tab==='showcase') el.innerHTML = renderShowcase();
  else if(STATE.tab==='shopping') el.innerHTML = renderShopping();
  else if(STATE.tab==='presets') el.innerHTML = renderPresetsAdmin();

  if(STATE.tab==='overview') renderCharts();
  if(STATE.tab==='stash' && STATE.showYarnForm) wireBrandSelectors();
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
    return `<div class="empty">
      <p class="title">Welcome to Woolgather 🧶</p>
      <p class="body">Your quiet ledger for yarn, projects, and palettes. Start by logging a skein or two — then the dashboard, palette matching, and shopping tools all come to life. Everything saves to your account and syncs across your devices.</p>
      <button class="btn btn-primary" onclick="switchTab('stash')">${ICONS.plus} Add your first yarn</button>
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
      <p class="chart-title">Yardage owned by fiber</p>
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
    ${!STATE.showYarnForm ? `<button class="btn btn-primary" onclick="showYarnForm()">${ICONS.plus} Add yarn</button>` : ''}
  </div>`;
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
      <select onchange="STATE.stashSort=this.value; renderTab();">
        ${[['recent','Newest'],['name','Name A–Z'],['yardage','Most yardage'],['color','Color']].map(([v,l])=>`<option value="${v}" ${(STATE.stashSort||'recent')===v?'selected':''}>${l}</option>`).join('')}
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
  const sort = STATE.stashSort || 'recent';
  if(sort==='name') list.sort((a,b)=>yarnDisplayName(a).localeCompare(yarnDisplayName(b)));
  else if(sort==='yardage') list.sort((a,b)=>yarnTotalYardage(b)-yarnTotalYardage(a));
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
      <select id="yf-brand-select" onchange="onBrandChange()">
        <option value="">Custom / other</option>
        ${brandOptions}
      </select>
    </label>
    <label class="field">Line
      <select id="yf-line-select" onchange="onLineChange()" disabled><option value="">— pick a brand first —</option></select>
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
    <label class="field">Yardage per skein (${unitLabel()})
      <input id="yf-skeinyardage" type="number" min="0" placeholder="220" value="${editing ? toDisplayLength(editing.skeinYardage) : ''}" />
    </label>

    <label class="field">Quantity (skeins)
      <input id="yf-quantity" type="number" min="0" step="any" placeholder="1.5" value="${editing ? esc(editing.quantity) : 1}" />
    </label>
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
  const lineSelect = document.getElementById('yf-line-select');
  if(!brand){
    lineSelect.innerHTML = '<option value="">— pick a brand first —</option>';
    lineSelect.disabled = true;
    return;
  }
  const lines = presetLinesForBrand(brand);
  lineSelect.innerHTML = '<option value="">— pick a line —</option>' + lines.map(p=>`<option value="${esc(p.line)}">${esc(p.line)}</option>`).join('');
  lineSelect.disabled = false;
}
function onLineChange(){
  const brand = document.getElementById('yf-brand-select').value;
  const line = document.getElementById('yf-line-select').value;
  if(!brand || !line) return;
  const preset = findPreset(brand, line);
  if(!preset) return;
  document.getElementById('yf-brand').value = brand;
  document.getElementById('yf-line').value = line;
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
async function processLabelScan(file){
  if(!file || !isAcceptableImageFile(file)) return;
  if(typeof Tesseract === 'undefined'){ wgToast("Couldn't load the label reader — check your connection and try again.", "error"); return; }
  const statusEl = document.getElementById('yf-ocr-status');
  const setStatus = (t)=>{ if(statusEl){ statusEl.style.display='inline'; statusEl.textContent=t; } };
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
    quantity: Number(document.getElementById('yf-quantity').value) || 1,
    // (accepts decimals like 1.5 for partial/scrap skeins)
    cost: document.getElementById('yf-cost').value === '' ? null : Number(document.getElementById('yf-cost').value),
    purchaseDate: document.getElementById('yf-purchasedate').value || null,
    isMulticolor: multicolor,
    colors: multicolor ? [...pendingYarnColors] : [],
    primaryIndex: primaryIndex,
    matchMode: multicolor && pendingYarnColors.length<=3 ? pendingYarnMatchMode : 'simple',
    colorHex: multicolor ? pendingYarnColors[primaryIndex] : pendingColorHex
  };

  if(STATE.editingYarnId){
    STATE.yarns = STATE.yarns.map(y => y.id===STATE.editingYarnId ? { ...y, ...fields } : y);
  } else {
    const yarn = { id: uid(), ...fields, status:'available', allocatedTo:null, dateAdded: todayStr() };
    yarn.yardageRemaining = yarnTotalYardage(yarn);
    STATE.yarns.push(yarn);
  }
  persist();
  STATE.showYarnForm = false;
  STATE.editingYarnId = null;
  renderTab();
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
        <button class="del-btn" onclick="showYarnForm('${y.id}')" aria-label="Edit yarn">${ICONS.pencil}</button>
        <button class="del-btn" onclick="deleteYarn('${y.id}')" aria-label="Remove yarn">${ICONS.trash}</button>
      </div>
    </div>
    <div class="yarn-meta">
      <span>${esc(categorizeFiber(y.fiber))}</span>
      <span>${esc(y.weightCategory||'')}</span>
    </div>
    ${y.dyeLot ? `<p class="note" style="margin:6px 0 0; font-size:0.7rem;">Dye lot ${esc(y.dyeLot)}</p>` : ''}
    <div class="yarn-bottom">
      <span>
        <input type="number" value="${toDisplayLength(y.yardageRemaining)}" onchange="changeRemaining('${y.id}', this.value)" />
        / ${toDisplayLength(total)} ${unitLabel()} <span class="note">(${y.quantity}× ${toDisplayLength(y.skeinYardage)}${unitLabel()})</span>
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
      <select onchange="STATE.projSort=this.value; renderTab();">
        ${[['recent','Newest'],['name','Name A–Z'],['status','By status']].map(([v,l])=>`<option value="${v}" ${(STATE.projSort||'recent')===v?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>`;
  }
  let list = [...STATE.projects];
  const fs = STATE.projFilterStatus;
  if(fs && fs!=='All statuses') list = list.filter(p=>p.status===fs);
  const sort = STATE.projSort || 'recent';
  if(sort==='name') list.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sort==='status'){ const order={WIP:0,Planned:1,Finished:2,Frogged:3}; list.sort((a,b)=>(order[a.status]??9)-(order[b.status]??9)); }
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
  STATE.showYarnForm = false;
  STATE.showProjectForm = false;
  STATE.editingYarnId = null;
  STATE.editingProjectId = null;
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
          Used <input type="number" min="0" step="any" value="${toDisplayLength(used)}" style="width:60px;" id="usedin-${y.id}" onchange="updateProjectYarnUsageModal('${y.id}')" />
          <select id="usedmode-${y.id}" style="font-size:0.7rem; padding:2px 4px;" onchange="onUsedModeChange('${y.id}')">
            <option value="len" selected>${unitLabel()}</option>
            ${(Number(y.skeinYardage)>0 && Number(y.skeinWeightGrams)>0) ? `<option value="skeins">skeins</option><option value="grams">g</option>` : ''}
          </select>
        </label>
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
  STATE.yarns = STATE.yarns.map(y => y.id===yarnId ? { ...y, yardageRemaining:(Number(y.yardageRemaining)||0) - delta } : y);
  if(entry) entry.yardageUsed = newVal;
  else pendingProjectYarnUsage.push({ yarnId, yardageUsed: newVal });
  persist();
  refreshYarnPicker();
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
/* Switching input mode: clear the number so a value typed as one unit isn't
   re-read as another, and show the equivalent in the new mode is left blank
   for the user to re-enter. Doesn't change stored usage until they type. */
function onUsedModeChange(yarnId){
  const numEl = document.getElementById('usedin-'+yarnId);
  if(numEl){ numEl.value=''; numEl.focus(); }
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
    <label class="field">Pattern (optional)
      <input id="pf-pattern" value="${v('patternName')}" />
    </label>
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
  const fields = {
    name,
    patternName: document.getElementById('pf-pattern').value.trim(),
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
    STATE.projects = STATE.projects.map(p => p.id===STATE.editingProjectId ? { ...p, ...fields } : p);
  } else {
    STATE.projects.push({ id: STATE.editingProjectId, ...fields, createdAt: todayStr() });
  }
  persist();
  STATE.showProjectForm = false;
  STATE.editingProjectId = null;
  pendingProjectYarnUsage = [];
  pendingProjectYarnRequired = [];
  pendingProjectPhotos = [];
  pendingProjectCounters = [];
  renderTab();
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
      <p class="project-name">${esc(p.name)}${p.patternName ? ` <span class="pattern">— ${esc(p.patternName)}</span>` : ''}</p>
      <div class="project-meta">
        ${usedYarns.map(y=>`<span class="dot" style="background:${y.colorHex}" title="${esc(y.name)}"></span>`).join('')}
        ${garmentBadge ? `<span class="note">${esc(garmentBadge)}</span>` : ''}
        ${attachedPalette ? `<span class="note">${ICONS.palette} ${esc(attachedPalette.name)}</span>` : ''}
        ${gapBadge}
        ${counters.length ? `<span class="note">${counters.length} counter${counters.length===1?'':'s'}</span>` : ''}
        ${daysActive!=null ? `<span class="days">${daysActive}d in progress</span>` : ''}
      </div>
      ${linkStrip}
      ${counterPanel}
    </div>
    <select class="status-select" onchange="updateProjectStatus('${p.id}', this.value)">
      ${STATUSES.map(s=>`<option ${s===p.status?'selected':''}>${s}</option>`).join('')}
    </select>
    ${counterToggle}
    ${gapInfo && gapInfo.gap>0 ? `<button class="del-btn" onclick="shopProjectGap('${p.id}')" aria-label="Add gap to shopping list" title="Add the ${Math.round(gapInfo.gap)} yd gap to your shopping list">${ICONS.cart}</button>` : ''}
    <button class="del-btn" onclick="showProjectForm('${p.id}')" aria-label="Edit project">${ICONS.pencil}</button>
    <button class="del-btn" onclick="deleteProject('${p.id}')" aria-label="Delete project">${ICONS.trash}</button>
  </div>`;
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
    <button class="counter-btn subtle" onclick="resetCounter('${projectId}','${c.id}')" aria-label="Reset" title="Reset to 0">↺</button>
  </div>`;
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
      ? `<img class="showcase-photo" src="${esc(mainImage)}" alt="${esc(p.name)}" />`
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
  // Ravelry yarn search by free-text query.
  return 'https://www.ravelry.com/yarns/search#query=' + encodeURIComponent(
    [item.colorName, item.weight, item.fiber].filter(Boolean).join(' ')
  );
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
  render(); // shows "Connecting…"

  // Re-render when crossing the mobile/desktop breakpoint so the layout
  // (bottom nav vs. tab row, full-screen vs. inline forms) stays correct
  // through rotation/resize. Debounced, and only fires on an actual
  // breakpoint crossing rather than every pixel of resize.
  let wasMobile = isMobile();
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const nowMobile = isMobile();
      if(nowMobile !== wasMobile){ wasMobile = nowMobile; if(STATE.authChecked && STATE.user) render(); }
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

      STATE.yarns = (data && data.yarns) || [];
      STATE.projects = (data && data.projects) || [];
      STATE.paletteSavedPalettes = (data && data.palettes) || [];
      STATE.shoppingList = (data && data.shoppingList) || [];

      STATE.unitPref =
        (data && data.prefs && data.prefs.unitPref) || 'yd';

      STATE.theme =
        (data && data.prefs && data.prefs.theme) || 'device';

      STATE.preferencesSetup =
        data && data.prefs &&
        data.prefs.preferencesSetup === true;

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
