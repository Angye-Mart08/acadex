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

Los endpoints DELETE se validan contra dependencias y no borran en cascada el
historial académico. Si el recurso tiene uso, la API devuelve `409` y la acción
recomendada es desactivar la cuenta/espacio o conservar la solicitud mediante
su estado. Los periodos solo se eliminan cuando no tienen solicitudes,
horarios ni asignaciones.

## Reglas importantes

- `POST /auth/login` autentica con correo institucional y contraseña; `POST /auth/select-role` confirma el rol activo.
- Las contraseñas se guardan con bcrypt. Las claves temporales se devuelven una sola vez al restablecerlas y se debe exigir su cambio antes de usar otras rutas.
- Los tokens de acceso se guardan en el cliente. `POST /auth/logout` exige un token y el frontend lo elimina, pero el servidor no revoca el JWT; este continúa válido hasta su expiración.
- `POST /users` y `PATCH /users/{id}` reciben `roles[]`, con mínimo un rol y sin valores repetidos.
- En `PATCH /users/{id}`, `roles[]` representa el conjunto final de roles: las membresías seleccionadas se activan y las omitidas se inactivan. Las respuestas/listados solo exponen roles activos, y filtrar por un rol no oculta los demás roles activos de la cuenta. El estado de `Usuario`/`Credencial` es independiente del estado de membresía en `UsuarioRol`; reactivar una cuenta heredada recupera solo roles con perfiles activos.
- Las combinaciones válidas para `roles[]` son `Administrador`, `Tutor`, `Estudiante`, `Monitor` o `Monitor + Estudiante`. Administrador y Tutor son exclusivos; ningún otro rol se puede combinar con ellos. El frontend deshabilita opciones inválidas y la API rechaza cualquier combinación no permitida tanto al crear como al editar. El esquema `UserRoles` refleja esta matriz en OpenAPI.
- `PATCH /spaces/{id}` combina el parche con los datos persistidos y valida el estado final del espacio. Si queda como físico, requiere ubicación; el cambio de fila se hace dentro de una transacción.
- Los listados nunca devuelven claves actuales, hashes ni documentos. La exportación de credenciales solo incluye claves temporales aleatorias, por una única respuesta, revoca la clave previa y fuerza cambio al entrar; se limita a un rol y excluye al administrador solicitante.
- El backend debe aplicar autorización por rol, además de validar el JWT.
- Las solicitudes siguen transiciones permitidas: Pendiente → Aprobada/Rechazada/Cancelada; Aprobada → Asignada/Cancelada; Asignada → Atendida/Cancelada; Atendida → Finalizada/Cancelada. Rechazada, Cancelada y Finalizada son terminales.
- Los módulos integrados del frontend deben consumir estas rutas y no confirmar cambios usando datos locales.

## Eliminación validada

Los endpoints `DELETE` requieren sesión y rol Administrador. Solo borran recursos sin historial ni referencias; la lectura de dependencias y el borrado se realizan en una transacción.

- `DELETE /api/v1/users/:id`: no permite autoeliminación, borrar al último administrador ni borrar usuarios con actividad académica/operativa. Desactiva la cuenta para conservar historial.
- `DELETE /api/v1/spaces/:id`: bloquea horarios, reservas o sesiones asociadas; desactiva el espacio si se encuentra en uso.
- `DELETE /api/v1/requests/:id`: solo admite solicitudes no asignadas, sin sesiones ni clasificaciones; preserva el historial de solicitudes en curso.
- `DELETE /api/v1/periods/:id`: bloquea el periodo activo y periodos con asignaciones, horarios o solicitudes (`409 PERIOD_ACTIVE` / `409 PERIOD_IN_USE`).

Las claves foráneas siguen protegiendo frente a dependencias no incluidas en la validación previa. El frontend confirma el borrado e indica cuándo usar desactivación en lugar de eliminar.

## Exportación segura de claves temporales

