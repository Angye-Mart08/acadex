// @ts-nocheck
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { access, mkdir, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { pool } from './db.js'
import { publishRoleNotification } from './notifications.js'

const roles = ['Administrador', 'Tutor', 'Monitor', 'Estudiante']

export class DataError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return { names: parts[0] ?? '', surnames: '' }
  return { names: parts.slice(0, -1).join(' '), surnames: parts.at(-1) ?? '' }
}

function normalizeUser(row: any) {
  const name = `${row.names} ${row.surnames}`.trim()
  return {
    id: Number(row.id),
    code: row.code,
    name,
    email: row.email,
    document: row.document,
    roles: String(row.roles ?? '').split(',').filter(Boolean),
    status: row.status,
    initials: initials(name),
  }
}

const userSelect = `
  SELECT u.id_usuario AS id, u.codigo AS code, u.documento AS document,
         u.nombres AS names, u.apellidos AS surnames, u.correo AS email,
         u.estado AS status,
         GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.id_rol SEPARATOR ',') AS roles
    FROM Usuario u
  LEFT JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario AND ur.estado = 'Activo'
  LEFT JOIN Rol r ON r.id_rol = ur.id_rol AND r.estado = 'Activo'
`

function userFilters(search = '', role = '') {
  const where = ['1 = 1']
  const params: any[] = []
  if (search) {
    where.push('(u.codigo LIKE ? OR u.correo LIKE ? OR u.documento LIKE ? OR CONCAT(u.nombres, \' \', u.apellidos) LIKE ?)')
    const value = `%${search}%`
    params.push(value, value, value, value)
  }
  if (role && roles.includes(role)) {
    where.push(`EXISTS (SELECT 1 FROM UsuarioRol ur_filter JOIN Rol r_filter ON r_filter.id_rol=ur_filter.id_rol WHERE ur_filter.id_usuario=u.id_usuario AND ur_filter.estado='Activo' AND r_filter.estado='Activo' AND r_filter.nombre=?)`)
    params.push(role)
  }
  return { where: where.join(' AND '), params }
}

