window.Dentasoft = (function(){
  let _auth, _db;
  function init(){
    if(_auth) return;
    const firebaseConfig = {
  apiKey: "AIzaSyBcLHEo5ZaSkqNb8MuGX8F5co7oPYlsIl8",
  authDomain: "dentasoft-7ed6d.firebaseapp.com",
  projectId: "dentasoft-7ed6d",
  storageBucket: "dentasoft-7ed6d.firebasestorage.app",
  messagingSenderId: "498527484809",
  appId: "1:498527484809:web:62c3c440a480e0fca87f58",
  measurementId: "G-Q433JV3MG5"
    };
    firebase.initializeApp(firebaseConfig);
    _auth = firebase.auth();
    _db = firebase.firestore();
  }
  async function ready(){
    init();
    await new Promise(res => { const u = _auth.onAuthStateChanged(()=>{u();res();}); });
    return { app: firebase.app(), auth: _auth, db: _db, ensureRole, isPremium };
  }
  async function signIn(email, password, expectedRole){
    init();
    const cred = await _auth.signInWithEmailAndPassword(email, password);
    const user = cred.user;
    const doc = await _db.collection('users').doc(user.uid).get();
    let role = doc.exists ? (doc.data().role || 'desconocido') : 'desconocido';
    if(!doc.exists && expectedRole){
      await _db.collection('users').doc(user.uid).set({
        role: expectedRole,
        plan: 'free',
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      role = expectedRole;
    }
    if(expectedRole && role !== expectedRole){
      await _auth.signOut();
      throw new Error('Tu usuario no tiene acceso a ' + expectedRole);
    }
    return user;
  }
  function resetPassword(email){ init(); return _auth.sendPasswordResetEmail(email); }
  async function ensureRole(role){
    init();
    const user = _auth.currentUser;
    if(!user){ window.location.href='./index.html'; return; }
    const doc = await _db.collection('users').doc(user.uid).get();
    const r = doc.exists ? (doc.data().role || 'desconocido') : 'desconocido';
    if(r !== role){ alert('No tenés acceso a esta sección.'); window.location.href = './index.html'; }
  }
  async function isPremium(){
    init();
    const user = _auth.currentUser;
    if(!user) return false;
    const doc = await _db.collection('users').doc(user.uid).get();
    return doc.exists && (doc.data().plan === 'premium');
  }
  return { ready, signIn, resetPassword, ensureRole, isPremium };
})();