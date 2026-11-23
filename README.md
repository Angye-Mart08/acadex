# Acadex — Gestión de tutorías y monitorías

Acadex permite a estudiantes, tutores, monitores y administradores de Unitrópico gestionar solicitudes, disponibilidad, sesiones y seguimiento de tutorías y monitorías.

**Problema:** En Casanare, la Universidad Unitrópico necesita coordinar el acompañamiento académico entre estudiantes, tutores y monitores. Las solicitudes, la disponibilidad, las sesiones y su seguimiento requieren información compartida entre esos roles.

**Ruta y equipo:** Ruta de profundización F · Equipo/Grupo 2.

**Prototipo:** ahora no hay una URL pública activa o permanente. Para obtener una URL temporal de demostración, [inicia Cloudflare Quick Tunnel](./docs/guia-despliegue-equipo-espejo.md#6-publicación-temporal-para-demostración-con-cloudflare); el túnel genera una dirección distinta cada vez.

## Equipo

| Integrante | Rol | GitHub |
| --- | --- | --- |
| Angye Katherine Martínez Cucunubá | Líder técnico | [@Angye-Mart08](https://github.com/Angye-Mart08) |
| Brayham Orlando Lindarte Fuentes | Backend, datos, DevOps y calidad | [@BrayhamLF](https://github.com/BrayhamLF) |
| Nicolas Parra Franco | Frontend | [@NikWolf24](https://github.com/NikWolf24) |

## Cómo ejecutarlo en local

### Requisitos

- Windows 10/11 y PowerShell para seguir estos comandos.
- Git para Windows.
- Docker Desktop abierto, con Docker Compose v2 y el motor en ejecución.
- Node.js 24 solo si también se ejecutarán los comandos de desarrollo con npm; Docker ya incluye Node.js para los contenedores.

Si aún no tienes Git o Docker Desktop, sigue la [sección 2 de la guía del equipo espejo](./docs/guia-despliegue-equipo-espejo.md#2-instalar-y-comprobar-las-herramientas), que explica su instalación y cómo comprobar Docker. La versión de Node para desarrollo está fijada en [`.nvmrc`](./.nvmrc).

### Pasos

1. Comprueba que Git y Docker estén disponibles y que Docker Desktop haya iniciado:

   ```powershell
   git --version
   docker --version
   docker compose version
   docker info
   ```

2. Clona el repositorio y entra a la carpeta:

   ```powershell
   Set-Location $HOME
   git clone https://github.com/Angye-Mart08/acadex.git
   Set-Location .\acadex
   ```

3. Crea el archivo local de configuración y ábrelo. No reemplaces un `.env` que ya exista:

   ```powershell
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   notepad .env
   ```

   Asigna valores propios y distintos a `DOCKER_DATABASE_PASSWORD`, `DOCKER_DATABASE_ROOT_PASSWORD` y `JWT_SECRET`. El secreto JWT debe tener al menos 32 caracteres. Ejecuta este comando por cada valor para generar una cadena aleatoria de 64 caracteres en PowerShell y copia cada salida en la variable correspondiente:

   ```powershell
   [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
   ```

   Guarda `.env`. No lo publiques ni lo subas al repositorio.

4. Comprueba la configuración de Compose:

   ```powershell
   docker compose -p acadex config --quiet
   ```

5. Construye e inicia la aplicación; Compose espera a que los servicios estén saludables:

   ```powershell
   docker compose -p acadex up -d --build --wait --wait-timeout 180
   ```

6. Revisa el estado y abre la aplicación:

   ```powershell
   docker compose -p acadex ps
   ```

   Frontend: <http://localhost:5173> · Salud: <http://localhost:5173/health>.

7. Para una demostración fuera de la red local, abre otra ventana de PowerShell y ejecuta Quick Tunnel:

   ```powershell
   Set-Location "$HOME\acadex"
   docker run --rm --name acadex-cloudflared --network acadex_default --dns 1.1.1.1 --dns 1.0.0.1 cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://web:80
   ```

   Copia la dirección `https://…trycloudflare.com` que aparece en esa terminal. Compruébala desde un dispositivo conectado a otra red y compártela mientras el túnel esté activo. La dirección cambia al reiniciar el túnel.

8. Al terminar, detén el Quick Tunnel con `Ctrl+C`. Para detener Acadex y conservar la base de datos:

   ```powershell
   docker compose -p acadex down
   ```

   `docker compose -p acadex down -v` también elimina el volumen y los datos de MariaDB.

La [guía completa del equipo espejo](./docs/guia-despliegue-equipo-espejo.md) explica la instalación en otra máquina, los problemas frecuentes y la publicación temporal. Para ejecutar herramientas npm, consulta [desarrollo local](./docs/desarrollo-local.md).

## Integración continua y actualización de la demostración

Cada Pull Request y cada cambio en `main` activa GitHub Actions. El flujo valida el contrato OpenAPI y los tipos de la API, revisa dependencias de producción, compila el frontend y construye Compose para comprobar que los servicios inician y responden a su healthcheck. Si una comprobación falla, el flujo queda fallido.

Después de integrar un cambio con el flujo en verde, actualiza la máquina de demostración con `git pull --ff-only` y ejecuta de nuevo el paso 5. Luego inicia Quick Tunnel para obtener una URL temporal nueva. Esta automatización valida el despliegue Compose, pero no publica por sí sola una dirección pública: Quick Tunnel se ejecuta en la máquina que mantiene la demostración activa. La persona administradora del repositorio debe configurar los trabajos como comprobaciones requeridas en las reglas de `main`.

Consulta [Integración continua](./docs/integracion-continua.md) para ver los trabajos, su alcance y sus límites.

## Estado del proyecto

La evidencia académica disponible corresponde a una revisión de Entrega 4 fechada el 12 de noviembre de 2026. La entrega vigente debe confirmarse con el equipo docente.

| Área | Estado documentado |
| --- | --- |
| Aplicación | Frontend React/TypeScript, API REST Node.js/Express y base de datos MariaDB. |
| Funciones | Acceso por roles; gestión de solicitudes, disponibilidad, sesiones, espacios, usuarios y seguimiento académico. |
| Ejecución | Docker Compose define MariaDB, API y frontend, con volumen de base de datos y healthchecks. |
| Demostración remota | Disponible mediante Cloudflare Quick Tunnel mientras la máquina y el túnel sigan activos; no hay URL permanente. |
| Integración continua | Configurada para validar API, frontend y arranque/salud de Compose; requiere ejecución en GitHub y protección de rama para bloquear fusiones. |
| Pruebas funcionales | Se documentan verificaciones históricas; el flujo actual todavía no incluye pruebas automatizadas de los recorridos de usuario. |

## Arquitectura

React y TypeScript sirven la interfaz. Nginx entrega el frontend y reenvía `/api` a la API REST Node.js/Express, que se conecta a MariaDB por la red interna de Compose. El servicio `db` usa un volumen con nombre para conservar la información. Consulta el [diagrama de arquitectura](./docs/diagramas/README.md) y el [modelo de datos](./docs/modelo-datos.md).

## Documentación

- [Índice de documentación](./docs/README.md)
- [Guía del equipo espejo: instalar, ejecutar y crear Quick Tunnel](./docs/guia-despliegue-equipo-espejo.md)
- [Desarrollo local y comandos npm](./docs/desarrollo-local.md)
- [Integración continua](./docs/integracion-continua.md)
- [Accesibilidad](./docs/accesibilidad.md)
- [Contrato y guía de la API](./api/README_API.md) · [OpenAPI](./api/openapi.yaml)
- [Decisiones de arquitectura](./docs/decisiones.md)
- [Bitácora del proyecto](./docs/BITACORA_PROYECTO.md)
- [Hallazgos del equipo espejo y correcciones](./docs/hallazgos-equipo-espejo.md)
- [Revisión histórica de Entrega 4](./docs/evidencias/entrega-4-revision-2026-11-12.md)
- [Informes históricos de Lighthouse](./docs/evidencias/lighthouse/README.md)

Las cuentas de demostración se entregan por un canal seguro; el repositorio no publica contraseñas.
