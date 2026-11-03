function Resumen({ resumen, filtros, onFiltrar }) {
  if (!resumen) return null;

  const enProgresoLleno = resumen.en_progreso >= resumen.limiteEnProgreso;
  const datos = [
    { clave: "pendiente", numero: resumen.pendiente, etiqueta: "Pendientes", filtro: { estado: "pendiente" } },
    {
      clave: "en_progreso",
      numero: `${resumen.en_progreso}/${resumen.limiteEnProgreso}`,
      etiqueta: enProgresoLleno ? "En progreso (lleno)" : "En progreso",
      filtro: { estado: "en_progreso" },
      clase: enProgresoLleno ? "lleno" : "",
    },
    { clave: "completada", numero: resumen.completada, etiqueta: "Completadas", filtro: { estado: "completada" } },
    {
      clave: "vencidas",
      numero: resumen.vencidas,
      etiqueta: "Vencidas",
      filtro: { vencidas: true },
      clase: resumen.vencidas > 0 ? "alerta" : "",
    },
  ];

  const estaActivo = (filtro) =>
    filtro.vencidas ? filtros.vencidas : filtros.estado === filtro.estado && !filtros.vencidas;

  return (
    <section className="resumen" aria-label="Resumen de tareas">
      {datos.map(({ clave, numero, etiqueta, filtro, clase = "" }) => {
        const activo = estaActivo(filtro);
        return (
          <button
            key={clave}
            type="button"
            className={`tarjeta resumen-dato ${clase} ${activo ? "activo" : ""}`}
            onClick={() => onFiltrar(activo ? {} : filtro)}
            aria-pressed={activo}
          >
            <span className="resumen-numero">{numero}</span>
            <span className="resumen-etiqueta">{etiqueta}</span>
          </button>
        );
      })}
    </section>
  );
}

export default Resumen;
