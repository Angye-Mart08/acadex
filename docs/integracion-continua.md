# Integración continua

Acadex ejecuta validaciones en GitHub Actions mediante `.github/workflows/ci.yml`.
El flujo se activa al abrir o actualizar un Pull Request y al publicar cambios en `main`.

## Comprobaciones automáticas

| Trabajo | Comprobaciones | Cuándo falla |
| --- | --- | --- |
| API | Instalación reproducible, auditoría de dependencias de producción, validación del contrato OpenAPI y `tsc --noEmit`. | El job queda en estado fallido si una validación devuelve un código distinto de cero. |
| Frontend | Instalación reproducible, auditoría de dependencias de producción y compilación con TypeScript y Vite. | El job queda en estado fallido si la auditoría, el chequeo de tipos o la compilación fallan. |
| Compose | Validación de `compose.yaml`, construcción de imágenes, espera de healthchecks y solicitud HTTP a `/health`. Usa contraseñas desechables definidas solo en el job. | El job falla si Compose no puede construir o iniciar un servicio, si un healthcheck falla o si `/health` no responde correctamente. |

Los comandos equivalentes, ejecutados desde la raíz, son:

```powershell
npm --prefix api ci
npm --prefix api audit --omit=dev
npm --prefix api run validate
npm --prefix api run typecheck
npm --prefix web ci
npm --prefix web audit --omit=dev
npm --prefix web run build
docker compose -p acadex-ci config --quiet
docker compose -p acadex-ci up -d --build --wait --wait-timeout 180
curl --fail --show-error http://localhost:5173/health
docker compose -p acadex-ci down
```

Para repetir localmente el trabajo de Compose, configura primero en el entorno las variables `DOCKER_DATABASE_PASSWORD`, `DOCKER_DATABASE_ROOT_PASSWORD`, `JWT_SECRET`, `DOCKER_WEB_PORT`, `DOCKER_NODE_ENV` y `DOCKER_CORS_ORIGIN` con valores de prueba. El workflow ya las define para su entorno efímero.

## Reglas de integración

Para que GitHub impida fusionar un Pull Request cuando el flujo falla, la persona administradora del repositorio debe marcar los trabajos de API, frontend y Compose como comprobaciones obligatorias en las reglas de protección de `main`. El workflow por sí mismo registra los resultados, pero no cambia la configuración del repositorio.

## Alcance actual

El flujo todavía no ejecuta pruebas funcionales automatizadas de autenticación, creación de solicitudes ni autorización por rol. El trabajo de Compose es una prueba de despliegue en un runner temporal; no deja una instancia ni publica una URL. Después de integrar cambios con el flujo en verde, la máquina de demostración actualiza `main`, reconstruye Compose y abre el Quick Tunnel según la [guía del equipo espejo](./guia-despliegue-equipo-espejo.md). Ese túnel genera una URL temporal y depende de que la máquina permanezca encendida.
