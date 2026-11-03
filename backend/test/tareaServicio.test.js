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

async function conTareas(servicio, usuarioId, cantidad) {
  const creadas = [];
  for (let i = 1; i <= cantidad; i += 1) {
    creadas.push(await servicio.crear(usuarioId, { titulo: `Tarea ${i}` }));
  }
  return creadas;
}

test("R11: recorre el ciclo permitido pendiente → en progreso → completada → pendiente", async () => {
  const { servicio, luis } = await armar();
  const [tarea] = await conTareas(servicio, luis, 1);
  assert.equal((await servicio.cambiarEstado(luis, tarea.id, { estado: "en_progreso" })).estado, "en_progreso");
  assert.equal((await servicio.cambiarEstado(luis, tarea.id, { estado: "pendiente" })).estado, "pendiente");
  await servicio.cambiarEstado(luis, tarea.id, { estado: "en_progreso" });
  assert.equal((await servicio.cambiarEstado(luis, tarea.id, { estado: "completada" })).estado, "completada");
  assert.equal((await servicio.cambiarEstado(luis, tarea.id, { estado: "pendiente" })).estado, "pendiente");
});

test("R11: no se puede pasar de pendiente a completada directo (409)", async () => {
  const { servicio, luis } = await armar();
  const [tarea] = await conTareas(servicio, luis, 1);
  await assert.rejects(
    () => servicio.cambiarEstado(luis, tarea.id, { estado: "completada" }),
    { status: 409, message: /empezar la tarea/ },
  );
});

test("R11: de completada no se vuelve a en progreso sin reabrir (409)", async () => {
  const { servicio, luis } = await armar();
  const [tarea] = await conTareas(servicio, luis, 1);
  await servicio.cambiarEstado(luis, tarea.id, { estado: "en_progreso" });
  await servicio.cambiarEstado(luis, tarea.id, { estado: "completada" });
  await assert.rejects(() => servicio.cambiarEstado(luis, tarea.id, { estado: "en_progreso" }), { status: 409 });
});

test("R11: un estado que no existe es 400 y pedir el mismo estado no cambia nada", async () => {
  const { servicio, luis } = await armar();
  const [tarea] = await conTareas(servicio, luis, 1);
  await assert.rejects(() => servicio.cambiarEstado(luis, tarea.id, { estado: "hecha" }), { status: 400 });
  await assert.rejects(() => servicio.cambiarEstado(luis, tarea.id, {}), { status: 400 });
  assert.equal((await servicio.cambiarEstado(luis, tarea.id, { estado: "pendiente" })).estado, "pendiente");
});

test("R12: máximo 3 tareas en progreso; la cuarta da 409", async () => {
  const { servicio, luis } = await armar();
  const [t1, t2, t3, t4] = await conTareas(servicio, luis, 4);
  for (const t of [t1, t2, t3]) await servicio.cambiarEstado(luis, t.id, { estado: "en_progreso" });
  await assert.rejects(
    () => servicio.cambiarEstado(luis, t4.id, { estado: "en_progreso" }),
    { status: 409, message: /3 tareas en progreso/ },
  );
  const sigue = await servicio.obtener(luis, t4.id);
  assert.equal(sigue.estado, "pendiente");
});

test("R12: al pausar o completar una se libera el lugar", async () => {
  const { servicio, luis } = await armar();
  const [t1, t2, t3, t4, t5] = await conTareas(servicio, luis, 5);
  for (const t of [t1, t2, t3]) await servicio.cambiarEstado(luis, t.id, { estado: "en_progreso" });
  await servicio.cambiarEstado(luis, t1.id, { estado: "pendiente" });
  await servicio.cambiarEstado(luis, t4.id, { estado: "en_progreso" });
  await servicio.cambiarEstado(luis, t2.id, { estado: "completada" });
  assert.equal((await servicio.cambiarEstado(luis, t5.id, { estado: "en_progreso" })).estado, "en_progreso");
});

test("R12: el límite es por usuario", async () => {
  const { servicio, luis, ana } = await armar();
  for (const t of await conTareas(servicio, luis, 3)) {
    await servicio.cambiarEstado(luis, t.id, { estado: "en_progreso" });
  }
  const [deAna] = await conTareas(servicio, ana, 1);
  assert.equal((await servicio.cambiarEstado(ana, deAna.id, { estado: "en_progreso" })).estado, "en_progreso");
});

