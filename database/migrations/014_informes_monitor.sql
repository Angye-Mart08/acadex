-- Integra los informes legacy de monitoría al flujo unificado de reportes.
INSERT INTO Informe
  (id_sesion,id_usuario,titulo,contenido,actividades_desarrolladas,logros,dificultades,recomendaciones,estado)
SELECT rm.id_sesion,rm.id_usuario,CONCAT('Monitoría de ',a.nombre),
  JSON_OBJECT(
    'date',DATE_FORMAT(s.fecha,'%Y-%m-%d'),
    'startTime',TIME_FORMAT(rm.hora_inicio_real,'%H:%i'),
    'endTime',TIME_FORMAT(rm.hora_fin_real,'%H:%i'),
    'place',COALESCE(esp.nombre,''),
    'description',rm.actividad,
    'attendanceCount',IF(rm.asistencia='Si',1,0),
    'satCount',(SELECT COUNT(DISTINCT sg.id_estudiante) FROM Seguimiento sg WHERE sg.id_sesion=s.id_sesion AND sg.estado='Activo'),
    'attendees',IF(rm.asistencia='Si',JSON_ARRAY(so.id_estudiante),JSON_ARRAY()),
    'satDetails',JSON_ARRAY(),
    'recovered',FALSE
  ),
  LEFT(rm.actividad,2000),'',COALESCE(rm.observaciones,''),'','Borrador'
FROM ReporteMonitoria rm
JOIN Sesion s ON s.id_sesion=rm.id_sesion
JOIN Solicitud so ON so.id_solicitud=s.id_solicitud
JOIN Asignatura a ON a.id_asignatura=so.id_asignatura
LEFT JOIN AsignacionEspacio ae ON ae.id_asignacion_espacio=s.id_asignacion_espacio
LEFT JOIN Espacio esp ON esp.id_espacio=ae.id_espacio
WHERE rm.estado='Activo'
  AND NOT EXISTS (SELECT 1 FROM Informe i WHERE i.id_sesion=rm.id_sesion);

INSERT INTO InformeTutorDetalle
  (id_informe,fecha_monitoria,hora_inicio_real,hora_fin_real,lugar,descripcion,cantidad_asistentes,cantidad_sat,estudiantes_asistieron,detalle_sat,recuperada,id_recuperacion)
SELECT i.id_informe,s.fecha,rm.hora_inicio_real,rm.hora_fin_real,COALESCE(esp.nombre,'Sin espacio asignado'),rm.actividad,
  IF(rm.asistencia='Si',1,0),
  (SELECT COUNT(DISTINCT sg.id_estudiante) FROM Seguimiento sg WHERE sg.id_sesion=s.id_sesion AND sg.estado='Activo'),
  IF(rm.asistencia='Si',JSON_ARRAY(so.id_estudiante),JSON_ARRAY()),
  COALESCE((SELECT JSON_ARRAYAGG(JSON_OBJECT('studentId',sg.id_estudiante,'description',COALESCE(sg.observaciones,''))) FROM Seguimiento sg WHERE sg.id_sesion=s.id_sesion AND sg.estado='Activo'),JSON_ARRAY()),
  FALSE,NULL
FROM Informe i
JOIN Sesion s ON s.id_sesion=i.id_sesion
JOIN ReporteMonitoria rm ON rm.id_sesion=s.id_sesion AND rm.id_usuario=i.id_usuario AND rm.estado='Activo'
JOIN Solicitud so ON so.id_solicitud=s.id_solicitud
LEFT JOIN AsignacionEspacio ae ON ae.id_asignacion_espacio=s.id_asignacion_espacio
LEFT JOIN Espacio esp ON esp.id_espacio=ae.id_espacio
JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion
JOIN Rol r ON r.id_rol=aa.id_rol AND r.nombre='Monitor'
WHERE NOT EXISTS (SELECT 1 FROM InformeTutorDetalle d WHERE d.id_informe=i.id_informe);

INSERT INTO HistorialInforme(id_informe,id_usuario,accion,observacion)
SELECT i.id_informe,i.id_usuario,'Creado','Informe de monitoría existente integrado al flujo de reportes.'
FROM Informe i
JOIN Sesion s ON s.id_sesion=i.id_sesion
JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion
JOIN Rol r ON r.id_rol=aa.id_rol AND r.nombre='Monitor'
JOIN ReporteMonitoria rm ON rm.id_sesion=s.id_sesion AND rm.id_usuario=i.id_usuario AND rm.estado='Activo'
WHERE NOT EXISTS (SELECT 1 FROM HistorialInforme h WHERE h.id_informe=i.id_informe);
