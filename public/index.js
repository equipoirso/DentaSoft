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

  function setMsg(t){ if(!msg) return; msg.textContent=t; msg.classList.remove('hidden'); }

  tiles.forEach(t => t.addEventListener('click', () => {
    tiles.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    currentRole = t.dataset.role;
    badge.textContent = currentRole === 'odontologo' ? 'Odontólogo/a' : 'Secretaría';
    chosen.classList.remove('hidden');
    formTitle.classList.remove('hidden');
    loginForm.classList.add('active');
    if(msg) msg.classList.add('hidden');
    email.value = ''; password.value = '';
  }));

  document.getElementById('btn-cancelar').addEventListener('click', ()=>{
    currentRole=null; email.value=''; password.value=''; if(msg) msg.classList.add('hidden');
    loginForm.classList.remove('active'); formTitle.classList.add('hidden'); chosen.classList.add('hidden');
    tiles.forEach(x => x.classList.remove('active'));
  });

  document.getElementById('btn-login').addEventListener('click', async () => {
    if(!currentRole){ setMsg('Elegí un perfil (Odontólogo/a o Secretaría).'); return; }
    setMsg('Ingresando...');
    try{
      await window.Dentasoft.signIn(email.value.trim(), password.value.trim(), currentRole);
      window.location.href = currentRole === 'odontologo' ? './odonto.html' : './secretaria.html';
    }catch(e){
      console.error(e);
      setMsg(e.message || 'Error al ingresar');
    }
  });
})();