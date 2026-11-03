# Modelo de datos

## Fuente principal

El modelo implementado se encuentra en [gestion_monitorias_tutorias.sql](../database/gestion_monitorias_tutorias.sql).
La API consulta esta misma base mediante `mysql2`; el frontend no mantiene una
copia paralela como fuente de verdad.

## Módulos principales

### Seguridad

- `Rol`: roles Administrador, Estudiante, Tutor y Monitor.
- `Usuario`: identidad institucional, correo, documento, número de contacto opcional (`telefono`, hasta 20 caracteres) y estado.
- `Credencial`: relación de acceso del usuario.
- `UsuarioRol`: relación entre usuarios y roles.
- `Administrador`: información específica del administrador.

### Usuarios académicos

- `Estudiante`: información académica del estudiante.
- `Tutor`: información docente y horas asignadas.
- `Monitor`: información de monitoría, resolución y horas asignadas.

### Catálogos académicos

- `Facultad` y `Programa`.
- `Asignatura` y `ProgramaAsignatura`.
- `PeriodoAcademico`.
- `TipoSolicitud` y `TipoClasificacion`.

Los catálogos `Programa` y `Asignatura` tienen CRUD administrativo. Un programa requiere una facultad existente. Los borrados se bloquean si hay filas relacionadas en `EstudiantePrograma`, `ProgramaAsignatura`, `AsignacionAcademica` o `Solicitud`; la desactivación conserva la historia y excluye el elemento de los selectores operativos. Los créditos de asignatura, cuando se informan, son enteros de 1 a 30.

### Operación de acompañamientos

- `Solicitud`: petición de tutoría o monitoría realizada por un estudiante.
- `Disponibilidad`: bloques de atención de una asignación académica.
- `AsignacionEspacio`: espacio asignado a un bloque disponible.
- `Sesion`: encuentro programado de tutoría o monitoría.
- `Asistencia`, `Seguimiento` y `Compromiso`.
- `EntregaActividad` y `Evidencia`.
- `Informe`: informe asociado a una sesión.

## Relaciones relevantes

```text
Usuario ──< UsuarioRol >── Rol
Usuario ── 1:1 ── Estudiante / Tutor / Monitor / Administrador
Estudiante ──< Solicitud >── Asignatura
Solicitud ──< Sesion ──< Asistencia
Sesion ──< Seguimiento ──< Compromiso ──< EntregaActividad
Disponibilidad ──< AsignacionEspacio >── Espacio
```

## Correspondencia con el frontend

| Pantalla | Entidades principales |
| --- | --- |
| Inicio de sesión | `Usuario`, `Credencial`, `UsuarioRol` |
| Gestión de usuarios | `Usuario`, `Rol`, `UsuarioRol` |
| Gestión de espacios | `Espacio` |
| Gestión de solicitudes | `Solicitud`, `Estudiante`, `Asignatura`, `TipoSolicitud` |
| Portal tutor | `Tutor`, `Disponibilidad`, `Sesion`, `Informe` |
| Portal monitor | `Monitor`, `HorarioMonitor`, `Solicitud`, `Sesion` |
| Portal estudiante | `Estudiante`, `Solicitud`, `Sesion`, `Seguimiento` |

## Estado de integración

La API implementa autenticación y selección de rol, usuarios, espacios,
solicitudes, periodos académicos, catálogos administrativos y consultas del
dashboard y reportes. Los catálogos de asignaturas y periodos se consultan
mediante `GET /catalogs/subjects` y `GET /catalogs/periods`; administración
gestiona el CRUD de periodos mediante `/periods`. La lista ejecutable completa
y sus métodos se mantiene en
[README_API.md](../api/README_API.md); el servidor se registra en
`api/src/server.ts`.

El servidor ya consulta disponibilidad y sesiones por medio de
`GET /availability` y `GET /sessions`, filtrando por el rol activo y el usuario
autenticado. El esquema también modela asistencia, seguimiento, compromisos,
evidencias e informes; sus operaciones de escritura y los informes personales
aún no tienen persistencia API.

## Nota de seguridad

El login usa correo institucional y contraseña. Las cuentas del SQL local de
desarrollo pueden tener el documento como clave temporal; en desarrollo el
servidor migra esas claves a bcrypt y exige cambiarlas en el primer acceso. En
producción las claves que no sean hashes bcrypt se rechazan. Las claves
temporales generadas por administración se devuelven una sola vez. Los listados
no incluyen secretos ni hashes. El CSV de entrega incluye únicamente claves
temporales recién generadas, revoca las anteriores y obliga al cambio en el
primer acceso; el archivo debe compartirse de forma segura y eliminarse después.

