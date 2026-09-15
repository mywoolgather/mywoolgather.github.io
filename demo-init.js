/* Woolgather demo backend — a drop-in replacement for firebase-init.js.
   Provides an identical window.FB interface, but backed entirely by
   in-memory sample data. No Firebase, no network, no auth, no cost.
   Changes made in the demo live only for the session and reset on refresh. */
(function(){
  window.WG_DEMO = true;   // app.js checks this to skip SW registration + install nag
  const DEMO_UID = 'demo-user';
  const demoUser = {
    uid: DEMO_UID,
    email: 'demo@woolgather.app',
    displayName: 'Demo User',
    emailVerified: true,
    providerData: [{ providerId: 'password' }]
  };

  // ---- Seed data: a realistic, filled-out stash / projects / palettes ----
  const seed = {
    yarns: [
      { id:'y1', name:'Cascade Yarns 220', brand:'Cascade Yarns', line:'220', colorway:'Charcoal 900', fiber:'100% Peruvian Highland Wool', weightCategory:'Worsted', skeinWeightGrams:100, skeinYardage:220, quantity:6, cost:11.5, purchaseDate:'2025-11-02', isMulticolor:false, colors:[], primaryIndex:0, matchMode:'simple', colorHex:'#3a3a3d', yardageRemaining:1320, status:'available', allocatedTo:null, dateAdded:'2025-11-02' },
      { id:'y2', name:'Malabrigo Rios', brand:'Malabrigo', line:'Rios', colorway:'Ravelry Red', fiber:'100% Superwash Merino Wool', weightCategory:'Worsted', skeinWeightGrams:100, skeinYardage:210, quantity:4, cost:14, purchaseDate:'2025-12-15', isMulticolor:false, colors:[], primaryIndex:0, matchMode:'simple', colorHex:'#a8342e', yardageRemaining:840, status:'available', allocatedTo:null, dateAdded:'2025-12-15' },
      { id:'y3', name:'Drops Safran', brand:'Drops', line:'Safran', colorway:'Forest Green', fiber:'100% Cotton', weightCategory:'Sport', skeinWeightGrams:50, skeinYardage:175, quantity:8, cost:2.2, purchaseDate:'2026-01-10', isMulticolor:false, colors:[], primaryIndex:0, matchMode:'simple', colorHex:'#3e6b49', yardageRemaining:1400, status:'available', allocatedTo:null, dateAdded:'2026-01-10' },
      { id:'y4', name:'Knit Picks Wool of the Andes', brand:'Knit Picks', line:'Wool of the Andes Worsted', colorway:'Cream', fiber:'100% Peruvian Highland Wool', weightCategory:'Worsted', skeinWeightGrams:50, skeinYardage:110, quantity:5, cost:2.99, purchaseDate:'2025-10-05', isMulticolor:false, colors:[], primaryIndex:0, matchMode:'simple', colorHex:'#efe7d3', yardageRemaining:550, status:'available', allocatedTo:null, dateAdded:'2025-10-05' },
      { id:'y5', name:'Malabrigo Rios', brand:'Malabrigo', line:'Rios', colorway:'Teal Feather', fiber:'100% Superwash Merino Wool', weightCategory:'Worsted', skeinWeightGrams:100, skeinYardage:210, quantity:3, cost:14, purchaseDate:'2026-01-22', isMulticolor:false, colors:[], primaryIndex:0, matchMode:'simple', colorHex:'#3c7a72', yardageRemaining:630, status:'allocated', allocatedTo:'p1', dateAdded:'2026-01-22' },
      { id:'y6', name:'Lion Brand Wool-Ease', brand:'Lion Brand', line:'Wool-Ease', colorway:'Mustard', fiber:'80% Acrylic, 20% Wool', weightCategory:'Worsted', skeinWeightGrams:85, skeinYardage:197, quantity:4, cost:5.99, purchaseDate:'2025-09-18', isMulticolor:false, colors:[], primaryIndex:0, matchMode:'simple', colorHex:'#c6932f', yardageRemaining:788, status:'available', allocatedTo:null, dateAdded:'2025-09-18' },
      { id:'y7', name:'Drops Paris', brand:'Drops', line:'Paris', colorway:'Sunset Speckle', fiber:'100% Cotton', weightCategory:'Worsted', skeinWeightGrams:50, skeinYardage:82, quantity:6, cost:2.5, purchaseDate:'2026-02-01', isMulticolor:true, colors:['#c15a1b','#e07b2a','#d99518','#a8342e'], primaryIndex:1, matchMode:'full', colorHex:'#e07b2a', yardageRemaining:492, status:'available', allocatedTo:null, dateAdded:'2026-02-01' },
      { id:'y8', name:'Cascade Heritage', brand:'Cascade Yarns', line:'Heritage', colorway:'Navy', fiber:'75% Superwash Merino, 25% Nylon', weightCategory:'Fingering', skeinWeightGrams:100, skeinYardage:437, quantity:2, cost:12, purchaseDate:'2025-12-30', isMulticolor:false, colors:[], primaryIndex:0, matchMode:'simple', colorHex:'#2a3a63', yardageRemaining:874, status:'available', allocatedTo:null, dateAdded:'2025-12-30' },
      { id:'y9', name:'Malabrigo Rios', brand:'Malabrigo', line:'Rios', colorway:'Camel', fiber:'100% Superwash Merino Wool', weightCategory:'Worsted', skeinWeightGrams:100, skeinYardage:210, quantity:3, cost:14, purchaseDate:'2025-11-20', isMulticolor:false, colors:[], primaryIndex:0, matchMode:'simple', colorHex:'#b98f5a', yardageRemaining:630, status:'available', allocatedTo:null, dateAdded:'2025-11-20' },
      { id:'y10', name:'Drops Safran', brand:'Drops', line:'Safran', colorway:'Powder Blue', fiber:'100% Cotton', weightCategory:'Sport', skeinWeightGrams:50, skeinYardage:175, quantity:5, cost:2.2, purchaseDate:'2026-01-14', isMulticolor:false, colors:[], primaryIndex:0, matchMode:'simple', colorHex:'#84b6d6', yardageRemaining:875, status:'available', allocatedTo:null, dateAdded:'2026-01-14' },
      { id:'y11', name:'Lion Brand 24/7 Cotton', brand:'Lion Brand', line:'24/7 Cotton', colorway:'Dusty Rose', fiber:'100% Mercerized Cotton', weightCategory:'Worsted', skeinWeightGrams:100, skeinYardage:186, quantity:4, cost:6.49, purchaseDate:'2026-02-08', isMulticolor:false, colors:[], primaryIndex:0, matchMode:'simple', colorHex:'#c98b95', yardageRemaining:744, status:'available', allocatedTo:null, dateAdded:'2026-02-08' },
      { id:'y12', name:'Berroco Vintage', brand:'Berroco', line:'Vintage', colorway:'Plum', fiber:'52% Acrylic, 40% Wool, 8% Nylon', weightCategory:'Worsted', skeinWeightGrams:100, skeinYardage:218, quantity:3, cost:9.5, purchaseDate:'2025-10-28', isMulticolor:false, colors:[], primaryIndex:0, matchMode:'simple', colorHex:'#5c3a72', yardageRemaining:654, status:'available', allocatedTo:null, dateAdded:'2025-10-28' }
    ],
    projects: [
      { id:'p1', name:"Teal Winter Cowl", patternName:'Cabled Cowl', status:'WIP', startDate:'2026-01-25', finishDate:null, garmentSize:'One size', garmentGender:'Unisex', paletteId:null, yarnIds:['y5'], yarnUsage:[{yarnId:'y5', yardageUsed:0}], yarnRequired:[{yarnId:'y5', yardage:400}], photos:[], links:[{ id:'l1', url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ', type:'youtube', title:'How to Cable Without a Cable Needle', thumbnail:null }], createdAt:'2026-01-25' },
      { id:'p2', name:"Mom's Garden Shawl", patternName:'Gardenia Shawl', status:'Finished', startDate:'2025-11-01', finishDate:'2025-12-20', garmentSize:'One size', garmentGender:"Women's", paletteId:'pal1', yarnIds:['y3','y4'], yarnUsage:[{yarnId:'y3', yardageUsed:520},{yarnId:'y4', yardageUsed:180}], yarnRequired:[{yarnId:'y3', yardage:520},{yarnId:'y4', yardage:180}], photos:[], links:[], createdAt:'2025-11-01' },
      { id:'p3', name:"Dad's Sweater", patternName:'Nordic Nights Pullover', status:'Planned', startDate:'2026-02-10', finishDate:null, garmentSize:'XL', garmentGender:"Men's", paletteId:null, yarnIds:['y1','y8'], yarnUsage:[], yarnRequired:[{yarnId:'y1', yardage:1500},{yarnId:'y8', yardage:400}], photos:[], links:[], createdAt:'2026-02-10' },
      { id:'p4', name:'Speckled Market Bag', patternName:'Summer Net Bag', status:'WIP', startDate:'2026-02-05', finishDate:null, garmentSize:null, garmentGender:null, paletteId:null, yarnIds:['y7'], yarnUsage:[{yarnId:'y7', yardageUsed:120}], yarnRequired:[{yarnId:'y7', yardage:300}], photos:[], links:[], createdAt:'2026-02-05' }
    ],
    palettes: [
      { id:'pal1', name:'Garden Complementary', harmony:'Complementary', matchMode:'balanced', baseYarnId:'y3', slots:[{ role:'Complement', yarnId:'y2', hex:'#a8342e', closeness:74 }], createdAt:'2025-11-01' },
      { id:'pal2', name:'Autumn Triad', harmony:'Triadic', matchMode:'balanced', baseYarnId:'y6', slots:[{ role:'Triad', yarnId:'y5', hex:'#3c7a72', closeness:68 },{ role:'Triad', yarnId:'y12', hex:'#5c3a72', closeness:61 }], createdAt:'2026-01-30' }
    ],
    shoppingList: [
      { id:'s1', colorName:'Sage green', hex:'#8faf7c', weight:'Worsted', fiber:'wool', yardage:200, quantity:2, note:'Complementary palette', sourceType:'palette', sourceId:'pal2', sourceName:'Autumn Triad palette', done:false, createdAt:'2026-02-09' },
      { id:'s2', colorName:null, hex:null, weight:'Worsted', fiber:null, yardage:600, quantity:1, note:'Project gap', sourceType:'project', sourceId:'p3', sourceName:"Dad's Sweater", done:false, createdAt:'2026-02-10' }
    ]
  };

  // Deep clone so edits during the session don't mutate the seed constant.
  let store = JSON.parse(JSON.stringify(seed));

  const PRESETS = [
    { brand:'Cascade Yarns', line:'220', fiber:'100% Peruvian Highland Wool', weightCategory:'Worsted', skeinWeightGrams:100, skeinYardage:220 },
    { brand:'Malabrigo', line:'Rios', fiber:'100% Superwash Merino Wool', weightCategory:'Worsted', skeinWeightGrams:100, skeinYardage:210 },
    { brand:'Drops', line:'Safran', fiber:'100% Cotton', weightCategory:'Sport', skeinWeightGrams:50, skeinYardage:175 },
    { brand:'Knit Picks', line:'Wool of the Andes Worsted', fiber:'100% Peruvian Highland Wool', weightCategory:'Worsted', skeinWeightGrams:50, skeinYardage:110 }
  ];

  // ---- The stubbed window.FB: same interface as firebase-init.js ----
  window.FB = {
    signIn(){ return Promise.resolve(); },
    signOutUser(){ return Promise.resolve(); },       // no-op in demo
    async signInEmail(){ return demoUser; },
    async signUpEmail(){ return demoUser; },
    async resendVerification(){ return; },
    async resetPassword(){ return; },
    async reloadUser(){ return demoUser; },
    isEmailVerified(){ return true; },
    async getIdToken(){ return 'demo-token'; },
    onAuthChange(cb){ setTimeout(()=>cb(demoUser), 0); return ()=>{}; },

    async loadUserData(){
      return {
        yarns: store.yarns,
        projects: store.projects,
        palettes: store.palettes,
        shoppingList: store.shoppingList
      };
    },
    async saveUserData(uid, data){
      // Persist to the in-memory store only — resets on refresh.
      store.yarns = data.yarns || [];
      store.projects = data.projects || [];
      store.palettes = data.palettes || [];
      store.shoppingList = data.shoppingList || [];
    },
    async loadPresets(){ return PRESETS; },
    async seedPresetsIfEmpty(){ return; },
    async addPreset(lineObj){ PRESETS.push(lineObj); },
    async uploadProjectPhoto(uid, projectId, blob){
      // Turn the uploaded blob into a local object URL so demo photos display
      // for the session without any storage backend.
      return URL.createObjectURL(blob);
    },
    async deletePhoto(){ return; }
  };

  // Signal readiness exactly like firebase-init.js does.
  window.dispatchEvent(new Event('firebase-ready'));

  // Where the "Sign up" / "Log in" buttons point. Set to your real app URL.
  window.WG_SIGNUP_URL = 'https://mikaylanorton.com/woolgather.html';

  // ---- Prominent demo banner with a sign-up call to action ----
  window.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.setAttribute('role','note');
    bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:100;background:#5C3A72;color:#fff;text-align:center;font-family:\'Work Sans\',sans-serif;font-size:0.82rem;padding:8px 14px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
    bar.innerHTML = '<span><strong>Live demo</strong> — sample data, nothing saves. Explore every feature freely.</span>'
      + '<a href="'+window.WG_SIGNUP_URL+'" style="background:#fff;color:#5C3A72;text-decoration:none;font-weight:600;border-radius:6px;padding:4px 12px;white-space:nowrap;">Sign up free →</a>';
    document.body.appendChild(bar);
    // Push app content down so the banner never covers the header.
    const wrapFix = document.createElement('style');
    wrapFix.textContent = '.wrap{ padding-top:52px !important; } .mobile-nav{ } ';
    document.head.appendChild(wrapFix);
  });
})();
