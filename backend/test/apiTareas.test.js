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
