import { FORMATO_UUID } from "./usuarioRepositorio.js";

const COLUMNAS = `id, titulo, descripcion, prioridad, categoria,
  to_char(fecha_limite, 'YYYY-MM-DD') AS fecha_limite,
  estado, creada_en, actualizada_en, completada_en`;

const COLUMNA_DE_CAMPO = {
  titulo: "titulo",
  descripcion: "descripcion",
  prioridad: "prioridad",
  categoria: "categoria",
  fechaLimite: "fecha_limite",
};

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

  async function cambiarEstado(usuarioId, id, { desde, hacia, variacionEnProgreso }) {
    try {
      const { rows } = await db.query(
        `WITH cambiada AS (
           UPDATE tareas
              SET estado = $3::varchar,
                  actualizada_en = now(),
                  completada_en = CASE WHEN $3::varchar = 'completada' THEN now() ELSE NULL END
            WHERE id = $1 AND usuario_id = $2 AND estado = $4
           RETURNING ${COLUMNAS}
         ), contador AS (
           UPDATE usuarios
              SET tareas_en_progreso = tareas_en_progreso + $5
            WHERE id = $2 AND EXISTS (SELECT 1 FROM cambiada)
           RETURNING tareas_en_progreso
         )
         SELECT cambiada.* FROM cambiada LEFT JOIN contador ON true`,
        [id, usuarioId, hacia, desde, variacionEnProgreso],
      );
      return { tarea: aTarea(rows[0]) };
    } catch (error) {
      if (error.code === "23514" && error.constraint === "limite_de_foco") {
        return { limiteAlcanzado: true };
      }
      throw error;
    }
  }

  async function actualizar(usuarioId, id, cambios) {
    const campos = Object.keys(cambios).filter((campo) => COLUMNA_DE_CAMPO[campo]);
    if (campos.length === 0) return buscar(usuarioId, id);
    const asignaciones = campos.map((campo, i) => `${COLUMNA_DE_CAMPO[campo]} = $${i + 3}`);
    const { rows } = await db.query(
      `UPDATE tareas
          SET ${asignaciones.join(", ")}, actualizada_en = now()
        WHERE id = $1 AND usuario_id = $2 AND estado <> 'completada'
       RETURNING ${COLUMNAS}`,
      [id, usuarioId, ...campos.map((campo) => cambios[campo])],
    );
    return aTarea(rows[0]);
  }

  async function eliminar(usuarioId, id) {
    if (!FORMATO_UUID.test(String(id))) return false;
    const { rows } = await db.query(
      `WITH borrada AS (
         DELETE FROM tareas WHERE id = $1 AND usuario_id = $2
         RETURNING estado
       ), contador AS (
         UPDATE usuarios
            SET tareas_en_progreso = tareas_en_progreso - 1
          WHERE id = $2 AND EXISTS (SELECT 1 FROM borrada WHERE estado = 'en_progreso')
         RETURNING tareas_en_progreso
       )
       SELECT count(*) AS cantidad FROM borrada`,
      [id, usuarioId],
    );
    return Number(rows[0].cantidad) > 0;
  }

  return { crear, listar, buscar, cambiarEstado, actualizar, eliminar };
}

export { crearTareaRepositorio };