export async function listUsers({ search = '', role = '', page = 1, pageSize = 100 } = {}) {
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 100))
  const offset = (safePage - 1) * safePageSize
  const filters = userFilters(search, role)
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM Usuario u WHERE ${filters.where}`,
    filters.params,
  )
  const [rows] = await pool.query(
    `${userSelect} WHERE ${filters.where}
     GROUP BY u.id_usuario ORDER BY u.id_usuario LIMIT ? OFFSET ?`,
    [...filters.params, safePageSize, offset],
  )
  const total = Number(countRows[0]?.total ?? 0)
  return {
    data: rows.map(normalizeUser),
    pagination: { page: safePage, pageSize: safePageSize, total, totalPages: Math.ceil(total / safePageSize) },
  }
}

async function findUser(id: number) {
  const [rows] = await pool.query(`${userSelect} WHERE u.id_usuario = ? GROUP BY u.id_usuario`, [id])
  if (!rows.length) throw new DataError(404, 'USER_NOT_FOUND', 'El usuario no existe.')
  return normalizeUser(rows[0])
}

async function getRoleIds(connection: any, names: string[]) {
  const uniqueNames = [...new Set(names)]
  if (!uniqueNames.length || uniqueNames.some((name) => !roles.includes(name))) {
    throw new DataError(422, 'INVALID_ROLES', 'Debe seleccionar uno o varios roles válidos.')
  }
  const [rows] = await connection.query(
    `SELECT id_rol AS id, nombre FROM Rol WHERE estado = 'Activo' AND nombre IN (${uniqueNames.map(() => '?').join(',')})`,
    uniqueNames,
  )
  if (rows.length !== uniqueNames.length) throw new DataError(422, 'INVALID_ROLES', 'Uno de los roles no está disponible.')
  return rows
}

async function restoreProfileRoleMemberships(connection: any, userId: number) {
  const [profileRoles] = await connection.query(`
    SELECT r.id_rol
      FROM Rol r
     WHERE r.estado='Activo'
       AND (
         (r.nombre='Administrador' AND EXISTS (SELECT 1 FROM Administrador p WHERE p.id_usuario=? AND p.estado='Activo')) OR
         (r.nombre='Estudiante' AND EXISTS (SELECT 1 FROM Estudiante p WHERE p.id_usuario=? AND p.estado='Activo')) OR
         (r.nombre='Tutor' AND EXISTS (SELECT 1 FROM Tutor p WHERE p.id_usuario=? AND p.estado='Activo')) OR
         (r.nombre='Monitor' AND EXISTS (SELECT 1 FROM Monitor p WHERE p.id_usuario=? AND p.estado='Activo'))
       )`, [userId,userId,userId,userId])
  await connection.execute("UPDATE UsuarioRol SET estado='Inactivo' WHERE id_usuario=?", [userId])
  for (const role of profileRoles) {
    await connection.execute("UPDATE UsuarioRol SET estado='Activo' WHERE id_usuario=? AND id_rol=?", [userId,role.id_rol])
  }
}

const userInputSchema = z.object({
  code: z.string().trim().min(2).max(20),
  document: z.string().trim().min(5).max(20),
  name: z.string().trim().min(2).max(160).refine((value) => /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)+$/u.test(value), 'Escribe un nombre y apellido usando solo letras, espacios, apóstrofes o guiones.'),
  email: z.string().trim().email().max(120),
  roles: z.array(z.enum(roles as [string, ...string[]])).min(1).max(4),
})

const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  email: z.string().trim().email().max(120).optional(),
  roles: z.array(z.enum(roles as [string, ...string[]])).min(1).max(4).optional(),
  status: z.enum(['Activo', 'Inactivo']).optional(),
}).refine((input) => Object.keys(input).length > 0, 'Debe enviar al menos un campo para actualizar.')

export async function createUser(payload: unknown) {
  const input = userInputSchema.parse(payload)
  const { names, surnames } = splitName(input.name)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const roleRows = await getRoleIds(connection, input.roles)
    const [result] = await connection.execute(
      `INSERT INTO Usuario (codigo, documento, nombres, apellidos, correo, estado)
       VALUES (?, ?, ?, ?, ?, 'Activo')`,
      [input.code, input.document, names, surnames, input.email],
    )
    const id = result.insertId
    const passwordHash = await bcrypt.hash(input.document, 12)
    await connection.execute(
      `INSERT INTO Credencial (usuario, password_hash, ultimo_acceso, primer_inicio, estado, id_usuario)
       VALUES (?, ?, NULL, 1, 'Activo', ?)`,
      [input.email, passwordHash, id],
    )
    for (const role of roleRows) await connection.execute('INSERT INTO UsuarioRol (id_usuario, id_rol, estado) VALUES (?, ?, \'Activo\')', [id, role.id])
    await connection.commit()
    return findUser(id)
  } catch (error) {
    await connection.rollback()
    if (error?.code === 'ER_DUP_ENTRY') throw new DataError(409, 'DUPLICATE_USER', 'El código, documento o correo ya está registrado.')
    throw error
  } finally {
    connection.release()
  }
}

export async function updateUser(id: number, payload: unknown) {
  const input = userUpdateSchema.parse(payload)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [existing] = await connection.query('SELECT * FROM Usuario WHERE id_usuario = ?', [id])
    if (!existing.length) throw new DataError(404, 'USER_NOT_FOUND', 'El usuario no existe.')
    if (input.name || input.email || input.status) {
      const fields: string[] = []
      const values: any[] = []
      if (input.name) {
        const name = splitName(input.name)
        fields.push('nombres = ?', 'apellidos = ?')
        values.push(name.names, name.surnames)
      }
      if (input.email) { fields.push('correo = ?'); values.push(input.email) }
      if (input.status) { fields.push('estado = ?'); values.push(input.status) }
      values.push(id)
      await connection.execute(`UPDATE Usuario SET ${fields.join(', ')} WHERE id_usuario = ?`, values)
      if (input.status) {
        await connection.execute('UPDATE Credencial SET estado = ? WHERE id_usuario = ?', [input.status, id])
        if (input.status === 'Activo' && input.roles === undefined) await restoreProfileRoleMemberships(connection,id)
      }
    }
    if (input.roles) {
      const roleRows = await getRoleIds(connection, input.roles)
      await connection.execute("UPDATE UsuarioRol SET estado = 'Inactivo' WHERE id_usuario = ?", [id])
      for (const role of roleRows) {
        await connection.execute(
          `INSERT INTO UsuarioRol (id_usuario, id_rol, estado) VALUES (?, ?, 'Activo')
           ON DUPLICATE KEY UPDATE estado = 'Activo'`,
          [id, role.id],
        )
      }
    }
    await connection.commit()
    return findUser(id)
  } catch (error) {
    await connection.rollback()
    if (error?.code === 'ER_DUP_ENTRY') throw new DataError(409, 'DUPLICATE_USER', 'El correo ya está registrado.')
    throw error
  } finally {
    connection.release()
  }
}

export async function deleteUser(id: number) {
  const [result] = await pool.execute("UPDATE Usuario SET estado = 'Inactivo' WHERE id_usuario = ?", [id])
  if (!result.affectedRows) throw new DataError(404, 'USER_NOT_FOUND', 'El usuario no existe.')
  await pool.execute("UPDATE Credencial SET estado = 'Inactivo' WHERE id_usuario = ?", [id])
  await pool.execute("UPDATE UsuarioRol SET estado = 'Inactivo' WHERE id_usuario = ?", [id])
}

function normalizeSpace(row: any) {
  return {
    id: Number(row.id), code: row.code, name: row.name, type: row.type ?? 'Otro',
    location: row.location ?? '', capacity: Number(row.capacity), status: row.status,
  }
}

const integerInput = (schema: z.ZodType) => z.preprocess((value) => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value, schema)
const spaceSchema = z.object({
  code: z.string().trim().min(2).max(20), name: z.string().trim().min(2).max(120),
  type: z.enum(['Aula', 'Laboratorio', 'Sala', 'Biblioteca', 'Virtual', 'Otro']),
  location: z.string().trim().min(2).max(200), capacity: integerInput(z.number().int().min(1).max(1000)),
})

export async function listSpaces({ search = '', status = '' } = {}) {
  const where = ['1 = 1']
  const params: any[] = []
  if (search) { where.push('(codigo LIKE ? OR nombre LIKE ? OR ubicacion LIKE ?)'); const value = `%${search}%`; params.push(value, value, value) }
  if (status === 'Activo' || status === 'Inactivo') { where.push('estado = ?'); params.push(status) }
  const [rows] = await pool.query(
    `SELECT id_espacio AS id, codigo AS code, nombre AS name, tipo AS type,
            COALESCE(ubicacion, CONCAT_WS(' · ', edificio, bloque, salon)) AS location,
            capacidad AS capacity, estado AS status
       FROM Espacio WHERE ${where.join(' AND ')} ORDER BY id_espacio`, params,
  )
  return rows.map(normalizeSpace)
}

export async function createSpace(payload: unknown) {
  const input = spaceSchema.parse(payload)
  try {
    const [result] = await pool.execute(
      `INSERT INTO Espacio (codigo, nombre, ubicacion, capacidad, tipo, estado) VALUES (?, ?, ?, ?, ?, 'Activo')`,
      [input.code, input.name, input.location, input.capacity, input.type],
    )
    const [rows] = await pool.query('SELECT id_espacio AS id, codigo AS code, nombre AS name, tipo AS type, ubicacion AS location, capacidad AS capacity, estado AS status FROM Espacio WHERE id_espacio = ?', [result.insertId])
    return normalizeSpace(rows[0])
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') throw new DataError(409, 'DUPLICATE_SPACE', 'El código del espacio ya está registrado.')
    throw error
  }
}

export async function updateSpace(id: number, payload: unknown) {
  const input = spaceSchema.partial().extend({ status: z.enum(['Activo', 'Inactivo']).optional() }).refine((value) => Object.keys(value).length > 0, 'Debe enviar al menos un campo.') .parse(payload)
  const fields: string[] = []
  const values: any[] = []
  for (const field of ['name', 'type', 'location', 'capacity', 'status']) {
    if (input[field] !== undefined) {
      const column = field === 'name' ? 'nombre' : field === 'location' ? 'ubicacion' : field === 'capacity' ? 'capacidad' : field === 'status' ? 'estado' : field
      fields.push(`${column} = ?`)
      values.push(input[field])
    }
  }
  values.push(id)
  const [result] = await pool.execute(`UPDATE Espacio SET ${fields.join(', ')} WHERE id_espacio = ?`, values)
  if (!result.affectedRows) throw new DataError(404, 'SPACE_NOT_FOUND', 'El espacio no existe.')
  const rows = await listSpaces()
  return rows.find((space) => space.id === id)
}

export async function deleteSpace(id: number) {
  const [result] = await pool.execute("UPDATE Espacio SET estado = 'Inactivo' WHERE id_espacio = ?", [id])
  if (!result.affectedRows) throw new DataError(404, 'SPACE_NOT_FOUND', 'El espacio no existe.')
}

function normalizeRequest(row: any) {
  return {
    id: Number(row.id), student: row.student, subject: row.subject, type: row.type,
    priority: row.priority, status: row.status, date: row.date, sessionStatus:row.sessionStatus??null, cancellationReason: row.cancellationReason ?? null,
  }
}

const requestSelect = `
  SELECT s.id_solicitud AS id,
         CONCAT(u.nombres, ' ', u.apellidos) AS student,
         a.nombre AS subject, ts.nombre AS type, s.prioridad AS priority,
         s.estado AS status, DATE_FORMAT(s.fecha_solicitud, '%Y-%m-%d') AS date,
         (SELECT ss.estado FROM Sesion ss WHERE ss.id_solicitud=s.id_solicitud ORDER BY ss.id_sesion DESC LIMIT 1) AS sessionStatus,
         (SELECT cm.motivo FROM CancelacionMonitoria cm JOIN Sesion cs ON cs.id_sesion=cm.id_sesion WHERE cs.id_solicitud=s.id_solicitud AND cm.estado='Activo' ORDER BY cm.fecha_cancelacion DESC LIMIT 1) AS cancellationReason
    FROM Solicitud s
    INNER JOIN Estudiante e ON e.id_estudiante = s.id_estudiante
    INNER JOIN Usuario u ON u.id_usuario = e.id_usuario
    INNER JOIN Asignatura a ON a.id_asignatura = s.id_asignatura
    INNER JOIN TipoSolicitud ts ON ts.id_tipo_solicitud = s.id_tipo_solicitud
`

export async function listRequests({ session, search = '', status = '', page = 1, pageSize = 100 } : any) {
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 100))
  const offset = (safePage - 1) * safePageSize
  const where = ['1 = 1']
  const params: any[] = []
  if (search) { where.push('(CONCAT(u.nombres, \' \', u.apellidos) LIKE ? OR a.nombre LIKE ?)'); const value = `%${search}%`; params.push(value, value) }
  if (status) { where.push('s.estado = ?'); params.push(status) }
  if (session.activeRole === 'Estudiante') {
    where.push('e.id_usuario = ?'); params.push(session.user.id)
  } else if (session.activeRole === 'Tutor' || session.activeRole === 'Monitor') {
    where.push(`EXISTS (SELECT 1 FROM Sesion sx INNER JOIN AsignacionAcademica ax ON ax.id_asignacion = sx.id_asignacion INNER JOIN Rol rx ON rx.id_rol = ax.id_rol WHERE sx.id_solicitud = s.id_solicitud AND ax.id_usuario = ? AND rx.nombre = ?)`)
    params.push(session.user.id, session.activeRole)
  }
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM Solicitud s INNER JOIN Estudiante e ON e.id_estudiante = s.id_estudiante INNER JOIN Usuario u ON u.id_usuario = e.id_usuario INNER JOIN Asignatura a ON a.id_asignatura = s.id_asignatura WHERE ${where.join(' AND ')}`,
    params,
  )
  const [rows] = await pool.query(`${requestSelect} WHERE ${where.join(' AND ')} ORDER BY s.fecha_solicitud DESC LIMIT ? OFFSET ?`, [...params, safePageSize, offset])
  const total = Number(countRows[0]?.total ?? 0)
  return { data: rows.map(normalizeRequest), pagination: { page: safePage, pageSize: safePageSize, total, totalPages: Math.ceil(total / safePageSize) } }
}

