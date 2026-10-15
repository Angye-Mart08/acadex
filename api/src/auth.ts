// @ts-nocheck
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from './config.js'
import { pool } from './db.js'

export const roles = ['Administrador', 'Tutor', 'Monitor', 'Estudiante'] as const
export type Role = typeof roles[number]

const loginSchema = z.object({
  email: z.string().trim().email().max(120).refine(
    (value) => value.toLowerCase().endsWith('@unitropico.edu.co'),
    'Usa tu correo institucional @unitropico.edu.co.',
  ).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña supera el límite admitido.'),
}).strict()

const roleSelectionSchema = z.object({
  preAuthToken: z.string().min(1),
  role: z.enum(roles),
})

type AuthRow = {
  id: number
  code: string
  credentialId: number
  document: string
  names: string
  surnames: string
  email: string
  userStatus: string
  credentialStatus: string
  passwordHash: string
  mustChangePassword: number | boolean
  role: Role
  roleStatus: string
}

type AuthenticatedUser = {
  id: number
  code: string
  name: string
  email: string
  roles: Role[]
  status: 'Activo' | 'Inactivo'
  initials: string
  mustChangePassword: boolean
}

type AccessClaims = jwt.JwtPayload & {
  sub: string
  activeRole: Role
  purpose: 'access'
}

type PreAuthClaims = jwt.JwtPayload & {
  sub: string
  roles: Role[]
  purpose: 'role-selection'
}

const authQuery = `
  SELECT
    u.id_usuario AS id,
    u.codigo AS code,
    u.documento AS document,
    u.nombres AS names,
    u.apellidos AS surnames,
    u.correo AS email,
    u.estado AS userStatus,
    c.id_credencial AS credentialId,
    c.estado AS credentialStatus,
    c.password_hash AS passwordHash,
    c.primer_inicio AS mustChangePassword,
    r.nombre AS role,
    ur.estado AS roleStatus
  FROM Usuario u
  INNER JOIN Credencial c ON c.id_usuario = u.id_usuario
  INNER JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario
  INNER JOIN Rol r ON r.id_rol = ur.id_rol
  WHERE LOWER(u.correo) = LOWER(?)
    AND u.estado = 'Activo'
    AND c.estado = 'Activo'
    AND ur.estado = 'Activo'
    AND r.estado = 'Activo'
  ORDER BY r.id_rol
`

function toUser(rows: AuthRow[]): AuthenticatedUser {
  const first = rows[0]
  const name = `${first.names} ${first.surnames}`.trim()
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  return {
    id: first.id,
    code: first.code,
    name,
    email: first.email,
    roles: [...new Set(rows.map((row) => row.role))],
    status: first.userStatus as 'Activo' | 'Inactivo',
    initials,
    mustChangePassword: rows.some((row) => Boolean(row.mustChangePassword)),
  }
}

async function findAuthRows(email: string): Promise<AuthRow[]> {
  const [rows] = await pool.query(authQuery, [email])
  return rows as AuthRow[]
}

async function findAuthRowsByUserId(id: number): Promise<AuthRow[]> {
  const [rows] = await pool.query(authQuery.replace('LOWER(u.correo) = LOWER(?)', 'u.id_usuario = ?'), [id])
  return rows as AuthRow[]
}

async function verifyPassword(password: string, storedPassword: string) {
  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
    return { valid: await bcrypt.compare(password, storedPassword), needsUpgrade: false }
  }

  // Solo la base local puede migrar las claves históricas del SQL de desarrollo.
  // En producción una contraseña que no sea un hash bcrypt nunca es válida.
  if (process.env.NODE_ENV === 'production') return { valid: false, needsUpgrade: false }
  return { valid: password === storedPassword, needsUpgrade: password === storedPassword }
}

function issueAccessToken(user: AuthenticatedUser, activeRole: Role) {
  return jwt.sign({
    sub: String(user.id),
    email: user.email,
    roles: user.roles,
    activeRole,
    purpose: 'access',
  }, config.jwtSecret, { expiresIn: config.accessTokenTtl })
}

function publicLoginResponse(user: AuthenticatedUser, activeRole?: Role) {
  const preAuthToken = user.roles.length > 1
    ? jwt.sign({ sub: String(user.id), roles: user.roles, purpose: 'role-selection' }, config.jwtSecret, { expiresIn: activeRole ? config.accessTokenTtl : config.preAuthTokenTtl })
    : undefined
  return {
    ...(activeRole ? { accessToken: issueAccessToken(user, activeRole), tokenType: 'Bearer', expiresIn: 8 * 60 * 60, activeRole } : {}),
    requiresRoleSelection: !activeRole,
    ...(preAuthToken ? { preAuthToken } : {}),
    roles: user.roles,
    user,
  }
}

export async function login(payload: unknown) {
  const input = loginSchema.parse(payload)
  const rows = await findAuthRows(input.email)
  if (!rows.length) {
    throw new AuthError(401, 'INVALID_CREDENTIALS', 'Las credenciales no son válidas.')
  }
  const passwordCheck = await verifyPassword(input.password, rows[0].passwordHash)
  if (!passwordCheck.valid) throw new AuthError(401, 'INVALID_CREDENTIALS', 'Las credenciales no son válidas.')
  if (passwordCheck.needsUpgrade) {
    const passwordHash = await bcrypt.hash(input.password, 12)
    await pool.execute('UPDATE Credencial SET password_hash = ?, primer_inicio = 1 WHERE id_credencial = ?', [passwordHash, rows[0].credentialId])
  }
  const user = toUser(rows)
  user.mustChangePassword = user.mustChangePassword || passwordCheck.needsUpgrade
  return publicLoginResponse(user, user.roles.length === 1 ? user.roles[0] : undefined)
}

export async function selectRole(payload: unknown) {
  const input = roleSelectionSchema.parse(payload)
  let claims: PreAuthClaims
  try {
    claims = jwt.verify(input.preAuthToken, config.jwtSecret) as PreAuthClaims
  } catch {
    throw new AuthError(401, 'INVALID_PRE_AUTH_TOKEN', 'La sesión preliminar no es válida o expiró.')
  }
  if (claims.purpose !== 'role-selection' || !claims.sub || !claims.roles?.includes(input.role)) {
    throw new AuthError(403, 'ROLE_NOT_ALLOWED', 'El rol seleccionado no está asignado a este usuario.')
  }
  const rows = await findAuthRowsByUserId(Number(claims.sub))
  if (!rows.length) throw new AuthError(401, 'USER_NOT_AVAILABLE', 'El usuario ya no está disponible.')
  const user = toUser(rows)
  return publicLoginResponse(user, input.role)
}

export async function currentUserFromToken(token: string) {
  let claims: AccessClaims
  try {
    claims = jwt.verify(token, config.jwtSecret) as AccessClaims
  } catch {
    throw new AuthError(401, 'INVALID_TOKEN', 'El token de acceso no es válido o expiró.')
  }
  if (claims.purpose !== 'access' || !claims.sub || !claims.activeRole) {
    throw new AuthError(401, 'INVALID_TOKEN', 'El token de acceso no es válido.')
  }
  const rows = await findAuthRowsByUserId(Number(claims.sub))
  if (!rows.length) throw new AuthError(401, 'USER_NOT_AVAILABLE', 'El usuario ya no está disponible.')
  const user = toUser(rows)
  if (!user.roles.includes(claims.activeRole)) throw new AuthError(401, 'ROLE_NOT_AVAILABLE', 'El rol activo ya no está asignado.')
  return { user, activeRole: claims.activeRole }
}

export class AuthError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export { loginSchema, roleSelectionSchema }
