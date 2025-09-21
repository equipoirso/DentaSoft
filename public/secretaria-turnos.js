// public/secretaria-turnos.js

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

  // --------- Elementos ---------
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

  // === Restricción: fecha mínima = HOY (local, sin UTC off-by-one) ===
  function hoyLocalYYYYMMDD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const HOY_MIN = hoyLocalYYYYMMDD();

  if (fechaDia) {
    // Setear min al cargar
    fechaDia.setAttribute('min', HOY_MIN);

    // Corregir si hubiera un valor previo inválido
    if (fechaDia.value && fechaDia.value < HOY_MIN) {
      fechaDia.value = HOY_MIN;
    }

    // Forzar restricción ante cambios manuales
    fechaDia.addEventListener('change', () => {
      if (fechaDia.value && fechaDia.value < HOY_MIN) {
        fechaDia.value = HOY_MIN;
      }
    });
  }

  // === Configuración de horario (turnos 30') ===
  const OPEN_FROM  = "09:00";
  const OPEN_TO    = "18:00";
  const LAST_START = "17:30"; // último inicio permitido (30' de duración)
  const STEP       = 1800;    // 30 minutos (en segundos)

  // Helpers de tiempo
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

  // Redondear hacia arriba al próximo múltiplo de 30'
  const roundUp30 = (date) => {
    const mins = date.getHours() * 60 + date.getMinutes();
    return minToStr(Math.ceil(mins / 30) * 30);
  };

  // Aplicar restricciones al selector de hora según la fecha elegida
  function aplicarRestriccionHora() {
    if (!fechaDia || !horaInicio) return;

    // Si no hay fecha, bloqueá la hora
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

      // Si ya pasó el último inicio, no hay turnos hoy
      if (toMin(minTime) > toMin(LAST_START)) {
        horaInicio.disabled = true;
        horaInicio.value = "";
        horaInicio.title = "No hay turnos disponibles para hoy.";
        return;
      }
    }

     // Para cualquier fecha válida, habilitá la hora
  horaInicio.disabled = false;
  horaInicio.removeAttribute('title');

  // Importante: el máximo debe ser el ÚLTIMO INICIO permitido (17:30)
  horaInicio.min = minTime;
  horaInicio.max = LAST_START;

  // Forzar valor al mínimo vigente si está vacío o por debajo
  if (!horaInicio.value || toMin(horaInicio.value) < toMin(minTime)) {
    horaInicio.value = minTime;
  } else if (toMin(horaInicio.value) > toMin(LAST_START)) {
    horaInicio.value = LAST_START;
  }
  }
  fechaDia?.addEventListener('input', aplicarRestriccionHora);
  horaInicio?.addEventListener('focus', aplicarRestriccionHora);
  horaInicio?.addEventListener('click', aplicarRestriccionHora);
  // Ejecutar cuando cambia la fecha y al cargar
  fechaDia?.addEventListener('change', aplicarRestriccionHora);
  aplicarRestriccionHora();

  // Clamp defensivo si el usuario escribe manualmente una hora
  horaInicio?.addEventListener('input', () => {
    if (!horaInicio.value) return;
    const minAttr = horaInicio.getAttribute('min') || OPEN_FROM;
    const maxAttr = horaInicio.getAttribute('max') || LAST_START;

    // Normalizar a pasos de 30' si el navegador deja escribir libre
    const [h, m] = horaInicio.value.split(':').map(Number);
    const mins = h * 60 + m;
    const snapped = minToStr(Math.round(mins / 30) * 30);
    if (snapped !== horaInicio.value) horaInicio.value = snapped;

    // Respetar min/max vigentes
    if (toMin(horaInicio.value) < toMin(minAttr)) {
      horaInicio.value = minAttr;
    } else if (toMin(horaInicio.value) > toMin(maxAttr)) {
      horaInicio.value = maxAttr;
    }
  });

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
    // Asegurar que solo se permitan dígitos y máximo 8
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);

    // Si tiene menos de 8 dígitos, ocultar preview y resetear paciente
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
    aplicarRestriccionHora();
    fechaDia.focus();
    if (typeof fechaDia.showPicker === 'function') {
      fechaDia.showPicker(); // Chrome/Edge modernos
    }
  });

  // --------- L-V, 09:00–18:00; duración 30' (horaInicio ya limita horas válidas) ---------
  function recomputeFin() {
    setStatus('');
    fechaFinDisp.value = '';

    // Validar fecha/hora
    if (!fechaDia.value || !horaInicio.value) return;

    const [yyyy, mm, dd] = fechaDia.value.split('-').map(Number);
    const [hh, mi] = horaInicio.value.split(':').map(Number);

    const start = new Date(yyyy, (mm - 1), dd, hh, mi, 0, 0);

    // Bloquear fines de semana
    if (!isWeekday(start)) {
      setStatus('Solo se permiten turnos de lunes a viernes.', 'error');
      fechaDia.value = '';
      aplicarRestriccionHora(); // re-aplica bloqueos de hora
      return;
    }

    // Fin = +30'
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
    aplicarRestriccionHora(); // re-evaluar bloqueos
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
      aplicarRestriccionHora(); // re-evaluar bloqueos post-reset
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