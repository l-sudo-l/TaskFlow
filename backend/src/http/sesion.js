import { ErrorNoAutorizado } from "../errores.js";

function tokenDelPedido(req) {
  const encabezado = req.headers.authorization || "";
  const [tipo, token] = encabezado.split(" ");
  if (tipo !== "Bearer" || !token) {
    throw new ErrorNoAutorizado();
  }
  return token;
}

export { tokenDelPedido };
