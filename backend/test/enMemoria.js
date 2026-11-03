import { randomUUID } from "node:crypto";
import { ErrorConflicto } from "../src/errores.js";

function crearRepositoriosEnMemoria({ reloj } = {}) {
  const usuariosPorId = new Map();
  const tareasPorId = new Map();
  const ahora = () => (reloj ? reloj.ahora() : new Date()).toISOString();

  const usuarios = {
    filas: usuariosPorId,
    async crear({ nombre, email, passwordHash }) {
      for (const usuario of usuariosPorId.values()) {
        if (usuario.email === email) throw new ErrorConflicto("Ya existe una cuenta con ese email");
      }
      const usuario = { id: randomUUID(), nombre, email, passwordHash, tareasEnProgreso: 0 };
      usuariosPorId.set(usuario.id, usuario);
      return { ...usuario };
    },
    async buscarPorEmail(email) {
      for (const usuario of usuariosPorId.values()) {
        if (usuario.email === email) return { ...usuario };
      }
      return null;
    },
    async buscarPorId(id) {
      const usuario = usuariosPorId.get(id);
      return usuario ? { ...usuario } : null;
    },
  };

  const copia = ({ usuarioId, ...tarea }) => ({ ...tarea });

  const tareas = {
    filas: tareasPorId,
    async crear(usuarioId, campos) {
      const momento = ahora();
      const tarea = {
        id: randomUUID(),
        usuarioId,
        ...campos,
        estado: "pendiente",
        creadaEn: momento,
        actualizadaEn: momento,
        completadaEn: null,
      };
      tareasPorId.set(tarea.id, tarea);
      return copia(tarea);
    },
    async listar(usuarioId) {
      return [...tareasPorId.values()]
        .filter((tarea) => tarea.usuarioId === usuarioId)
        .map(copia);
    },
    async buscar(usuarioId, id) {
      const tarea = tareasPorId.get(id);
      return tarea && tarea.usuarioId === usuarioId ? copia(tarea) : null;
    },
  };

  return { usuarios, tareas };
}

function crearUsuariosEnMemoria() {
  return crearRepositoriosEnMemoria().usuarios;
}

export { crearRepositoriosEnMemoria, crearUsuariosEnMemoria };
