# Contrato de API — Gestión de Tutorías y Monitorías

El contrato de las rutas implementadas se encuentra en [openapi.yaml](./openapi.yaml) y utiliza OpenAPI 3.1.

## Alcance

El contrato está alineado con el primer avance del frontend:

- Inicio de sesión con correo institucional y contraseña.
- Selección del rol activo cuando una persona tiene más de un rol.
- Consulta del usuario autenticado.
- Dashboard personalizado por rol.
- Consulta de disponibilidad y sesiones para tutor, monitor y estudiante. La escritura de disponibilidad y los informes personales aún no están implementados.
- Solicitudes creadas por estudiantes.
- Solicitudes asignadas, aprobadas o rechazadas.
- Administración de usuarios.
- Administración de espacios.
- Catálogo de asignaturas para registrar solicitudes.

## Roles

```text
Administrador
Tutor
Monitor
Estudiante
```

Un usuario puede tener uno o varios roles mediante la relación `UsuarioRol`. El
login devuelve los roles disponibles; si hay más de uno, el frontend presenta
un selector y confirma el rol activo mediante `/auth/select-role`. El cambio
de rol posterior solicita un token de acceso para el rol elegido. La API vuelve
a comprobar en cada solicitud que dicho rol continúa asignado al usuario.

Las rutas protegidas utilizan:

```text
Authorization: Bearer <accessToken>
```

## Rutas implementadas actualmente

| Grupo | Rutas | Persistencia |
| --- | --- | --- |
| Autenticación | `/auth/login`, `/auth/select-role`, `/auth/me`, `/auth/logout` | `Usuario`, `Credencial`, `Rol`, `UsuarioRol` |
| Portal y catálogos | `/portal/dashboard`, `/catalogs/subjects`, `/catalogs/periods`, `GET /availability`, `GET /sessions` | Indicadores, catálogos y datos visibles filtrados por rol |
| Administración | `/admin/dashboard`, `/admin/reports`, `/admin/catalogs`, `/admin/configuration/*` | Indicadores, catálogos, credenciales y configuración |
| Usuarios | `GET/POST /users`, `PATCH/DELETE /users/{id}` | `Usuario`, `Credencial`, `UsuarioRol` |
| Espacios | `GET/POST /spaces`, `PATCH/DELETE /spaces/{id}` | `Espacio` |
| Periodos académicos | `GET/POST /periods`, `PATCH/DELETE /periods/{id}` | `PeriodoAcademico` |
| Solicitudes | `GET/POST /requests`, `PATCH/DELETE /requests/{id}` | `Solicitud`, `Estudiante`, `Programa`, `Asignatura`, `TipoSolicitud`, `PeriodoAcademico` |
| Estado del servicio | `GET /health` (fuera de `/api/v1`) | Conexión MariaDB |

La implementación activa está en `api/src/server.ts`. `GET /availability` y
`GET /sessions` son consultas de solo lectura con aislamiento por rol. Las
operaciones de escritura de disponibilidad y los informes personales todavía
no forman parte de la API ejecutable ni del contrato actual.

`GET /requests` devuelve siempre `{ data, pagination }`, también para
Administración. Los filtros `search`, `status` y `page`/`pageSize` se aplican
en el servidor para mantener la respuesta coherente con el contrato y el
cliente web.

Las respuestas de usuarios, espacios y solicitudes que consume el frontend se
generan mediante consultas a MariaDB; ya no dependen de los arreglos de datos
de demostración. El frontend conserva datos iniciales únicamente como estado
visual mientras se completa la primera carga del API.

## Validar el contrato

Desde PowerShell:

```powershell
cd .\api
npm install
npm run validate
```

## Ejecutar la API real

Antes de iniciar la API, copia las variables de `.env.example` a un archivo
`.env` en la raíz del proyecto y ajusta la contraseña del usuario de aplicación
y las credenciales administrativas de bootstrap. La primera ejecución crea
automáticamente la base de datos, el usuario `DATABASE_USER` con permisos
limitados sobre esa base y el esquema si todavía no existen tablas.

Desde PowerShell:

```powershell
cd .\api
npm install
npm run dev
```

La API queda disponible en `http://localhost:3000/api/v1`. El endpoint
`http://localhost:3000/health` confirma si la conexión con MariaDB está activa.

En arranques posteriores la API detecta las tablas existentes y no ejecuta de
nuevo el instalador ni borra información. `DATABASE_BOOTSTRAP_USER` y
`DATABASE_BOOTSTRAP_PASSWORD` solo se utilizan cuando la cuenta de aplicación
no logra conectarse, por ejemplo en el primer arranque.

Si existe una base con algunas tablas, pero faltan las tablas esenciales, la
API detiene el arranque y muestra el problema; nunca la elimina ni intenta
reconstruirla automáticamente.

