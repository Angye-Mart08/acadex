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

## 20. Optimización integral de formularios, control directo de MariaDB y depuración de redundancias

Para responder a los requerimientos de usabilidad, integridad de datos y control operativo de la base de datos, se dividió y ejecutó la tarea en las siguientes partes documentadas:

### Parte 1: Asignaturas dinámicas y selectores avanzados desde MariaDB
- Se integró el catálogo completo de 24 asignaturas almacenadas en la base de datos `gestion_monitorias_tutorias`.
- En la asignación de perfiles de Tutor y Monitor, se implementó el componente `SubjectMultiSelect`, el cual incluye buscador en vivo por código o nombre, etiquetas/chips visuales removibles, acciones de selección rápida («Todas», «Limpiar») y contador dinámico.
- En los formularios de solicitud de acompañamiento (estudiantil y administrativo), las asignaturas se presentan en listas desplegables con el formato institucional unificado `[CÓDIGO] Nombre de Asignatura` (ej. `[MAT101] Matemáticas básicas`), garantizando claridad académica y consistencia de IDs en la persistencia.

### Parte 2: Eliminación de redundancias en formularios y modelos
- **Formulario de Usuarios**: Se eliminó la solicitud duplicada del código estudiantil cuando ya existe el código institucional principal, utilizándolo como fallback automático y añadiendo un selector de semestre acotado (1 al 12). Los campos libres de categoría docente y tipo de vinculación fueron convertidos a listas desplegables curadas.
- **Formulario de Espacios**: Se eliminó el campo redundante de texto libre «Ubicación detallada» que duplicaba los campos de Edificio, Bloque, Salón y Piso. En su lugar se incorporó una insignia dinámica de previsualización (`.location-preview-badge`) que calcula en tiempo real la nomenclatura oficial y un campo opcional de referencia de acceso.
- **Limpieza de código muerto**: Se eliminaron completamente las funciones obsoletas y no utilizadas `LegacySpacesView` y `LegacyRequestsView` que duplicaban lógica en el archivo principal.

### Parte 3: Funcionalidad completa de elementos visuales
- **Chip de Periodo Académico (2026-2)**: El indicador con punto verde junto a «Periodo 2026-2», cuyo propósito resultaba ambiguo, fue transformado en un botón interactivo institucional (`.period-chip.interactive`). Al hacer clic, abre un modal explicativo (`PeriodModal`) que detalla el ciclo académico vigente, el estado activo para registro de solicitudes y la entidad en MariaDB (`PeriodoAcademico`).
- **Botón «Ver calendario» en Solicitudes**: El botón inactivo de la vista administrativa de solicitudes fue conectado a un nuevo modal cronológico (`CalendarModal`), el cual resume el conteo por estados (totales, pendientes, en curso, atendidas) y lista en tarjetas ordenadas por fecha cada solicitud registrada.
- **Banner de Estudiante en Solicitudes**: Al seleccionar un estudiante para radicar una solicitud administrativa, se despliega una tarjeta de confirmación (`.student-selected-banner`) con su código y programa académico activo.

### Parte 4: Unificación de cierre de sesión y navegación limpia
- Se eliminó la redundancia de múltiples formas de salida del sistema. El cierre de sesión se centralizó de manera exclusiva y uniforme en el menú desplegable del perfil institucional (`ProfileMenu`), ubicado en la esquina superior derecha del shell, tanto para Administrador como para roles de portal.
- El selector inicial de rol únicamente ofrece la opción de salida en caso de que el usuario decida abortar la selección antes de ingresar al portal.

### Parte 5: Control, inspección y auditoría directa de MariaDB
- **Script de inspección en terminal**: Se desarrolló `api/scripts/inspect-db.mjs` y se registró el comando `npm run db:inspect` (ejecutable desde la raíz o desde `api/`). Este comando abre la conexión con MariaDB en `127.0.0.1:3306`, enumera las 36 tablas y renderiza tablas formateadas en consola con los últimos registros de `Usuario`, `Espacio` y `Solicitud`, permitiendo verificar al instante cualquier cambio de las operaciones CRUD.
- **Panel web en vivo**: Se creó el endpoint `GET /api/v1/admin/db-status` y se incorporó en la sección de Configuración el módulo `DatabaseControlPanel`. Este panel expone el estado del motor, base de datos activa, puerto y métricas de registros en tiempo real con un botón de refresco inmediato.
- **Acceso mediante clientes gráficos**: Se documentaron los parámetros oficiales para abrir la base en HeidiSQL, DBeaver o DataGrip, y se creó el script `fix-db-user.mjs` para asegurar privilegios consistentes para el usuario de aplicación `tutorias_app`.