const requestInputSchema = z.object({
  subject: z.string().trim().min(2).max(150),
  type: z.enum(['Monitoría', 'Tutoría']),
  priority: z.enum(['Alta', 'Media', 'Baja']),
  reason: z.string().trim().min(5).max(500),
  preferredModality: z.enum(['Presencial', 'Virtual', 'Híbrida']).optional(),
}).strict()

export async function createRequest(session: any, payload: unknown) {
  if (session.activeRole !== 'Estudiante') throw new DataError(403, 'ROLE_NOT_ALLOWED', 'Solo un estudiante puede crear solicitudes.')
  const input = requestInputSchema.parse(payload)
  const [studentRows] = await pool.query('SELECT e.id_estudiante, ep.id_programa FROM Estudiante e LEFT JOIN EstudiantePrograma ep ON ep.id_estudiante = e.id_estudiante AND ep.principal = 1 AND ep.estado = \'Activo\' WHERE e.id_usuario = ? AND e.estado = \'Activo\'', [session.user.id])
  if (!studentRows.length || !studentRows[0].id_programa) throw new DataError(422, 'STUDENT_PROFILE_INCOMPLETE', 'El estudiante no tiene un programa académico activo.')
  const [subjectRows] = await pool.query('SELECT id_asignatura FROM Asignatura WHERE nombre = ? AND estado = \'Activo\'', [input.subject])
  const [typeRows] = await pool.query('SELECT id_tipo_solicitud FROM TipoSolicitud WHERE nombre = ? AND estado = \'Activo\'', [input.type])
  const [periodRows] = await pool.query("SELECT id_periodo FROM PeriodoAcademico WHERE estado = 'Activo' ORDER BY fecha_inicio DESC LIMIT 1")
  if (!subjectRows.length) throw new DataError(422, 'SUBJECT_NOT_FOUND', 'La asignatura seleccionada no está disponible.')
  if (!typeRows.length || !periodRows.length) throw new DataError(422, 'CATALOG_NOT_AVAILABLE', 'No hay catálogos académicos activos para registrar la solicitud.')
  const [result] = await pool.execute(
    `INSERT INTO Solicitud (id_estudiante, id_programa, id_asignatura, id_tipo_solicitud, id_periodo, fecha_solicitud, motivo, descripcion, prioridad, estado)
     VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, 'Pendiente')`,
    [studentRows[0].id_estudiante, studentRows[0].id_programa, subjectRows[0].id_asignatura, typeRows[0].id_tipo_solicitud, periodRows[0].id_periodo, input.reason, input.preferredModality ? `Modalidad preferida: ${input.preferredModality}` : null, input.priority],
  )
  const resultData = await listRequests({ session, page: 1, pageSize: 100 })
  const created = resultData.data.find((request) => request.id === result.insertId)
  await publishRoleNotification('Administrador', { category: 'Solicitud', title: 'Nueva solicitud estudiantil', message: `Se registró una solicitud de ${created?.student ?? 'un estudiante'} para ${created?.subject ?? input.subject}.`, entityType: 'solicitud', entityId: Number(result.insertId) })
  return created
}

