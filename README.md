# Gestión de Tutorías y Monitorías — Unitrópico

Plataforma web para administrar el acompañamiento académico mediante tutorías y monitorías de la Universidad Internacional del Trópico Americano.

## Arquitectura

```text
React + TypeScript → API REST con Node.js + TypeScript → MariaDB
```

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
- **Eliminar**: `DELETE` elimina físicamente algunos recursos y dependencias; consulta la guía API antes de usarlo con datos que deban conservarse.

### Estructura de códigos institucionales autogenerados (Solo lectura)
En ningún formulario del software es posible escribir o alterar manualmente el código institucional (`readOnly`). La aplicación genera códigos coherentes y aleatorios según el rol o entidad:
- **Administrador**: `ADM###` (ej. `ADM482`).
- **Tutor**: `TUT###` (ej. `TUT719`).
- **Monitor**: `MON###` (ej. `MON305`).
- **Estudiante**: `EST###` (ej. `EST640`).
- **Espacios**: `AUL-###`, `LAB-###`, `SAL-###`, `INF-###`, `BIB-###`, `REU-###`, `VIR-###`, `ESP-###`.
- **Radicados de Solicitudes**: `RAD-YYYY-####`.

Cada formulario incluye un botón de regeneración aleatoria para obtener una nueva variante respetando la unicidad.