### Parte 6: Corrección de conectividad de la API y ejecución unificada
- Se solucionó el error de fallo de conexión en el inicio de sesión relajando la validación CORS en modo desarrollo para admitir cualquier puerto en `localhost` y `127.0.0.1`.
- Se configuró el proxy reverso `/api` en `web/vite.config.ts` hacia `http://127.0.0.1:3000` y se implementó un mecanismo de reintento transparente en `web/src/api.ts` ante discrepancias de resolución local.
- Se creó un `package.json` raíz y el script `scripts/start-dev.mjs`, permitiendo iniciar tanto la API como el frontend de forma integrada con un único comando: `npm run dev`.

## 21. Blindaje de conectividad cliente-servidor y verificación end-to-end

Para erradicar por completo el fallo reportado en el inicio de sesión («No fue posible conectar con el servidor. Verifica que la API esté ejecutándose») y garantizar estabilidad permanente en cualquier configuración de red local, se implementaron las siguientes medidas técnicas definitivas:

1. **Estrategia multi-candidato resiliente en el cliente web (`web/src/api.ts`)**:
   - El cliente web intenta en primer lugar el proxy transparente relativo `/api/v1` de Vite. Al ser una petición de mismo origen (*same-origin*), elimina completamente restricciones de CORS, peticiones *preflight* OPTIONS y problemas de resolución de nombres de host.
   - En caso de indisponibilidad o error 502/504 en el proxy, el cliente conmuta de forma automática e inmediata a conexiones directas sobre `http://localhost:3000/api/v1` y `http://127.0.0.1:3000/api/v1`.
   - Si ninguna de las vías responde, arroja un diagnóstico claro con instrucciones exactas de comando (`npm run dev`) y estado de MariaDB en puerto 3306.

2. **Alineación del servidor Express (`api/src/server.ts`)**:
   - Se configuró el enlace de red explícito a `0.0.0.0` en `app.listen(config.port, '0.0.0.0')`, resolviendo la ambigüedad de pila dual IPv4/IPv6 en Windows 11 donde `localhost` puede asociarse a `::1` mientras los clientes esperan `127.0.0.1`.
   - Se expuso la ruta de comprobación de salud tanto en `/health` como en `/api/v1/health` retornando `{ status: 'ok', database: 'connected' }`.
   - Se flexibilizó CORS en desarrollo (`process.env.NODE_ENV !== 'production'`) admitiendo cualquier origen y puerto sin rechazos de cabeceras.

3. **Verificación visual y de interacción en navegador real**:
   - Mediante un subagente de navegación con grabación WebP (`login_and_features_verification`), se validó en vivo:
     * El formulario de inicio de sesión institucional con la cuenta `jaysonquintero@unitropico.edu.co` y documento `1000000010`.
     * Autenticación exitosa y carga del panel de Administración con datos reales de MariaDB.
     * Apertura y cierre del modal explicativo del periodo académico (`PeriodModal`) desde el chip interactivo.
     * Apertura del modal cronológico de solicitudes (`CalendarModal`) desde el botón «Ver calendario».
     * Carga del panel **Control y Observación de MariaDB** en Configuración, confirmando motor `connected`, 36 tablas activas y conteos en vivo.

## 22. Corrección del registro de usuarios, completitud del CRUD con eliminación definitiva y códigos institucionales autogenerados

Para atender los requerimientos de corrección del registro de usuarios, culminar el CRUD administrativo con la operación de eliminación física y estandarizar la generación coherente y no editable de códigos institucionales en todos los formularios, se implementaron las siguientes soluciones:

### 1. Diagnóstico y corrección del registro de usuarios
- **Causa raíz**: El formulario web enviaba el atributo en español `semestre`, mientras que el esquema de validación Zod en `api/src/admin.ts` (`studentProfileSchema`) exigía estrictamente la clave `semester: z.coerce.number()`. Al ser `undefined`, la coerción resultaba en `NaN`, detonando un error HTTP 422 `VALIDATION_ERROR` que impedía crear usuarios con el rol de Estudiante.
- **Solución**:
  - En la API (`api/src/admin.ts`), se flexibilizó el esquema aceptando tanto `semester` como `semestre`:
    ```typescript
    semester: z.preprocess((val) => val, z.coerce.number().min(1).max(12).optional()),
    semestre: z.preprocess((val) => val, z.coerce.number().min(1).max(12).optional())
    ```
    y se normalizó la lectura garantizando el valor numérico en la inserción a la tabla `Estudiante`.
  - En el cliente web (`web/src/App.tsx`), se envía de forma transparente `{ semester: num, semestre: num }` para compatibilidad total.
  - Se probó la creación de usuarios con múltiples roles y estudiantes, confirmando inserción exitosa tanto en `Usuario`, `Credencial`, `UsuarioRol` y `Estudiante`.

