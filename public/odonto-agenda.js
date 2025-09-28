// Agenda del Odontólogo — Lista diaria con navegación y tabla alineada.
// - “Siguiente”/“Anterior” robustos (parseo manual de yyyy-mm-dd).
// - El datepicker se abre clickeando en cualquier parte del input.
// - “Refrescar” limpia la grilla.
// - Acciones: solo “Ver notas” (si existen visitas con ese turnoId).

(async()=>{
  const { auth, db, ensureRole } = await window.Dentasoft.ready();
  await ensureRole('odontologo');

  // ---- Refs UI
  var dFecha = document.getElementById('dFecha');
  var dPrev = document.getElementById('dPrev');
  var dHoy  = document.getElementById('dHoy');
  var dNext = document.getElementById('dNext');
  var dRefrescar = document.getElementById('dRefrescar');
  var dTbody = document.getElementById('dTbody');
  var dStatus = document.getElementById('dStatus');

  // ---- Utils
  function fmt2(n){ return String(n).padStart(2,'0'); }
  function ymd(d){ return d.getFullYear()+'-'+fmt2(d.getMonth()+1)+'-'+fmt2(d.getDate()); }
  function hhmm(d){ return fmt2(d.getHours())+':'+fmt2(d.getMinutes()); }
  function toDateAny(x){ if(!x) return null; if(typeof x.toDate==='function') return x.toDate(); return new Date(x); }
  function parseInputDate(val){
    if(!val) return new Date();
    var p = val.split('-');
    if(p.length===3){
      return new Date(Number(p[0]), Number(p[1])-1, Number(p[2]), 12, 0, 0, 0); // mediodía local para evitar TZ raras
    }
    return new Date(val);
  }
  function setStatus(msg, ok){ if(ok===void 0) ok=true; dStatus.textContent=msg; dStatus.style.display=msg?'block':'none'; dStatus.className='notice '+(ok?'notice-ok':'notice-error'); }
  function pill(estado){
    var e = (estado||'').toLowerCase();
    if(e==='completado' || e==='realizado') return '<span class="pill comp">completado</span>';
    if(e==='cancelado') return '<span class="pill canc">cancelado</span>';
    if(e==='pospuesto') return '<span class="pill posp">pospuesto</span>';
    return '<span class="pill prog">programado</span>';
  }

  // Abrir el datepicker con click en cualquier parte del input
  dFecha.addEventListener('click', function(){ try{ if(dFecha.showPicker) dFecha.showPicker(); }catch(_e){} });

  // ---- Estado
  var uid = (auth.currentUser && auth.currentUser.uid) || null;
  var cacheDia = [];

  // ---- Carga del día
  async function cargarDia(){
    setStatus('');
    if(!uid){ setStatus('Sesión no válida.', false); return; }

    var base = parseInputDate(dFecha.value);
    var start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0,0,0,0);
    var end   = new Date(base.getFullYear(), base.getMonth(), base.getDate()+1, 0,0,0,0);

    try{
      var q = db.collection('turnos')
        .where('profesionalUid','==', uid)
        .where('fechaInicio','>=', start)
        .where('fechaInicio','<',  end)
        .orderBy('fechaInicio','asc');

      var snap = await q.get();
      cacheDia = snap.docs.map(function(d){
        var t = d.data();
        return {
          id: d.id, // no se muestra
          start: toDateAny(t.fechaInicio),
          end:   toDateAny(t.fechaFin),
          estado: t.estado || 'programado',
          pacienteNombre: t.pacienteNombre || (t.paciente && t.paciente.nombre) || 'Paciente',
          pacienteDni: String(t.pacienteDni || (t.paciente && t.paciente.dni) || ''),
          motivo: t.motivo || '—'
        };
      }).filter(function(x){ return x.start && x.end; });

      renderDia();
    }catch(e){
      console.error('[ODONTO-AGENDA] cargarDia:', e);
      setStatus('No se pudo cargar la agenda (¿índice requerido?).', false);
    }
  }

  function renderDia(){
    if(!cacheDia.length){
      dTbody.innerHTML = '<tr><td class="center" colspan="5">Sin turnos para el día.</td></tr>';
      return;
    }

    dTbody.innerHTML = cacheDia.map(function(t){
      return ''+
      '<tr>'+
        '<td class="center nowrap">'+hhmm(t.start)+'–'+hhmm(t.end)+'</td>'+
        '<td class="left">'+t.pacienteNombre+' <small>('+(t.pacienteDni||'—')+')</small></td>'+
        '<td class="center">'+t.motivo+'</td>'+
        '<td class="center">'+pill(t.estado)+'</td>'+
        '<td class="actions"><button class="btn btn-sm" data-notas="'+t.pacienteDni+'" data-turno="'+t.id+'">Ver notas</button></td>'+
      '</tr>';
    }).join('');

    // Ver notas (si existen visitas con ese turnoId)
    [].slice.call(dTbody.querySelectorAll('button[data-notas]')).forEach(function(btn){
      btn.addEventListener('click', async function(){
        var dni = btn.getAttribute('data-notas');
        var turnoId = btn.getAttribute('data-turno');
        if(!dni){ alert('No hay DNI del paciente.'); return; }

        try{
          var qs = await db.collection('pacientes').doc(dni)
            .collection('historial')
            .where('turnoId','==', turnoId)
            .orderBy('fecha','desc')
            .limit(5)
            .get();

          if(qs.empty){ alert('Sin notas registradas para este turno.'); return; }

          var out = [];
          qs.forEach(function(d){
            var h = d.data();
            var f = h.fecha && (typeof h.fecha.toDate==='function' ? h.fecha.toDate() : new Date(h.fecha));
            var when = f ? (f.toLocaleDateString()+' '+f.toLocaleTimeString()) : '—';
            var pago = h.pagado ? 'Pagado' : 'Sin pago';
            var est  = h.estadoTurno || '—';
            var nota = h.descripcion || '—';
            out.push('• '+when+' — '+est+' — '+pago+'\n  Nota: '+nota);
          });
          alert(out.join('\n\n'));
        }catch(err){
          console.error('[ODONTO-AGENDA] notas:', err);
          alert('No se pudieron cargar las notas.');
        }
      });
    });
  }

  // ---- Navegación
  dHoy.addEventListener('click', function(){ dFecha.value = ymd(new Date()); cargarDia(); });
  dPrev.addEventListener('click', function(){
    var v = parseInputDate(dFecha.value); v.setDate(v.getDate()-1);
    dFecha.value = ymd(v); cargarDia();
  });
  dNext.addEventListener('click', function(){
    var v = parseInputDate(dFecha.value); v.setDate(v.getDate()+1);
    dFecha.value = ymd(v); cargarDia();
  });
  dFecha.addEventListener('change', cargarDia);

  // “Refrescar” → limpiar
  dRefrescar.addEventListener('click', function(){
    cacheDia = [];
    dTbody.innerHTML = '<tr><td class="center" colspan="5">Sin turnos para el día.</td></tr>';
    setStatus('Listado limpiado.', true);
  });

  // Init
  dFecha.value = ymd(new Date());
  await cargarDia();
})();
