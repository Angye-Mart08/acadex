# Modelo de datos

## Fuente principal

El modelo implementado se encuentra en [gestion_monitorias_tutorias.sql](../database/gestion_monitorias_tutorias.sql).

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
|---|---|
| Inicio de sesión | `Usuario`, `Credencial`, `UsuarioRol` |
| Gestión de usuarios | `Usuario`, `Rol`, `UsuarioRol` |
| Gestión de espacios | `Espacio` |
| Gestión de solicitudes | `Solicitud`, `Estudiante`, `Asignatura`, `TipoSolicitud` |
| Portal tutor | `Tutor`, `Disponibilidad`, `Sesion`, `Informe` |
| Portal monitor | `Monitor`, `HorarioMonitor`, `Solicitud`, `Sesion` |
| Portal estudiante | `Estudiante`, `Solicitud`, `Sesion`, `Seguimiento` |

## Nota de seguridad

El frontend de demostración utiliza datos locales. En la API real, el documento se utilizará para verificar el acceso junto con el correo institucional, pero no debe devolverse en las respuestas públicas del usuario.

La relación `UsuarioRol` es de muchos a muchos: un usuario puede ser, por
ejemplo, Monitor y Estudiante al mismo tiempo. El rol activo no se almacena
como un dato único del usuario; pertenece al contexto de la sesión y se elige
después del login. Por eso el contrato utiliza `roles[]` y contempla
`POST /auth/select-role`.
