// secretaria-pacientes.js
// Alta con validaciones y UX:
// - Requiere rol "secretaria" (Dentasoft.ready + ensureRole).
// - DNI: solo números y 8 dígitos (en vivo + submit).
// - Obra social: "Particular" -> deshabilita y limpia Nº de afiliado.
//                No "Particular" -> habilita Nº de afiliado (opcional, numérico hasta 10).
// - Nombre/Apellido: solo letras y espacios (en vivo).
// - Email: exactamente un "@" (en vivo limita a 1, en submit valida).
// - Teléfono: numérico hasta 10.
// - Botón "Cancelar" limpia todo y re-aplica estado de afiliado.

(async()=>{
  // --- Seguridad: rol secretaria ---
  const { db, ensureRole } = await window.Dentasoft.ready();
  await ensureRole('secretaria');

  // --- Atajos / refs DOM ---
  const $ = (id)=>document.getElementById(id);
  const form      = $('formPac');
  const dni       = $('dni');
  const nombre    = $('nombre');
  const apellido  = $('apellido');
  const email     = $('email');
  const telefono  = $('telefono');
  const obra      = $('obraSocial');
  const afiliado  = $('numeroAfiliado');
  const statusEl  = $('status');
  const btnCancel = $('btnCancelar');

  // --- Helpers de validación en vivo ---
  function onlyLetters(el){
    if(!el) return;
    el.addEventListener('input', function(){
      this.value = this.value
        .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '') // solo letras + espacios
        .replace(/\s{2,}/g, ' ');                 // colapsa espacios
    });
  }
  function onlyDigits(el, max){
    if(!el) return;
    el.addEventListener('input', function(){
      this.value = this.value.replace(/\D/g, '').slice(0, max); // solo números, máx "max"
    });
  }

  // Aplico filtros en vivo
  onlyLetters(nombre);
  onlyLetters(apellido);
  onlyDigits(dni, 8);
  onlyDigits(telefono, 10);
  onlyDigits(afiliado, 10);

  // Email: permitir un solo '@' mientras escribe
  email?.addEventListener('input', function(){
    let v = this.value.replace(/\s/g,''); // sin espacios
    const first = v.indexOf('@');
    if(first !== -1){
      v = v.slice(0, first+1) + v.slice(first+1).replace(/@/g,''); // deja el primero
    }
    this.value = v;
  });

  // --- Obra social: "Particular" deshabilita/limpia Nº de afiliado ---
  function updateAfiliadoState(){
    if(!obra || !afiliado) return;
    if(obra.value === 'Particular'){
      afiliado.value = '';
      afiliado.setAttribute('disabled', 'disabled'); // bloqueado
    }else{
      afiliado.removeAttribute('disabled'); // habilitado
    }
  }
  obra?.addEventListener('change', updateAfiliadoState);
  updateAfiliadoState(); // estado inicial

  // --- Mensajes de estado ---
  function showStatus(msg, ok=false){
    if(!statusEl) return;
    statusEl.style.display = 'block';
    statusEl.style.border = '1px solid ' + (ok ? '#16a34a' : '#ef4444');
    statusEl.style.color = ok ? '#166534' : '#7f1d1d';
    statusEl.textContent = msg;
  }

  // --- Cancelar: limpia todo y re-aplica estado de afiliado ---
  btnCancel?.addEventListener('click', ()=>{
    form.reset();
    updateAfiliadoState();
    dni.focus();
    showStatus('Formulario limpiado.', true);
  });

  // --- Submit: validaciones finales + guardado ---
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    try{
      const vDni  = (dni?.value||'').trim();
      const vNom  = (nombre?.value||'').trim();
      const vApe  = (apellido?.value||'').trim();
      const vMail = (email?.value||'').trim();
      const vTel  = (telefono?.value||'').trim();
      const vObra = obra?.value || '';
      const vAfi  = (afiliado?.value||'').trim();

      // --- Validaciones de negocio ---
      if(!/^\d{8}$/.test(vDni)) throw new Error('El DNI debe tener 8 dígitos.');
      if(!vNom)                 throw new Error('El Nombre es obligatorio.');
      if(!vApe)                 throw new Error('El Apellido es obligatorio.');

      // Email con exactamente un "@"
      const atCount = (vMail.match(/@/g)||[]).length;
      if(!vMail || atCount !== 1) throw new Error('Email inválido: debe contener exactamente un "@".');

      // Teléfono (opcional) numérico hasta 10
      if(vTel && !/^\d{1,10}$/.test(vTel)) throw new Error('Teléfono: solo números (hasta 10).');

      // Obra social obligatoria
      if(!vObra) throw new Error('Seleccioná una obra social.');

      // Lógica de afiliado: Particular => debe quedar vacío; sino, si se completa, numérico hasta 10
      if(vObra === 'Particular' && vAfi){
        throw new Error('Si la obra es "Particular", el Nº de afiliado debe quedar vacío.');
      }
      if(vObra !== 'Particular' && vAfi && !/^\d{1,10}$/.test(vAfi)){
        throw new Error('N° de afiliado: solo números (hasta 10).');
      }

      // --- Documento a guardar ---
      const data = {
        dni: vDni,
        nombre: vNom,
        apellido: vApe,
        email: vMail,
        telefono: vTel || '',
        obraSocial: vObra,
        numeroAfiliado: vObra === 'Particular' ? '' : vAfi,
        actualizadoEn: new Date()
      };

      // Guardamos con DNI como ID (evita duplicados naturales)
      await db.collection('pacientes').doc(vDni).set(data,{merge:true});

      showStatus('Paciente guardado ✔', true);
      form.reset();
      updateAfiliadoState();
      dni.focus();

    }catch(err){
      showStatus(err.message || 'No se pudo guardar el paciente.');
    }
  });
})();
