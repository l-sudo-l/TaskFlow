import { crearApp } from "../src/app.js";
import { leerConfig } from "../src/config.js";
import { crearRelojFijo } from "../src/reloj.js";
import { crearAuthServicio } from "../src/servicios/authServicio.js";
import { crearUsuariosEnMemoria } from "./enMemoria.js";
import { levantarServidor } from "./ayudantes.js";

async function levantarAppDePrueba({ env = {} } = {}) {
  const config = leerConfig({ JWT_SECRET: "secreto-de-test", ...env });
  const reloj = crearRelojFijo("2026-11-02T15:00:00-03:00");
  const usuarios = crearUsuariosEnMemoria();
  const servicios = {
    auth: crearAuthServicio({ usuarios, reloj, secreto: config.jwtSecret }),
  };
  const servidor = await levantarServidor(crearApp({ config, servicios }));
  return { ...servidor, reloj, servicios };
}

export { levantarAppDePrueba };
