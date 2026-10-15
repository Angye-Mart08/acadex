import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(currentDir, '../../.env') })
dotenv.config({ path: path.resolve(currentDir, '../.env') })

const database = process.env.DATABASE_NAME ?? 'gestion_monitorias_tutorias'
let connection

const checks = [
  ['Credenciales sin usuario asociado', `SELECT COUNT(*) AS total FROM Credencial c LEFT JOIN Usuario u ON u.id_usuario=c.id_usuario WHERE u.id_usuario IS NULL`],
  ['Correo de credencial distinto al correo de usuario', `SELECT COUNT(*) AS total FROM Credencial c JOIN Usuario u ON u.id_usuario=c.id_usuario WHERE LOWER(c.usuario)<>LOWER(u.correo)`],
  ['Credenciales que no parecen hashes bcrypt', `SELECT COUNT(*) AS total FROM Credencial WHERE CHAR_LENGTH(password_hash)<>60 OR LEFT(password_hash,4) NOT IN ('$2a$','$2b$','$2y$')`],
  ['Correos de cuenta fuera del dominio institucional', `SELECT COUNT(*) AS total FROM Usuario WHERE LOWER(correo) NOT LIKE '%@unitropico.edu.co'`],
  ['Perfiles Estudiante sin rol activo', `SELECT COUNT(*) AS total FROM Estudiante p JOIN Usuario u ON u.id_usuario=p.id_usuario LEFT JOIN Rol r ON r.nombre='Estudiante' LEFT JOIN UsuarioRol ur ON ur.id_usuario=u.id_usuario AND ur.id_rol=r.id_rol AND ur.estado='Activo' WHERE p.estado='Activo' AND ur.id_usuario IS NULL`],
  ['Perfiles Tutor sin rol activo', `SELECT COUNT(*) AS total FROM Tutor p JOIN Usuario u ON u.id_usuario=p.id_usuario LEFT JOIN Rol r ON r.nombre='Tutor' LEFT JOIN UsuarioRol ur ON ur.id_usuario=u.id_usuario AND ur.id_rol=r.id_rol AND ur.estado='Activo' WHERE p.estado='Activo' AND ur.id_usuario IS NULL`],
  ['Perfiles Monitor sin rol activo', `SELECT COUNT(*) AS total FROM Monitor p JOIN Usuario u ON u.id_usuario=p.id_usuario LEFT JOIN Rol r ON r.nombre='Monitor' LEFT JOIN UsuarioRol ur ON ur.id_usuario=u.id_usuario AND ur.id_rol=r.id_rol AND ur.estado='Activo' WHERE p.estado='Activo' AND ur.id_usuario IS NULL`],
  ['Perfiles Administrador sin rol activo', `SELECT COUNT(*) AS total FROM Administrador p JOIN Usuario u ON u.id_usuario=p.id_usuario LEFT JOIN Rol r ON r.nombre='Administrador' LEFT JOIN UsuarioRol ur ON ur.id_usuario=u.id_usuario AND ur.id_rol=r.id_rol AND ur.estado='Activo' WHERE p.estado='Activo' AND ur.id_usuario IS NULL`],
  ['Código de Estudiante distinto al código institucional', `SELECT COUNT(*) AS total FROM Estudiante e JOIN Usuario u ON u.id_usuario=e.id_usuario WHERE e.codigo_estudiantil<>u.codigo`],
  ['Estudiantes con más de un programa principal activo', `SELECT COUNT(*) AS total FROM (SELECT id_estudiante FROM EstudiantePrograma WHERE estado='Activo' AND principal=1 GROUP BY id_estudiante HAVING COUNT(*)>1) d`],
  ['Usuarios con más de una asignatura activa por rol', `SELECT COUNT(*) AS total FROM (SELECT id_usuario,id_rol FROM AsignacionAcademica WHERE estado='Activa' GROUP BY id_usuario,id_rol HAVING COUNT(DISTINCT id_asignatura)>1) d`],
  ['Asignaciones activas sin rol activo asociado', `SELECT COUNT(*) AS total FROM AsignacionAcademica a LEFT JOIN UsuarioRol ur ON ur.id_usuario=a.id_usuario AND ur.id_rol=a.id_rol AND ur.estado='Activo' WHERE a.estado='Activa' AND ur.id_usuario IS NULL`],
  ['Sesiones cuya materia o periodo no coincide con la solicitud', `SELECT COUNT(*) AS total FROM Sesion se JOIN Solicitud so ON so.id_solicitud=se.id_solicitud JOIN AsignacionAcademica aa ON aa.id_asignacion=se.id_asignacion WHERE so.id_asignatura<>aa.id_asignatura OR so.id_periodo<>aa.id_periodo`],
  ['Solicitudes con programa no vinculado al estudiante', `SELECT COUNT(*) AS total FROM Solicitud so JOIN Estudiante e ON e.id_estudiante=so.id_estudiante LEFT JOIN EstudiantePrograma ep ON ep.id_estudiante=e.id_estudiante AND ep.id_programa=so.id_programa AND ep.estado='Activo' WHERE ep.id_estudiante_programa IS NULL`],
  ['Más de un periodo académico activo', `SELECT IF(COUNT(*)>1,COUNT(*)-1,0) AS total FROM PeriodoAcademico WHERE estado='Activo'`],
  ['Semestres de estudiante fuera de 1–12', `SELECT COUNT(*) AS total FROM Estudiante WHERE semestre<1 OR semestre>12`],
  ['Horas de Tutor fuera de 1–60', `SELECT COUNT(*) AS total FROM Tutor WHERE horas_semanales IS NOT NULL AND (horas_semanales<1 OR horas_semanales>60)`],
  ['Horas de Monitor fuera de 1–60', `SELECT COUNT(*) AS total FROM Monitor WHERE horas_semanales IS NOT NULL AND (horas_semanales<1 OR horas_semanales>60)`],
  ['Créditos de asignatura fuera de 1–30', `SELECT COUNT(*) AS total FROM Asignatura WHERE creditos IS NOT NULL AND (creditos<1 OR creditos>30)`],
  ['Semestres de ProgramaAsignatura fuera de 1–12', `SELECT COUNT(*) AS total FROM ProgramaAsignatura WHERE semestre IS NOT NULL AND (semestre<1 OR semestre>12)`],
  ['Espacios con capacidad fuera del rango permitido (1–1000)', `SELECT COUNT(*) AS total FROM Espacio WHERE capacidad<1 OR capacidad>1000`],
  ['Asignaciones con horas fuera del rango permitido (1–60)', `SELECT COUNT(*) AS total FROM AsignacionAcademica WHERE horas_semanales<1 OR horas_semanales>60`],
  ['Asignaciones académicas con rango de fechas invertido', `SELECT COUNT(*) AS total FROM AsignacionAcademica WHERE fecha_fin IS NOT NULL AND fecha_fin<fecha_inicio`],
  ['Horarios de monitor con tiempo o duración inválida', `SELECT COUNT(*) AS total FROM HorarioMonitor WHERE hora_fin<=hora_inicio OR duracion_minutos<1 OR duracion_minutos>1440`],
  ['Asignaciones de espacio con rango de fechas invertido', `SELECT COUNT(*) AS total FROM AsignacionEspacio WHERE fecha_fin IS NOT NULL AND fecha_fin<fecha_inicio`],
  ['Cancelaciones con días de anticipación negativos', `SELECT COUNT(*) AS total FROM CancelacionMonitoria WHERE dias_anticipacion<0`],
  ['Reportes con hora final no posterior al inicio', `SELECT COUNT(*) AS total FROM ReporteMonitoria WHERE hora_fin_real<=hora_inicio_real`],
  ['Recuperaciones con hora final no posterior al inicio', `SELECT COUNT(*) AS total FROM RecuperacionMonitoria WHERE hora_fin<=hora_inicio`],
  ['Compromisos con fecha de cumplimiento anterior al compromiso', `SELECT COUNT(*) AS total FROM Compromiso WHERE fecha_cumplimiento IS NOT NULL AND fecha_cumplimiento<fecha_compromiso`],
  ['Horarios con hora final no posterior al inicio', `SELECT COUNT(*) AS total FROM Disponibilidad WHERE hora_fin<=hora_inicio`],
  ['Sesiones con hora final no posterior al inicio', `SELECT COUNT(*) AS total FROM Sesion WHERE hora_fin<=hora_inicio`],
]

