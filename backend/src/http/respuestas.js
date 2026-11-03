import { ErrorValidacion } from "../errores.js";

async function leerJson(req) {
  let crudo = "";
  for await (const pedazo of req) {
    crudo += pedazo;
  }
  if (crudo.trim() === "") return {};
  try {
    return JSON.parse(crudo);
  } catch {
    throw new ErrorValidacion("El cuerpo del pedido no es un JSON válido");
  }
}

function enviarJson(res, status, datos) {
  if (status === 204) {
    res.writeHead(204);
    res.end();
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(datos));
}

export { leerJson, enviarJson };
