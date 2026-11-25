ALTER TABLE ActividadTutor
    ADD COLUMN IF NOT EXISTS id_sesion INT NULL,
    ADD INDEX IF NOT EXISTS idx_actividad_sesion (id_sesion);

ALTER TABLE ActividadTutor
    ADD CONSTRAINT fk_actividad_sesion
        FOREIGN KEY IF NOT EXISTS fk_actividad_sesion (id_sesion) REFERENCES Sesion (id_sesion)
        ON UPDATE CASCADE ON DELETE RESTRICT;
