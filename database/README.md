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
