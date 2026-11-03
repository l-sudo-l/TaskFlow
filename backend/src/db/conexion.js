import { readFile } from "node:fs/promises";
import pg from "pg";

function crearPool(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("Falta la variable de entorno DATABASE_URL");
  }
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });
  pool.on("error", (error) => {
    console.error("Error en una conexión inactiva de la base:", error.message);
  });
  return pool;
}

async function crearTablas(pool) {
  const esquema = await readFile(new URL("./esquema.sql", import.meta.url), "utf8");
  await pool.query(esquema);
}

export { crearPool, crearTablas };
