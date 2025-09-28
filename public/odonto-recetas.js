// public/odonto-recetas.js
(async function () {
  const { ensureRole, db, auth } = await window.Dentasoft.ready();
  await ensureRole('odontologo');

  // ---- DOM ----
  const $dni        = document.getElementById('recDni');
  const $dniError   = document.getElementById('dniError');
  const $form       = document.getElementById('formBuscar');
  const $btnBuscar  = document.getElementById('btnBuscar');
  const $btnLimpiar = document.getElementById('btnLimpiar');

  const $wrapPac    = document.getElementById('pacienteWrapper');
  const $box        = document.getElementById('pacienteBox');

  const $wrapRec    = document.getElementById('recetaWrapper');
  const $txt        = document.getElementById('recTexto');
  const $btnCrear   = document.getElementById('btnCrear');
  const $btnCancel  = document.getElementById('btnCancelar');
  const $status     = document.getElementById('statusMsg');

  // ---- Perfil del odontólogo (para el PDF) ----
  let odontologo = { nombre:'', apellido:'', matricula:'', cuit:'', email:'' };
  try {
    const uid = auth.currentUser?.uid;
    if (uid) {
      let snap = await db.collection('odontologos').doc(uid).get();
      if (!snap.exists) {
        const q = await db.collection('odontologos').where('uid','==',uid).limit(1).get();
        snap = q.empty ? null : q.docs[0];
      }
      if (snap && (snap.exists !== false)) {
        const d = snap.data() || {};
        odontologo = {
          nombre:   d.nombre   || '',
          apellido: d.apellido || '',
          matricula:d.matricula || d.matriculaNacional || d.matriculaProvincial || '',
          cuit:     d.cuit || '',
          email:    d.email || auth.currentUser?.email || ''
        };
      }
    }
  } catch (e) { console.warn('No se pudo cargar odontólogo', e); }

  // ---- Validación de DNI: solo números, máx 8 ----
  $dni.addEventListener('input', () => {
    $dni.value = $dni.value.replace(/\D+/g, '').slice(0, 8);
    if ($dni.value.length === 8) hideDniError();
  });

  // ---- Buscar paciente por DNI ----
  $form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!/^\d{8}$/.test($dni.value)) {
      showDniError();
      return;
    }
    clearStatus();
    try {
      setLoading(true);

      const dni = $dni.value;
      let snap = await db.collection('pacientes').doc(dni).get();
      if (!snap.exists) {
        const q = await db.collection('pacientes').where('dni', '==', dni).limit(1).get();
        snap = q.empty ? null : q.docs[0];
      }
      if (!snap || (snap.exists === false)) {
        hidePaciente(); hideReceta();
        return setStatus('No se encontró un paciente con ese DNI.', 'warn');
      }

      const p = { id: snap.id, ...snap.data() };
      renderPaciente(p);
      showReceta();
      $btnCrear.disabled = false;
      $txt.focus();
      setStatus('', 'info');
    } catch (err) {
      console.error(err);
      hidePaciente(); hideReceta();
      setStatus('Error al buscar el paciente. Intente nuevamente.', 'error');
    } finally {
      setLoading(false);
    }
  });

  // ---- Limpiar (DNI) ----
  $btnLimpiar.addEventListener('click', () => {
    $form.reset();
    $dni.value = '';
    hideDniError();
    hidePaciente();
    hideReceta();
    clearStatus();
    $dni.focus();
  });

  // ---- Crear PDF ----
  $btnCrear.addEventListener('click', () => {
    const card = $box.querySelector('[data-paciente]');
    if (!card) return setStatus('Primero busque un paciente.', 'error');

    const dni = card.getAttribute('data-dni') || '';
    const nom = card.getAttribute('data-nombre') || '';
    const ape = card.getAttribute('data-apellido') || '';
    const tel = card.getAttribute('data-telefono') || '-';
    const os  = card.getAttribute('data-os') || '-';

    const texto = ($txt.value || '').trim();
    if (!texto) { $txt.focus(); return setStatus('Escriba el texto de la receta.', 'error'); }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'A4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const M = 56;
    let y = M;

    const fecha = new Date();

    pdf.setFontSize(18);
    pdf.text('Receta Odontológica', M, y); y += 24;

    pdf.setFontSize(12);
    const fullOd = [odontologo.apellido, odontologo.nombre].filter(Boolean).join(', ') || 'Odontólogo';
    pdf.text(`Odontologo: ${fullOd}`, M, y); y += 16;
    if (odontologo.matricula) { pdf.text(`Matrícula: ${odontologo.matricula}`, M, y); y += 16; }
    if (odontologo.cuit)      { pdf.text(`CUIT: ${odontologo.cuit}`, M, y); y += 16; }
    if (odontologo.email)     { pdf.text(`Email: ${odontologo.email}`, M, y); y += 16; }

    y += 8;

    pdf.setFont(undefined, 'bold');
    pdf.text('Paciente', M, y); pdf.setFont(undefined, 'normal'); y += 14;
    pdf.text(`Nombre: ${[ape, nom].filter(Boolean).join(', ')}`, M, y); y += 16;
    pdf.text(`DNI: ${dni}`, M, y); y += 16;
    pdf.text(`Teléfono: ${tel}   ·   Obra social: ${os}`, M, y); y += 22;
    pdf.text(`Fecha: ${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}`, M, y); y += 24;

    const anchoTexto = pageW - M*2;
    const lineas = pdf.splitTextToSize(texto, anchoTexto);
    pdf.text(lineas, M, y);
    y += lineas.length * 14 + 36;

    const boxH = 90;
    pdf.setDrawColor(120);
    pdf.roundedRect(M, y, anchoTexto, boxH, 8, 8);
    pdf.text('Firma y sello:', M + 12, y + 22);

    pdf.save(`receta_${dni}.pdf`);
    setStatus('PDF generado correctamente.', 'ok');
  });

  // ---- Cancelar (reinicia todo) ----
  $btnCancel.addEventListener('click', () => {
    $form.reset();
    $dni.value = '';
    $txt.value = '';
    hideDniError();
    hidePaciente();
    hideReceta();
    clearStatus();
    $dni.focus();
  });

  // ---- Helpers UI ----
  function renderPaciente(p) {
    $wrapPac.classList.remove('hidden');
    $box.innerHTML = `
      <div class="paciente-card" data-paciente
           data-dni="${esc(p.dni || p.id || '')}"
           data-nombre="${esc(p.nombre || p.nombreCompleto || '')}"
           data-apellido="${esc(p.apellido || '')}"
           data-telefono="${esc(p.telefono || p.celular || '-')}"
           data-os="${esc(p.obraSocial || '-')}">
        <div class="pac-head pac-head--left">Datos del paciente</div>
        <div class="pac-grid">
          <div><span class="k k-blue">DNI</span><span class="v">${esc(p.dni || p.id || '')}</span></div>
          <div><span class="k k-blue">Nombre</span><span class="v">${esc(p.nombre || p.nombreCompleto || '')}</span></div>
          <div><span class="k k-blue">Apellido</span><span class="v">${esc(p.apellido || '')}</span></div>
          <div><span class="k k-blue">Teléfono</span><span class="v">${esc(p.telefono || p.celular || '-')}</span></div>
          <div class="full"><span class="k k-blue">Obra social</span><span class="v">${esc(p.obraSocial || '-')}</span></div>
        </div>
      </div>
    `;
  }
  function showReceta(){ $wrapRec.classList.remove('hidden'); }
  function hideReceta(){ $wrapRec.classList.add('hidden'); $txt.value=''; $btnCrear.disabled = true; }
  function hidePaciente(){ $wrapPac.classList.add('hidden'); $box.innerHTML=''; }
  function setLoading(v){ $btnBuscar.disabled = v; $btnBuscar.textContent = v ? 'Buscando…' : 'Buscar'; }
  function setStatus(msg, type='info'){ $status.textContent = msg; $status.className = `status ${type}`; }
  function clearStatus(){ $status.textContent=''; $status.className='status muted'; }
  function showDniError(){ $dniError.classList.remove('hidden'); $dni.focus(); }
  function hideDniError(){ $dniError.classList.add('hidden'); }
  function esc(s){ return String(s||'').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
})();
