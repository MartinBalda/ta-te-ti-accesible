// Chequeo de accesibilidad con axe-core (Deque).
// Escanea el juego en 4 estados: tema claro, tema oscuro, diálogo de
// ayuda abierto y partida iniciada. Solo lee, no modifica nada.

const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");

const URL = "file:///C:/Workspace/Ta-Te-Ti/index.html";

async function escanear(nombre, preparar) {
  const navegador = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const contexto = await navegador.newContext();
    const pagina = await contexto.newPage();
    await pagina.goto(URL);
    await pagina.waitForLoadState("load");
    if (preparar) await preparar(pagina);
    const resultados = await new AxeBuilder({ page: pagina }).analyze();
    return { nombre, resultados };
  } finally {
    await navegador.close();
  }
}

function imprimir(nombre, r) {
  const violaciones = r.violations || [];
  console.log("\n==================== " + nombre + " ====================");
  if (violaciones.length === 0) {
    console.log("Sin violaciones.");
    console.log("(pasados: " + (r.passes || []).length + ", incompletos: " + (r.incomplete || []).length + ")");
    return;
  }
  console.log(violaciones.length + " violaciones:");
  violaciones.forEach((v, i) => {
    console.log("\n" + (i + 1) + ". Impacto: " + (v.impact || "desconocido") + " | ID: " + v.id);
    console.log("   Regla: " + v.help);
    (v.nodes || []).forEach((nodo) => {
      console.log("   Elemento: " + (nodo.target || []).join(" "));
      if (nodo.failureSummary) {
        console.log("   Motivo: " + nodo.failureSummary.replace(/\n/g, " "));
      }
    });
  });
}

(async () => {
  const escaneos = [];
  escaneos.push(await escanear("TEMA CLARO (inicio)", null));
  escaneos.push(await escanear("TEMA OSCURO", async (p) => {
    await p.evaluate(() => { document.documentElement.dataset.tema = "oscuro"; });
    await p.waitForTimeout(150);
  }));
  escaneos.push(await escanear("DIALOGO DE AYUDA ABIERTO", async (p) => {
    await p.click("#btn-ayuda");
    await p.waitForTimeout(250);
  }));
  escaneos.push(await escanear("PARTIDA INICIADA", async (p) => {
    await p.click("#btn-iniciar");
    await p.waitForTimeout(150);
  }));

  for (const s of escaneos) imprimir(s.nombre, s.resultados);

  console.log("\n==================== RESUMEN ====================");
  for (const s of escaneos) {
    console.log(
      s.nombre + " -> violaciones: " + (s.resultados.violations || []).length +
      ", incompletos: " + (s.resultados.incomplete || []).length
    );
  }
})();
