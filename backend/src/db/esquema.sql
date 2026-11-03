CREATE TABLE IF NOT EXISTS usuarios (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre             varchar(60)  NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 60),
  email              varchar(254) NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash      text         NOT NULL,
  tareas_en_progreso integer      NOT NULL DEFAULT 0
                     CONSTRAINT limite_de_foco CHECK (tareas_en_progreso BETWEEN 0 AND 3),
  creado_en          timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tareas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     uuid         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo         varchar(100) NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 100),
  descripcion    varchar(500) NOT NULL DEFAULT '',
  prioridad      varchar(5)   NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
  categoria      varchar(30)  NOT NULL DEFAULT '',
  fecha_limite   date,
  estado         varchar(11)  NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente', 'en_progreso', 'completada')),
  creada_en      timestamptz  NOT NULL DEFAULT now(),
  actualizada_en timestamptz  NOT NULL DEFAULT now(),
  completada_en  timestamptz
);

CREATE INDEX IF NOT EXISTS tareas_por_usuario ON tareas (usuario_id, estado);
