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

## Recomendación: exportación institucional de informes

La edición y exportación con diseño institucional definitivo sigue pendiente: falta la plantilla oficial y no es seguro fijar campos, encabezados, tamaños de foto o paginación de anexos. El módulo provisional se documenta en la decisión añadida al final de este archivo. Cuando el equipo tenga el formato institucional, se recomienda migrar la salida a una plantilla DOCX en el backend, completar campos con `Informe` e `InformeTutorDetalle`, incluir evidencias como anexos numerados, permitir vista previa y exportar a PDF mediante una conversión instalada en el entorno servidor. Mantener separados el contenido estructurado y el archivo generado permite regenerar el informe sin perder el reporte fuente.

## 24. Operación del portal de tutor

Las consultas y mutaciones del tutor se limitan por `id_usuario`, rol activo y asignación académica activa. Los bloques de disponibilidad se desactivan para mantener historial y se rechazan si se cruzan. Una cancelación exige motivo y actualiza el registro de la sesión y solicitud dentro de una transacción, conservando la justificación en la entidad de cancelación.

Las tutorías recuperadas se guardan como operación vinculada a la sesión original en `RecuperacionMonitoria`; al completarse, pueden originar un reporte diferenciado. Los reportes usan `Informe` como encabezado y `InformeTutorDetalle`/`AdjuntoInformeTutor` para valores estructurados y metadatos; los binarios permanecen bajo el directorio de cargas de la API. La carpeta de archivos debe respaldarse junto a MariaDB.

## 25. Plantilla y exportación institucional

Se deja pendiente la generación y edición de informes con la plantilla institucional hasta recibirla. Los campos, diseño, fotos, anexos, encabezado institucional y paginación son requisitos de aceptación que no se deben inferir. Con la plantilla aprobada, se recomienda reemplazar la salida provisional por generación DOCX en backend, edición de borrador con vista previa, lista ordenada de evidencias y conversión final a PDF. Conservar el reporte estructurado permite regenerar el documento sin perder los datos fuente.

## Avance provisional de notificaciones e informe mensual

Las notificaciones funcionales se persisten en MariaDB, con una fila por destinatario y control individual de lectura. La interfaz consulta cada 30 segundos mientras el usuario tiene una sesión abierta. Para el alcance académico del proyecto se eligió polling autenticado en vez de WebSockets: conserva una arquitectura REST sencilla, evita un servicio de tiempo real adicional y permite entregar eventos entre roles aunque no compartan pantalla. La limitación es que el aviso visual puede tardar hasta un intervalo de consulta y no aparece si la persona está desconectada; no equivale a correo ni notificación móvil.

Los eventos se registran después de confirmar solicitudes, asignaciones, decisiones del tutor, cambios administrativos de estado y envío de reportes diarios. Si falla la escritura de una notificación, el error se registra en servidor sin revertir el proceso principal. Consulta y lectura se limitan a la cuenta propietaria.

Se implementó un borrador mensual consolidado desde los reportes existentes, con métricas, sesiones, metadatos de anexos, edición, vista previa y exportación compatible con Word/impresión PDF. Esto permite revisar el flujo antes de recibir el archivo institucional. El `.doc` es HTML compatible con Word y el PDF se obtiene mediante el diálogo de impresión del navegador; ninguno se presenta como formato institucional validado. Al recibir la plantilla se deben ajustar campos obligatorios, identidad visual, anexos embebidos, paginación y criterios de aprobación. Los reportes diarios permanecen como fuente estructurada y no se alteran al guardar el borrador mensual.

La migración `003_notificaciones_informe_mensual.sql` añade las tablas persistentes y se aplica idempotentemente al arranque de la API, sin recrear el esquema ni sobrescribir filas existentes.

## Diseño y seguridad de los módulos del tutor

La recuperación solo puede originarse en una sesión propia cancelada/no asistida sin otra recuperación pendiente o realizada. Esta elegibilidad se consulta de forma explícita y también se valida en servidor, para que el formulario no dependa de etiquetas o filtrados del cliente.

