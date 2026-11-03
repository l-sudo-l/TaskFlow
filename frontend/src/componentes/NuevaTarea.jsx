import { useState } from "react";
import { api } from "../api/cliente.js";
import CamposTarea from "./CamposTarea.jsx";

const TAREA_VACIA = { titulo: "", prioridad: "media", fechaLimite: "", categoria: "", descripcion: "" };

function NuevaTarea({ onCreada }) {
  const [valores, setValores] = useState(TAREA_VACIA);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function crear(evento) {
    evento.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await api.crearTarea({ ...valores, fechaLimite: valores.fechaLimite || null });
      setValores(TAREA_VACIA);
      await onCreada();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="tarjeta nueva-tarea" onSubmit={crear} aria-label="Nueva tarea">
      <div className="fila-principal">
        <input
          aria-label="Título de la nueva tarea"
          placeholder="¿Qué tenés que hacer?"
          value={valores.titulo}
          maxLength={100}
          onChange={(evento) => setValores({ ...valores, titulo: evento.target.value })}
        />
        <button type="submit" className="boton boton-principal" disabled={guardando}>
          {guardando ? "Agregando…" : "Agregar"}
        </button>
      </div>

      {mostrarDetalles && <CamposTarea valores={valores} onCambiar={setValores} />}

      <button type="button" className="enlace" onClick={() => setMostrarDetalles(!mostrarDetalles)}>
        {mostrarDetalles ? "Ocultar detalles" : "+ Prioridad, fecha, categoría y descripción"}
      </button>

      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
    </form>
  );
}

export default NuevaTarea;
