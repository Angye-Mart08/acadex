# BITACORA_PROYECTO — Gestión de Tutorías y Monitorías

## 1. Identificación

Proyecto web para la gestión de tutorías y monitorías académicas de Unitrópico.

Arquitectura prevista:

```text
React + TypeScript → API REST con Node.js + TypeScript → MariaDB
```

> **Vigencia:** las secciones 2 a 4 registran el prototipo inicial de interfaz.
> Las operaciones descritas allí como locales o en memoria fueron reemplazadas
> después por persistencia mediante la API; el estado vigente está resumido en
> las secciones 11 a 15.

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
- Validación contra `Usuario`, `Credencial`, `UsuarioRol` y `Rol` en MariaDB.
- Mensaje de error para credenciales inválidas o API no disponible.
- Selector modal de rol cuando la cuenta tiene más de un rol.
- Acceso al portal correspondiente sin exponer el documento de identidad.

Credencial base para verificar el flujo:

```text
Correo:      jaysonquintero@unitropico.edu.co
Documento:   1000000010
```

La sesión se conserva mediante JWT y permite cambiar entre roles asignados sin
cerrar sesión.

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
├── README_API.md
├── src/
│   ├── auth.ts
│   ├── config.ts
│   ├── data.ts
│   ├── db.ts
│   └── server.ts
├── tsconfig.json
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

Antes de levantar la interfaz, iniciar la API con MariaDB:

```powershell
cd C:\Users\brayh\acadex\api
npm install
npm run dev
```

La API prepara automáticamente la base en el primer arranque. No se debe
ejecutar un `DROP DATABASE` ni utilizar los datos del frontend como fuente de
persistencia.

Validación de compilación:

```powershell
cd C:\Users\brayh\acadex\web
npm run build
```

## 6. Estado técnico del avance

| Área | Estado |
| --- | --- |
| Frontend React + TypeScript | Implementado y conectado a servicios HTTP |
| Vite | Configurado |
| Diseño responsive | Implementado para escritorio, tablet y móvil |
| Login | Integrado con API y MariaDB |
| Usuarios | CRUD administrativo persistido en MariaDB |
| Espacios | CRUD administrativo persistido en MariaDB |
| Solicitudes | Consulta, creación estudiantil y cambios de estado persistidos |
| API REST Node.js | Implementada para autenticación y módulos principales |
| Persistencia MariaDB | Integrada; bootstrap automático y sin sobrescritura |
| Autenticación real | Correo institucional + documento, bcrypt y JWT |
| Roles y permisos reales | Rol activo validado en las rutas protegidas |

## 7. Fuentes de datos existentes

El archivo `database/gestion_monitorias_tutorias.sql` contiene el esquema y datos de prueba del dominio, incluyendo usuarios, credenciales, roles, espacios físicos, solicitudes, sesiones y seguimiento.

La API ya trae desde MariaDB los usuarios, roles, espacios, solicitudes,
estudiantes, programas, asignaturas, tipos de solicitud y periodos necesarios
para los módulos implementados. Las sesiones, horarios, asistencia,
seguimiento, compromisos, evidencias e informes están modelados y cargados en
la base, pero sus vistas y operaciones se incorporarán en los siguientes
avances.

## 8. Próximos avances previstos

1. Integrar las pantallas de disponibilidad, horarios y sesiones.
2. Integrar informes, asistencia, seguimiento, compromisos y evidencias.
3. Completar validaciones de formularios y mensajes de operación.
4. Agregar pruebas unitarias y de integración con MariaDB temporal.
5. Incorporar paginación real y filtros avanzados.
6. Documentar despliegue y configuración de producción.

## 9. Decisiones de este avance

- Se mantiene la separación `web` → `api` → `database`.
- MariaDB es la fuente de verdad de los módulos ya integrados.
- El bootstrap se ejecuta solo cuando la base no tiene tablas; no borra bases ni datos existentes.
- Las eliminaciones administrativas son lógicas para conservar trazabilidad.
- Los datos iniciales de credenciales se actualizan a bcrypt después del primer login válido.

