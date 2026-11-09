-- Códigos de un solo uso para restablecer contraseñas de administradores bloqueados.
CREATE TABLE IF NOT EXISTS CodigoRestablecimientoAdmin (
    id_solicitud CHAR(36) NOT NULL PRIMARY KEY,
    id_usuario INT NOT NULL,
    codigo_hash CHAR(64) NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en DATETIME NOT NULL,
    intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
    consumido_en DATETIME NULL,
    CONSTRAINT fk_codigo_restablecimiento_admin_usuario
        FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_codigo_restablecimiento_admin_activo (id_usuario,consumido_en,expira_en)
) ENGINE=InnoDB;
