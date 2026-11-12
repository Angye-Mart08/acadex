# Plantilla institucional del informe de tutoría

El formato oficial del tutor ya está guardado en este directorio con el nombre:

```text
api/templates/plantilla_informe_tutor_unitropico.docx
```

Conviene conservar el archivo original sin modificar y trabajar la integración sobre una copia. El módulo actual genera una salida provisional desde los reportes y todavía no carga esta plantilla. Para terminar la integración habrá que mapear sus campos a `Informe` e `InformeTutorDetalle`, incorporar las evidencias/anexos según las reglas institucionales y validar la vista previa y la exportación Word/PDF.

## Estado de integración del informe del tutor

El archivo `plantilla_informe_tutor_unitropico.docx` ya está disponible en esta carpeta. La exportación del módulo mensual adapta los campos y la secuencia de apartados del formato (datos básicos, actividades, atención estudiantil, observaciones, declaración, firmas, anexos y SAT); ubica las sesiones consolidadas en una página final separada. Actualmente genera un documento Word compatible desde HTML y no modifica ni incrusta el archivo DOCX original. Si se requiere preservar de forma idéntica el diseño, membrete, tablas y paginación de la plantilla, deberá incorporarse un motor de edición de DOCX y mapear sus marcadores institucionales sobre una copia.
## Descarga mensual tras las correcciones

El formulario carga como propuesta editable la introducción con los totales del mes y deriva actividades/logros, dificultades y recomendaciones de los reportes individuales existentes. La acción disponible es **Descargar Word (.doc)**. Se retiró **Imprimir / PDF**, porque el navegador imprime la interfaz y no reproduce el DOCX institucional. La generación actual sigue siendo Word compatible desde HTML y no incrusta de manera idéntica `plantilla_informe_tutor_unitropico.docx`; la integración fiel de la plantilla requiere una etapa adicional con marcadores y edición DOCX.