## 10. Correcciones y ampliación

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

### Portales por rol

Se añadieron portales navegables con menús diferenciados:

| Rol | Información disponible en este avance |
| --- | --- |
| Administrador | Usuarios, espacios, solicitudes y resumen administrativo |
| Tutor | Resumen, disponibilidad, sesiones e informes |
| Monitor | Resumen, horarios, solicitudes asignadas y sesiones |
| Estudiante | Resumen, nueva solicitud, mis solicitudes y mis sesiones |

La visibilidad del menú se encuentra diferenciada en el frontend y el token de
acceso incluye el rol activo para que la API pueda aplicar autorización.

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
| Login por correo + documento | Implementado con API y MariaDB |
| Selección y cambio de rol | Implementado con token preliminar y JWT |
| Portal administrador | Implementado |
| Portal tutor | Navegable; integración de sesiones pendiente |
| Portal monitor | Navegable; solicitudes filtradas por API |
| Portal estudiante | Navegable; creación y consulta de solicitudes integrada |
| Contrato OpenAPI 3.1 | Actualizado y validado |
| API REST Node.js | Implementado para autenticación, usuarios, espacios y solicitudes |
| Persistencia MariaDB | Integrada para lectura y escritura de los módulos principales |
| Autorización real por rol | JWT con rol activo implementado |

## 12. Corrección de instalación de MariaDB

La instalación inicial fallaba al crear `HorarioMonitor` porque esa tabla
declaraba claves foráneas hacia `PeriodoAcademico` y `Espacio` antes de que
esas tablas existieran. Se corrigió el orden lógico agregando esas relaciones
con `ALTER TABLE` después de crear las tablas referenciadas.

La instalación fue validada desde cero en una base temporal de MariaDB y
finalizó correctamente. La base local contiene 36 tablas y puede visualizarse
en HeidiSQL con el usuario `tutorias_app`.

## 13. Bootstrap automático e integración de datos

Se implementó `api/src/db.ts` para que el primer arranque siga este flujo:

1. Intenta conectarse con la cuenta de aplicación.
2. Si la base o la cuenta no están disponibles, utiliza las credenciales de
   `DATABASE_BOOTSTRAP_USER`.
3. Crea la base con `IF NOT EXISTS` y el usuario de aplicación con permisos
   limitados.
4. Carga el esquema únicamente cuando no hay tablas.
5. Si existe un esquema parcial, detiene el arranque y no lo sobrescribe.

La instalación se probó con una base y un usuario temporales inexistentes; se
crearon 36 tablas y posteriormente se eliminaron solo esos recursos de prueba.
La base real se verificó con 36 tablas, 9 usuarios, 19 espacios, 7 solicitudes
y 24 asignaturas.

Se implementó `api/src/data.ts` con consultas y operaciones persistentes para:

- Usuarios y roles múltiples.
- Espacios físicos.
- Solicitudes administrativas y solicitudes creadas por estudiantes.
- Catálogo de asignaturas.
- Indicadores del dashboard.

El frontend dejó de usar los arreglos locales como fuente principal para estos
módulos. Al recargar, vuelve a solicitar los datos al API y las operaciones se
pueden comprobar en HeidiSQL.

## 14. Verificación reproducible

```powershell
cd C:\Users\brayh\acadex\api
npm run typecheck
npm run validate
```

Con la API ejecutándose, `http://localhost:3000/health` debe responder con
`database: connected`. En HeidiSQL se debe revisar la base
`gestion_monitorias_tutorias` y confirmar las tablas y registros descritos en
[database/README.md](./database/README.md).

`npm run typecheck` no comprueba los módulos marcados con `@ts-nocheck`; esa
supresión sigue pendiente de retirarse gradualmente para que el resultado sea
una verificación completa de tipos.

## 15. Estabilidad del acceso administrativo

