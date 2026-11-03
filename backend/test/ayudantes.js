import http from "node:http";

async function levantarServidor(manejador) {
  const servidor = http.createServer(manejador);
  await new Promise((resolver) => servidor.listen(0, "127.0.0.1", resolver));
  const { port } = servidor.address();
  return {
    url: `http://127.0.0.1:${port}`,
    cerrar: () => new Promise((resolver) => servidor.close(resolver)),
  };
}

async function pedir(base, metodo, ruta, { cuerpo, token, headers = {} } = {}) {
  const opciones = { method: metodo, headers: { ...headers } };
  if (token) opciones.headers.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo);
  }
  const respuesta = await fetch(base + ruta, opciones);
  const texto = await respuesta.text();
  return {
    status: respuesta.status,
    headers: respuesta.headers,
    datos: texto ? JSON.parse(texto) : null,
  };
}

export { levantarServidor, pedir };