Las credenciales antiguas del SQL local de desarrollo pueden iniciar con el
documento como clave temporal. En desarrollo, si se detecta una contraseña en
texto plano, la API la migra a bcrypt y marca la cuenta para cambiarla antes de
acceder a otras rutas. En producción las contraseñas que no sean hashes bcrypt
se rechazan; prepara hashes antes de migrar una base de datos. Las claves nuevas
y restablecidas se almacenan con bcrypt.

En producción configura `JWT_SECRET` con un valor aleatorio de al menos 32
caracteres. El servidor rechaza el secreto de ejemplo o uno más corto.

## Levantar un mock local

```powershell
cd .\api
npm run mock
```

El mock queda disponible en:

```text
http://localhost:4010
```

El mock es únicamente para probar el contrato. No reemplaza la API real ni persiste información en MariaDB.

## Comprobar que una operación llegó a MariaDB

Con la API ejecutándose, inicia sesión en el frontend como administrador y
anota un identificador visible. Luego compruébalo en HeidiSQL o en la consola
de MariaDB:

```sql
USE gestion_monitorias_tutorias;

SELECT COUNT(*) AS usuarios_activos
FROM Usuario
WHERE estado = 'Activo';

SELECT id_solicitud, estado, fecha_solicitud
FROM Solicitud
ORDER BY id_solicitud DESC;

SELECT id_espacio, codigo, nombre, estado
FROM Espacio
ORDER BY id_espacio DESC;
```

Después de crear o modificar un registro, recarga la interfaz y repite la
consulta. Si el valor permanece, la operación fue persistida; si la API está
detenida, el frontend debe mostrar un error de conexión y no guardar cambios
locales.

Los endpoints DELETE de usuarios, espacios y solicitudes realizan eliminación
física y limpian dependencias relacionadas. Úsalos únicamente con registros de
demostración: no se conserva el historial eliminado. Los periodos académicos
solo se pueden borrar cuando no tengan solicitudes, horarios ni asignaciones.

## Reglas importantes

- `POST /auth/login` autentica con correo institucional y contraseña; `POST /auth/select-role` confirma el rol activo.
- Las contraseñas se guardan con bcrypt. Las claves temporales se devuelven una sola vez al restablecerlas y se debe exigir su cambio antes de usar otras rutas.
- Los tokens de acceso se guardan en el cliente. `POST /auth/logout` exige un token y el frontend lo elimina, pero el servidor no revoca el JWT; este continúa válido hasta su expiración.
- `POST /users` y `PATCH /users/{id}` reciben `roles[]`, con mínimo un rol y sin valores repetidos.
- No se deben devolver contraseñas, hashes ni documentos de identidad en listados de credenciales ni exportaciones.
- El backend debe aplicar autorización por rol, además de validar el JWT.
- Las solicitudes siguen transiciones permitidas: Pendiente → Aprobada/Rechazada/Cancelada; Aprobada → Asignada/Cancelada; Asignada → Atendida/Cancelada; Atendida → Finalizada/Cancelada. Rechazada, Cancelada y Finalizada son terminales.
- Los módulos integrados del frontend deben consumir estas rutas y no confirmar cambios usando datos locales.

## Eliminación permanente

La API cuenta con endpoints de eliminación física real (`DELETE`) protegidos con sesión y rol de Administrador:

- `DELETE /api/v1/users/:id`: Elimina definitivamente el usuario y sus datos dependientes. Impide la autoeliminación de la cuenta en sesión (HTTP 400) y devuelve `409 USER_HAS_ASSIGNED_SESSIONS` si todavía tiene sesiones asignadas que deben resolverse primero.
- `DELETE /api/v1/spaces/:id`: Elimina permanentemente el espacio tras limpiar sus dependencias en `HorarioMonitor` y `AsignacionEspacio`.
- `DELETE /api/v1/requests/:id`: Elimina la solicitud tras limpiar sus sesiones y dependencias operativas en `RecuperacionMonitoria`, `Asistencia`, `HistorialSesion`, `HistorialInforme`, `Informe`, `EntregaActividad`, `Evidencia`, `Compromiso`, `Seguimiento`, `ReporteMonitoria` y `CancelacionMonitoria`.

`DELETE /api/v1/periods/:id` devuelve `409 PERIOD_IN_USE` si el periodo tiene
asignaciones, horarios o solicitudes asociadas.

## Demostración local

Usa la API real en `http://localhost:3000/api/v1` y confirma primero
`http://localhost:3000/health`. No uses Prism para evidenciar persistencia:
el mock sirve para revisar el contrato y no guarda cambios en MariaDB. Para la
demostración, inicia sesión, crea un registro temporal, consulta, actualiza y
elimínalo; verifica el cambio en MariaDB. El panel administrativo mostrará
“Sin datos” si no puede consultar la base y no presentará conteos de ejemplo.
