import mysql from 'mysql2/promise'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'

export const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  waitForConnections: true,
  connectionLimit: config.database.connectionLimit,
  charset: 'utf8mb4',
  decimalNumbers: true,
})

const databaseNamePattern = /^[A-Za-z0-9_]+$/
const databaseUserPattern = /^[A-Za-z0-9_]+$/
const requiredSchemaTables = ['Rol', 'Usuario', 'Credencial', 'UsuarioRol']

function sqlStringLiteral(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

async function ensureApplicationUser(connection: mysql.Connection) {
  if (!databaseUserPattern.test(config.database.user)) {
    throw new Error('DATABASE_USER contiene caracteres no permitidos.')
  }

  const password = sqlStringLiteral(config.database.password)
  for (const host of ['localhost', '127.0.0.1']) {
    const account = `'${config.database.user}'@'${host}'`
    await connection.query(`CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ${password}`)
    await connection.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON \`${config.database.name}\`.* TO ${account}`,
    )
  }
  await connection.query('FLUSH PRIVILEGES')
}

async function createDatabaseIfNeeded() {
  if (!databaseNamePattern.test(config.database.name)) throw new Error('DATABASE_NAME contiene caracteres no permitidos.')
  const connection = await mysql.createConnection({
    host: config.database.host,
    port: config.database.port,
    user: config.bootstrap.user,
    password: config.bootstrap.password,
    multipleStatements: true,
  })

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci`)
    await ensureApplicationUser(connection)
    const [tables] = await connection.query(
      'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ?',
      [config.database.name],
    )
    const tableCount = Number((tables as Array<{ total: number }>)[0]?.total ?? 0)
    if (tableCount > 0) {
      const placeholders = requiredSchemaTables.map(() => '?').join(', ')
      const [requiredTables] = await connection.query(
        `SELECT table_name AS tableName
           FROM information_schema.tables
          WHERE table_schema = ?
            AND table_name IN (${placeholders})`,
        [config.database.name, ...requiredSchemaTables],
      )
      const existingRequiredTables = new Set(
        (requiredTables as Array<{ tableName: string }>).map((table) => table.tableName.toLowerCase()),
      )
      const missingTables = requiredSchemaTables.filter((table) => !existingRequiredTables.has(table.toLowerCase()))
      if (missingTables.length > 0) {
        throw new Error(
          `La base de datos "${config.database.name}" existe, pero su esquema está incompleto. ` +
            `No se sobrescribirá automáticamente. Faltan: ${missingTables.join(', ')}.`,
        )
      }
      return
    }

    const sqlPath = fileURLToPath(new URL('../../database/gestion_monitorias_tutorias.sql', import.meta.url))
    const schemaSql = (await fs.readFile(sqlPath, 'utf8')).replace(
      /\bgestion_monitorias_tutorias\b/g,
      config.database.name,
    )
    await connection.query(schemaSql)
  } finally {
    await connection.end()
  }
}

export async function initializeDatabase() {
  try {
    await pool.query('SELECT 1 AS ok')
    return
  } catch {
    // La base o el usuario de aplicación pueden no existir en el primer arranque.
  }

  await createDatabaseIfNeeded()
  await checkDatabaseConnection()
}

export async function checkDatabaseConnection() {
  const connection = await pool.getConnection()
  try {
    await connection.query('SELECT 1 AS ok')
  } finally {
    connection.release()
  }
}
