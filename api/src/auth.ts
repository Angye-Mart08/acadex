// @ts-nocheck
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { config } from './config.js'
import { pool } from './db.js'
import { sendAdminPasswordResetCode } from './email.js'

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
  jti: string
  activeRole: Role
  purpose: 'access'
}

type PreAuthClaims = jwt.JwtPayload & {
  sub: string
  jti: string
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

async function issueAccessToken(user: AuthenticatedUser, activeRole: Role) {
  const sessionId = randomUUID()
  const token = jwt.sign({
    sub: String(user.id),
    email: user.email,
    roles: user.roles,
    activeRole,
    purpose: 'access',
    jti: sessionId,
  }, config.jwtSecret, { expiresIn: config.accessTokenTtl })
  const claims = jwt.decode(token) as jwt.JwtPayload
  await pool.execute(
    `INSERT INTO SesionIngreso (id_sesion, id_usuario, rol_activo, expira_en)
     VALUES (?, ?, ?, FROM_UNIXTIME(?))`,
    [sessionId, user.id, activeRole, claims.exp],
  )
  return { token, expiresIn: Number(claims.exp) - Number(claims.iat) }
}

async function issuePreAuthToken(user: AuthenticatedUser) {
  const sessionId = randomUUID()
  const token = jwt.sign({ sub: String(user.id), roles: user.roles, purpose: 'role-selection', jti: sessionId }, config.jwtSecret, { expiresIn: config.preAuthTokenTtl })
  const claims = jwt.decode(token) as jwt.JwtPayload
  await pool.execute(
    'INSERT INTO SesionPreAutenticacion (id_sesion, id_usuario, expira_en) VALUES (?, ?, FROM_UNIXTIME(?))',
    [sessionId, user.id, claims.exp],
  )
  return token
}

async function publicLoginResponse(user: AuthenticatedUser, activeRole?: Role) {
  const preAuthToken = user.roles.length > 1 && !activeRole ? await issuePreAuthToken(user) : undefined
  const access = activeRole ? await issueAccessToken(user, activeRole) : null
  return {
    ...(access ? { accessToken: access.token, tokenType: 'Bearer', expiresIn: access.expiresIn, activeRole } : {}),
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
  const isAdministrator = rows.some((row) => row.role === 'Administrador')
  await assertAccountCanAttemptLogin(rows[0].id, isAdministrator)
  const passwordCheck = await verifyPassword(input.password, rows[0].passwordHash)
  if (!passwordCheck.valid) {
    const failure = await registerFailedLogin(rows[0].id, isAdministrator)
    if (failure.lockout) {
      const isSuspended = failure.lockout.type === 'suspension24h'
      throw new AuthError(
        isSuspended ? 423 : 429,
        isSuspended ? 'ACCOUNT_SUSPENDED' : 'LOGIN_COOLDOWN',
        isSuspended
          ? isAdministrator
            ? 'Se agotaron los intentos. La cuenta quedó suspendida por 24 horas; puedes solicitar un código para cambiar tu contraseña.'
            : 'Se agotaron los intentos. La cuenta quedó suspendida por 24 horas; puedes notificar al administrador para solicitar un cambio de contraseña.'
          : 'Se alcanzó el límite de intentos. Espera un minuto antes de volver a intentarlo.',
        failure.lockout,
      )
    }
    throw new AuthError(401, 'INVALID_CREDENTIALS', 'Las credenciales no son válidas.')
  }
  await clearFailedLogins(rows[0].id)
  if (passwordCheck.needsUpgrade) {
    const passwordHash = await bcrypt.hash(input.password, 12)
    await pool.execute('UPDATE Credencial SET password_hash = ?, primer_inicio = 1, ultimo_acceso = CURRENT_TIMESTAMP WHERE id_credencial = ?', [passwordHash, rows[0].credentialId])
  } else {
    await pool.execute('UPDATE Credencial SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id_credencial = ?', [rows[0].credentialId])
  }
  const user = toUser(rows)
  user.mustChangePassword = user.mustChangePassword || passwordCheck.needsUpgrade
  return publicLoginResponse(user, user.roles.length === 1 ? user.roles[0] : undefined)
}

type LoginLockout = { type: 'espera' | 'suspension24h'; retryAfterSeconds: number; attempts: number; canResetWithCode?: boolean }

function lockedError(type: 'espera' | 'suspension24h', retryAfterSeconds: number, attempts: number, canResetWithCode = false) {
  const suspended = type === 'suspension24h'
  return new AuthError(
    suspended ? 423 : 429,
    suspended ? 'ACCOUNT_SUSPENDED' : 'LOGIN_COOLDOWN',
    suspended
      ? canResetWithCode
        ? 'La cuenta está suspendida por 24 horas. Puedes solicitar un código para cambiar tu contraseña.'
        : 'La cuenta está suspendida por 24 horas. Puedes notificar al administrador para solicitar un cambio de contraseña.'
      : 'La cuenta está en espera. Inténtalo cuando termine el contador.',
    { type, retryAfterSeconds, attempts, canResetWithCode },
  )
}

async function assertAccountCanAttemptLogin(userId: number, canResetWithCode: boolean) {
  const [rows] = await pool.query(
    `SELECT intentos_fallidos AS attempts, tipo_bloqueo AS lockType,
            TIMESTAMPDIFF(SECOND,CURRENT_TIMESTAMP,bloqueada_hasta) AS secondsLeft
       FROM ControlAcceso WHERE id_usuario=?`,
    [userId],
  )
  if (!rows.length) return
  const state = rows[0]
  const secondsLeft = Number(state.secondsLeft ?? 0)
  if (secondsLeft > 0) throw lockedError(state.lockType, secondsLeft, Number(state.attempts), canResetWithCode)
  if (state.lockType) {
    if (state.lockType === 'suspension24h') await clearFailedLogins(userId)
    else await pool.execute('UPDATE ControlAcceso SET bloqueada_hasta=NULL,tipo_bloqueo=NULL WHERE id_usuario=?', [userId])
  }
}

async function registerFailedLogin(userId: number, canResetWithCode: boolean): Promise<{ lockout?: LoginLockout }> {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.execute('INSERT IGNORE INTO ControlAcceso(id_usuario) VALUES (?)', [userId])
    const [rows] = await connection.query(
      `SELECT intentos_fallidos AS attempts, tipo_bloqueo AS lockType,
              TIMESTAMPDIFF(SECOND,CURRENT_TIMESTAMP,bloqueada_hasta) AS secondsLeft
         FROM ControlAcceso WHERE id_usuario=? FOR UPDATE`,
      [userId],
    )
    const state = rows[0]
    const secondsLeft = Number(state.secondsLeft ?? 0)
    if (secondsLeft > 0) throw lockedError(state.lockType, secondsLeft, Number(state.attempts), canResetWithCode)

    let attempts = Number(state.attempts)
    if (state.lockType === 'suspension24h') attempts = 0
    const nextAttempts = attempts + 1
    const lockType = nextAttempts >= 5 ? 'suspension24h' : nextAttempts >= 3 ? 'espera' : null
    const waitSeconds = lockType === 'suspension24h' ? 24 * 60 * 60 : lockType === 'espera' ? 60 : 0
    await connection.execute(
      `UPDATE ControlAcceso
          SET intentos_fallidos=?,
              bloqueada_hasta=IF(?=0,NULL,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL ? SECOND)),
              tipo_bloqueo=?
        WHERE id_usuario=?`,
      [nextAttempts, waitSeconds, waitSeconds, lockType, userId],
    )
    await connection.commit()
    return lockType ? { lockout: { type: lockType, retryAfterSeconds: waitSeconds, attempts: nextAttempts, canResetWithCode } } : {}
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function clearFailedLogins(userId: number) {
  await pool.execute(
    `INSERT INTO ControlAcceso(id_usuario,intentos_fallidos,bloqueada_hasta,tipo_bloqueo,cambio_clave_solicitado_en)
     VALUES (?,0,NULL,NULL,NULL)
     ON DUPLICATE KEY UPDATE intentos_fallidos=0,bloqueada_hasta=NULL,tipo_bloqueo=NULL,cambio_clave_solicitado_en=NULL`,
    [userId],
  )
}

const passwordChangeRequestSchema = z.object({ email: loginSchema.shape.email }).strict()
export async function requestPasswordChange(payload: unknown) {
  const { email } = passwordChangeRequestSchema.parse(payload)
  const genericResponse = { requested: true, message: 'Si la cuenta cumple los requisitos, recibirás instrucciones en el correo institucional.' }
  const connection = await pool.getConnection()
  let adminCodeRequest: { id: number; email: string; name: string; code: string } | null = null
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query(
      `SELECT u.id_usuario AS id, u.correo AS email, CONCAT(u.nombres,' ',u.apellidos) AS name,
              ca.tipo_bloqueo AS lockType,
              TIMESTAMPDIFF(SECOND,CURRENT_TIMESTAMP,ca.bloqueada_hasta) AS lockSecondsLeft,
              TIMESTAMPDIFF(SECOND,ca.cambio_clave_solicitado_en,CURRENT_TIMESTAMP) AS requestAge,
              EXISTS (SELECT 1 FROM UsuarioRol ur JOIN Rol r ON r.id_rol=ur.id_rol
                       WHERE ur.id_usuario=u.id_usuario AND ur.estado='Activo'
                         AND r.estado='Activo' AND r.nombre='Administrador') AS isAdministrator
         FROM Usuario u JOIN Credencial c ON c.id_usuario=u.id_usuario
         JOIN ControlAcceso ca ON ca.id_usuario=u.id_usuario
        WHERE LOWER(u.correo)=LOWER(?) AND u.estado='Activo' AND c.estado='Activo'
        FOR UPDATE`,
      [email],
    )
    const account = rows[0]
    if (!account || account.lockType !== 'suspension24h' || Number(account.lockSecondsLeft ?? 0) <= 0) {
      await connection.commit()
      return genericResponse
    }
    if (account.isAdministrator) {
      const [lastRequestRows] = await connection.query(
        `SELECT TIMESTAMPDIFF(SECOND,MAX(creado_en),CURRENT_TIMESTAMP) AS secondsSinceLast
           FROM CodigoRestablecimientoAdmin WHERE id_usuario=?`,
        [account.id],
      )
      if (lastRequestRows[0]?.secondsSinceLast !== null && Number(lastRequestRows[0]?.secondsSinceLast) < 60) {
        await connection.commit()
        return genericResponse
      }
      const code = String(randomInt(100000, 1000000))
      const codeHash = createHmac('sha256', config.jwtSecret).update(`${account.id}:${code}`).digest('hex')
      await connection.execute(
        'UPDATE CodigoRestablecimientoAdmin SET consumido_en=CURRENT_TIMESTAMP WHERE id_usuario=? AND consumido_en IS NULL',
        [account.id],
      )
      await connection.execute(
        `INSERT INTO CodigoRestablecimientoAdmin(id_solicitud,id_usuario,codigo_hash,expira_en)
         VALUES (?,?,?,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 10 MINUTE))`,
        [randomUUID(), account.id, codeHash],
      )
      adminCodeRequest = { id: Number(account.id), email: account.email, name: account.name, code }
      await connection.commit()
    } else {
      if (account.requestAge !== null && Number(account.requestAge) < 15 * 60) {
        await connection.commit()
        return genericResponse
      }
      await connection.execute('UPDATE ControlAcceso SET cambio_clave_solicitado_en=CURRENT_TIMESTAMP WHERE id_usuario=?', [account.id])
      await connection.execute(
        `INSERT INTO SolicitudCambioClave(id_usuario,correo_solicitante,nombre_solicitante,tipo_solicitud)
         VALUES (?, ?, ?, 'AyudaAdministrador')`,
        [account.id, account.email, account.name],
      )
      const [admins] = await connection.query(
        `SELECT DISTINCT u.id_usuario AS id
           FROM Usuario u JOIN UsuarioRol ur ON ur.id_usuario=u.id_usuario
           JOIN Rol r ON r.id_rol=ur.id_rol
          WHERE u.estado='Activo' AND ur.estado='Activo' AND r.estado='Activo' AND r.nombre='Administrador'`,
      )
      for (const admin of admins) {
        await connection.execute(
          `INSERT INTO Notificacion(id_usuario,categoria,titulo,mensaje,entidad_tipo,entidad_id,leida)
           VALUES (?,'Sistema','Solicitud de cambio de contraseña',?, 'credencial', ?, FALSE)`,
          [admin.id, `${account.name} (${account.email}) solicitó ayuda para restablecer su contraseña tras agotar los intentos de acceso.`, account.id],
        )
      }
      await connection.commit()
      return genericResponse
    }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  if (adminCodeRequest) {
    try {
      await sendAdminPasswordResetCode(adminCodeRequest.email, adminCodeRequest.name, adminCodeRequest.code)
    } catch (error) {
      await pool.execute(
        'UPDATE CodigoRestablecimientoAdmin SET consumido_en=CURRENT_TIMESTAMP WHERE id_usuario=? AND consumido_en IS NULL',
        [adminCodeRequest.id],
      )
      // Keep SMTP diagnostics local to the API terminal; never log the code or SMTP password.
      console.error('[Correo de recuperación] Falló el envío SMTP:', {
        code: error?.code,
        responseCode: error?.responseCode,
        command: error?.command,
        message: error?.message,
      })
      throw new AuthError(503, 'RESET_EMAIL_UNAVAILABLE', error?.code === 'EMAIL_NOT_CONFIGURED'
        ? 'El envío de códigos no está configurado todavía. Contacta al administrador del sistema.'
        : 'No se pudo enviar el código. Inténtalo de nuevo más tarde.')
    }
    await pool.execute(
      `INSERT INTO SolicitudCambioClave(id_usuario,correo_solicitante,nombre_solicitante,tipo_solicitud)
       VALUES (?, ?, ?, 'CodigoCorreo')`,
      [adminCodeRequest.id, adminCodeRequest.email, adminCodeRequest.name],
    )
  }
  return genericResponse
}

const adminPasswordResetSchema = z.object({
  email: loginSchema.shape.email,
  code: z.string().regex(/^\d{6}$/, 'El código debe contener seis dígitos.'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña supera el límite admitido.'),
  confirmPassword: z.string().min(8).max(72),
}).strict().refine((value) => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'], message: 'Las contraseñas nuevas no coinciden.',
})

export async function resetAdminPassword(payload: unknown) {
  const input = adminPasswordResetSchema.parse(payload)
  const connection = await pool.getConnection()
  let incorrectCode = false
  let transactionCommitted = false
  try {
    await connection.beginTransaction()
    const [accounts] = await connection.query(
      `SELECT u.id_usuario AS id
         FROM Usuario u JOIN Credencial c ON c.id_usuario=u.id_usuario
         JOIN ControlAcceso ca ON ca.id_usuario=u.id_usuario
         JOIN UsuarioRol ur ON ur.id_usuario=u.id_usuario AND ur.estado='Activo'
         JOIN Rol r ON r.id_rol=ur.id_rol AND r.estado='Activo'
        WHERE LOWER(u.correo)=LOWER(?) AND u.estado='Activo' AND c.estado='Activo'
          AND ca.tipo_bloqueo='suspension24h' AND ca.bloqueada_hasta>CURRENT_TIMESTAMP
          AND r.nombre='Administrador'
        LIMIT 1 FOR UPDATE`,
      [input.email],
    )
    if (!accounts.length) throw new AuthError(400, 'INVALID_RESET_CODE', 'El código no es válido o ya venció. Solicita uno nuevo.')
    const userId = Number(accounts[0].id)
    const [codes] = await connection.query(
      `SELECT id_solicitud AS id,codigo_hash AS codeHash,intentos AS attempts
         FROM CodigoRestablecimientoAdmin
        WHERE id_usuario=? AND consumido_en IS NULL AND expira_en>CURRENT_TIMESTAMP
        ORDER BY creado_en DESC LIMIT 1 FOR UPDATE`,
      [userId],
    )
    if (!codes.length || Number(codes[0].attempts) >= 5) {
      throw new AuthError(400, 'INVALID_RESET_CODE', 'El código no es válido o ya venció. Solicita uno nuevo.')
    }
    const expected = createHmac('sha256', config.jwtSecret).update(`${userId}:${input.code}`).digest()
    const stored = Buffer.from(codes[0].codeHash, 'hex')
    const codeIsValid = stored.length === expected.length && timingSafeEqual(stored, expected)
    if (!codeIsValid) {
      const nextAttempts = Number(codes[0].attempts) + 1
      await connection.execute(
        'UPDATE CodigoRestablecimientoAdmin SET intentos=?,consumido_en=IF(? >= 5,CURRENT_TIMESTAMP,consumido_en) WHERE id_solicitud=?',
        [nextAttempts, nextAttempts, codes[0].id],
      )
      await connection.commit()
      transactionCommitted = true
      incorrectCode = true
    } else {
      const passwordHash = await bcrypt.hash(input.newPassword, 12)
      await connection.execute(
        'UPDATE Credencial SET password_hash=?,primer_inicio=0,ultimo_acceso=NULL WHERE id_usuario=? AND estado=\'Activo\'',
        [passwordHash, userId],
      )
      await connection.execute(
        `UPDATE CodigoRestablecimientoAdmin SET consumido_en=CURRENT_TIMESTAMP
          WHERE id_usuario=? AND consumido_en IS NULL`,
        [userId],
      )
      await connection.execute(
        `UPDATE ControlAcceso SET intentos_fallidos=0,bloqueada_hasta=NULL,tipo_bloqueo=NULL,
          cambio_clave_solicitado_en=NULL WHERE id_usuario=?`,
        [userId],
      )
      await connection.execute(
        `UPDATE SolicitudCambioClave
            SET estado='Completada',completada_en=CURRENT_TIMESTAMP,gestionada_por=?
          WHERE id_usuario=? AND estado='Pendiente'`,
        [userId, userId],
      )
      await connection.execute('UPDATE SesionIngreso SET revocada_en=CURRENT_TIMESTAMP WHERE id_usuario=? AND revocada_en IS NULL', [userId])
      await connection.execute('UPDATE SesionPreAutenticacion SET revocada_en=CURRENT_TIMESTAMP WHERE id_usuario=? AND revocada_en IS NULL', [userId])
      await connection.commit()
      transactionCommitted = true
    }
  } catch (error) {
    if (!transactionCommitted) await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  if (incorrectCode) throw new AuthError(400, 'INVALID_RESET_CODE', 'El código no es válido. Revisa el mensaje e inténtalo de nuevo.')
  return { changed: true }
}

export async function selectRole(payload: unknown) {
  const input = roleSelectionSchema.parse(payload)
  let claims: PreAuthClaims
  try {
    claims = jwt.verify(input.preAuthToken, config.jwtSecret) as PreAuthClaims
  } catch {
    throw new AuthError(401, 'INVALID_PRE_AUTH_TOKEN', 'La sesión preliminar no es válida o expiró.')
  }
  if (claims.purpose !== 'role-selection' || !claims.sub || !claims.jti || !claims.roles?.includes(input.role)) {
    throw new AuthError(403, 'ROLE_NOT_ALLOWED', 'El rol seleccionado no está asignado a este usuario.')
  }
  const rows = await findAuthRowsByUserId(Number(claims.sub))
  if (!rows.length) throw new AuthError(401, 'USER_NOT_AVAILABLE', 'El usuario ya no está disponible.')
  const user = toUser(rows)
  if (!user.roles.includes(input.role)) throw new AuthError(403, 'ROLE_NOT_ALLOWED', 'El rol seleccionado ya no está asignado a este usuario.')
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [preAuthRows] = await connection.query(
      'SELECT id_sesion FROM SesionPreAutenticacion WHERE id_sesion=? AND id_usuario=? AND revocada_en IS NULL AND expira_en>CURRENT_TIMESTAMP FOR UPDATE',
      [claims.jti, user.id],
    )
    if (!preAuthRows.length) throw new AuthError(401, 'INVALID_PRE_AUTH_TOKEN', 'El token de selección ya se usó, fue revocado o expiró. Inicia sesión nuevamente.')
    await connection.execute('UPDATE SesionPreAutenticacion SET revocada_en=CURRENT_TIMESTAMP WHERE id_sesion=?', [claims.jti])
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  return publicLoginResponse(user, input.role)
}

export async function cancelRoleSelection(token: string) {
  let claims: PreAuthClaims
  try {
    claims = jwt.verify(token, config.jwtSecret) as PreAuthClaims
  } catch {
    return
  }
  if (claims.purpose !== 'role-selection' || !claims.sub || !claims.jti) return
  await pool.execute(
    'UPDATE SesionPreAutenticacion SET revocada_en=CURRENT_TIMESTAMP WHERE id_sesion=? AND id_usuario=? AND revocada_en IS NULL',
    [claims.jti, Number(claims.sub)],
  )
}

export async function changeActiveRole(session: { user: AuthenticatedUser; sessionId: string }, payload: unknown) {
  const input = z.object({ role: z.enum(roles) }).strict().parse(payload)
  if (!session.user.roles.includes(input.role)) throw new AuthError(403, 'ROLE_NOT_ALLOWED', 'El rol seleccionado no está asignado a este usuario.')
  const access = await issueAccessToken(session.user, input.role)
  const [revoked] = await pool.execute(
    'UPDATE SesionIngreso SET revocada_en=CURRENT_TIMESTAMP WHERE id_sesion=? AND id_usuario=? AND revocada_en IS NULL',
    [session.sessionId, session.user.id],
  )
  if (!revoked.affectedRows) {
    await revokeSession(access.token)
    throw new AuthError(401, 'SESSION_REVOKED', 'La sesión de ingreso fue cerrada. Inicia sesión nuevamente.')
  }
  return {
    accessToken: access.token,
    tokenType: 'Bearer',
    expiresIn: access.expiresIn,
    requiresRoleSelection: false,
    activeRole: input.role,
    roles: session.user.roles,
    user: session.user,
  }
}

export async function currentUserFromToken(token: string) {
  let claims: AccessClaims
  try {
    claims = jwt.verify(token, config.jwtSecret) as AccessClaims
  } catch {
    throw new AuthError(401, 'INVALID_TOKEN', 'El token de acceso no es válido o expiró.')
  }
  if (claims.purpose !== 'access' || !claims.sub || !claims.activeRole || !claims.jti) {
    throw new AuthError(401, 'INVALID_TOKEN', 'El token de acceso no es válido.')
  }
  const [activeSessions] = await pool.query(
    `SELECT id_sesion FROM SesionIngreso
      WHERE id_sesion = ? AND id_usuario = ? AND revocada_en IS NULL AND expira_en > CURRENT_TIMESTAMP`,
    [claims.jti, Number(claims.sub)],
  )
  if (!activeSessions.length) throw new AuthError(401, 'SESSION_REVOKED', 'La sesión de ingreso fue cerrada o expiró. Inicia sesión nuevamente.')
  const rows = await findAuthRowsByUserId(Number(claims.sub))
  if (!rows.length) throw new AuthError(401, 'USER_NOT_AVAILABLE', 'El usuario ya no está disponible.')
  const user = toUser(rows)
  if (!user.roles.includes(claims.activeRole)) throw new AuthError(401, 'ROLE_NOT_AVAILABLE', 'El rol activo ya no está asignado.')
  return { user, activeRole: claims.activeRole, sessionId: claims.jti }
}

export async function revokeSession(token: string) {
  let claims: AccessClaims
  try {
    claims = jwt.verify(token, config.jwtSecret) as AccessClaims
  } catch {
    // El cierre de sesión es idempotente: un token expirado ya no puede usarse.
    return
  }
  if (claims.purpose !== 'access' || !claims.sub || !claims.jti) return
  await pool.execute(
    'UPDATE SesionIngreso SET revocada_en = CURRENT_TIMESTAMP WHERE id_sesion = ? AND id_usuario = ? AND revocada_en IS NULL',
    [claims.jti, Number(claims.sub)],
  )
}

export class AuthError extends Error {
  status: number
  code: string
  metadata?: Record<string, unknown>

  constructor(status: number, code: string, message: string, metadata?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.code = code
    this.metadata = metadata
  }
}

export { loginSchema, roleSelectionSchema }