Los reportes de sesión usan `Informe` y sus tablas de detalle/adjuntos ya existentes. Se agregó CRUD autenticado, limitando lectura/edición a la asignación del tutor. Los borradores pueden eliminarse junto con sus adjuntos e historial de edición. Los reportes `Devuelto` pueden corregirse, pero conservan historial; los remitidos quedan bloqueados. Los adjuntos descargables se sirven desde una ruta que verifica el propietario y no revela su ubicación interna.

El archivo oficial se recibirá en `api/templates/plantilla_informe_tutor_unitropico.docx`. Se mantiene separado del generador provisional hasta mapear cada marcador, anexo, paginación y salida final. La solicitud ficticia se limpió solo de `web/data/ejemplo.json`; las filas de MariaDB se preservaron porque el registro #1 tiene una sesión relacionada y el equipo pidió no tocar la base.

## Enrutamiento y conservación de solicitudes

La administración crea solicitudes, asigna un responsable desde el catálogo de asignaciones académicas y programa únicamente fechas/bloques existentes en su horario activo. La validación de horario se repite en el servidor para impedir fechas inventadas o cruces concurrentes. Las decisiones de confirmar/cancelar pertenecen al usuario con el rol asignado (Tutor o Monitor); Administración no aprueba ni rechaza.

La eliminación se limita a solicitudes sin asignación ni relaciones históricas. Para una solicitud asignada o atendida se informa que debe cambiarse de estado y conservarse el historial. Los filtros permanecen disponibles en los módulos administrativos que los requieren y las tablas separan visualmente encabezados y acciones.

## Informes institucionales

Cada sesión realizada conserva su reporte diario en `Informe` y su detalle en `InformeTutorDetalle`. La autorización de lectura se basa en la relación sesión–asignación–tutor, lo cual también permite leer reportes heredados cuyo campo autor no coincide con la asignación o que carecen de detalle extendido. El borrador mensual solo incorpora sesiones que tengan reporte individual. La exportación sigue el orden de apartados del formato institucional presente en `api/templates/plantilla_informe_tutor_unitropico.docx`; las sesiones consolidadas comienzan en una página final separada.
## Conservación de horarios y salida del informe mensual

Las disponibilidades de tutor se relacionan con `AsignacionAcademica`. Cambiar la asignatura no debe actualizar esa asignación histórica porque sesiones ya realizadas apuntan a ella. Por ello se crea/reactiva la asignación correspondiente y se copian sus bloques semanales, conservando los registros originales. Los traslapes consultan solo asignaciones activas. Las facultades referenciadas por programas se desactivan en vez de eliminarse físicamente.

La descarga mensual produce Word compatible y su contenido se precarga desde los reportes individuales; el usuario puede editar los apartados antes de descargar. La impresión de la página queda retirada hasta contar con una integración que utilice la plantilla DOCX oficial directamente, ya que imprimir la aplicación no conserva su formato institucional.

## Periodos vigentes e informes aprobados

Las fechas de `PeriodoAcademico` son requisito para programar sesiones; el estado Activo no extiende por sí mismo un periodo vencido. El API reporta el problema para que Administración registre/active las fechas institucionales vigentes, sin inventar calendario ni modificar el historial previo.

Los informes Enviados, Aprobados y Entregados son historial de solo lectura. El tutor crea informes para sesiones finalizadas sin informe, edita Borrador/Devuelto y elimina únicamente Borrador no enviado. Por eso una sesión de muestra ya aprobada no ofrece botones de edición o eliminación.

## Alta y edición de disponibilidad

La interfaz distingue alta y edición por el ID del bloque, no por la presencia del objeto de formulario: el ID `0` es el marcador de un alta y no debe enviarse en la ruta PATCH. La creación usa POST; edición requiere un identificador persistido mayor que cero. El primer bloque de demostración se conserva activo para que el tutor pueda verificar el calendario y se identifica como provisional en la documentación del proyecto.
