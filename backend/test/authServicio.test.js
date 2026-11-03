import { test } from "node:test";
import assert from "node:assert/strict";
import { crearAuthServicio, MENSAJE_LOGIN_INVALIDO } from "../src/servicios/authServicio.js";
import { crearRelojFijo } from "../src/reloj.js";
import { crearUsuariosEnMemoria } from "./enMemoria.js";

function armar() {
  const usuarios = crearUsuariosEnMemoria();
  const reloj = crearRelojFijo("2026-11-02T15:00:00-03:00");
  const auth = crearAuthServicio({ usuarios, reloj, secreto: "secreto-de-test" });
  return { usuarios, reloj, auth };
}

const datosValidos = { nombre: "Luis", email: "luis@mail.com", password: "clave1234" };

test("R1: registra un usuario y devuelve token sin la contraseña", async () => {
  const { auth } = armar();
  const r = await auth.registrar(datosValidos);
  assert.ok(r.token);
  assert.deepEqual(Object.keys(r.usuario).sort(), ["email", "id", "nombre"]);
});

test("R1: el email no distingue mayúsculas y no se puede repetir", async () => {
  const { auth } = armar();
  const r = await auth.registrar({ ...datosValidos, email: "  Luis@Mail.COM " });
  assert.equal(r.usuario.email, "luis@mail.com");
  await assert.rejects(() => auth.registrar(datosValidos), { status: 409 });
});

test("R1: valida nombre, email y contraseña", async () => {
  const { auth } = armar();
  const casos = [
    { ...datosValidos, nombre: "L" },
    { ...datosValidos, nombre: "x".repeat(61) },
    { ...datosValidos, email: "luis@mail" },
    { ...datosValidos, email: "" },
    { ...datosValidos, password: "corta1" },
    { ...datosValidos, password: "sinnumeros" },
    { ...datosValidos, password: "12345678" },
    { ...datosValidos, password: 12345678 },
  ];
  for (const caso of casos) {
    await assert.rejects(() => auth.registrar(caso), { status: 400 }, JSON.stringify(caso));
  }
});

test("R2: la contraseña se guarda con hash y sal, nunca en texto plano", async () => {
  const { auth, usuarios } = armar();
  await auth.registrar(datosValidos);
  await auth.registrar({ ...datosValidos, email: "otra@mail.com" });
  const guardados = [...usuarios.filas.values()].map((u) => u.passwordHash);
  for (const hash of guardados) {
    assert.ok(hash.startsWith("scrypt$"));
    assert.ok(!hash.includes(datosValidos.password));
  }
  assert.notEqual(guardados[0], guardados[1], "misma contraseña, distinto hash por la sal");
});

test("R3: login correcto devuelve token que identifica al usuario", async () => {
  const { auth } = armar();
  const { usuario } = await auth.registrar(datosValidos);
  const r = await auth.iniciarSesion({ email: "LUIS@mail.com", password: "clave1234" });
  assert.equal(r.usuario.id, usuario.id);
  assert.equal((await auth.usuarioDelToken(r.token)).id, usuario.id);
});

test("R3: el mensaje es el mismo si el email no existe o si la contraseña está mal", async () => {
  const { auth } = armar();
  await auth.registrar(datosValidos);
  await assert.rejects(
    () => auth.iniciarSesion({ email: "luis@mail.com", password: "otra12345" }),
    { status: 401, message: MENSAJE_LOGIN_INVALIDO },
  );
  await assert.rejects(
    () => auth.iniciarSesion({ email: "nadie@mail.com", password: "clave1234" }),
    { status: 401, message: MENSAJE_LOGIN_INVALIDO },
  );
  await assert.rejects(() => auth.iniciarSesion({}), { status: 401, message: MENSAJE_LOGIN_INVALIDO });
});

test("R3: el token dura 7 días", async () => {
  const { auth, reloj } = armar();
  const { token } = await auth.registrar(datosValidos);
  reloj.fijar("2026-11-09T14:59:00-03:00");
  assert.ok(await auth.usuarioDelToken(token));
  reloj.fijar("2026-11-09T15:00:01-03:00");
  await assert.rejects(() => auth.usuarioDelToken(token), { status: 401 });
});

test("R3: un token modificado o inventado no sirve", async () => {
  const { auth } = armar();
  const { token } = await auth.registrar(datosValidos);
  const [contenido] = token.split(".");
  const falso = Buffer.from(JSON.stringify({ sub: "otro", exp: Date.now() + 1e9 })).toString("base64url");
  await assert.rejects(() => auth.usuarioDelToken(`${falso}.${token.split(".")[1]}`), { status: 401 });
  await assert.rejects(() => auth.usuarioDelToken(`${contenido}.firmaFalsa`), { status: 401 });
  await assert.rejects(() => auth.usuarioDelToken("cualquiercosa"), { status: 401 });
  await assert.rejects(() => auth.usuarioDelToken(""), { status: 401 });
});

test("R3: un token firmado con otra clave no sirve", async () => {
  const { auth } = armar();
  const { token } = await auth.registrar(datosValidos);
  const otro = crearAuthServicio({
    usuarios: crearUsuariosEnMemoria(),
    reloj: crearRelojFijo("2026-11-02T15:00:00-03:00"),
    secreto: "otra-clave",
  });
  assert.throws(() => otro.verificarToken(token), { status: 401 });
});
