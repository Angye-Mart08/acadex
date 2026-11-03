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

## Portal del tutor: agenda, solicitudes y reportes

El tutor dispone de `GET /tutor/dashboard`, `GET /tutor/assignments` y CRUD protegido para `/tutor/availability`. El calendario semanal solo admite asignaciones propias y activas del periodo actual; al editar o crear bloques valida hora final posterior y ausencia de solapamientos. El retiro desactiva el bloque y conserva su historial.

Las rutas `/tutor/recoveries` programan una recuperación para sesiones propias canceladas o no asistidas, permiten cancelarla mientras está pendiente y marcarla realizada desde su fecha. `POST /tutor/requests/{id}/decision` acepta una asignación o registra una cancelación con motivo obligatorio. La justificación se almacena en `CancelacionMonitoria` y se entrega en el listado administrativo y en el portal del tutor.

`GET /tutor/reportable-sessions` lista sesiones realizadas y recuperaciones finalizadas sin reporte. `POST /tutor/reports` guarda o actualiza un borrador por sesión, valida fecha/hora, asistentes y SAT, y registra hasta cuatro adjuntos PDF, Word o imágenes (4 MB por archivo, 12 MB total). Los adjuntos se guardan en disco dentro de `api/uploads/tutor-reports/`; metadatos y datos estructurados se guardan en MariaDB. `POST /tutor/reports/{id}/submit` envía el reporte y bloquea su edición.

La migración `database/migrations/002_reportes_tutor.sql` crea `InformeTutorDetalle` y `AdjuntoInformeTutor`. Se aplica de forma idempotente al iniciar la API y requiere que las credenciales bootstrap tengan permisos DDL en la base ya configurada. El módulo mensual genera una salida provisional; la exportación con plantilla institucional queda pendiente de recibir el formato oficial.

La configuración del tutor permite cambiar su propia contraseña mediante `PATCH /admin/configuration/password`, ruta autenticada que valida la contraseña actual y la nueva.

## Acuerdos de uso de archivos y reportes

Los reportes de tutoría se almacenan como borradores editables y pasan a `Enviado` al remitirse a administración. La carga se limita por archivo y por reporte; los metadatos quedan en MariaDB y los binarios en `api/uploads/tutor-reports/`, que se ignora en Git. El despliegue debe respaldar esa carpeta o moverla a un almacenamiento persistente compartido.

La exportación institucional editable queda pendiente hasta recibir la plantilla oficial. No usar informes de demostración como documentos oficiales.

La consulta de solicitudes autenticada también entrega `cancellationReason` al estudiante propietario para presentar la explicación de la cancelación en **Mis solicitudes**.

## Notificaciones persistentes e informe mensual provisional

Rutas nuevas autenticadas:

- `GET /notifications`: lista hasta 50 notificaciones del usuario y devuelve el contador `unread`.
- `PATCH /notifications/{id}/read`: marca como leída únicamente una notificación perteneciente al usuario autenticado.
- `POST /notifications/read-all`: marca como leídas todas las notificaciones de esa cuenta.
- `GET /tutor/monthly-report?month=AAAA-MM`: para rol Tutor, consolida sesiones realizadas, métricas, reportes y metadatos de anexos; devuelve el borrador existente si lo hay.
- `PUT /tutor/monthly-report`: crea o actualiza el borrador del mes. Los campos son `month`, `title`, `introduction`, `achievements`, `challenges` y `recommendations`. No se permite editar un informe en estado Enviado.

Se notifican nuevas solicitudes estudiantiles o administrativas, asignaciones, confirmaciones, cancelaciones con justificación, cambios de estado y reportes diarios enviados a administración. Las notificaciones son por destinatario, tienen marca de lectura y se consultan cada 30 segundos en la interfaz. Los errores al persistirlas se registran sin revertir la operación que ya se realizó.

`database/migrations/003_notificaciones_informe_mensual.sql` crea de forma idempotente `Notificacion` e `InformeMensualTutor` al iniciar la API. La interfaz mensual permite guardar y previsualizar el consolidado, descargar un documento Word compatible `.doc` e imprimirlo como PDF. El formato se declara provisional hasta incorporar la plantilla institucional. La API pasó `npm run typecheck` y `npm run validate`; el frontend pasó `npm run build`; el health check local respondió con MariaDB conectado.

## Mejoras de tutor: recuperaciones, solicitudes, sesiones y CRUD de reportes

- `GET /tutor/recoverable-sessions` devuelve únicamente sesiones propias en estado `Cancelada` o `No Asistida` sin recuperación `Programada`/`Realizada`. `POST /tutor/recoveries` vuelve a validar propiedad, estado, fecha futura y que no se duplique una recuperación activa.
- Las solicitudes del tutor/monitor se consultan con el listado autenticado existente. Confirmar/cancelar tutorías y marcar monitorías atendidas mantienen sus rutas de decisión; la cancelación exige motivo.
- `GET /tutor/reportable-sessions` lista las sesiones realizadas pendientes y aquellas con informe. `POST /tutor/reports` crea borrador; `GET /tutor/reports/{id}` devuelve el detalle y anexos propios; `PATCH /tutor/reports/{id}` edita únicamente estados `Borrador` o `Devuelto`; `POST /tutor/reports/{id}/submit` remite a administración; `DELETE /tutor/reports/{id}` solo elimina `Borrador` no enviado y retira sus archivos. Los reportes devueltos conservan historial.
- `GET /tutor/reports/{id}/attachments/{attachmentId}` descarga solo un archivo que pertenezca a un reporte del tutor autenticado. Las rutas internas no se exponen en la respuesta JSON.

