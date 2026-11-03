import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { pedir } from "./ayudantes.js";
import { levantarAppDePrueba } from "./appDePrueba.js";

let app;

before(async () => {
  app = await levantarAppDePrueba();
});

after(() => app.cerrar());

test("POST /api/auth/registro crea la cuenta (201) y GET /api/auth/yo la devuelve", async () => {
  const r = await pedir(app.url, "POST", "/api/auth/registro", {
    cuerpo: { nombre: "Luis", email: "luis@mail.com", password: "clave1234" },
  });
  assert.equal(r.status, 201);
  assert.equal(r.datos.usuario.email, "luis@mail.com");
  assert.equal(r.datos.usuario.passwordHash, undefined);

  const yo = await pedir(app.url, "GET", "/api/auth/yo", { token: r.datos.token });
  assert.equal(yo.status, 200);
  assert.equal(yo.datos.usuario.nombre, "Luis");
});

test("registro con email repetido responde 409", async () => {
  const r = await pedir(app.url, "POST", "/api/auth/registro", {
    cuerpo: { nombre: "Otro", email: "LUIS@mail.com", password: "clave1234" },
  });
  assert.equal(r.status, 409);
});

test("registro con datos inválidos responde 400 con el motivo", async () => {
  const r = await pedir(app.url, "POST", "/api/auth/registro", {
    cuerpo: { nombre: "Ana", email: "ana@mail.com", password: "corta" },
  });
  assert.equal(r.status, 400);
  assert.match(r.datos.error, /8 caracteres/);
});

test("login correcto 200 y login incorrecto 401", async () => {
  const bien = await pedir(app.url, "POST", "/api/auth/login", {
    cuerpo: { email: "luis@mail.com", password: "clave1234" },
  });
  assert.equal(bien.status, 200);
  assert.ok(bien.datos.token);

  const mal = await pedir(app.url, "POST", "/api/auth/login", {
    cuerpo: { email: "luis@mail.com", password: "equivocada1" },
  });
  assert.equal(mal.status, 401);
});

test("GET /api/auth/yo sin token o con token roto responde 401", async () => {
  assert.equal((await pedir(app.url, "GET", "/api/auth/yo")).status, 401);
  assert.equal((await pedir(app.url, "GET", "/api/auth/yo", { token: "roto" })).status, 401);
  const conOtroEsquema = await pedir(app.url, "GET", "/api/auth/yo", { headers: { Authorization: "Basic abc" } });
  assert.equal(conOtroEsquema.status, 401);
});
