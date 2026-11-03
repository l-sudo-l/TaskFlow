import { crearRouter } from "./http/router.js";
import { enviarJson } from "./http/respuestas.js";
import { ErrorDeApp } from "./errores.js";
import { crearAuthControlador } from "./controladores/authControlador.js";

function crearApp({ config, servicios }) {
  const router = crearRouter();
  const auth = crearAuthControlador(servicios.auth);

  router.get("/api/salud", async () => ({ status: 200, datos: { ok: true } }));

  router.post("/api/auth/registro", auth.registro);
  router.post("/api/auth/login", auth.login);
  router.get("/api/auth/yo", auth.yo);

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
