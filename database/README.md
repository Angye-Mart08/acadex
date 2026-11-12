# Base de datos

Esta carpeta contiene los scripts de MariaDB del proyecto.

## Archivo principal

- `gestion_monitorias_tutorias.sql`: crea la base de datos, tablas, restricciones y datos de prueba iniciales.

## Instalación local

La instalación recomendada se realiza al iniciar la API. Desde la raíz del
proyecto:

```powershell
Copy-Item .env.example .env
cd C:\Users\brayh\acadex\api
npm install
npm run dev
```

En el primer arranque, la cuenta definida en `DATABASE_BOOTSTRAP_USER` crea la
base `gestion_monitorias_tutorias`, el usuario de aplicación y las 36 tablas
del esquema con los datos iniciales. En arranques posteriores se detectan las
tablas esenciales y no se ejecuta nuevamente el instalador.

El archivo SQL también puede ejecutarse manualmente desde una terminal de
MariaDB si se requiere una instalación controlada:

```sql
SOURCE C:/Users/brayh/acadex/database/gestion_monitorias_tutorias.sql;
```

Este script no elimina la base de datos. La API además sustituye el nombre de
la base en memoria cuando se usa otro `DATABASE_NAME` para una prueba aislada.

Las migraciones `002` a `008` se aplican automáticamente al iniciar la API. La
migración `008_historial_solicitudes_cambio_clave.sql` crea un historial durable
de solicitudes, conserva las pendientes existentes y actualiza su estado a
**Completada** cuando una contraseña se restablece.

## Usuario de conexión de la API

La API utiliza por defecto el usuario `tutorias_app`. En el flujo recomendado,
la cuenta administrativa definida en `DATABASE_BOOTSTRAP_USER` lo crea
automáticamente durante el primer arranque y le asigna permisos únicamente
sobre la base del proyecto. Coloca la contraseña deseada en
`DATABASE_PASSWORD`. Si necesitas crear el usuario manualmente, puedes usar:

```sql
CREATE USER 'tutorias_app'@'localhost' IDENTIFIED BY 'cambia-esta-clave';
CREATE USER 'tutorias_app'@'127.0.0.1' IDENTIFIED BY 'cambia-esta-clave';
GRANT SELECT, INSERT, UPDATE, DELETE ON gestion_monitorias_tutorias.* TO 'tutorias_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON gestion_monitorias_tutorias.* TO 'tutorias_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

El usuario `tutorias_app` es para consultar y operar la aplicación. La API usa
una cuenta administrativa únicamente para preparar el primer arranque cuando
la cuenta de aplicación todavía no puede conectarse. En ejecuciones posteriores
detecta las tablas existentes y no vuelve a ejecutar el instalador ni
sobrescribe los datos.

## Verificación desde HeidiSQL

Configura una sesión nueva de MariaDB/MySQL por TCP/IP:

| Campo | Valor |
| --- | --- |
| Hostname / IP | `127.0.0.1` |
| Puerto | `3306` |
| Usuario | El valor de `DATABASE_USER` |
| Contraseña | El valor de `DATABASE_PASSWORD` |
| Base de datos | `gestion_monitorias_tutorias` |

Después de conectarte, la base debe aparecer en el árbol lateral. Abre la
carpeta **Tables** y confirma que existan tablas como `Usuario`, `Rol`,
`UsuarioRol`, `Espacio`, `Solicitud`, `Sesion`, `Seguimiento` e `Informe`.

También puedes ejecutar estas consultas en HeidiSQL:

```sql
SELECT DATABASE() AS base_actual;

SELECT COUNT(*) AS total_tablas
FROM information_schema.tables
WHERE table_schema = 'gestion_monitorias_tutorias';

SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'gestion_monitorias_tutorias'
ORDER BY table_name;

SELECT id_usuario, codigo, correo, estado
FROM Usuario
ORDER BY id_usuario;

