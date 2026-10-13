// @ts-nocheck
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { ZodError } from 'zod'
import { AuthError, currentUserFromToken, login, selectRole } from './auth.js'
import { checkDatabaseConnection, initializeDatabase } from './db.js'
import { config } from './config.js'
import { DataError, createRequest, createSpace, createUser, dashboard, deleteSpace, deleteUser, listPeriods, listPortalAvailability, listPortalSessions, listRequests, listSpaces, listSubjects, listUsers, updateRequest, updateSpace, updateUser } from './data.js'
import { adminCatalogs, adminDashboard, adminDbStatus, adminReport, changePassword, createAdminRequest, createAdminSpace, createAdminUser, deleteAdminRequest, deleteAdminSpace, deleteAdminUser, listAdminRequests, listAdminSpaces, listAdminUsers, listCredentials, listSettings, resetCredential, updateAdminRequest, updateAdminSpace, updateAdminUser, updateSettings } from './admin.js'

const app = express()
app.disable('x-powered-by')
const allowedOrigins = new Set(config.corsOrigin.split(',').map((origin) => origin.trim()))
function isAllowedOrigin(origin: string) {
  if (!origin) return true
  // En desarrollo permitir cualquier origen (localhost, 127.0.0.1, diferentes puertos de Vite, etc.)
  if (process.env.NODE_ENV !== 'production') return true
  return allowedOrigins.has(origin)
}

app.use(cors({ origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)) }))
app.use(express.json({ limit: '16kb' }))

function apiError(res: Response, req: Request, status: number, code: string, message: string, details?: unknown[]) {
  return res.status(status).json({ status, code, message, path: req.path, timestamp: new Date().toISOString(), requestId: req.requestId, ...(details ? { details } : {}) })
}

async function requireSession(req, res, next) {
  try {
    const header = req.header('authorization')
    if (!header?.startsWith('Bearer ')) return apiError(res, req, 401, 'MISSING_TOKEN', 'Se requiere un token Bearer.')
    req.session = await currentUserFromToken(header.slice(7).trim())
    next()
  } catch (error) {
    next(error)
  }
}

function requireRole(...allowedRoles: string[]) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.session?.activeRole)) return apiError(res, req, 403, 'FORBIDDEN', 'El rol activo no tiene permisos para esta operación.')
    next()
  }
}

app.use((req, _res, next) => {
  req.requestId = randomUUID()
  next()
})

app.get('/health', async (_req, res, next) => {
  try {
    await checkDatabaseConnection()
    res.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    next(error)
  }
})

const router = express.Router()

router.get('/health', async (_req, res, next) => {
  try {
    await checkDatabaseConnection()
    res.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    next(error)
  }
})

router.post('/auth/login', async (req, res, next) => {
  try {
    res.status(200).json(await login(req.body))
  } catch (error) {
    next(error)
  }
})

router.post('/auth/select-role', async (req, res, next) => {
  try {
    res.status(200).json(await selectRole(req.body))
  } catch (error) {
    next(error)
  }
})

router.get('/auth/me', async (req, res, next) => {
  try {
    const header = req.header('authorization')
    if (!header?.startsWith('Bearer ')) return apiError(res, req, 401, 'MISSING_TOKEN', 'Se requiere un token Bearer.')
    const session = await currentUserFromToken(header.slice(7).trim())
    res.status(200).json({ ...session.user, activeRole: session.activeRole })
  } catch (error) {
    next(error)
  }
})

router.post('/auth/logout', (_req, res) => res.status(204).send())

router.get('/portal/dashboard', requireSession, async (req, res, next) => {
  try { res.json(req.session.activeRole === 'Administrador' ? await adminDashboard() : await dashboard(req.session)) } catch (error) { next(error) }
})

router.get('/availability', requireSession, async (req, res, next) => {
  try { res.json(await listPortalAvailability(req.session)) } catch (error) { next(error) }
})

router.get('/sessions', requireSession, async (req, res, next) => {
  try { res.json(await listPortalSessions(req.session)) } catch (error) { next(error) }
})

router.get('/admin/dashboard', requireSession, requireRole('Administrador'), async (_req, res, next) => {
  try { res.json(await adminDashboard()) } catch (error) { next(error) }
})

router.get('/admin/reports', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await adminReport(req.query)) } catch (error) { next(error) }
})

