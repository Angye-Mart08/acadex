# Contrato de API — Tutorías y Monitorías Unitrópico

## Fuente oficial

La especificación oficial es [openapi.yaml](./openapi.yaml), escrita en OpenAPI 3.1.0 y versionada como 2.0.0. El frontend React/TypeScript y el backend Node.js/TypeScript deben implementarse contra este contrato.

## Arquitectura

```text
React + TypeScript → API REST Node.js + TypeScript → MariaDB
```

La API usa Bearer JWT, la zona horaria `America/Bogota`, fechas ISO 8601 y paginación con `page`, `pageSize`, `data` y `meta`.

## Dominios cubiertos

- autenticación con selección de rol, refresh, logout y usuario actual;
- usuarios, roles y autorización por rol;
- dashboard administrativo;
- solicitudes de monitoría y tutoría;
- disponibilidad de monitores y tutores;
- programación, cancelación y consulta de sesiones;
- asistencia, progreso y observaciones;
- evidencias mediante `multipart/form-data`;
- programas, asignaturas y espacios físicos;
- reportes administrativos en PDF, XLSX o CSV;
- informes mensuales con envío y revisión.

## Estados principales

- Solicitud: `PENDIENTE → APROBADA/RECHAZADA/CANCELADA → ASIGNADA → ATENDIDA`.
- Sesión: `PROGRAMADA → EN_CURSO → COMPLETADA`; cualquier sesión programada o en curso puede cancelarse.
- Informe: `BORRADOR → EN_REVISION → APROBADO/RECHAZADO`; un informe rechazado vuelve a borrador.

Las transiciones se documentan también en la extensión `x-contract.stateTransitions`.

## Autorización

Cada operación administrativa declara sus roles permitidos en `x-roles`. El backend debe validar tanto el JWT como el rol activo. Los roles funcionales son `ADMINISTRADOR`, `MONITOR`, `TUTOR` y `ESTUDIANTE`.

## Errores

Las respuestas de error reutilizan `components.responses` y `components.schemas.ApiError`. Todas incluyen `requestId` para trazabilidad. El backend debe usar `409` para conflictos de agenda, duplicados o transiciones inválidas y `422` para errores de validación.

## Mock local

Requiere Node.js y npm:

```bash
npm install
npm run validate
npm run mock
```

El mock queda disponible en `http://localhost:4010/api/v1`.

Para generar respuestas variables:

```bash
npm run mock:dynamic
```

Swagger Editor puede abrir directamente `openapi.yaml` para revisión visual y validación.

## Integración con el frontend

El frontend debe conservar el `accessToken` y el `activeRole` después de `/auth/select-role`, enviar `Authorization: Bearer <token>` y renovar el token con `/auth/refresh` cuando corresponda. Para operaciones de creación sensibles se recomienda enviar `Idempotency-Key`.

## Decisiones asumidas para esta versión

- El usuario autenticado se infiere del JWT; por eso `POST /requests` y `POST /availability` no reciben `estudianteId` o `usuarioId`.
- La asignación y la programación de sesiones son responsabilidad del rol administrativo.
- Las evidencias se almacenan fuera de MariaDB y MariaDB conserva sus metadatos y URL.
- El límite de evidencias es 10 MB y los tipos permitidos son PDF, JPG, PNG y DOCX.
- Se mantiene el estilo de nombres del prototipo (`idUsuario`, `idSolicitud`, etc.) para facilitar la migración.
