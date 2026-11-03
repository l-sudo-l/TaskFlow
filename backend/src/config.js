const enProduccion = process.env.NODE_ENV === "production";

function leerConfig(env = process.env) {
  const jwtSecret = env.JWT_SECRET || (enProduccion ? "" : "secreto-solo-para-desarrollo");
  if (!jwtSecret) {
    throw new Error("Falta la variable de entorno JWT_SECRET");
  }

  return {
    puerto: Number(env.PORT) || 3000,
    databaseUrl: env.DATABASE_URL || "",
    jwtSecret,
    diasToken: 7,
    origenesPermitidos: (env.FRONTEND_URL || "http://localhost:5173")
      .split(",")
      .map((origen) => origen.trim().replace(/\/$/, ""))
      .filter(Boolean),
  };
}

export { leerConfig };