router.get('/admin/catalogs', requireSession, requireRole('Administrador'), async (_req, res, next) => {
  try { res.json(await adminCatalogs()) } catch (error) { next(error) }
})

router.get('/admin/configuration/credentials', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await listCredentials(req.query.role)) } catch (error) { next(error) }
})

router.post('/admin/configuration/credentials/:id/reset', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await resetCredential(Number(req.params.id))) } catch (error) { next(error) }
})

router.patch('/admin/configuration/password', requireSession, async (req, res, next) => {
  try { res.json(await changePassword(req.session.user.id, req.body)) } catch (error) { next(error) }
})

router.get('/admin/configuration/settings', requireSession, requireRole('Administrador'), async (_req, res, next) => {
  try { res.json(await listSettings()) } catch (error) { next(error) }
})

router.patch('/admin/configuration/settings', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await updateSettings(req.body)) } catch (error) { next(error) }
})

router.get('/admin/db-status', requireSession, requireRole('Administrador'), async (_req, res, next) => {
  try { res.json(await adminDbStatus()) } catch (error) { next(error) }
})

router.get('/users', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await listAdminUsers(req.query)) } catch (error) { next(error) }
})

router.post('/users', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.status(201).json(await createAdminUser(req.body)) } catch (error) { next(error) }
})

router.patch('/users/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await updateAdminUser(Number(req.params.id), req.body)) } catch (error) { next(error) }
})

router.delete('/users/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { await deleteAdminUser(Number(req.params.id), req.session.id); res.status(204).send() } catch (error) { next(error) }
})

router.get('/spaces', requireSession, async (req, res, next) => {
  try { res.json(await listAdminSpaces(req.query)) } catch (error) { next(error) }
})

router.post('/spaces', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.status(201).json(await createAdminSpace(req.body)) } catch (error) { next(error) }
})

router.patch('/spaces/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await updateAdminSpace(Number(req.params.id), req.body)) } catch (error) { next(error) }
})

router.delete('/spaces/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { await deleteAdminSpace(Number(req.params.id)); res.status(204).send() } catch (error) { next(error) }
})

router.get('/requests', requireSession, async (req, res, next) => {
  try { res.json(req.session.activeRole === 'Administrador' ? await listAdminRequests(req.query) : await listRequests({ session: req.session, search: req.query.search, status: req.query.status, page: req.query.page, pageSize: req.query.pageSize })) } catch (error) { next(error) }
})

router.get('/catalogs/subjects', requireSession, async (_req, res, next) => {
  try { res.json(await listSubjects()) } catch (error) { next(error) }
})

router.get('/catalogs/periods', requireSession, async (_req, res, next) => {
  try { res.json(await listPeriods()) } catch (error) { next(error) }
})

router.post('/requests', requireSession, async (req, res, next) => {
  try { res.status(201).json(req.session.activeRole === 'Administrador' ? await createAdminRequest(req.body) : await createRequest(req.session, req.body)) } catch (error) { next(error) }
})

router.patch('/requests/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await updateAdminRequest(Number(req.params.id), req.body)) } catch (error) { next(error) }
})

router.delete('/requests/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { await deleteAdminRequest(Number(req.params.id)); res.status(204).send() } catch (error) { next(error) }
})

app.use(config.apiPrefix, router)

app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    return apiError(res, req, 422, 'VALIDATION_ERROR', 'La información enviada no cumple las reglas de validación.', error.issues.map((issue) => ({ path: issue.path, message: issue.message })))
  }
  if (error instanceof AuthError) return apiError(res, req, error.status, error.code, error.message)
  if (error instanceof DataError) return apiError(res, req, error.status, error.code, error.message)
  console.error(error)
  return apiError(res, req, 500, 'INTERNAL_ERROR', 'Ocurrió un error interno del servidor.')
})

let server: ReturnType<typeof app.listen> | undefined

async function start() {
  try {
    await initializeDatabase()
    server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`API ejecutándose en http://localhost:${config.port}${config.apiPrefix}`)
    })
  } catch (error) {
    console.error('No fue posible preparar la base de datos:', error)
    process.exitCode = 1
  }
}

process.on('SIGTERM', () => server?.close())
process.on('SIGINT', () => server?.close())
void start()
