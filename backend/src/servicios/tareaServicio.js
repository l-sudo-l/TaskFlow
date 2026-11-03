import { ErrorConflicto, ErrorNoEncontrado, ErrorValidacion } from "../errores.js";

const PRIORIDADES = ["alta", "media", "baja"];
const ESTADOS = ["pendiente", "en_progreso", "completada"];
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const LIMITE_EN_PROGRESO = 3;
const CAMPOS_EDITABLES = ["titulo", "descripcion", "prioridad", "categoria", "fechaLimite"];

const TRANSICIONES = {
  pendiente: ["en_progreso"],
  en_progreso: ["pendiente", "completada"],
  completada: ["pendiente"],
};

const MENSAJES_TRANSICION = {
  "pendiente>completada": "Primero tenés que empezar la tarea (pasarla a en progreso)",
  "completada>en_progreso": "Para retomar una tarea completada, primero reabrila (pasala a pendiente)",
};

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

function estaVencida(tarea, hoy) {
  return Boolean(tarea.fechaLimite) && tarea.fechaLimite < hoy && tarea.estado !== "completada";
}

function presentar(tarea, hoy) {
  return { ...tarea, vencida: estaVencida(tarea, hoy) };
}

const ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 };

function compararTareas(a, b) {
  if (a.vencida !== b.vencida) return a.vencida ? -1 : 1;
  if (a.fechaLimite !== b.fechaLimite) {
    if (!a.fechaLimite) return 1;
    if (!b.fechaLimite) return -1;
    return a.fechaLimite < b.fechaLimite ? -1 : 1;
  }
  if (a.prioridad !== b.prioridad) return ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad];
  return a.creadaEn < b.creadaEn ? 1 : a.creadaEn > b.creadaEn ? -1 : 0;
}

function leerFiltros(recibidos) {
  const filtros = comoObjeto(recibidos);
  const resultado = {};
  if (filtros.estado) {
    if (!ESTADOS.includes(filtros.estado)) throw new ErrorValidacion("Filtro de estado inválido");
    resultado.estado = filtros.estado;
  }
  if (filtros.prioridad) {
    if (!PRIORIDADES.includes(filtros.prioridad)) throw new ErrorValidacion("Filtro de prioridad inválido");
    resultado.prioridad = filtros.prioridad;
  }
  if (filtros.categoria) resultado.categoria = textoOpcional(filtros.categoria, 30, "La categoría");
  if (filtros.q) resultado.texto = textoOpcional(filtros.q, 100, "La búsqueda");
  resultado.soloVencidas = filtros.vencidas === "1" || filtros.vencidas === "true" || filtros.vencidas === true;
  return resultado;
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
    return presentar(await tareas.crear(usuarioId, nueva), hoy);
  }

  async function listar(usuarioId, filtrosRecibidos) {
    const { soloVencidas, ...filtros } = leerFiltros(filtrosRecibidos);
    const hoy = reloj.hoy();
    const lista = (await tareas.listar(usuarioId, filtros)).map((tarea) => presentar(tarea, hoy));
    return lista.filter((tarea) => !soloVencidas || tarea.vencida).sort(compararTareas);
  }

  async function resumen(usuarioId) {
    const hoy = reloj.hoy();
    const conteo = { total: 0, pendiente: 0, en_progreso: 0, completada: 0, vencidas: 0 };
    for (const tarea of await tareas.listar(usuarioId, {})) {
      conteo.total += 1;
      conteo[tarea.estado] += 1;
      if (estaVencida(tarea, hoy)) conteo.vencidas += 1;
    }
    return { ...conteo, limiteEnProgreso: LIMITE_EN_PROGRESO };
  }

  async function buscarPropia(usuarioId, id) {
    const tarea = await tareas.buscar(usuarioId, id);
    if (!tarea) throw new ErrorNoEncontrado("La tarea no existe");
    return tarea;
  }

  async function obtener(usuarioId, id) {
    return presentar(await buscarPropia(usuarioId, id), reloj.hoy());
  }

  async function cambiarEstado(usuarioId, id, datosRecibidos) {
    const { estado: nuevoEstado } = comoObjeto(datosRecibidos);
    if (!ESTADOS.includes(nuevoEstado)) {
      throw new ErrorValidacion("El estado tiene que ser pendiente, en_progreso o completada");
    }
    const tarea = await buscarPropia(usuarioId, id);
    if (tarea.estado === nuevoEstado) return presentar(tarea, reloj.hoy());

    if (!TRANSICIONES[tarea.estado].includes(nuevoEstado)) {
      const clave = `${tarea.estado}>${nuevoEstado}`;
      throw new ErrorConflicto(MENSAJES_TRANSICION[clave] ?? "Ese cambio de estado no está permitido");
    }

    const variacionEnProgreso =
      (nuevoEstado === "en_progreso" ? 1 : 0) - (tarea.estado === "en_progreso" ? 1 : 0);

    const resultado = await tareas.cambiarEstado(usuarioId, id, {
      desde: tarea.estado,
      hacia: nuevoEstado,
      variacionEnProgreso,
    });
    if (resultado.limiteAlcanzado) {
      throw new ErrorConflicto(
        `Ya tenés ${LIMITE_EN_PROGRESO} tareas en progreso. Terminá o pausá alguna antes de empezar otra.`,
      );
    }
    if (!resultado.tarea) {
      throw new ErrorConflicto("La tarea cambió mientras la editabas. Recargá e intentá de nuevo.");
    }
    return presentar(resultado.tarea, reloj.hoy());
  }

  async function editar(usuarioId, id, datosRecibidos) {
    const datos = comoObjeto(datosRecibidos);
    const camposRecibidos = CAMPOS_EDITABLES.filter((campo) => Object.hasOwn(datos, campo));
    if (camposRecibidos.length === 0) {
      throw new ErrorValidacion("No mandaste ningún dato para cambiar");
    }

    const tarea = await buscarPropia(usuarioId, id);
    if (tarea.estado === "completada") {
      throw new ErrorConflicto("Una tarea completada no se puede editar. Reabrila primero.");
    }

    const hoy = reloj.hoy();
    const cambios = {};
    for (const campo of camposRecibidos) {
      const fechaSinCambios = campo === "fechaLimite" && datos.fechaLimite === tarea.fechaLimite;
      cambios[campo] = fechaSinCambios ? tarea.fechaLimite : validadores[campo](datos[campo], { hoy });
    }

    const actualizada = await tareas.actualizar(usuarioId, id, cambios);
    if (!actualizada) {
      throw new ErrorConflicto("La tarea cambió mientras la editabas. Recargá e intentá de nuevo.");
    }
    return presentar(actualizada, hoy);
  }

  async function eliminar(usuarioId, id) {
    const eliminada = await tareas.eliminar(usuarioId, id);
    if (!eliminada) throw new ErrorNoEncontrado("La tarea no existe");
  }

  return { crear, listar, resumen, obtener, cambiarEstado, editar, eliminar };
}

export { crearTareaServicio, PRIORIDADES, ESTADOS, LIMITE_EN_PROGRESO };
