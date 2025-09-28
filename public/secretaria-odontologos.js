(async()=>{
  const { db, ensureRole } = await window.Dentasoft.ready();
  await ensureRole('secretaria');

  const form = document.getElementById('formOdo');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.activo = data.activo === "true";
    const id = (data.matricula || "").trim();
    if(!id) return alert("Ingresá la matrícula");
    if(!data.uid) return alert("Pegá el UID del odontólogo (desde Auth)");

    await db.collection('odontologos').doc(id).set({
      ...data,
      matricula: id,
      actualizadoEn: new Date()
    }, { merge: true });

    const s = document.getElementById('status');
    s.textContent = "Odontólogo guardado correctamente";
    s.style.display='block';
    form.reset();
  });
})();
