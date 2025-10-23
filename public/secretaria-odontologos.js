(async () => {
  const { db, ensureRole } = await window.Dentasoft.ready();
  await ensureRole('secretaria');

  const $ = (id) => document.getElementById(id);
  const form = $('formOdo');
  const statusEl = $('status');
  const btnGuardar = $('btnGuardar');
  const btnCancelar = $('btnCancelar');
  const btnVerLista = $('btnVerLista');
  const listaOdos = $('listaOdos');
  const tablaOdontologos = $('tablaOdontologos');
  const matriculaInput = $('matricula');

  let modoEdicion = false;
  let matriculaActual = null;

  // === VALIDACIONES ===
  const validarMatricula = (m) => /^[A-Za-z0-9]{4,8}$/.test((m || '').trim());
  const validarTelefonoE164 = (t) => !t || /^\+?[1-9]\d{6,14}$/.test(t.trim());

  // === EVENTO: mayúsculas y restricción símbolos ===
  matriculaInput.addEventListener('input', (e) => {
    e.target.value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ''); // sólo letras y números
  });

  // === MOSTRAR MENSAJE ===
  function setStatus(msg, ok = true) {
    statusEl.textContent = msg;
    statusEl.style.display = 'block';
    statusEl.style.background = ok ? '#d4edda' : '#f8d7da';
    statusEl.style.color = ok ? '#155724' : '#721c24';
    statusEl.style.padding = '10px';
    statusEl.style.borderRadius = '6px';
    statusEl.style.fontWeight = 'bold';
  }

  // === CANCELAR ===
  btnCancelar.addEventListener('click', () => {
    form.reset();
    modoEdicion = false;
    matriculaActual = null;
    btnGuardar.textContent = 'Guardar';
    setStatus('Formulario limpiado.', true);
  });

  // === GUARDAR / ACTUALIZAR ===
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('', true);

    const data = Object.fromEntries(new FormData(form).entries());
    const matricula = (data.matricula || '').trim().toUpperCase();
    const nombre = (data.nombre || '').trim();
    const apellido = (data.apellido || '').trim();
    const email = (data.email || '').trim();
    const telefonoE164 = (data.telefonoE164 || '').trim();
    const especialidad = (data.especialidad || '').trim();
    const activo = data.activo === 'true';

    if (!validarMatricula(matricula))
      return setStatus('La matrícula debe tener entre 4 y 8 caracteres alfanuméricos.', false);
    if (!nombre || !apellido || !email)
      return setStatus('Completá Nombre, Apellido y Email.', false);
    if (!validarTelefonoE164(telefonoE164))
      return setStatus('Teléfono inválido. Formato recomendado: +54911XXXXYYYY.', false);

    const docRef = db.collection('odontologos').doc(matricula);

    try {
      if (!modoEdicion) {
        const snap = await docRef.get();
        if (snap.exists)
          return setStatus('Ya existe un odontólogo con esa matrícula.', false);
      }

      await docRef.set({
        matricula,
        nombre,
        apellido,
        email,
        telefonoE164: telefonoE164 || null,
        especialidad: especialidad || null,
        activo,
        uid: null,
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp(),
        ...(modoEdicion ? {} : { creadoEn: firebase.firestore.FieldValue.serverTimestamp() })
      }, { merge: true });

      setStatus(
        modoEdicion
          ? `✅ Odontólogo actualizado correctamente (${matricula}).`
          : `✅ Odontólogo guardado correctamente (${matricula}).`,
        true
      );

      form.reset();
      modoEdicion = false;
      matriculaActual = null;
      btnGuardar.textContent = 'Guardar';
    } catch (err) {
      console.error(err);
      setStatus('❌ Error al guardar el odontólogo. Revisá consola.', false);
    }
  });

  // === VER LISTA ===
  btnVerLista.addEventListener('click', async () => {
    try {
      const snapshot = await db.collection('odontologos').orderBy('apellido').get();
      listaOdos.innerHTML = '';
      if (snapshot.empty) {
        listaOdos.innerHTML = `<tr><td colspan="8">No hay odontólogos registrados.</td></tr>`;
      } else {
        snapshot.forEach((doc) => {
          const o = doc.data();
          const fila = document.createElement('tr');
          fila.innerHTML = `
            <td>${o.matricula || '-'}</td>
            <td>${o.nombre || '-'}</td>
            <td>${o.apellido || '-'}</td>
            <td>${o.email || '-'}</td>
            <td>${o.telefonoE164 || '-'}</td>
            <td>${o.especialidad || '-'}</td>
            <td>${o.activo ? 'Activo' : 'Inactivo'}</td>
            <td><button class="btn-small btn-edit" data-id="${o.matricula}">Editar</button></td>
          `;
          listaOdos.appendChild(fila);
        });
      }
      tablaOdontologos.style.display = 'block';
      setStatus('Lista de odontólogos cargada.', true);
    } catch (err) {
      console.error(err);
      setStatus('Error al cargar la lista.', false);
    }
  });

  // === EDITAR ===
  listaOdos.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-edit')) {
      const id = e.target.dataset.id;
      const doc = await db.collection('odontologos').doc(id).get();
      if (!doc.exists) return setStatus('No se encontró el odontólogo.', false);

      const o = doc.data();
      $('matricula').value = o.matricula;
      $('matricula').disabled = true; // no se edita matrícula
      form.nombre.value = o.nombre || '';
      form.apellido.value = o.apellido || '';
      form.email.value = o.email || '';
      form.telefonoE164.value = o.telefonoE164 || '';
      form.especialidad.value = o.especialidad || '';
      form.activo.value = o.activo ? 'true' : 'false';

      modoEdicion = true;
      matriculaActual = o.matricula;
      btnGuardar.textContent = 'Actualizar';
      setStatus(`Editando odontólogo ${o.matricula}`, true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
})();
