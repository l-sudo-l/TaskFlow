import { useEffect, useState } from "react";
import { avisos } from "../api/cliente.js";

function AvisoServidorLento() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mostrar = () => setVisible(true);
    const ocultar = () => setVisible(false);
    avisos.addEventListener("servidor-lento", mostrar);
    avisos.addEventListener("servidor-respondio", ocultar);
    return () => {
      avisos.removeEventListener("servidor-lento", mostrar);
      avisos.removeEventListener("servidor-respondio", ocultar);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="aviso-lento" role="status">
      Despertando el servidor… La primera carga después de un rato puede tardar hasta un minuto.
    </div>
  );
}

export default AvisoServidorLento;