export async function updateRequest(id: number, payload: unknown) {
  const input = z.object({ status: z.enum(['Pendiente', 'Aprobada', 'Rechazada', 'Asignada', 'Atendida', 'Cancelada', 'Finalizada']) }).parse(payload)
  const [result] = await pool.execute('UPDATE Solicitud SET estado = ? WHERE id_solicitud = ?', [input.status, id])
  if (!result.affectedRows) throw new DataError(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe.')
  const [rows] = await pool.query(`${requestSelect} WHERE s.id_solicitud = ?`, [id])
  return normalizeRequest(rows[0])
}

export async function listSubjects() {
  const [rows] = await pool.query("SELECT id_asignatura AS id, codigo, nombre FROM Asignatura WHERE estado = 'Activo' ORDER BY nombre")
  return rows
}

export async function listPeriods() {
  const [rows] = await pool.query("SELECT id_periodo AS id, nombre, estado FROM PeriodoAcademico ORDER BY fecha_inicio DESC")
  return rows
}

export async function listPortalSessions(session: any) {
  const where = session.activeRole === 'Estudiante'
    ? 'e.id_usuario = ?'
    : 'aa.id_usuario = ? AND r.nombre = ?'
  const params = session.activeRole === 'Estudiante'
    ? [session.user.id]
    : [session.user.id, session.activeRole]
  const [rows] = await pool.query(
    `SELECT s.id_sesion AS id, s.id_solicitud AS requestId, a.nombre AS subject,
            DATE_FORMAT(s.fecha, '%Y-%m-%d') AS date,
            TIME_FORMAT(s.hora_inicio, '%H:%i') AS startTime,
            TIME_FORMAT(s.hora_fin, '%H:%i') AS endTime,
            s.modalidad AS modality, s.estado AS status,
            COALESCE(esp.nombre, 'Sin espacio asignado') AS place
       FROM Sesion s
       JOIN Solicitud so ON so.id_solicitud = s.id_solicitud
       JOIN Estudiante e ON e.id_estudiante = so.id_estudiante
       JOIN AsignacionAcademica aa ON aa.id_asignacion = s.id_asignacion
       JOIN Rol r ON r.id_rol = aa.id_rol
       JOIN Asignatura a ON a.id_asignatura = so.id_asignatura
       LEFT JOIN AsignacionEspacio ae ON ae.id_asignacion_espacio = s.id_asignacion_espacio
       LEFT JOIN Espacio esp ON esp.id_espacio = ae.id_espacio
      WHERE ${where}
      ORDER BY s.fecha DESC, s.hora_inicio DESC
      LIMIT 100`,
    params,
  )
  return rows
}

export async function listPortalAvailability(session: any) {
  if (session.activeRole === 'Monitor') {
    const [rows] = await pool.query(
      `SELECT hm.id_horario_monitor AS id, hm.dia_semana AS day,
              TIME_FORMAT(hm.hora_inicio, '%H:%i') AS startTime,
              TIME_FORMAT(hm.hora_fin, '%H:%i') AS endTime,
              'Horario de monitoría' AS subject,
              COALESCE(e.nombre, 'Sin espacio asignado') AS place,
              hm.modalidad AS modality, hm.estado AS status
         FROM HorarioMonitor hm
         LEFT JOIN Espacio e ON e.id_espacio = hm.id_espacio
        WHERE hm.id_usuario = ?
          AND hm.estado = 'Activo'
          AND hm.id_periodo = (
            SELECT id_periodo FROM PeriodoAcademico
             WHERE estado = 'Activo' ORDER BY fecha_inicio DESC LIMIT 1
          )
        ORDER BY FIELD(hm.dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'), hm.hora_inicio`,
      [session.user.id],
    )
    return rows
  }

  if (session.activeRole !== 'Tutor') return []
  const [rows] = await pool.query(
    `SELECT d.id_disponibilidad AS id, d.id_asignacion AS assignmentId, d.dia_semana AS day,
            TIME_FORMAT(d.hora_inicio, '%H:%i') AS startTime,
            TIME_FORMAT(d.hora_fin, '%H:%i') AS endTime,
            a.nombre AS subject,
            COALESCE(e.nombre, 'Sin espacio asignado') AS place,
            d.modalidad AS modality, d.estado AS status
       FROM Disponibilidad d
       JOIN AsignacionAcademica aa ON aa.id_asignacion = d.id_asignacion
       JOIN Rol r ON r.id_rol = aa.id_rol
       JOIN Asignatura a ON a.id_asignatura = aa.id_asignatura
       LEFT JOIN AsignacionEspacio ae ON ae.id_disponibilidad = d.id_disponibilidad AND ae.estado = 'Activo'
       LEFT JOIN Espacio e ON e.id_espacio = ae.id_espacio
      WHERE aa.id_usuario = ?
        AND r.nombre = 'Tutor'
        AND aa.estado = 'Activa'
        AND d.estado = 'Activo'
        AND aa.id_periodo = (
          SELECT id_periodo FROM PeriodoAcademico
           WHERE estado = 'Activo' ORDER BY fecha_inicio DESC LIMIT 1
        )
      ORDER BY FIELD(d.dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'), d.hora_inicio`,
    [session.user.id],
  )
  return rows
}

const tutorAvailabilityInput = z.object({
  assignmentId: z.preprocess((value) => value === '' || value === '0' || value === 0 || value === undefined || value === null ? undefined : value, z.coerce.number().int().positive().optional()),
  day: z.enum(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  modality: z.enum(['Presencial', 'Virtual']),
}).refine((value) => value.endTime > value.startTime, { path: ['endTime'], message: 'La hora final debe ser posterior a la inicial.' })

async function requireTutorAssignment(userId: number, assignmentId?: number) {
  const params:any[]=[userId]
  const assignmentFilter=assignmentId?' AND aa.id_asignacion=?':''
  if(assignmentId)params.push(assignmentId)
  const [rows] = await pool.query(`SELECT aa.id_asignacion AS id FROM AsignacionAcademica aa JOIN Rol r ON r.id_rol=aa.id_rol
    WHERE aa.id_usuario=? AND r.nombre='Tutor' AND aa.estado='Activa'
      AND aa.id_periodo=(SELECT id_periodo FROM PeriodoAcademico WHERE estado='Activo' ORDER BY fecha_inicio DESC LIMIT 1)${assignmentFilter}`, params)
  if (!rows.length) throw new DataError(403, 'TUTOR_ASSIGNMENT_REQUIRED', 'La asignación académica no pertenece a tu cuenta o no está activa en el periodo actual.')
  if (!assignmentId && rows.length !== 1) throw new DataError(422, 'TUTOR_ASSIGNMENT_AMBIGUOUS', 'Selecciona la asignatura del horario antes de guardar el bloque.')
  return Number(rows[0].id)
}

export async function createTutorAvailability(session: any, payload: unknown) {
  if (session.activeRole !== 'Tutor') throw new DataError(403, 'FORBIDDEN', 'Esta operación solo está disponible para tutores.')
  const input = tutorAvailabilityInput.parse(payload)
  const assignmentId=await requireTutorAssignment(session.user.id, input.assignmentId)
  const [overlap] = await pool.query(`SELECT id_disponibilidad FROM Disponibilidad d JOIN AsignacionAcademica aa ON aa.id_asignacion=d.id_asignacion
    WHERE aa.id_usuario=? AND aa.estado='Activa' AND d.dia_semana=? AND d.estado='Activo' AND d.hora_inicio < ? AND d.hora_fin > ?`, [session.user.id, input.day, input.endTime, input.startTime])
  if (overlap.length) throw new DataError(409, 'AVAILABILITY_OVERLAP', 'El bloque se cruza con otra disponibilidad activa.')
  const [result] = await pool.execute("INSERT INTO Disponibilidad (id_asignacion,dia_semana,hora_inicio,hora_fin,modalidad,estado) VALUES (?,?,?,?,?,'Activo')", [assignmentId, input.day, input.startTime, input.endTime, input.modality])
  return { id: Number(result.insertId) }
}

export async function updateTutorAvailability(session: any, id: number, payload: unknown) {
  if (session.activeRole !== 'Tutor') throw new DataError(403, 'FORBIDDEN', 'Esta operación solo está disponible para tutores.')
  const input = tutorAvailabilityInput.parse(payload)
  const [owned] = await pool.query(`SELECT d.id_disponibilidad FROM Disponibilidad d JOIN AsignacionAcademica aa ON aa.id_asignacion=d.id_asignacion WHERE d.id_disponibilidad=? AND aa.id_usuario=?`, [id, session.user.id])
  if (!owned.length) throw new DataError(404, 'AVAILABILITY_NOT_FOUND', 'El bloque no existe o no te pertenece.')
  const assignmentId=await requireTutorAssignment(session.user.id,input.assignmentId)
  const [overlap] = await pool.query(`SELECT d.id_disponibilidad FROM Disponibilidad d JOIN AsignacionAcademica aa ON aa.id_asignacion=d.id_asignacion WHERE aa.id_usuario=? AND aa.estado='Activa' AND d.id_disponibilidad<>? AND d.dia_semana=? AND d.estado='Activo' AND d.hora_inicio < ? AND d.hora_fin > ?`, [session.user.id, id, input.day, input.endTime, input.startTime])
  if (overlap.length) throw new DataError(409, 'AVAILABILITY_OVERLAP', 'El bloque se cruza con otra disponibilidad activa.')
  await pool.execute('UPDATE Disponibilidad SET id_asignacion=?,dia_semana=?,hora_inicio=?,hora_fin=?,modalidad=? WHERE id_disponibilidad=?', [assignmentId,input.day,input.startTime,input.endTime,input.modality,id])
  return { id }
}

export async function deleteTutorAvailability(session: any, id: number) {
  if (session.activeRole !== 'Tutor') throw new DataError(403, 'FORBIDDEN', 'Esta operación solo está disponible para tutores.')
  const [owned] = await pool.query(`SELECT d.id_disponibilidad FROM Disponibilidad d JOIN AsignacionAcademica aa ON aa.id_asignacion=d.id_asignacion WHERE d.id_disponibilidad=? AND aa.id_usuario=? AND d.estado='Activo'`, [id, session.user.id])
  if (!owned.length) throw new DataError(404, 'AVAILABILITY_NOT_FOUND', 'El bloque no existe, ya fue eliminado o no te pertenece.')
  const [result] = await pool.execute("UPDATE Disponibilidad SET estado='Inactivo' WHERE id_disponibilidad=? AND estado='Activo'", [id])
  if (!result.affectedRows) throw new DataError(404, 'AVAILABILITY_NOT_FOUND', 'El bloque no existe, ya fue eliminado o no te pertenece.')
}

export async function tutorDashboard(session: any) {
  if (session.activeRole !== 'Tutor') throw new DataError(403, 'FORBIDDEN', 'Esta operación solo está disponible para tutores.')
  const [rows] = await pool.query(`SELECT
    (SELECT COUNT(*) FROM Solicitud so JOIN Sesion s ON s.id_solicitud=so.id_solicitud JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol WHERE aa.id_usuario=? AND r.nombre='Tutor' AND s.estado IN ('Programada','Confirmada','Reprogramada','En Proceso')) AS upcoming,
    (SELECT COUNT(*) FROM Sesion s JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol WHERE aa.id_usuario=? AND r.nombre='Tutor' AND s.estado IN ('Realizada','Finalizada')) AS completed,
    (SELECT COUNT(*) FROM Solicitud so JOIN Sesion s ON s.id_solicitud=so.id_solicitud JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol WHERE aa.id_usuario=? AND r.nombre='Tutor' AND so.estado='Asignada') AS openRequests,
    (SELECT COUNT(*) FROM Informe i JOIN Sesion s ON s.id_sesion=i.id_sesion JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol WHERE aa.id_usuario=? AND r.nombre='Tutor' AND i.estado IN ('Borrador','Devuelto')) AS pendingReports`, [session.user.id,session.user.id,session.user.id,session.user.id])
  const [upcoming] = await pool.query(`SELECT s.id_sesion AS id,a.nombre AS subject,DATE_FORMAT(s.fecha,'%Y-%m-%d') AS date,TIME_FORMAT(s.hora_inicio,'%H:%i') AS startTime,TIME_FORMAT(s.hora_fin,'%H:%i') AS endTime,s.estado AS status,COALESCE(esp.nombre,'Sin espacio asignado') AS place
    FROM Sesion s JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol JOIN Solicitud so ON so.id_solicitud=s.id_solicitud JOIN Asignatura a ON a.id_asignatura=so.id_asignatura LEFT JOIN AsignacionEspacio ae ON ae.id_asignacion_espacio=s.id_asignacion_espacio LEFT JOIN Espacio esp ON esp.id_espacio=ae.id_espacio
    WHERE aa.id_usuario=? AND r.nombre='Tutor' AND s.fecha>=CURRENT_DATE AND s.estado IN ('Programada','Confirmada','Reprogramada','En Proceso') ORDER BY s.fecha,s.hora_inicio LIMIT 5`, [session.user.id])
  return { metrics: rows[0], upcoming }
}

export async function listTutorAssignments(session: any) {
  if (session.activeRole !== 'Tutor') throw new DataError(403, 'FORBIDDEN', 'Esta operación solo está disponible para tutores.')
  const [rows] = await pool.query(`SELECT aa.id_asignacion AS id, aa.id_asignatura AS subjectId, a.codigo, a.nombre AS subject, aa.id_periodo AS periodId, p.nombre AS period
    FROM AsignacionAcademica aa JOIN Rol r ON r.id_rol=aa.id_rol JOIN Asignatura a ON a.id_asignatura=aa.id_asignatura JOIN PeriodoAcademico p ON p.id_periodo=aa.id_periodo
    WHERE aa.id_usuario=? AND r.nombre='Tutor' AND aa.estado='Activa' AND p.estado='Activo' ORDER BY a.nombre`, [session.user.id])
  return rows
}

const tutorRecoverySchema = z.object({ originalSessionId: z.coerce.number().int().positive(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), description: z.string().trim().min(3).max(1000) }).refine((value) => value.endTime > value.startTime, { path: ['endTime'], message: 'La hora final debe ser posterior a la inicial.' }).refine((value) => value.date >= new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), { path: ['date'], message: 'La recuperación no puede programarse en una fecha pasada.' })

export async function listTutorRecoveries(session: any) {
  if (session.activeRole !== 'Tutor') throw new DataError(403, 'FORBIDDEN', 'Esta operación solo está disponible para tutores.')
  const [rows] = await pool.query(`SELECT rm.id_recuperacion AS id, rm.id_sesion_original AS originalSessionId, DATE_FORMAT(rm.fecha_recuperacion,'%Y-%m-%d') AS date, TIME_FORMAT(rm.hora_inicio,'%H:%i') AS startTime, TIME_FORMAT(rm.hora_fin,'%H:%i') AS endTime, rm.descripcion AS description, rm.estado AS status, a.nombre AS subject
    FROM RecuperacionMonitoria rm JOIN Sesion s ON s.id_sesion=rm.id_sesion_original JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol JOIN Solicitud so ON so.id_solicitud=s.id_solicitud JOIN Asignatura a ON a.id_asignatura=so.id_asignatura
    WHERE rm.id_usuario=? AND r.nombre='Tutor' ORDER BY rm.fecha_recuperacion DESC,rm.hora_inicio`, [session.user.id])
  return rows
}

export async function listTutorRecoverableSessions(session: any) {
  if (session.activeRole !== 'Tutor') throw new DataError(403, 'FORBIDDEN', 'Esta operación solo está disponible para tutores.')
  const [rows] = await pool.query(`SELECT s.id_sesion AS id,s.id_solicitud AS requestId,a.nombre AS subject,DATE_FORMAT(s.fecha,'%Y-%m-%d') AS date,TIME_FORMAT(s.hora_inicio,'%H:%i') AS startTime,TIME_FORMAT(s.hora_fin,'%H:%i') AS endTime,s.estado AS status,COALESCE((SELECT cm.motivo FROM CancelacionMonitoria cm WHERE cm.id_sesion=s.id_sesion AND cm.estado='Activo' ORDER BY cm.fecha_cancelacion DESC LIMIT 1),'') AS cancellationReason
    FROM Sesion s JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol JOIN Solicitud so ON so.id_solicitud=s.id_solicitud JOIN Asignatura a ON a.id_asignatura=so.id_asignatura
    WHERE aa.id_usuario=? AND r.nombre='Tutor' AND s.estado IN ('Cancelada','No Asistida')
      AND NOT EXISTS (SELECT 1 FROM RecuperacionMonitoria rm WHERE rm.id_sesion_original=s.id_sesion AND rm.estado IN ('Programada','Realizada'))
    ORDER BY s.fecha DESC,s.hora_inicio DESC`, [session.user.id])
  return rows
}

export async function createTutorRecovery(session: any, payload: unknown) {
  if (session.activeRole !== 'Tutor') throw new DataError(403, 'FORBIDDEN', 'Esta operación solo está disponible para tutores.')
  const input = tutorRecoverySchema.parse(payload)
  const [original] = await pool.query(`SELECT s.id_sesion FROM Sesion s JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol WHERE s.id_sesion=? AND aa.id_usuario=? AND r.nombre='Tutor' AND s.estado IN ('Cancelada','No Asistida') AND NOT EXISTS (SELECT 1 FROM RecuperacionMonitoria rm WHERE rm.id_sesion_original=s.id_sesion AND rm.estado IN ('Programada','Realizada'))`, [input.originalSessionId, session.user.id])
  if (!original.length) throw new DataError(404, 'ORIGINAL_SESSION_NOT_FOUND', 'Selecciona una sesión propia que requiera recuperación.')
  const [result] = await pool.execute("INSERT INTO RecuperacionMonitoria (id_sesion_original,id_usuario,fecha_recuperacion,hora_inicio,hora_fin,descripcion,estado) VALUES (?,?,?,?,?,?,'Programada')", [input.originalSessionId,session.user.id,input.date,input.startTime,input.endTime,input.description])
  return { id: Number(result.insertId) }
}

export async function cancelTutorRecovery(session: any, id: number) {
  if (session.activeRole !== 'Tutor') throw new DataError(403, 'FORBIDDEN', 'Esta operación solo está disponible para tutores.')
  const [result] = await pool.execute("UPDATE RecuperacionMonitoria SET estado='Cancelada' WHERE id_recuperacion=? AND id_usuario=? AND estado='Programada'", [id,session.user.id])
  if (!result.affectedRows) throw new DataError(404, 'RECOVERY_NOT_FOUND', 'La recuperación no existe, ya finalizó o no te pertenece.')
}

export async function completeTutorRecovery(session:any,id:number) {
  if(session.activeRole!=='Tutor')throw new DataError(403,'FORBIDDEN','Esta operación solo está disponible para tutores.')
  const [result]=await pool.execute("UPDATE RecuperacionMonitoria SET estado='Realizada' WHERE id_recuperacion=? AND id_usuario=? AND estado='Programada' AND (fecha_recuperacion<CURRENT_DATE OR (fecha_recuperacion=CURRENT_DATE AND hora_fin<=CURRENT_TIME))",[id,session.user.id])
  if(!result.affectedRows)throw new DataError(409,'RECOVERY_NOT_READY','Solo puedes marcar como realizada una recuperación propia cuando ya haya finalizado su horario.')
}

const reportAttachmentSchema=z.object({category:z.enum(['Asistencia','Actividades','EvidenciaInicio','EvidenciaFin']),name:z.string().trim().min(1).max(150),mime:z.string().trim().min(3).max(100),dataBase64:z.string().min(1)})
const tutorReportSchema=z.object({sessionId:z.coerce.number().int().positive(),recoveryId:z.coerce.number().int().positive().optional(),title:z.string().trim().min(3).max(200),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),startTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),endTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),place:z.string().trim().min(2).max(255),description:z.string().trim().min(5).max(5000),attendanceCount:z.coerce.number().int().min(0).max(500),satCount:z.coerce.number().int().min(0).max(500),attendees:z.array(z.coerce.number().int().positive()).max(500),satDetails:z.array(z.object({studentId:z.coerce.number().int().positive(),description:z.string().trim().min(5).max(1000)})).max(500),activities:z.string().trim().max(2000).default(''),achievements:z.string().trim().max(1000).default(''),difficulties:z.string().trim().max(1000).default(''),recommendations:z.string().trim().max(1000).default(''),recovered:z.boolean().default(false),attachments:z.array(reportAttachmentSchema).max(4).default([])}).strict().refine(x=>x.endTime>x.startTime,{path:['endTime'],message:'La hora final debe ser posterior a la inicial.'}).refine(x=>x.satCount===x.satDetails.length,{path:['satDetails'],message:'Registra la descripción individual de cada estudiante SAT.'}).refine(x=>x.attendanceCount===x.attendees.length,{path:['attendees'],message:'La cantidad de asistentes debe coincidir con los estudiantes seleccionados.'})

