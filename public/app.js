<!-- Agregá estos scripts en las páginas donde uses Firebase -->
<script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-functions-compat.js"></script>

<script>
  // ⚠️ Reemplazá con tus credenciales de Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyBcLHEo5ZaSkqNb8MuGX8F5co7oPYlsIl8",
    authDomain: "dentasoft-7ed6d.firebaseapp.com",
    projectId: "dentasoft-7ed6d",
    storageBucket: "dentasoft-7ed6d.firebasestorage.app",
    messagingSenderId: "498527484809",
    appId: "1:498527484809:web:62c3c440a480e0fca87f58"
  };   
  
  firebase.initializeApp(firebaseConfig);

  // SDKs
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  window.functions = firebase.app().functions('us-central1'); // región por defecto
</script>
