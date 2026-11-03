function Filtros({ filtros, onCambiar, onLimpiar, hayFiltros }) {
  const actualizar = (campo) => (evento) => {
    const valor = evento.target.type === "checkbox" ? evento.target.checked : evento.target.value;
    onCambiar({ ...filtros, [campo]: valor });
  };

  return (
    <section className="filtros" aria-label="Filtros">
      <label>
        Buscar
        <input type="search" placeholder="Título o descripción" value={filtros.q} maxLength={100} onChange={actualizar("q")} />
      </label>
      <label>
        Estado
        <select value={filtros.estado} onChange={actualizar("estado")}>
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_progreso">En progreso</option>
          <option value="completada">Completada</option>
        </select>
      </label>
      <label>
        Prioridad
        <select value={filtros.prioridad} onChange={actualizar("prioridad")}>
          <option value="">Todas</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
      </label>
      <label>
        Categoría
        <input value={filtros.categoria} maxLength={30} placeholder="Todas" onChange={actualizar("categoria")} />
      </label>
      <div className="filtro-check">
        <label className="filtro-check">
          <input type="checkbox" checked={filtros.vencidas} onChange={actualizar("vencidas")} />
          Solo vencidas
        </label>
        {hayFiltros && (
          <button type="button" className="enlace" onClick={onLimpiar}>
            Limpiar
          </button>
        )}
      </div>
    </section>
  );
}

export default Filtros;
