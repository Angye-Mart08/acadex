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

## Integridad Referencial y Eliminación en Cascada (Hard Delete)

Para garantizar la consistencia relacional y evitar violaciones de clave foránea (`foreign key constraints`) durante las eliminaciones definitivas ejecutadas por el Administrador:

1. **Orden de eliminación en cascada para Usuarios**:
   - Tablas de nivel operativo: `EntregaActividad`, `Seguimiento`.
   - Flujo de solicitudes y sesiones: `Solicitud`, `HistorialSesion`, `Informe`, `SesionAcompanamiento`.
   - Perfiles y asignaciones académicas: `EstudiantePrograma`, `Estudiante`, `Disponibilidad`, `AsignacionAcademica`, `HorarioMonitor`, `Tutor`, `Monitor`, `Administrador`.
   - Seguridad y cuenta base: `Credencial`, `UsuarioRol` y finalmente `Usuario`.

2. **Orden de eliminación en cascada para Espacios**:
   - Desvinculación de horarios y reservas en `HorarioMonitor` y `AsignacionEspacio`.
   - Eliminación del registro físico en `Espacio`.

3. **Orden de eliminación para Solicitudes**:
   - Desvinculación y limpieza de `HistorialSesion`, `Informe` y `SesionAcompanamiento`.
   - Eliminación de la fila en `Solicitud`.
