-- Mejora 2: restricciones adicionales de integridad para MariaDB.
-- Ejecutar una sola vez sobre una base ya existente, después del respaldo.
-- No elimina ni transforma registros. Si cualquier conteo de prevalidación
-- es mayor que cero, corregir esos datos antes de ejecutar los ALTER TABLE.

USE gestion_monitorias_tutorias;

-- PREVALIDACIÓN: todos los conteos deben ser cero.
SELECT 'Estudiante.semestre fuera de 1..12' AS regla, COUNT(*) AS registros_invalidos
FROM Estudiante WHERE semestre < 1 OR semestre > 12
UNION ALL
SELECT 'Tutor.horas_semanales fuera de 1..60', COUNT(*)
FROM Tutor WHERE horas_semanales IS NOT NULL AND (horas_semanales < 1 OR horas_semanales > 60)
UNION ALL
SELECT 'Monitor.horas_semanales fuera de 1..60', COUNT(*)
FROM Monitor WHERE horas_semanales IS NOT NULL AND (horas_semanales < 1 OR horas_semanales > 60)
UNION ALL
SELECT 'Asignatura.creditos fuera de 1..30', COUNT(*)
FROM Asignatura WHERE creditos IS NOT NULL AND (creditos < 1 OR creditos > 30)
UNION ALL
SELECT 'ProgramaAsignatura.semestre fuera de 1..12', COUNT(*)
FROM ProgramaAsignatura WHERE semestre IS NOT NULL AND (semestre < 1 OR semestre > 12)
UNION ALL
SELECT 'AsignacionAcademica.horas_semanales fuera de 1..60', COUNT(*)
FROM AsignacionAcademica WHERE horas_semanales < 1 OR horas_semanales > 60
UNION ALL
SELECT 'AsignacionAcademica.fecha_fin anterior a fecha_inicio', COUNT(*)
FROM AsignacionAcademica WHERE fecha_fin IS NOT NULL AND fecha_fin < fecha_inicio
UNION ALL
SELECT 'Espacio.capacidad fuera de 1..1000', COUNT(*)
FROM Espacio WHERE capacidad < 1 OR capacidad > 1000
UNION ALL
SELECT 'HorarioMonitor con hora o duración inválida', COUNT(*)
FROM HorarioMonitor WHERE hora_fin <= hora_inicio OR duracion_minutos < 1 OR duracion_minutos > 1440
UNION ALL
SELECT 'AsignacionEspacio.fecha_fin anterior a fecha_inicio', COUNT(*)
FROM AsignacionEspacio WHERE fecha_fin IS NOT NULL AND fecha_fin < fecha_inicio
UNION ALL
SELECT 'CancelacionMonitoria.dias_anticipacion negativo', COUNT(*)
FROM CancelacionMonitoria WHERE dias_anticipacion < 0
UNION ALL
SELECT 'ReporteMonitoria.hora_fin_real no posterior al inicio', COUNT(*)
FROM ReporteMonitoria WHERE hora_fin_real <= hora_inicio_real
UNION ALL
SELECT 'RecuperacionMonitoria.hora_fin no posterior al inicio', COUNT(*)
FROM RecuperacionMonitoria WHERE hora_fin <= hora_inicio
UNION ALL
SELECT 'Compromiso.fecha_cumplimiento anterior al compromiso', COUNT(*)
FROM Compromiso WHERE fecha_cumplimiento IS NOT NULL AND fecha_cumplimiento < fecha_compromiso;

-- APLICACIÓN: ejecutar solo tras confirmar que la prevalidación fue cero.
ALTER TABLE Estudiante
    ADD CONSTRAINT chk_estudiante_semestre CHECK (semestre BETWEEN 1 AND 12);

ALTER TABLE Tutor
    ADD CONSTRAINT chk_tutor_horas CHECK (horas_semanales IS NULL OR horas_semanales BETWEEN 1 AND 60);

ALTER TABLE Monitor
    ADD CONSTRAINT chk_monitor_horas CHECK (horas_semanales IS NULL OR horas_semanales BETWEEN 1 AND 60);

ALTER TABLE Asignatura
    ADD CONSTRAINT chk_asignatura_creditos CHECK (creditos IS NULL OR creditos BETWEEN 1 AND 30);

ALTER TABLE ProgramaAsignatura
    ADD CONSTRAINT chk_programa_asignatura_semestre CHECK (semestre IS NULL OR semestre BETWEEN 1 AND 12);

ALTER TABLE AsignacionAcademica
    ADD CONSTRAINT chk_asignacion_horas CHECK (horas_semanales BETWEEN 1 AND 60),
    ADD CONSTRAINT chk_asignacion_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio);

ALTER TABLE Espacio
    ADD CONSTRAINT chk_espacio_capacidad_rango CHECK (capacidad BETWEEN 1 AND 1000);

ALTER TABLE HorarioMonitor
    ADD CONSTRAINT chk_horario_monitor_tiempo CHECK (hora_fin > hora_inicio AND duracion_minutos BETWEEN 1 AND 1440);

ALTER TABLE AsignacionEspacio
    ADD CONSTRAINT chk_asignacion_espacio_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio);

ALTER TABLE CancelacionMonitoria
    ADD CONSTRAINT chk_cancelacion_dias CHECK (dias_anticipacion >= 0);

ALTER TABLE ReporteMonitoria
    ADD CONSTRAINT chk_reporte_monitoria_horario CHECK (hora_fin_real > hora_inicio_real);

ALTER TABLE RecuperacionMonitoria
    ADD CONSTRAINT chk_recuperacion_horario CHECK (hora_fin > hora_inicio);

ALTER TABLE Compromiso
    ADD CONSTRAINT chk_compromiso_fechas CHECK (fecha_cumplimiento IS NULL OR fecha_cumplimiento >= fecha_compromiso);

-- Verificación posterior: lista las restricciones CHECK instaladas.
SELECT table_name, constraint_name
FROM information_schema.table_constraints
WHERE constraint_schema = DATABASE()
  AND constraint_type = 'CHECK'
ORDER BY table_name, constraint_name;
