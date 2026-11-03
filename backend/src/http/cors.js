function aplicarCors(req, res, origenesPermitidos) {
  const origen = req.headers.origin;
  res.setHeader("Vary", "Origin");
  if (!origen || !origenesPermitidos.includes(origen)) return false;
  res.setHeader("Access-Control-Allow-Origin", origen);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "600");
  return true;
}

export { aplicarCors };
