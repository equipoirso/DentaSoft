// index.js
// Selector de rol + login, con mensajes claros y redirección
(function(){
  let currentRole = null;
  const tiles = document.querySelectorAll('#role-tiles .tile');
  const badge = document.getElementById('role-badge');
  const chosen = document.getElementById('chosen-role');
  const formTitle = document.getElementById('form-title');
  const loginForm = document.getElementById('login-form');
  const msg = document.getElementById('msg');
  const email = document.getElementById('email');
  const password = document.getElementById('password');

  function setMsg(t, isError = false){
    if(!msg) return;
    msg.textContent = t || '';
    msg.classList.toggle('hidden', !t);
    msg.style.color = isError ? '#b91c1c' : '#111827';
  }

  // Elegir rol
  tiles.forEach(t => t.addEventListener('click', () => {
    tiles.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    currentRole = t.dataset.role;
    badge.textContent = currentRole === 'odontologo' ? 'Odontólogo/a' : 'Secretaría';
    chosen.classList.remove('hidden');
    formTitle.classList.remove('hidden');
    loginForm.classList.add('active');
    setMsg('');
    email.value = '';
    password.value = '';
  }));

  // Cancelar selección
  document.getElementById('btn-cancelar')?.addEventListener('click', ()=>{
    currentRole = null;
    email.value = '';
    password.value = '';
    setMsg('');
    loginForm.classList.remove('active');
    formTitle.classList.add('hidden');
    chosen.classList.add('hidden');
    tiles.forEach(x => x.classList.remove('active'));
  });

  // Login
  document.getElementById('btn-login')?.addEventListener('click', async () => {
    if(!currentRole){
      setMsg('Elegí un perfil (Odontólogo/a o Secretaría).', true);
      return;
    }
    const em = (email.value || '').trim();
    const pw = (password.value || '').trim();
    if(!em || !pw){
      setMsg('Completá email y contraseña.', true);
      return;
    }

    setMsg('Ingresando...');
    try{
      // Implementación esperada en common.js: window.Dentasoft.signIn(email, pass, role)
      await window.Dentasoft.signIn(em, pw, currentRole);
      // Guardamos el rol para otras pantallas si hace falta
      localStorage.setItem('ds_role', currentRole);
      window.location.href = currentRole === 'odontologo' ? './odonto.html' : './secretaria.html';
    }catch(e){
      console.error(e);
      setMsg(e?.message || 'Error al ingresar', true);
    }
  });
})();
