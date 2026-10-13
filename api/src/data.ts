// @ts-nocheck
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { pool } from './db.js'

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
  LEFT JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario
  LEFT JOIN Rol r ON r.id_rol = ur.id_rol
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
    where.push('r.nombre = ?')
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
    `SELECT COUNT(DISTINCT u.id_usuario) AS total FROM Usuario u
     LEFT JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario
     LEFT JOIN Rol r ON r.id_rol = ur.id_rol
     WHERE ${filters.where}`,
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

const userInputSchema = z.object({
  code: z.string().trim().min(2).max(20),
  document: z.string().trim().min(5).max(20),
  name: z.string().trim().min(2).max(160),
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
        await connection.execute('UPDATE UsuarioRol SET estado = ? WHERE id_usuario = ?', [input.status, id])
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

const spaceSchema = z.object({
  code: z.string().trim().min(2).max(20), name: z.string().trim().min(2).max(120),
  type: z.enum(['Aula', 'Laboratorio', 'Sala', 'Biblioteca', 'Virtual', 'Otro']),
  location: z.string().trim().min(2).max(200), capacity: z.coerce.number().int().min(1).max(1000),
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
    priority: row.priority, status: row.status, date: row.date,
  }
}

const requestSelect = `
  SELECT s.id_solicitud AS id,
         CONCAT(u.nombres, ' ', u.apellidos) AS student,
         a.nombre AS subject, ts.nombre AS type, s.prioridad AS priority,
         s.estado AS status, DATE_FORMAT(s.fecha_solicitud, '%Y-%m-%d') AS date
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
    where.push(`EXISTS (SELECT 1 FROM Sesion sx INNER JOIN AsignacionAcademica ax ON ax.id_asignacion = sx.id_asignacion WHERE sx.id_solicitud = s.id_solicitud AND ax.id_usuario = ?)`)
    params.push(session.user.id)
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
  preferredDate: z.string().date().optional(),
  preferredModality: z.enum(['Presencial', 'Virtual', 'Híbrida']).optional(),
})

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
  return resultData.data.find((request) => request.id === result.insertId)
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
    `SELECT s.id_sesion AS id, a.nombre AS subject,
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
    `SELECT d.id_disponibilidad AS id, d.dia_semana AS day,
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