### 2. CRUD completo del Administrador: Implementación de la función Eliminar
Previamente, el sistema solo disponía de Crear, Editar y «Desactivar» (que únicamente actualizaba `estado = 'Inactivo'`). Se diseñó e implementó la función de **Eliminación Física Definitiva (`DELETE`)** con borrado seguro en cascada en MariaDB:

- **Eliminación de Usuarios (`DELETE /api/v1/users/:id`)**:
  - En `api/src/admin.ts`, se desarrolló la función `deleteAdminUser(id, currentUserId)` que ejecuta una transacción coordinada eliminando los registros dependientes en:
    `EntregaActividad` -> `Seguimiento` -> `Solicitud` -> `SesionAcompanamiento` -> `HistorialSesion` -> `Informe` -> `EstudiantePrograma` -> `Estudiante` -> `Disponibilidad` -> `AsignacionAcademica` -> `HorarioMonitor` -> `Tutor` -> `Monitor` -> `Administrador` -> `Credencial` -> `UsuarioRol` -> `Usuario`.
  - **Salvaguarda de seguridad**: Se incluyó la validación obligatoria que impide que el usuario administrador en sesión pueda autoeliminarse (`if (id === currentUserId) throw new HttpError(400, 'No es posible eliminar tu propio usuario en sesión.')`).
  - En la interfaz web (`UsersView`), se diferenció la acción «Desactivar» / «Activar» del botón rojo de peligro **«Eliminar»**, el cual solicita confirmación explícita antes de ejecutar el borrado en MariaDB y retira el registro de la vista.

- **Eliminación de Espacios (`DELETE /api/v1/spaces/:id`)**:
  - En `api/src/admin.ts`, se implementó `deleteAdminSpace(id)` con limpieza previa en cascada de `HorarioMonitor` y `AsignacionEspacio` antes de borrar la fila en `Espacio`.
  - En la interfaz web (`SpacesView`), se incorporaron tres acciones independientes para cada tarjeta:
    1. **Activar / Desactivar**: Alterna el estado operativo entre `Activo` e `Inactivo`.
    2. **Editar**: Abre la ficha para actualizar datos físicos y recursos.
    3. **Eliminar** (acción destructiva): Borra permanentemente el espacio de MariaDB.

- **Eliminación de Solicitudes (`DELETE /api/v1/requests/:id`)**:
  - Se creó el endpoint `DELETE /api/v1/requests/:id` en `api/src/server.ts` con protección `requireSession` y `requireRole('Administrador')`.
  - En `api/src/admin.ts`, se desarrolló `deleteAdminRequest(id)` con eliminación previa en cascada de `HistorialSesion`, `Informe` y `SesionAcompanamiento`.
  - En `web/src/api.ts`, se integró y exportó la función `deleteRequest(accessToken, id)`.
  - En la tabla de Solicitudes (`RequestsView`), se añadió el botón de acción con icono de papelera (`Trash2`) para borrado definitivo.

### 3. Códigos institucionales estructurados, aleatorios y de solo lectura (`readOnly`)
Para cumplir la directriz de que ningún usuario pueda escribir manualmente el código institucional y que este se genere de forma coherente según la entidad y el rol:

- **Estructura coherente de nomenclatura**:
  - **Administrador**: Prefijo `ADM` seguido de 3 dígitos numéricos aleatorios (ej. `ADM482`).
  - **Tutor**: Prefijo `TUT` seguido de 3 dígitos numéricos aleatorios (ej. `TUT719`).
  - **Monitor**: Prefijo `MON` seguido de 3 dígitos numéricos aleatorios (ej. `MON305`).
  - **Estudiante**: Prefijo `EST` seguido de 3 dígitos numéricos aleatorios (ej. `EST640`).
  - **Espacios físicos y virtuales**:
    * Aulas: `AUL-###` (ej. `AUL-104`).
    * Laboratorios: `LAB-###` (ej. `LAB-202`).
    * Salas generales: `SAL-###` (ej. `SAL-301`).
    * Salas de informática: `INF-###` (ej. `INF-502`).
    * Bibliotecas: `BIB-###` (ej. `BIB-101`).
    * Salones de reuniones: `REU-###` (ej. `REU-405`).
    * Espacios virtuales: `VIR-###` (ej. `VIR-801`).
    * Otros: `ESP-###`.
  - **Radicados de Solicitudes**: Formato `RAD-YYYY-####` (ej. `RAD-2026-4891`).

