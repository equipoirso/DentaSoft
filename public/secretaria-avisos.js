// secretaria-avisos.js
// - Busca paciente por DNI en Firestore y autocompleta email
// - Envía recordatorio vía Cloud Function sendReminder (SendGrid)

(function () {
  const log = (...a) => console.log('[avisos]', ...a);

  window.addEventListener('load', () => {
    // Verificar Firebase inicializado por common.js
    if (!window.firebase || !firebase.app || !firebase.app()) {
      console.error('Firebase no está inicializado. Revisá common.js');
      return;
    }

    const db = firebase.firestore();
    const functions = firebase.app().functions('us-central1'); // cambia región si usaste otra

    const form      = document.getElementById('mailForm');
    const estadoEl  = document.getElementById('estado');
    const toEl      = document.getElementById('to');
    const fechaEl   = document.getElementById('fecha');
    const horaEl    = document.getElementById('hora');
    const asuntoEl  = document.getElementById('asunto');

    const dniEl       = document.getElementById('dni');
    const btnBuscar   = document.getElementById('btnBuscar');
    const dniStatusEl = document.getElementById('dniStatus');

    // Prefill por querystring (opcional)
    try {
      const q = new URLSearchParams(location.search);
      if (q.has('email')) toEl.value = q.get('email');
      if (q.has('fecha')) fechaEl.value = q.get('fecha');
      if (q.has('hora'))  horaEl.value = q.get('hora');
      if (q.has('asunto')) asuntoEl.value = q.get('asunto');
      if (q.has('dni')) dniEl.value = q.get('dni');
    } catch (_) {}

    // Sanitizar DNI en la escritura
    dniEl.addEventListener('input', () => {
      dniEl.value = dniEl.value.replace(/\D/g, '').slice(0, 8);
    });

    // --- Buscar por DNI en Firestore ---
    async function buscarPorDni() {
      const dni = (dniEl.value || '').trim();
      dniStatusEl.textContent = '';
      dniStatusEl.className = 'muted';

      if (!/^\d{8}$/.test(dni)) {
        dniStatusEl.textContent = 'Ingresá un DNI válido de 8 dígitos.';
        dniStatusEl.classList.add('error');
        dniEl.focus();
        return;
      }

      btnBuscar.disabled = true;
      dniStatusEl.textContent = 'Buscando…';

      try {
        const snap = await db.collection('patients').doc(dni).get();
        if (!snap.exists) {
          dniStatusEl.textContent = 'Paciente no encontrado.';
          dniStatusEl.classList.add('error');
          toEl.value = ''; // limpiar si había algo de antes
          return;
        }
        const data = snap.data();
        if (data?.email) {
          toEl.value = data.email;
          dniStatusEl.textContent = 'Email encontrado y completado.';
          dniStatusEl.classList.add('ok');
          toEl.focus();
        } else {
          dniStatusEl.textContent = 'El paciente no tiene email cargado.';
          dniStatusEl.classList.add('error');
          toEl.focus();
        }
      } catch (e) {
        console.error(e);
        dniStatusEl.textContent = 'Error consultando el paciente.';
        dniStatusEl.classList.add('error');
      } finally {
        btnBuscar.disabled = false;
      }
    }

    btnBuscar.addEventListener('click', buscarPorDni);
    dniEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); buscarPorDni(); }
    });

    // --- Enviar recordatorio por SendGrid (Cloud Function) ---
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const to      = (toEl.value || '').trim();
      const fecha   = (fechaEl.value || '').trim();
      const hora    = (horaEl.value || '').trim();
      const subject = (asuntoEl.value || '').trim();

      if (!to) {
        estadoEl.textContent = 'Ingresá un email válido.';
        toEl.focus();
        return;
      }

      const html = `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
          <h2>Recordatorio de turno</h2>
          <p>Te recordamos tu turno para <b>${fecha || '(fecha)'}</b> a las <b>${hora || '(hora)'}</b>.</p>
          <p>Si no podés asistir, por favor respondé este correo.</p>
          <p>— DentaSoft</p>
        </div>`;

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      estadoEl.textContent = 'Enviando…';

      try {
        const sendReminder = functions.httpsCallable('sendReminder');
        await sendReminder({ to, subject, html });
        estadoEl.textContent = 'Enviado ✅';
        log('Recordatorio enviado a', to);
      } catch (err) {
        console.error(err);
        estadoEl.textContent = 'Error al enviar ❌';
      } finally {
        submitBtn.disabled = false;
      }
    });
  });
})();
