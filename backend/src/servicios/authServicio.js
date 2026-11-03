import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ErrorConflicto, ErrorNoAutorizado, ErrorValidacion } from "../errores.js";

const scryptAsync = promisify(scrypt);
const LARGO_CLAVE = 64;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MENSAJE_LOGIN_INVALIDO = "Email o contraseña incorrectos";

function base64url(texto) {
  return Buffer.from(texto).toString("base64url");
}

async function hashearPassword(password) {
  const sal = randomBytes(16).toString("hex");
  const derivada = await scryptAsync(password, sal, LARGO_CLAVE);
  return `scrypt$${sal}$${derivada.toString("hex")}`;
}

async function passwordCoincide(password, guardado) {
  const [algoritmo, sal, hashHex] = String(guardado).split("$");
  if (algoritmo !== "scrypt" || !sal || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  const derivada = await scryptAsync(password, sal, esperado.length);
  return timingSafeEqual(derivada, esperado);
}

function normalizarEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function validarRegistro({ nombre, email, password }) {
  const nombreLimpio = typeof nombre === "string" ? nombre.trim() : "";
  if (nombreLimpio.length < 2 || nombreLimpio.length > 60) {
    throw new ErrorValidacion("El nombre tiene que tener entre 2 y 60 caracteres");
  }
  const emailLimpio = normalizarEmail(email);
  if (!FORMATO_EMAIL.test(emailLimpio) || emailLimpio.length > 254) {
    throw new ErrorValidacion("El email no es válido");
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 200) {
    throw new ErrorValidacion("La contraseña tiene que tener al menos 8 caracteres");
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    throw new ErrorValidacion("La contraseña tiene que tener al menos una letra y un número");
  }
  return { nombre: nombreLimpio, email: emailLimpio, password };
}

function usuarioPublico({ id, nombre, email }) {
  return { id, nombre, email };
}

function crearAuthServicio({ usuarios, reloj, secreto, diasToken = 7 }) {
  function firmar(contenido) {
    return createHmac("sha256", secreto).update(contenido).digest("base64url");
  }

  function emitirToken(usuarioId) {
    const vence = reloj.ahora().getTime() + diasToken * 24 * 60 * 60 * 1000;
    const contenido = base64url(JSON.stringify({ sub: usuarioId, exp: vence }));
    return `${contenido}.${firmar(contenido)}`;
  }

  function verificarToken(token) {
    const [contenido, firma] = String(token || "").split(".");
    if (!contenido || !firma) throw new ErrorNoAutorizado();

    const firmaEsperada = Buffer.from(firmar(contenido));
    const firmaRecibida = Buffer.from(firma);
    if (firmaEsperada.length !== firmaRecibida.length || !timingSafeEqual(firmaEsperada, firmaRecibida)) {
      throw new ErrorNoAutorizado();
    }

    let datos;
    try {
      datos = JSON.parse(Buffer.from(contenido, "base64url").toString("utf8"));
    } catch {
      throw new ErrorNoAutorizado();
    }
    if (typeof datos.exp !== "number" || datos.exp <= reloj.ahora().getTime()) {
      throw new ErrorNoAutorizado("Tu sesión venció, volvé a iniciar sesión");
    }
    return datos.sub;
  }

  async function registrar(datos) {
    const { nombre, email, password } = validarRegistro(datos ?? {});
    if (await usuarios.buscarPorEmail(email)) {
      throw new ErrorConflicto("Ya existe una cuenta con ese email");
    }
    const passwordHash = await hashearPassword(password);
    const usuario = await usuarios.crear({ nombre, email, passwordHash });
    return { token: emitirToken(usuario.id), usuario: usuarioPublico(usuario) };
  }

  async function iniciarSesion(datos) {
    const email = normalizarEmail(datos?.email);
    const password = typeof datos?.password === "string" ? datos.password : "";
    const usuario = email ? await usuarios.buscarPorEmail(email) : null;
    const coincide = usuario ? await passwordCoincide(password, usuario.passwordHash) : false;
    if (!usuario || !coincide) {
      throw new ErrorNoAutorizado(MENSAJE_LOGIN_INVALIDO);
    }
    return { token: emitirToken(usuario.id), usuario: usuarioPublico(usuario) };
  }

  async function usuarioDelToken(token) {
    const usuarioId = verificarToken(token);
    const usuario = await usuarios.buscarPorId(usuarioId);
    if (!usuario) throw new ErrorNoAutorizado();
    return usuarioPublico(usuario);
  }

  return { registrar, iniciarSesion, usuarioDelToken, verificarToken };
}

export { crearAuthServicio, MENSAJE_LOGIN_INVALIDO };
