// public/odonto-reportes.js
(async function () {
  const { db, ensureRole } = await window.Dentasoft.ready();
  await ensureRole('odontologo');

  const $ = (id) => document.getElementById(id);

  const rDesde = $('rDesde');
  const rHasta = $('rHasta');
  const rUnDia = $('rUnDia');
  const rCalcular = $('rCalcular');
  const rLimpiar = $('rLimpiar');

  const rKpi = $('rKpi');
  const rDiario = $('rDiario');
  const rTableWrap = $('rTableWrap');
  const rDetalleT = $('rDetalleT');

  // Modal
  const diaModal = $('diaModal');
  const mTitulo = $('mTitulo');
  const mTbody  = $('mTbody');
  const mCerrar = $('mCerrar');
  const mCerrar2= $('mCerrar2');
  const closeModal = ()=> diaModal.hidden = true;
  mCerrar?.addEventListener('click', closeModal);
  mCerrar2?.addEventListener('click', closeModal);
  diaModal?.addEventListener('click', (e)=>{ if(e.target===diaModal) closeModal(); });

  // --- “Elegir un solo día” ---
  function syncUnDia() {
    if (rUnDia.checked) {
      if (rDesde.value) rHasta.value = rDesde.value;
      rHasta.disabled = true;
    } else {
      rHasta.disabled = false;
    }
  }
  rUnDia.addEventListener('change', syncUnDia);
  rDesde.addEventListener('change', () => { if (rUnDia.checked) rHasta.value = rDesde.value; });

  // --- Helpers de render ---
  const renderKPIs = (tot) => {
    rKpi.innerHTML = `
      <div class="kpi total">
        <div class="kpi-title">Total</div>
        <div class="kpi-value">${tot.total}</div>
      </div>
      <div class="kpi ok">
        <div class="kpi-title">Completados</div>
        <div class="kpi-value">${tot.completado}</div>
      </div>
      <div class="kpi cancel">
        <div class="kpi-title">Cancelados</div>
        <div class="kpi-value">${tot.cancelado}</div>
      </div>
      <div class="kpi defer">
        <div class="kpi-title">Pospuestos</div>
        <div class="kpi-value">${tot.pospuesto}</div>
      </div>
    `;
    rKpi.hidden = false;             // mostrar
    rKpi.style.display = '';         // por si quedó forzado
  };

  let detallesPorDia = {};

  const renderDiario = (diario) => {
    const rows = Object.entries(diario)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dia, c]) => `
        <tr>
          <td><a href="#" class="link" data-dia="${dia}">${dia}</a></td>
          <td class="num">${c.total}</td>
          <td class="num">${c.completado || 0}</td>
          <td class="num">${c.cancelado || 0}</td>
          <td class="num">${c.pospuesto || 0}</td>
        </tr>
      `).join('');
    rDiario.innerHTML = rows || `<tr><td colspan="5">Sin turnos en el rango seleccionado.</td></tr>`;
    rTableWrap.hidden = false;
    rDetalleT.hidden = false;

    rDiario.querySelectorAll('a[data-dia]').forEach(a=>{
      a.addEventListener('click', (ev)=>{
        ev.preventDefault();
        abrirModalDia(a.getAttribute('data-dia'));
      });
    });
  };

  // Cache simple de pacientes
  const pacienteCache = new Map();
  async function getPaciente(turno) {
    const d = { nombre: turno.pacienteNombre, dni: turno.pacienteDni };
    if (d.nombre && d.dni) return d;

    const pid = turno.pacienteId || turno.pacienteUid || turno.pacienteRef?.id || turno.pacienteDni;
    if (!pid) return { nombre: d.nombre || 'Paciente', dni: d.dni || '—' };

    if (pacienteCache.has(pid)) return pacienteCache.get(pid);

    try {
      const snap = await db.collection('pacientes').doc(String(pid)).get();
      let nombre='Paciente', dni='—';
      if (snap.exists) {
        const p = snap.data();
        nombre = d.nombre || p.nombreCompleto || [p.nombre, p.apellido].filter(Boolean).join(' ') || 'Paciente';
        dni = d.dni || p.dni || snap.id || '—';
      }
      const out = { nombre, dni };
      pacienteCache.set(pid, out);
      return out;
    } catch {
      return { nombre: d.nombre || 'Paciente', dni: d.dni || '—' };
    }
  }

  async function abrirModalDia(dia) {
    mTitulo.textContent = `Turnos del ${dia}`;
    const lista = detallesPorDia[dia] || [];

    const resolved = await Promise.all(lista.map(async (t) => {
      const pac = await getPaciente(t);
      return { ...t, pacienteNombre: pac.nombre, pacienteDni: pac.dni };
    }));

    resolved.sort((a,b) => a.hora.localeCompare(b.hora));

    mTbody.innerHTML = resolved.map(t => `
      <tr>
        <td>${t.hora}</td>
        <td>${t.pacienteNombre}</td>
        <td>${t.pacienteDni}</td>
        <td>${t.motivo || '-'}</td>
        <td>${(t.estado || 'programado').charAt(0).toUpperCase() + (t.estado || 'programado').slice(1)}</td>
      </tr>
    `).join('') || `<tr><td colspan="5">Sin turnos.</td></tr>`;

    diaModal.hidden = false;
  }

  // --- Calcular ---
  async function calcular() {
    const d = rDesde.value;
    const h = rHasta.value;
    if (!d) return alert('Elegí la fecha "Desde".');
    if (!rUnDia.checked && !h) return alert('Elegí la fecha "Hasta" o activá "Elegir un solo día".');
    if (!rUnDia.checked && d > h) return alert(`"Desde" no puede ser mayor que "Hasta".`);

    rCalcular.disabled = true;
    const oldText = rCalcular.textContent; rCalcular.textContent = 'Calculando…';

    try {
      const desde = new Date(d + 'T00:00:00');
      const hasta = new Date((rUnDia.checked ? d : h) + 'T23:59:59');
      const uid = firebase.auth().currentUser.uid;

      const snap = await db.collection('turnos')
        .where('profesionalUid', '==', uid)
        .where('fechaInicio', '>=', desde)
        .where('fechaInicio', '<=', hasta)
        .orderBy('fechaInicio', 'asc')
        .get();

      const tot = { total: 0, programado: 0, completado: 0, cancelado: 0, pospuesto: 0 };
      const diario = {};
      detallesPorDia = {};

      snap.forEach(doc => {
        const t = doc.data();
        const estado = (t.estado || 'programado').toLowerCase();
        const fecha = t.fechaInicio.toDate();
        const diaStr = fecha.toISOString().slice(0, 10);
        const hora   = fecha.toTimeString().slice(0,5);

        tot.total++;
        if (tot[estado] != null) tot[estado]++;

        diario[diaStr] ??= { total: 0, programado: 0, completado: 0, cancelado: 0, pospuesto: 0 };
        diario[diaStr].total++;
        diario[diaStr][estado] ??= 0; diario[diaStr][estado]++;

        detallesPorDia[diaStr] ??= [];
        detallesPorDia[diaStr].push({
          hora,
          estado,
          motivo: t.motivo || t.motivoConsulta || t.descripcion || null,
          pacienteNombre: t.pacienteNombre,
          pacienteDni: t.pacienteDni,
          pacienteId: t.pacienteId || t.pacienteUid || t.pacienteRef?.id || t.pacienteDni
        });
      });

      renderKPIs(tot);
      renderDiario(diario);
    } catch (e) {
      console.error(e);
      alert('No se pudieron cargar los reportes. Probá nuevamente.');
    } finally {
      rCalcular.disabled = false;
      rCalcular.textContent = oldText;
    }
  }

  // --- Limpiar (vuelve a cero) ---
  function limpiar() {
    // reset form
    $('rForm').reset();
    rHasta.disabled = false;     // por si estaba bloqueado
    // ocultar y vaciar resultados
    rKpi.hidden = true;
    rKpi.innerHTML = '';
    rKpi.style.display = 'none';
    rTableWrap.hidden = true;
    rDetalleT.hidden = true;
    rDiario.innerHTML = '';
    // cerrar modal si quedó abierto
    diaModal.hidden = true;
  }

  // Eventos
  rCalcular.addEventListener('click', calcular);
  rLimpiar.addEventListener('click', limpiar);
  $('rForm').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); calcular(); } });

  // Estado inicial
  limpiar();
})();
