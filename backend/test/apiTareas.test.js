import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { pedir } from "./ayudantes.js";
import { levantarAppDePrueba } from "./appDePrueba.js";

let app;

before(async () => {
  app = await levantarAppDePrueba();
});

after(() => app.cerrar());

test("las rutas de tareas piden sesión (401 sin token)", async () => {
  assert.equal((await pedir(app.url, "GET", "/api/tareas")).status, 401);
  assert.equal((await pedir(app.url, "POST", "/api/tareas", { cuerpo: { titulo: "x" } })).status, 401);
});

test("POST /api/tareas crea (201), GET la lista y GET /:id la trae", async () => {
  const token = await app.nuevoUsuario();
  const creada = await pedir(app.url, "POST", "/api/tareas", {
    token,
    cuerpo: { titulo: "Entregar TP final", prioridad: "alta", fechaLimite: "2026-12-31" },
  });
  assert.equal(creada.status, 201);
  assert.equal(creada.datos.tarea.estado, "pendiente");

  const lista = await pedir(app.url, "GET", "/api/tareas", { token });
  assert.equal(lista.status, 200);
  assert.equal(lista.datos.tareas.length, 1);

  const una = await pedir(app.url, "GET", `/api/tareas/${creada.datos.tarea.id}`, { token });
  assert.equal(una.status, 200);
  assert.equal(una.datos.tarea.titulo, "Entregar TP final");
});

test("POST /api/tareas con datos inválidos responde 400", async () => {
  const token = await app.nuevoUsuario();
  const r = await pedir(app.url, "POST", "/api/tareas", { token, cuerpo: { titulo: "   " } });
  assert.equal(r.status, 400);
  assert.equal(r.datos.error, "El título es obligatorio");
});

test("R4: la tarea de otro usuario responde 404", async () => {
  const luis = await app.nuevoUsuario();
  const ana = await app.nuevoUsuario();
  const creada = await pedir(app.url, "POST", "/api/tareas", { token: luis, cuerpo: { titulo: "Privada" } });
  const r = await pedir(app.url, "GET", `/api/tareas/${creada.datos.tarea.id}`, { token: ana });
  assert.equal(r.status, 404);
  const lista = await pedir(app.url, "GET", "/api/tareas", { token: ana });
  assert.equal(lista.datos.tareas.length, 0);
});

test("PATCH /api/tareas/:id/estado aplica transiciones y el límite de foco", async () => {
  const token = await app.nuevoUsuario();
  const ids = [];
  for (let i = 0; i < 4; i += 1) {
    const r = await pedir(app.url, "POST", "/api/tareas", { token, cuerpo: { titulo: `T${i}` } });
    ids.push(r.datos.tarea.id);
  }
  const directo = await pedir(app.url, "PATCH", `/api/tareas/${ids[0]}/estado`, { token, cuerpo: { estado: "completada" } });
  assert.equal(directo.status, 409);

  for (const id of ids.slice(0, 3)) {
    const r = await pedir(app.url, "PATCH", `/api/tareas/${id}/estado`, { token, cuerpo: { estado: "en_progreso" } });
    assert.equal(r.status, 200);
  }
  const cuarta = await pedir(app.url, "PATCH", `/api/tareas/${ids[3]}/estado`, { token, cuerpo: { estado: "en_progreso" } });
  assert.equal(cuarta.status, 409);
  assert.match(cuarta.datos.error, /3 tareas en progreso/);
});

test("PATCH /api/tareas/:id edita y DELETE responde 204", async () => {
  const token = await app.nuevoUsuario();
  const creada = await pedir(app.url, "POST", "/api/tareas", { token, cuerpo: { titulo: "Viejo" } });
  const id = creada.datos.tarea.id;

  const editada = await pedir(app.url, "PATCH", `/api/tareas/${id}`, { token, cuerpo: { titulo: "Nuevo" } });
  assert.equal(editada.status, 200);
  assert.equal(editada.datos.tarea.titulo, "Nuevo");

  const borrada = await pedir(app.url, "DELETE", `/api/tareas/${id}`, { token });
  assert.equal(borrada.status, 204);
  assert.equal((await pedir(app.url, "GET", `/api/tareas/${id}`, { token })).status, 404);
});

test("GET /api/tareas acepta filtros por query y GET /api/tareas/resumen no se confunde con un id", async () => {
  const token = await app.nuevoUsuario();
  await pedir(app.url, "POST", "/api/tareas", { token, cuerpo: { titulo: "Leer apunte", prioridad: "alta" } });
  await pedir(app.url, "POST", "/api/tareas", { token, cuerpo: { titulo: "Lavar ropa", prioridad: "baja" } });

  const filtrada = await pedir(app.url, "GET", "/api/tareas?prioridad=alta&q=apunte", { token });
  assert.equal(filtrada.status, 200);
  assert.deepEqual(filtrada.datos.tareas.map((t) => t.titulo), ["Leer apunte"]);

  assert.equal((await pedir(app.url, "GET", "/api/tareas?estado=cualquiera", { token })).status, 400);

  const resumen = await pedir(app.url, "GET", "/api/tareas/resumen", { token });
  assert.equal(resumen.status, 200);
  assert.equal(resumen.datos.resumen.total, 2);
  assert.equal(resumen.datos.resumen.pendiente, 2);
});
