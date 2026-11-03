import { test } from "node:test";
import assert from "node:assert/strict";
import { crearTareaServicio } from "../src/servicios/tareaServicio.js";
import { crearRelojFijo } from "../src/reloj.js";
import { crearRepositoriosEnMemoria } from "./enMemoria.js";

async function armar() {
  const reloj = crearRelojFijo("2026-11-02T15:00:00-03:00");
  const repos = crearRepositoriosEnMemoria({ reloj });
  const servicio = crearTareaServicio({ tareas: repos.tareas, reloj });
  const luis = (await repos.usuarios.crear({ nombre: "Luis", email: "luis@mail.com", passwordHash: "x" })).id;
  const ana = (await repos.usuarios.crear({ nombre: "Ana", email: "ana@mail.com", passwordHash: "x" })).id;
  return { reloj, repos, servicio, luis, ana };
}

test("R5–R10: crea una tarea con valores por defecto", async () => {
  const { servicio, luis } = await armar();
  const tarea = await servicio.crear(luis, { titulo: "  Estudiar para el parcial  " });
  assert.equal(tarea.titulo, "Estudiar para el parcial");
  assert.equal(tarea.descripcion, "");
  assert.equal(tarea.categoria, "");
  assert.equal(tarea.prioridad, "media");
  assert.equal(tarea.fechaLimite, null);
  assert.equal(tarea.estado, "pendiente");
  assert.equal(tarea.completadaEn, null);
});

test("R10: aunque mande otro estado, la tarea nueva arranca pendiente", async () => {
  const { servicio, luis } = await armar();
  const tarea = await servicio.crear(luis, { titulo: "Algo", estado: "completada" });
  assert.equal(tarea.estado, "pendiente");
});

test("R5: el título es obligatorio y tiene hasta 100 caracteres", async () => {
  const { servicio, luis } = await armar();
  for (const titulo of [undefined, "", "    ", 42, "x".repeat(101)]) {
    await assert.rejects(() => servicio.crear(luis, { titulo }), { status: 400 }, String(titulo));
  }
  const justo = await servicio.crear(luis, { titulo: "x".repeat(100) });
  assert.equal(justo.titulo.length, 100);
});

test("R6 y R8: descripción hasta 500 y categoría hasta 30", async () => {
  const { servicio, luis } = await armar();
  await assert.rejects(() => servicio.crear(luis, { titulo: "a", descripcion: "x".repeat(501) }), { status: 400 });
  await assert.rejects(() => servicio.crear(luis, { titulo: "a", categoria: "x".repeat(31) }), { status: 400 });
  await assert.rejects(() => servicio.crear(luis, { titulo: "a", categoria: 5 }), { status: 400 });
  const ok = await servicio.crear(luis, { titulo: "a", descripcion: "x".repeat(500), categoria: " Facultad " });
  assert.equal(ok.categoria, "Facultad");
});

test("R7: la prioridad solo puede ser alta, media o baja", async () => {
  const { servicio, luis } = await armar();
  assert.equal((await servicio.crear(luis, { titulo: "a", prioridad: "alta" })).prioridad, "alta");
  await assert.rejects(() => servicio.crear(luis, { titulo: "a", prioridad: "urgente" }), { status: 400 });
  await assert.rejects(() => servicio.crear(luis, { titulo: "a", prioridad: "ALTA" }), { status: 400 });
});

test("R9: la fecha límite tiene formato AAAA-MM-DD y no puede ser anterior a hoy en Argentina", async () => {
  const { servicio, luis, reloj } = await armar();
  assert.equal((await servicio.crear(luis, { titulo: "a", fechaLimite: "2026-11-02" })).fechaLimite, "2026-11-02");
  assert.equal((await servicio.crear(luis, { titulo: "a", fechaLimite: "2026-12-31" })).fechaLimite, "2026-12-31");
  await assert.rejects(() => servicio.crear(luis, { titulo: "a", fechaLimite: "2026-11-01" }), { status: 400 });
  for (const mala of ["02/11/2026", "2026-02-30", "2026-13-01", "mañana", 20261102]) {
    await assert.rejects(() => servicio.crear(luis, { titulo: "a", fechaLimite: mala }), { status: 400 }, String(mala));
  }

  reloj.fijar("2026-11-03T01:30:00Z");
  assert.equal(
    (await servicio.crear(luis, { titulo: "a", fechaLimite: "2026-11-02" })).fechaLimite,
    "2026-11-02",
    "a las 22:30 del 2/11 en Argentina todavía es 2/11, aunque en UTC ya sea 3/11",
  );
});

test("si el cuerpo no es un objeto, responde error de validación y no explota", async () => {
  const { servicio, luis } = await armar();
  for (const raro of [null, [], "texto", 5]) {
    await assert.rejects(() => servicio.crear(luis, raro), { status: 400 });
  }
});

test("R4: cada usuario ve solo sus tareas y la de otro da 404", async () => {
  const { servicio, luis, ana } = await armar();
  const deLuis = await servicio.crear(luis, { titulo: "De Luis" });
  await servicio.crear(ana, { titulo: "De Ana" });

  const lista = await servicio.listar(luis);
  assert.deepEqual(lista.map((t) => t.titulo), ["De Luis"]);
  assert.equal((await servicio.obtener(luis, deLuis.id)).titulo, "De Luis");
  await assert.rejects(() => servicio.obtener(ana, deLuis.id), { status: 404 });
  await assert.rejects(() => servicio.obtener(luis, "no-es-un-id"), { status: 404 });
});