- **Reglas aplicadas a todos los formularios**:
  1. **Campo no editable**: Todos los inputs de código institucional poseen el atributo `readOnly` y estilos visuales específicos (`.readonly-code-input`, fondo protegido y cursor neutral), impidiendo la edición manual directa.
  2. **Actualización reactiva por selección**: Al cambiar el rol en el formulario de usuarios, o el tipo de espacio en el formulario de espacios, el código se actualiza automáticamente adoptando el prefijo correspondiente.
  3. **Botón de regeneración aleatoria**: Se incorporó un botón adyacente (`.regenerate-code-btn`) con icono de actualización que permite generar una nueva combinación aleatoria respetando la unicidad frente a los registros existentes.
  4. **Sincronización de perfil de estudiante**: En el formulario de perfiles específicos, el campo «Código estudiantil» permanece sincronizado en modo solo lectura con el código institucional asignado.
  5. **Formulario de solicitud estudiantil**: Muestra el código institucional asignado a la cuenta del estudiante en solo lectura para verificación de identidad antes del envío.

## Actualización: preparación del MVP

Se alineó el backend y la documentación con los requisitos de entrega del MVP:

- Se completó el cuarto CRUD administrativo para `PeriodoAcademico`, con validación de fechas, control de periodo activo y prevención de borrado cuando existen asignaciones, horarios o solicitudes asociadas.
- Se endureció el cambio de estado de solicitudes mediante transiciones explícitas y se añadieron validaciones de formato y contenido en parámetros y solicitudes recibidas.
- El inicio de sesión utiliza contraseña; las contraseñas nuevas se almacenan con bcrypt, las cuentas legadas del SQL local se migran en desarrollo y se exige reemplazar las claves temporales antes de usar el resto de la API. En producción se rechazan claves que no estén hasheadas.
- El restablecimiento de credenciales genera una clave temporal aleatoria que solo aparece en la respuesta de esa operación. Las listas y exportaciones administrativas ya no incluyen documentos ni contraseñas.
- La configuración de producción exige un `JWT_SECRET` aleatorio de al menos 32 caracteres. El cierre de sesión del servidor se documenta como limpieza local del token: el JWT sigue siendo válido hasta expirar.
- Se incorporó administración de periodos en la interfaz, se retiraron valores ficticios del estado de MariaDB y se actualizó la especificación OpenAPI y la guía de endpoints.
- El validador del contrato comprueba la sintaxis YAML y compara métodos/rutas declarados con los registrados en el router.

Esta actualización deja el código y la documentación preparados para la revisión del MVP. La demostración funcional en vivo y las dos cápsulas técnicas de los grupos 1 y 4 todavía deben prepararse y realizarse el jueves 15 de octubre.

## Actualización: formularios, espacios y solicitudes asignadas

- Se refinó la presentación de formularios modales: espaciado más claro, controles de lectura cómodos, indicaciones visibles, acciones accesibles al desplazarse y adaptación a pantallas estrechas. Se mantienen los estilos comunes para evitar diferencias visuales entre módulos.
- El alta de espacios ahora recupera el registro directamente por la clave primaria generada después del `INSERT`, sin depender del listado para confirmar la respuesta. Se añadieron respuestas de validación entendibles para duplicados y formatos rechazados por MariaDB.
- El administrador puede asignar una solicitud Pendiente o Aprobada a un Tutor o Monitor activo que tenga la misma asignatura y periodo. La operación crea transaccionalmente una primera sesión en `Sesion` y cambia la solicitud a `Asignada`; no se permite forzar ese estado sin crear la relación operativa.
- Los portales de Tutor y Monitor muestran sus solicitudes asignadas de acuerdo con el rol activo. El responsable puede marcar la atención como realizada, lo que actualiza la sesión y la solicitud a `Atendida`.
- Se documentaron ambas operaciones nuevas en OpenAPI 3.1. La asignación reutiliza `Sesion.id_solicitud` y `Sesion.id_asignacion`; no requiere migración del esquema.
- Validación pendiente de entorno: confirmar el flujo completo con cuentas que tengan asignaciones activas de prueba y verificar en MariaDB una creación/edición/eliminación de espacio y la asignación/atención de una solicitud.

