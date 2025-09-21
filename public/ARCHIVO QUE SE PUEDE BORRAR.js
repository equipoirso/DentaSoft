// Secretaría · Agenda de Turnos
// – Búsqueda por DNI (todas las fechas), vista diaria normal, cambio de estado
// – “Refrescar” vuelve a HOY y limpia filtros

(async()=>{
  const { db, ensureRole } = await window.Dentasoft.ready();
  await ensureRole('secretaria');

  const $ = (s, el=document)=> el.querySelector(s);

  // Controles
  const fecha = $('#fecha');
  const fOdo  = $('#fOdo');
  const fDni  = $('#fDni');

  const btnPrev = $('#btnPrev');
  const btnHoy  = $('#btnHoy');
  const btnNext = $('#btnNext');
  const btnRefrescar = $('#btnRefrescar');
  const btnImprimir  = $('#btnImprimir');
  const btnBuscarDni = $('#btnBuscarDni');
  const btnLimpiarDni= $('#btnLimpiarDni');

  const tbody   = $('#tbody');
  const statusEl= $('#status');

  let turnos = [];

  // Helpers
  const pad = n => String(n).padStart(2,'0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const ddmmyyyy = d => `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
  const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const toDateAny = x => x ? (typeof x.toDate==='function' ? x.toDate() : new Date(x)) : null;

  function setFecha(d){ fecha.value = ymd(d); }
  function parseInputDate(val){
    const p = (val||'').split('-');
    return p.length===3 ? new Date(+p[0], +p[1]-1, +p[2], 12,0,0,0) : new Date();
  }
  function showStatus(msg, ok=true){
    statusEl.style.display = msg ? 'block' : 'none';
    statusEl.textContent = msg || '';
    statusEl.className = 'notice ' + (ok ? 'notice-ok' : 'notice-error');
  }
  function clearStatus(){ showStatus(''); }

  function pill(estado){
    const e=(estado||'').toLowerCase();
    if(e==='completado' || e==='realizado') return '<span class="pill comp">completado</span>';
    if(e==='cancelado') return '<span class="pill canc">cancelado</span>';
    if(e==='pospuesto') return '<span class="pill posp">pospuesto</span>';
    return '<span class="pill prog">programado</span>';
  }

  // UX: abrir datepicker y limpiar DNI a números/8
  fecha.addEventListener('click', ()=>{ try{ fecha.showPicker && fecha.showPicker(); }catch{} });
  fDni.addEventListener('input', ()=>{ fDni.value = (fDni.value||'').replace(/\D+/g,'').slice(0,8); });

  // Datos maestros
  async function cargarOdontologos(){
    const qs = await db.collection('odontologos')
      .where('activo','==', true)
      .orderBy('apellido','asc').get();

    const opts = ['<option value="">Todos los odontólogos</option>'];
    qs.forEach(d=>{
      const o = d.data();
      const label = `${o.apellido||''}, ${o.nombre||''} — Mat. ${o.matricula||''}`.trim();
      opts.push(`<option value="${o.uid||''}">${label}</option>`);
    });
    fOdo.innerHTML = opts.join('');
  }

  function getDayRange(){
    const v = fecha.value; if(!v) return null;
    const [Y,M,D] = v.split('-').map(Number);
    const start = new Date(Y, M-1, D, 0,0,0,0);
    const end   = new Date(Y, M-1, D+1,0,0,0,0);
    return { start, end };
  }

  // Carga de turnos
  async function cargarTurnos(){
    clearStatus();

    const dniFilter = (fDni.value||'').trim();
    const odoFilter = fOdo.value;

    // A) Por DNI: todas las fechas
    if(/^\d{8}$/.test(dniFilter)){
      try{
        let q = db.collection('turnos').where('pacienteDni','==', dniFilter);
        if(odoFilter) q = q.where('profesionalUid','==', odoFilter);

        const snap = await q.get();
        turnos = snap.docs.map(d=>{
          const t = d.data();
          return {
            id: d.id,
            start: toDateAny(t.fechaInicio),
            end:   toDateAny(t.fechaFin),
            motivo: t.motivo || '—',
            estado: t.estado || 'programado',
            pacienteNombre: t.pacienteNombre || t?.paciente?.nombre || 'Paciente',
            pacienteDni: String(t.pacienteDni || t?.paciente?.dni || ''),
            odontologoNombre: t.odontologoNombre || '—'
          };
        }).filter(x=> x.start && x.end)
          .sort((a,b)=> a.start - b.start);

        renderTabla();
        showStatus(`Turnos de DNI ${dniFilter}: ${turnos.length} (todas las fechas)`, true);
      }catch(err){
        console.error(err);
        showStatus('No se pudo cargar por DNI (¿reglas/índices?).', false);
      }
      return;
    }

    // B) Vista diaria normal
    const range = getDayRange();
    if(!range){ showStatus('Elegí una fecha para ver la agenda.', false); return; }

    try{
      let q = db.collection('turnos')
        .where('fechaInicio','>=', range.start)
        .where('fechaInicio','<',  range.end)
        .orderBy('fechaInicio','asc');

      if(odoFilter) q = q.where('profesionalUid','==', odoFilter);

      const snap = await q.get();
      turnos = snap.docs.map(d=>{
        const t = d.data();
        return {
          id: d.id,
          start: toDateAny(t.fechaInicio),
          end:   toDateAny(t.fechaFin),
          motivo: t.motivo || '—',
          estado: t.estado || 'programado',
          pacienteNombre: t.pacienteNombre || t?.paciente?.nombre || 'Paciente',
          pacienteDni: String(t.pacienteDni || t?.paciente?.dni || ''),
          odontologoNombre: t.odontologoNombre || '—'
        };
      }).filter(x=> x.start && x.end);

      renderTabla();
      showStatus(`Turnos cargados: ${turnos.length}`, true);
    }catch(err){
      console.error(err);
      showStatus('No se pudo cargar la agenda (¿índice pendiente?).', false);
    }
  }

  // Render con columnas amplias para Paciente y Motivo (sin solaparse)
  function renderTabla(){
    if(!turnos.length){
      tbody.innerHTML = '<tr><td class="center" colspan="7">Sin turnos para mostrar.</td></tr>';
      return;
    }
    tbody.innerHTML = turnos.map(t=>{
      const ftxt = ddmmyyyy(t.start);
      const hora = `${hhmm(t.start)}–${hhmm(t.end)}`;
      return `
      <tr>
        <td class="center nowrap">${ftxt}</td>
        <td class="center nowrap">${hora}</td>
        <td class="left">
          ${t.pacienteNombre}
          <div><small>(${t.pacienteDni || '—'})</small></div>
        </td>
        <td class="left">${t.motivo}</td>
        <td class="center">${pill(t.estado)}</td>
        <td class="center">${t.odontologoNombre}</td>
        <td class="actions">
          <div class="actions" style="justify-content:center;gap:8px">
            <select class="selEstado" data-id="${t.id}">
              <option value="programado" ${t.estado==='programado'?'selected':''}>programado</option>
              <option value="completado" ${t.estado==='completado' || t.estado==='realizado'?'selected':''}>completado</option>
              <option value="cancelado" ${t.estado==='cancelado'?'selected':''}>cancelado</option>
              <option value="pospuesto" ${t.estado==='pospuesto'?'selected':''}>pospuesto</option>
            </select>
            <button class="btn btn-sm btn-primary" data-save="${t.id}" disabled>Guardar</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // Habilitar Guardar cuando cambia el estado
  tbody.addEventListener('change', (e)=>{
    if(e.target.matches('select.selEstado')){
      const td = e.target.closest('td');
      const btn = td.querySelector('button[data-save]');
      btn.disabled = false;
    }
  });

  // Guardar cambio de estado
  tbody.addEventListener('click', async (e)=>{
    const b = e.target.closest('button[data-save]');
    if(!b) return;
    const id = b.getAttribute('data-save');
    const sel = b.closest('td').querySelector('select.selEstado');
    const nuevo = sel.value;

    b.disabled = true;
    try{
      await db.collection('turnos').doc(id).set({ estado: nuevo, updatedAt: new Date() }, { merge:true });
      const it = turnos.find(x=> x.id===id);
      if(it) it.estado = nuevo;
      renderTabla();
      showStatus('Estado actualizado.', true);
    }catch(err){
      console.error(err);
      showStatus('No se pudo actualizar el estado.', false);
      b.disabled = false;
    }
  });

  // Navegación diaria
  btnHoy.addEventListener('click', ()=>{ setFecha(new Date()); cargarTurnos(); });
  btnPrev.addEventListener('click', ()=>{ const v=parseInputDate(fecha.value); v.setDate(v.getDate()-1); setFecha(v); cargarTurnos(); });
  btnNext.addEventListener('click', ()=>{ const v=parseInputDate(fecha.value); v.setDate(v.getDate()+1); setFecha(v); cargarTurnos(); });

  // Filtros
  fecha.addEventListener('change', cargarTurnos);
  fOdo.addEventListener('change', cargarTurnos);
  btnBuscarDni.addEventListener('click', cargarTurnos);
  btnLimpiarDni.addEventListener('click', ()=>{ fDni.value=''; cargarTurnos(); });
  fDni.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); cargarTurnos(); } });

  // Refrescar (reinicia todo)
  btnRefrescar.addEventListener('click', ()=>{
    fOdo.value = '';
    fDni.value = '';
    setFecha(new Date());
    cargarTurnos();
    showStatus('Vista reiniciada.', true);
  });

  // Imprimir (sin acciones)
  btnImprimir.addEventListener('click', ()=>{
    const rows = tbody.innerHTML.replace(/<td class="actions"[\s\S]*?<\/td>/g,'<td></td>');
    const dni = (fDni.value||'').trim();
    const titulo = /^\d{8}$/.test(dni) ? `Agenda · DNI ${dni}` : `Agenda ${fecha.value||''}`;
    const w = window.open('', '_blank');
    w.document.write(`
      <!doctype html><html><head><meta charset="utf-8">
      <title>${titulo}</title>
      <style>
        @page{margin:16mm}
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
        h1{font-size:18pt;margin:0 0 8px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ddd;padding:6px;text-align:center;font-size:11pt}
        th{text-align:center}
      </style>
      </head><body>
      <h1>${titulo}</h1>
      <table>
        <thead><tr><th>Fecha</th><th>Hora</th><th>Paciente</th><th>Motivo</th><th>Estado</th><th>Odontólogo</th><th>Acciones</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.addEventListener('load',function(){setTimeout(function(){print()},50)})<\/script>
      </body></html>
    `);
    w.document.close();
  });

  // Init
  await cargarOdontologos();
  setFecha(new Date());
  await cargarTurnos();
})();
