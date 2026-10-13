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
├── BITACORA_PROYECTO.md              # Bitácora detallada de avances
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

El frontend y la API son paquetes independientes. Para iniciar el sistema,
primero configura MariaDB y `.env` desde `.env.example`, ejecuta la API y
después inicia Vite. Abre la URL `localhost` que Vite muestre; en desarrollo
también se admite `127.0.0.1`.

Frontend:

```powershell
cd C:\Users\brayh\acadex\web
npm install
npm run dev
```

API — validación del contrato:

```powershell
cd C:\Users\brayh\acadex\api
npm install
npm run validate
```

API — mock local:

```powershell
cd C:\Users\brayh\acadex\api
npm run mock
```

API — servidor real de autenticación:

```powershell
cd C:\Users\brayh\acadex\api
npm run dev
```

Configura `.env` y ejecuta la API. En el primer arranque creará la base de
datos y cargará el esquema automáticamente; luego verifica
`http://localhost:3000/health`.

Validaciones locales:

```powershell
cd C:\Users\brayh\acadex\web
npm run build

cd C:\Users\brayh\acadex\api
npm run typecheck
npm run validate
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

## Credenciales base de desarrollo

El login utiliza correo institucional y documento de identidad:

| Rol | Correo | Documento |
| --- | --- | --- |
| Administrador | `jaysonquintero@unitropico.edu.co` | `1000000010` |
| Tutor | `tutormatematica@unitropico.edu.co` | `1007418843` |
| Monitor + Estudiante | `brayhamlindarte.es@unitropico.edu.co` | `1093432540` |
| Estudiante | `mariaamezquita.es@unitropico.edu.co` | `1029663952` |

La autenticación se valida contra MariaDB mediante la API. La cuenta de Monitor
permite probar el selector y el cambio entre los roles Monitor y Estudiante.

## Documentación principal

- [Bitácora del proyecto](./BITACORA_PROYECTO.md)
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
