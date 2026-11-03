import { crearRouter } from "./http/router.js";
import { enviarJson } from "./http/respuestas.js";
import { ErrorDeApp } from "./errores.js";

function crearApp({ config }) {
  const router = crearRouter();

  router.get("/api/salud", async () => ({ status: 200, datos: { ok: true } }));

  return async function manejarPedido(req, res) {
    try {
      const url = new URL(req.url, "http://localhost");
      const { manejador, params, existeLaRuta } = router.buscar(req.method, url.pathname);
      if (!manejador) {
        const status = existeLaRuta ? 405 : 404;
        enviarJson(res, status, { error: existeLaRuta ? "Método no permitido" : "Ruta no encontrada" });
        return;
      }
      const respuesta = await manejador({ req, params, query: url.searchParams });
      enviarJson(res, respuesta.status, respuesta.datos);
    } catch (error) {
      if (error instanceof ErrorDeApp) {
        enviarJson(res, error.status, { error: error.message });
        return;
      }
      console.error("Error inesperado:", error);
      enviarJson(res, 500, { error: "Error interno del servidor" });
    }
  };
}

export { crearApp };