test("R13: al completar se guarda la fecha y al reabrir se borra", async () => {
  const { servicio, luis, reloj } = await armar();
  const [tarea] = await conTareas(servicio, luis, 1);
  await servicio.cambiarEstado(luis, tarea.id, { estado: "en_progreso" });
  reloj.fijar("2026-11-05T10:00:00-03:00");
  const completada = await servicio.cambiarEstado(luis, tarea.id, { estado: "completada" });
  assert.equal(completada.completadaEn, "2026-11-05T13:00:00.000Z");
  const reabierta = await servicio.cambiarEstado(luis, tarea.id, { estado: "pendiente" });
  assert.equal(reabierta.completadaEn, null);
});

test("R4: no se puede cambiar el estado de una tarea ajena", async () => {
  const { servicio, luis, ana } = await armar();
  const [tarea] = await conTareas(servicio, luis, 1);
  await assert.rejects(() => servicio.cambiarEstado(ana, tarea.id, { estado: "en_progreso" }), { status: 404 });
});

test("editar cambia solo los campos que se mandan y valida igual que al crear", async () => {
  const { servicio, luis } = await armar();
  const tarea = await servicio.crear(luis, { titulo: "Original", descripcion: "desc", prioridad: "baja" });
  const editada = await servicio.editar(luis, tarea.id, { titulo: " Nuevo título ", prioridad: "alta" });
  assert.equal(editada.titulo, "Nuevo título");
  assert.equal(editada.prioridad, "alta");
  assert.equal(editada.descripcion, "desc");

  await assert.rejects(() => servicio.editar(luis, tarea.id, { titulo: "" }), { status: 400 });
  await assert.rejects(() => servicio.editar(luis, tarea.id, { prioridad: "urgente" }), { status: 400 });
  await assert.rejects(() => servicio.editar(luis, tarea.id, {}), { status: 400 });
  await assert.rejects(() => servicio.editar(luis, tarea.id, { estado: "completada" }), { status: 400 });
});

test("R9: al editar, una fecha nueva no puede ser pasada, pero se puede sacar la fecha", async () => {
  const { servicio, luis } = await armar();
  const tarea = await servicio.crear(luis, { titulo: "a", fechaLimite: "2026-11-10" });
  await assert.rejects(() => servicio.editar(luis, tarea.id, { fechaLimite: "2026-10-01" }), { status: 400 });
  assert.equal((await servicio.editar(luis, tarea.id, { fechaLimite: "2026-11-20" })).fechaLimite, "2026-11-20");
  assert.equal((await servicio.editar(luis, tarea.id, { fechaLimite: null })).fechaLimite, null);
});

test("R9: si la tarea ya venció, se puede editar el título sin que se queje de la fecha", async () => {
  const { servicio, luis, reloj } = await armar();
  const tarea = await servicio.crear(luis, { titulo: "a", fechaLimite: "2026-11-03" });
  reloj.fijar("2026-11-10T12:00:00-03:00");
  const editada = await servicio.editar(luis, tarea.id, { titulo: "b", fechaLimite: "2026-11-03" });
  assert.equal(editada.titulo, "b");
  assert.equal(editada.fechaLimite, "2026-11-03");
});

test("R14: una tarea completada no se puede editar hasta reabrirla", async () => {
  const { servicio, luis } = await armar();
  const tarea = await servicio.crear(luis, { titulo: "a" });
  await servicio.cambiarEstado(luis, tarea.id, { estado: "en_progreso" });
  await servicio.cambiarEstado(luis, tarea.id, { estado: "completada" });
  await assert.rejects(() => servicio.editar(luis, tarea.id, { titulo: "b" }), { status: 409, message: /Reabrila/ });
  await servicio.cambiarEstado(luis, tarea.id, { estado: "pendiente" });
  assert.equal((await servicio.editar(luis, tarea.id, { titulo: "b" })).titulo, "b");
});

test("R18: eliminar borra la tarea propia y la ajena da 404", async () => {
  const { servicio, luis, ana } = await armar();
  const tarea = await servicio.crear(luis, { titulo: "a" });
  await assert.rejects(() => servicio.eliminar(ana, tarea.id), { status: 404 });
  await servicio.eliminar(luis, tarea.id);
  await assert.rejects(() => servicio.obtener(luis, tarea.id), { status: 404 });
  await assert.rejects(() => servicio.eliminar(luis, tarea.id), { status: 404 });
});

test("R18: eliminar una tarea en progreso libera su lugar en el límite", async () => {
  const { servicio, luis } = await armar();
  const [t1, t2, t3, t4] = await conTareas(servicio, luis, 4);
  for (const t of [t1, t2, t3]) await servicio.cambiarEstado(luis, t.id, { estado: "en_progreso" });
  await servicio.eliminar(luis, t1.id);
  assert.equal((await servicio.cambiarEstado(luis, t4.id, { estado: "en_progreso" })).estado, "en_progreso");
});
