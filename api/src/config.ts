import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '../.env') })

const requiredSecret = process.env.JWT_SECRET?.trim()

if (process.env.NODE_ENV === 'production' && (!requiredSecret || requiredSecret.length < 32 || requiredSecret === 'change-this-local-secret')) {
  throw new Error('JWT_SECRET debe ser una clave aleatoria de al menos 32 caracteres en producción.')
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? '/api/v1',
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    name: process.env.DATABASE_NAME ?? 'gestion_monitorias_tutorias',
    user: process.env.DATABASE_USER ?? 'tutorias_app',
    password: process.env.DATABASE_PASSWORD ?? '',
    connectionLimit: Number(process.env.DATABASE_CONNECTION_LIMIT ?? 10),
  },
  bootstrap: {
    user: process.env.DATABASE_BOOTSTRAP_USER ?? process.env.DATABASE_USER ?? 'root',
    password: process.env.DATABASE_BOOTSTRAP_PASSWORD ?? process.env.DATABASE_PASSWORD ?? '',
  },
  jwtSecret: requiredSecret ?? 'dev-only-change-this-secret',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '8h',
  preAuthTokenTtl: process.env.PRE_AUTH_TOKEN_TTL ?? '5m',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
}
