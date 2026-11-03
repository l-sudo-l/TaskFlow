import { ErrorNoEncontrado, ErrorValidacion } from "../errores.js";

const PRIORIDADES = ["alta", "media", "baja"];
const ESTADOS = ["pendiente", "en_progreso", "completada"];
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaReal(texto) {
  if (!FORMATO_FECHA.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === texto;
}

function textoOpcional(valor, maximo, nombreCampo) {
  if (valor === undefined || valor === null) return "";
  if (typeof valor !== "string") throw new ErrorValidacion(`${nombreCampo} tiene que ser texto`);
  const limpio = valor.trim();
  if (limpio.length > maximo) {
    throw new ErrorValidacion(`${nombreCampo} puede tener hasta ${maximo} caracteres`);
  }
  return limpio;
}

const validadores = {
  titulo(valor) {
    const titulo = typeof valor === "string" ? valor.trim() : "";
    if (titulo.length === 0) throw new ErrorValidacion("El título es obligatorio");
    if (titulo.length > 100) throw new ErrorValidacion("El título puede tener hasta 100 caracteres");
    return titulo;
  },
  descripcion: (valor) => textoOpcional(valor, 500, "La descripción"),
  categoria: (valor) => textoOpcional(valor, 30, "La categoría"),
  prioridad(valor) {
    if (valor === undefined || valor === null || valor === "") return "media";
    if (!PRIORIDADES.includes(valor)) {
      throw new ErrorValidacion("La prioridad tiene que ser alta, media o baja");
    }
    return valor;
  },
  fechaLimite(valor, { hoy }) {
    if (valor === undefined || valor === null || valor === "") return null;
    if (typeof valor !== "string" || !esFechaReal(valor)) {
      throw new ErrorValidacion("La fecha límite tiene que tener el formato AAAA-MM-DD");
    }
    if (valor < hoy) {
      throw new ErrorValidacion("La fecha límite no puede ser anterior a hoy");
    }
    return valor;
  },
};

function comoObjeto(datos) {
  return datos && typeof datos === "object" && !Array.isArray(datos) ? datos : {};
}

function presentar(tarea) {
  return { ...tarea };
}

function crearTareaServicio({ tareas, reloj }) {
  async function crear(usuarioId, datosRecibidos) {
    const datos = comoObjeto(datosRecibidos);
    const hoy = reloj.hoy();
    const nueva = {
      titulo: validadores.titulo(datos.titulo),
      descripcion: validadores.descripcion(datos.descripcion),
      categoria: validadores.categoria(datos.categoria),
      prioridad: validadores.prioridad(datos.prioridad),
      fechaLimite: validadores.fechaLimite(datos.fechaLimite, { hoy }),
    };
    return presentar(await tareas.crear(usuarioId, nueva));
  }

  async function listar(usuarioId) {
    const lista = await tareas.listar(usuarioId, {});
    return lista.map(presentar);
  }

  async function buscarPropia(usuarioId, id) {
    const tarea = await tareas.buscar(usuarioId, id);
    if (!tarea) throw new ErrorNoEncontrado("La tarea no existe");
    return tarea;
  }

  async function obtener(usuarioId, id) {
    return presentar(await buscarPropia(usuarioId, id));
  }

  return { crear, listar, obtener };
}

export { crearTareaServicio, PRIORIDADES, ESTADOS };
