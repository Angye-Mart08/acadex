import mysql from 'mysql2/promise'

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
  })
  try {
    await connection.query("CREATE USER IF NOT EXISTS 'tutorias_app'@'localhost' IDENTIFIED BY ''")
    await connection.query("CREATE USER IF NOT EXISTS 'tutorias_app'@'127.0.0.1' IDENTIFIED BY ''")
    await connection.query("ALTER USER 'tutorias_app'@'localhost' IDENTIFIED BY ''")
    await connection.query("ALTER USER 'tutorias_app'@'127.0.0.1' IDENTIFIED BY ''")
    await connection.query("GRANT ALL PRIVILEGES ON `gestion_monitorias_tutorias`.* TO 'tutorias_app'@'localhost'")
    await connection.query("GRANT ALL PRIVILEGES ON `gestion_monitorias_tutorias`.* TO 'tutorias_app'@'127.0.0.1'")
    await connection.query("FLUSH PRIVILEGES")
    console.log("✔ Usuario tutorias_app configurado correctamente con contraseña vacía según .env.")
  } finally {
    await connection.end()
  }
}

run().catch(console.error)
