import { useCallback, useEffect, useState } from "react";
import { api } from "../api/cliente.js";
import Resumen from "./Resumen.jsx";
import NuevaTarea from "./NuevaTarea.jsx";
import Filtros from "./Filtros.jsx";
import ListaTareas from "./ListaTareas.jsx";

const FILTROS_INICIALES = { q: "", estado: "", prioridad: "", categoria: "", vencidas: false };

function useDemora(valor, milisegundos) {
  const [demorado, setDemorado] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setDemorado(valor), milisegundos);
    return () => clearTimeout(id);
  }, [valor, milisegundos]);
  return demorado;
}

function PantallaTareas({ usuario, onSalir }) {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [tareas, setTareas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const filtrosDemorados = useDemora(filtros, 300);

  const recargar = useCallback(async () => {
    setError("");
    try {
      const [lista, datosResumen] = await Promise.all([api.listarTareas(filtrosDemorados), api.resumen()]);
      setTareas(lista.tareas);
      setResumen(datosResumen.resumen);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [filtrosDemorados]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const hayFiltros = Object.entries(filtros).some(([clave, valor]) => valor !== FILTROS_INICIALES[clave]);

  return (
    <>
      <header className="encabezado">
        <h1 className="marca">TaskFlow</h1>
        <div className="encabezado-usuario">
          <span>Hola, {usuario.nombre}</span>
          <button type="button" className="boton boton-chico" onClick={onSalir}>
            Salir
          </button>
        </div>
      </header>

      <main className="contenido">
        <Resumen
          resumen={resumen}
          filtros={filtros}
          onFiltrar={(cambios) => setFiltros({ ...FILTROS_INICIALES, ...cambios })}
        />
        <NuevaTarea onCreada={recargar} />
        <Filtros filtros={filtros} onCambiar={setFiltros} onLimpiar={() => setFiltros(FILTROS_INICIALES)} hayFiltros={hayFiltros} />

        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
        {cargando ? (
          <p className="lista-vacia">Cargando tareas…</p>
        ) : (
          <ListaTareas tareas={tareas} hayFiltros={hayFiltros} onCambio={recargar} />
        )}
      </main>
    </>
  );
}

export default PantallaTareas;
