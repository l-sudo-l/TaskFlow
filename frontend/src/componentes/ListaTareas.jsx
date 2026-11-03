import TareaItem from "./TareaItem.jsx";

function ListaTareas({ tareas, hayFiltros, onCambio }) {
  if (tareas.length === 0) {
    return (
      <p className="tarjeta lista-vacia">
        {hayFiltros ? "No hay tareas que coincidan con los filtros." : "No tenés tareas todavía. Agregá la primera arriba."}
      </p>
    );
  }

  return (
    <ul className="lista">
      {tareas.map((tarea) => (
        <TareaItem key={tarea.id} tarea={tarea} onCambio={onCambio} />
      ))}
    </ul>
  );
}

export default ListaTareas;
