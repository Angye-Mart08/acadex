# BITACORA_PROYECTO — Gestión de Tutorías y Monitorías

## 1. Identificación

Proyecto web para la gestión de tutorías y monitorías académicas de Unitrópico.

Arquitectura prevista:

```text
React + TypeScript → API REST con Node.js + TypeScript → MariaDB
```

Este archivo se actualizará progresivamente con cada avance funcional, técnico y de diseño.

## 2. Avance actual

Se construyó el primer avance navegable del frontend en `web/` con estos puntos de acceso:

1. Inicio de sesión.
2. Panel de administración y resumen general.
3. Gestión de usuarios.
4. Gestión de espacios.
5. Gestión de solicitudes.

Aunque inicialmente se denominó como un avance de tres ventanas principales, el alcance implementado contiene el inicio de sesión más los tres módulos administrativos solicitados.

## 3. Funcionalidades disponibles

### Inicio de sesión

- Formulario de correo institucional y documento de identidad.
- Validación local de demostración.
- Mensaje de error para credenciales inválidas.
- Selector modal de rol cuando la cuenta tiene más de un rol.
- Acceso al portal correspondiente sin exponer el documento de identidad.

Credencial de demostración inicial:

```text
Correo:      jaysonquintero@unitropico.edu.co
Documento:   1000000010
```

La autenticación todavía no consulta la API ni valida contraseñas con MariaDB. Esta integración será un avance posterior.

### Gestión de usuarios

- Tabla de usuarios con código, nombre, roles, correo y estado.
- Búsqueda por nombre, código o correo.
- Filtro por rol.
- Activación y desactivación local.
- Crear, editar y eliminar usuarios en memoria.
- Selector de uno o varios roles en el registro y edición.

### Gestión de espacios

- Tarjetas de espacios disponibles.
- Código, nombre, tipo, ubicación y capacidad.
- Búsqueda por nombre, código o ubicación.
- Activación y desactivación local.
- Crear, editar y eliminar espacios en memoria.

### Gestión de solicitudes

- Tabla de solicitudes de tutoría y monitoría.
- Búsqueda por estudiante o asignatura.
- Filtro por estado.
- Visualización de prioridad y estado.
- Aprobar, rechazar y asignar solicitudes en memoria.

## 4. Estructura creada

```text
database/
└── gestion_monitorias_tutorias.sql

docs/
├── modelo-datos.md
├── decisiones.md
├── diagramas/
└── wireframes/

api/
├── openapi.yaml
└── scripts/validate-openapi.mjs

web/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   └── vite-env.d.ts
├── data/
│   └── ejemplo.json
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

## 5. Ejecución local

Desde PowerShell:

```powershell
cd C:\Users\brayh\acadex\web
npm install
npm run dev
```

Después, abrir la URL que muestre Vite, normalmente `http://localhost:5173`.

Validación de compilación:

```powershell
cd C:\Users\brayh\acadex\web
npm run build
```

## 6. Estado técnico del avance

| Área | Estado |
| --- | --- |
| Frontend React + TypeScript | Implementado en modo navegable |
| Vite | Configurado |
| Diseño responsive | Implementado para escritorio, tablet y móvil |
| Login | Demo local, pendiente API |
| Usuarios | Datos locales, CRUD visual de alta, consulta, edición, estado y eliminación |
| Espacios | Datos locales, CRUD visual de alta, consulta, edición, estado y eliminación |
| Solicitudes | Datos locales, cambios de estado locales |
| API REST Node.js | Pendiente de implementación |
| Persistencia MariaDB | Esquema existente, pendiente integración |
| Autenticación real | Pendiente |
| Roles y permisos reales | Selector y navegación local implementados; autorización API pendiente |

## 7. Fuentes de datos existentes

El archivo `database/gestion_monitorias_tutorias.sql` contiene el esquema y datos de prueba del dominio, incluyendo usuarios, credenciales, roles, espacios físicos, solicitudes, sesiones y seguimiento.

