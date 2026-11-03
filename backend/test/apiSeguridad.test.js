import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { pedir, levantarServidor } from "./ayudantes.js";
import { levantarAppDePrueba } from "./appDePrueba.js";
import { crearApp } from "../src/app.js";
import { leerConfig } from "../src/config.js";

let app;

before(async () => {
  app = await levantarAppDePrueba({ env: { FRONTEND_URL: "https://taskflow.netlify.app/, http://localhost:5173" } });
});

after(() => app.cerrar());

test("R21: un pedido de más de 100 KB responde 413", async () => {
  const token = await app.nuevoUsuario();
  const r = await pedir(app.url, "POST", "/api/tareas", {
    token,
    cuerpo: { titulo: "a", descripcion: "x".repeat(110 * 1024) },
  });
  assert.equal(r.status, 413);
});

test("R21: un JSON mal formado responde 400", async () => {
  const token = await app.nuevoUsuario();
  const r = await pedir(app.url, "POST", "/api/tareas", { token, cuerpo: "{titulo: sin comillas" });
  assert.equal(r.status, 400);
  assert.match(r.datos.error, /JSON/);
});

test("R21: los acentos y emojis llegan bien aunque vengan partidos", async () => {
  const token = await app.nuevoUsuario();
  const titulo = "Año nuevo 🎉 ñandú ".repeat(4).trim();
  const r = await pedir(app.url, "POST", "/api/tareas", { token, cuerpo: { titulo } });
  assert.equal(r.status, 201);
  assert.equal(r.datos.tarea.titulo, titulo);
});

test("R24: CORS solo habilita el origen del frontend", async () => {
  const permitido = await pedir(app.url, "GET", "/api/salud", { headers: { Origin: "https://taskflow.netlify.app" } });
  assert.equal(permitido.headers.get("access-control-allow-origin"), "https://taskflow.netlify.app");

  const local = await pedir(app.url, "GET", "/api/salud", { headers: { Origin: "http://localhost:5173" } });
  assert.equal(local.headers.get("access-control-allow-origin"), "http://localhost:5173");

  const ajeno = await pedir(app.url, "GET", "/api/salud", { headers: { Origin: "https://sitio-malo.com" } });
  assert.equal(ajeno.headers.get("access-control-allow-origin"), null);
});

test("R24: el preflight OPTIONS responde 204 con métodos y headers permitidos", async () => {
  const r = await fetch(`${app.url}/api/tareas`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://taskflow.netlify.app",
      "Access-Control-Request-Method": "PATCH",
      "Access-Control-Request-Headers": "authorization, content-type",
    },
  });
  assert.equal(r.status, 204);
  assert.match(r.headers.get("access-control-allow-methods"), /PATCH/);
  assert.match(r.headers.get("access-control-allow-headers"), /Authorization/);
});

test("R22: un error inesperado responde 500 sin mostrar detalles internos", async () => {
  const servicioRoto = {
    verificarToken: () => "usuario-1",
  };
  const tareasRotas = {
    listar: async () => {
      throw new Error("connection to server at 10.0.0.5 failed: password authentication failed");
    },
  };
  const original = console.error;
  console.error = () => {};
  const servidor = await levantarServidor(
    crearApp({ config: leerConfig({ JWT_SECRET: "x" }), servicios: { auth: servicioRoto, tareas: tareasRotas } }),
  );
  try {
    const r = await pedir(servidor.url, "GET", "/api/tareas", { token: "cualquiera" });
    assert.equal(r.status, 500);
    assert.deepEqual(r.datos, { error: "Error interno del servidor" });
  } finally {
    console.error = original;
    await servidor.cerrar();
  }
});

test("R23: en producción no arranca sin JWT_SECRET", () => {
  assert.throws(() => leerConfig({ NODE_ENV: "production" }), /JWT_SECRET/);
  assert.equal(leerConfig({ NODE_ENV: "production", JWT_SECRET: "algo-largo" }).jwtSecret, "algo-largo");
});