La relación `UsuarioRol` es de muchos a muchos: un usuario puede ser, por
ejemplo, Monitor y Estudiante al mismo tiempo. El rol activo no se almacena
como un dato único del usuario; pertenece al contexto de la sesión y se elige
después del login. Por eso el contrato utiliza `roles[]` y contempla
`POST /auth/select-role`.

El estado global de la cuenta (`Usuario.estado` y `Credencial.estado`) no debe
reescribir el estado de `UsuarioRol`: desactivar el acceso no elimina la
membresía; quitar un rol sí inactiva esa relación y su perfil operativo. Así,
una edición de roles reemplaza únicamente las membresías explícitamente
seleccionadas, y reactivar una cuenta no resucita roles retirados. Para cuentas
antiguas que desactivaban ambas capas, la reactivación infiere membresías solo
de los perfiles de rol que continúan activos.

La política de negocio limita `UsuarioRol` a estas combinaciones: Administrador;
Tutor; Monitor; Estudiante; o Monitor + Estudiante. Un usuario solo puede
pertenecer a un perfil administrativo o tutorial, y Monitor puede conservar
simultáneamente su perfil Estudiante. Esta matriz se valida en interfaz, API y
contrato OpenAPI.

## Nota de integración

La asignación de una solicitud no agrega columnas a `Solicitud`: se representa mediante una fila en `Sesion` que enlaza `Sesion.id_solicitud` con `Sesion.id_asignacion`. Esta última referencia `AsignacionAcademica`, cuya persona, rol, asignatura y periodo deben estar activos y coincidir con la solicitud. La atención cierra la sesión como `Realizada` y la solicitud como `Atendida`. El flujo no requiere migración SQL.

Regla de captura: por perfil/rol Tutor o Monitor el formulario y la API exigen exactamente una asignatura en la asignación académica. El historial puede conservar filas de periodos previos, pero cada alta o edición de perfil establece una sola asignatura activa para ese rol.

## Refuerzo de integridad en MariaDB

El DDL principal refuerza las reglas de dominio con `CHECK`, manteniendo las claves foráneas, unicidades y `ENUM` existentes. Se fijan los límites de semestre (1–12), horas semanales (1–60), capacidad (1–1000), créditos (1–30 cuando se informan) y duración de horario (1–1440 minutos). También se impide guardar rangos de fechas invertidos y sesiones/reportes/recuperaciones con hora final igual o anterior a la inicial; compromisos cumplidos antes de su fecha prevista y cancelaciones con días de anticipación negativos.

Para instalaciones anteriores, aplicar únicamente después de respaldo y con conteos de prevalidación en cero la migración `database/migrations/001_integridad_datos.sql`. Esta migración no se ejecutó sobre la base local. Las reglas que dependen de varias tablas (como correspondencia solicitud–asignación–periodo–asignatura) las valida la API dentro de transacciones; no se duplican como restricciones de una sola fila.

## Resultado de auditoría local

La auditoría de solo lectura reportó 36 tablas InnoDB, 55 claves foráneas, 26 restricciones `UNIQUE` y cero referencias huérfanas en esas relaciones. Tampoco detectó correos fuera del dominio institucional, perfiles activos sin rol, estudiantes sin programa relacionado ni horarios con fin anterior al inicio.

Quedan hallazgos que requieren revisión: 4 credenciales almacenadas en un formato que no parece bcrypt; 6 perfiles de Estudiante con código distinto al de `Usuario`; una persona con más de una asignatura activa dentro del mismo rol; y una sesión cuyo responsable se relaciona con una asignatura o periodo diferente al de su solicitud. Además, la instalación todavía carece de las nuevas restricciones `CHECK` propuestas (14 adicionales; el horario de `Disponibilidad` y `Sesion` ya contaba con checks anteriores). No se imprimieron valores personales y no se alteró ningún registro. Resolver los hallazgos relevantes y repetir `npm run db:audit` antes de usar información real; ejecutar la migración únicamente si sus propios conteos de prevalidación son cero.

En una reauditoría de solo lectura posterior (15 de octubre de 2026), el conteo de códigos estudiantiles discrepantes fue 5 en lugar de 6. La prueba de edición usó y eliminó un usuario temporal y no modificó registros existentes deliberadamente; la diferencia entre cortes debe reconciliarse antes de cualquier reparación de datos. Los demás hallazgos principales se mantuvieron estables.

## Datos de reportes de tutoría