El frontend actual utiliza una representación local reducida de esos datos para permitir la navegación antes de conectar la API.

## 8. Próximos avances previstos

1. Separar componentes y tipos en módulos del frontend.
2. Crear la API REST con Node.js y TypeScript.
3. Conectar la API con MariaDB.
4. Implementar autenticación segura y control de roles.
5. Sustituir los datos locales por servicios HTTP.
6. Implementar validaciones de formularios.
7. Incorporar paginación, edición completa y eliminación lógica.
8. Agregar pruebas unitarias y de integración.
9. Documentar endpoints y decisiones de arquitectura.

## 9. Decisiones de este avance

- Se priorizó una primera entrega visual y navegable.
- No se modificó el esquema de base de datos existente.
- No se conectó todavía la interfaz con MariaDB.
- Los cambios en usuarios, espacios y solicitudes permanecen en memoria y se pierden al recargar.
- La contraseña de demostración solo sirve para validar la navegación inicial y no representa el mecanismo de seguridad final.

## 10. Correcciones y ampliación

### Inicio de sesión corregido

El formulario ya no utiliza código de usuario como credencial. La regla actual es:

```text
Correo institucional + documento de identidad
```

El documento corresponde al campo `documento` de la tabla `Usuario` y al dato asociado en `Credencial`. En la implementación real, el backend deberá validar la relación entre ambos registros y nunca exponer el documento ni el hash de contraseña en la respuesta.

Credenciales demo disponibles en el frontend:

```text
Administrador: jaysonquintero@unitropico.edu.co / 1000000010
Tutor:         tutormatematica@unitropico.edu.co / 1007418843
Monitor:       brayhamlindarte.es@unitropico.edu.co / 1093432540
Estudiante:    mariaamezquita.es@unitropico.edu.co / 1029663952
```

### Portales por rol

Se añadieron portales navegables con menús diferenciados:

| Rol | Información disponible en este avance |
| --- | --- |
| Administrador | Usuarios, espacios, solicitudes y resumen administrativo |
| Tutor | Resumen, disponibilidad, sesiones e informes |
| Monitor | Resumen, horarios, solicitudes asignadas y sesiones |
| Estudiante | Resumen, nueva solicitud, mis solicitudes y mis sesiones |

La visibilidad del menú se encuentra diferenciada en el frontend. La autorización definitiva debe implementarse también en la API.

### Usuarios con múltiples roles

Se corrigió el modelo de sesión para separar los roles asignados al usuario del
rol activo de la navegación:

- `User.roles` contiene uno o varios roles permitidos.
- Después de autenticar, las cuentas multirrol muestran un modal con tarjetas
  seleccionables.
- Dentro de cualquier portal aparece `Cambiar rol`, que retorna al selector sin
  cerrar sesión.
- El usuario demo de Monitor también puede ingresar como Estudiante.

### Contrato de API

Se creó [api/openapi.yaml](./api/openapi.yaml) con OpenAPI 3.1. El contrato cubre:

- `/auth/login`, `/auth/select-role`, `/auth/me` y `/auth/logout`.
- `/portal/dashboard`.
- `/availability`, `/sessions` y `/monthly-reports`.
- `/users` y `/users/{id}`.
- `/spaces` y `/spaces/{id}`.
- `/requests` y `/requests/{id}`.

El contrato puede validarse con:

```powershell
cd C:\Users\brayh\acadex\api
npm install
npm run validate
```

## 11. Estado actualizado

| Área | Estado |
| --- | --- |
| Login por correo + documento | Implementado en demo local |
| Selección y cambio de rol | Implementado en demo local |
| Portal administrador | Implementado |
| Portal tutor | Implementado en demo local |
| Portal monitor | Implementado en demo local |
| Portal estudiante | Implementado en demo local |
| Contrato OpenAPI 3.1 | Creado y pendiente de conectar al backend |
| API REST Node.js | Pendiente de implementación |
| Persistencia MariaDB | Esquema existente, pendiente integración |
| Autorización real por rol | Pendiente de implementación en API |
