-- Extiende los informes para registrar asistencia de tutorías, estudiantes SAT y adjuntos.
CREATE TABLE IF NOT EXISTS InformeTutorDetalle (
  id_informe INT PRIMARY KEY,
  fecha_monitoria DATE NOT NULL,
  hora_inicio_real TIME NOT NULL,
  hora_fin_real TIME NOT NULL,
  lugar VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad_asistentes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  cantidad_sat SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  estudiantes_asistieron JSON NOT NULL,
  detalle_sat JSON NOT NULL,
  recuperada BOOLEAN NOT NULL DEFAULT FALSE,
  id_recuperacion INT NULL UNIQUE,
  CONSTRAINT chk_informe_tutor_horas CHECK (hora_fin_real > hora_inicio_real),
  CONSTRAINT fk_informe_tutor_detalle FOREIGN KEY (id_informe) REFERENCES Informe(id_informe) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE InformeTutorDetalle ADD COLUMN IF NOT EXISTS id_recuperacion INT NULL UNIQUE;

CREATE TABLE IF NOT EXISTS AdjuntoInformeTutor (
  id_adjunto INT AUTO_INCREMENT PRIMARY KEY,
  id_informe INT NOT NULL,
  categoria ENUM('Asistencia','Actividades','EvidenciaInicio','EvidenciaFin') NOT NULL,
  nombre_archivo VARCHAR(150) NOT NULL,
  tipo_archivo VARCHAR(100) NOT NULL,
  ruta_archivo VARCHAR(500) NOT NULL,
  tamano_archivo BIGINT UNSIGNED NOT NULL,
  fecha_carga DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_adjunto_informe_tutor FOREIGN KEY (id_informe) REFERENCES Informe(id_informe) ON DELETE CASCADE
) ENGINE=InnoDB;
