import { FORMATO_UUID } from "./usuarioRepositorio.js";

const COLUMNAS = `id, titulo, descripcion, prioridad, categoria,
  to_char(fecha_limite, 'YYYY-MM-DD') AS fecha_limite,
  estado, creada_en, actualizada_en, completada_en`;

function aIso(valor) {
  return valor ? new Date(valor).toISOString() : null;
}

function aTarea(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    prioridad: fila.prioridad,
    categoria: fila.categoria,
    fechaLimite: fila.fecha_limite || null,
    estado: fila.estado,
    creadaEn: aIso(fila.creada_en),
    actualizadaEn: aIso(fila.actualizada_en),
    completadaEn: aIso(fila.completada_en),
  };
}

function crearTareaRepositorio(db) {
  async function crear(usuarioId, { titulo, descripcion, prioridad, categoria, fechaLimite }) {
    const { rows } = await db.query(
      `INSERT INTO tareas (usuario_id, titulo, descripcion, prioridad, categoria, fecha_limite)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUMNAS}`,
      [usuarioId, titulo, descripcion, prioridad, categoria, fechaLimite],
    );
    return aTarea(rows[0]);
  }

  async function listar(usuarioId) {
    const { rows } = await db.query(
      `SELECT ${COLUMNAS} FROM tareas WHERE usuario_id = $1 ORDER BY creada_en DESC`,
      [usuarioId],
    );
    return rows.map(aTarea);
  }

  async function buscar(usuarioId, id) {
    if (!FORMATO_UUID.test(String(id))) return null;
    const { rows } = await db.query(
      `SELECT ${COLUMNAS} FROM tareas WHERE id = $1 AND usuario_id = $2`,
      [id, usuarioId],
    );
    return aTarea(rows[0]);
  }

  return { crear, listar, buscar };
}

export { crearTareaRepositorio };
