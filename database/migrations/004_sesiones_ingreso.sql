-- Sesiones de autenticación (JWT) para permitir revocación inmediata al cerrar sesión.
CREATE TABLE IF NOT EXISTS SesionIngreso (
    id_sesion CHAR(36) NOT NULL PRIMARY KEY,
    id_usuario INT NOT NULL,
    rol_activo ENUM('Administrador', 'Tutor', 'Monitor', 'Estudiante') NOT NULL,
    creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en DATETIME NOT NULL,
    revocada_en DATETIME NULL,
    CONSTRAINT fk_sesion_ingreso_usuario
        FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_sesion_ingreso_usuario_activa (id_usuario, revocada_en, expira_en)
) ENGINE=InnoDB;
