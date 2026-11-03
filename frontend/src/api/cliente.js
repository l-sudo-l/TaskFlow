const URL_API = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const CLAVE_TOKEN = "taskflow.token";
const ESPERA_ANTES_DE_AVISAR_MS = 4000;

class ErrorDeApi extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

function leerToken() {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

function guardarToken(token) {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // Sin localStorage (modo privado): la sesión dura hasta cerrar la pestaña.
  }
}

const avisos = new EventTarget();

async function pedir(ruta, { metodo = "GET", cuerpo } = {}) {
  const headers = {};
  const token = leerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) headers["Content-Type"] = "application/json";

  const temporizador = setTimeout(
    () => avisos.dispatchEvent(new Event("servidor-lento")),
    ESPERA_ANTES_DE_AVISAR_MS,
  );

  let respuesta;
  try {
    respuesta = await fetch(`${URL_API}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorDeApi("No se pudo conectar con el servidor. Revisá tu conexión.", 0);
  } finally {
    clearTimeout(temporizador);
    avisos.dispatchEvent(new Event("servidor-respondio"));
  }

  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) {
      guardarToken(null);
      avisos.dispatchEvent(new Event("sesion-vencida"));
    }
    throw new ErrorDeApi(datos.error || "Algo salió mal, probá de nuevo", respuesta.status);
  }
  return datos;
}

function armarQuery(filtros) {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor) parametros.set(clave, valor === true ? "1" : valor);
  }
  const texto = parametros.toString();
  return texto ? `?${texto}` : "";
}

const api = {
  registrar: (datos) => pedir("/api/auth/registro", { metodo: "POST", cuerpo: datos }),
  ingresar: (datos) => pedir("/api/auth/login", { metodo: "POST", cuerpo: datos }),
  yo: () => pedir("/api/auth/yo"),
  listarTareas: (filtros = {}) => pedir(`/api/tareas${armarQuery(filtros)}`),
  resumen: () => pedir("/api/tareas/resumen"),
  crearTarea: (datos) => pedir("/api/tareas", { metodo: "POST", cuerpo: datos }),
  editarTarea: (id, datos) => pedir(`/api/tareas/${id}`, { metodo: "PATCH", cuerpo: datos }),
  cambiarEstado: (id, estado) => pedir(`/api/tareas/${id}/estado`, { metodo: "PATCH", cuerpo: { estado } }),
  eliminarTarea: (id) => pedir(`/api/tareas/${id}`, { metodo: "DELETE" }),
};

export { api, avisos, leerToken, guardarToken, ErrorDeApi };
