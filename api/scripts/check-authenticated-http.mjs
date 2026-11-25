import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'

assert.equal(process.env.ACADEX_EPHEMERAL_CI, '1', 'Usa únicamente el Compose desechable de CI')

const password = randomBytes(24).toString('base64url')
const db = await mysql.createConnection({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
})

try {
  const [[student]] = await db.query(`
    SELECT u.id_usuario AS id, u.correo AS email
      FROM Usuario u
      JOIN Credencial c ON c.id_usuario = u.id_usuario AND c.estado = 'Activo'
      JOIN Estudiante e ON e.id_usuario = u.id_usuario AND e.estado = 'Activo'
      JOIN EstudiantePrograma ep ON ep.id_estudiante = e.id_estudiante AND ep.principal = 1 AND ep.estado = 'Activo'
      JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario AND ur.estado = 'Activo'
      JOIN Rol r ON r.id_rol = ur.id_rol AND r.estado = 'Activo'
     WHERE u.estado = 'Activo' AND u.correo LIKE '%@unitropico.edu.co'
       AND c.password_hash = 'PENDIENTE_APROVISIONAMIENTO'
     GROUP BY u.id_usuario, u.correo
    HAVING COUNT(DISTINCT r.id_rol) = 1 AND MAX(r.nombre) = 'Estudiante'
     ORDER BY u.id_usuario LIMIT 1
  `)
  assert.ok(student, 'La semilla debe incluir un estudiante activo pendiente de aprovisionamiento')
  const [[subject]] = await db.query("SELECT id_asignatura AS id FROM Asignatura WHERE estado = 'Activo' ORDER BY id_asignatura LIMIT 1")
  assert.ok(subject, 'La semilla debe incluir una asignatura activa')
  const [period] = await db.execute(
    "INSERT INTO PeriodoAcademico (nombre, fecha_inicio, fecha_fin, estado) VALUES (?, CURRENT_DATE, CURRENT_DATE + INTERVAL 30 DAY, 'Planeado')",
    ['CI-' + randomBytes(6).toString('hex')],
  )
  const [updated] = await db.execute(
    "UPDATE Credencial SET password_hash = ?, primer_inicio = FALSE WHERE id_usuario = ? AND password_hash = 'PENDIENTE_APROVISIONAMIENTO'",
    [await bcrypt.hash(password, 12), student.id],
  )
  assert.equal(updated.affectedRows, 1)

  const api = 'http://127.0.0.1:3000/api/v1'
  const login = await fetch(api + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: student.email, password }),
    signal: AbortSignal.timeout(10_000),
  })
  assert.equal(login.status, 200, 'El estudiante debe poder iniciar sesión')
  const session = await login.json()
  assert.equal(session.activeRole, 'Estudiante')
  assert.ok(session.accessToken, 'El login debe emitir un token')
  const headers = { Authorization: 'Bearer ' + session.accessToken }

  const admin = await fetch(api + '/admin/dashboard', { headers, signal: AbortSignal.timeout(10_000) })
  assert.equal(admin.status, 403, 'El estudiante no debe acceder al panel de administración')
  assert.equal((await admin.json()).code, 'FORBIDDEN')

  const request = await fetch(api + '/requests', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjectId: subject.id,
      periodId: period.insertId,
      type: 'Tutoría',
      priority: 'Media',
      motive: 'Validación de CI',
      description: 'Solicitud creada por la prueba automatizada.',
    }),
    signal: AbortSignal.timeout(10_000),
  })
  assert.equal(request.status, 201, 'El estudiante debe poder crear una solicitud')
  const created = await request.json()
  assert.ok(Number.isInteger(created.id) && created.id > 0)
  assert.equal(created.status, 'Pendiente')
  console.log('Login de estudiante, autorización por rol y creación de solicitud verificados.')
} finally {
  await db.end()
}
