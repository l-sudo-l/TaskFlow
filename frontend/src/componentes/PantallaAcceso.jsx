import { useState } from "react";
import { api } from "../api/cliente.js";

const VACIO = { nombre: "", email: "", password: "" };

function PantallaAcceso({ onIngresar, aviso }) {
  const [modo, setModo] = useState("ingresar");
  const [datos, setDatos] = useState(VACIO);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const esRegistro = modo === "registro";

  function cambiarModo(nuevo) {
    setModo(nuevo);
    setError("");
  }

  function actualizar(campo) {
    return (evento) => setDatos({ ...datos, [campo]: evento.target.value });
  }

  async function enviar(evento) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const respuesta = esRegistro
        ? await api.registrar(datos)
        : await api.ingresar({ email: datos.email, password: datos.password });
      onIngresar(respuesta);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="acceso">
      <section className="acceso-presentacion">
        <h1 className="marca">TaskFlow</h1>
        <p className="lema">Lo vencido arriba. Máximo tres cosas a la vez. Terminá antes de empezar otra.</p>
      </section>

      <section className="tarjeta acceso-tarjeta">
        <div className="pestanas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!esRegistro}
            className={!esRegistro ? "activa" : ""}
            onClick={() => cambiarModo("ingresar")}
          >
            Ingresar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={esRegistro}
            className={esRegistro ? "activa" : ""}
            onClick={() => cambiarModo("registro")}
          >
            Crear cuenta
          </button>
        </div>

        {aviso && <p className="mensaje mensaje-info">{aviso}</p>}

        <form onSubmit={enviar} className="formulario">
          {esRegistro && (
            <label>
              Nombre
              <input value={datos.nombre} onChange={actualizar("nombre")} autoComplete="name" required minLength={2} maxLength={60} />
            </label>
          )}
          <label>
            Email
            <input type="email" value={datos.email} onChange={actualizar("email")} autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={datos.password}
              onChange={actualizar("password")}
              autoComplete={esRegistro ? "new-password" : "current-password"}
              required
              minLength={esRegistro ? 8 : undefined}
            />
          </label>
          {esRegistro && <p className="ayuda">Mínimo 8 caracteres, con al menos una letra y un número.</p>}

          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}

          <button type="submit" className="boton boton-principal" disabled={enviando}>
            {enviando ? "Un momento…" : esRegistro ? "Crear cuenta" : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default PantallaAcceso;
