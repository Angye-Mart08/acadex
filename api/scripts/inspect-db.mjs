import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const dbConfig = {
  host: process.env.DATABASE_HOST ?? '127.0.0.1',
  port: Number(process.env.DATABASE_PORT ?? 3306),
  database: process.env.DATABASE_NAME ?? 'gestion_monitorias_tutorias',
  user: process.env.DATABASE_USER ?? 'tutorias_app',
  password: process.env.DATABASE_PASSWORD ?? '',
}

async function runInspection() {
  console.log('='.repeat(65))
  console.log(' ACADEX — CONTROL E INSPECCIÓN DE BASE DE DATOS (MariaDB)')
  console.log('='.repeat(65))
  console.log(`Conectando a ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...`)

  let connection
  try {
    connection = await mysql.createConnection(dbConfig)
    console.log('✔ Conexión establecida exitosamente con MariaDB.\n')
  } catch (error) {
    console.error('✖ Error al conectar con el usuario de aplicación:', error.message)
    console.log('Intentando conectar con usuario root (bootstrap)...')
    try {
      connection = await mysql.createConnection({
        ...dbConfig,
        user: process.env.DATABASE_BOOTSTRAP_USER ?? 'root',
        password: process.env.DATABASE_BOOTSTRAP_PASSWORD ?? '',
      })
      console.log('✔ Conexión establecida con usuario root.\n')
    } catch (rootError) {
      console.error('✖ Falló la conexión root:', rootError.message)
      process.exit(1)
    }
  }

  try {
    // 1. Información del servidor
    const [versionRows] = await connection.query('SELECT VERSION() AS version, DATABASE() AS current_db')
    console.log(`Servidor MariaDB / MySQL: ${versionRows[0]?.version}`)
    console.log(`Base de datos activa:   ${versionRows[0]?.current_db}\n`)

    // 2. Conteo general de tablas
    const [tables] = await connection.query(
      'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ?',
      [dbConfig.database]
    )
    console.log(`Total tablas en el esquema: ${tables[0]?.total} tablas registradas.`)

    // 3. Conteo de entidades principales del CRUD
    const entities = [
      { name: 'Usuario', label: 'Usuarios' },
      { name: 'Rol', label: 'Roles' },
      { name: 'UsuarioRol', label: 'Asignaciones de rol' },
      { name: 'Espacio', label: 'Espacios físicos' },
      { name: 'Solicitud', label: 'Solicitudes' },
      { name: 'Sesion', label: 'Sesiones académicas' },
      { name: 'Asignatura', label: 'Asignaturas' },
      { name: 'PeriodoAcademico', label: 'Periodos académicos' },
      { name: 'Programa', label: 'Programas académicos' },
    ]

    console.log('\n--- RESUMEN DE REGISTROS POR TABLA ---')
    for (const entity of entities) {
      try {
        const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${entity.name}\``)
        console.log(`• ${entity.label.padEnd(25)}: ${rows[0]?.count} registros`)
      } catch {
        console.log(`• ${entity.label.padEnd(25)}: [Tabla no encontrada]`)
      }
    }

    // 4. Últimos registros modificados / creados
    console.log('\n--- ÚLTIMOS USUARIOS REGISTRADOS (Top 5) ---')
    const [users] = await connection.query(
      `SELECT u.id_usuario, u.codigo, CONCAT(u.nombres, ' ', u.apellidos) AS nombre, u.correo, u.estado,
              GROUP_CONCAT(r.nombre SEPARATOR ', ') AS roles
         FROM Usuario u
         LEFT JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario
         LEFT JOIN Rol r ON r.id_rol = ur.id_rol
        GROUP BY u.id_usuario
        ORDER BY u.id_usuario DESC
        LIMIT 5`
    )
    console.table(users)

    console.log('\n--- ÚLTIMOS ESPACIOS REGISTRADOS (Top 5) ---')
    const [spaces] = await connection.query(
      `SELECT id_espacio, codigo, nombre, tipo, capacidad, estado
         FROM Espacio
        ORDER BY id_espacio DESC
        LIMIT 5`
    )
    console.table(spaces)

    console.log('\n--- ÚLTIMAS SOLICITUDES REGISTRADAS (Top 5) ---')
    const [requests] = await connection.query(
      `SELECT s.id_solicitud, CONCAT(u.nombres, ' ', u.apellidos) AS estudiante,
              a.nombre AS asignatura, ts.nombre AS tipo, s.prioridad, s.estado,
              DATE_FORMAT(s.fecha_solicitud, '%Y-%m-%d %H:%i') AS fecha
         FROM Solicitud s
         JOIN Estudiante e ON e.id_estudiante = s.id_estudiante
         JOIN Usuario u ON u.id_usuario = e.id_usuario
         JOIN Asignatura a ON a.id_asignatura = s.id_asignatura
         JOIN TipoSolicitud ts ON ts.id_tipo_solicitud = s.id_tipo_solicitud
        ORDER BY s.id_solicitud DESC
        LIMIT 5`
    )
    console.table(requests)

    console.log('='.repeat(65))
    console.log('✔ Inspección finalizada correctamente.')
    console.log('  Usa HeidiSQL o ejecuta este comando para auditar los cambios del CRUD.')
    console.log('='.repeat(65))
  } finally {
    await connection.end()
  }
}

runInspection().catch((err) => {
  console.error('Error fatal durante la inspección:', err)
  process.exit(1)
})
