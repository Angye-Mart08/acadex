# Guía de instalación y publicación temporal de Acadex

**Proyecto:** Acadex — Sistema de Gestión de Tutorías y Monitorías Académicas
**Entorno de referencia:** Windows 10/11, PowerShell, Git y Docker Desktop
**Publicación de demostración:** Cloudflare Quick Tunnel (URL temporal)

Esta guía permite preparar Acadex en un computador distinto al de desarrollo, ejecutar el proyecto con Docker Compose y, si se necesita una demostración remota, abrir un túnel temporal. La URL temporal no es un despliegue permanente ni convierte el equipo en un servidor de producción. El flujo de [integración continua](./integracion-continua.md) construye Compose y comprueba su salud antes de la demostración; no ejecuta ni mantiene el túnel.

## 1. Requisitos del equipo

- Windows 10/11 de 64 bits, virtualización habilitada y WSL 2.
- Se recomiendan 8 GB de RAM y 10 GB libres.
- Git para Windows y Docker Desktop con Docker Compose.
- Acceso a Internet para descargar el repositorio e imágenes.

## 2. Instalar y comprobar las herramientas

Instala Git desde [git-scm.com](https://git-scm.com/downloads) y Docker Desktop desde [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/). Durante la instalación de Docker, habilita el motor WSL 2 si el instalador lo solicita y reinicia Windows si es necesario. Abre Docker Desktop y espera hasta que indique que el motor está en ejecución.

En una ventana nueva de PowerShell comprueba:

```powershell
git --version
docker --version
docker compose version
docker info
```

Los cuatro comandos deben finalizar sin errores; `docker info` debe mostrar información del servidor/engine, no solo la versión del cliente.

## 3. Descargar el código

Clona el repositorio público y entra en la carpeta:

```powershell
Set-Location $HOME
git clone https://github.com/Angye-Mart08/acadex.git
Set-Location .\acadex
git branch --all
```

La rama predeterminada `main` es la referencia para una demostración, salvo que el equipo docente haya indicado otra rama o una versión concreta. Antes de levantarla, comprueba en GitHub Actions que el último cambio integrado tenga los trabajos de CI aprobados. Actualiza `main` con:

```powershell
git switch main
git pull --ff-only
```

Comprueba que estén `compose.yaml`, `api\Dockerfile`, `web\Dockerfile`, `.env.example`, `api\`, `web\` y `database\`. Si Git informa que no existe la rama, no sustituyas silenciosamente por otra: confirma con el equipo cuál contiene la versión que se debe evaluar.

## 4. Preparar las variables locales

No sobrescribas un `.env` existente. Si todavía no existe, créalo desde la plantilla:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
code .env
```

Para Compose local, completa estas variables con valores propios de esta instalación:

| Variable | Uso |
| --- | --- |
| `DOCKER_DATABASE_PASSWORD` | Contraseña local del usuario de aplicación de MariaDB. |
| `DOCKER_DATABASE_ROOT_PASSWORD` | Contraseña local del usuario administrador de MariaDB. |
| `JWT_SECRET` | Secreto aleatorio de al menos 32 caracteres. |
| `DOCKER_WEB_PORT` | Puerto del navegador; el ejemplo del repositorio usa `5173`. |
| `DOCKER_NODE_ENV` | `development` para datos de demostración locales. |
| `DOCKER_CORS_ORIGIN` | Origen local, normalmente `http://localhost:5173`. |

Puedes generar un secreto para `JWT_SECRET` desde PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Mantén `.env` privado. Está excluido de Git; no compartas su contenido en capturas, chats ni commits. El `.env` de Compose es independiente de la conexión a una instalación local de MariaDB.

## 5. Construir e iniciar Acadex localmente

Desde la raíz del repositorio y con Docker Desktop ejecutándose:

```powershell
docker compose -p acadex config --quiet
docker compose -p acadex up -d --build --wait --wait-timeout 180
docker compose -p acadex ps
```

El argumento `-p acadex` fija el nombre del proyecto Compose, aunque la carpeta clonada tenga otro nombre. Los contenedores se llamarán `acadex-db-1`, `acadex-api-1` y `acadex-web-1`; la red será `acadex_default` y el volumen `acadex_database_data`. Usa `-p acadex` también en los comandos siguientes para evitar crear accidentalmente una segunda pila con otra red y otro volumen.

Compose construye frontend y API, descarga MariaDB, crea la red/volumen y arranca los servicios en el orden indicado por sus health checks. `--wait` espera a que los servicios estén saludables. Si Docker Compose no reconoce `--wait`, actualiza Docker Desktop/Compose v2 y vuelve a ejecutar el comando.

Abre:

- Aplicación: <http://localhost:5173>
- Health check de frontend/API: <http://localhost:5173/health>

El health check debe responder correctamente y confirmar conexión con MariaDB. Para revisar los registros:

```powershell
docker compose -p acadex logs --tail=100 db api web
docker compose -p acadex logs -f api
```

El SQL inicial se carga solo cuando se crea por primera vez el volumen `database_data`. Los cambios posteriores al archivo SQL no reemplazan la base existente; las migraciones se ejecutan por la API. No uses `docker compose down -v` para resolver errores: elimina el volumen y los datos locales.

### Actualizar los datos en un volumen existente

Para aplicar un volcado sobre una base ya inicializada, primero genera un respaldo fechado en `database/backups/` y luego importa el archivo revisado del proyecto. La carpeta de respaldos está excluida de Git porque los archivos pueden contener datos personales y hashes de credenciales.

```powershell
New-Item -ItemType Directory -Path 'database/backups' -Force | Out-Null
$dbBackupFile = Join-Path 'database/backups' ('pre-import-{0}.sql' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$dbBackup = docker compose -p acadex exec -T db sh -c 'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" mariadb-dump --single-transaction --routines --triggers --hex-blob gestion_monitorias_tutorias'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo respaldar MariaDB.' }
$dbBackup | Set-Content -LiteralPath $dbBackupFile -Encoding utf8

$dbSql = Get-Content -Raw -Encoding utf8 'database/gestion_monitorias_tutorias.sql'
$dbSql | docker compose -p acadex exec -T db sh -c 'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" mariadb -uroot'
if ($LASTEXITCODE -ne 0) { throw 'Falló la importación; conserva el respaldo y revisa los logs.' }

docker compose -p acadex up -d --build --wait --wait-timeout 180
docker compose -p acadex ps
docker compose -p acadex exec -T web wget -qO- http://127.0.0.1/health
```

El volcado del proyecto usa nombres de tabla con la capitalización que espera la API en Linux. Sus sentencias `REPLACE INTO` sustituyen filas que colisionen con claves primarias o únicas y conservan las que no aparecen en el archivo; revisa el contenido antes de importar. Las migraciones incluidas se aplican al arrancar la API. En la [guía de base de datos](../database/README.md) se describen el esquema y la integración de informes de monitoría.

### Revisar MariaDB

```powershell
docker compose -p acadex exec db mariadb -u root -p
```

Introduce la contraseña `DOCKER_DATABASE_ROOT_PASSWORD` configurada en tu `.env`. Ya en la consola:

```sql
USE gestion_monitorias_tutorias;
SHOW TABLES;
SELECT COUNT(*) AS solicitudes FROM Solicitud;
SELECT COUNT(*) AS sesiones FROM Sesion;
EXIT;
```

Que un contenedor figure saludable no reemplaza la comprobación de tablas, relaciones y flujos de aplicación.

## 6. Publicación temporal para demostración con Cloudflare

Cloudflare Quick Tunnel crea una URL aleatoria de `trycloudflare.com`, sin comprar dominio ni abrir puertos del router. Es temporal, puede cambiar cada vez y depende de que el computador, Docker Desktop e Internet permanezcan activos.

Antes de abrir el túnel, usa únicamente cuentas de prueba y datos ficticios. La URL será pública mientras el túnel esté activo. No expongas datos personales, credenciales reales ni los puertos `3306` o `3000`.

Si quedó un Quick Tunnel anterior con el mismo nombre, detenlo antes de crear otro. Omite este comando si no hay un contenedor anterior:

```powershell
docker stop acadex-cloudflared
```

Con la pila iniciada como proyecto `acadex`, la red se llama `acadex_default`. Puedes localizarla así:

```powershell
docker network ls --filter "label=com.docker.compose.project=acadex"
```

Abre otra ventana de PowerShell, entra a la carpeta del repositorio y ejecuta el túnel en primer plano. Los servidores DNS explícitos evitan el error de resolución `dial tcp 0.0.0.0:443: connect: connection refused` observado en Docker Desktop. Si la red institucional bloquea `1.1.1.1` o `1.0.0.1`, reemplázalos por los resolvers aprobados por el administrador de esa red.

```powershell
docker run --rm --name acadex-cloudflared --network acadex_default --dns 1.1.1.1 --dns 1.0.0.1 cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://web:80
```

En la salida busca `Your quick Tunnel has been created!` y copia la dirección HTTPS `https://...trycloudflare.com`. Déjala abierta mientras dure la demostración. Para cerrar el túnel, presiona `Ctrl+C` en esa terminal; también puedes usar `docker stop acadex-cloudflared` desde otra ventana. Eso cierra solo el túnel; la pila `acadex` sigue ejecutándose.

Si la aplicación está en modo `production`, configura `DOCKER_CORS_ORIGIN` con el origen exacto que generó Quick Tunnel (por ejemplo, `https://nombre-aleatorio.trycloudflare.com`) en `.env` y recrea solo la API:

```powershell
code .env
docker compose -p acadex up -d --no-deps --force-recreate api
```

En el modo local `development` recomendado por esta guía no hace falta ese cambio. La aplicación consume la API en el mismo origen (`/api/v1`), así que el túnel siempre debe apuntar a `web:80`; Nginx reenvía `/api/` al contenedor `api` dentro de la red Docker.

Prueba la URL desde otro dispositivo y, preferiblemente, usando datos móviles. Quick Tunnel es temporal, no tiene garantía de disponibilidad y no sustituye un despliegue permanente con dominio propio.

## 7. Comandos de operación

| Acción | Comando |
| --- | --- |
| Iniciar servicios detenidos | `docker compose -p acadex start` |
| Reconstruir y actualizar servicios | `docker compose -p acadex up -d --build` |
| Ver estado | `docker compose -p acadex ps` |
| Ver registros | `docker compose -p acadex logs --tail=100` |
| Ver registros en vivo | `docker compose -p acadex logs -f` |
| Reiniciar servicios | `docker compose -p acadex restart` |
| Detener servicios conservando datos | `docker compose -p acadex stop` |
| Detener y retirar contenedores conservando volúmenes | `docker compose -p acadex down` |

No agregues `-v` a `docker compose -p acadex down` salvo que quieras borrar deliberadamente la base de datos local.

## 8. Problemas frecuentes

### `docker` no se reconoce o el engine no responde

Abre Docker Desktop, espera a que indique que el motor está listo y abre una nueva terminal de PowerShell. Comprueba `docker info` antes de repetir `docker compose`.

### `Access denied for user root`

Confirma que usas el valor configurado en `DOCKER_DATABASE_ROOT_PASSWORD`. Cambiar `.env` no cambia las contraseñas de un volumen MariaDB ya inicializado. No elimines el volumen como solución rápida.

### No hay tablas o datos

Revisa `docker compose logs db` y confirma que el SQL se importó al crear el volumen inicial. El script de inicialización no se vuelve a ejecutar automáticamente en volúmenes existentes.

### Cloudflare no entrega una URL

Comprueba que Docker tenga Internet, que `web` esté saludable y que `acadex-cloudflared` use la red `acadex_default`. Si aparece `dial tcp 0.0.0.0:443: connect: connection refused` al solicitar la URL, detén ese intento con `Ctrl+C` y ejecuta de nuevo el comando de la sección 6 con `--dns 1.1.1.1 --dns 1.0.0.1` (o con los DNS permitidos por tu red). Si el error persiste, la red puede bloquear el acceso saliente a Cloudflare; consulta al administrador de red.

## 9. Seguridad y continuidad

- Quick Tunnel sirve para pruebas; para operación permanente usa un túnel administrado o un servidor con dominio controlado.
- No publiques directamente los puertos `3306` de MariaDB ni `3000` de la API.
- Cambia las cuentas demo antes de exponer una instancia a usuarios externos y usa datos ficticios para aceptación.
- Guarda respaldos cifrados de MariaDB y de los adjuntos en `api/uploads/tutor-reports/`.
- Esta guía cubre el entorno local y la publicación temporal con Quick Tunnel. No presenta un procedimiento de VPS ni una URL pública permanente; acuerda con el líder técnico un entorno permanente antes de publicar datos reales.

## 10. Lista de comprobación del equipo espejo

- [ ] Git instalado y rama correcta seleccionada.
- [ ] Docker Desktop abierto; `docker info` responde.
- [ ] `.env` local configurado y excluido de Git.
- [ ] `docker compose -p acadex config --quiet` finaliza sin errores.
- [ ] `db`, `api` y `web` quedan saludables.
- [ ] `http://localhost:5173/` y `/health` responden correctamente.
- [ ] Inicio de sesión y operaciones acordadas comprobadas con cuentas de prueba.
- [ ] Persistencia y adjuntos comprobados según el alcance.
- [ ] Si se usa Quick Tunnel: el contenedor se llama `acadex-cloudflared`, usa `acadex_default`, la URL se prueba desde una red externa y el túnel se detiene al acabar.

**Repositorio de referencia:** <https://github.com/Angye-Mart08/acadex>
