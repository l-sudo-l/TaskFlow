import { leerJson } from "../http/respuestas.js";
import { tokenDelPedido } from "../http/sesion.js";

function crearTareaControlador({ authServicio, tareaServicio }) {
  function usuarioId(req) {
    return authServicio.verificarToken(tokenDelPedido(req));
  }

  return {
    async listar({ req }) {
      const tareas = await tareaServicio.listar(usuarioId(req));
      return { status: 200, datos: { tareas } };
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
  };
}

export { crearTareaControlador };
