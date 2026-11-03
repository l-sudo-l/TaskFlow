function compilarPatron(patron) {
  const nombres = [];
  const regex = patron.replace(/:(\w+)/g, (_, nombre) => {
    nombres.push(nombre);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${regex}/?$`), nombres };
}

function crearRouter() {
  const rutas = [];

  function agregar(metodo, patron, manejador) {
    rutas.push({ metodo, ...compilarPatron(patron), manejador });
  }

  function buscar(metodo, ruta) {
    let existeLaRuta = false;
    for (const candidata of rutas) {
      const coincidencia = candidata.regex.exec(ruta);
      if (!coincidencia) continue;
      existeLaRuta = true;
      if (candidata.metodo !== metodo) continue;
      const params = {};
      candidata.nombres.forEach((nombre, i) => {
        params[nombre] = decodeURIComponent(coincidencia[i + 1]);
      });
      return { manejador: candidata.manejador, params };
    }
    return { manejador: null, existeLaRuta };
  }

  return {
    get: (patron, manejador) => agregar("GET", patron, manejador),
    post: (patron, manejador) => agregar("POST", patron, manejador),
    patch: (patron, manejador) => agregar("PATCH", patron, manejador),
    delete: (patron, manejador) => agregar("DELETE", patron, manejador),
    buscar,
  };
}

export { crearRouter };
