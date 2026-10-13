# Modelo de datos

## Fuente principal

El modelo implementado se encuentra en [gestion_monitorias_tutorias.sql](../database/gestion_monitorias_tutorias.sql).
La API consulta esta misma base mediante `mysql2`; el frontend no mantiene una
copia paralela como fuente de verdad.

## Módulos principales

### Seguridad

- `Rol`: roles Administrador, Estudiante, Tutor y Monitor.
- `Usuario`: identidad institucional, correo, documento y estado.
- `Credencial`: relación de acceso del usuario.
- `UsuarioRol`: relación entre usuarios y roles.
- `Administrador`: información específica del administrador.

### Usuarios académicos

- `Estudiante`: información académica del estudiante.
- `Tutor`: información docente y horas asignadas.
- `Monitor`: información de monitoría, resolución y horas asignadas.

### Catálogos académicos

- `Facultad` y `Programa`.
- `Asignatura` y `ProgramaAsignatura`.
- `PeriodoAcademico`.
- `TipoSolicitud` y `TipoClasificacion`.

### Operación de acompañamientos

- `Solicitud`: petición de tutoría o monitoría realizada por un estudiante.
- `Disponibilidad`: bloques de atención de una asignación académica.
- `AsignacionEspacio`: espacio asignado a un bloque disponible.
- `Sesion`: encuentro programado de tutoría o monitoría.
- `Asistencia`, `Seguimiento` y `Compromiso`.
- `EntregaActividad` y `Evidencia`.
- `Informe`: informe asociado a una sesión.

## Relaciones relevantes

```text
Usuario ──< UsuarioRol >── Rol
Usuario ── 1:1 ── Estudiante / Tutor / Monitor / Administrador
Estudiante ──< Solicitud >── Asignatura
Solicitud ──< Sesion ──< Asistencia
Sesion ──< Seguimiento ──< Compromiso ──< EntregaActividad
Disponibilidad ──< AsignacionEspacio >── Espacio
```

## Correspondencia con el frontend

| Pantalla | Entidades principales |
| --- | --- |
| Inicio de sesión | `Usuario`, `Credencial`, `UsuarioRol` |
| Gestión de usuarios | `Usuario`, `Rol`, `UsuarioRol` |
| Gestión de espacios | `Espacio` |
| Gestión de solicitudes | `Solicitud`, `Estudiante`, `Asignatura`, `TipoSolicitud` |
| Portal tutor | `Tutor`, `Disponibilidad`, `Sesion`, `Informe` |
| Portal monitor | `Monitor`, `HorarioMonitor`, `Solicitud`, `Sesion` |
| Portal estudiante | `Estudiante`, `Solicitud`, `Sesion`, `Seguimiento` |

## Estado de integración

La API implementa actualmente autenticación y selección de rol, usuarios,
espacios, solicitudes, catálogos administrativos y consultas del dashboard y
reportes. Los catálogos de asignaturas y periodos se consultan mediante
`GET /catalogs/subjects` y `GET /catalogs/periods`. La lista ejecutable
completa y sus métodos se mantiene en
[README_API.md](../api/README_API.md); el servidor se registra en
`api/src/server.ts`.

El servidor ya consulta disponibilidad y sesiones por medio de
`GET /availability` y `GET /sessions`, filtrando por el rol activo y el usuario
autenticado. El esquema también modela asistencia, seguimiento, compromisos,
evidencias e informes; sus operaciones de escritura y los informes personales
aún no tienen persistencia API.

## Nota de seguridad

El documento se utiliza para verificar el acceso junto con el correo
institucional. No se devuelve en las respuestas públicas de autenticación; el
endpoint administrativo de usuarios lo entrega únicamente porque el
administrador necesita editar el registro de acceso.

La relación `UsuarioRol` es de muchos a muchos: un usuario puede ser, por
ejemplo, Monitor y Estudiante al mismo tiempo. El rol activo no se almacena
como un dato único del usuario; pertenece al contexto de la sesión y se elige
después del login. Por eso el contrato utiliza `roles[]` y contempla
`POST /auth/select-role`.
