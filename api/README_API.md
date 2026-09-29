# README_API — Contrato de API de Tutorías y Monitorías

Documentación de la entrega del contrato de API para la plataforma web de tutorías y monitorías académicas de Unitrópico.

| Recurso | Enlace |
|---|---|
| Contrato OpenAPI 3.1 | [openapi.yaml](./openapi.yaml) |
| Ejemplos HTTP | [examples.http](./examples.http) |
| Documentación navegable | [GitHub Pages](https://angye-mart08.github.io/acadex/) |
| Código fuente | [Repositorio acadex](https://github.com/Angye-Mart08/acadex) |

## 1. Alcance y arquitectura

    React + TypeScript → API REST Node.js + TypeScript → MariaDB

El contrato define la frontera entre frontend y backend. La implementación posterior debe respetar los nombres, tipos, campos obligatorios, estados, códigos de respuesta y reglas documentadas en openapi.yaml.

La API cubre autenticación, usuarios, roles, dashboard, solicitudes, disponibilidad, sesiones, asistencia, evidencias, programas, asignaturas, espacios, reportes e informes mensuales.

## 2. Cumplimiento de requisitos mínimos

| Requisito | Cumplimiento |
|---|---|
| Versión | OpenAPI 3.1.0 en api/openapi.yaml. |
| Alcance mínimo | Incluye usuarios, solicitudes, disponibilidad, sesiones, asistencia, evidencias, catálogos y reportes. |
| Esquemas | Los modelos están en components.schemas, con tipos, campos obligatorios, formatos, enumeraciones, patrones y límites. |
| Códigos de estado | Se documentan 200, 201, 204, 400, 401, 403, 404, 409, 413, 415, 422 y 429 según corresponda. |
| Errores | Todas las respuestas reutilizan ApiError con status, code, message, path, timestamp, requestId y details. |
| Ejemplos | Las operaciones de creación incluyen cuerpos y respuestas de éxito; examples.http contiene solicitudes ejecutables. |
| Validación | npm run validate valida el documento con Prism; también puede abrirse en Swagger Editor. |
| Servidor simulado | npm run mock y npm run mock:dynamic levantan el contrato como servidor local. |

## 3. Versión y servidores

    OpenAPI: 3.1.0
    Versión del contrato: 2.0.0
    Zona horaria: America/Bogota

Servidores:

- API real de desarrollo: http://localhost:3000/api/v1
- Mock local Prism: http://localhost:4010
- Producción prevista: https://api.tutorias.unitropico.edu.co/api/v1

Prism expone las rutas desde la raíz. Por eso el mock se llama así:

    Mock:     http://localhost:4010/auth/login
    API real: http://localhost:3000/api/v1/auth/login

## 4. Instalación del mock local

### Requisitos

- Node.js versión LTS.
- npm.
- Git, opcional para clonar el repositorio.
- PowerShell, Bash o una terminal compatible.

### Instalación

Desde la carpeta api:

    cd C:\Users\brayh\acadex\api
    npm install

Esto instala Prism y crea api/node_modules. La carpeta node_modules es local y está excluida por .gitignore. El archivo package-lock.json sí debe conservarse.

### Validar el contrato

    npm run validate

### Levantar el mock estable

    npm run mock

### Levantar el mock dinámico

    npm run mock:dynamic

El modo dinámico genera valores aleatorios para probar tipos y estructuras. No representa una base de datos ni mantiene una sesión real.

### Detener el mock

    Ctrl + C

## 5. Prueba rápida en PowerShell

Abre una segunda ventana mientras Prism sigue ejecutándose:

    $baseUrl = "http://127.0.0.1:4010"

### Login

    $loginBody = @{ codigo = "EST20260125"; password = "ClaveSegura123" } | ConvertTo-Json
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
    $loginResponse | ConvertTo-Json -Depth 10

### Seleccionar rol

    $roleBody = @{ preAuthToken = $loginResponse.preAuthToken; idRol = 2 } | ConvertTo-Json
    $tokenResponse = Invoke-RestMethod -Uri "$baseUrl/auth/select-role" -Method Post -ContentType "application/json" -Body $roleBody
    $accessToken = $tokenResponse.accessToken
    $headers = @{ Authorization = "Bearer $accessToken" }

### Consultar usuario actual

    $currentUser = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $headers
    $currentUser | ConvertTo-Json -Depth 10

### Crear una solicitud

Para forzar la respuesta exitosa 201 en Prism:

    $requestBody = @{ tipo = "MONITORIA"; asignaturaId = 18; motivo = "Necesito reforzar integrales antes del segundo parcial"; fechaPreferida = "2026-10-01"; horaPreferida = "14:00"; modalidadPreferida = "PRESENCIAL" } | ConvertTo-Json
    $requestHeaders = @{ Authorization = "Bearer $accessToken"; "Content-Type" = "application/json"; "Idempotency-Key" = "request-demo-001"; Prefer = "code=201" }
    $newRequest = Invoke-RestMethod -Uri "$baseUrl/requests" -Method Post -Headers $requestHeaders -Body $requestBody
    $newRequest | ConvertTo-Json -Depth 10

## 6. Catálogo de operaciones

### Autenticación

| Método | Ruta | Propósito | Acceso |
|---|---|---|---|
| POST | /auth/login | Validar credenciales y obtener token previo. | Público |
| POST | /auth/select-role | Crear sesión con rol activo. | Token previo |
| POST | /auth/refresh | Renovar tokens. | Refresh token |
| POST | /auth/logout | Cerrar sesión. | Autenticado |
| GET | /auth/me | Consultar perfil autenticado. | Autenticado |

### Usuarios y administración

| Método | Ruta | Propósito |
|---|---|---|
| GET | /roles | Consultar roles. |
| GET | /users | Listar usuarios con filtros y paginación. |
| POST | /users | Crear usuario. |
| GET | /users/{idUsuario} | Consultar usuario. |
| PATCH | /users/{idUsuario} | Actualizar usuario y roles. |
| GET | /admin/dashboard | Consultar indicadores administrativos. |

### Solicitudes

| Método | Ruta | Propósito |
|---|---|---|
| GET | /requests | Listar solicitudes filtradas y paginadas. |
| POST | /requests | Crear solicitud como estudiante. |
| GET | /requests/{idSolicitud} | Consultar solicitud. |
| PATCH | /requests/{idSolicitud} | Cambiar estado. |
| POST | /requests/{idSolicitud}/cancel | Cancelar solicitud. |
| POST | /requests/{idSolicitud}/assign | Asignar monitor o tutor. |

### Disponibilidad, sesiones y seguimiento

| Método | Ruta | Propósito |
|---|---|---|
| GET/POST | /availability | Consultar o registrar disponibilidad. |
| DELETE | /availability/{idDisponibilidad} | Eliminar disponibilidad. |
| GET/POST | /sessions | Consultar o programar sesiones. |
| GET/PATCH | /sessions/{idSesion} | Consultar o actualizar sesión. |
| POST | /sessions/{idSesion}/cancel | Cancelar sesión. |
| GET/PUT | /sessions/{idSesion}/attendance | Consultar o registrar asistencia. |
| GET/POST | /sessions/{idSesion}/evidences | Consultar o cargar evidencias. |
| DELETE | /sessions/{idSesion}/evidences/{idEvidencia} | Eliminar evidencia. |

### Catálogos, reportes e informes

| Método | Ruta | Propósito |
|---|---|---|
| GET/POST | /programs | Consultar o crear programas académicos. |
| GET/POST | /subjects | Consultar o crear asignaturas. |
| GET/POST | /spaces | Consultar o crear espacios físicos. |
| GET | /admin/reports | Generar reportes administrativos. |
| GET/POST | /monthly-reports | Consultar o crear informes mensuales. |
| GET/PATCH | /monthly-reports/{idInforme} | Consultar o editar informe. |
| POST | /monthly-reports/{idInforme}/submit | Enviar informe a revisión. |
| POST | /monthly-reports/{idInforme}/review | Aprobar o rechazar informe. |

Los parámetros, cuerpos, respuestas, roles, códigos de estado y esquemas completos están en openapi.yaml.

## 7. Esquemas y validaciones

Los esquemas se encuentran en components.schemas. Las validaciones principales son:

- identificadores enteros positivos;
- correo con formato email;
- contraseña entre 8 y 100 caracteres;
- fechas YYYY-MM-DD;
- horas HH:mm;
- roles y estados restringidos mediante enum;
- progreso entre 0 y 100;
- horas de acompañamiento entre 0 y 744;
- paginación con máximo de 100 elementos;
- evidencias PDF, JPG, PNG o DOCX de máximo 10 MB;
- periodos mensuales con formato YYYY-MM.

## 8. Estados del dominio

Solicitud:

    PENDIENTE → APROBADA
    PENDIENTE → RECHAZADA
    PENDIENTE → CANCELADA
    APROBADA  → ASIGNADA
    ASIGNADA  → ATENDIDA
    ASIGNADA  → CANCELADA

Sesión:

    PROGRAMADA → EN_CURSO
    PROGRAMADA → CANCELADA
    EN_CURSO   → COMPLETADA
    EN_CURSO   → CANCELADA

Informe mensual:

    BORRADOR    → EN_REVISION
    EN_REVISION → APROBADO
    EN_REVISION → RECHAZADO
    RECHAZADO   → BORRADOR

## 9. Seguridad y errores

Las rutas protegidas utilizan:

    Authorization: Bearer <accessToken>

El esquema común ApiError tiene los campos:

    status, code, message, path, timestamp, requestId, details

| Código | Uso |
|---:|---|
| 200 | Consulta o actualización exitosa. |
| 201 | Recurso creado. |
| 204 | Eliminación o cierre sin contenido. |
| 400 | Solicitud mal formada. |
| 401 | Token ausente, inválido o expirado. |
| 403 | Rol sin permisos. |
| 404 | Recurso inexistente. |
| 409 | Conflicto, duplicado o transición inválida. |
| 413 | Archivo demasiado grande. |
| 415 | Tipo de archivo no soportado. |
| 422 | Error de validación. |
| 429 | Demasiadas solicitudes. |

## 10. Validación y GitHub Pages

Validación local:

    cd C:\Users\brayh\acadex\api
    npm run validate

También puede abrirse openapi.yaml en https://editor.swagger.io/.

La documentación pública navegable se publica con GitHub Actions y Swagger UI:

https://angye-mart08.github.io/acadex/

La página permite explorar operaciones, revisar esquemas, ejecutar Try it out y descargar el YAML. GitHub Pages publica documentación estática; no ejecuta Node.js ni MariaDB. El mock Prism continúa ejecutándose localmente.

Para activar la publicación en el repositorio:

1. Hacer push de la carpeta `.github/workflows/pages.yml` a la rama principal.
2. Abrir `Settings` → `Pages` en GitHub.
3. En `Build and deployment`, seleccionar `GitHub Actions` como fuente.
4. Revisar la ejecución `Publicar documentación de API en GitHub Pages` en la pestaña `Actions`.

El workflow prepara un sitio estático con `docs/index.html`, copia `api/openapi.yaml` y publica el resultado mediante las acciones oficiales de Pages.

## 11. Decisiones de diseño

- El usuario autenticado se obtiene del JWT; POST /requests no recibe estudianteId.
- La asignación y programación de sesiones corresponden al administrador.
- Las evidencias se almacenan fuera de MariaDB; la base de datos conserva sus metadatos y URL.
- Idempotency-Key se recomienda para creaciones sensibles.
- Se conservan nombres como idUsuario, idSolicitud e idSesion para facilitar la migración.
- Prism no reemplaza el backend real: no persiste información ni implementa autenticación real.