SELECT id_solicitud, estado, prioridad, fecha_solicitud
FROM Solicitud
ORDER BY id_solicitud DESC;
```

El resultado esperado de la instalación local actual es 36 tablas. La cantidad
de registros puede cambiar cuando se utilice el software; esa es precisamente
la forma de verificar que las operaciones se están persistiendo.

## Control y observación directa del CRUD en MariaDB

Para comprobar en tiempo real que las operaciones de creación, edición, cambio de estado y eliminación (CRUD) se reflejan en la base de datos MariaDB:

### 1. Desde la terminal (Auditoría inmediata)

Ejecuta el script de inspección oficial:

```powershell
npm run db:inspect
```

Este comando se conecta al motor MariaDB en `127.0.0.1:3306`, enumera las 36 tablas del esquema y muestra tablas formateadas con los últimos registros de:
- **`Usuario`**: ID, código, nombre, correo institucional, estado y roles asignados.
- **`Espacio`**: ID, código, nombre, tipo, capacidad y estado.
- **`Solicitud`**: ID, estudiante, asignatura, modalidad, prioridad, estado y fecha de radicación.

### 2. Desde el panel web (Configuración)

Dentro de Acadex, ingresa como Administrador y navega a **Configuración**. En la parte superior encontrarás el módulo **Control y Observación de MariaDB**:
- Indica el estado de la conexión en vivo.
- Muestra el conteo en tiempo real de registros por tabla (`Usuario`, `Espacio`, `Solicitud`, `Asignatura`, `SesionAcompanamiento`, `PeriodoAcademico`).
- Incluye el botón **Refrescar conteos** para observar inmediatamente cómo suben o bajan los registros al realizar operaciones en los módulos.

### 3. Conexión desde clientes gráficos (HeidiSQL, DBeaver, MySQL Workbench)

| Parámetro | Valor de conexión |
| --- | --- |
| Host / Servidor | `127.0.0.1` o `localhost` |
| Puerto | `3306` |
| Usuario | `tutorias_app` (o `root`) |
| Contraseña | *(vacía o según tu archivo `.env`)* |
| Base de datos | `gestion_monitorias_tutorias` |

> En caso de que MariaDB presente error `Access denied for user 'tutorias_app'`, ejecuta `node scripts/fix-db-user.mjs` en la carpeta `api/` para sincronizar los privilegios automáticamente.

## Reglas

- El backend no debe conectarse utilizando el usuario `root`.
- Las credenciales locales deben permanecer en `.env`, nunca en Git.
- Los datos de prueba del script sirven para desarrollo y demostración, no para producción.
- Las nuevas modificaciones al modelo deben documentarse en `docs/modelo-datos.md`.

## Diagnóstico de conexión

Una pantalla administrativa sin datos no confirma por sí sola que el esquema
esté dañado. Verifica primero `http://localhost:3000/health`, las credenciales
de `.env`, el estado de MariaDB y el origen del navegador frente a
`CORS_ORIGIN`. Si la aplicación muestra una pantalla de recuperación por un
error de renderizado, consulta también la consola del navegador y los logs de
la API antes de modificar o reinstalar la base.

## Integridad referencial y reglas de eliminación

Los endpoints de borrado no eliminan en cascada el historial académico. Un usuario con actividad asociada recibe `409`; se debe desactivar la cuenta para conservar sus datos. Tampoco se permite autoeliminarse ni eliminar al último administrador activo.

Un espacio con horarios, reservas o sesiones y una solicitud asignada, en atención o con sesiones/clasificaciones tampoco se borran: se desactiva el espacio o se conserva/cambia el estado de la solicitud. El periodo activo y los periodos con asignaciones, horarios o solicitudes siguen protegidos. Las comprobaciones y el borrado permitido se ejecutan dentro de transacciones; las claves foráneas siguen siendo la última barrera frente a dependencias no contempladas.

## Integración reciente de solicitudes y espacios

La asignación de una solicitud utiliza las columnas existentes `Sesion.id_solicitud` e `Sesion.id_asignacion`; la aplicación no necesita volver a crear ni modificar el esquema para habilitarla. El personal asignable debe tener una asignación activa para la materia y periodo de la solicitud. El alta de espacios conserva el esquema actual de `Espacio` y confirma la fila mediante su ID recién generado.

