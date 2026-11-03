const formatoHoy = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function hoyEnArgentina() {
  return formatoHoy.format(new Date());
}

function diasEntre(desde, hasta) {
  const unDia = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / unDia);
}

function describirFechaLimite(fechaLimite, hoy = hoyEnArgentina()) {
  if (!fechaLimite) return null;
  const [anio, mes, dia] = fechaLimite.split("-");
  const corta = `${dia}/${mes}${anio === hoy.slice(0, 4) ? "" : `/${anio}`}`;
  const dias = diasEntre(hoy, fechaLimite);
  if (dias === 0) return `Vence hoy (${corta})`;
  if (dias === 1) return `Vence mañana (${corta})`;
  if (dias > 1) return `Vence el ${corta}`;
  if (dias === -1) return `Venció ayer (${corta})`;
  return `Venció hace ${-dias} días (${corta})`;
}

export { hoyEnArgentina, describirFechaLimite };
