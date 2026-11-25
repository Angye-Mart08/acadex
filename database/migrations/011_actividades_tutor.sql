CREATE TABLE IF NOT EXISTS ActividadTutor (
    id_actividad INT AUTO_INCREMENT PRIMARY KEY,
    id_tutor INT NOT NULL,
    id_estudiante INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion VARCHAR(2000) NOT NULL,
    vence_en BIGINT NOT NULL,
    nombre_adjunto VARCHAR(180) NOT NULL,
    adjunto MEDIUMBLOB NOT NULL,
    entregado_en BIGINT NULL,
    nombre_entrega VARCHAR(180) NULL,
    entrega MEDIUMBLOB NULL,
    INDEX idx_actividad_tutor (id_tutor, vence_en),
    INDEX idx_actividad_estudiante (id_estudiante, vence_en),
    CONSTRAINT fk_actividad_tutor FOREIGN KEY (id_tutor) REFERENCES Usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_actividad_estudiante FOREIGN KEY (id_estudiante) REFERENCES Estudiante (id_estudiante) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
