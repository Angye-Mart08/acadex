// @ts-nocheck
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { z, ZodError } from 'zod'
import { AuthError, currentUserFromToken, login, selectRole } from './auth.js'
import { checkDatabaseConnection, initializeDatabase } from './db.js'
import { config } from './config.js'
import { DataError, createRequest, dashboard, listPeriods, listPortalAvailability, listPortalSessions, listRequests, listSubjects } from './data.js'
import { adminCatalogs, adminDashboard, adminDbStatus, adminReport, assignAdminRequest, changePassword, createAdminPeriod, createAdminRequest, createAdminSpace, createAdminUser, deleteAdminPeriod, deleteAdminRequest, deleteAdminSpace, deleteAdminUser, exportTemporaryCredentials, listAdminPeriods, listAdminRequests, listAdminSpaces, listAdminUsers, listCredentials, listSettings, resetCredential, updateAdminPeriod, updateAdminRequest, updateAssignedRequestStatus, updateAdminSpace, updateAdminUser, updateSettings } from './admin.js'

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
    const passwordChangeAllowedRoutes = new Set(['/admin/configuration/password', '/auth/logout'])
    if (req.session.user.mustChangePassword && !passwordChangeAllowedRoutes.has(req.path)) {
      return apiError(res, req, 403, 'PASSWORD_CHANGE_REQUIRED', 'Debes cambiar tu contraseña temporal antes de continuar.')
    }
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

const idParamSchema = z.coerce.number().int().positive()
const requestQuerySchema = z.object({ search: z.string().trim().max(120).optional(), status: z.enum(['Pendiente','Aprobada','Asignada','Rechazada','Cancelada','Atendida','Finalizada']).optional(), page: z.coerce.number().int().positive().optional(), pageSize: z.coerce.number().int().positive().max(100).optional() }).strict()
const userQuerySchema = z.object({ search: z.string().trim().max(120).optional(), role: z.enum(['Administrador','Tutor','Monitor','Estudiante']).optional(), page: z.coerce.number().int().positive().optional(), pageSize: z.coerce.number().int().positive().max(100).optional() }).strict()
const spaceQuerySchema = z.object({ search: z.string().trim().max(120).optional(), status: z.enum(['Activo','Inactivo']).optional(), type: z.enum(['Aula','Laboratorio','Sala','Sala de informática','Biblioteca','Salón de reuniones','Otro','Virtual']).optional(), building: z.string().max(80).optional(), minCapacity: z.coerce.number().int().positive().max(1000).optional() }).strict()
const isoDateQuerySchema = z.string().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value, 'La fecha debe tener formato AAAA-MM-DD y ser válida.')
const reportQuerySchema = z.object({ subjectId: z.coerce.number().int().positive().optional(), from: isoDateQuerySchema.optional(), to: isoDateQuerySchema.optional() }).strict().refine((value) => !value.from || !value.to || value.from <= value.to, { path: ['to'], message: 'La fecha hasta debe ser igual o posterior a la fecha desde.' })

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

// Cierra la sesión del cliente; el JWT stateless permanece válido hasta expirar.
router.post('/auth/logout', requireSession, (_req, res) => res.status(204).send())

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
  try { res.json(await adminReport(reportQuerySchema.parse(req.query))) } catch (error) { next(error) }
})

router.get('/admin/catalogs', requireSession, requireRole('Administrador'), async (_req, res, next) => {
  try { res.json(await adminCatalogs()) } catch (error) { next(error) }
})

router.get('/admin/configuration/credentials', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { const query=z.object({role:z.enum(['Administrador','Tutor','Monitor','Estudiante']).optional()}).strict().parse(req.query); res.json(await listCredentials(query.role)) } catch (error) { next(error) }
})

router.post('/admin/configuration/credentials/export', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { const body=z.object({role:z.enum(['Administrador','Tutor','Monitor','Estudiante'])}).strict().parse(req.body); res.json(await exportTemporaryCredentials(body.role,req.session.user.id)) } catch (error) { next(error) }
})

