// public/odonto-reportes.js
(async function(){
  const { db, ensureRole } = await window.Dentasoft.ready();
  await ensureRole('odontologo');

  document.getElementById("rCalcular")?.addEventListener("click", async () => {
    const d = document.getElementById("rDesde").value;
    const h = document.getElementById("rHasta").value;
    if (!d || !h) return alert("Elegí un rango de fechas");

    const desde = new Date(d + "T00:00:00");
    const hasta = new Date(h + "T23:59:59");
    const uid = firebase.auth().currentUser.uid;

    const q = await db.collection("turnos")
      .where("profesionalUid", "==", uid)
      .where("fechaInicio", ">=", desde)
      .where("fechaInicio", "<=", hasta)
      .orderBy("fechaInicio", "asc")
      .get();

    const tot = { total:0, programado:0, completado:0, cancelado:0, pospuesto:0 };
    const diario = {};

    q.forEach(docu => {
      const t = docu.data();
      tot.total++;
      const st = (t.estado || "programado").toLowerCase();
      if (tot[st] != null) tot[st]++;
      const dia = t.fechaInicio.toDate().toISOString().slice(0, 10);
      diario[dia] ??= { total:0, programado:0, completado:0, cancelado:0, pospuesto:0 };
      diario[dia].total++;
      diario[dia][st] ??= 0; diario[dia][st]++;
    });

    document.getElementById("rKpi").innerHTML = `
      <div class="panel">Total: <b>${tot.total}</b></div>
      <div class="panel">Completados: <b>${tot.completado}</b></div>
      <div class="panel">Cancelados: <b>${tot.cancelado}</b></div>
      <div class="panel">Pospuestos: <b>${tot.pospuesto}</b></div>
    `;
    document.getElementById("rDiario").innerHTML =
      Object.entries(diario).map(([dia,c]) =>
        `<div class="panel">${dia} — T=${c.total}, C=${c.completado}, X=${c.cancelado}, P=${c.pospuesto}</div>`
      ).join("");
  });
})();
