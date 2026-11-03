import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { crearApp } from "../src/app.js";
import { leerConfig } from "../src/config.js";
import { levantarServidor, pedir } from "./ayudantes.js";

let servidor;

before(async () => {
  servidor = await levantarServidor(crearApp({ config: leerConfig({}) }));
});

after(() => servidor.cerrar());

test("GET /api/salud responde ok", async () => {
  const r = await pedir(servidor.url, "GET", "/api/salud");
  assert.equal(r.status, 200);
  assert.deepEqual(r.datos, { ok: true });
});

test("una ruta que no existe responde 404", async () => {
  const r = await pedir(servidor.url, "GET", "/api/nada");
  assert.equal(r.status, 404);
});

test("un método que no corresponde responde 405", async () => {
  const r = await pedir(servidor.url, "DELETE", "/api/salud");
  assert.equal(r.status, 405);
});
