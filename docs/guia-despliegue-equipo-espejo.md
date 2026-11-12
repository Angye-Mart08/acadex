# Guía de instalación y publicación temporal de Acadex

**Proyecto:** Acadex — Sistema de Gestión de Tutorías y Monitorías Académicas  
**Entorno de referencia:** Windows 10/11, PowerShell, Git y Docker Desktop  
**Publicación de demostración:** Cloudflare Quick Tunnel (URL temporal)

Esta guía permite preparar Acadex en un computador distinto al de desarrollo, ejecutar el proyecto con Docker Compose y, si se necesita una demostración remota, abrir un túnel temporal. La URL temporal no es un despliegue permanente ni convierte el equipo en un servidor de producción.

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

Usa la rama que el equipo acordó para la entrega. Si la versión acordada está en `nicolas`, cámbiate a ella con:

```powershell
git switch nicolas
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
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Compose construye frontend y API, descarga MariaDB, crea la red/volumen y arranca los servicios en el orden indicado por sus health checks. Los servicios esperados son `db`, `api` y `web`; espera a que aparezcan como `healthy`.

Abre:

- Aplicación: <http://localhost:5173>
- Health check de frontend/API: <http://localhost:5173/health>

El health check debe responder correctamente y confirmar conexión con MariaDB. Para revisar los registros:

```powershell
docker compose logs --tail=100 db api web
docker compose logs -f api
```

El SQL inicial se carga solo cuando se crea por primera vez el volumen `database_data`. Los cambios posteriores al archivo SQL no reemplazan la base existente; las migraciones se ejecutan por la API. No uses `docker compose down -v` para resolver errores: elimina el volumen y los datos locales.

### Revisar MariaDB

```powershell
docker compose exec db mariadb -u root -p
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

Primero confirma que `web` está saludable y encuentra la red Compose:

```powershell
docker network ls --filter "label=com.docker.compose.project"
```

El nombre normalmente es `acadex_default`, pero usa el nombre que aparece en tu equipo. Reemplázalo en `{red_de_acadex}` y ejecuta el túnel en primer plano:

```powershell
docker run --rm --name acadex-cloudflared --network {red_de_acadex} cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://web:80
```

En la salida busca `Your quick Tunnel has been created!` y copia la dirección HTTPS `https://...trycloudflare.com`. Déjala abierta mientras dure la demostración; para cerrar el túnel, presiona `Ctrl+C` en esa terminal.

Prueba la URL desde otro dispositivo y, preferiblemente, usando datos móviles. Un Quick Tunnel expone el inicio de sesión a Internet: úsalo solo para una demostración autorizada con cuentas y datos de prueba. No publiques credenciales, datos personales ni el puerto de MariaDB. No lo presentes como disponibilidad o despliegue permanente.

La aplicación usa su API en el mismo origen (`/api/v1`), así que el túnel apunta al servicio `web`; Nginx reenvía `/api/` al contenedor `api` dentro de la red Docker.

## 7. Comandos de operación

| Acción | Comando |
| --- | --- |
| Iniciar servicios detenidos | `docker compose start` |
| Reconstruir y actualizar servicios | `docker compose up -d --build` |
| Ver estado | `docker compose ps` |
| Ver registros | `docker compose logs --tail=100` |
| Ver registros en vivo | `docker compose logs -f` |
| Reiniciar servicios | `docker compose restart` |
| Detener servicios conservando datos | `docker compose stop` |
| Detener y retirar contenedores conservando volúmenes | `docker compose down` |

No agregues `-v` a `docker compose down` salvo que quieras borrar deliberadamente la base de datos local.

## 8. Problemas frecuentes

### `docker` no se reconoce o el engine no responde

Abre Docker Desktop, espera a que indique que el motor está listo y abre una nueva terminal de PowerShell. Comprueba `docker info` antes de repetir `docker compose`.

### `Access denied for user root`

Confirma que usas el valor configurado en `DOCKER_DATABASE_ROOT_PASSWORD`. Cambiar `.env` no cambia las contraseñas de un volumen MariaDB ya inicializado. No elimines el volumen como solución rápida.

### No hay tablas o datos

Revisa `docker compose logs db` y confirma que el SQL se importó al crear el volumen inicial. El script de inicialización no se vuelve a ejecutar automáticamente en volúmenes existentes.

### Cloudflare no entrega una URL

Comprueba que Docker tenga Internet, que `web` esté saludable y que `acadex-cloudflared` use la misma red Docker que `web`. Revisa la salida de la terminal donde se ejecuta el túnel.

## 9. Seguridad y continuidad

- Quick Tunnel sirve para pruebas; para operación permanente usa un túnel administrado o un servidor con dominio controlado.
- No publiques directamente los puertos `3306` de MariaDB ni `3000` de la API.
- Cambia las cuentas demo antes de exponer una instancia a usuarios externos y usa datos ficticios para aceptación.
- Guarda respaldos cifrados de MariaDB y de los adjuntos en `api/uploads/tutor-reports/`.
- La configuración de producción con VPS y Caddy está en la sección [Despliegue público](../README.md#despliegue-público-vps--docker-compose--caddy) del README principal; requiere dominio/DNS, secretos independientes y SMTP configurado.

## 10. Lista de comprobación del equipo espejo

- [ ] Git instalado y rama correcta seleccionada.
- [ ] Docker Desktop abierto; `docker info` responde.
- [ ] `.env` local configurado y excluido de Git.
- [ ] `docker compose config --quiet` finaliza sin errores.
- [ ] `db`, `api` y `web` quedan saludables.
- [ ] `http://localhost:5173/` y `/health` responden correctamente.
- [ ] Inicio de sesión y operaciones acordadas comprobadas con cuentas de prueba.
- [ ] Persistencia y adjuntos comprobados según el alcance.
- [ ] Si se usa Quick Tunnel: URL probada desde una red externa y túnel detenido al acabar.

**Repositorio de referencia:** <https://github.com/Angye-Mart08/acadex>