const expectedConstraints = [
  'chk_estudiante_semestre', 'chk_tutor_horas', 'chk_monitor_horas',
  'chk_asignatura_creditos', 'chk_programa_asignatura_semestre',
  'chk_asignacion_horas', 'chk_asignacion_fechas', 'chk_espacio_capacidad',
  'chk_horario_monitor_tiempo', 'chk_asignacion_espacio_fechas',
  'chk_cancelacion_dias', 'chk_reporte_monitoria_horario',
  'chk_recuperacion_horario', 'chk_compromiso_fechas',
]

try {
  connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST ?? '127.0.0.1',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    database,
    user: process.env.DATABASE_USER ?? 'tutorias_app',
    password: process.env.DATABASE_PASSWORD ?? '',
    charset: 'utf8mb4',
  })
  await connection.query('SET SESSION TRANSACTION READ ONLY')
  await connection.beginTransaction()

  const [[server]] = await connection.query('SELECT VERSION() AS version, DATABASE() AS databaseName')
  const [[tableSummary]] = await connection.query(
    `SELECT COUNT(*) AS totalTables,
            SUM(engine='InnoDB') AS innodbTables
       FROM information_schema.tables
      WHERE table_schema=? AND table_type='BASE TABLE'`,
    [database],
  )
  const [[foreignKeys]] = await connection.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.table_constraints
      WHERE constraint_schema=? AND constraint_type='FOREIGN KEY'`,
    [database],
  )
  const [[uniqueKeys]] = await connection.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.table_constraints
      WHERE constraint_schema=? AND constraint_type='UNIQUE'`,
    [database],
  )
  const [installed] = await connection.query(
    `SELECT constraint_name AS name
       FROM information_schema.table_constraints
      WHERE constraint_schema=? AND constraint_type='CHECK'`,
    [database],
  )
  const installedNames = new Set(installed.map((row) => String(row.name).toLowerCase()))
  const missingConstraints = expectedConstraints.filter((name) => !installedNames.has(name.toLowerCase()))
  const [foreignKeyColumns] = await connection.query(
    `SELECT table_name AS childTable, column_name AS childColumn,
            referenced_table_name AS parentTable, referenced_column_name AS parentColumn
       FROM information_schema.key_column_usage
      WHERE constraint_schema=? AND referenced_table_name IS NOT NULL
      ORDER BY table_name, constraint_name, ordinal_position`,
    [database],
  )

  console.log('AUDITORÍA DE INTEGRIDAD — solo lectura')
  console.log(`Motor: ${server.version}`)
  console.log(`Tablas: ${Number(tableSummary.totalTables)}; InnoDB: ${Number(tableSummary.innodbTables)}`)
  console.log(`Claves foráneas: ${Number(foreignKeys.total)}; restricciones UNIQUE: ${Number(uniqueKeys.total)}; CHECK: ${installedNames.size}`)
  console.log('\nHallazgos de integridad:')

  let anomalies = 0
  for (const [label, sql] of checks) {
    const [[result]] = await connection.query(sql)
    const total = Number(result.total ?? 0)
    if (total > 0) anomalies += total
    console.log(`${total === 0 ? 'OK' : 'REVISAR'} (${total}): ${label}`)
  }

  let orphanReferences = 0
  for (const fk of foreignKeyColumns) {
    const quote = (identifier) => `\x60${String(identifier).replaceAll('\x60', '\x60\x60')}\x60`
    const sql = `SELECT COUNT(*) AS total FROM ${quote(fk.childTable)} c LEFT JOIN ${quote(fk.parentTable)} p ON c.${quote(fk.childColumn)}=p.${quote(fk.parentColumn)} WHERE c.${quote(fk.childColumn)} IS NOT NULL AND p.${quote(fk.parentColumn)} IS NULL`
    const [[result]] = await connection.query(sql)
    const total = Number(result.total ?? 0)
    orphanReferences += total
    if (total > 0) console.log(`REVISAR (${total}): referencias huérfanas ${fk.childTable}.${fk.childColumn} → ${fk.parentTable}.${fk.parentColumn}`)
  }
  console.log(`Referencias huérfanas en claves foráneas: ${orphanReferences}`)

  console.log('\nRestricciones CHECK recomendadas ausentes:')
  if (missingConstraints.length === 0) console.log('Ninguna.')
  else for (const name of missingConstraints) console.log(`PENDIENTE: ${name}`)

  console.log(`\nResultado: ${anomalies === 0 && orphanReferences === 0 && missingConstraints.length === 0 ? 'SIN HALLAZGOS' : 'REQUIERE REVISIÓN'}`)
  await connection.rollback()
} catch (error) {
  try { await connection.rollback() } catch {}
  console.error(`Auditoría no completada (${error.code ?? 'DB_ERROR'}). Revise conexión y esquema; no se imprimieron datos personales.`)
  process.exitCode = 1
} finally {
  if (connection) await connection.end()
}
