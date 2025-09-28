// Secretaría: proteger acceso con rol
(async()=>{
  const { ensureRole } = await window.Dentasoft.ready();
  await ensureRole('secretaria');
})();