`Informe` conserva el encabezado y estado de revisión. `InformeTutorDetalle` relaciona cada reporte con su sesión e incluye fecha y horario reales, lugar, descripción, número de asistentes y SAT, listas JSON de estudiantes y marca/identificador de recuperación. `AdjuntoInformeTutor` registra categoría, nombre, tipo, ruta local y tamaño; el archivo físico se guarda en el directorio de cargas de la API. Las claves foráneas vinculan el detalle y los adjuntos al informe.

## Notificacion

Entidad persistente para avisos personales del sistema. Cada registro pertenece a un `Usuario` y almacena categoría (`Solicitud`, `Sesion`, `Informe` o `Sistema`), título, mensaje, referencia opcional a entidad, fecha y marca de lectura. Los índices por usuario/fecha y usuario/lectura soportan la bandeja y su contador. La migración `003_notificaciones_informe_mensual.sql` la crea sin modificar datos existentes.

## InformeMensualTutor

Entidad de borrador consolidado con relación a `Usuario`, periodo mensual `AAAA-MM`, título, contenido JSON editable, estado y marcas de creación/actualización/envío. Una restricción única garantiza un solo borrador por tutor y mes. El informe se deriva de `Informe`, `InformeTutorDetalle` y `AdjuntoInformeTutor`; estos registros fuente se conservan y no se duplican dentro del contenido mensual.

## Operaciones de reportes sin cambio de esquema

El CRUD reciente reutiliza `Informe`, `InformeTutorDetalle` y `AdjuntoInformeTutor`: el tutor consulta el reporte vinculado a una sesión y modifica sus campos mientras el estado sea editable. La eliminación física se limita a un borrador no enviado y retira sus filas dependientes; reportes devueltos/enviados conservan historial. La descarga de adjuntos valida la relación informe–sesión–asignación–tutor y no expone `ruta_archivo` al cliente.

La lista de sesiones recuperables no agrega una entidad nueva: aplica a `Sesion` cancelada/no asistida y excluye registros de `RecuperacionMonitoria` activos (`Programada` o `Realizada`). La misma regla se revalida al insertar la recuperación.
## Reglas adicionales del flujo de solicitudes e informes

El registro de facultades reutiliza `Facultad`; no incorpora una entidad nueva. Las fechas de asignación se calculan a partir de `Disponibilidad` para tutores y `HorarioMonitor` para monitores, vinculadas con `AsignacionAcademica`, `Asignatura` y `PeriodoAcademico`. `Sesion` mantiene la relación efectiva entre solicitud y responsable y su horario debe coincidir con una opción activa no ocupada.

Las decisiones del responsable se reflejan en `Sesion.estado`; el estado de `Solicitud` sigue conservando el flujo operativo e historial. La consulta de `Informe` verifica el propietario mediante la asignación asociada a la sesión. Para datos heredados, `InformeTutorDetalle` es opcional en lectura y los campos JSON existentes en `Informe.contenido` sirven como respaldo. El informe mensual se deriva de sesiones realizadas con informe individual; no duplica esos registros fuente ni requiere una migración adicional.
## Reglas operativas añadidas

`Facultad` se lista junto con el conteo de `Programa`; las referencias existentes impiden borrarla físicamente y permiten conservarla con estado Inactivo. `Disponibilidad` pertenece a una `AsignacionAcademica` de tutor. Si se cambia la asignatura, se mantienen los datos de la asignación previa y sus sesiones históricas, y se replican los bloques de horario para la asignación nueva. Las validaciones de traslape consideran solo asignaciones activas.

Los informes individuales se asocian a sesiones realizadas/finalizadas; los reportes de recuperaciones requieren que `RecuperacionMonitoria` esté Realizada. El informe mensual consolida los reportes asociados y propone valores narrativos derivados de sus actividades, logros, dificultades y recomendaciones.

## Reglas adicionales de agenda e informes

`Sesion` se crea dentro del rango del periodo y debe coincidir con un bloque semanal activo. Un bloque de monitoría `Híbrida` se ofrece como dos modalidades compatibles: Presencial o Virtual. El API resuelve `AsignacionAcademica` solo cuando existe una asignación activa única; si hay varias, requiere su identificador explícito.

Las fechas de `Sesion` y `RecuperacionMonitoria` se normalizan a `AAAA-MM-DD` para la validación del reporte. Estados Enviado/Aprobado/Entregado se conservan como historial de solo lectura; Borrador/Devuelto puede editarse.

La fila provisional de verificación se guardó en `Disponibilidad` asociada a `AsignacionAcademica.id_asignacion = 10`: lunes 08:00–09:00, Presencial, estado Activo. Tiene ID `19` y se puede retirar mediante el CRUD de disponibilidad del tutor.
