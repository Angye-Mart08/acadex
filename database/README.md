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

## Verificación de cambios realizados desde el software

1. Ejecuta la API y confirma `/health` con `database: connected`.
2. Inicia el frontend e ingresa con un usuario administrador.
3. Crea o modifica un usuario, espacio o estado de solicitud.
4. Recarga el navegador; el registro debe conservarse porque se consulta de
   nuevo desde MariaDB.
5. Comprueba el mismo registro en HeidiSQL con su `id`, código o correo.

Si la API no está disponible, la operación debe mostrar un error y no debe
considerarse guardada. Si una base existente tiene tablas parciales, el
bootstrap se detiene y reporta las tablas esenciales faltantes; nunca ejecuta
un borrado automático para repararla.

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
