import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { crearApp } from "../src/app.js";
import { leerConfig } from "../src/config.js";
import { crearRelojFijo } from "../src/reloj.js";
import { crearUsuarioRepositorio } from "../src/repositorios/usuarioRepositorio.js";
import { crearTareaRepositorio } from "../src/repositorios/tareaRepositorio.js";
import { crearAuthServicio } from "../src/servicios/authServicio.js";
import { crearTareaServicio } from "../src/servicios/tareaServicio.js";
import { levantarServidor, pedir } from "./ayudantes.js";

const URL_BASE_DE_PRUEBA = process.env.TEST_DATABASE_URL;
const sinBase = !URL_BASE_DE_PRUEBA && "Definí TEST_DATABASE_URL para correr los tests contra PostgreSQL";

let pool;
let servidor;
let reloj;

before(async () => {
  if (sinBase) return;
  const { crearPool, crearTablas } = await import("../src/db/conexion.js");
  pool = crearPool(URL_BASE_DE_PRUEBA);
  await crearTablas(pool);
  await pool.query("TRUNCATE usuarios CASCADE");

  const config = leerConfig({ JWT_SECRET: "secreto-de-integracion" });
  reloj = crearRelojFijo("2026-11-02T15:00:00-03:00");
  const servicios = {
    auth: crearAuthServicio({ usuarios: crearUsuarioRepositorio(pool), reloj, secreto: config.jwtSecret }),
    tareas: crearTareaServicio({ tareas: crearTareaRepositorio(pool), reloj }),
  };
  servidor = await levantarServidor(crearApp({ config, servicios }));
});

after(async () => {
  if (sinBase) return;
  await servidor.cerrar();
  await pool.end();
});

let numeroDeUsuario = 0;
async function nuevoUsuario() {
  numeroDeUsuario += 1;
  const r = await pedir(servidor.url, "POST", "/api/auth/registro", {
    cuerpo: { nombre: `Integración ${numeroDeUsuario}`, email: `int${numeroDeUsuario}@mail.com`, password: "clave1234" },
  });
  assert.equal(r.status, 201);
  return { token: r.datos.token, id: r.datos.usuario.id };
}

async function crearTareas(token, cantidad) {
  const ids = [];
  for (let i = 1; i <= cantidad; i += 1) {
    const r = await pedir(servidor.url, "POST", "/api/tareas", { token, cuerpo: { titulo: `Tarea ${i}` } });
    ids.push(r.datos.tarea.id);
  }
  return ids;
}

const empezar = (token, id) =>
  pedir(servidor.url, "PATCH", `/api/tareas/${id}/estado`, { token, cuerpo: { estado: "en_progreso" } });

async function contadorConsistente(usuarioId) {
  const { rows } = await pool.query(
    `SELECT u.tareas_en_progreso AS contador,
            (SELECT count(*) FROM tareas t WHERE t.usuario_id = u.id AND t.estado = 'en_progreso') AS reales
       FROM usuarios u WHERE u.id = $1`,
    [usuarioId],
  );
  return { contador: Number(rows[0].contador), reales: Number(rows[0].reales) };
}

test("flujo completo contra PostgreSQL: crear, filtrar, estados, editar, resumen y eliminar", { skip: sinBase }, async () => {
  const { token } = await nuevoUsuario();
  const creada = await pedir(servidor.url, "POST", "/api/tareas", {
    token,
    cuerpo: { titulo: "Entregar TP final", descripcion: "Link al repo", prioridad: "alta", categoria: "Facultad", fechaLimite: "2026-11-05" },
  });
  assert.equal(creada.status, 201);
  const id = creada.datos.tarea.id;
  assert.equal(creada.datos.tarea.fechaLimite, "2026-11-05");
  await pedir(servidor.url, "POST", "/api/tareas", { token, cuerpo: { titulo: "Comprar yerba 100%", categoria: "Casa" } });

  const porTexto = await pedir(servidor.url, "GET", "/api/tareas?q=REPO", { token });
  assert.deepEqual(porTexto.datos.tareas.map((t) => t.titulo), ["Entregar TP final"]);
  const porPorcentaje = await pedir(servidor.url, "GET", `/api/tareas?q=${encodeURIComponent("100%")}`, { token });
  assert.deepEqual(porPorcentaje.datos.tareas.map((t) => t.titulo), ["Comprar yerba 100%"]);
  const porCategoria = await pedir(servidor.url, "GET", "/api/tareas?categoria=facultad", { token });
  assert.equal(porCategoria.datos.tareas.length, 1);

  assert.equal((await empezar(token, id)).status, 200);
  const editada = await pedir(servidor.url, "PATCH", `/api/tareas/${id}`, { token, cuerpo: { titulo: "Entregar TP final (repo + link)" } });
  assert.equal(editada.datos.tarea.titulo, "Entregar TP final (repo + link)");

  const completada = await pedir(servidor.url, "PATCH", `/api/tareas/${id}/estado`, { token, cuerpo: { estado: "completada" } });
  assert.equal(completada.status, 200);
  assert.ok(completada.datos.tarea.completadaEn);
  const noEditable = await pedir(servidor.url, "PATCH", `/api/tareas/${id}`, { token, cuerpo: { titulo: "x" } });
  assert.equal(noEditable.status, 409);

  reloj.fijar("2026-11-06T12:00:00-03:00");
  const vencidas = await pedir(servidor.url, "GET", "/api/tareas?vencidas=1", { token });
  assert.equal(vencidas.datos.tareas.length, 0, "la completada no cuenta como vencida");

  const resumen = await pedir(servidor.url, "GET", "/api/tareas/resumen", { token });
  assert.equal(resumen.datos.resumen.total, 2);
  assert.equal(resumen.datos.resumen.completada, 1);

  assert.equal((await pedir(servidor.url, "DELETE", `/api/tareas/${id}`, { token })).status, 204);
  assert.equal((await pedir(servidor.url, "GET", `/api/tareas/${id}`, { token })).status, 404);
  reloj.fijar("2026-11-02T15:00:00-03:00");
});

