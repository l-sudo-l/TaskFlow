import { useState } from "react";
import { api } from "../api/cliente.js";
import { describirFechaLimite } from "../fechas.js";
import CamposTarea from "./CamposTarea.jsx";

const ACCIONES_POR_ESTADO = {
  pendiente: [{ estado: "en_progreso", texto: "Empezar" }],
  en_progreso: [
    { estado: "completada", texto: "Completar", principal: true },
    { estado: "pendiente", texto: "Pausar" },
  ],
  completada: [{ estado: "pendiente", texto: "Reabrir" }],
};

const NOMBRE_ESTADO = { pendiente: "Pendiente", en_progreso: "En progreso", completada: "Completada" };

function valoresEditables(tarea) {
  return {
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    prioridad: tarea.prioridad,
    categoria: tarea.categoria,
    fechaLimite: tarea.fechaLimite ?? "",
  };
}

function TareaItem({ tarea, onCambio }) {
  const [editando, setEditando] = useState(false);
  const [valores, setValores] = useState(() => valoresEditables(tarea));
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function ejecutar(accion) {
    setError("");
    setOcupado(true);
    try {
      await accion();
      await onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  function empezarEdicion() {
    setValores(valoresEditables(tarea));
    setEditando(true);
  }

  async function guardar(evento) {
    evento.preventDefault();
    await ejecutar(async () => {
      await api.editarTarea(tarea.id, { ...valores, fechaLimite: valores.fechaLimite || null });
      setEditando(false);
    });
  }

  const clases = ["tarjeta", "tarea", `estado-${tarea.estado}`, tarea.vencida ? "vencida" : ""].join(" ");
  const fecha = describirFechaLimite(tarea.fechaLimite);

  return (
    <li className={clases}>
      {editando ? (
        <form className="tarea-edicion" onSubmit={guardar} aria-label={`Editar ${tarea.titulo}`}>
          <label>
            Título
            <input value={valores.titulo} maxLength={100} onChange={(e) => setValores({ ...valores, titulo: e.target.value })} />
          </label>
          <CamposTarea valores={valores} onCambiar={setValores} />
          <div className="tarea-acciones">
            <button type="button" className="boton boton-chico" onClick={() => setEditando(false)}>
              Cancelar
            </button>
            <button type="submit" className="boton boton-chico boton-principal" disabled={ocupado}>
              Guardar
            </button>
          </div>
        </form>
      ) : (
        <>
          <div>
            <h3 className="tarea-titulo">{tarea.titulo}</h3>
            {tarea.descripcion && <p className="tarea-descripcion">{tarea.descripcion}</p>}
            <div className="etiquetas">
              {tarea.vencida && <span className="etiqueta vencida">Vencida</span>}
              <span className="etiqueta estado">{NOMBRE_ESTADO[tarea.estado]}</span>
              <span className={`etiqueta prioridad-${tarea.prioridad}`}>Prioridad {tarea.prioridad}</span>
              {fecha && <span className="etiqueta">{fecha}</span>}
              {tarea.categoria && <span className="etiqueta">{tarea.categoria}</span>}
            </div>
          </div>

          <div className="tarea-acciones">
            {ACCIONES_POR_ESTADO[tarea.estado].map(({ estado, texto, principal }) => (
              <button
                key={estado}
                type="button"
                className={`boton boton-chico ${principal ? "boton-principal" : ""}`}
                disabled={ocupado}
                onClick={() => ejecutar(() => api.cambiarEstado(tarea.id, estado))}
              >
                {texto}
              </button>
            ))}
            {tarea.estado !== "completada" && (
              <button type="button" className="boton boton-chico" disabled={ocupado} onClick={empezarEdicion}>
                Editar
              </button>
            )}
            {confirmandoBorrado ? (
              <span className="confirmar">
                ¿Eliminar?
                <button
                  type="button"
                  className="boton boton-chico boton-peligro"
                  disabled={ocupado}
                  onClick={() => ejecutar(() => api.eliminarTarea(tarea.id))}
                >
                  Sí
                </button>
                <button type="button" className="boton boton-chico" onClick={() => setConfirmandoBorrado(false)}>
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="boton boton-chico boton-peligro"
                disabled={ocupado}
                onClick={() => setConfirmandoBorrado(true)}
              >
                Eliminar
              </button>
            )}
          </div>
        </>
      )}

      {error && <p className="mensaje mensaje-error tarea-error" role="alert">{error}</p>}
    </li>
  );
}

export default TareaItem;
