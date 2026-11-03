import { leerJson } from "../http/respuestas.js";
import { tokenDelPedido } from "../http/sesion.js";

function crearAuthControlador(authServicio) {
  return {
    async registro({ req }) {
      const datos = await leerJson(req);
      return { status: 201, datos: await authServicio.registrar(datos) };
    },

    async login({ req }) {
      const datos = await leerJson(req);
      return { status: 200, datos: await authServicio.iniciarSesion(datos) };
    },

    async yo({ req }) {
      const usuario = await authServicio.usuarioDelToken(tokenDelPedido(req));
      return { status: 200, datos: { usuario } };
    },
  };
}

export { crearAuthControlador };
