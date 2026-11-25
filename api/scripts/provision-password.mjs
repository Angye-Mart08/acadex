import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'

const [email] = process.argv.slice(2)
if (process.argv.length !== 3 || !email || !process.stdout.isTTY) {
  console.error('Ejecuta en una terminal privada: node scripts/provision-password.mjs CORREO')
  process.exit(1)
}

let connection
try {
  const password = randomBytes(24).toString('base64url')
  const hash = await bcrypt.hash(password, 12)
  connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT ?? 3306),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  })
  await connection.beginTransaction()
  const [rows] = await connection.execute(
    "SELECT c.id_usuario FROM Credencial c JOIN Usuario u ON u.id_usuario = c.id_usuario WHERE u.correo = ? AND u.estado = 'Activo' AND c.estado = 'Activo' FOR UPDATE",
    [email],
  )
  if (rows.length !== 1) throw new Error('ACCOUNT_NOT_FOUND')
  const userId = rows[0].id_usuario
  await connection.execute(
    'UPDATE Credencial SET password_hash = ?, primer_inicio = TRUE, ultimo_acceso = NULL WHERE id_usuario = ?',
    [hash, userId],
  )
  for (const table of ['SesionIngreso', 'SesionPreAutenticacion']) {
    await connection.execute('UPDATE ' + table + ' SET revocada_en = CURRENT_TIMESTAMP WHERE id_usuario = ? AND revocada_en IS NULL', [userId])
  }
  await connection.execute('UPDATE ControlAcceso SET intentos_fallidos = 0, bloqueada_hasta = NULL, tipo_bloqueo = NULL WHERE id_usuario = ?', [userId])
  await connection.execute('UPDATE CodigoVerificacionClave SET consumido_en = CURRENT_TIMESTAMP WHERE id_usuario = ? AND consumido_en IS NULL', [userId])
  await connection.commit()
  console.log('Clave temporal para entregar por canal privado: ' + password)
} catch (error) {
  await connection?.rollback()
  console.error(error.message === 'ACCOUNT_NOT_FOUND'
    ? 'No se encontró una cuenta activa para ese correo.'
    : 'No se pudo aprovisionar la cuenta. Revisa la conexión y las migraciones.')
  process.exitCode = 1
} finally {
  await connection?.end()
}
