import { leerJson } from "../http/respuestas.js";
import { tokenDelPedido } from "../http/sesion.js";

function crearTareaControlador({ authServicio, tareaServicio }) {
  function usuarioId(req) {
    return authServicio.verificarToken(tokenDelPedido(req));
  }

  return {
    async listar({ req, query }) {
      const tareas = await tareaServicio.listar(usuarioId(req), Object.fromEntries(query));
      return { status: 200, datos: { tareas } };
    },

    async resumen({ req }) {
      return { status: 200, datos: { resumen: await tareaServicio.resumen(usuarioId(req)) } };
    },

    async crear({ req }) {
      const id = usuarioId(req);
      const datos = await leerJson(req);
      return { status: 201, datos: { tarea: await tareaServicio.crear(id, datos) } };
    },

    async obtener({ req, params }) {
      const tarea = await tareaServicio.obtener(usuarioId(req), params.id);
      return { status: 200, datos: { tarea } };
    },

    async cambiarEstado({ req, params }) {
      const id = usuarioId(req);
      const datos = await leerJson(req);
      return { status: 200, datos: { tarea: await tareaServicio.cambiarEstado(id, params.id, datos) } };
    },

    async editar({ req, params }) {
      const id = usuarioId(req);
      const datos = await leerJson(req);
      return { status: 200, datos: { tarea: await tareaServicio.editar(id, params.id, datos) } };
    },

    async eliminar({ req, params }) {
      await tareaServicio.eliminar(usuarioId(req), params.id);
      return { status: 204 };
    },
  };
}

export { crearTareaControlador };
