import http from "node:http";
import { crearApp } from "./app.js";
import { leerConfig } from "./config.js";
import { crearPool, crearTablas } from "./db/conexion.js";
import { crearReloj } from "./reloj.js";
import { crearUsuarioRepositorio } from "./repositorios/usuarioRepositorio.js";
import { crearAuthServicio } from "./servicios/authServicio.js";

const config = leerConfig();
const pool = crearPool(config.databaseUrl);
await crearTablas(pool);

const reloj = crearReloj();
const usuarios = crearUsuarioRepositorio(pool);

const servicios = {
  auth: crearAuthServicio({ usuarios, reloj, secreto: config.jwtSecret, diasToken: config.diasToken }),
};

const servidor = http.createServer(crearApp({ config, servicios }));

servidor.listen(config.puerto, () => {
  console.log(`TaskFlow API escuchando en el puerto ${config.puerto}`);
});
