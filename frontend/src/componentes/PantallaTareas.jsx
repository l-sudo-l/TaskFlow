function PantallaTareas({ usuario, onSalir }) {
  return (
    <>
      <header className="encabezado">
        <h1 className="marca">TaskFlow</h1>
        <div className="encabezado-usuario">
          <span>Hola, {usuario.nombre}</span>
          <button type="button" className="boton boton-chico" onClick={onSalir}>
            Salir
          </button>
        </div>
      </header>
      <main className="contenido">
        <p>Próximamente: tus tareas.</p>
      </main>
    </>
  );
}

export default PantallaTareas;
