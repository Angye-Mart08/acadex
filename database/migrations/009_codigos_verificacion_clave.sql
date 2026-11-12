CREATE TABLE IF NOT EXISTS CodigoVerificacionClave (
  id_codigo CHAR(36) PRIMARY KEY,
  id_usuario INT NOT NULL,
  proposito ENUM('bloqueo','cuenta') NOT NULL,
  codigo_hash CHAR(64) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en TIMESTAMP NOT NULL,
  intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  verificado_en TIMESTAMP NULL,
  consumido_en TIMESTAMP NULL,
  INDEX idx_codigo_verificacion_usuario (id_usuario, proposito, creado_en),
  CONSTRAINT fk_codigo_verificacion_usuario FOREIGN KEY (id_usuario)
    REFERENCES Usuario(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