## Actualización: formularios adaptables y asignación al radicar

- Se estandarizaron los tamaños de formularios de creación y edición (incluidos los CRUD), el ancho de modales, controles, espaciado y acciones para móvil/escritorio. Los formularios extensos conservan scroll accesible sin desbordar la ventana.
- Los campos marcados `required` muestran `*` y cada formulario con campos requeridos incluye la leyenda «* Campo obligatorio».
- En la creación administrativa de una solicitud, Monitoría filtra personal Monitor, Tutoría filtra Tutor y Acompañamiento deja escoger entre ambos roles. La lista exige coincidencia de materia y periodo.
- Al elegir una persona elegible se solicitan fecha, horario y modalidad, y al guardar se crea la solicitud y se programa su primera sesión. Si el sistema no ofrece personal elegible, la solicitud se puede crear y asignar desde la gestión administrativa posteriormente.
- Se añadió una acción directa y visible de «Cerrar sesión» a la barra superior en pantallas pequeñas, tanto en el espacio administrativo como en los portales personales.
- Verificaciones: compilación/typecheck del frontend y revisión en navegador de anchos móvil pendientes de ejecutar tras esta actualización.

### Ajuste de perfiles académicos del mismo día

- Tutor y Monitor ahora seleccionan exactamente una asignatura en el formulario de crear/editar usuario; el servidor rechaza perfiles sin asignatura o con más de una.
- Se retiró el selector múltiple y sus estilos que quedaron obsoletos. Las asignaturas existentes se muestran con una única selección inicial al editar.
- La acción de cierre de sesión permanece visible en móvil y se compacta a un botón de icono accesible en pantallas de hasta 380 px.
- Se aplica una presentación común a los formularios con validación nativa: controles compactos, rejilla adaptable y asterisco/leyenda de obligatoriedad.
- Verificación de esta actualización: `npm run build` en `web`, `npm run typecheck` en `api`, `npm run validate` del contrato OpenAPI y `git diff --check` finalizaron correctamente. No se ejecutó una comprobación visual manual en varios tamaños de pantalla ni se escribieron datos en MariaDB.

## Mejora 1 de 10: validaciones de formularios y API

- Se alinearon las validaciones del navegador y los esquemas de API para los datos de usuario, perfiles, solicitudes, espacios, periodos y programación de sesiones.
- Las cuentas nuevas y el inicio de sesión validan correo institucional `@unitropico.edu.co`; se normaliza a minúsculas. Documento de identidad: entre 5 y 20 dígitos; nombre: al menos nombre y apellido; los campos de perfil se limitan a los máximos del esquema.
- En perfiles de estudiante se limita el semestre a 1–12 y se exige que el código estudiantil coincida con el código de usuario. Si también es Administrador, el correo del perfil debe coincidir con el de la cuenta.
- Los espacios validan capacidad entera, formato permitido del código, longitudes y tipos admitidos. Las solicitudes validan longitudes y contenido no vacío; una sesión asignada debe caer dentro del periodo académico asociado y no puede tener fecha pasada.
- Los esquemas anidados del CRUD administrativo ahora rechazan campos desconocidos y datos fuera de sus límites.
- Verificación de la mejora 1: compilación de producción del frontend (`npm run build`) y revisión de tipos de API (`npm run typecheck`) correctas. La validación con registros reales de MariaDB se deja para la mejora 2 y auditoría de la base; no se escribieron datos durante esta mejora.

## Mejora 2 de 10: restricciones de integridad en MariaDB

- Se reforzó el DDL principal con límites para semestres, créditos, horas semanales, capacidad y duración, además de coherencia de fechas y horarios en asignaciones, espacios, sesiones, reportes, recuperaciones y compromisos.
- Se agregó `database/migrations/001_integridad_datos.sql` para instalaciones que ya existen. Incluye consultas previas de solo lectura y ALTER explícitos; requiere respaldo, conteos en cero y aplicación manual una sola vez. No recrea la base ni borra o transforma datos.
- Las reglas que dependen de más de una tabla (por ejemplo, que una sesión corresponda a la misma asignatura y periodo que la solicitud) continúan protegidas por validación transaccional en la API.
- Documentación de aplicación y límites en `database/README.md` y `docs/modelo-datos.md`.
- Verificación: inspección de consistencia de reglas/DDL y `git diff --check`; no se ejecutó la migración ni se modificó la base local. La comprobación de datos existentes queda para la mejora 3 (auditoría), antes de recomendar su aplicación.

## Mejora 3 de 10: auditoría de base de datos

