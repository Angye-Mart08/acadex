-- Historial durable de solicitudes de ayuda y recuperación de contraseñas.
CREATE TABLE IF NOT EXISTS SolicitudCambioClave (
    id_solicitud BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NULL,
    correo_solicitante VARCHAR(120) NOT NULL,
    nombre_solicitante VARCHAR(160) NOT NULL,
    tipo_solicitud ENUM('AyudaAdministrador','CodigoCorreo') NOT NULL,
    estado ENUM('Pendiente','Completada') NOT NULL DEFAULT 'Pendiente',
    solicitada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completada_en DATETIME NULL,
    gestionada_por INT NULL,
    CONSTRAINT fk_solicitud_cambio_clave_usuario
        FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_solicitud_cambio_clave_gestor
        FOREIGN KEY (gestionada_por) REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_solicitud_cambio_clave_estado_fecha (estado,solicitada_en),
    INDEX idx_solicitud_cambio_clave_usuario (id_usuario,estado)

) ENGINE=InnoDB;

-- Reconstruct previous requests from the administrator notifications. Notifications
-- were sent to each administrator, so group them by account and minute.
INSERT INTO SolicitudCambioClave(
    id_usuario,correo_solicitante,nombre_solicitante,tipo_solicitud,estado,solicitada_en
)
SELECT u.id_usuario,u.correo,CONCAT(u.nombres,' ',u.apellidos),'AyudaAdministrador',
       CASE
           WHEN ca.cambio_clave_solicitado_en IS NOT NULL
            AND ABS(TIMESTAMPDIFF(SECOND,ca.cambio_clave_solicitado_en,history.requested_at)) <= 60
           THEN 'Pendiente'
           ELSE 'Completada'
       END,
       history.requested_at
  FROM (
       SELECT entidad_id AS user_id,MIN(fecha) AS requested_at
         FROM Notificacion
        WHERE categoria='Sistema'
          AND titulo='Solicitud de cambio de contraseña'
          AND entidad_tipo='credencial'
          AND entidad_id IS NOT NULL
        GROUP BY entidad_id,DATE_FORMAT(fecha,'%Y-%m-%d %H:%i')
  ) history
  JOIN Usuario u ON u.id_usuario=history.user_id
  LEFT JOIN ControlAcceso ca ON ca.id_usuario=u.id_usuario
 WHERE NOT EXISTS (
       SELECT 1 FROM SolicitudCambioClave s
        WHERE s.id_usuario=u.id_usuario
          AND ABS(TIMESTAMPDIFF(SECOND,s.solicitada_en,history.requested_at)) <= 60
   );

-- Preserve any help requests that are still pending when this migration runs.
INSERT INTO SolicitudCambioClave(
    id_usuario,correo_solicitante,nombre_solicitante,tipo_solicitud,estado,solicitada_en
)
SELECT ca.id_usuario,u.correo,CONCAT(u.nombres,' ',u.apellidos),
       'AyudaAdministrador','Pendiente',ca.cambio_clave_solicitado_en
  FROM ControlAcceso ca
  JOIN Usuario u ON u.id_usuario=ca.id_usuario
 WHERE ca.cambio_clave_solicitado_en IS NOT NULL
   AND NOT EXISTS (
       SELECT 1 FROM SolicitudCambioClave s
        WHERE s.id_usuario=ca.id_usuario AND s.estado='Pendiente'
          AND ABS(TIMESTAMPDIFF(SECOND,s.solicitada_en,ca.cambio_clave_solicitado_en)) <= 60
   );