Al editar un borrador sin seleccionar archivos nuevos, se conservan los adjuntos existentes. Si se reemplazan, se quitan los archivos anteriores después de confirmar la actualización. El límite continúa en 4 MB por archivo y 12 MB por reporte.

El ejemplo ficticio de solicitud de `web/data/ejemplo.json` se eliminó del archivo local. No se modificaron filas de `Solicitud` en MariaDB; el registro #1 está ligado a una sesión y se conservó conforme a la indicación del equipo.

## Facultades, horarios y decisiones de solicitudes

- `POST /admin/faculties`: registra una facultad activa (`name`, `description` opcional); responde `409` si el nombre ya existe.
- `GET /admin/request-slots?userId=&role=&subjectId=&periodId=`: genera fechas próximas desde bloques activos de `Disponibilidad` (tutor) o `HorarioMonitor` (monitor) dentro del periodo.
- `POST /requests/{id}/assign`: exige una asignación activa compatible con tipo/asignatura/periodo, bloque semanal existente y ausencia de sesión traslapada. La operación genera la sesión y notifica a estudiante y responsable.
- `POST /requests/{id}/decision`: solo el tutor o monitor asignado puede confirmar o cancelar, con justificación obligatoria al cancelar. La confirmación marca la sesión `Confirmada`.
- `PATCH /requests/{id}`: administración solo puede pasar solicitudes permitidas a `Cancelada` o `Finalizada`; no puede aprobar ni rechazar.
- `DELETE /requests/{id}`: preserva el historial; solicitudes asignadas, atendidas o finalizadas responden `409` con la explicación al usuario.

Los reportes diarios se autorizan mediante la asignación académica del tutor a la sesión. La consulta tolera informes previos sin fila `InformeTutorDetalle`, recuperando los datos disponibles de `Informe.contenido`. El informe mensual toma únicamente sesiones realizadas que ya tengan un informe individual asociado.\nLa consulta de bloques excluye horarios ya ocupados y la operación de asignación vuelve a revisar el cruce dentro de la transacción para manejar concurrencia.
## Corrección de arranque: listado administrativo de solicitudes

Se agregó `listAdminRequests` a las importaciones de `server.ts`. La ruta autenticada `GET /requests` ejecutaba esa función para el rol Administrador, pero no estaba enlazada en el módulo, por lo que fallaba en ejecución con `ReferenceError`. La comprobación de tipos de `server.ts` está desactivada mediante `@ts-nocheck`; por eso se verificó explícitamente que el símbolo exista en `admin.ts` y esté importado en el servidor.
### Facultades y correcciones de agenda e informes

- `GET /admin/faculties` lista facultades activas e inactivas y el conteo de programas asociados.
- `POST /admin/faculties` crea; `PATCH /admin/faculties/{id}` actualiza nombre, descripción y estado; `DELETE /admin/faculties/{id}` elimina únicamente si no tiene programas relacionados. Las operaciones requieren rol Administrador.
- `GET /admin/request-slots` genera opciones fecha/hora a partir del horario semanal del responsable. Omite horas que ya comenzaron en el día actual y sesiones ocupadas del mismo responsable en cualquiera de sus asignaciones. La asignación vuelve a verificar el bloque semanal y los traslapes antes de insertar la sesión.
- Cuando cambia la asignatura de una asignación de Tutor, los bloques semanales se copian a la asignación nueva; los registros previos permanecen unidos a la asignación histórica. La validación de traslapes solo considera asignaciones activas.
- `POST /tutor/reports` rechaza reportes de sesiones ordinarias que no estén realizadas o finalizadas. Las recuperaciones requieren el estado Realizada. El formulario mensual precarga los apartados narrativos con los reportes individuales; se permite editar y descargar Word y no se ofrece imprimir la página del software.

### Validación de periodos, disponibilidad y alta de reportes

`GET /admin/request-slots` responde `422 PERIOD_EXPIRED` si el periodo Activo o Planeado ya terminó, y `422 PERIOD_DATES_INVALID` para rangos inconsistentes. El API no inventa fechas ni programa fuera del rango institucional. Los bloques Híbridos de monitoría se convierten en opciones Presencial y Virtual, las únicas modalidades admitidas por `Sesion`.

`POST/PATCH /tutor/availability` puede omitir `assignmentId` únicamente si el tutor tiene una sola asignación activa para el periodo; de lo contrario se debe seleccionar. El servidor normaliza el dato vacío, verifica pertenencia y revisa cruces solo en asignaciones activas. La fecha de sesión y recuperación se normaliza en SQL a `AAAA-MM-DD` antes de validar el reporte.

Los reportes Enviados, Aprobados o Entregados permanecen como historial de solo lectura. Las sesiones finalizadas sin informe ofrecen Crear; Borrador/Devuelto ofrece edición; solo se elimina un Borrador no enviado.

### Prueba de creación de disponibilidad

El formulario ahora llama `POST /tutor/availability` para un bloque nuevo; `PATCH /tutor/availability/{id}` se reserva para IDs existentes mayores que cero. Se reprodujo el guardado con la sesión y asignación activas del tutor, y se confirmó la lectura del bloque en `GET /tutor/availability`: ID `19`, lunes 08:00–09:00, modalidad Presencial, asignatura Matemáticas básicas. Es un bloque semanal provisional guardado en MariaDB local.
