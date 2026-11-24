# Accesibilidad del frontend

Este documento describe las reglas aplicadas a los encabezados, controles y filtros de Acadex, junto con las comprobaciones necesarias antes de una entrega.

## Estructura de encabezados

- Cada vista comienza con el encabezado principal de la página (`h1`).
- Los títulos de secciones usan `h2`; los títulos dentro de una sección usan `h3`.
- No se salta un nivel para obtener un tamaño visual. La apariencia se controla en CSS.

## Nombres de controles

- Cada campo de búsqueda y filtro tiene un nombre accesible asociado mediante `label` e `id`.
- Las etiquetas de filtros que solo se muestran a tecnologías de asistencia usan la clase `.sr-only`.
- Cuando el texto visible no alcanza para explicar el propósito, se puede mantener un nombre accesible más descriptivo mediante `aria-label`.

## Contraste y ampliación

- El texto pequeño y secundario debe conservar una relación de contraste de al menos 4.5:1 frente al fondo.
- Los colores apagados de texto y de placeholders se oscurecieron para mejorar su lectura.
- La barra de filtros de sesiones puede saltar de línea en pantallas estrechas; la etiqueta «Estado» no se divide entre líneas.
- El placeholder del buscador de sesiones se acortó para que no se recorte al ampliar la página. Su nombre accesible mantiene la descripción del contenido que se puede buscar.

## Verificación antes de entregar

1. Ejecutar `npm run build` desde `web/` para comprobar TypeScript y el empaquetado del frontend.
2. En la URL desplegada, revisar con Lighthouse una vista representativa de cada rol y guardar los informes con fecha.
3. Revisar con teclado que los filtros se puedan recorrer y usar, y ampliar el navegador al 200 % para comprobar que las etiquetas y el buscador sigan visibles.
4. Confirmar que la puntuación de accesibilidad publicada sea 90 o superior. Una compilación local correcta no sustituye esta medición.
