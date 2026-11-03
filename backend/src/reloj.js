const ZONA_DEL_USUARIO = "America/Argentina/Buenos_Aires";

const formatoFecha = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_DEL_USUARIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fechaEnArgentina(instante) {
  return formatoFecha.format(instante);
}

function crearReloj(obtenerAhora = () => new Date()) {
  return {
    ahora: () => obtenerAhora(),
    hoy: () => fechaEnArgentina(obtenerAhora()),
  };
}

function crearRelojFijo(isoInicial) {
  let actual = new Date(isoInicial);
  const reloj = crearReloj(() => actual);
  reloj.fijar = (iso) => {
    actual = new Date(iso);
  };
  return reloj;
}

export { crearReloj, crearRelojFijo, fechaEnArgentina, ZONA_DEL_USUARIO };
