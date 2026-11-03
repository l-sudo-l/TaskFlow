import { ErrorConflicto } from "../errores.js";

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function aUsuario(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    nombre: fila.nombre,
    email: fila.email,
    passwordHash: fila.password_hash,
  };
}

function crearUsuarioRepositorio(db) {
  async function crear({ nombre, email, passwordHash }) {
    try {
      const { rows } = await db.query(
        `INSERT INTO usuarios (nombre, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, nombre, email, password_hash`,
        [nombre, email, passwordHash],
      );
      return aUsuario(rows[0]);
    } catch (error) {
      if (error.code === "23505") {
        throw new ErrorConflicto("Ya existe una cuenta con ese email");
      }
      throw error;
    }
  }

  async function buscarPorEmail(email) {
    const { rows } = await db.query(
      "SELECT id, nombre, email, password_hash FROM usuarios WHERE email = $1",
      [email],
    );
    return aUsuario(rows[0]);
  }

  async function buscarPorId(id) {
    if (!FORMATO_UUID.test(String(id))) return null;
    const { rows } = await db.query(
      "SELECT id, nombre, email, password_hash FROM usuarios WHERE id = $1",
      [id],
    );
    return aUsuario(rows[0]);
  }

  return { crear, buscarPorEmail, buscarPorId };
}

export { crearUsuarioRepositorio, FORMATO_UUID };
