-- Tokens breves y de un solo uso para seleccionar rol al iniciar sesión.
CREATE TABLE IF NOT EXISTS SesionPreAutenticacion (
    id_sesion CHAR(36) NOT NULL PRIMARY KEY,
    id_usuario INT NOT NULL,
    creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en DATETIME NOT NULL,
    revocada_en DATETIME NULL,
    CONSTRAINT fk_sesion_preautenticacion_usuario
        FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_preautenticacion_usuario (id_usuario, revocada_en, expira_en)
) ENGINE=InnoDB;