- Se creó `api/scripts/audit-db-integrity.mjs` y el comando `npm run db:audit`. La auditoría corre con transacción de solo lectura y no muestra PII ni contraseñas/hashes.
- Resultado medido en MariaDB 12.3.3: 36 tablas (todas InnoDB), 55 claves foráneas, 26 restricciones `UNIQUE`, cero referencias huérfanas y seis restricciones `CHECK` instaladas.
- Hallazgos: cuatro credenciales no reconocidas como bcrypt; seis diferencias entre el código del perfil Estudiante y el código de Usuario; una persona con más de una asignatura activa para un rol; una sesión cuya asignatura o periodo difiere de la solicitud relacionada. La auditoría no detectó perfiles activos sin rol, correo no institucional, programa estudiantil ausente ni rangos horarios invertidos.
- La instalación no contiene 14 nuevas restricciones `CHECK`; se conservan dos validaciones horarias preexistentes. Remediar inconsistencias antes de usar datos reales; aplicar la migración solo si sus conteos de prevalidación son cero.
- No se corrigieron datos automáticamente: los cambios a credenciales y relaciones operativas requieren un proceso de remediación revisado. Resultados agregados documentados en `database/README.md`, `api/README_API.md` y `docs/modelo-datos.md`.

## Mejora 4 de 10: registro de espacios

- El formulario ya no inventa `Campus Principal` como ubicación para un espacio físico sin ubicación. Exige al menos edificio, bloque, salón o referencia; los espacios Virtuales pueden omitirse. La vista previa ahora incorpora la referencia y el frontend impide superar los 200 caracteres de `Espacio.ubicacion`.
- La API valida rangos, tipo, formato y longitudes de cada campo. La creación inserta y recupera por ID dentro de una única transacción, evitando informar error después de haber dejado el registro guardado. Conserva el mensaje específico para código duplicado.
- Verificación: typecheck y compilación de producción correctos; el API rechazó ubicación física vacía; prueba integrada con MariaDB creó y leyó un espacio temporal, y luego eliminó ese mismo registro. No quedan datos de prueba.
- Documentación actualizada en `api/README_API.md` y `database/README.md`.

## Mejora 5 de 10: validación de borrados CRUD

- Los borrados de usuario ya no purgan sesiones, solicitudes, informes ni seguimiento. Se permiten únicamente sin historial/dependencias; bloquean autoeliminación, el último Administrador activo y las relaciones académicas, con mensajes que indican desactivar la cuenta para preservar datos.
- El espacio se elimina solo si no tiene horarios, reservas ni sesiones. Una solicitud solo si no está asignada/atendida/finalizada y no tiene sesiones ni clasificaciones. Un periodo no se elimina si está Activo o tiene asignaciones, horarios o solicitudes.
- Se bloquearon condiciones bajo transacción (`SELECT ... FOR UPDATE`) y se conserva la protección de las claves foráneas como defensa final. El frontend confirma cada operación con reglas explícitas y presenta los errores de API.
- OpenAPI actualizado para los estados HTTP `400/409` y el nuevo alcance de las operaciones.
- Verificación integrada en MariaDB: el borrado de un usuario con historial, un espacio en uso, una solicitud con sesión y un periodo en uso devolvió `409` en los cuatro casos, sin borrar registros. Typecheck API, build web y contrato OpenAPI correctos.
- Se corrigió la guía de eliminación que antes describía borrado en cascada; la bitácora histórica se conserva y esta entrada documenta el cambio de política.

## Mejora 6 de 10: log de navegación en tiempo real

- Se agregó `web/src/navigation-log.ts` y su integración en el componente principal. Cada cambio efectivo de vista, una vez autenticado y con rol seleccionado, emite una traza con timestamp ISO, rol y clave de vista.
- En modo desarrollo la traza aparece en consola como `[Acadex navigation]` y dispara el evento de navegador `acadex:navigation` para que herramientas locales puedan suscribirse en tiempo real.
- Por privacidad, el evento no contiene nombre, correo, ID de usuario, tokens, query strings ni contenido de formularios; no se guarda en base de datos ni se envía a servicios externos. No corre en build de producción.
- La verificación de compilación del frontend se ejecutará junto con la validación general de esta secuencia.

## Mejora 7 de 10: proporción y tamaño de modales

