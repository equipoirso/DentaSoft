// public/secretaria-turnos.js
// UI mejorada: preview centrado, Fecha Inicio (date+hora 30'), Fecha Fin auto, Notas abajo.
// Reglas: L-V, 09:00–18:00 (último inicio 17:30). DNI = 8 números. Fines de semana bloqueados.

(async () => {
  // Bootstrap (usa tu helper de common.js)
  const { db, ensureRole } = await window.Dentasoft.ready();
  await ensureRole('secretaria');

  // --------- Utils ---------
  const $ = (sel, el = document) => el.querySelector(sel);
  const statusEl = $('#status');
  const setStatus = (msg, type = 'ok') => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.display = msg ? 'block' : 'none';
    statusEl.className = 'notice ' + (type === 'error' ? 'notice-error' : 'notice-ok');
  };
  const onlyDigits = (s) => (s || '').replace(/\D+/g, '');
  const isWeekday = (d) => { const x = d.getDay(); return x >= 1 && x <= 5; };
  const pad = (n) => String(n).padStart(2, '0');

  const toLocalDateTimeString = (d) =>
    `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  // --------- Elements ---------
  const form         = $('#formTurno');
  const selOdo       = $('#selOdo');

  const dniInput     = $('#pacienteDni');
  const btnBuscar    = $('#btnBuscarPaciente');
  const prevWrap     = $('#pacientePreview');
  const pNombre      = $('#pNombre');
  const pApellido    = $('#pApellido');
  const pEmail       = $('#pEmail');
  const pTelefono    = $('#pTelefono');
  const pObra        = $('#pObra');

  const motivoSel    = $('#motivo');
  const notasTxt     = $('#notas');

  const fiWrap       = $('#fiWrap');
  const fechaDia     = $('#fechaDia');
  const horaInicio   = $('#horaInicio');
  const fechaFinDisp = $('#fechaFinDisplay');

  const btnCancelar  = $('#btnCancelar');

  let pacienteLoaded = null;

  // --------- Cargar odontólogos activos ---------
  async function cargarOdontologos() {
    const qs = await db.collection('odontologos')
      .where('activo', '==', true)
      .orderBy('apellido', 'asc')
      .get();

    const opciones = [];
    qs.forEach(d => {
      const o = d.data();
      const etiqueta = `${o.apellido || ''}, ${o.nombre || ''} — Mat. ${o.matricula || ''}`.trim();
      opciones.push(`<option value="${o.uid}">${etiqueta}</option>`);
    });

    selOdo.innerHTML = opciones.length
      ? `<option value="">Elegí odontólogo</option>${opciones.join('')}`
      : `<option value="">No hay odontólogos activos</option>`;
  }
  await cargarOdontologos();

  // --------- DNI: solo números, exactamente 8 ---------
  dniInput?.addEventListener('input', (e) => {
    e.target.value = onlyDigits(e.target.value).slice(0, 8);
    if (e.target.value.length < 8) {
      prevWrap.style.display = 'none';
      pacienteLoaded = null;
    }
  });

  // --------- Buscar paciente por DNI ---------
  async function buscarPacientePorDni() {
    setStatus('');
    const dni = onlyDigits(dniInput.value);
    if (dni.length !== 8) {
      setStatus('Ingresá un DNI de 8 números para buscar.', 'error');
      prevWrap.style.display = 'none';
      pacienteLoaded = null;
      return;
    }

    const doc = await db.collection('pacientes').doc(dni).get();
    if (!doc.exists) {
      setStatus(`No se encontró paciente con DNI ${dni}.`, 'error');
      prevWrap.style.display = 'none';
      pacienteLoaded = null;
      return;
    }

    const p = doc.data();
    pacienteLoaded = p;

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

    prevWrap.style.display = 'block';
    setStatus('Paciente cargado.', 'ok');
  }
  btnBuscar?.addEventListener('click', buscarPacientePorDni);
  dniInput?.addEventListener('keyup', () => {
    if (dniInput.value.length === 8) setTimeout(buscarPacientePorDni, 80);
  });

  // --------- Fecha/Hora: abrir calendario al hacer click en cualquier parte ---------
  fiWrap?.addEventListener('click', (e) => {
    // si clickea en el select, no abrir date picker
    if (e.target === horaInicio) return;
    fechaDia.focus();
    if (typeof fechaDia.showPicker === 'function') {
      fechaDia.showPicker(); // Chrome/Edge modernos
    }
  });

  // --------- L-V, 09:00–18:00; duración 30' (horaInicio ya limita horas válidas) ---------
  function recomputeFin() {
    setStatus('');
    fechaFinDisp.value = '';

    // Validar fecha
    if (!fechaDia.value || !horaInicio.value) return;

    const [yyyy, mm, dd] = fechaDia.value.split('-').map(Number);
    const [hh, mi] = horaInicio.value.split(':').map(Number);

    const start = new Date(yyyy, (mm - 1), dd, hh, mi, 0, 0);

    // Bloquear fines de semana
    if (!isWeekday(start)) {
      setStatus('Solo se permiten turnos de lunes a viernes.', 'error');
      fechaDia.value = '';
      return;
    }

    // Último inicio 17:30 (select ya lo limita). Fin = +30'
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    fechaFinDisp.value = toLocalDateTimeString(end);
  }

  fechaDia?.addEventListener('change', recomputeFin);
  horaInicio?.addEventListener('change', recomputeFin);

  // --------- Cancelar ---------
  btnCancelar?.addEventListener('click', () => {
    form.reset();
    prevWrap.style.display = 'none';
    pacienteLoaded = null;
    fechaFinDisp.value = '';
    setStatus('Formulario limpiado.', 'ok');
    dniInput.focus();
  });

  // --------- Crear turno ---------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');

    // DNI
    const dni = onlyDigits(dniInput.value);
    if (dni.length !== 8) {
      setStatus('El DNI debe tener exactamente 8 números.', 'error');
      return;
    }
    if (!pacienteLoaded) {
      setStatus('Primero cargá el paciente con el DNI.', 'error');
      return;
    }

    // Odontólogo y motivo
    if (!selOdo.value) { setStatus('Elegí un odontólogo.', 'error'); return; }
    if (!motivoSel.value) { setStatus('Seleccioná un motivo.', 'error'); return; }

    // Fecha/hora
    if (!fechaDia.value || !horaInicio.value) {
      setStatus('Completá la fecha y la hora de inicio.', 'error');
      return;
    }
    const [yyyy, mm, dd] = fechaDia.value.split('-').map(Number);
    const [hh, mi] = horaInicio.value.split(':').map(Number);
    const fi = new Date(yyyy, (mm - 1), dd, hh, mi, 0, 0);
    if (!isWeekday(fi)) { setStatus('Solo L-V.', 'error'); return; }
    const ff = new Date(fi.getTime() + 30 * 60 * 1000);

    // Odontólogo legible
    const label = selOdo.options[selOdo.selectedIndex]?.text || '';
    const [apellidoYNombre] = label.split(' — Mat.');
    const odontologoNombre = (apellidoYNombre || '').trim();

    // Obra social descriptiva
    const p = pacienteLoaded;
    let obraDesc = '—';
    if (p.obraSocial && typeof p.obraSocial === 'object') {
      const t = p.obraSocial.tipo || '—';
      const n = p.obraSocial.nroAfiliado ? ` (${p.obraSocial.nroAfiliado})` : '';
      obraDesc = `${t}${n}`;
    } else if (typeof p.obraSocial === 'string') {
      obraDesc = p.obraSocial;
    }

    const data = {
      pacienteDni: dni,
      pacienteNombre: `${p.nombre || ''} ${p.apellido || ''}`.trim(),
      pacienteEmail: p.email || null,
      pacienteTelefono: p.telefono || null,
      pacienteObraSocial: obraDesc,

      profesionalUid: selOdo.value,
      odontologoNombre,

      motivo: motivoSel.value,
      notas: (notasTxt.value || '').trim() || null,

      fechaInicio: fi,
      fechaFin: ff,

      estado: 'programado',
      createdAt: new Date()
    };

    try {
      await db.collection('turnos').add(data);
      setStatus('Turno creado correctamente.', 'ok');
      form.reset();
      prevWrap.style.display = 'none';
      pacienteLoaded = null;
      fechaFinDisp.value = '';
      dniInput.focus();
    } catch (err) {
      console.error(err);
      const code = err?.code || '';
      if (code === 'permission-denied') {
        setStatus("Permiso denegado al escribir en 'turnos'. Revisá las reglas de Firestore.", 'error');
      } else {
        setStatus('Ocurrió un error al guardar el turno. Revisá la consola.', 'error');
      }
    }
  });
})();
