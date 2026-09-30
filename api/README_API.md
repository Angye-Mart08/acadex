# Contrato de API — Gestión de Tutorías y Monitorías

El contrato inicial de la API se encuentra en [openapi.yaml](./openapi.yaml) y utiliza OpenAPI 3.1.

## Alcance

El contrato está alineado con el primer avance del frontend:

- Inicio de sesión con correo institucional y documento de identidad.
- Selección del rol activo cuando una persona tiene más de un rol.
- Consulta del usuario autenticado.
- Dashboard personalizado por rol.
- Disponibilidad, horarios, sesiones e informes del tutor o monitor.
- Solicitudes creadas por estudiantes.
- Solicitudes asignadas, aprobadas o rechazadas.
- Administración de usuarios.
- Administración de espacios.

## Roles

```text
Administrador
Tutor
Monitor
Estudiante
```

Un usuario puede tener uno o varios roles mediante la relación `UsuarioRol`. El
login devuelve los roles disponibles; si hay más de uno, el frontend presenta
un selector y confirma el rol activo mediante `/auth/select-role`. El cambio
de rol posterior conserva la sesión y debe emitir o renovar el contexto de
autorización en la API real.

Las rutas protegidas utilizan:

```text
Authorization: Bearer <accessToken>
```

## Validar el contrato

Desde PowerShell:

```powershell
cd C:\Users\brayh\acadex\api
npm install
npm run validate
```

## Levantar un mock local

```powershell
cd C:\Users\brayh\acadex\api
npm run mock
```

El mock queda disponible en:

```text
http://localhost:4010
```

El mock es únicamente para probar el contrato. No reemplaza la API real ni persiste información en MariaDB.

## Reglas importantes

- La API real debe consultar la tabla `Credencial` para verificar el documento asociado al correo institucional.
- `POST /auth/login` autentica con correo institucional y documento; `POST /auth/select-role` confirma el rol activo.
- `POST /users` y `PATCH /users/{id}` reciben `roles[]`, con mínimo un rol y sin valores repetidos.
- No se debe devolver `password_hash` ni el documento de identidad en las respuestas públicas del usuario.
- El backend debe aplicar autorización por rol, además de validar el JWT.
- Los cambios de estado de solicitudes deben respetar las transiciones del dominio.
- El frontend debe reemplazar progresivamente sus datos locales por llamadas a estas rutas.
