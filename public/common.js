// common.js – Inicialización central de Firebase + helpers Dentasoft
// - Auth con persistencia LOCAL
// - Firestore con caché offline
// - Exposición de Functions (us-central1) para callable sendReminder
// - Helpers: signIn, resetPassword, ensureRole, isPremium, getPatientEmailByDni, sendReminder

window.Dentasoft = (function () {
  let _app, _auth, _db, _functions;

  // Utilidades
  const isEightDigits = (s) => /^\d{8}$/.test(String(s || '').trim());
  const sanitizeDni = (s) => String(s || '').replace(/\D/g, '').slice(0, 8);

  function init() {
    if (_app) return;

    // ⚠️ Reemplazá con tu config si cambió.
    const firebaseConfig = {
      apiKey: "AIzaSyBcLHEo5ZaSkqNb8MuGX8F5co7oPYlsIl8",
      authDomain: "dentasoft-7ed6d.firebaseapp.com",
      projectId: "dentasoft-7ed6d",
      // storageBucket habitual en Firebase:
      storageBucket: "dentasoft-7ed6d.appspot.com",
      messagingSenderId: "498527484809",
      appId: "1:498527484809:web:62c3c440a480e0fca87f58",
      measurementId: "G-Q433JV3MG5",
    };

    // Evitar doble init
    _app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);

    // Auth
    _auth = firebase.auth();
    // Persistencia local (mantiene sesión entre recargas)
    _auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

    // Firestore
    _db = firebase.firestore();
    // Opcional: ignorar undefined en writes
    try { _db.settings({ ignoreUndefinedProperties: true }); } catch {}
    // Caché offline (si falla por múltiples tabs, no rompe)
    _db.enablePersistence && _db.enablePersistence().catch(() => {});

    // Functions (region por defecto: us-central1 – cambiala si usaste otra)
    _functions = _app.functions ? _app.functions("us-central1") : firebase.app().functions("us-central1");
  }

  async function ready() {
    init();
    // Esperar primer tick de auth state
    await new Promise((res) => {
      const un = _auth.onAuthStateChanged(() => {
        un();
        res();
      });
    });
    return {
      app: _app,
      auth: _auth,
      db: _db,
      functions: _functions,
      ensureRole,
      isPremium,
      getPatientEmailByDni,
      sendReminder,
      sanitizeDni,
      isEightDigits,
    };
  }

  // Sign-in con control de rol inicial (como en tu versión original)
  async function signIn(email, password, expectedRole) {
    init();
    const cred = await _auth.signInWithEmailAndPassword(email, password);
    const user = cred.user;

    const ref = _db.collection("users").doc(user.uid);
    const snap = await ref.get();
    let role = snap.exists ? (snap.data().role || "desconocido") : "desconocido";

    // Si no existe aún, se “autoasigna” el rol esperado al crear el doc
    if (!snap.exists && expectedRole) {
      await ref.set(
        {
          role: expectedRole,
          plan: "free",
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      role = expectedRole;
    }

    if (expectedRole && role !== expectedRole) {
      await _auth.signOut();
      throw new Error("Tu usuario no tiene acceso a " + expectedRole);
    }
    return user;
  }

  function resetPassword(email) {
    init();
    return _auth.sendPasswordResetEmail(email);
  }

  async function ensureRole(role) {
    init();
    const user = _auth.currentUser;
    if (!user) {
      window.location.href = "./index.html";
      return;
    }
    const snap = await _db.collection("users").doc(user.uid).get();
    const r = snap.exists ? (snap.data().role || "desconocido") : "desconocido";
    if (r !== role) {
      alert("No tenés acceso a esta sección.");
      window.location.href = "./index.html";
    }
  }

  async function isPremium() {
    init();
    const user = _auth.currentUser;
    if (!user) return false;
    const snap = await _db.collection("users").doc(user.uid).get();
    return snap.exists && snap.data().plan === "premium";
  }

  // ------- NUEVO: Helpers de Secretaría / Avisos --------

  // Busca patients/{dni} y retorna el email si existe (o null)
  async function getPatientEmailByDni(dni) {
    init();
    const clean = sanitizeDni(dni);
    if (!isEightDigits(clean)) throw new Error("DNI inválido (8 dígitos).");
    const snap = await _db.collection("patients").doc(clean).get();
    if (!snap.exists) return null;
    return snap.data().email || null;
  }

  // Llama a la Cloud Function sendReminder (SendGrid)
  async function sendReminder({ to, subject, html }) {
    init();
    if (!to || !subject || !html) throw new Error("Faltan campos: to, subject, html");
    const callable = _functions.httpsCallable("sendReminder");
    return callable({ to, subject, html });
  }

  return {
    ready,
    signIn,
    resetPassword,
    ensureRole,
    isPremium,
    // Exponemos helpers/instancias que pueden necesitar otras páginas
    getPatientEmailByDni,
    sendReminder,
    sanitizeDni,
    isEightDigits,
  };
})();
