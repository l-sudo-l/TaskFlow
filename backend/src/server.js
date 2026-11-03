import http from "node:http";
import { crearApp } from "./app.js";
import { leerConfig } from "./config.js";

const config = leerConfig();
const servidor = http.createServer(crearApp({ config }));

servidor.listen(config.puerto, () => {
  console.log(`TaskFlow API escuchando en el puerto ${config.puerto}`);
});
