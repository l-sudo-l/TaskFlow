import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { pedir } from "./ayudantes.js";
import { levantarAppDePrueba } from "./appDePrueba.js";

let app;

before(async () => {
  app = await levantarAppDePrueba();
});

after(() => app.cerrar());

test("GET /api/salud responde ok", async () => {
  const r = await pedir(app.url, "GET", "/api/salud");
  assert.equal(r.status, 200);
  assert.deepEqual(r.datos, { ok: true });
});

test("una ruta que no existe responde 404", async () => {
  const r = await pedir(app.url, "GET", "/api/nada");
  assert.equal(r.status, 404);
});

test("un método que no corresponde responde 405", async () => {
  const r = await pedir(app.url, "DELETE", "/api/salud");
  assert.equal(r.status, 405);
});
