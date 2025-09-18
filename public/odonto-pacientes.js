// public/odonto-pacientes.js
(async function(){
  const { db, ensureRole } = await window.Dentasoft.ready();
  await ensureRole('odontologo');

  document.getElementById("pBuscar")?.addEventListener("click", async () => {
    const dni = document.getElementById("pDni").value.trim();
    const pDatos = document.getElementById("pDatos");
    const ulHist = document.getElementById("pHistorial");
    if (!dni) return;

    const ps = await db.collection("pacientes").doc(dni).get();
    if (!ps.exists) {
      pDatos.innerHTML = "<p>No existe el paciente.</p>";
      ulHist.innerHTML = "";
      return;
    }
    const p = ps.data();
    pDatos.innerHTML = `
      <div class="panel">
        <b>${p.nombre || ""} ${p.apellido || ""}</b> — DNI ${p.dni || dni}<br>
        Email: ${p.email || "-"} — Tel: ${p.telefonoE164 || "-"}
      </div>
    `;

    const qs = await db.collection("pacientes").doc(dni)
      .collection("historial")
      .orderBy("fecha", "desc")
      .get();

    if (qs.empty) {
      ulHist.innerHTML = "<li>Sin visitas registradas</li>";
      return;
    }
    const rows = [];
    qs.forEach(d => {
      const h = d.data();
      const f = h.fecha?.toDate ? h.fecha.toDate().toLocaleString() : "";
      rows.push(
        `<li>${f} — ${h.motivo} — ${h.estadoTurno} — ${h.pagado ? "Pagado" : "Sin pago"}<br>${h.descripcion || ""}</li>`
      );
    });
    ulHist.innerHTML = rows.join("");
  });
})();
