# Aprovisionar y rotar credenciales

El SQL inicial conserva los perfiles de demostración. Sus cuentas quedan pendientes de aprovisionamiento hasta que una persona operadora genere una clave individual.

Con Compose levantado, abre una terminal privada y ejecuta:

```powershell
docker compose -p acadex exec api node scripts/provision-password.mjs CORREO_DE_LA_CUENTA
```

Usa el correo de una cuenta activa. En un servidor, incluye los mismos archivos Compose y variables de entorno que utilizaste para levantar la instancia. Comparte la clave temporal por un canal privado. La cuenta debe cambiarla al iniciar sesión. Repetir el comando reemplaza la clave anterior y revoca las sesiones de esa cuenta.

## Actualizar una instalación existente

1. Restringe el acceso público durante la actualización.
2. Reconstruye la API y deja que el arranque aplique las migraciones. Conserva el volumen de MariaDB.
3. Rota cada cuenta cuya clave se publicó, incluidas las que ya pudieron guardar esa misma clave como hash bcrypt. Desactiva las cuentas de demostración innecesarias en la instancia pública.
4. Verifica que las claves anteriores se rechacen y que una clave temporal permita iniciar sesión y cambiarla.
5. Verifica que una sesión anterior quede revocada antes de volver a abrir el acceso público.

Repite la verificación de aprovisionamiento con un volumen nuevo en una instancia de prueba. Conserva evidencia sin contraseñas ni tokens.
