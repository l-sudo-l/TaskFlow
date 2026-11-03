import { randomUUID } from "node:crypto";
import { ErrorConflicto } from "../src/errores.js";

function crearUsuariosEnMemoria() {
  const filas = new Map();

  return {
    filas,
    async crear({ nombre, email, passwordHash }) {
      for (const usuario of filas.values()) {
        if (usuario.email === email) throw new ErrorConflicto("Ya existe una cuenta con ese email");
      }
      const usuario = { id: randomUUID(), nombre, email, passwordHash, tareasEnProgreso: 0 };
      filas.set(usuario.id, usuario);
      return { ...usuario };
    },
    async buscarPorEmail(email) {
      for (const usuario of filas.values()) {
        if (usuario.email === email) return { ...usuario };
      }
      return null;
    },
    async buscarPorId(id) {
      const usuario = filas.get(id);
      return usuario ? { ...usuario } : null;
    },
  };
}

export { crearUsuariosEnMemoria };