async function removeTutorReportFiles(paths:string[]){const root=path.resolve(fileURLToPath(new URL('../../api/uploads/tutor-reports/',import.meta.url)));for(const value of paths){const filename=path.basename(String(value));const target=path.resolve(root,filename);if(!target.startsWith(`${root}${path.sep}`))continue;try{await unlink(target)}catch(error){if(error?.code!=='ENOENT')console.error('No se pudo retirar un adjunto reemplazado:',error?.message??error)}}}

export async function listTutorReportableSessions(session:any) {
  if(session.activeRole!=='Tutor')throw new DataError(403,'FORBIDDEN','Esta operación solo está disponible para tutores.')
  const [rows]=await pool.query(`SELECT s.id_sesion AS id,s.id_solicitud AS requestId,so.id_estudiante AS studentId,CONCAT(ue.nombres,' ',ue.apellidos) AS student,a.nombre AS subject,DATE_FORMAT(s.fecha,'%Y-%m-%d') AS date,TIME_FORMAT(s.hora_inicio,'%H:%i') AS startTime,TIME_FORMAT(s.hora_fin,'%H:%i') AS endTime,s.modalidad AS modality,s.estado AS status,COALESCE(esp.nombre,'') AS place,i.id_informe AS reportId,i.estado AS reportStatus,i.titulo AS reportTitle,FALSE AS isRecovery,NULL AS recoveryId
    FROM Sesion s JOIN Solicitud so ON so.id_solicitud=s.id_solicitud JOIN Estudiante e ON e.id_estudiante=so.id_estudiante JOIN Usuario ue ON ue.id_usuario=e.id_usuario JOIN Asignatura a ON a.id_asignatura=so.id_asignatura JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol LEFT JOIN AsignacionEspacio ae ON ae.id_asignacion_espacio=s.id_asignacion_espacio LEFT JOIN Espacio esp ON esp.id_espacio=ae.id_espacio LEFT JOIN Informe i ON i.id_sesion=s.id_sesion
    WHERE aa.id_usuario=? AND r.nombre='Tutor' AND s.fecha<=CURRENT_DATE AND s.estado IN ('Realizada','Finalizada') ORDER BY s.fecha DESC,s.hora_inicio DESC`,[session.user.id])
  const [recoveries]=await pool.query(`SELECT s.id_sesion AS id,s.id_solicitud AS requestId,so.id_estudiante AS studentId,CONCAT(ue.nombres,' ',ue.apellidos) AS student,a.nombre AS subject,DATE_FORMAT(rm.fecha_recuperacion,'%Y-%m-%d') AS date,TIME_FORMAT(rm.hora_inicio,'%H:%i') AS startTime,TIME_FORMAT(rm.hora_fin,'%H:%i') AS endTime,s.modalidad AS modality,'Realizada' AS status,COALESCE(esp.nombre,'') AS place,i.id_informe AS reportId,i.estado AS reportStatus,i.titulo AS reportTitle,TRUE AS isRecovery,rm.id_recuperacion AS recoveryId
    FROM RecuperacionMonitoria rm JOIN Sesion s ON s.id_sesion=rm.id_sesion_original JOIN Solicitud so ON so.id_solicitud=s.id_solicitud JOIN Estudiante e ON e.id_estudiante=so.id_estudiante JOIN Usuario ue ON ue.id_usuario=e.id_usuario JOIN Asignatura a ON a.id_asignatura=so.id_asignatura JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol LEFT JOIN AsignacionEspacio ae ON ae.id_asignacion_espacio=s.id_asignacion_espacio LEFT JOIN Espacio esp ON esp.id_espacio=ae.id_espacio LEFT JOIN Informe i ON i.id_sesion=s.id_sesion LEFT JOIN InformeTutorDetalle d ON d.id_informe=i.id_informe
    WHERE aa.id_usuario=? AND rm.id_usuario=? AND r.nombre='Tutor' AND rm.estado='Realizada' AND rm.fecha_recuperacion<=CURRENT_DATE AND (i.id_informe IS NULL OR d.id_recuperacion=rm.id_recuperacion) ORDER BY rm.fecha_recuperacion DESC,rm.hora_inicio DESC`,[session.user.id,session.user.id])
  return [...rows,...recoveries]
}