- Los modales usan un ancho compacto (500 px) o ancho de formulario (740 px), centrado y limitado al 88–90 % de la altura disponible. En móvil ocupan el ancho útil y respetan el alto del viewport dinámico.
- El encabezado queda fijo/visible, el contenido del formulario tiene scroll propio y las acciones sticky permanecen accesibles; se evita que formularios extensos se conviertan en un bloque vertical que salga de pantalla.
- Se reforzó la semántica accesible del diálogo con `role=dialog`, `aria-modal`, título y descripción asociados.
- Verificación de compilación de producción del frontend correcta. Falta inspección visual manual en dispositivo/emulador pequeño; el navegador nativo no se usó en esta revisión.

## Mejora 8 de 10: organización de configuración y perfil Estudiante

- Configuración se agrupó por propósito en **Operación académica** (estado de MariaDB y periodos) y **Seguridad** (credenciales/cambio de contraseña), con jerarquía visual y encabezados descriptivos.
- Se eliminó del formulario Estudiante el campo visible de código estudiantil, duplicado del código institucional general. Al guardar, la API sigue recibiendo el mismo código sincronizado del usuario para preservar compatibilidad del modelo, pero el usuario ya no lo digita ni lo ve repetido.
- Los controles de semestre y programa quedan juntos en la misma ficha de rol. El panel de parámetros se conserva por ahora; su eliminación corresponde al punto 10.
- Verificación: `npm run build` del frontend (TypeScript y Vite) correcto. No se alteró la estructura de la base para retirar el control redundante.

## Mejora 9 de 10: entrega segura de credenciales

- Se añadió `POST /admin/configuration/credentials/export`, limitado a un rol y 500 cuentas activas por operación. La administración confirma el alcance antes de proceder.
- Se generan claves aleatorias nuevas por cuenta dentro de una transacción; la contraseña anterior queda invalidada, se guarda solo el hash bcrypt y el primer acceso exige cambiarla. El administrador solicitante queda excluido; se mantiene separado el listado CSV sin secretos.
- El CSV de entrega solo recibe esos temporales una vez; incluye datos necesarios para identificar la cuenta, se protege contra fórmulas CSV y no se escriben claves en consola/logs. La UI advierte compartir por canal seguro y eliminar el archivo después.
- El restablecimiento individual también se acota a cuentas activas, bloquea el autorrestablecimiento desde el módulo de credenciales y valida que exista credencial.
- No se configuró envío de correo: el proyecto no tiene SMTP institucional autorizado. El equipo debe solicitar host/puerto/cuenta/gestión de secretos antes de habilitar correo automático.
- Verificación de tipo/API/OpenAPI/frontend registrada al cierre; no se rotaron credenciales reales en MariaDB para probar exportación masiva, pues eso invalidaría contraseñas de cuentas activas. La ruta está versionada y validada por contrato.

## Mejora 10 de 10: retiro de parámetros institucionales de la interfaz

- Se retiró de Configuración del administrador el panel «Parámetros institucionales» y la carga/guardado de esos valores desde la vista React. La pantalla queda enfocada en operación académica, credenciales y cambio de contraseña.
- Se conservaron deliberadamente la tabla `Configuracion`, los endpoints de configuración y sus datos en MariaDB. Esta mejora es de alcance visual/funcional de la interfaz: no incluye migraciones ni borrados de datos ni de contrato.
- Verificación: build, typecheck, contrato y `git diff --check` correctos; migración no aplicada y exportación masiva no ejecutada para no rotar credenciales reales.

## Corrección CRUD de edición: sincronización de roles y validación de parches

- Causa del fallo de Usuarios: las consultas incluían filas `UsuarioRol` inactivas. El formulario las interpretaba como seleccionadas; además, el cambio de estado global de la cuenta también modificaba todos los vínculos de rol y podía reactivar membresías ya retiradas.
- Los listados, búsqueda por rol y credenciales ahora consideran únicamente las membresías activas; filtrar por un rol no reduce el conjunto de roles activos devuelto para editar. El PATCH sustituye el conjunto seleccionado, deja inactivos los vínculos quitados y actualiza/inactiva los perfiles asociados.
- Se separó el estado global de Usuario/Credencial del estado de `UsuarioRol`. Al reactivar cuentas heredadas, se reconstruyen solo roles con perfiles todavía activos; un rol retirado no reaparece. También se desactivan asociaciones Estudiante–Programa anteriores cuando cambia el programa principal.
- Revisión de otras ediciones: espacios ahora combinan el PATCH con los datos almacenados, verifican que un espacio presencial mantenga una ubicación válida y confirman el cambio en transacción. Periodos ya completaban parches contra los valores actuales y validaban el rango; solicitudes ya verificaban transiciones permitidas. No se encontró el mismo defecto de reactivación de roles en esos CRUD.
- Prueba integrada MariaDB: se creó un usuario temporal, se agregó y retiró Administrador dejando Estudiante; se comprobó la fila retirada como `Inactivo`, se desactivó/reactivó la cuenta y se confirmó que Administrador no reapareció. El usuario temporal se eliminó correctamente. Typecheck API, build web y validación OpenAPI correctos.
- La auditoría de solo lectura posterior volvió a reportar cuatro credenciales con formato no bcrypt, una asignación con varias materias activas y una sesión discrepante; informó cinco códigos estudiantiles inconsistentes, frente a los seis del corte previo documentado. No se atribuyó ni corrigió esa diferencia; queda pendiente reconciliarla antes de remediar datos reales. Permanecen cero referencias huérfanas y las 14 restricciones recomendadas siguen pendientes de migración manual.

