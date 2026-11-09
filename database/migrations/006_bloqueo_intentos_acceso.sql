-- Fallos consecutivos de acceso, esperas progresivas y solicitudes de cambio de clave.
CREATE TABLE IF NOT EXISTS ControlAcceso (
    id_usuario INT NOT NULL PRIMARY KEY,
    intentos_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
    bloqueada_hasta DATETIME NULL,
    tipo_bloqueo ENUM('espera','suspension24h') NULL,
    cambio_clave_solicitado_en DATETIME NULL,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_control_acceso_usuario
        FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_control_acceso_bloqueo (tipo_bloqueo,bloqueada_hasta)
) ENGINE=InnoDB;
