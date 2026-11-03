import { hoyEnArgentina } from "../fechas.js";

function CamposTarea({ valores, onCambiar, conDescripcion = true }) {
  const actualizar = (campo) => (evento) => onCambiar({ ...valores, [campo]: evento.target.value });

  return (
    <>
      <div className="fila-detalles">
        <label>
          Prioridad
          <select value={valores.prioridad} onChange={actualizar("prioridad")}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </label>
        <label>
          Fecha límite
          <input type="date" value={valores.fechaLimite} min={hoyEnArgentina()} onChange={actualizar("fechaLimite")} />
        </label>
        <label>
          Categoría
          <input value={valores.categoria} maxLength={30} placeholder="Ej: Facultad" onChange={actualizar("categoria")} />
        </label>
      </div>
      {conDescripcion && (
        <label>
          Descripción
          <textarea rows={2} maxLength={500} value={valores.descripcion} onChange={actualizar("descripcion")} />
        </label>
      )}
    </>
  );
}

export default CamposTarea;
