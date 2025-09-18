// public/secretaria-historial.js
// Cambios clave:
// - Título "Agregar nueva visita" y "Visitas registradas" centrados.
// - Campo "Fecha de la visita" (datetime-local) con valor por defecto = ahora.
// - Un único separador entre DNI y "Agregar nueva visita" (el HTML ya lo resolvió).
// - En "Visitas registradas": Ver/Ocultar a la derecha; al abrir, ocultamos el hint;
//   botones Imprimir/Cancelar se ubican ABAJO y centrados.

(async()=>{
  // --- Seguridad ---
  const { db, ensureRole } = await window.Dentasoft.ready();
  await ensureRole('secretaria');

  // --- Helpers ---
  const $  = (sel, el=document) => el.querySelector(sel);
  const onlyDigits = (s) => (s || '').replace(/\D+/g, '');
  const fmtDateTime = (d) => new Intl.DateTimeFormat('es-AR', { dateStyle:'short', timeStyle:'short' }).format(d);
  const toLocalDTValue = (d) => {
    const p = (n)=> String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  // --- Refs DOM ---
  const hDni     = $('#hDni');
  const hBuscar  = $('#hBuscar');

  const pPrev    = $('#pacientePreview');
  const pNombre  = $('#pNombre');
  const pApellido= $('#pApellido');
  const pEmail   = $('#pEmail');
  const pTelefono= $('#pTelefono');
  const pObra    = $('#pObra');

  const form       = $('#formHist');
  const selOdo     = $('#selOdo');
  const fechaInput = $('#fechaVisita');
  const btnCancel  = $('#btnCancelar');
  const statusEl   = $('#status');

  const btnToggleVisitas = $('#btnToggleVisitas');
  const btnPrintVisitas  = $('#btnPrintVisitas');
  const btnCerrarVisitas = $('#btnCerrarVisitas');
  const visitasWrap      = $('#visitasWrap');
  const visitasHint      = $('#visitasHint');
  const hLista           = $('#hLista');

  let currentDni = null;
  let visitasVisible = false;

  // --- Mensajes ---
  function setStatus(msg, type='ok'){
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.style.display = msg ? 'block' : 'none';
    statusEl.className = 'notice ' + (type === 'error' ? 'notice-error' : 'notice-ok');
  }

  // --- 1) Cargar odontólogos activos ---
  async function cargarOdontologos(){
    const qs = await db.collection('odontologos')
      .where('activo','==', true)
      .orderBy('apellido','asc')
      .get();

    const options = [];
    qs.forEach(d=>{
      const o = d.data();
      const etiqueta = `${o.apellido||''}, ${o.nombre||''} — Mat. ${o.matricula||''}`.trim();
      options.push(`<option value="${o.uid}">${etiqueta}</option>`);
    });

    selOdo.innerHTML = options.length
      ? `<option value="">Elegí odontólogo</option>${options.join('')}`
      : `<option value="">No hay odontólogos activos</option>`;
  }
  await cargarOdontologos();

  // --- 2) DNI: 8 dígitos + Enter para buscar ---
  hDni?.addEventListener('input', (e)=>{
    e.target.value = onlyDigits(e.target.value).slice(0,8);
  });
  hDni?.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter') { e.preventDefault(); buscarPaciente(); }
  });
  hBuscar?.addEventListener('click', buscarPaciente);

  // --- 3) Buscar paciente y render ---
  async function buscarPaciente(){
    setStatus('');
    const dni = onlyDigits(hDni.value);
    if (dni.length !== 8){
      setStatus('Ingresá un DNI de 8 dígitos.', 'error');
      return;
    }

    const doc = await db.collection('pacientes').doc(dni).get();
    if (!doc.exists){
      currentDni = null;
      pPrev.style.display = 'none';
      bloquearPanelVisitas();
      setStatus('No existe el paciente.', 'error');
      return;
    }

    const p = doc.data();
    currentDni = dni;

    // Datos (obra social puede ser string u objeto)
    pNombre.textContent   = p.nombre || '';
    pApellido.textContent = p.apellido || '';
    pEmail.textContent    = p.email || '—';
    pTelefono.textContent = p.telefono || '—';
    if (p.obraSocial && typeof p.obraSocial === 'object') {
      const t = p.obraSocial.tipo || '—';
      const n = p.obraSocial.nroAfiliado ? ` (${p.obraSocial.nroAfiliado})` : '';
      pObra.textContent = `${t}${n}`;
    } else if (typeof p.obraSocial === 'string') {
      pObra.textContent = p.obraSocial;
    } else {
      pObra.textContent = '—';
    }
    pPrev.style.display = 'block';

    // Prefill fecha de visita con "ahora"
    if (fechaInput) fechaInput.value = toLocalDTValue(new Date());

    // Habilitar panel “Visitas registradas”
    btnToggleVisitas.disabled = false;
    visitasWrap.style.display = 'none';
    visitasVisible = false;
    btnToggleVisitas.textContent = 'Ver visitas';

    // Hint visible cuando ya hay paciente pero aún no abrimos la lista
    visitasHint.textContent = 'Usá “Ver visitas” para cargar la lista.';
    visitasHint.style.display = 'block';

    hLista.innerHTML = '';
    btnPrintVisitas.disabled = true; // se habilita cuando haya contenido
  }

  // --- 4) Ver/Ocultar visitas ---
  btnToggleVisitas?.addEventListener('click', async ()=>{
    if (!currentDni) return;
    if (!visitasVisible) {
      await listarVisitas();              // carga
      visitasWrap.style.display = 'block';
      btnToggleVisitas.textContent = 'Ocultar visitas';
      visitasVisible = true;

      // Ocultar hint al mostrar la lista
      visitasHint.style.display = 'none';
    } else {
      visitasWrap.style.display = 'none';
      btnToggleVisitas.textContent = 'Ver visitas';
      visitasVisible = false;

      // Mostrar hint nuevamente mientras la lista está cerrada
      visitasHint.textContent = 'Usá “Ver visitas” para cargar la lista.';
      visitasHint.style.display = currentDni ? 'block' : 'none';
    }
  });

  async function listarVisitas(){
    const qs = await db.collection('pacientes').doc(currentDni)
      .collection('historial')
      .orderBy('fecha','desc')
      .get();

    if (qs.empty) {
      hLista.innerHTML = '<li>Sin visitas</li>';
      btnPrintVisitas.disabled = true;
      return;
    }

    const items = [];
    qs.forEach(d=>{
      const h = d.data();
      const f = h.fecha?.toDate ? h.fecha.toDate() : (h.fecha || new Date());
      const prof = h.odontologoNombre ? ` — Profesional: ${h.odontologoNombre}` : '';
      const pago = h.pagado ? 'Pagado' : 'Sin pago';
      const notas = h.descripcion ? `<br>${h.descripcion}` : '';
      items.push(`<li>${fmtDateTime(f)} — ${h.motivo} — ${h.estadoTurno} — ${pago}${prof}${notas}</li>`);
    });
    hLista.innerHTML = items.join('');
    btnPrintVisitas.disabled = false; // hay contenido
  }

  function bloquearPanelVisitas(){
    btnToggleVisitas.disabled = true;
    visitasWrap.style.display = 'none';
    visitasVisible = false;
    btnToggleVisitas.textContent = 'Ver visitas';
    hLista.innerHTML = '';
    btnPrintVisitas.disabled = true;

    // Hint por defecto cuando no hay paciente cargado
    visitasHint.textContent = 'Buscá un paciente para habilitar este panel.';
    visitasHint.style.display = 'block';
  }

  // --- 5) Guardar nueva visita ---
  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    setStatus('');

    if (!currentDni) { setStatus('Buscá primero un paciente.', 'error'); return; }

    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.odontologoUid) { setStatus('Elegí un odontólogo.', 'error'); return; }
    if (!data.motivo)        { setStatus('Seleccioná un motivo.', 'error'); return; }
    if (!data.estadoTurno)   { setStatus('Indicá el estado.', 'error'); return; }

    // Fecha: si el input está vacío, usamos "ahora"
    if (data.fechaVisita) {
      data.fecha = new Date(data.fechaVisita);
    } else {
      data.fecha = new Date();
    }
    delete data.fechaVisita;

    data.pagado = (data.pagado === 'true');

    // Etiqueta legible del profesional
    const label = selOdo.options[selOdo.selectedIndex]?.text || '';
    const [apellidoYNombre] = label.split(' — Mat.');
    data.odontologoNombre = (apellidoYNombre || '').trim();

    try {
      await db.collection('pacientes').doc(currentDni)
        .collection('historial').add(data);

      setStatus('Visita guardada correctamente.', 'ok');
      form.reset();
      // Prefill nuevamente la fecha con "ahora" para la próxima carga
      if (fechaInput) fechaInput.value = toLocalDTValue(new Date());

      // Si la lista está visible, refrescarla
      if (visitasVisible) await listarVisitas();

    } catch (err) {
      console.error(err);
      const code = err?.code || '';
      if (code === 'permission-denied') {
        setStatus("Permiso denegado al escribir en 'historial'. Revisá reglas.", 'error');
      } else {
        setStatus('Ocurrió un error al guardar la visita.', 'error');
      }
    }
  });

  // --- 6) Cancelar (panel principal): borra TODO, incl. DNI y datos ---
  btnCancel?.addEventListener('click', ()=>{
    form.reset();
    if (fechaInput) fechaInput.value = ''; // sin fecha
    hDni.value = '';
    setStatus('Formulario y búsqueda limpiados.', 'ok');

    // ocultar datos y bloquear historial
    pPrev.style.display = 'none';
    currentDni = null;
    bloquearPanelVisitas();

    hDni.focus();
  });

  // --- 7) Botones SOLO del historial ---
  // 7.a) Cerrar historial (no afecta al resto)
  btnCerrarVisitas?.addEventListener('click', ()=>{
    visitasWrap.style.display = 'none';
    btnToggleVisitas.textContent = 'Ver visitas';
    visitasVisible = false;
    // vuelve a verse el hint de “Ver visitas…”
    if (currentDni) {
      visitasHint.textContent = 'Usá “Ver visitas” para cargar la lista.';
      visitasHint.style.display = 'block';
    }
  });

  // 7.b) Imprimir historial (PDF desde diálogo de impresión)
  btnPrintVisitas?.addEventListener('click', ()=>{
    if (!currentDni) return;
    const itemsHtml = hLista.innerHTML.trim();
    if (!itemsHtml || itemsHtml === '<li>Sin visitas</li>') return;

    const nombre = pNombre.textContent || '';
    const apellido = pApellido.textContent || '';
    const email = pEmail.textContent || '—';
    const telefono = pTelefono.textContent || '—';
    const obra = pObra.textContent || '—';
    const ahora = fmtDateTime(new Date());

    const w = window.open('', '_blank');
    w.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Historial de visitas</title>
        <style>
          @page { margin: 16mm; }
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.35; }
          h1 { font-size: 18pt; margin: 0 0 10px; }
          h2 { font-size: 13pt; margin: 16px 0 8px; }
          .meta { font-size: 10pt; color: #444; margin-bottom: 8px; }
          .box { border:1px solid #999; border-radius:8px; padding:10px; }
          ul { padding-left: 18px; margin: 6px 0 0; }
          li { margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <h1>Historial de visitas</h1>
        <div class="meta">Generado: ${ahora}</div>
        <div class="box">
          <div><strong>Paciente:</strong> ${nombre} ${apellido}</div>
          <div><strong>DNI:</strong> ${currentDni}</div>
          <div><strong>Email:</strong> ${email} &nbsp; &nbsp; <strong>Teléfono:</strong> ${telefono}</div>
          <div><strong>Obra Social:</strong> ${obra}</div>
        </div>
        <h2>Visitas</h2>
        <div class="box">
          <ul>${itemsHtml}</ul>
        </div>
        <script>
          window.addEventListener('load', function(){
            window.focus();
            setTimeout(function(){ window.print(); }, 50);
          });
        </script>
      </body>
      </html>
    `);
    w.document.close();
  });
})();