router.post('/admin/configuration/credentials/:id/reset', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await resetCredential(idParamSchema.parse(req.params.id),req.session.user.id)) } catch (error) { next(error) }
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
  try { res.json(await listAdminUsers(userQuerySchema.parse(req.query))) } catch (error) { next(error) }
})

router.post('/users', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.status(201).json(await createAdminUser(req.body)) } catch (error) { next(error) }
})

router.patch('/users/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await updateAdminUser(idParamSchema.parse(req.params.id), req.body)) } catch (error) { next(error) }
})

router.delete('/users/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { await deleteAdminUser(idParamSchema.parse(req.params.id), req.session.user.id); res.status(204).send() } catch (error) { next(error) }
})

router.get('/spaces', requireSession, async (req, res, next) => {
  try { res.json(await listAdminSpaces(spaceQuerySchema.parse(req.query))) } catch (error) { next(error) }
})

router.post('/spaces', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.status(201).json(await createAdminSpace(req.body)) } catch (error) { next(error) }
})

router.patch('/spaces/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await updateAdminSpace(idParamSchema.parse(req.params.id), req.body)) } catch (error) { next(error) }
})

router.delete('/spaces/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { await deleteAdminSpace(idParamSchema.parse(req.params.id)); res.status(204).send() } catch (error) { next(error) }
})

router.get('/requests', requireSession, async (req, res, next) => {
  try { const query=requestQuerySchema.parse(req.query); res.json(req.session.activeRole === 'Administrador' ? await listAdminRequests(query) : await listRequests({ session: req.session, ...query })) } catch (error) { next(error) }
})

router.get('/catalogs/subjects', requireSession, async (_req, res, next) => {
  try { res.json(await listSubjects()) } catch (error) { next(error) }
})

router.get('/catalogs/periods', requireSession, async (_req, res, next) => {
  try { res.json(await listPeriods()) } catch (error) { next(error) }
})

router.get('/periods', requireSession, requireRole('Administrador'), async (_req, res, next) => {
  try { res.json(await listAdminPeriods()) } catch (error) { next(error) }
})

router.post('/periods', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.status(201).json(await createAdminPeriod(req.body)) } catch (error) { next(error) }
})

router.patch('/periods/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await updateAdminPeriod(idParamSchema.parse(req.params.id), req.body)) } catch (error) { next(error) }
})

router.delete('/periods/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { await deleteAdminPeriod(idParamSchema.parse(req.params.id)); res.status(204).send() } catch (error) { next(error) }
})

router.post('/requests', requireSession, async (req, res, next) => {
  try { res.status(201).json(req.session.activeRole === 'Administrador' ? await createAdminRequest(req.body) : await createRequest(req.session, req.body)) } catch (error) { next(error) }
})

router.patch('/requests/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await updateAdminRequest(idParamSchema.parse(req.params.id), req.body)) } catch (error) { next(error) }
})

router.post('/requests/:id/assign', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { res.json(await assignAdminRequest(idParamSchema.parse(req.params.id), req.body)) } catch (error) { next(error) }
})

router.patch('/requests/:id/attendance', requireSession, async (req, res, next) => {
  try {
    if (!['Tutor', 'Monitor'].includes(req.session.activeRole)) return apiError(res, req, 403, 'FORBIDDEN', 'Solo el tutor o monitor asignado puede cerrar la atención.')
    res.json(await updateAssignedRequestStatus(req.session, idParamSchema.parse(req.params.id), req.body))
  } catch (error) { next(error) }
})

router.delete('/requests/:id', requireSession, requireRole('Administrador'), async (req, res, next) => {
  try { await deleteAdminRequest(idParamSchema.parse(req.params.id)); res.status(204).send() } catch (error) { next(error) }
})

app.use(config.apiPrefix, router)

app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    return apiError(res, req, 400, 'INVALID_JSON', 'El cuerpo de la solicitud no contiene JSON válido.')
  }
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
