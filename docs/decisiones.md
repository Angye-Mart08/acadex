# Decisiones de arquitectura

## 1. Separación por capas

Se separan `web`, `api` y `database` para que cada capa tenga una responsabilidad clara:

- `web`: interfaz React y experiencia de usuario.
- `api`: contrato REST y futura implementación Node.js + TypeScript.
- `database`: esquema y datos iniciales de MariaDB.

## 2. Frontend con React + TypeScript

React permite construir los portales por rol como componentes reutilizables y TypeScript ayuda a mantener consistencia entre usuarios, solicitudes, espacios y sesiones.

Vite se utiliza como servidor y herramienta de compilación del frontend.

## 3. Contrato antes de la implementación de la API

`api/openapi.yaml` define primero las rutas, cuerpos, respuestas, estados y roles. La implementación Node.js deberá respetar ese contrato para evitar que frontend y backend evolucionen con estructuras incompatibles.

## 4. Autorización por rol

El frontend muestra menús distintos para Administrador, Tutor, Monitor y Estudiante. Esta separación es de experiencia de usuario; la API también deberá validar el JWT y el rol en cada ruta protegida.

## 5. Datos de demostración

Los datos locales permiten revisar las pantallas antes de conectar MariaDB. Se documentan en `web/data/ejemplo.json` y no sustituyen la persistencia real.

## 6. Variables de entorno

`.env.example` documenta las variables necesarias sin incluir secretos. Cada desarrollador debe crear su propio `.env` local.

## 7. Evolución prevista

1. Implementar la API REST con Node.js y TypeScript.
2. Conectar credenciales, roles y consultas con MariaDB.
3. Sustituir los datos locales del frontend por servicios HTTP.
4. Agregar pruebas, migraciones y despliegue.