El alta administrativa de espacios valida campos y requiere una referencia física para espacios presenciales. La persistencia y lectura de confirmación son atómicas. La prueba de integración del 15 de octubre creó y eliminó su propio espacio temporal; no dejó filas temporales.

## Mejora 2: restricciones de integridad en MariaDB

El esquema nuevo en `gestion_monitorias_tutorias.sql` aplica restricciones `CHECK` para rangos y coherencia temporal, además de las claves foráneas, unicidad y dominios `ENUM` ya existentes. Entre ellas: semestre 1–12; horas de asignación 1–60; capacidad de espacio 1–1000; créditos 1–30 cuando se informen; horarios de inicio/fin; duración válida y fechas finales no anteriores a las iniciales. La migración histórica agrega 14 reglas nuevas; conserva las validaciones de horario de `Disponibilidad` y `Sesion` que ya existían en las instalaciones anteriores.

### Base ya instalada

La instalación automática inicial no vuelve a ejecutar el DDL sobre una base existente. Por ello, la mejora incluye `database/migrations/001_integridad_datos.sql`, separada del instalador y sin operaciones de borrado o recreación. Antes de aplicarla:

1. Hacer un respaldo de la base.
2. Ejecutar la sección **PREVALIDACIÓN** del archivo en HeidiSQL. Cada conteo debe ser cero; si no, corregir los registros señalados antes de continuar.
3. Ejecutar la sección **APLICACIÓN** una sola vez. No ejecutar el archivo completo por segunda vez porque MariaDB no admite volver a crear los mismos nombres de constraint.
4. Ejecutar la consulta final del archivo y confirmar que aparezcan las restricciones añadidas.

No se ejecutó esta migración automáticamente ni se alteró la base local durante el desarrollo. Las reglas intertablas (por ejemplo, que una asignación de una sesión corresponda a la misma materia y periodo que su solicitud) siguen verificándose transaccionalmente en la API; no pueden expresarse como un `CHECK` simple de una fila.

La prevalidación es de solo lectura. La aplicación efectiva requiere revisar los conteos, disponer de respaldo y ejecutar la migración conscientemente.

## Auditoría de integridad de la instalación

Desde `api/`, con el servicio MariaDB activo y `.env` configurado, ejecutar:

```powershell
npm run db:audit
```

El script fuerza una transacción de solo lectura, no imprime datos personales ni hashes, comprueba metadatos, las relaciones foráneas, las credenciales, perfiles/roles, asignaciones, solicitudes/sesiones, rangos y restricciones `CHECK`. Un resultado `REVISAR` o `PENDIENTE` es evidencia para analizar; el script no corrige registros ni instala restricciones automáticamente.

Auditoría local del 15 de octubre de 2026: 36/36 tablas InnoDB, 55 claves foráneas, 26 restricciones `UNIQUE`, cero referencias huérfanas; se encontraron 4 credenciales que no parecen bcrypt, 6 diferencias entre códigos de estudiante y usuario, 1 usuario con más de una asignatura activa en un rol y 1 sesión con materia o periodo distinto al de su solicitud. No se encontraron correos no institucionales, perfiles activos sin rol, solicitudes sin programa del estudiante ni horarios invertidos. Faltaban las nuevas restricciones `CHECK` de la mejora 2. No se modificaron datos. Remediar los registros antes de usar la base con cuentas reales; para aplicar la migración, comprobar por separado que todos sus conteos de prevalidación sean cero.

## Coherencia de roles al editar usuarios

`Usuario.estado` y `Credencial.estado` controlan el acceso global; `UsuarioRol.estado` controla si una membresía específica está activa. Por ello, desactivar una cuenta no cambia sus roles. En `PATCH /users/{id}`, el arreglo `roles` es el conjunto final: los seleccionados quedan activos y los quitados se inactivan junto con su perfil operativo. Los listados usan solo membresías activas; los filtros no alteran el conjunto que devuelve la respuesta. La actualización de Estudiante desactiva las relaciones de programa anteriores cuando se cambia el programa principal.

