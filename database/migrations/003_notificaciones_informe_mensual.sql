-- Notificaciones persistentes por usuario
CREATE TABLE IF NOT EXISTS Notificacion (
  id_notificacion BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  categoria ENUM('Solicitud','Sesion','Informe','Sistema') NOT NULL DEFAULT 'Sistema',
  titulo VARCHAR(160) NOT NULL,
  mensaje VARCHAR(600) NOT NULL,
  entidad_tipo VARCHAR(40),
  entidad_id INT,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  INDEX idx_notificacion_usuario_fecha (id_usuario,fecha),
  INDEX idx_notificacion_usuario_leida (id_usuario,leida,fecha),
  CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Borrador mensual editable antes de recibir/aplicar la plantilla institucional
CREATE TABLE IF NOT EXISTS InformeMensualTutor (
  id_informe_mensual INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  periodo_mes CHAR(7) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  contenido JSON NOT NULL,
  estado ENUM('Borrador','Enviado') NOT NULL DEFAULT 'Borrador',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  enviado_en DATETIME,
  UNIQUE KEY uq_informe_mensual_tutor (id_usuario,periodo_mes),
  CONSTRAINT fk_informe_mensual_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB;
