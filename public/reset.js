(function(){
  const email = document.getElementById('email');
  const msg = document.getElementById('msg');
  document.getElementById('btn-send').addEventListener('click', async ()=>{
    msg.classList.remove('hidden'); msg.textContent='Enviando...';
    try{
      await window.Dentasoft.resetPassword(email.value.trim());
      msg.textContent='Listo. Revisá tu email para crear/cambiar la contraseña.';
    }catch(e){
      console.error(e); msg.textContent = e.message || 'No se pudo enviar el email';
    }
  });
})();