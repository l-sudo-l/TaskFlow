import { crearApp } from "../src/app.js";
import { leerConfig } from "../src/config.js";
import { crearRelojFijo } from "../src/reloj.js";
import { crearAuthServicio } from "../src/servicios/authServicio.js";
import { crearTareaServicio } from "../src/servicios/tareaServicio.js";
import { crearRepositoriosEnMemoria } from "./enMemoria.js";
import { levantarServidor, pedir } from "./ayudantes.js";

async function levantarAppDePrueba({ env = {} } = {}) {
  const config = leerConfig({ JWT_SECRET: "secreto-de-test", ...env });
  const reloj = crearRelojFijo("2026-11-02T15:00:00-03:00");
  const repos = crearRepositoriosEnMemoria({ reloj });
  const servicios = {
    auth: crearAuthServicio({ usuarios: repos.usuarios, reloj, secreto: config.jwtSecret }),
    tareas: crearTareaServicio({ tareas: repos.tareas, reloj }),
  };
  const servidor = await levantarServidor(crearApp({ config, servicios }));

  let contador = 0;
  async function nuevoUsuario() {
    contador += 1;
    const r = await pedir(servidor.url, "POST", "/api/auth/registro", {
      cuerpo: { nombre: `Usuario ${contador}`, email: `u${contador}@mail.com`, password: "clave1234" },
    });
    return r.datos.token;
  }

  return { ...servidor, reloj, servicios, repos, nuevoUsuario };
}

export { levantarAppDePrueba };