`POST /api/v1/admin/configuration/credentials/export` recibe un rol y genera un CSV en el navegador con claves aleatorias nuevas para cuentas activas de ese rol (máximo 500). La operación invalida las claves previas, marca cambio obligatorio en el siguiente inicio y excluye la cuenta del administrador que la ejecuta. El endpoint solo devuelve el secreto en esa respuesta; no registra valores en logs ni guarda contraseñas en texto claro. Compartir el archivo por un canal institucional seguro y eliminarlo después de la entrega. No se implementó correo automático porque falta una configuración SMTP institucional autorizada.

## Demostración local

Usa la API real en `http://localhost:3000/api/v1` y confirma primero
`http://localhost:3000/health`. No uses Prism para evidenciar persistencia:
el mock sirve para revisar el contrato y no guarda cambios en MariaDB. Para la
demostración, inicia sesión, crea un registro temporal, consulta, actualiza y
elimínalo; verifica el cambio en MariaDB. El panel administrativo mostrará
“Sin datos” si no puede consultar la base y no presentará conteos de ejemplo.

## Asignación y atención de solicitudes

- `POST /api/v1/requests/{id}/assign` (Administrador) recibe `userId`, `role` (`Tutor` o `Monitor`), `date`, `startTime`, `endTime` y `modality`. Solo acepta personal activo con una asignación académica activa que coincida con la asignatura y el periodo de la solicitud. En una transacción crea la primera fila de `Sesion` y cambia la solicitud a `Asignada`.
- `PATCH /api/v1/requests/{id}/attendance` recibe `{ "status": "Atendida" }`. Solo el Tutor o Monitor que tenga asignada la sesión bajo el rol activo puede cerrar la atención; actualiza la solicitud a `Atendida` y la sesión a `Realizada`.
- `GET /api/v1/admin/catalogs` ahora incluye `staffAssignments`, usado para ofrecer únicamente candidatos válidos según asignatura y periodo.
- El alta de espacios devuelve el registro recién insertado consultándolo por su ID, además de reportar duplicados y datos incompatibles como errores comprensibles.

Los modales comparten tamaños de control, espaciado y acciones accesibles al desplazarse. Verifica la persistencia contra MariaDB local con datos de demostración; el mock OpenAPI no guarda cambios.

### Flujo de asignación desde el formulario de creación

La interfaz filtra `staffAssignments` por asignatura, periodo y rol inferido del tipo de acompañamiento. Para Monitoría presenta monitores; para Tutoría, tutores; para Acompañamiento permite escoger el rol. Si se selecciona un responsable, el frontend crea primero la solicitud mediante `POST /requests` y luego invoca `POST /requests/{id}/assign` con fecha, hora y modalidad para abrir la sesión inicial. Si falla la segunda operación, la solicitud ya creada permanece Pendiente y puede asignarse desde el módulo administrativo.

## Regla de asignatura por perfil

El formulario de usuario ofrece una selección única de asignatura para Tutor y otra para Monitor. La API valida el límite al crear o editar el perfil; los perfiles deben tener exactamente una asignatura por cada uno de esos roles seleccionados. Si un usuario heredado tiene varias, al editar se precarga la primera como selección inicial y se debe revisar cuál debe quedar activa antes de guardar.

## Mejora 1: validaciones de integridad de entradas

La API es la validación autoritativa y rechaza propiedades desconocidas en los contratos administrativos. La interfaz aporta restricciones HTML equivalentes para prevenir errores antes del envío.

- Usuarios: correo `@unitropico.edu.co`, normalizado a minúsculas; documento de 5–20 dígitos; nombre completo con nombre y apellido; longitudes alineadas con MariaDB. Código de estudiante sincronizado con el código institucional y correo de perfil Administrador sincronizado con el correo de cuenta.
- En creación/edición administrativa de usuarios, `phone` es opcional y corresponde a `Usuario.telefono` (`VARCHAR(20)`). Si se informa, admite un número de al menos 7 dígitos con prefijo y separadores telefónicos habituales. Enviar cadena vacía o `null` lo limpia; omitirlo en un PATCH conserva el valor.
- Perfiles: semestre 1–12; horas semanales enteras y dentro del límite; una asignatura por perfil Tutor/Monitor; límites de tamaño acordes con las columnas.
- Espacios: código alfanumérico/guiones, tipo permitido, nombre y capacidad entera de 1–1000; texto opcional recortado y limitado a la columna correspondiente. Se aceptan códigos legados al editar.
- Solicitudes: motivo y descripción no vacíos y con longitudes acotadas. Una sesión asignada debe tener fecha válida, no pasada, horas válidas y caer dentro del periodo de la solicitud.
- Periodos: fecha válida y final posterior al inicio; solo un periodo activo, además de controles de uso antes de eliminar.