## Combinaciones válidas de roles en el formulario de usuario

- El formulario permite Administrador, Tutor, Estudiante o Monitor individualmente; Monitor puede combinarse únicamente con Estudiante.
- Se deshabilitan los checkboxes incompatibles, se muestran las reglas en el formulario y se vuelve a comprobar la combinación antes del envío. La edición también permite retirar roles ya seleccionados.
- La API rechaza combinaciones inválidas en `POST /users` y `PATCH /users/{id}`. El contrato OpenAPI refleja las cinco combinaciones mediante `UserRoles`.
- Verificación: typecheck API, validación OpenAPI y build frontend; casos inválidos rechazados antes de conectar a la base de datos. Sin cambios en MariaDB.

## Número de contacto opcional en el formulario de usuario

- Se incorporó el teléfono de contacto ya existente en `Usuario.telefono` al formulario administrativo de creación y edición; se precarga al editar y no se exige para guardar.
- La API valida el formato cuando se proporciona, lo persiste en altas y actualizaciones, y permite conservarlo al omitir el campo en PATCH o quitarlo con un valor vacío/null. El contrato OpenAPI y la documentación del modelo/API quedaron sincronizados.
- No se modificó el esquema de MariaDB porque la columna ya existe.

## CRUD administrativo de asignaturas

- Se agregaron la pantalla y las rutas protegidas para listar, crear, editar y borrar asignaturas con código, nombre, créditos, descripción y estado.
- API y OpenAPI validan formato, longitudes y créditos enteros entre 1 y 30. Si hay programas, asignaciones o solicitudes relacionadas, `DELETE` devuelve conflicto y se conserva la opción de inactivar.
- Verificación MariaDB: un registro temporal se creó, editó y eliminó; se confirmó además que una asignatura ya referenciada no puede borrarse.

## CRUD administrativo de programas académicos

- Se agregaron la pantalla y las rutas protegidas para listar, crear, editar y borrar programas con código, nombre, SNIES opcional, facultad y estado. El formulario usa facultades activas existentes.
- Se validan tipos, longitudes, facultad válida y duplicados. Si existen estudiantes, asignaturas vinculadas o solicitudes, el borrado físico se bloquea para conservar la relación histórica.
- Verificación MariaDB: un programa temporal se creó, editó y eliminó; se comprobó además que un programa ya referenciado no puede borrarse.

## Avisos y validaciones de integridad en formularios

- Los avisos del frontend se presentan en una bandeja accesible, cerrable y adaptable, en lugar de interrumpir el flujo con diálogos nativos. Los errores `422` incluyen campo y mensaje legibles. La entrega de claves temporales conserva un diálogo explícito para que el secreto no desaparezca automáticamente.
- El nombre real de una persona se valida en interfaz y API para permitir letras, espacios, apóstrofes y guiones, y rechazar dígitos. Los datos numéricos de perfiles, catálogos, solicitudes y espacios rechazan letras, decimales o notación exponencial y aplican sus rangos.
- Verificación: build web, typecheck API y contrato OpenAPI correctos; pruebas negativas para nombre con dígitos, capacidad con letras, créditos en notación exponencial y facultad textual fueron rechazadas antes de persistir. El CRUD integrado de ambas entidades y la protección de borrado con referencias pasaron; los registros de prueba se eliminaron.

## Selección explícita de roles al crear usuarios

- El alta de usuario inicia con todas las casillas de rol desmarcadas y no genera el código institucional hasta que se selecciona un rol.
- Se permite desmarcar cualquier rol, incluso el último; al intentar guardar se exige una selección y se aplican las combinaciones válidas. La edición conserva marcados los roles actuales.
- El código se vuelve a generar al cambiar la selección y queda vacío si se desmarcan todos los roles.
