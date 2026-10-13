# Contrato de API — Gestión de Tutorías y Monitorías

El contrato inicial de la API se encuentra en [openapi.yaml](./openapi.yaml) y utiliza OpenAPI 3.1.

## Alcance

El contrato está alineado con el primer avance del frontend:

- Inicio de sesión con correo institucional y documento de identidad.
- Selección del rol activo cuando una persona tiene más de un rol.
- Consulta del usuario autenticado.
- Dashboard personalizado por rol.
- Disponibilidad, horarios, sesiones e informes del tutor o monitor.
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
| Solicitudes | `GET/POST /requests`, `PATCH /requests/{id}` | `Solicitud`, `Estudiante`, `Programa`, `Asignatura`, `TipoSolicitud`, `PeriodoAcademico` |
| Estado del servicio | `GET /health` (fuera de `/api/v1`) | Conexión MariaDB |

La implementación activa está en `api/src/server.ts`. `GET /availability` y
`GET /sessions` son consultas de solo lectura con aislamiento por rol; las
operaciones de escritura de disponibilidad/sesiones y los informes personales
siguen planeados. La presencia de una operación en OpenAPI no implica por sí
sola que ya tenga una ruta ejecutable.

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
cd C:\Users\brayh\acadex\api
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
cd C:\Users\brayh\acadex\api
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

El script SQL de desarrollo contiene inicialmente el documento en
`Credencial.password_hash` para conservar las credenciales base del proyecto.
Después del primer login válido, la API reemplaza ese valor por un hash bcrypt.
Los nuevos usuarios deberán registrarse siempre con hashes, nunca con
contraseñas en texto plano.

## Levantar un mock local

```powershell
cd C:\Users\brayh\acadex\api
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

Las operaciones “Eliminar” de usuarios y espacios son desactivaciones lógicas
(`estado = 'Inactivo'`) para conservar las relaciones de solicitudes, sesiones
y trazabilidad histórica.

## Reglas importantes

- La API real debe consultar la tabla `Credencial` para verificar el documento asociado al correo institucional.
- `POST /auth/login` autentica con correo institucional y documento; `POST /auth/select-role` confirma el rol activo.
- `POST /users` y `PATCH /users/{id}` reciben `roles[]`, con mínimo un rol y sin valores repetidos.
- No se debe devolver `password_hash` ni el documento de identidad en las respuestas públicas del usuario.
- El backend debe aplicar autorización por rol, además de validar el JWT.
- Los cambios de estado de solicitudes deben respetar las transiciones del dominio.
- Los módulos integrados del frontend deben consumir estas rutas y no confirmar cambios usando datos locales.
