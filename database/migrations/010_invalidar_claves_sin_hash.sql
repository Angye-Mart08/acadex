START TRANSACTION;

UPDATE Credencial c
LEFT JOIN SesionIngreso s ON s.id_usuario = c.id_usuario AND s.revocada_en IS NULL
LEFT JOIN SesionPreAutenticacion p ON p.id_usuario = c.id_usuario AND p.revocada_en IS NULL
SET c.password_hash = 'PENDIENTE_APROVISIONAMIENTO',
    c.primer_inicio = TRUE,
    c.ultimo_acceso = NULL,
    s.revocada_en = CURRENT_TIMESTAMP,
    p.revocada_en = CURRENT_TIMESTAMP
WHERE BINARY c.password_hash NOT REGEXP '^[$]2[aby][$][0-9]{2}[$][./A-Za-z0-9]{53}$'
  AND c.password_hash <> 'PENDIENTE_APROVISIONAMIENTO';

COMMIT;
