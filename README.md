# Gestión de Tutorías y Monitorías — Unitrópico

Plataforma web para administrar el acompañamiento académico mediante tutorías y monitorías de la Universidad Internacional del Trópico Americano.

## Arquitectura

```text
React + TypeScript → API REST con Node.js + TypeScript → MariaDB
```

## Despliegue público (VPS + Docker Compose + Caddy)

La arquitectura de producción conserva React/Vite, Node/Express y MariaDB. Nginx sirve la SPA y enruta `/api`; Caddy publica un único origen HTTPS y obtiene/renueva TLS automáticamente. MariaDB y la API no exponen puertos públicos. Compose conserva la base de datos y los adjuntos de informes en volúmenes con nombre.

### Estado del despliegue

El repositorio incluye `compose.production.yaml`, `Caddyfile` y `.env.production.example` como preparación del despliegue. **La aplicación todavía no está publicada ni verificada en Internet**: para hacerlo se necesita contratar/usar una cuenta de alojamiento, disponer de un dominio y sus credenciales DNS/SSH. No inventamos URLs ni registramos resultados de pruebas que no se hayan ejecutado. La URL pública se añadirá aquí tras el despliegue y las verificaciones reales.

### Alojamiento y costo orientativo

La alternativa preparada es un VPS Ubuntu con Docker Compose para alojar frontend, API, MariaDB y Caddy en una misma máquina. Esto conserva exactamente las tecnologías del proyecto y permite una URL en un dominio propio. Como referencia vigente al 9 de noviembre de 2026, DigitalOcean publica un Droplet Basic de 2 vCPU y 4 GiB RAM por USD 24/mes; un dominio se paga aparte y los backups administrados añaden costo. Para producción real se deben configurar respaldos externos y aplicar actualizaciones del sistema. [Tarifas oficiales de Droplets](https://www.digitalocean.com/pricing/droplets).

Un VPS de un solo nodo es una opción económica para una primera publicación o piloto, pero no ofrece alta disponibilidad: si el host falla, toda la aplicación deja de responder. No usar datos personales reales hasta acordar la política de respaldo, acceso administrativo y tratamiento de datos institucionales.

### Preparación local y revisión de imágenes

Requiere Docker Engine/Compose v2 (Docker Desktop en Windows/Mac). Este entorno de trabajo no tiene el comando Docker instalado, por lo que aún no ha sido posible construir o comprobar las imágenes desde aquí. En un equipo que sí tenga Docker, desde la raíz del repositorio:

```bash
docker compose -f compose.yaml -f compose.production.yaml config
docker compose -f compose.yaml -f compose.production.yaml build
```

La primera orden necesita las variables obligatorias definidas; puede validarse con el archivo `.env` temporal de ensayo y valores de ejemplo no reales.

### Crear VPS, DNS y secretos

1. En la consola del proveedor, crea un VPS Ubuntu LTS de 2 vCPU y al menos 4 GiB RAM. Guarda su IPv4. No publiques el puerto `3306` ni el puerto `3000`.
2. Registra un dominio y crea un registro DNS `A` (por ejemplo `acadex.midominio.edu.co`) apuntando a la IPv4. Si el dominio tiene un `AAAA` que no apunta al VPS, corrígelo o elimínalo antes de pedir TLS.
3. Entra por SSH usando una llave privada protegida, actualiza el sistema e instala Docker Engine y el plugin Docker Compose según la documentación oficial de Docker para Ubuntu. Configura el firewall para permitir SSH desde una IP controlada y TCP `80`/`443` desde Internet.
4. Clona el repositorio en el VPS, entra a la carpeta `acadex` y crea el `.env` a partir de `.env.production.example`. Este archivo vive solo en el servidor y está excluido de Git.
5. Genera secretos diferentes y aleatorios (no reutilices contraseñas locales):

   ```bash
   openssl rand -hex 32
   ```

   Ejecuta el comando tres veces para `DOCKER_DATABASE_PASSWORD`, `DOCKER_DATABASE_ROOT_PASSWORD` y `JWT_SECRET`. Conserva los valores en un gestor de contraseñas. Completa además dominio, origen público y credenciales SMTP. No compartas secretos en issues, capturas ni este README.

6. La cuenta SMTP debe ser una credencial de aplicación autorizada para el correo remitente; la contraseña normal de Gmail no sirve. Si el correo es de Google Workspace, confirma la política con su administrador.

### Variables de producción

| Variable | Uso |
| --- | --- |
| `DOCKER_DATABASE_PASSWORD` | Contraseña de la cuenta limitada `tutorias_app` |
| `DOCKER_DATABASE_ROOT_PASSWORD` | Cuenta administrativa MariaDB usada al inicializar y aplicar migraciones |
| `JWT_SECRET` | Firma de tokens; mínimo 32 caracteres aleatorios |
| `ACADEX_DOMAIN` | Nombre DNS público del sitio |
| `ACADEX_TLS_EMAIL` | Contacto de Caddy para ACME/Let's Encrypt |
| `PUBLIC_ORIGIN` | Origen HTTPS exacto permitido por CORS; debe coincidir con el dominio |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Transporte SMTP (Gmail: `smtp.gmail.com`, `587`, `false` para STARTTLS) |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Credenciales y remitente de correo; mantener secretos solo en `.env` |

`DATABASE_HOST=db`, nombre de base, usuario de aplicación, puerto interno y prefijos API se definen dentro de Compose. No se debe definir `VITE_API_URL` como `localhost` en producción: la aplicación se sirve en el mismo origen y usa `/api/v1`.

### Arranque inicial

Desde la raíz del proyecto en el VPS:

```bash
docker compose --env-file .env -f compose.yaml -f compose.production.yaml config
docker compose --env-file .env -f compose.yaml -f compose.production.yaml up -d --build
docker compose --env-file .env -f compose.yaml -f compose.production.yaml ps
docker compose --env-file .env -f compose.yaml -f compose.production.yaml logs --tail=150 db api web caddy
```

MariaDB carga el SQL inicial una sola vez al crear su volumen. Luego la API aplica las migraciones `002`–`009` usando `DATABASE_BOOTSTRAP_USER=root` y el secreto raíz. Las credenciales de prueba del SQL son datos de desarrollo y no son aptas para una instancia pública; antes de abrir el sitio deben cambiarse las claves de todas las cuentas demo, retirar/inhabilitar cuentas de prueba y comprobar que las credenciales reales tengan hash bcrypt. El modo `production` rechaza claves heredadas en texto plano.

Caddy obtiene HTTPS cuando el DNS ya apunta al VPS, los puertos 80 y 443 están accesibles y ACME puede validar el dominio. Después, la URL será `https://` más `ACADEX_DOMAIN` (URL definitiva pendiente de contratar/configurar el dominio).

### Comprobaciones y evidencias

Una vez publicado, anotar aquí fecha, versión/commit, URL, comandos y resultados observados:

| Verificación | Evidencia pendiente |
| --- | --- |
| HTTPS válido y carga frontend | No ejecutada; no hay dominio/VPS configurados |
| `/health` responde y confirma MariaDB conectada | No ejecutada públicamente |
| Inicio de sesión Administrador, Tutor, Monitor y Estudiante | No ejecutada públicamente; requiere credenciales de prueba autorizadas |
| Operaciones CRUD/principales por rol | No ejecutada públicamente |
| Persistencia tras recrear contenedores sin borrar volúmenes | No ejecutada públicamente |
| Adjuntos de informes persisten tras recrear API | No ejecutada públicamente |

Procedimiento de comprobación desde un equipo con `curl`:

```bash
curl -fsS https://$ACADEX_DOMAIN/health
curl -fsSI https://$ACADEX_DOMAIN/
```

Para comprobar persistencia, crear un registro de prueba identificable, ejecutar `docker compose ... up -d --force-recreate db api web`, verificar el registro y borrar la prueba con una cuenta autorizada. Para adjuntos, subir y descargar una evidencia de prueba antes/después de recrear API. **No ejecutar `docker compose down -v`**: borra permanentemente los volúmenes y datos.

Las pruebas de cada rol requieren cuentas ficticias creadas exclusivamente para aceptación, contraseña temporal entregada por un canal seguro y autorización para probar. Registrar evidencia sin mostrar contraseñas, tokens, correos personales ni datos académicos reales.

### Actualizar/desplegar de nuevo

Después de aprobar cambios y publicarlos en la rama acordada, en el VPS:

```bash
git pull --ff-only
docker compose --env-file .env -f compose.yaml -f compose.production.yaml up -d --build
docker compose --env-file .env -f compose.yaml -f compose.production.yaml ps
docker compose --env-file .env -f compose.yaml -f compose.production.yaml logs --tail=100 api web caddy
```

Mantén una copia externa, cifrada y periódica del volumen MariaDB antes de actualizaciones. Restaurar una copia debe ensayarse en un entorno separado. `docker compose down` conserva los volúmenes; `down -v` los elimina.

### Errores encontrados durante la preparación

- Docker CLI no está instalado/disponible en el entorno actual, por lo que no se pudieron construir ni arrancar los contenedores aquí. Solución: instalar Docker Desktop/Engine con Compose v2 en el equipo/VPS de despliegue y ejecutar los comandos de comprobación.
- La configuración Compose original era de desarrollo y no incluía proxy HTTPS, secretos SMTP de producción, persistencia para adjuntos ni cuenta administrativa separada para migraciones. El archivo `compose.production.yaml` agrega esas piezas sin cambiar las tecnologías.
- No hay todavía proveedor seleccionado con cuenta autorizada, dominio/DNS ni credenciales de VPS disponibles en el workspace. Por esa razón no hay URL pública ni resultados de autenticación/roles/persistencia que se puedan afirmar.

## Estructura del repositorio

```text
acadex/
├── README.md                         # Entrada principal del repositorio
├── .gitignore
├── .env.example                      # Variables de entorno sin secretos
├── database/
│   ├── README.md
│   └── gestion_monitorias_tutorias.sql
├── docs/
│   ├── README.md
│   ├── modelo-datos.md
│   ├── decisiones.md
│   ├── diagramas/
│   └── wireframes/
├── api/
│   ├── openapi.yaml
│   ├── README_API.md
│   └── scripts/validate-openapi.mjs
└── web/
    ├── index.html
    ├── src/
    ├── data/ejemplo.json
    └── package.json
```

## Ejecución rápida

### Docker Compose

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

El frontend y la API pueden ejecutarse de manera conjunta desde la raíz del proyecto o en terminales independientes:

### Opción 1: Ejecución integrada (Recomendada)

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

### Control y verificación de Base de Datos (MariaDB)

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

## Acceso de demostración

La autenticación usa correo institucional y contraseña. Las claves temporales
se deben entregar por un canal seguro y cambiar en el primer inicio de sesión.
No incluyas correos personales, documentos ni contraseñas en el repositorio,
las diapositivas o las exportaciones de cuentas.

### Inicio de sesión integrado con MariaDB

El formulario ya no utiliza código de usuario como credencial. La regla actual es:

```text
Correo institucional + documento de identidad
```

El documento corresponde al campo `documento` de la tabla `Usuario` y al dato asociado en `Credencial`. La API consulta la relación entre `Usuario`, `Credencial`, `UsuarioRol` y `Rol`, y nunca devuelve el documento ni el hash de contraseña.

La primera validación es compatible con los datos base del SQL. Después de un
login válido, si el valor de `Credencial.password_hash` todavía está en texto
plano por ser un dato inicial de desarrollo, la API lo reemplaza por un hash
bcrypt.

Credenciales demo disponibles en el frontend:

```text
Administrador: jaysonquintero@unitropico.edu.co / 1000000010
Tutor:         tutormatematica@unitropico.edu.co / 1007418843
Monitor:       brayhamlindarte.es@unitropico.edu.co / 1093432540
Estudiante:    mariaamezquita.es@unitropico.edu.co / 1029663952
```

## Documentación principal

- [Documentación de la API](./api/README_API.md)
- [Contrato OpenAPI 3.1](./api/openapi.yaml)
- [Modelo de datos](./docs/modelo-datos.md)
- [Decisiones de arquitectura](./docs/decisiones.md)
- [Documentación de diagramas y wireframes](./docs/README.md)
- [Índice de diagramas](./docs/diagramas/README.md)
- [Índice de wireframes](./docs/wireframes/README.md)

## Integrantes

- Angye Katherine Martínez Cucunubá — Líder técnico.
- Brayham Orlando Lindarte Fuentes — Backend, datos, DevOps y calidad.
- Nicolas Parra Franco — Frontend.

## CRUD administrativo y códigos institucionales

La API administrativa expone CRUD para usuarios, espacios, solicitudes y
periodos académicos. Las eliminaciones permanentes deben ejecutarse solo sobre
datos de demostración; los periodos con asignaciones, horarios o solicitudes
asociadas quedan protegidos.

- **Crear**: Registro con validación de esquemas en API (incluyendo perfiles específicos de Estudiante, Tutor y Monitor).
- **Editar**: Actualización completa de perfiles, capacidades, recursos y datos operativos.
- **Validar**: Esquemas de entrada, roles, fechas y transiciones de estado se verifican en el servidor.
- **Eliminar**: las operaciones `DELETE` se bloquean ante historial/dependencias; usuarios con actividad se desactivan, y espacios/solicitudes en uso conservan sus registros.

### Edición de usuarios y roles

Al editar un usuario, la selección enviada de roles reemplaza exactamente sus membresías activas. Los roles desmarcados dejan de mostrarse y no se reactivan al cambiar el estado general de la cuenta; cuenta activa/inactiva y pertenencia a roles son estados independientes. Al reactivar una cuenta heredada, se reconstruyen solo los roles respaldados por perfiles activos. Los filtros por rol no reducen la lista de roles que se presenta para editar. El cambio fue probado contra MariaDB con un usuario temporal, eliminado tras la prueba.

La edición de espacios también valida la dirección final resultante (no solo el campo aislado): un espacio presencial no puede quedar sin edificio, bloque, salón o referencia. Los cambios se confirman en transacción.

### Catálogos académicos y validación de formularios

El panel administrativo incorpora CRUD de asignaturas (código, nombre, créditos, descripción y estado) y programas (código, nombre, SNIES, facultad y estado). Los códigos y nombres duplicados se rechazan; no se permite borrar físicamente un catálogo con programas, asignaciones, estudiantes o solicitudes relacionadas: se debe desactivar para preservar el historial. Los formularios muestran avisos accesibles y los errores de validación identifican el campo problemático. Nombres personales aceptan letras y separadores nominales, no dígitos; valores numéricos se validan como enteros dentro de sus rangos tanto en interfaz como en API.

### Combinaciones de roles

La única combinación multirrol permitida es **Monitor + Estudiante**. Administrador, Tutor y Estudiante pueden asignarse individualmente; Administrador y Tutor no se combinan con otros roles. La interfaz deshabilita opciones incompatibles, y la API/OpenAPI aplican la misma regla para altas y ediciones.

### Número de contacto de usuario

El formulario administrativo de creación y edición incluye el número de contacto guardado en `Usuario.telefono`. El dato es opcional y se puede dejar vacío; si se proporciona, admite dígitos y separadores telefónicos usuales, con un máximo de 20 caracteres. La API conserva el valor durante la edición cuando el campo no se envía y permite borrarlo enviando vacío o `null`.

El formulario de alta inicia sin roles marcados. El administrador selecciona explícitamente uno antes de guardar; puede desmarcarlo también, y las combinaciones permitidas se validan al guardar.

### Estructura de códigos institucionales autogenerados (Solo lectura)
En ningún formulario del software es posible escribir o alterar manualmente el código institucional (`readOnly`). La aplicación genera códigos coherentes y aleatorios según el rol o entidad:
- **Administrador**: `ADM###` (ej. `ADM482`).
- **Tutor**: `TUT###` (ej. `TUT719`).
- **Monitor**: `MON###` (ej. `MON305`).
- **Estudiante**: `EST###` (ej. `EST640`).
- **Espacios**: `AUL-###`, `LAB-###`, `SAL-###`, `INF-###`, `BIB-###`, `REU-###`, `VIR-###`, `ESP-###`.
- **Radicados de Solicitudes**: `RAD-YYYY-####`.

Cada formulario incluye un botón de regeneración aleatoria para obtener una nueva variante respetando la unicidad.

### Formularios y perfiles Tutor/Monitor

Los formularios de creación y edición usan una distribución compacta y adaptable, muestran `*` en campos obligatorios y una leyenda de referencia. Tutor y Monitor seleccionan una única asignatura por perfil, con validación tanto en la interfaz como en la API. En móviles, la barra superior mantiene visible el cierre de sesión, reduciendo el control a un botón de icono en anchos muy pequeños.

## Usabilidad de formularios y navegación móvil

Los formularios de creación y edición comparten tamaños compactos, distribución adaptable y botones accesibles al desplazarse. Los campos HTML marcados como `required` se identifican con `*`; cada formulario que los contiene muestra la leyenda «* Campo obligatorio».

En la creación administrativa de solicitudes, el tipo Monitoría filtra monitores, Tutoría filtra tutores y Acompañamiento permite escoger el rol. El personal disponible se filtra por asignatura y periodo. Si se selecciona una persona, el formulario solicita fecha, hora y modalidad para crear también la primera sesión; si no hay personal elegible, la solicitud puede registrarse y asignarse después.

En pantallas pequeñas se muestra una acción directa «Cerrar sesión» en la barra superior, además del menú del perfil. Los modales se ajustan al ancho y alto disponibles y permiten desplazamiento interno.

## Guía central para el equipo espejo de auditoría

El flujo de auditoría debe avanzar por capas y dejar evidencia para cada mejora. El detalle de cada cambio se conserva en `docs/BITACORA_PROYECTO.md`; este README es el punto de entrada para ejecutar y revisar el sistema.

1. **Validaciones de registros**: formularios del frontend más validación de dominio en la API. Estado: implementadas y verificadas con compilación/typecheck; ver `api/README_API.md`.
2. **Restricciones en MariaDB**: añadidas al DDL inicial y con migración manual, no destructiva, para instalaciones existentes. Revisar prevalidaciones y respaldar antes de aplicar; no se ejecuta durante el arranque.
3. **Auditoría de base de datos**: ejecutada en modo de solo lectura con `cd api; npm run db:audit`. La última ejecución detectó 4 credenciales no bcrypt, 5 códigos estudiantiles discrepantes, 1 rol con varias asignaturas activas y 1 sesión con asignatura/periodo discrepante; una ejecución previa documentaba 6 discrepancias de código, por lo que el cambio de conteo está anotado para reconciliar. Revisar los datos antes de usar cuentas reales; aplicar la migración solo si sus prevalidaciones son cero. Detalle en `database/README.md` y `docs/modelo-datos.md`.
4. **Registro de espacios**: validado y probado con MariaDB; los espacios presenciales requieren ubicación, la persistencia/confirmación es transaccional y el registro temporal de prueba fue eliminado.
5. **CRUD y eliminación**: validado; los borrados con dependencias/historial o de último administrador se bloquean con `409`, conservando historial y ofreciendo desactivación. Pruebas MariaDB para usuario, espacio, solicitud y periodo en uso pasaron.
6. **Log de navegación**: implementado en desarrollo; registra en tiempo real rol/vista en consola y emite `acadex:navigation`. No persiste ni transmite identidad, tokens o datos de formularios.
7. **Modales**: redimensionados y centrados, con cuerpo desplazable y encabezado/acciones accesibles; build verificado, queda inspección visual manual en tamaños móviles reales.
8. **Configuración y usuario estudiante**: secciones agrupadas por operación/seguridad y eliminado el código estudiantil duplicado del perfil; el código institucional se sincroniza internamente.
9. **Entrega de credenciales**: exportación por rol de claves temporales nuevas, de un solo uso y con cambio obligatorio; excluye la cuenta administradora. No se exportan claves existentes ni hashes. Correo automático pendiente de SMTP institucional.
10. **Parámetros institucionales**: apartado retirado de la configuración del administrador. Se conservaron la tabla y los endpoints existentes para proteger datos y compatibilidad; no se eliminaron parámetros almacenados.

Antes de iniciar auditoría, configurar `.env`, ejecutar `npm run dev`, comprobar `http://localhost:3000/health` y verificar que muestre `database: connected`. Para validar el código: `npm run build:web`, `npm run typecheck:api` y `npm --prefix api run validate`. Los cambios CRUD deben probarse con datos de demostración y confirmarse en HeidiSQL o mediante `npm run db:inspect`; no usar datos reales de estudiantes en evidencias.

## Portal del tutor

El portal de tutoría ya consulta datos propios desde MariaDB. Su resumen presenta sesiones próximas y realizadas, solicitudes asignadas e informes pendientes. En **Mi disponibilidad** el tutor administra bloques semanales en un calendario, con alta, edición y retiro; la API valida asignación activa y evita cruces. Las recuperaciones quedan asociadas a la sesión original, se pueden cancelar mientras estén programadas y marcar como realizadas al llegar la fecha.

En **Solicitudes**, el tutor acepta o cancela las tutorías asignadas. La cancelación exige justificación y la conserva para consulta del tutor y del administrador. **Mis sesiones** permite filtrar la agenda y marcar una tutoría como realizada. **Reportes** registra horario real, lugar, descripción, asistentes, seguimiento SAT y adjuntos; los borradores se guardan en MariaDB y el envío los remite a administración. Los archivos se almacenan localmente en `api/uploads/tutor-reports/`, carpeta ignorada por Git.

La configuración permite cambiar la contraseña y activar/desactivar los avisos de reportes pendientes (preferencia local del navegador). Para operar la migración inicial de reportes, el arranque de la API usa las credenciales `DATABASE_BOOTSTRAP_USER` y `DATABASE_BOOTSTRAP_PASSWORD`; la migración `database/migrations/002_reportes_tutor.sql` es idempotente y añade las tablas de detalle y adjuntos sin reemplazar las tablas existentes.

La exportación con diseño institucional definitivo requiere la plantilla oficial y sus reglas de anexos. El módulo provisional de cierre mensual ya permite revisar el flujo; ver `docs/decisiones.md`.

## Notificaciones y cierre mensual del tutor

Las notificaciones ahora se almacenan en MariaDB por usuario y se consultan desde la campana del encabezado, disponible para los roles del portal. La bandeja muestra el contador de pendientes, permite marcar una notificación o todas como leídas y consulta cambios nuevos periódicamente mientras la sesión está abierta. Se generan avisos ante nuevas solicitudes estudiantiles o administrativas, asignación, confirmación/cancelación (incluida su justificación), actualización de estado y envío de reportes diarios a administración. Los fallos al guardar un aviso se registran en el servidor sin deshacer la operación principal.

La API expone `GET /api/v1/notifications`, `PATCH /api/v1/notifications/{id}/read` y `POST /api/v1/notifications/read-all`. Al iniciar, aplica idempotentemente `database/migrations/003_notificaciones_informe_mensual.sql`, que crea `Notificacion` e `InformeMensualTutor` sin reconstruir tablas existentes.

El tutor dispone de **Informe mensual** para elegir un mes, consolidar sesiones reportadas, revisar totales de horas/asistencia/SAT y metadatos de anexos, editar introducción, logros, dificultades y recomendaciones, guardar un borrador en MariaDB, previsualizarlo y exportarlo a Word compatible (`.doc`) o imprimirlo/guardarlo como PDF. El informe se nutre de los reportes diarios y de recuperación ya registrados. Su formato se marca como provisional hasta integrar la plantilla institucional; el borrador mensual no reemplaza ni cambia los reportes de sesión. El resumen del tutor avisa cuando tiene sesiones reportadas en el mes, pero aún no ha creado su borrador. También muestra las tutorías realizadas que siguen sin reporte; el aviso orienta a recuperar los reportes atrasados desde el viernes y durante el fin de semana.

**Verificación de esta entrega:** `npm run typecheck` y `npm run validate` en `api/`, `npm run build` en `web/`, `git diff --check`, API local respondiendo `database: connected` y auditoría MariaDB de solo lectura. La auditoría confirmó la instalación de las dos tablas de la migración nueva (40 tablas totales); conserva alertas de datos demostrativos ya conocidas, sin modificarlas. El documento institucional de cierre sigue pendiente para ajustar el diseño final.

## Ajustes recientes del portal del tutor

El dashboard del tutor conserva métricas y agenda próxima, con un solo bloque de agenda y sin la tarjeta de atajos redundantes. **Solicitudes asignadas** ahora tiene búsqueda, filtro de estado, resumen de pendientes/atendidas/canceladas y tarjetas con prioridad, estudiante y asignatura; la cancelación exige una justificación que se notifica al estudiante. **Mis sesiones** usa tarjetas con fecha, horario, modalidad, lugar y estado, además de una búsqueda y filtros consistentes.

En **Mi disponibilidad**, la recuperación obtiene sesiones propias canceladas o no asistidas que aún no tengan recuperación activa. El selector muestra asignatura, fecha, hora y estado, informa cuando no hay una sesión elegible y bloquea el envío en ese caso. La API vuelve a validar propiedad, estado, fecha futura y ausencia de recuperación duplicada.

**Reportes** dispone de consulta de detalle, creación, edición de borradores/devueltos, descarga de adjuntos, envío a revisión y eliminación de borradores no enviados. Los reportes enviados quedan bloqueados; al reemplazar adjuntos se limpian los archivos anteriores, y al eliminar un borrador se retiran sus adjuntos e historial de borrador. Los reportes devueltos conservan su historial. La solicitud ficticia que estaba en `web/data/ejemplo.json` se retiró del ejemplo local; por instrucción del equipo, no se insertaron ni borraron solicitudes en MariaDB.

### Ubicación de la plantilla oficial

Cuando la institución entregue el archivo, agrégalo como `api/templates/plantilla_informe_tutor_unitropico.docx`. Las instrucciones de integración están en [api/templates/README.md](api/templates/README.md). La plantilla todavía no se carga automáticamente; hay que mapear sus campos y anexos al generador del informe antes de considerar ese módulo institucional terminado.

**Comprobación de los ajustes:** API `typecheck`, contrato OpenAPI sincronizado (51 rutas y 69 operaciones), build de producción web y `git diff --check` satisfactorios. La base de datos no recibió cambios en esta actividad.

### Portal tutor

Para completar la jornada del tutor, ingresa al portal y revisa **Mi resumen**. En **Mi disponibilidad** crea o ajusta los bloques semanales de la asignatura activa; los horarios cruzados se rechazan. La sección **Solicitudes** permite aceptar o cancelar solicitudes vinculadas; cancelar exige una razón que se conserva para administración. En **Mis sesiones**, marca como realizada cada tutoría atendida. En **Reportes**, documenta los datos de la sesión, asistencia/SAT y adjunta evidencias; guarda borrador para completar luego o envíalo a revisión. Las sesiones atrasadas sin reporte se resaltan y pueden recuperarse desde el viernes durante el fin de semana. Las recuperaciones se registran desde el calendario y se finalizan cuando ya se realizaron.

Los adjuntos se almacenan en `api/uploads/tutor-reports/`, fuera del control de versiones; respalda ese directorio con la base si se despliega. Para probar cambios en un entorno de clase, usa cuentas de demostración y no reemplaces contraseñas ni registros compartidos del equipo.

### Cancelaciones visibles al estudiante

En **Mis solicitudes**, el estudiante puede leer la justificación de una tutoría cancelada por su tutor. El motivo se conserva en la solicitud/sesión de cancelación existente y se consulta desde MariaDB; no se pierde al cambiar de pantalla.

## Facultades, solicitudes y reportes institucionales

El módulo de programas permite registrar una facultad desde **Nueva facultad** y usarla de inmediato al crear programas. La API valida el nombre y evita duplicados.

Al registrar o asignar una solicitud administrativa, se selecciona el tutor o monitor responsable y una fecha/bloque generado a partir de su horario activo para la asignatura y periodo. La API vuelve a validar el bloque y los cruces de sesiones. La asignación crea la sesión y notifica al responsable; el tutor confirma tutorías y el monitor confirma monitorías desde su bandeja. Administración puede cancelar solicitudes pendientes o cerrar las atendidas, pero no aprobarlas ni rechazarlas. Las solicitudes asignadas o atendidas conservan su historial y no se borran.

Cada sesión realizada tiene un reporte individual. El informe mensual consolida únicamente sesiones que ya tienen reporte y se genera con secciones basadas en la plantilla institucional ubicada en `api/templates/plantilla_informe_tutor_unitropico.docx`. La sección **Sesiones consolidadas** inicia en una página final independiente. Las evidencias de imagen se anexan al documento exportado; los otros adjuntos aparecen identificados por nombre.
## Correcciones integradas para facultades, horarios y reportes

La administración dispone de CRUD de facultades con listado, descripción, estado y cantidad de programas. Las facultades asociadas a programas se desactivan para conservar la integridad; la eliminación física solo procede si no tienen programas relacionados. Las solicitudes administrativas consultan fechas concretas de los bloques semanales del tutor o monitor, muestran estado de consulta y omiten horas ya ocupadas o que ya comenzaron. Al cambiar la asignatura de un tutor se copian sus bloques de disponibilidad a la nueva asignación, manteniendo el historial de la asignación anterior.

El tutor gestiona su calendario desde **Horario**. Los reportes se habilitan para sesiones realizadas/finalizadas y permiten crear, consultar, editar borradores, enviar y eliminar borradores. El informe mensual toma actividades, logros, dificultades y recomendaciones de los reportes individuales para precargar su contenido editable. La salida se ofrece como descarga Word; se retiró la impresión de la interfaz porque no reproduce el archivo DOCX oficial exactamente.

## Diagnóstico de disponibilidad y reportes

El API informa cuando no puede ofrecer fechas por periodo vencido. En la base de desarrollo consultada, el único periodo marcado Activo es `2026-1` (20 de enero a 20 de junio de 2026), que ya venció. Aunque hay horarios de monitor activos, no se deben programar sesiones fuera del periodo institucional. Registra o activa el periodo vigente y sus fechas en Administración → Periodos académicos; las fechas existentes no se alteran automáticamente. La asignación activa del tutor de muestra tampoco tiene bloques de disponibilidad, así que debe registrarlos desde Horario.

Los reportes se habilitan para sesiones finalizadas sin informe. En la base consultada, la única sesión reportable ya tiene un informe Aprobado; se puede consultar, pero no editar ni eliminar. El CRUD está disponible para sesiones finalizadas sin informe y para borradores/devueltos; la eliminación se limita al borrador no enviado.

### Corrección del guardado de horario del tutor

El formulario de bloque nuevo inicializa un objeto con `id: 0`. El guardado ahora decide editar solo si `id > 0`; en caso contrario crea con `POST`, evitando enviar por error `PATCH /tutor/availability/0`. Se probó el guardado y la recarga con la asignación activa de tutor. Quedó un bloque provisional semanal **lunes 08:00–09:00, presencial**, para Matemáticas básicas, con ID de disponibilidad `19`. Se puede retirar desde Horario → eliminar bloque si ya no se requiere.

### Sesiones de ingreso y cierre de sesión

Los accesos autenticados se registran en `SesionIngreso` con identificador único, usuario, rol activo, vencimiento y marca de revocación. El botón **Cerrar sesión** solicita a la API revocar el token antes de limpiar el estado local; las peticiones posteriores con ese token reciben `401`. La migración `004_sesiones_ingreso.sql` se aplica al iniciar la API. Esto corresponde a autenticación del software y no a las sesiones académicas de tutorías o monitorías.

El cambio de contraseña conserva la sesión actual y revoca las demás, además de cualquier selección de rol pendiente. El restablecimiento administrativo y la exportación de claves temporales revocan todos los tokens activos o preliminares de las cuentas afectadas.

Cada inicio correcto actualiza `Credencial.ultimo_acceso`. Las respuestas de autenticación incluyen `expiresIn` calculado a partir del TTL configurado para el token.

Los JWT del navegador se conservan en `sessionStorage`: siguen disponibles al recargar la pestaña y se descartan al cerrarla. La aplicación elimina las copias de esos tokens que versiones anteriores dejaron en `localStorage`; el correo recordado permanece como preferencia independiente.

En cuentas con varios roles, el token preliminar para entrar tiene vigencia breve y solo se puede usar una vez. Después, el cambio de rol requiere el token de acceso actual y rota la sesión, revocando el token anterior. Salir desde el selector también revoca el token preliminar. Las migraciones `004_sesiones_ingreso.sql` y `005_sesiones_preautenticacion.sql` crean las tablas separadas para ambos estados de autenticación.

El login limita cinco intentos fallidos por combinación de IP/correo durante 15 minutos y responde `429` con `Retry-After`. El contador vive en memoria del proceso API; si el despliegue usa varias réplicas, debe trasladarse a un almacén compartido para aplicar el límite globalmente.
