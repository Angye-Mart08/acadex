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
periodos académicos, solicitudes, catálogos, horarios y sesiones consultadas.
El frontend inicia sus colecciones vacías y presenta un estado de carga; los
datos de `web/data/ejemplo.json` no se usan como respaldo de pantalla ni para
confirmar operaciones persistidas.

Las eliminaciones de usuarios, espacios y solicitudes son físicas y limpian sus
dependencias; solo deben usarse con datos de demostración. Un periodo con
solicitudes, horarios o asignaciones no se puede eliminar.

## 6. Variables de entorno

`.env.example` documenta las variables necesarias sin incluir secretos. Cada desarrollador debe crear su propio `.env` local.

## 7. Estado de evolución

1. Integrado: login, selección de rol y autorización JWT.
2. Integrado: CRUD administrativo de usuarios, espacios, solicitudes y periodos académicos.
3. Integrado: catálogos administrativos, dashboard y generación de reportes.
4. Integrado en lectura: disponibilidad, horarios y sesiones filtradas por rol.
5. Pendiente: escritura de disponibilidad/sesiones, asistencia, seguimiento,
   compromisos, evidencias e informes individuales.
6. Pendiente: pruebas automatizadas de integración y despliegue.

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

## 9. Entrada y HMR de React

`web/src/bootstrap.ts` contiene los efectos laterales de montaje y conserva la
instancia `Root` en `import.meta.hot.data` para reutilizarla durante HMR.
`web/src/main.tsx` exporta únicamente el componente `AppRoot`, que es el límite
compatible con React Fast Refresh. Esta separación evita llamar dos veces a
`createRoot()` sobre el mismo contenedor cuando Vite actualiza el módulo.

## 10. CRUD y códigos institucionales autogenerados

`DELETE` elimina permanentemente usuarios, espacios y solicitudes, limpiando
sus dependencias en MariaDB. El endpoint de usuario impide que el
administrador elimine su propia cuenta. Los periodos se eliminan solo cuando
no tienen registros relacionados.

Asimismo, se establece que ningún código institucional (usuarios, espacios o radicados) puede ser digitado manualmente en los formularios. Estos se generan de forma determinística en su prefijo pero aleatoria en sus dígitos numéricos (`ADM###`, `TUT###`, `MON###`, `EST###`, `AUL-###`, `LAB-###`, etc.), manteniendo el atributo `readOnly` y ofreciendo un botón de regeneración aleatoria en la interfaz.
