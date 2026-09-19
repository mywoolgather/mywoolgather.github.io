import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import {
    getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    sendPasswordResetEmail, sendEmailVerification, deleteUser
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
  import {
    getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, deleteDoc,
    initializeFirestore, persistentLocalCache, persistentMultipleTabManager
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
  import {
    getStorage, ref, uploadBytes, getDownloadURL, deleteObject
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

  const firebaseConfig = {
    apiKey: "AIzaSyAtt-elOm66NuX9KXlp2QlZz_7tB5SKZOs",
    authDomain: "woolgather-5c173.firebaseapp.com",
    projectId: "woolgather-5c173",
    storageBucket: "woolgather-5c173.firebasestorage.app",
    messagingSenderId: "666603709729",
    appId: "1:666603709729:web:4e6239461e670a8e418a60"
};

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  // Firestore with on-device persistent cache: everything you've loaded
  // (stash, projects) is kept locally and served automatically when offline.
  // This is what makes read-only offline viewing work. Falls back to a plain
  // in-memory Firestore if the browser blocks persistence (e.g. private mode).
  let db;
  try{
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  }catch(e){
    console.warn('Persistent Firestore cache unavailable, using default:', e);
    db = getFirestore(app);
  }
  const storage = getStorage(app);
  const provider = new GoogleAuthProvider();

  window.FB = {
    signIn(){
      return signInWithPopup(auth, provider).catch(err => {
        console.error(err);
        wgToast("Sign-in failed: " + err.message, "error");
      });
    },
    signOutUser(){ return signOut(auth); },
    // Email/password auth. These throw on error (bad password, email in use,
    // etc.); the app catches and shows friendly messages. New sign-ups get a
    // verification email sent immediately.
    async signInEmail(email, password){
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    },
    async signUpEmail(email, password){
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      try{ await sendEmailVerification(cred.user); }catch(e){ console.warn('verification send failed', e); }
      return cred.user;
    },
    async resendVerification(){
      if(auth.currentUser) await sendEmailVerification(auth.currentUser);
    },
    async resetPassword(email){
      await sendPasswordResetEmail(auth, email);
    },
    async reloadUser(){
      if(auth.currentUser){ await auth.currentUser.reload(); return auth.currentUser; }
      return null;
    },
    isEmailVerified(){
      const u = auth.currentUser;
      if(!u) return false;
      // Google (and other federated) accounts are inherently verified; only
      // email/password sign-ups need the verification gate.
      const isPasswordUser = u.providerData.some(p=>p.providerId==='password');
      return !isPasswordUser || u.emailVerified;
    },
    async getIdToken(){ return auth.currentUser ? await auth.currentUser.getIdToken() : null; },
    onAuthChange(cb){ return onAuthStateChanged(auth, cb); },

    async loadUserData(uid){
      const snap = await getDoc(doc(db, 'stashes', uid));
      return snap.exists() ? snap.data() : null;
    },
    async saveUserData(uid, data){
      await setDoc(doc(db, 'stashes', uid), data);
    },

    async loadPresets(){
      const snap = await getDoc(doc(db, 'presets', 'brands'));
      return snap.exists() ? (snap.data().lines || null) : null;
    },
    // Only ever succeeds if the doc doesn't exist yet (see security rules above).
    async seedPresetsIfEmpty(defaultLines){
      try{
        await setDoc(doc(db, 'presets', 'brands'), { lines: defaultLines });
      }catch(e){
        // Expected once the doc already exists — client writes are denied by design.
      }
    },
    // Appends one preset to the existing array. Firestore rules restrict this
    // update to the admin account, so this will reject for anyone else.
    async addPreset(lineObj){
      await updateDoc(doc(db, 'presets', 'brands'), { lines: arrayUnion(lineObj) });
    },

    // Project photos, stored under projectPhotos/{uid}/{projectId}/{filename}.
    async uploadProjectPhoto(uid, projectId, blob, filename){
      const storageRef = ref(storage, `projectPhotos/${uid}/${projectId}/${filename}`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    },
    async deletePhoto(url){
      try{ await deleteObject(ref(storage, url)); }
      catch(e){ /* already gone or never existed — nothing to clean up */ }
    },
    /* Full account teardown: delete the user's data doc, then the Auth user.
       (Storage photos are best-effort deleted by the app before calling this,
       since it holds the URLs.) deleteUser throws requires-recent-login if the
       session is stale — the app surfaces that with a friendly message. */
    async deleteAccount(){
      const user = auth.currentUser;
      if(!user) throw new Error('Not signed in');
      try{ await deleteDoc(doc(db, 'stashes', user.uid)); }catch(e){ /* may not exist */ }
      await deleteUser(user);
    },
    /* Support message — written to a 'support' collection you can read in the
       Firebase console; a Cloud Function can watch it to email you. */
    async sendSupport(payload){
      const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
      await setDoc(doc(db, 'support', id), payload);
    }
  };

  // Tip-jar links shown in Settings → "Support the developer". Fill in your
  // real funding URLs (Ko-fi, Buy Me a Coffee, PayPal.me, etc.); leave the
  // array empty to hide the tip options. Opening these just navigates to your
  // funded page — no payment happens inside the app.
  window.WG_TIP_LINKS = [
    // { label: 'Buy me a coffee ☕', url: 'https://buymeacoffee.com/yourname' },
    { label: 'Buy me a tea ☕', url: 'https://ko-fi.com/cozyplantygirl'},
  ];

  window.dispatchEvent(new Event('firebase-ready'));
