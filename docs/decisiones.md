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

## 11. Asignación de solicitudes y consistencia de atención

Se reutiliza la relación existente `Sesion` ↔ `Solicitud` ↔ `AsignacionAcademica` en lugar de agregar una referencia de responsable directamente a `Solicitud`. Así, una asignación administrativa crea en la misma transacción la sesión inicial y cambia el estado a `Asignada`; solo se ofrecen tutores/monitores con rol, asignatura y periodo activos coincidentes. Esta decisión evita datos de asignación incompletos y no requiere migración de la base.

Los formularios comparten tamaños, espaciado, ayudas de validación y acciones accesibles en modales largos, conservando el sistema de marca existente y sus reglas responsivas.

## 12. Una asignatura por rol de Tutor o Monitor

El alta y la edición de perfil deben elegir una única asignatura para Tutor y una única asignatura para Monitor. Se usa un selector simple en lugar del multiselector anterior y la API aplica validación estricta de un elemento para que la regla no dependa solo del navegador. Si un usuario mantiene ambos roles, puede tener una asignatura propia para cada rol.

## 13. Validación por capas para los registros

Las restricciones de usabilidad se reflejan en atributos HTML, pero la API conserva la autoridad para normalizar y validar los datos, verificar relaciones de negocio y rechazar campos desconocidos. MariaDB aporta la última barrera mediante tipos, restricciones y claves; su auditoría y ajustes se mantienen como una mejora independiente para no alterar datos/esquemas sin revisión.

## 14. Borrado protegido y conservación del historial

El borrado físico se limita a registros sin dependencias académicas ni operativas. Usuarios con actividad se desactivan; espacios en uso se desactivan; solicitudes asignadas/con historial conservan su estado y registros. El sistema bloquea autoeliminación y eliminación del último administrador. Las verificaciones y los borrados permitidos se ejecutan transaccionalmente y las claves foráneas sirven como última defensa.

## 15. Trazas de navegación privadas en desarrollo

La navegación se registra localmente solo en desarrollo, mediante consola y un `CustomEvent` para diagnóstico en tiempo real. La traza contiene rol, vista y hora; excluye identidad, tokens y datos de formularios y no se persiste ni transmite. Así el equipo puede integrar herramientas de prueba sin convertir los accesos a pantallas en un registro personal permanente.

## 16. Proporción accesible de diálogos

Los formularios extensos usan un diálogo centrado con ancho limitado, alto ligado al viewport y scroll interno independiente. El encabezado y las acciones permanecen disponibles mientras se recorre el contenido; en móviles el diálogo se adapta al ancho y a la altura dinámica.

## 17. Un solo código institucional visible por persona

El perfil Estudiante deja de repetir el código estudiantil porque es el mismo código institucional general del usuario. La interfaz elimina el control duplicado y el servicio deriva ese valor del registro principal para mantener la relación existente en MariaDB y evitar discrepancias al registrar.

## 18. Entrega de claves sin revelar secretos persistidos

No se extraen contraseñas actuales ni hashes. Para compartir acceso, el administrador puede generar claves aleatorias temporales, persistir solo sus hashes bcrypt, invalidar las claves previas y forzar rotación en primer inicio. La exportación se limita por rol, excluye al emisor y devuelve los secretos una sola vez; la entrega por correo queda condicionada a disponer de SMTP institucional aprobado.

## 19. Parámetros institucionales fuera de la interfaz administrativa

Se elimina del panel de Configuración la edición de parámetros institucionales porque no aporta al flujo actual del proyecto. Se conserva la tabla y el contrato/API existentes para evitar una migración destructiva, pérdida de datos o una ruptura innecesaria de compatibilidad. Si en el futuro se retira también el recurso de backend, deberá hacerse mediante una decisión y migración independiente.

## 20. Separación entre estado de cuenta y membresías de rol

`Usuario.estado`/`Credencial.estado` representan acceso global; `UsuarioRol.estado` representa membresía. Una edición de roles define el conjunto final seleccionado y desactiva perfiles/membresías omitidos. Desactivar/reactivar la cuenta no debe alterar esa membresía. Los listados y filtros solo proyectan roles activos, y la reactivación de datos heredados restaura únicamente roles con perfil activo. Esta separación evita que una edición muestre roles retirados o los resucite al reactivar la cuenta.

## 21. Combinaciones excluyentes de roles

Un usuario solo puede tener `Administrador`, `Tutor`, `Estudiante` o `Monitor` individualmente, salvo la combinación válida `Monitor + Estudiante`. Administrador y Tutor son mutuamente exclusivos con cualquier otro rol; Monitor solo es compatible con Estudiante. Se aplica la matriz tanto en la interfaz como en el esquema de API y se expresa en OpenAPI mediante `UserRoles`.

## 22. CRUD de catálogos académicos con borrado protegido

Asignaturas y programas se administran mediante rutas protegidas para Administrador. Una asignatura en uso o un programa con estudiantes, asignaturas o solicitudes asociadas no se elimina físicamente: el sistema devuelve conflicto y conserva la opción de desactivar. Esta política preserva integridad referencial e historial sin requerir una migración.

## 23. Validación por tipo y avisos accionables

La API es autoridad final para validar los formularios. Los nombres personales admiten letras y separadores nominales, no dígitos; valores numéricos se aceptan solo como enteros dentro de su dominio, sin coerción desde texto arbitrario. El frontend transforma las respuestas de validación en avisos accesibles con campo y motivo; los secretos efímeros mantienen una presentación explícita y no temporizada.