La reauditoría de solo lectura posterior a la prueba integrada de edición reportó 5 códigos estudiantiles discrepantes, frente a los 6 del corte anterior documentado. La prueba temporal fue eliminada y no se ejecutó una remediación de registros existentes. Reconciliar los cortes antes de corregir los datos; el detalle permanece en `docs/BITACORA_PROYECTO.md`.

## Catálogos académicos y validaciones de integridad

No fue necesario modificar el DDL ni aplicar una migración: las tablas `Asignatura`, `Programa`, `Facultad` y sus relaciones ya existían. Los nuevos endpoints administrativos validan tipos, rangos, facultad y duplicados antes de guardar. Las eliminaciones consultan referencias operativas y responden conflicto en vez de borrar historial; el administrador puede cambiar el estado a `Inactivo`.

La API rechaza nombres personales con dígitos y entradas no enteras en campos numéricos; créditos, semestre, horas y capacidad respetan sus rangos funcionales. Se probaron CRUD temporales de asignatura y programa con creación, edición y eliminación; también se confirmó que referencias existentes bloquean el borrado. Los registros temporales fueron limpiados y no se modificaron datos preexistentes.

## Migración de reportes y operación del tutor

Al iniciar la API se aplica idempotentemente `migrations/002_reportes_tutor.sql` mediante las credenciales bootstrap del `.env`. La migración agrega `InformeTutorDetalle` para el horario real, lugar, conteos, asistentes, SAT y marca de recuperación, y `AdjuntoInformeTutor` para los metadatos de los archivos. El contenido de usuario se conserva; la base no se sobrescribe. En una instalación existente el usuario bootstrap debe tener permisos de `CREATE` y `ALTER`.

Los adjuntos binarios del formulario se guardan en `api/uploads/tutor-reports/` y no se suben a Git. Debe conservarse esta carpeta junto con la copia de seguridad de MariaDB si se requiere retener evidencias. En un despliegue multiinstancia conviene trasladar los archivos a almacenamiento compartido y guardar allí sus identificadores.

La verificación local posterior a la migración encontró 38 tablas InnoDB, 57 claves foráneas, 27 restricciones `UNIQUE`, 9 restricciones `CHECK` y cero referencias huérfanas. La auditoría también reportó filas de demostración por revisar: 4 credenciales que no parecen bcrypt, 5 códigos de estudiante discrepantes, una persona con más de una asignación activa por rol y una sesión con asignatura/periodo distinto al de la solicitud. La auditoría es de solo lectura y no se corrigieron estos datos. El script aún indica reglas `CHECK` recomendadas ausentes; contrastar su catálogo antes de afirmar que todas las validaciones físicas están instaladas.

## Notificaciones e informe mensual provisional

La migración `migrations/003_notificaciones_informe_mensual.sql` agrega sin reemplazar información existente:

- `Notificacion`: propietario `Usuario`, categoría, título/mensaje, referencia opcional a entidad, fecha e indicador de lectura. Los índices soportan bandeja reciente y conteo de pendientes; las notificaciones se eliminan al borrar su usuario.
- `InformeMensualTutor`: contenido JSON del borrador mensual por usuario y `AAAA-MM`, con estado y marcas de creación/actualización/envío. La clave única evita dos informes del mismo tutor para el mismo mes.

La API ejecuta esta migración de forma idempotente al iniciar, junto con la migración de reportes diarios. La verificación local confirmó 40 tablas, 59 claves foráneas, 28 restricciones `UNIQUE`, 10 restricciones `CHECK` y cero referencias huérfanas tras la instalación. La auditoría aún informa filas demostrativas que requieren revisión; no se modificaron. Para verificar la instalación, ejecutar `npm run db:audit` desde `api/` o consultar `Notificacion` e `InformeMensualTutor` en HeidiSQL.

## Reportes diarios: CRUD y preservación de datos

