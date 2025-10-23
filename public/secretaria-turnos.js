// public/secretaria-turnos.js
(async () => {
  // Bootstrap
  const { db, ensureRole } = await window.Dentasoft.ready();
  await ensureRole('secretaria');

  // --------- Utils ---------
  const $ = (sel, el = document) => el.querySelector(sel);
  const statusEl = $('#status');

  // Mensajes (verde éxito / rojo error)
  const setStatus = (msg, type = 'ok') => {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.style.display = msg ? 'block' : 'none';
    statusEl.className = 'notice ' + (type === 'error' ? 'error' : 'ok');
  };

  const onlyDigits = (s) => (s || '').replace(/\D+/g, '');
  const isWeekday = (d) => { const x = d.getDay(); return x >= 1 && x <= 5; };
  const pad = (n) => String(n).padStart(2, '0');
  const toLocalDateTimeString = (d) =>
    `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  // --------- Elementos ---------
  const form         = $('#formTurno');
  const selOdo       = $('#selOdo');
  const pDni         = $('#pDni'); // (si lo tenés en el preview)
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

  // === Fecha mínima = HOY ===
  function hoyLocalYYYYMMDD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const HOY_MIN = hoyLocalYYYYMMDD();

  if (fechaDia) {
    fechaDia.setAttribute('min', HOY_MIN);
    if (fechaDia.value && fechaDia.value < HOY_MIN) fechaDia.value = HOY_MIN;
    fechaDia.addEventListener('change', () => {
      if (fechaDia.value && fechaDia.value < HOY_MIN) fechaDia.value = HOY_MIN;
    });
  }

  // === Configuración de horario (turnos 30') ===
  const OPEN_FROM  = "09:00";
  const LAST_START = "17:30";  // último inicio permitido (termina 18:00)
  const STEP       = 1800;     // 30 minutos (en segundos)

  const toMin = (hhmm) => {
    const [h, m] = (hhmm || "00:00").split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const minToStr = (mins) =>
    `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

  const todayStrLocal = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const roundUp30 = (date) => {
    const mins = date.getHours() * 60 + date.getMinutes();
    return minToStr(Math.ceil(mins / 30) * 30);
  };

  function aplicarRestriccionHora() {
    if (!fechaDia || !horaInicio) return;

    if (!fechaDia.value) {
      horaInicio.disabled = true;
      horaInicio.value = "";
      return;
    }

    horaInicio.step = STEP;

    const esHoy = fechaDia.value === todayStrLocal();
    let minTime = OPEN_FROM;

    if (esHoy) {
      let nextSlot = roundUp30(new Date());
      if (toMin(nextSlot) < toMin(OPEN_FROM)) nextSlot = OPEN_FROM;
      minTime = nextSlot;

      if (toMin(minTime) > toMin(LAST_START)) {
        horaInicio.disabled = true;
        horaInicio.value = "";
        horaInicio.title = "No hay turnos disponibles para hoy.";
        return;
      }
    }

    horaInicio.disabled = false;
    horaInicio.removeAttribute('title');

    horaInicio.min = minTime;
    horaInicio.max = LAST_START;

    if (!horaInicio.value || toMin(horaInicio.value) < toMin(minTime)) {
      horaInicio.value = minTime;
    } else if (toMin(horaInicio.value) > toMin(LAST_START)) {
      horaInicio.value = LAST_START;
    }
  }
  fechaDia?.addEventListener('input', aplicarRestriccionHora);
  horaInicio?.addEventListener('focus', aplicarRestriccionHora);
  horaInicio?.addEventListener('click', aplicarRestriccionHora);
  fechaDia?.addEventListener('change', aplicarRestriccionHora);
  aplicarRestriccionHora();

  // Clamp defensivo si el usuario escribe manualmente una hora
  horaInicio?.addEventListener('input', () => {
    if (!horaInicio.value) return;
    const minAttr = horaInicio.getAttribute('min') || OPEN_FROM;
    const maxAttr = horaInicio.getAttribute('max') || LAST_START;

    const [h, m] = horaInicio.value.split(':').map(Number);
    const mins = h * 60 + m;
    const snapped = minToStr(Math.round(mins / 30) * 30);
    if (snapped !== horaInicio.value) horaInicio.value = snapped;

    if (toMin(horaInicio.value) < toMin(minAttr)) {
      horaInicio.value = minAttr;
    } else if (toMin(horaInicio.value) > toMin(maxAttr)) {
      horaInicio.value = maxAttr;
    }
  });

  let pacienteLoaded = null;

  // --------- Cargar odontólogos activos (ordenados por apellido) ---------
  async function cargarOdontologos() {
    const qs = await db.collection('odontologos')
      .where('activo', '==', true)
      .orderBy('apellido', 'asc')
      .get();

    const opciones = ['<option value="">Elegí odontólogo</option>'];

    qs.forEach(d => {
      const o = d.data();
      const etiqueta = `${o.apellido || ''}, ${o.nombre || ''} — Mat. ${o.matricula || ''}`.trim();

      if (o.uid) {
        // Tiene cuenta (UID)
        opciones.push(
          `<option value="${o.uid}" data-mat="${o.matricula || ''}" data-hasuid="1">${etiqueta}</option>`
        );
      } else {
        // Sin cuenta: usamos prefijo "mat:" para diferenciar el valor
        opciones.push(
          `<option value="mat:${o.matricula || ''}" data-mat="${o.matricula || ''}" data-hasuid="0">${etiqueta} (sin usuario)</option>`
        );
      }
    });

    selOdo.innerHTML = opciones.join('');
  }
  await cargarOdontologos();

  // --------- DNI: solo números, exactamente 8 ---------
  dniInput?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
    // Ya NO buscamos automáticamente: si cambia el texto, ocultamos el preview
    prevWrap.style.display = 'none';
    pacienteLoaded = null;
  });

  // --------- Buscar paciente por DNI (SOLO con botón) ---------
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

    if (pDni) pDni.textContent = dni;   // mostrar DNI si existe ese span
    pNombre.textContent   = p.nombre || '';
    pApellido.textContent = p.apellido || '';
    pEmail.textContent    = p.email || '—';
    pTelefono.textContent = p.telefono || p.telefonoE164 || '—';

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

  // --------- Fecha/Hora: facilitar interacción ---------
  fiWrap?.addEventListener('click', (e) => {
    if (e.target === horaInicio) return;
    aplicarRestriccionHora();
    fechaDia.focus();
    if (typeof fechaDia.showPicker === 'function') {
      fechaDia.showPicker();
    }
  });

  // --------- Recalcular fin (auto +30') ---------
  function recomputeFin() {
    setStatus('');
    fechaFinDisp.value = '';

    if (!fechaDia.value || !horaInicio.value) return;

    const [yyyy, mm, dd] = fechaDia.value.split('-').map(Number);
    const [hh, mi] = horaInicio.value.split(':').map(Number);

    const start = new Date(yyyy, (mm - 1), dd, hh, mi, 0, 0);

    if (!isWeekday(start)) {
      setStatus('Solo se permiten turnos de lunes a viernes.', 'error');
      fechaDia.value = '';
      aplicarRestriccionHora();
      return;
    }

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
    aplicarRestriccionHora();
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
      setStatus('Primero buscá y cargá el paciente con el botón “Buscar”.', 'error');
      return;
    }

    // Motivo
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

    // ---- Odontólogo seleccionado (acepta UID o matrícula)
    const selOpt = selOdo.options[selOdo.selectedIndex];
    if (!selOpt || !selOpt.value) { setStatus('Elegí un odontólogo.', 'error'); return; }

    const rawVal = selOpt.value;                       // "UID..." o "mat:ABC123"
    const profesionalMatricula = selOpt.dataset.mat || null;
    const tieneUid = selOpt.dataset.hasuid === '1';

    let profesionalUid = null;
    if (rawVal.startsWith('mat:')) {
      profesionalUid = null;                           // sin usuario vinculado
    } else {
      profesionalUid = rawVal;                         // es un UID real
    }

    // Nombre legible
    const label = selOpt.textContent || '';
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
      pacienteTelefono: p.telefono || p.telefonoE164 || null,
      pacienteObraSocial: obraDesc,

      profesionalUid,                 // puede ser null si no tiene usuario
      profesionalMatricula,           // SIEMPRE guardamos la matrícula
      odontologoNombre,

      motivo: motivoSel.value,
      notas: (notasTxt.value || '').trim() || null,

      fechaInicio: fi,
      fechaFin: ff,

      estado: 'programado',
      createdAt: new Date()
    };

    try {
      // 1) Guardar el turno
      await db.collection('turnos').add(data);

      // 2) Registrar también en Historia Clínica del paciente
      await db.collection('pacientes').doc(dni)
        .collection('historial')
        .add({
          fecha: fi,                                // Timestamp inicio del turno
          motivo: motivoSel.value || '-',           // Motivo
          estadoTurno: 'programado',                // Estado inicial
          pagado: false,                            // Por defecto
          odontologoNombre,                         // Legible
          descripcion: (notasTxt.value || '').trim() || '' // Notas
        });

      // Éxito
      setStatus('✅ Turno creado correctamente.', 'ok');  // VERDE
      form.reset();
      prevWrap.style.display = 'none';
      pacienteLoaded = null;
      fechaFinDisp.value = '';
      aplicarRestriccionHora();
      dniInput.focus();

    } catch (err) {
      console.error(err);
      const code = err?.code || '';
      if (code === 'permission-denied') {
        setStatus("Permiso denegado al escribir en 'turnos' o 'historial'. Revisá las reglas de Firestore.", 'error');
      } else {
        setStatus('Ocurrió un error al guardar el turno. Revisá la consola.', 'error');
      }
    }
  });
})();