- CORS en desarrollo reconoce `localhost` y `127.0.0.1` si coinciden el
  protocolo y el puerto configurados; en producción solo acepta los orígenes
  explícitos.
- La aplicación React captura errores de renderizado para evitar que una
  excepción al montar un módulo deje la página completamente en blanco. El
  detalle queda en la consola del navegador y la pantalla ofrece recarga.
- Antes de diagnosticar el dashboard, comprobar `/health`, el proceso API y el
  origen exacto del navegador. La guía de arranque y endpoints está en
  [README_API.md](./api/README_API.md).

## 16. Corrección del dashboard administrativo

La prueba con la base local reprodujo la pantalla en blanco: para el rol
Administrador, `GET /requests` devolvía un arreglo, mientras que el frontend y
OpenAPI esperan `{ data, pagination }`. La inicialización guardaba `undefined`
en el estado de solicitudes y el dashboard fallaba al filtrar.

Se corrigió `listAdminRequests` para devolver el mismo envoltorio paginado que
los demás roles y aplicar los parámetros de búsqueda y página. La prueba real
confirmó 7 solicitudes en la primera página; login, dashboard y las cinco
secciones administrativas cargaron sin errores React. También se probaron los
portales Tutor, Monitor y Estudiante y el cambio de rol Monitor→Estudiante.

## 17. Homogeneización visual y responsive

La revisión del dashboard detectó que los selectores de gráficos no tenían
reglas CSS: los paneles aparecían apilados y sin espaciado. Se completó el tema
compartido en `web/src/brand-theme.css` para gráficas, resúmenes, reportes,
configuración, tablas, filtros, perfiles de rol, mensajes y modales.

Los gráficos usan dos columnas en escritorio y una en móvil. Los formularios de
configuración se adaptan al ancho disponible; tablas de resumen ya no generan
scroll interno innecesario; los modales altos permiten desplazamiento y las
casillas de roles conservan tamaño y alineación propios. Se comprobó el
dashboard, los reportes, configuración y el modal de usuario en navegador.

La tabla de sesiones de reportes mostraba timestamps UTC para datos que son
fechas sin hora. La consulta ahora serializa `fecha` como `YYYY-MM-DD`, evitando
la hora artificial y manteniendo el mismo formato del resto de la API.

## 18. Formularios y controles visibles

- Las asignaturas de Tutor y Monitor usan un desplegable multiselección cargado
  desde el catálogo activo de MariaDB. Los formularios de solicitud estudiantil
  y administrativa también usan el catálogo de asignaturas.
- El programa de una solicitud administrativa se deriva del perfil del
  estudiante seleccionado. El programa aparece en la opción del estudiante y
  la creación valida que tenga un programa activo.
- La ubicación de espacios se compone desde edificio, bloque, salón y piso; ya
  no se solicita un segundo texto de ubicación libre.
- Ambos shells muestran el periodo activo de `PeriodoAcademico`; el endpoint
  autenticado `/catalogs/periods` está en el servidor, OpenAPI y la guía API.
- Se retiraron la campana sin servicio, el contador fijo, la segunda salida de
  sesión, el enlace de recuperación sin destino y acciones de calendario,
  disponibilidad e informes sin operación conectada. El acceso de soporte
  abre el correo institucional.
- Se eliminaron los arreglos de demostración de la carga inicial y el respaldo
  de solicitudes ajenas en el portal estudiante. Las métricas personales usan
  las solicitudes del API, y una cuenta sin registros ve un estado vacío real.
- La fecha del portal se calcula al abrirlo y no contiene un día fijo de prueba.

## 19. Agenda de portales

Se implementaron consultas autenticadas de solo lectura para disponibilidad y
sesiones. Tutor obtiene bloques de `Disponibilidad` ligados a sus asignaciones;
Monitor obtiene `HorarioMonitor`; las sesiones se filtran por estudiante o por
asignación activa del rol. Los portales ahora muestran registros reales o un
estado vacío, en lugar de citas de muestra. Las escrituras de agenda e informes
personales siguen pendientes.
