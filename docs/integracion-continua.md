# Integración continua

Acadex ejecuta validaciones en GitHub Actions mediante `.github/workflows/ci.yml`.
El flujo se activa al abrir o actualizar un Pull Request y al publicar cambios en `main`.

## Comprobaciones automáticas

| Trabajo | Comprobaciones | Cuándo falla |
| --- | --- | --- |
| API | Instalación reproducible, auditoría de dependencias de producción, validación del contrato OpenAPI y `tsc --noEmit`. | El job queda en estado fallido si una validación devuelve un código distinto de cero. |
| Frontend | Instalación reproducible, auditoría de dependencias de producción y compilación con TypeScript y Vite. | El job queda en estado fallido si la auditoría, el chequeo de tipos o la compilación fallan. |
| Compose | Construcción de imágenes, healthchecks y comprobaciones HTTP de cabeceras, CORS, 404 JSON, login inválido y creación de solicitudes sin sesión. Usa credenciales desechables del job. | El job falla si un servicio no inicia o si alguna respuesta HTTP difiere de la esperada. |

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
curl.exe --fail --show-error http://localhost:5173/health
node api/scripts/check-http.mjs http://localhost:5173
docker compose -p acadex-ci down
```

Para repetir localmente el trabajo de Compose, configura primero en el entorno las variables `DOCKER_DATABASE_PASSWORD`, `DOCKER_DATABASE_ROOT_PASSWORD`, `JWT_SECRET`, `DOCKER_WEB_PORT`, `DOCKER_NODE_ENV` y `DOCKER_CORS_ORIGIN` con valores de prueba. El workflow ya las define para su entorno efímero.

## Reglas de integración

Para que GitHub impida fusionar un Pull Request cuando el flujo falla, la persona administradora del repositorio debe marcar los trabajos de API, frontend y Compose como comprobaciones obligatorias en las reglas de protección de `main`. El workflow por sí mismo registra los resultados, pero no cambia la configuración del repositorio.

## Alcance actual

El trabajo de Compose se ejecuta en un runner temporal. Allí se asigna una clave aleatoria a un perfil de estudiante de la semilla y se comprueba que puede iniciar sesión, que recibe 403 al consultar el panel de administración y que puede crear una solicitud pendiente. Esta prueba escribe en la base desechable del runner. Para comprobar las cabeceras de producción, ejecuta `check-http.mjs` con el origen HTTPS configurado en `PUBLIC_ORIGIN`. El script también verifica HSTS cuando recibe una URL HTTPS.
