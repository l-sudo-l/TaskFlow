import { ErrorPedidoMuyGrande, ErrorValidacion } from "../errores.js";

const LIMITE_CUERPO_BYTES = 100 * 1024;

async function leerJson(req) {
  const declarado = Number(req.headers["content-length"]);
  if (declarado > LIMITE_CUERPO_BYTES) throw new ErrorPedidoMuyGrande();

  const pedazos = [];
  let total = 0;
  for await (const pedazo of req) {
    total += pedazo.length;
    if (total > LIMITE_CUERPO_BYTES) throw new ErrorPedidoMuyGrande();
    pedazos.push(pedazo);
  }

  const crudo = Buffer.concat(pedazos).toString("utf8");
  if (crudo.trim() === "") return {};
  try {
    return JSON.parse(crudo);
  } catch {
    throw new ErrorValidacion("El cuerpo del pedido no es un JSON válido");
  }
}

function enviarJson(res, status, datos) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (status === 413) res.setHeader("Connection", "close");
  if (status === 204) {
    res.writeHead(204);
    res.end();
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(datos));
}

export { leerJson, enviarJson, LIMITE_CUERPO_BYTES };
