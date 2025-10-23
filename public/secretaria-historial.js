// public/secretaria-historial.js
(async function () {
  const { db, ensureRole } = await window.Dentasoft.ready();
  await ensureRole('secretaria');

  const $ = (id) => document.getElementById(id);

  // Buscador
  const pDni     = $('pDni');
  const pBuscar  = $('pBuscar');
  const pLimpiar = $('pLimpiar');

  // Secciones
  const datosCard = $('datosCard');
  const histCard  = $('histCard');
  const pDatos    = $('pDatos');
  const histTable = $('histTable');
  const histTbody = $('histTbody');

  // Modal
  const visitModal  = $('visitModal');
  const vmClose     = $('vmClose');
  const vmClose2    = $('vmClose2');
  const vmFecha     = $('vmFecha');
  const vmHora      = $('vmHora');
  const vmMotivo    = $('vmMotivo');
  const vmEstado    = $('vmEstado');
  const vmPago      = $('vmPago');
  const vmNotas     = $('vmNotas');

  const esc = (s = '') =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const fmtFecha = (v) => {
    if (!v) return { fecha: '-', hora: '-' };
    const d = v.toDate ? v.toDate() : new Date(v);
    const fecha = d.toLocaleDateString();
    const hora  = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { fecha, hora };
  };

  function resetUI() {
    datosCard.classList.add('hidden');
    histCard.classList.add('hidden');
    pDatos.innerHTML = '';
    histTbody.innerHTML = '';
  }

  function syncBuscarState(){
    const hasDni = !!(pDni?.value || '').trim();
    if (pBuscar) pBuscar.disabled = !hasDni;
  }

  function estadoPill(estadoRaw) {
    const e = String(estadoRaw || '-').toLowerCase();
    const cls =
      e.includes('complet') ? 'pill-success' :
      e.includes('cancel')  ? 'pill-danger'  :
      'pill-muted';
    return `<span class="pill ${cls}">${esc(estadoRaw || '-')}</span>`;
  }

  function openModal(data){
    vmFecha.textContent  = data.fecha || '-';
    vmHora.textContent   = data.hora  || '-';
    vmMotivo.textContent = data.motivo || '-';
    vmEstado.textContent = data.estado || '-';
    vmPago.textContent   = data.pagado || '-';
    vmNotas.textContent  = data.notas && data.notas.trim() ? data.notas : '-';

    visitModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    visitModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function buscar() {
    const dni = (pDni.value || '').replace(/\D/g, '');
    resetUI();
    if (!dni) return;

    // ---- Paciente
    const ps = await db.collection('pacientes').doc(dni).get();
    if (!ps.exists) {
      datosCard.classList.remove('hidden');
      pDatos.innerHTML = `<div class="notice">No existe el paciente.</div>`;
      return;
    }

    const p = ps.data();
    const obra = p.obraSocial || p.obra_social || p.os || '-';

    // Panel de datos (k/v, igual que Odontólogo)
    datosCard.classList.remove('hidden');
    pDatos.innerHTML = `
      <div class="kv"><span class="k">DNI</span><span class="v">${esc(p.dni || dni)}</span></div>
      <div class="kv"><span class="k">Nombre</span><span class="v">${esc(p.nombre || '-')}</span></div>
      <div class="kv"><span class="k">Apellido</span><span class="v">${esc(p.apellido || '-')}</span></div>
      <div class="kv"><span class="k">Obra social</span><span class="v">${esc(obra)}</span></div>
      <div class="kv"><span class="k">Email</span><span class="v">${esc(p.email || '-')}</span></div>
      <div class="kv"><span class="k">Teléfono</span><span class="v">${esc(p.telefonoE164 || p.telefono || '-')}</span></div>
    `;

    // ---- Historial
    const qs = await db.collection('pacientes').doc(dni)
      .collection('historial')
      .orderBy('fecha', 'desc')
      .get();

    histCard.classList.remove('hidden');

    if (qs.empty) {
      histTbody.innerHTML = `<tr><td colspan="6"><div class="notice">Sin visitas registradas</div></td></tr>`;
      return;
    }

    const rows = [];
    qs.forEach((doc) => {
      const h = doc.data();
      const f = fmtFecha(h.fecha);
      const estado = h.estadoTurno || h.estado || '-';
      const motivo = h.motivo || '-';
      const pagoTxt = (typeof h.pagado === 'boolean') ? (h.pagado ? 'Sí' : 'No')
                    : (String(h.pagado) === 'true' ? 'Sí' : 'No');
      const notas = h.descripcion ? String(h.descripcion) : '';
      const hayNotas = !!(notas && notas.trim());

      rows.push(`
        <tr>
          <td>${esc(f.fecha)}</td>
          <td>${esc(f.hora)}</td>
          <td>${esc(motivo)}</td>
          <td>${estadoPill(estado)}</td>
          <td>${esc(pagoTxt)}</td>
          <td>
            ${hayNotas
              ? `<button class="btn btn-primary btn-sm btn-notas"
                    data-fecha="${esc(f.fecha)}"
                    data-hora="${esc(f.hora)}"
                    data-motivo="${esc(motivo)}"
                    data-estado="${esc(estado)}"
                    data-pagado="${esc(pagoTxt)}"
                    data-notas="${esc(notas)}">Ver notas</button>`
              : '—'}
          </td>
        </tr>
      `);
    });

    histTbody.innerHTML = rows.join('');
  }

  // Eventos
  pBuscar?.addEventListener('click', buscar);
  pDni?.addEventListener('keydown', (e) => { if (e.key === 'Enter') buscar(); });

  pLimpiar?.addEventListener('click', () => {
    pDni.value = '';
    resetUI();
    syncBuscarState();
    pDni.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  pDni?.addEventListener('input', syncBuscarState);

  // Delegación: abrir modal desde la tabla
  histTable.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-notas');
    if (!btn) return;

    openModal({
      fecha:  btn.getAttribute('data-fecha'),
      hora:   btn.getAttribute('data-hora'),
      motivo: btn.getAttribute('data-motivo'),
      estado: btn.getAttribute('data-estado'),
      pagado: btn.getAttribute('data-pagado'),
      notas:  btn.getAttribute('data-notas') || ''
    });
  });

  vmClose.addEventListener('click', closeModal);
  vmClose2.addEventListener('click', closeModal);
  visitModal.addEventListener('click', (e) => { if (e.target.dataset.close) closeModal(); });

  // Estado inicial del botón "Buscar"
  syncBuscarState();
})();
