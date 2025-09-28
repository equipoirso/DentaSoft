(function(){
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const remember = document.getElementById('remember');
  const btnLogin = document.getElementById('btn-login');
  const btnClear = document.getElementById('btn-clear');
  const msg = document.getElementById('msg');
  function setMsg(t){ msg.textContent=t; msg.classList.add('show'); msg.classList.remove('hidden'); }
  function clearMsg(){ msg.textContent=''; msg.classList.remove('show'); }

  // Prefill if remembered
  const saved = localStorage.getItem('ds_saved_email');
  if(saved){ email.value = saved; remember.checked = true; }

  btnLogin.addEventListener('click', async ()=>{
    setMsg('Ingresando...');
    try{
      if(remember.checked) localStorage.setItem('ds_saved_email', email.value.trim());
      else localStorage.removeItem('ds_saved_email');
      await window.Dentasoft.signIn(email.value.trim(), password.value.trim(), 'odontologo');
      location.href = './odonto.html';
    }catch(e){ setMsg(e.message||'No se pudo ingresar'); }
  });

  btnClear.addEventListener('click', ()=>{ email.value=''; password.value=''; clearMsg(); });
})();