test("R4 contra PostgreSQL: un usuario no puede ver, editar, mover ni borrar tareas de otro", { skip: sinBase }, async () => {
  const luis = await nuevoUsuario();
  const ana = await nuevoUsuario();
  const [id] = await crearTareas(luis.token, 1);
  const ajenos = [
    pedir(servidor.url, "GET", `/api/tareas/${id}`, { token: ana.token }),
    pedir(servidor.url, "PATCH", `/api/tareas/${id}`, { token: ana.token, cuerpo: { titulo: "hackeada" } }),
    empezar(ana.token, id),
    pedir(servidor.url, "DELETE", `/api/tareas/${id}`, { token: ana.token }),
  ];
  for (const r of await Promise.all(ajenos)) assert.equal(r.status, 404);
  const sigue = await pedir(servidor.url, "GET", `/api/tareas/${id}`, { token: luis.token });
  assert.equal(sigue.datos.tarea.titulo, "Tarea 1");
});

test("R12 contra PostgreSQL: con 2 en progreso, dos pedidos simultáneos para empezar otra → solo uno gana", { skip: sinBase }, async () => {
  const { token, id: usuarioId } = await nuevoUsuario();
  const [a, b, c, d] = await crearTareas(token, 4);
  await empezar(token, a);
  await empezar(token, b);

  const [r1, r2] = await Promise.all([empezar(token, c), empezar(token, d)]);
  assert.deepEqual([r1.status, r2.status].sort(), [200, 409]);
  assert.deepEqual(await contadorConsistente(usuarioId), { contador: 3, reales: 3 });
});

test("R12 contra PostgreSQL: 10 pedidos simultáneos sobre 10 tareas → exactamente 3 quedan en progreso", { skip: sinBase }, async () => {
  const { token, id: usuarioId } = await nuevoUsuario();
  const ids = await crearTareas(token, 10);
  const respuestas = await Promise.all(ids.map((id) => empezar(token, id)));
  const exitosas = respuestas.filter((r) => r.status === 200).length;
  const rechazadas = respuestas.filter((r) => r.status === 409).length;
  assert.equal(exitosas, 3);
  assert.equal(rechazadas, 7);
  assert.deepEqual(await contadorConsistente(usuarioId), { contador: 3, reales: 3 });
});

test("R12 contra PostgreSQL: la misma tarea empezada dos veces a la vez solo suma una al contador", { skip: sinBase }, async () => {
  const { token, id: usuarioId } = await nuevoUsuario();
  const [id] = await crearTareas(token, 1);
  const respuestas = await Promise.all([empezar(token, id), empezar(token, id), empezar(token, id)]);
  assert.ok(respuestas.some((r) => r.status === 200));
  assert.deepEqual(await contadorConsistente(usuarioId), { contador: 1, reales: 1 });
});

test("R1 contra PostgreSQL: dos registros simultáneos con el mismo email → uno solo se crea", { skip: sinBase }, async () => {
  const cuerpo = { nombre: "Doble", email: "doble@mail.com", password: "clave1234" };
  const [r1, r2] = await Promise.all([
    pedir(servidor.url, "POST", "/api/auth/registro", { cuerpo }),
    pedir(servidor.url, "POST", "/api/auth/registro", { cuerpo: { ...cuerpo, email: "DOBLE@mail.com" } }),
  ]);
  assert.deepEqual([r1.status, r2.status].sort(), [201, 409]);
});

test("las tablas tienen los CHECK de respaldo de la spec", { skip: sinBase }, async () => {
  const { id: usuarioId } = await nuevoUsuario();
  await assert.rejects(
    () => pool.query("INSERT INTO tareas (usuario_id, titulo, prioridad) VALUES ($1, 'x', 'top')", [usuarioId]),
    { code: "23514" },
  );
  await assert.rejects(
    () => pool.query("UPDATE usuarios SET tareas_en_progreso = 4 WHERE id = $1", [usuarioId]),
    { code: "23514" },
  );
});