Verificación de esta mejora: `npm run build` (web) y `npm run typecheck` (api) exitosos. La validación de constraints físicos, datos preexistentes y persistencia se realiza en los pasos de base de datos/auditoría; no se ejecutaron escrituras contra MariaDB en este cambio.

## Auditoría de MariaDB

Ejecuta `npm run db:audit` desde `api/`. La consulta es estrictamente de solo lectura, informa conteos/metadatos y nunca imprime valores de credenciales ni atributos personales. No corrige hallazgos ni ejecuta migraciones.

En la auditoría local se observaron 36 tablas InnoDB, 55 claves foráneas, 26 restricciones `UNIQUE` y ninguna referencia huérfana. Hallazgos: 4 credenciales que no parecen bcrypt; 6 códigos de estudiante distintos del código institucional; una persona con más de una asignatura activa para un rol; y una sesión con asignatura o periodo distinto al de su solicitud. Las restricciones `CHECK` añadidas en la mejora 2 aún no estaban instaladas. Revisar y remediar los datos antes de usar información real; ejecutar la migración solo si sus conteos de prevalidación son cero.

## Registro de espacios

El alta administrativa valida tipo, código, nombre, capacidad y longitudes contra el esquema MariaDB. Los espacios físicos deben indicar edificio, bloque, salón o referencia; las ubicaciones virtuales se admiten sin dirección física. Se limita la ubicación calculada a 200 caracteres antes del envío. El `INSERT` y la lectura de confirmación se ejecutan en una transacción: un error de lectura revierte el alta y no deja un registro persistido con respuesta fallida. Los duplicados se devuelven como `409 DUPLICATE_SPACE`.

Verificación: prueba de rechazo de una ubicación presencial vacía; prueba integrada en MariaDB creó un registro temporal, lo recuperó por el ID insertado y eliminó ese registro de prueba. No quedan registros temporales.

## CRUD de asignaturas y programas académicos

Operaciones administrativas (requieren rol `Administrador`):

- Asignaturas: `GET/POST /api/v1/admin/subjects`, `PATCH/DELETE /api/v1/admin/subjects/{id}`. Se gestionan código, nombre, créditos opcionales (1–30), descripción y estado.
- Programas: `GET/POST /api/v1/admin/programs`, `PATCH/DELETE /api/v1/admin/programs/{id}`. El listado incluye facultades activas; el formulario relaciona cada programa a una facultad existente y permite registrar SNIES opcional.
- Los códigos deben ser alfanuméricos con guiones; nombres vacíos o compuestos solo por números se rechazan. Duplicados responden `409`. El borrado físico responde `409 SUBJECT_IN_USE` o `409 PROGRAM_IN_USE` si existen dependencias; usar `PATCH` para desactivar sin perder historial.
- `POST` requiere los campos principales; `PATCH` aplica solo los enviados y rechaza cuerpos vacíos. OpenAPI diferencia esquemas de alta y edición.

## Avisos y validación de integridad

El frontend presenta errores y validaciones en notificaciones accesibles, cerrables y temporizadas; los secretos temporales conservan un diálogo explícito. Las respuestas `422` devuelven `details` por ruta y mensaje, y el cliente las convierte en avisos que identifican el campo. La API valida nombres personales sin dígitos, enteros sin letras/notación exponencial, límites numéricos, formatos, longitudes y relaciones de negocio antes de persistir.
