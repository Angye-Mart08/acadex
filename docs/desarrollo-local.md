# Desarrollo local

Esta guía amplía el inicio rápido del [README principal](../README.md). Los contenedores incluyen Node.js 24 en sus imágenes; para ejecutar comandos npm directamente en el computador, instala Node.js 24.

## Docker Compose

Requiere Docker Engine o Docker Desktop con contenedores Linux y Docker Compose v2.
Desde la raíz del repositorio, copia la configuración si todavía no tienes `.env`:

```powershell
Copy-Item .env.example .env
```

Completa `DOCKER_DATABASE_PASSWORD`, `DOCKER_DATABASE_ROOT_PASSWORD` y `JWT_SECRET`
en `.env` con valores aleatorios distintos. Para generar cada valor puedes ejecutar:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Construye e inicia los tres servicios:

```powershell
docker compose up -d --build
docker compose ps
```

Abre [Acadex](http://localhost:5173) y comprueba
[el estado de la API y MariaDB](http://localhost:5173/health).
Nginx sirve el frontend compilado, las rutas de la SPA y el proxy `/api/v1`.
La API y MariaDB se comunican en la red interna; solo se publica el puerto web.
Compose espera a que MariaDB y la API estén saludables antes de iniciar sus dependientes.

El esquema y los datos de demostración se importan únicamente al crear el volumen
`database_data`. Los siguientes arranques conservan los datos; los cambios al SQL
inicial no se aplican automáticamente a una base existente. Esta base Docker es
independiente de la instalación local de MariaDB y no importa sus datos.
Las contraseñas de MariaDB en `.env` deben conservarse después del primer arranque:
cambiarlas allí no actualiza las cuentas de un volumen existente.

```powershell
docker compose logs -f api
docker compose down
docker compose up -d
```

`docker compose down` conserva el volumen. **`docker compose down -v` elimina
permanentemente la base Docker**, por lo que solo debe usarse para reiniciar datos
de prueba que ya no necesites.

El modo predeterminado es `DOCKER_NODE_ENV=development` para permitir el acceso
con las cuentas demo heredadas y su conversión a bcrypt al iniciar sesión.
Para un despliegue de producción configura `DOCKER_NODE_ENV=production`, asegúrate
de que las credenciales utilizadas ya tengan hashes bcrypt, configura el origen
público en `DOCKER_CORS_ORIGIN` y sirve HTTPS mediante un proxy de despliegue.
Para cambiar el puerto local, ajusta `DOCKER_WEB_PORT` y `DOCKER_CORS_ORIGIN`.
El frontend usa una URL relativa para la API y no requiere reconstrucción al cambiar el puerto.
Detén el frontend de `npm run dev` antes de iniciar Docker si está usando el puerto `5173`.

#### Cómo se preparó y verificó Compose

El archivo [compose.yaml](../compose.yaml) organiza la aplicación en tres servicios conectados por la red interna que crea Compose:

| Servicio | Función | Comprobación |
| --- | --- | --- |
| `db` | MariaDB 11.4; crea la base y el usuario de aplicación. Guarda sus datos en el volumen `database_data`. El SQL inicial se carga una sola vez cuando el volumen está vacío. | Health check de MariaDB antes de iniciar la API. |
| `api` | Construye la imagen desde [api/Dockerfile](../api/Dockerfile), conecta con `db` por el nombre de servicio, y aplica las migraciones incluidas en la imagen. | Health check en `/health`; Compose espera que la API esté saludable antes de iniciar web. |
| `web` | Construye la SPA con [web/Dockerfile](../web/Dockerfile) y la publica mediante Nginx en el puerto local `5173` por defecto. Nginx envía las peticiones API al servicio `api`. | Health check de Nginx en `/health`. |

Las credenciales de la base Docker son independientes de las variables `DATABASE_*` de MariaDB instalada directamente en Windows. Compose toma `DOCKER_DATABASE_PASSWORD`, `DOCKER_DATABASE_ROOT_PASSWORD` y `JWT_SECRET` del `.env`; no escribas sus valores en este README ni los subas al repositorio. La API recibe la contraseña raíz como `DATABASE_BOOTSTRAP_PASSWORD` para poder crear/aplicar la base y las migraciones en el primer arranque. El Dockerfile de la API copia tanto el SQL inicial como `database/migrations`, que la aplicación necesita en tiempo de ejecución.

La secuencia usada para prepararlo fue:

1. Preparar en `.env` contraseñas Docker aleatorias y diferentes, junto con una clave `JWT_SECRET`; el archivo `.env` se mantiene local y está excluido del repositorio.
2. Construir y arrancar los servicios desde la raíz del proyecto:

   ```powershell
   docker compose --env-file .env -f compose.yaml up -d --build
   docker compose --env-file .env -f compose.yaml ps
   ```

3. Esperar a que `db`, `api` y `web` figuren como saludables. Consultar la aplicación en `http://localhost:5173/` y el endpoint `http://localhost:5173/health`; este último debe responder `{"status":"ok","database":"connected"}`.
4. Si un servicio no arranca, revisar sus registros con `docker compose --env-file .env -f compose.yaml logs --tail=100 db api web`.

Durante la primera construcción se corrigieron dos causas que impedían iniciar la API: se añadieron las variables de acceso administrativo de MariaDB al servicio `api` y se incluyó `database/migrations` en su imagen. Después se reconstruyeron las imágenes y se confirmó localmente que los tres servicios quedaran saludables y que la web y su endpoint de estado respondieran HTTP 200.

Esta prueba comprueba construcción, arranque y conexión API–base en el entorno local. No comprueba recuperación ante pérdida del volumen, persistencia tras recrear servicios, correo SMTP ni acceso público. `docker compose down` detiene y elimina los contenedores, conservando `database_data`; **no uses `docker compose down -v` si deseas conservar la base**.

El frontend y la API pueden ejecutarse de manera conjunta desde la raíz del proyecto o en terminales independientes:

## Ejecución con npm

### Opción 1: Ejecución integrada (recomendada)

Desde la raíz del repositorio (`acadex/`):

```powershell
npm run dev
```

Este comando inicia simultáneamente la API REST en `http://localhost:3000/api/v1` y el frontend Vite en `http://localhost:5173`.

### Opción 2: Ejecución en terminales independientes

Terminal 1 — API de MariaDB:

```powershell
npm run dev:api
```

Terminal 2 — Frontend web:

```powershell
npm run dev:web
```

## Inspección de la base de datos

Para inspeccionar las tablas y ver en consola los últimos registros modificados por las operaciones CRUD:

```powershell
npm run db:inspect
```

Configura `.env` desde `.env.example` antes de iniciar. En el primer arranque, la API creará la base de datos y cargará el esquema automáticamente; luego verifica `http://localhost:3000/health`.

Validaciones locales:

```powershell
npm run build:web

npm run typecheck:api
npm --prefix api run validate
```

Si el acceso administrativo no carga, confirma que `/health` responda con
`database: connected`, que la API siga ejecutándose y que `CORS_ORIGIN` incluya
el mismo origen del navegador (`localhost:5173` o `127.0.0.1:5173`). Ante una
excepción de renderizado, Acadex muestra una pantalla de recuperación y registra
el detalle técnico en la consola del navegador.

## Dependencias locales

El repositorio tiene dos carpetas `node_modules` porque contiene dos paquetes independientes:

- `api/node_modules`: herramientas del contrato y mock de la API, como Prism, ESLint y YAML.
- `web/node_modules`: React, Vite, TypeScript, React DOM y los componentes visuales.

Cada carpeta tiene su propio `package.json` y `package-lock.json`. Esta organización es intencional para mantener aisladas las dependencias del frontend y del backend/API.

No se deben subir al repositorio:

- `api/node_modules/`
- `web/node_modules/`
- `web/dist/`

Todos están excluidos mediante `.gitignore`. Para instalar las dependencias se ejecuta `npm install` dentro de `api` y de `web` por separado.
