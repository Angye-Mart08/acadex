# Base de datos

Esta carpeta contiene los scripts de MariaDB del proyecto.

## Archivo principal

- `gestion_monitorias_tutorias.sql`: crea la base de datos, tablas, restricciones y datos de prueba iniciales.

## Instalación local

Desde una terminal de MariaDB:

```sql
SOURCE C:/Users/brayh/acadex/database/gestion_monitorias_tutorias.sql;
```

El script crea la base de datos `gestion_monitorias_tutorias` con codificación `utf8mb4`.

## Reglas

- El backend no debe conectarse utilizando el usuario `root`.
- Las credenciales locales deben permanecer en `.env`, nunca en Git.
- Los datos de prueba del script sirven para desarrollo y demostración, no para producción.
- Las nuevas modificaciones al modelo deben documentarse en `docs/modelo-datos.md`.