El CRUD de reportes del tutor reutiliza `Informe`, `InformeTutorDetalle`, `HistorialInforme` y `AdjuntoInformeTutor`; no requiere migración adicional. Se pueden editar borradores/devueltos; el borrado físico se restringe a informes `Borrador` no enviados y limpia su historial de edición y archivos asociados. Los reportes devueltos y enviados preservan trazabilidad. Las descargas verifican que el informe y el anexo pertenezcan al tutor autenticado.

En la revisión de solicitudes se retiró únicamente el dato ficticio de `web/data/ejemplo.json`. No se insertaron ni eliminaron filas en MariaDB. El registro #1 se conservó porque tiene una sesión relacionada; eliminarlo requeriría intervenir historial operativo, lo cual no fue autorizado.

## Reglas recientes de operación académica

No se añadió ni modificó el esquema de MariaDB para esta entrega. La creación de facultades usa `Facultad`; la generación de opciones horarias consulta `Disponibilidad`, `HorarioMonitor`, `AsignacionAcademica` y `PeriodoAcademico`. Las sesiones se validan contra esos horarios y no pueden traslaparse con sesiones activas del mismo responsable.

La bandeja del tutor/monitor consulta las sesiones relacionadas con su asignación. Los informes diarios se asocian uno a uno con una sesión mediante la restricción existente de `Informe.id_sesion`; el informe mensual lee solo esas sesiones con reporte. La lectura de informes heredados admite que no exista fila en `InformeTutorDetalle`.
## Integridad para facultades y horarios de tutor

El CRUD de facultades utiliza la tabla existente `Facultad`; el borrado físico se bloquea cuando `Programa.id_facultad` tiene referencias, por lo que se debe cambiar el estado a Inactivo. No se requiere migración adicional de esquema para esta funcionalidad.

Al cambiar la asignatura de un tutor, la aplicación conserva la asignación previa para mantener el historial de sesiones y duplica los bloques de `Disponibilidad` en la asignación activa nueva. No elimina horarios de MariaDB. La validación de traslapes de bloques semanales ignora asignaciones canceladas.

## Estado de los datos académicos consultados

La revisión de solo lectura detectó el periodo `2026-1` Activo con fecha de cierre 20/06/2026. El API responde `PERIOD_EXPIRED` porque no debe programar fuera del calendario institucional. Para probar solicitudes, registra/activa el periodo vigente desde el módulo administrativo con las fechas oficiales; se conservaron intactos los registros anteriores. Los monitores tienen bloques activos en el periodo anterior y la asignación activa del tutor de muestra carece de bloques activos.

La base contiene una sesión finalizada del tutor con informe Aprobado y no tiene otra sesión finalizada sin informe. La vista ofrece el informe aprobado en consulta. Para comprobar creación/edición/eliminación se necesita una sesión finalizada sin informe o un borrador propio; no se insertaron datos de prueba.

### Bloque provisional creado para verificar el horario

El alta se ejecutó con la lógica real de autenticación y disponibilidad del tutor y se verificó mediante una segunda lectura. Se conserva en `Disponibilidad` como ID `19`, asignación `10`, lunes 08:00–09:00, modalidad Presencial, estado Activo. Es un bloque recurrente semanal de demostración; elimínalo desde el módulo Horario si no debe permanecer en los datos locales.

### Tabla de sesiones de autenticación

`migrations/004_sesiones_ingreso.sql` agrega `SesionIngreso` para controlar JWT de acceso: UUID de sesión, propietario, rol, vencimiento y revocación. Se aplica automáticamente al iniciar el API y usa `CREATE TABLE IF NOT EXISTS`, por lo que volver a iniciar no reinicializa ni sobrescribe datos. No modifica `Sesion`, que conserva exclusivamente la agenda académica.

`migrations/005_sesiones_preautenticacion.sql` agrega `SesionPreAutenticacion` para los tokens temporales de selección inicial de rol. El servidor guarda vencimiento y revocación, consume el token una única vez y permite cancelarlo desde la pantalla de selección. El cambio de rol dentro del portal se realiza con una fila de `SesionIngreso` y revoca la fila anterior.
