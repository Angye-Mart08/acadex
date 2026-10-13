# Decisiones de arquitectura

## 1. Separación por capas

Se separan `web`, `api` y `database` para que cada capa tenga una responsabilidad clara:

- `web`: interfaz React y experiencia de usuario.
- `api`: contrato REST e implementación Node.js + TypeScript.
- `database`: esquema y datos iniciales de MariaDB.

## 2. Frontend con React + TypeScript

React permite construir los portales por rol como componentes reutilizables y TypeScript ayuda a mantener consistencia entre usuarios, solicitudes, espacios y sesiones.

Vite se utiliza como servidor y herramienta de compilación del frontend.

## 3. Contrato y API implementada

`api/openapi.yaml` define las rutas, cuerpos, respuestas, estados y roles. La
implementación Node.js respeta ese contrato para evitar que frontend y backend
evolucionen con estructuras incompatibles. El contrato se valida con
`npm run validate`.

## 4. Autorización por rol

El frontend muestra menús distintos para Administrador, Tutor, Monitor y
Estudiante. La API valida el JWT y el rol activo en las rutas protegidas; la
visibilidad de los menús no sustituye esa autorización del servidor.

## 5. Persistencia y datos de demostración

MariaDB es la fuente de verdad para autenticación, usuarios, espacios,
solicitudes y catálogos. `web/data/ejemplo.json` y los valores iniciales del
frontend sirven como estado visual de respaldo mientras se completa la carga
inicial, pero no deben utilizarse para confirmar una operación persistida.

Las eliminaciones administrativas se implementan como desactivaciones lógicas
para conservar las relaciones históricas de sesiones y solicitudes.

## 6. Variables de entorno

`.env.example` documenta las variables necesarias sin incluir secretos. Cada desarrollador debe crear su propio `.env` local.

## 7. Estado de evolución

1. Integrado: login, selección de rol y autorización JWT.
2. Integrado: operaciones administrativas de usuarios, espacios y solicitudes.
3. Integrado: catálogos administrativos, dashboard y generación de reportes.
4. Pendiente: persistencia API para disponibilidad, horarios, sesiones,
   asistencia, seguimiento, compromisos, evidencias e informes individuales.
5. Pendiente: pruebas automatizadas de integración y despliegue.

La comprobación de contrato usa `npm run validate`; la compilación de la web
usa `npm run build`. El `typecheck` de API no comprueba los módulos que aún
tienen `@ts-nocheck`, por lo que no se considera cobertura completa de tipos.

## 8. Tema visual compartido

Los componentes de portal comparten tokens y ajustes visuales en
`web/src/brand-theme.css`; los estilos estructurales generales permanecen en
`web/src/styles.css`. Los módulos añaden reglas de presentación por clase sin
duplicar el shell ni cambiar la fuente de datos. Los diseños de dos columnas se
convierten en una columna en móvil, y los contenedores de tablas y modales deben
controlar su propio desbordamiento para evitar scroll horizontal de página.