export async function saveTutorReport(session:any,payload:unknown) {
  if(session.activeRole!=='Tutor')throw new DataError(403,'FORBIDDEN','Esta operación solo está disponible para tutores.')
  const input=tutorReportSchema.parse(payload)
  if(input.endTime<=input.startTime)throw new DataError(422,'INVALID_REPORT_TIME','La hora final debe ser posterior a la inicial.')
  if(input.attachments.some(a=>!['application/pdf','image/png','image/jpeg','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(a.mime)))throw new DataError(422,'INVALID_ATTACHMENT_TYPE','Adjunta PDF, Word o imágenes PNG, JPG y WEBP.')
  const binary=input.attachments.map(item=>({...item,buffer:Buffer.from(item.dataBase64,'base64')}))
  if(binary.some(item=>!item.buffer.length||item.buffer.length>4*1024*1024)||binary.reduce((n,item)=>n+item.buffer.length,0)>12*1024*1024)throw new DataError(413,'ATTACHMENT_TOO_LARGE','Cada archivo puede tener hasta 4 MB y el conjunto hasta 12 MB.')
  const [sessions]=await pool.query(`SELECT s.id_sesion,DATE_FORMAT(s.fecha,'%Y-%m-%d') AS fecha,s.estado,s.id_solicitud FROM Sesion s JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol WHERE s.id_sesion=? AND aa.id_usuario=? AND r.nombre='Tutor'`,[input.sessionId,session.user.id])
  if(!sessions.length)throw new DataError(404,'SESSION_NOT_FOUND','La sesión no existe o no pertenece a tu cuenta.')
  let reportDate=String(sessions[0].fecha).slice(0,10)
  if(input.recoveryId){const [recovery]=await pool.query("SELECT id_recuperacion,DATE_FORMAT(fecha_recuperacion,'%Y-%m-%d') AS fecha_recuperacion FROM RecuperacionMonitoria WHERE id_recuperacion=? AND id_sesion_original=? AND id_usuario=? AND estado='Realizada'",[input.recoveryId,input.sessionId,session.user.id]);if(!recovery.length)throw new DataError(404,'RECOVERY_NOT_FOUND','La recuperación no existe o no está marcada como realizada.');reportDate=String(recovery[0].fecha_recuperacion)}else if(!['Realizada','Finalizada'].includes(sessions[0].estado))throw new DataError(409,'SESSION_NOT_COMPLETED','Solo puedes reportar una tutoría marcada como realizada.')
  if(reportDate!==input.date)throw new DataError(422,'REPORT_DATE_MISMATCH','El día del reporte debe coincidir con la sesión realizada.')
  const [students]=await pool.query(`SELECT e.id_estudiante AS id FROM Solicitud so JOIN Estudiante e ON e.id_estudiante=so.id_estudiante WHERE so.id_solicitud=?`,[sessions[0].id_solicitud])
  const allowed=new Set(students.map((x:any)=>Number(x.id)))
  if(input.attendees.some(id=>!allowed.has(id))||input.satDetails.some(x=>!allowed.has(x.studentId)))throw new DataError(422,'REPORT_STUDENT_MISMATCH','Los estudiantes seleccionados no corresponden a la tutoría.')
  const uploadRoot=fileURLToPath(new URL('../../api/uploads/tutor-reports/',import.meta.url));await mkdir(uploadRoot,{recursive:true})
  const savedFiles=[]
  for(const file of binary){const extension=path.extname(file.name).replace(/[^.a-zA-Z0-9]/g,'').slice(0,12);const stored=`${randomUUID()}${extension}`;await writeFile(path.join(uploadRoot,stored),file.buffer,{flag:'wx'});savedFiles.push({file,stored})}
  const connection=await pool.getConnection()
  try{
    await connection.beginTransaction()
    const [existing]=await connection.query('SELECT id_informe,estado FROM Informe WHERE id_sesion=? FOR UPDATE',[input.sessionId])
    if(existing.length&&!['Borrador','Devuelto'].includes(existing[0].estado))throw new DataError(409,'REPORT_LOCKED','El reporte ya fue enviado y no puede modificarse.')
    let reportId=Number(existing[0]?.id_informe)
    const json=JSON.stringify({date:input.date,startTime:input.startTime,endTime:input.endTime,place:input.place,description:input.description,attendanceCount:input.attendanceCount,satCount:input.satCount,attendees:input.attendees,satDetails:input.satDetails,recovered:input.recovered})
    if(existing.length){await connection.execute("UPDATE Informe SET titulo=?,contenido=?,actividades_desarrolladas=?,logros=?,dificultades=?,recomendaciones=?,estado='Borrador' WHERE id_informe=?",[input.title,json,input.activities,input.achievements,input.difficulties,input.recommendations,reportId])}
    else{const [result]=await connection.execute("INSERT INTO Informe(id_sesion,id_usuario,titulo,contenido,actividades_desarrolladas,logros,dificultades,recomendaciones,estado) VALUES(?,?,?,?,?,?,?,?,'Borrador')",[input.sessionId,session.user.id,input.title,json,input.activities,input.achievements,input.difficulties,input.recommendations]);reportId=Number(result.insertId)}
    await connection.execute(`INSERT INTO InformeTutorDetalle(id_informe,fecha_monitoria,hora_inicio_real,hora_fin_real,lugar,descripcion,cantidad_asistentes,cantidad_sat,estudiantes_asistieron,detalle_sat,recuperada,id_recuperacion) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE fecha_monitoria=VALUES(fecha_monitoria),hora_inicio_real=VALUES(hora_inicio_real),hora_fin_real=VALUES(hora_fin_real),lugar=VALUES(lugar),descripcion=VALUES(descripcion),cantidad_asistentes=VALUES(cantidad_asistentes),cantidad_sat=VALUES(cantidad_sat),estudiantes_asistieron=VALUES(estudiantes_asistieron),detalle_sat=VALUES(detalle_sat),recuperada=VALUES(recuperada),id_recuperacion=VALUES(id_recuperacion)`,[reportId,input.date,input.startTime,input.endTime,input.place,input.description,input.attendanceCount,input.satCount,JSON.stringify(input.attendees),JSON.stringify(input.satDetails),Boolean(input.recoveryId),input.recoveryId??null])
    let oldPaths:string[]=[]
    if(savedFiles.length){const [oldAttachments]=await connection.query('SELECT ruta_archivo AS path FROM AdjuntoInformeTutor WHERE id_informe=?',[reportId]);oldPaths=oldAttachments.map((item:any)=>item.path);await connection.execute('DELETE FROM AdjuntoInformeTutor WHERE id_informe=?',[reportId]);for(const {file,stored} of savedFiles)await connection.execute('INSERT INTO AdjuntoInformeTutor(id_informe,categoria,nombre_archivo,tipo_archivo,ruta_archivo,tamano_archivo) VALUES(?,?,?,?,?,?)',[reportId,file.category,file.name,file.mime,stored,file.buffer.length])}
    await connection.execute("INSERT INTO HistorialInforme(id_informe,id_usuario,accion,observacion) VALUES(?,?,'Actualizado','Reporte de tutoría guardado como borrador.')",[reportId,session.user.id])
    await connection.commit();await removeTutorReportFiles(oldPaths);return {id:reportId,status:'Borrador'}
  }catch(error){await connection.rollback();await removeTutorReportFiles(savedFiles.map((item:any)=>item.stored));throw error}finally{connection.release()}
}

export async function getTutorReport(session:any,reportId:number){
  if(session.activeRole!=='Tutor')throw new DataError(403,'FORBIDDEN','Esta operación solo está disponible para tutores.')
  const [rows]=await pool.query(`SELECT i.id_informe AS id,i.id_sesion AS sessionId,i.id_usuario AS tutorId,i.titulo AS title,i.contenido AS content,i.actividades_desarrolladas AS activities,i.logros AS achievements,i.dificultades AS difficulties,i.recomendaciones AS recommendations,i.estado AS status,DATE_FORMAT(COALESCE(d.fecha_monitoria,s.fecha),'%Y-%m-%d') AS date,TIME_FORMAT(COALESCE(d.hora_inicio_real,s.hora_inicio),'%H:%i') AS startTime,TIME_FORMAT(COALESCE(d.hora_fin_real,s.hora_fin),'%H:%i') AS endTime,COALESCE(d.lugar,esp.nombre,'') AS place,COALESCE(d.descripcion,'') AS description,COALESCE(d.cantidad_asistentes,0) AS attendanceCount,COALESCE(d.cantidad_sat,0) AS satCount,d.estudiantes_asistieron AS attendees,d.detalle_sat AS satDetails,COALESCE(d.recuperada,FALSE) AS recovered,d.id_recuperacion AS recoveryId,a.nombre AS subject,CONCAT(u.nombres,' ',u.apellidos) AS student
    FROM Informe i JOIN Sesion s ON s.id_sesion=i.id_sesion JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol LEFT JOIN InformeTutorDetalle d ON d.id_informe=i.id_informe JOIN Solicitud so ON so.id_solicitud=s.id_solicitud JOIN Asignatura a ON a.id_asignatura=so.id_asignatura JOIN Estudiante e ON e.id_estudiante=so.id_estudiante JOIN Usuario u ON u.id_usuario=e.id_usuario LEFT JOIN AsignacionEspacio ae ON ae.id_asignacion_espacio=s.id_asignacion_espacio LEFT JOIN Espacio esp ON esp.id_espacio=ae.id_espacio
    WHERE i.id_informe=? AND aa.id_usuario=? AND r.nombre='Tutor'`,[reportId,session.user.id])
  if(!rows.length)throw new DataError(404,'REPORT_NOT_FOUND','El reporte no existe o no pertenece a tu cuenta.')
  const report=rows[0];const parse=(value:any)=>{if(typeof value!=='string')return value;try{return JSON.parse(value)}catch{return value}}
  const [attachments]=await pool.query('SELECT id_adjunto AS id,categoria AS category,nombre_archivo AS name,tipo_archivo AS mimeType,tamano_archivo AS size FROM AdjuntoInformeTutor WHERE id_informe=? ORDER BY id_adjunto',[reportId])
  const content=parse(report.content);const legacy=content&&typeof content==='object'?content:{}
  return {...report,content,description:report.description||legacy.description||'',date:report.date||legacy.date,startTime:report.startTime||legacy.startTime,endTime:report.endTime||legacy.endTime,place:report.place||legacy.place||'',attendanceCount:Number(report.attendanceCount||legacy.attendanceCount||0),satCount:Number(report.satCount||legacy.satCount||0),attendees:parse(report.attendees)??legacy.attendees??[],satDetails:parse(report.satDetails)??legacy.satDetails??[],recovered:Boolean(report.recovered||legacy.recovered),attachments}
}

export async function getTutorReportAttachment(session:any,reportId:number,attachmentId:number){
  if(session.activeRole!=='Tutor')throw new DataError(403,'FORBIDDEN','Esta operación solo está disponible para tutores.')
  const [rows]=await pool.query(`SELECT at.ruta_archivo AS storedPath,at.nombre_archivo AS name FROM AdjuntoInformeTutor at JOIN Informe i ON i.id_informe=at.id_informe JOIN Sesion s ON s.id_sesion=i.id_sesion JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol WHERE at.id_adjunto=? AND i.id_informe=? AND aa.id_usuario=? AND r.nombre='Tutor'`,[attachmentId,reportId,session.user.id])
  if(!rows.length)throw new DataError(404,'ATTACHMENT_NOT_FOUND','El adjunto no existe o no pertenece a tu reporte.')
  const root=path.resolve(fileURLToPath(new URL('../../api/uploads/tutor-reports/',import.meta.url)));const filePath=path.resolve(root,path.basename(rows[0].storedPath))
  if(!filePath.startsWith(`${root}${path.sep}`))throw new DataError(404,'ATTACHMENT_NOT_FOUND','No se encontró el archivo adjunto.')
  try{await access(filePath)}catch{throw new DataError(404,'ATTACHMENT_FILE_NOT_FOUND','El archivo ya no está disponible en el almacenamiento.')}
  return {path:filePath,name:rows[0].name}
}

export async function updateTutorReport(session:any,reportId:number,payload:unknown){
  if(session.activeRole!=='Tutor')throw new DataError(403,'FORBIDDEN','Esta operación solo está disponible para tutores.')
  const [rows]=await pool.query("SELECT i.id_sesion AS sessionId,i.estado FROM Informe i JOIN Sesion s ON s.id_sesion=i.id_sesion JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol WHERE i.id_informe=? AND aa.id_usuario=? AND r.nombre='Tutor'",[reportId,session.user.id])
  if(!rows.length)throw new DataError(404,'REPORT_NOT_FOUND','El reporte no existe o no pertenece a tu cuenta.')
  if(!['Borrador','Devuelto'].includes(rows[0].estado))throw new DataError(409,'REPORT_LOCKED','Solo puedes editar reportes en borrador o devueltos.')
  const input=tutorReportSchema.parse(payload)
  if(input.sessionId!==Number(rows[0].sessionId))throw new DataError(422,'REPORT_SESSION_MISMATCH','No puedes cambiar la sesión asociada a un reporte existente.')
  return saveTutorReport(session,{...input,sessionId:Number(rows[0].sessionId)})
}

export async function deleteTutorReport(session:any,reportId:number){
  if(session.activeRole!=='Tutor')throw new DataError(403,'FORBIDDEN','Esta operación solo está disponible para tutores.')
  const connection=await pool.getConnection();let paths:string[]=[]
  try{await connection.beginTransaction();const [rows]=await connection.query("SELECT i.estado FROM Informe i JOIN Sesion s ON s.id_sesion=i.id_sesion JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol WHERE i.id_informe=? AND aa.id_usuario=? AND r.nombre='Tutor' FOR UPDATE",[reportId,session.user.id]);if(!rows.length)throw new DataError(404,'REPORT_NOT_FOUND','El reporte no existe o no pertenece a tu cuenta.');if(rows[0].estado!=='Borrador')throw new DataError(409,'REPORT_LOCKED','Solo puedes eliminar un borrador que todavía no fue enviado a revisión.');const [files]=await connection.query('SELECT ruta_archivo AS path FROM AdjuntoInformeTutor WHERE id_informe=?',[reportId]);paths=files.map((row:any)=>row.path);await connection.execute('DELETE FROM HistorialInforme WHERE id_informe=?',[reportId]);await connection.execute('DELETE FROM Informe WHERE id_informe=?',[reportId]);await connection.commit()}catch(error){await connection.rollback();throw error}finally{connection.release()}
  await removeTutorReportFiles(paths);return {id:reportId,deleted:true}
}

export async function submitTutorReport(session:any,reportId:number) {
  if(session.activeRole!=='Tutor')throw new DataError(403,'FORBIDDEN','Esta operación solo está disponible para tutores.')
  const [result]=await pool.execute(`UPDATE Informe i JOIN Sesion s ON s.id_sesion=i.id_sesion JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol JOIN InformeTutorDetalle d ON d.id_informe=i.id_informe SET i.estado='Enviado',i.fecha_envio=NOW() WHERE i.id_informe=? AND aa.id_usuario=? AND r.nombre='Tutor' AND i.estado IN ('Borrador','Devuelto') AND d.descripcion<>''`,[reportId,session.user.id])
  if(!result.affectedRows)throw new DataError(409,'REPORT_NOT_READY','Completa y guarda el reporte antes de enviarlo.')
  await pool.execute("INSERT INTO HistorialInforme(id_informe,id_usuario,accion,observacion) VALUES(?,?,'Enviado','Reporte remitido a administración.')",[reportId,session.user.id])
  await publishRoleNotification('Administrador', { category: 'Informe', title: 'Nuevo reporte de tutoría', message: 'Un tutor envió un reporte de sesión para revisión.', entityType: 'informe', entityId: reportId })
  return {id:reportId,status:'Enviado'}
}

export async function dashboard(session: any) {
  const [users] = await pool.query("SELECT COUNT(*) AS total FROM Usuario WHERE estado = 'Activo'")
  const [spaces] = await pool.query("SELECT COUNT(*) AS total, SUM(estado = 'Activo') AS active FROM Espacio")
  const [requests] = await pool.query("SELECT COUNT(*) AS total, SUM(estado = 'Pendiente') AS pending FROM Solicitud")
  const [sessions] = await pool.query("SELECT COUNT(*) AS total FROM Sesion WHERE estado NOT IN ('Cancelada', 'No Asistida')")
  if (session.activeRole === 'Administrador') {
    return { role: session.activeRole, metrics: [{ label: 'Usuarios registrados', value: String(users[0].total), detail: 'Usuarios activos' }, { label: 'Solicitudes pendientes', value: String(requests[0].pending ?? 0), detail: 'Requieren atención' }, { label: 'Espacios disponibles', value: String(spaces[0].active ?? 0), detail: `De ${spaces[0].total} registrados` }, { label: 'Acompañamientos', value: String(sessions[0].total), detail: 'Sesiones no canceladas' }], upcoming: [] }
  }
  const ownRequests = await listRequests({ session, page: 1, pageSize: 100 })
  return { role: session.activeRole, metrics: [{ label: 'Solicitudes visibles', value: String(ownRequests.pagination.total), detail: 'Información de MariaDB' }, { label: 'Sesiones activas', value: String(sessions[0].total), detail: 'Sesiones registradas' }, { label: 'Estado de cuenta', value: session.user.status, detail: 'Acceso habilitado' }], upcoming: [] }
}
