import { useEffect, useState } from "react";
import { api, avisos, guardarToken, leerToken } from "./api/cliente.js";
import PantallaAcceso from "./componentes/PantallaAcceso.jsx";
import PantallaTareas from "./componentes/PantallaTareas.jsx";
import AvisoServidorLento from "./componentes/AvisoServidorLento.jsx";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(Boolean(leerToken()));
  const [avisoSesion, setAvisoSesion] = useState("");

  useEffect(() => {
    if (!leerToken()) return;
    api
      .yo()
      .then(({ usuario: actual }) => setUsuario(actual))
      .catch(() => guardarToken(null))
      .finally(() => setVerificando(false));
  }, []);

  useEffect(() => {
    const alVencer = () => {
      setUsuario(null);
      setAvisoSesion("Tu sesión venció. Volvé a ingresar.");
    };
    avisos.addEventListener("sesion-vencida", alVencer);
    return () => avisos.removeEventListener("sesion-vencida", alVencer);
  }, []);

  function alIngresar({ token, usuario: nuevo }) {
    guardarToken(token);
    setAvisoSesion("");
    setUsuario(nuevo);
  }

  function salir() {
    guardarToken(null);
    setUsuario(null);
  }

  let contenido;
  if (verificando) {
    contenido = <p className="cargando-pantalla">Cargando…</p>;
  } else if (usuario) {
    contenido = <PantallaTareas usuario={usuario} onSalir={salir} />;
  } else {
    contenido = <PantallaAcceso onIngresar={alIngresar} aviso={avisoSesion} />;
  }

  return (
    <>
      <AvisoServidorLento />
      {contenido}
    </>
  );
}

export default App;
