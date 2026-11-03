class ErrorDeApp extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class ErrorValidacion extends ErrorDeApp {
  constructor(mensaje) {
    super(mensaje, 400);
  }
}

class ErrorNoAutorizado extends ErrorDeApp {
  constructor(mensaje = "Tenés que iniciar sesión") {
    super(mensaje, 401);
  }
}

class ErrorNoEncontrado extends ErrorDeApp {
  constructor(mensaje = "No encontrado") {
    super(mensaje, 404);
  }
}

class ErrorConflicto extends ErrorDeApp {
  constructor(mensaje) {
    super(mensaje, 409);
  }
}

class ErrorPedidoMuyGrande extends ErrorDeApp {
  constructor(mensaje = "El pedido es demasiado grande") {
    super(mensaje, 413);
  }
}

export {
  ErrorDeApp,
  ErrorValidacion,
  ErrorNoAutorizado,
  ErrorNoEncontrado,
  ErrorConflicto,
  ErrorPedidoMuyGrande,
};
