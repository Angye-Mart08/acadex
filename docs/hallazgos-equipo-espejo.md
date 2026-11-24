# Seguimiento de hallazgos del equipo espejo

Este documento registra las correcciones solicitadas que se trabajan en esta rama. El estado indica el trabajo en el repositorio local; la publicación e integración dependen del flujo de revisión del equipo.

## [MENOR] El README es muy extenso y no declara la versión de Node.js

**Estado:** respuesta JSON implementada y tipada; verificación HTTP en ejecución pendiente.

- Se reorganizó el README con descripción y problema, ruta/equipo, estado del prototipo, instrucciones numeradas para Docker Compose y Quick Tunnel, versión de Node.js, estado del proyecto, arquitectura e índice documental. La URL Quick Tunnel se identifica como temporal y no activa en el repositorio.
- Las instrucciones detalladas se organizaron en `desarrollo-local.md` y `guia-despliegue-equipo-espejo.md`; el procedimiento VPS no forma parte de las instrucciones vigentes. La revisión de Entrega 4 se conserva como evidencia histórica fechada.
- Se declaró Node.js 24 en `.nvmrc`, en `engines` de los paquetes raíz, API y web, y en los metadatos raíz de los lockfiles.
- La guía de API enlaza al requisito de runtime y el índice de documentación organiza los recursos por propósito.
- El listado de credenciales de demostración salió del README y no se trasladó a otro documento. Esto solo reduce la exposición en el README actual; no completa el hallazgo de credenciales.

## [BLOQUEANTE] Credenciales de cuentas de demostración publicadas y sembradas en texto plano

**Estado:** pendiente de coordinación con el líder técnico.

La limpieza del README retiró el bloque de acceso publicado. Siguen pendientes la corrección del SQL semilla, la rotación de cuentas usadas, la configuración de producción en instancias expuestas y la limpieza coordinada del historial público.

## [MENOR] Las rutas inexistentes responden con HTML en lugar del JSON de la API

**Estado:** corregido en el repositorio local.

Se añadió un manejador final al router de API. Las rutas y métodos no
reconocidos bajo `/api/v1` responden `404` y JSON con `status`, `code`,
`message`, `path`, `timestamp` y `requestId`. El formato quedó documentado en
`api/README_API.md`, junto con un comando de comprobación manual. La respuesta
conserva la ruta original completa y excluye la cadena de consulta.
El API no estaba levantada en el entorno de cierre, así que queda pendiente ejecutar el `curl.exe` documentado contra una instancia activa.

## [MENOR] Saltos en los encabezados, contraste insuficiente y etiqueta «Estado» partida

**Estado:** cambios de interfaz implementados y compilación verificada; medición en despliegue pendiente.

- Se corrigió la secuencia de encabezados y se asociaron nombres accesibles explícitos a los controles de filtros que no tenían una etiqueta.
- Se aumentó el contraste de varios textos secundarios y placeholders, y se ajustó la barra de filtros de sesiones para que se adapte al ancho disponible sin partir «Estado».
- El buscador de sesiones usa un placeholder corto y conserva una descripción accesible más completa para lectores de pantalla.
- Los criterios y el procedimiento de revisión manual están en `accesibilidad.md`.
- `npm run build` en `web/` terminó correctamente. La puntuación de accesibilidad de Lighthouse debe repetirse sobre la URL pública después del despliegue; esta corrección local no acredita por sí sola el umbral de 90 en producción.

## [IMPORTANTE] El chequeo de tipos está desactivado en los archivos del backend

**Estado:** chequeo activo en los seis módulos y flujo de CI preparado en el repositorio local.

- Se retiró `@ts-nocheck` de `auth.ts`, `server.ts`, `admin.ts`, `data.ts`, `notifications.ts` y `email.ts`.
- Se incorporaron los tipos de Express, CORS y jsonwebtoken, tipos de consultas MySQL, el contexto de sesión/solicitud y manejo de errores `unknown`.
- Se agregó `.github/workflows/ci.yml` para validar OpenAPI y tipos de API, compilar la web y construir/esperar la salud de Compose en cada Pull Request y al actualizar `main`. El job de Compose no publica ni mantiene el Quick Tunnel.
- `npm run typecheck` desde `api/` pasó localmente. El workflow aún debe ejecutarse en GitHub después de integrar los cambios; la protección de la rama para exigir el estado exitoso se configura en GitHub.

## [IMPORTANTE] Sin integración continua ni pruebas automatizadas

**Estado:** CI de contrato, tipos y compilación preparada; pruebas funcionales automatizadas pendientes.

El workflow agregado detiene el job que falla y entrega un estado que puede configurarse como obligatorio en GitHub. Todavía no incluye pruebas automatizadas de login, creación de solicitudes ni permisos por rol. Consulta [Integración continua](./integracion-continua.md) para conocer sus verificaciones y limitaciones actuales.

## [IMPORTANTE] Dependencias de producción con vulnerabilidades conocidas

**Estado:** avisos de producción corregidos localmente y auditoría agregada al CI.

- Se actualizaron los lockfiles de API y web. `npm audit --omit=dev` en la API reportó cero vulnerabilidades; `npm audit fix` en web terminó con cero vulnerabilidades.
- Se agregó `npm audit --omit=dev` a ambos trabajos de CI para detener una integración si reaparecen avisos en dependencias de producción.
- La auditoría completa de API todavía reporta 8 avisos de desarrollo (1 moderado y 7 altos) en la cadena de `@stoplight/prism-cli` (`@faker-js/faker`, `lodash` y `uuid`). El fix propuesto por npm requiere `--force` y bajaría Prism a `5.6.0`; queda como tarea independiente porque modifica el tooling de contrato.
