// @ts-nocheck
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { pool } from './db.js'
import { DataError } from './data.js'

const roleNames = ['Administrador', 'Tutor', 'Monitor', 'Estudiante'] as const
const roleSchema = z.enum(roleNames)

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return { names: parts.slice(0, -1).join(' ') || parts[0] || '', surnames: parts.length > 1 ? parts.at(-1) : '' }
}

function userName(row: any) { return `${row.names} ${row.surnames}`.trim() }

function normalizeUser(row: any, profile: any = {}) {
  const name = userName(row)
  return {
    id: Number(row.id), code: row.code, name, email: row.email, document: row.document,
    roles: String(row.roles ?? '').split(',').filter(Boolean), status: row.status,
    initials: initials(name), profiles: profile,
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

function filters(query: any = {}) {
  const where = ['1 = 1']
  const params: any[] = []
  const search = String(query.search ?? '').trim()
  if (search) {
    where.push('(u.codigo LIKE ? OR u.correo LIKE ? OR u.documento LIKE ? OR CONCAT(u.nombres, \' \', u.apellidos) LIKE ?)')
    const value = `%${search}%`
    params.push(value, value, value, value)
  }
  if (roleNames.includes(query.role)) { where.push('r.nombre = ?'); params.push(query.role) }
  if (query.status === 'Activo' || query.status === 'Inactivo') { where.push('u.estado = ?'); params.push(query.status) }
  return { sql: where.join(' AND '), params }
}

async function profilesFor(ids: number[]) {
  if (!ids.length) return new Map()
  const placeholders = ids.map(() => '?').join(',')
  const profiles = new Map(ids.map((id) => [id, {}]))
  const [administrators] = await pool.query(`SELECT id_usuario AS id, cargo, dependencia, correo_institucional AS institutionalEmail, observaciones FROM Administrador WHERE id_usuario IN (${placeholders})`, ids)
  const [students] = await pool.query(`SELECT e.id_usuario AS id, e.codigo_estudiantil AS studentCode, e.semestre, ep.id_programa AS programId, p.nombre AS programName, f.nombre AS facultyName FROM Estudiante e LEFT JOIN EstudiantePrograma ep ON ep.id_estudiante = e.id_estudiante AND ep.principal = 1 AND ep.estado = 'Activo' LEFT JOIN Programa p ON p.id_programa = ep.id_programa LEFT JOIN Facultad f ON f.id_facultad = p.id_facultad WHERE e.id_usuario IN (${placeholders})`, ids)
  const [tutors] = await pool.query(`SELECT id_usuario AS id, categoria_docente AS teachingCategory, tipo_vinculacion AS employmentType, periodo_actual AS currentPeriod, horas_semanales AS weeklyHours, observaciones FROM Tutor WHERE id_usuario IN (${placeholders})`, ids)
  const [monitors] = await pool.query(`SELECT id_usuario AS id, tipo_monitor AS monitorType, resolucion AS resolution, periodo_actual AS currentPeriod, horas_semanales AS weeklyHours, observaciones FROM Monitor WHERE id_usuario IN (${placeholders})`, ids)
  const [assignments] = await pool.query(`SELECT aa.id_usuario AS id, aa.id_rol AS roleId, r.nombre AS role, aa.id_asignatura AS subjectId, a.codigo AS subjectCode, a.nombre AS subjectName, aa.id_periodo AS periodId, p.nombre AS periodName, aa.horas_semanales AS weeklyHours, aa.estado AS status FROM AsignacionAcademica aa JOIN Rol r ON r.id_rol = aa.id_rol JOIN Asignatura a ON a.id_asignatura = aa.id_asignatura JOIN PeriodoAcademico p ON p.id_periodo = aa.id_periodo WHERE aa.id_usuario IN (${placeholders}) ORDER BY a.nombre`, ids)
  for (const row of administrators) Object.assign(profiles.get(row.id), { administrador: row })
  for (const row of students) Object.assign(profiles.get(row.id), { estudiante: row })
  for (const row of tutors) Object.assign(profiles.get(row.id), { tutor: { ...row, assignments: [] } })
  for (const row of monitors) Object.assign(profiles.get(row.id), { monitor: { ...row, assignments: [] } })
  for (const row of assignments) {
    const profileKey = row.role === 'Tutor' ? 'tutor' : row.role === 'Monitor' ? 'monitor' : null
    if (profileKey && profiles.get(row.id)?.[profileKey]) profiles.get(row.id)[profileKey].assignments.push(row)
  }
  return profiles
}

async function normalizeUsers(rows: any[]) {
  const profiles = await profilesFor(rows.map((row) => Number(row.id)))
  return rows.map((row) => normalizeUser(row, profiles.get(Number(row.id))))
}

export async function listAdminUsers(query: any = {}) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 100))
  const offset = (page - 1) * pageSize
  const condition = filters(query)
  const [countRows] = await pool.query(`SELECT COUNT(DISTINCT u.id_usuario) AS total FROM Usuario u LEFT JOIN UsuarioRol ur ON ur.id_usuario=u.id_usuario LEFT JOIN Rol r ON r.id_rol=ur.id_rol WHERE ${condition.sql}`, condition.params)
  const [rows] = await pool.query(`${userSelect} WHERE ${condition.sql} GROUP BY u.id_usuario ORDER BY u.id_usuario LIMIT ? OFFSET ?`, [...condition.params, pageSize, offset])
  const total = Number(countRows[0]?.total ?? 0)
  return { data: await normalizeUsers(rows), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
}

async function findAdminUser(id: number, connection = pool) {
  const [rows] = await connection.query(`${userSelect} WHERE u.id_usuario = ? GROUP BY u.id_usuario`, [id])
  if (!rows.length) throw new DataError(404, 'USER_NOT_FOUND', 'El usuario no existe.')
  const profiles = await profilesFor([id])
  return normalizeUser(rows[0], profiles.get(id))
}

async function roleIds(connection: any, selectedRoles: string[]) {
  const unique = [...new Set(selectedRoles)]
  if (!unique.length || unique.some((role) => !roleNames.includes(role))) throw new DataError(422, 'INVALID_ROLES', 'Debe seleccionar uno o varios roles válidos.')
  const [rows] = await connection.query(`SELECT id_rol AS id, nombre FROM Rol WHERE estado='Activo' AND nombre IN (${unique.map(() => '?').join(',')})`, unique)
  if (rows.length !== unique.length) throw new DataError(422, 'INVALID_ROLES', 'Uno de los roles seleccionados no está activo.')
  return rows
}

const assignmentSchema = z.object({
  subjectIds: z.array(z.coerce.number().int().positive()).min(1, 'Selecciona una asignatura.').max(1, 'Tutor y monitor solo pueden tener una asignatura asignada.'),
  periodId: z.preprocess((val) => (val && Number(val) > 0 ? Number(val) : undefined), z.number().int().positive().optional()),
  weeklyHours: z.preprocess((val) => (val && Number(val) > 0 ? Number(val) : undefined), z.number().int().positive().max(60).optional()),
})

const studentProfileSchema = z.object({
  studentCode: z.string().trim().min(2).max(30),
  semester: z.preprocess((val) => (val !== undefined && val !== null ? Number(val) : undefined), z.number().int().min(1).max(20).optional()),
  semestre: z.preprocess((val) => (val !== undefined && val !== null ? Number(val) : undefined), z.number().int().min(1).max(20).optional()),
  programId: z.coerce.number().int().positive(),
}).transform((val) => {
  const sem = val.semester ?? val.semestre ?? 1
  return {
    studentCode: val.studentCode,
    semester: sem,
    semestre: sem,
    programId: val.programId,
  }
})

const profileSchema = z.object({
  administrador: z.object({
    cargo: z.string().trim().min(2),
    dependencia: z.string().trim().min(2),
    institutionalEmail: z.string().trim().email(),
    observaciones: z.string().max(300).optional().default(''),
  }).optional(),
  estudiante: studentProfileSchema.optional(),
  tutor: z.object({
    teachingCategory: z.string().trim().min(2),
    employmentType: z.string().trim().min(2),
    currentPeriod: z.string().trim().min(1).max(40),
    weeklyHours: z.coerce.number().int().positive().max(60),
    observations: z.string().max(300).optional().default(''),
    assignments: assignmentSchema.default({}),
  }).optional(),
  monitor: z.object({
    monitorType: z.string().trim().min(2).default('Monitor académico'),
    resolution: z.string().max(80).optional().default(''),
    currentPeriod: z.string().trim().min(1).max(40),
    weeklyHours: z.coerce.number().int().positive().max(60),
    observations: z.string().max(300).optional().default(''),
    assignments: assignmentSchema.default({}),
  }).optional(),
}).default({})

const userSchema = z.object({ code: z.string().trim().min(2).max(20), document: z.string().trim().min(5).max(20), name: z.string().trim().min(2).max(160), email: z.string().trim().email().max(120), roles: z.array(roleSchema).min(1).refine((items) => new Set(items).size === items.length, 'No se permiten roles repetidos.'), profiles: profileSchema }).strict()
const userUpdateSchema = userSchema.partial().extend({ status: z.enum(['Activo', 'Inactivo']).optional(), profiles: profileSchema.optional() }).strict().refine((value) => Object.keys(value).length > 0, 'Debe enviar al menos un campo para actualizar.')

function validateProfiles(input: any) {
  const selected = input.roles ?? []
  const profiles = input.profiles ?? {}
  const required: Record<string, string> = { Administrador: 'administrador', Estudiante: 'estudiante', Tutor: 'tutor', Monitor: 'monitor' }
  for (const role of selected) if (!profiles[required[role]]) throw new DataError(422, 'ROLE_PROFILE_REQUIRED', `Completa la información específica del rol ${role}.`)
}

async function upsertAssignments(connection: any, id: number, role: string, assignment: any) {
  if (!assignment) return
  const [roleRows] = await connection.query('SELECT id_rol AS id FROM Rol WHERE nombre = ?', [role])
  const roleId = roleRows[0]?.id
  if (!roleId) return
  const periodId = assignment.periodId ?? (await connection.query("SELECT id_periodo FROM PeriodoAcademico WHERE estado='Activo' ORDER BY fecha_inicio DESC LIMIT 1"))[0][0]?.id_periodo
  if (!periodId) throw new DataError(422, 'PERIOD_REQUIRED', `No existe un periodo activo para ${role}.`)
  const hours = assignment.weeklyHours ?? 1
  await connection.execute("UPDATE AsignacionAcademica SET estado='Cancelada' WHERE id_usuario=? AND id_rol=?", [id, roleId])
  for (const subjectId of assignment.subjectIds ?? []) {
    const [existing] = await connection.query('SELECT id_asignacion FROM AsignacionAcademica WHERE id_usuario=? AND id_rol=? AND id_asignatura=? AND id_periodo=? LIMIT 1', [id, roleId, subjectId, periodId])
    if (existing.length) await connection.execute("UPDATE AsignacionAcademica SET horas_semanales=?, estado='Activa' WHERE id_asignacion=?", [hours, existing[0].id_asignacion])
    else await connection.execute("INSERT INTO AsignacionAcademica (id_usuario,id_rol,id_asignatura,id_periodo,horas_semanales,fecha_inicio,estado) VALUES (?,?,?,?,?,CURDATE(),'Activa')", [id, roleId, subjectId, periodId, hours])
  }
}

async function periodLabel(connection: any, value: string) {
  const [rows] = await connection.query('SELECT nombre FROM PeriodoAcademico WHERE id_periodo = ? OR nombre = ? LIMIT 1', [value, value])
  return rows[0]?.nombre ?? value
}

async function upsertProfiles(connection: any, id: number, selectedRoles: string[], profiles: any) {
  const p = profiles ?? {}
  if (selectedRoles.includes('Administrador')) {
    const a = p.administrador
    await connection.execute(`INSERT INTO Administrador (id_usuario,cargo,dependencia,correo_institucional,observaciones,estado) VALUES (?,?,?,?,?,'Activo') ON DUPLICATE KEY UPDATE cargo=VALUES(cargo),dependencia=VALUES(dependencia),correo_institucional=VALUES(correo_institucional),observaciones=VALUES(observaciones),estado='Activo'`, [id, a.cargo, a.dependencia, a.institutionalEmail, a.observaciones ?? ''])
  } else await connection.execute("UPDATE Administrador SET estado='Inactivo' WHERE id_usuario=?", [id])
  if (selectedRoles.includes('Estudiante')) {
    const s = p.estudiante
    await connection.execute(`INSERT INTO Estudiante (id_usuario,codigo_estudiantil,semestre,estado) VALUES (?,?,?,'Activo') ON DUPLICATE KEY UPDATE codigo_estudiantil=VALUES(codigo_estudiantil),semestre=VALUES(semestre),estado='Activo'`, [id, s.studentCode, s.semester])
    const [studentRows] = await connection.query('SELECT id_estudiante FROM Estudiante WHERE id_usuario=?', [id])
    await connection.execute("UPDATE EstudiantePrograma SET principal=0 WHERE id_estudiante=?", [studentRows[0].id_estudiante])
    await connection.execute(`INSERT INTO EstudiantePrograma (id_estudiante,id_programa,principal,fecha_ingreso,estado) VALUES (?,?,1,CURDATE(),'Activo') ON DUPLICATE KEY UPDATE principal=1,estado='Activo'`, [studentRows[0].id_estudiante, s.programId])
  } else await connection.execute("UPDATE Estudiante SET estado='Inactivo' WHERE id_usuario=?", [id])
  if (selectedRoles.includes('Tutor')) {
    const t = p.tutor
    const tutorPeriod = await periodLabel(connection, t.currentPeriod)
    await connection.execute(`INSERT INTO Tutor (id_usuario,categoria_docente,tipo_vinculacion,periodo_actual,horas_semanales,observaciones,estado) VALUES (?,?,?,?,?,?,'Activo') ON DUPLICATE KEY UPDATE categoria_docente=VALUES(categoria_docente),tipo_vinculacion=VALUES(tipo_vinculacion),periodo_actual=VALUES(periodo_actual),horas_semanales=VALUES(horas_semanales),observaciones=VALUES(observaciones),estado='Activo'`, [id, t.teachingCategory, t.employmentType, tutorPeriod, t.weeklyHours, t.observations ?? ''])
    await upsertAssignments(connection, id, 'Tutor', t.assignments)
  } else { await connection.execute("UPDATE Tutor SET estado='Inactivo' WHERE id_usuario=?", [id]); await connection.execute("UPDATE AsignacionAcademica aa JOIN Rol r ON r.id_rol=aa.id_rol SET aa.estado='Cancelada' WHERE aa.id_usuario=? AND r.nombre='Tutor'", [id]) }
  if (selectedRoles.includes('Monitor')) {
    const m = p.monitor
    const monitorPeriod = await periodLabel(connection, m.currentPeriod)
    await connection.execute(`INSERT INTO Monitor (id_usuario,tipo_monitor,resolucion,periodo_actual,horas_semanales,observaciones,estado) VALUES (?,?,?,?,?,?,'Activo') ON DUPLICATE KEY UPDATE tipo_monitor=VALUES(tipo_monitor),resolucion=VALUES(resolucion),periodo_actual=VALUES(periodo_actual),horas_semanales=VALUES(horas_semanales),observaciones=VALUES(observaciones),estado='Activo'`, [id, m.monitorType, m.resolution ?? '', monitorPeriod, m.weeklyHours, m.observations ?? ''])
    await upsertAssignments(connection, id, 'Monitor', m.assignments)
  } else { await connection.execute("UPDATE Monitor SET estado='Inactivo' WHERE id_usuario=?", [id]); await connection.execute("UPDATE AsignacionAcademica aa JOIN Rol r ON r.id_rol=aa.id_rol SET aa.estado='Cancelada' WHERE aa.id_usuario=? AND r.nombre='Monitor'", [id]) }
}

export async function createAdminUser(payload: unknown) {
  const input = userSchema.parse(payload); validateProfiles(input)
  const { names, surnames } = splitName(input.name); const connection = await pool.getConnection()
  try {
    await connection.beginTransaction(); const roleRows = await roleIds(connection, input.roles)
    const [result] = await connection.execute('INSERT INTO Usuario (codigo,documento,nombres,apellidos,correo,estado) VALUES (?,?,?,?,? ,\'Activo\')', [input.code, input.document, names, surnames, input.email])
    const id = result.insertId; const hash = await bcrypt.hash(input.document, 12)
    await connection.execute("INSERT INTO Credencial (usuario,password_hash,ultimo_acceso,primer_inicio,estado,id_usuario) VALUES (?,?,NULL,1,'Activo',?)", [input.email, hash, id])
    for (const role of roleRows) await connection.execute("INSERT INTO UsuarioRol (id_usuario,id_rol,estado) VALUES (?,?, 'Activo')", [id, role.id])
    await upsertProfiles(connection, id, input.roles, input.profiles); await connection.commit(); return findAdminUser(id)
  } catch (error) { await connection.rollback(); if (error?.code === 'ER_DUP_ENTRY') throw new DataError(409, 'DUPLICATE_USER', 'El código, documento, correo o perfil ya está registrado.'); throw error } finally { connection.release() }
}

export async function updateAdminUser(id: number, payload: unknown) {
  const input = userUpdateSchema.parse(payload); const connection = await pool.getConnection()
  try {
    await connection.beginTransaction(); const [existing] = await connection.query('SELECT * FROM Usuario WHERE id_usuario=?', [id]); if (!existing.length) throw new DataError(404, 'USER_NOT_FOUND', 'El usuario no existe.')
    const current = await findAdminUser(id); const selectedRoles = input.roles ?? current.roles; if (input.roles || input.profiles) validateProfiles({ roles: selectedRoles, profiles: input.profiles ?? current.profiles })
    const fields: string[] = []; const values: any[] = []
    for (const [key, column] of [['code','codigo'],['document','documento'],['email','correo'],['status','estado']] as const) if (input[key] !== undefined) { fields.push(`${column}=?`); values.push(input[key]) }
    if (input.name) { const name = splitName(input.name); fields.push('nombres=?','apellidos=?'); values.push(name.names,name.surnames) }
    if (fields.length) { values.push(id); await connection.execute(`UPDATE Usuario SET ${fields.join(',')} WHERE id_usuario=?`, values) }
    if (input.status) { await connection.execute('UPDATE Credencial SET estado=? WHERE id_usuario=?', [input.status,id]); await connection.execute('UPDATE UsuarioRol SET estado=? WHERE id_usuario=?', [input.status,id]) }
    if (input.roles) { const roleRows = await roleIds(connection,input.roles); await connection.execute("UPDATE UsuarioRol SET estado='Inactivo' WHERE id_usuario=?",[id]); for (const role of roleRows) await connection.execute("INSERT INTO UsuarioRol (id_usuario,id_rol,estado) VALUES (?,?, 'Activo') ON DUPLICATE KEY UPDATE estado='Activo'",[id,role.id]) }
    if (input.profiles || input.roles) await upsertProfiles(connection,id,selectedRoles,input.profiles ?? current.profiles)
    await connection.commit(); return findAdminUser(id)
  } catch (error) { await connection.rollback(); if (error?.code === 'ER_DUP_ENTRY') throw new DataError(409,'DUPLICATE_USER','El código, documento, correo o perfil ya está registrado.'); throw error } finally { connection.release() }
}

async function deleteRequestSessionData(connection:any,requestId:number){
  const [sessions]=await connection.query('SELECT id_sesion FROM Sesion WHERE id_solicitud=?',[requestId])
  const sessionIds=sessions.map((row:any)=>Number(row.id_sesion))
  if(!sessionIds.length)return
  const placeholders=sessionIds.map(()=>'?').join(',')
  await connection.execute(`DELETE FROM RecuperacionMonitoria WHERE id_sesion_original IN (${placeholders}) OR id_cancelacion IN (SELECT id_cancelacion FROM CancelacionMonitoria WHERE id_sesion IN (${placeholders}))`,[...sessionIds,...sessionIds])
  await connection.execute(`DELETE FROM Asistencia WHERE id_sesion IN (${placeholders})`,sessionIds)
  await connection.execute(`DELETE FROM HistorialSesion WHERE id_sesion IN (${placeholders})`,sessionIds)
  await connection.execute(`DELETE FROM HistorialInforme WHERE id_informe IN (SELECT id_informe FROM Informe WHERE id_sesion IN (${placeholders}))`,sessionIds)
  await connection.execute(`DELETE FROM Informe WHERE id_sesion IN (${placeholders})`,sessionIds)
  await connection.execute(`DELETE ea FROM EntregaActividad ea JOIN Compromiso c ON c.id_compromiso=ea.id_compromiso JOIN Seguimiento sg ON sg.id_seguimiento=c.id_seguimiento WHERE sg.id_sesion IN (${placeholders})`,sessionIds)
  await connection.execute(`DELETE ev FROM Evidencia ev JOIN Seguimiento sg ON sg.id_seguimiento=ev.id_seguimiento WHERE sg.id_sesion IN (${placeholders})`,sessionIds)
  await connection.execute(`DELETE c FROM Compromiso c JOIN Seguimiento sg ON sg.id_seguimiento=c.id_seguimiento WHERE sg.id_sesion IN (${placeholders})`,sessionIds)
  await connection.execute(`DELETE FROM Seguimiento WHERE id_sesion IN (${placeholders})`,sessionIds)
  await connection.execute(`DELETE FROM ReporteMonitoria WHERE id_sesion IN (${placeholders})`,sessionIds)
  await connection.execute(`DELETE FROM CancelacionMonitoria WHERE id_sesion IN (${placeholders})`,sessionIds)
  await connection.execute(`DELETE FROM Sesion WHERE id_sesion IN (${placeholders})`,sessionIds)
}

async function deleteStudentFollowups(connection:any,studentId:number){
  const [rows]=await connection.query('SELECT id_seguimiento FROM Seguimiento WHERE id_estudiante=?',[studentId])
  const ids=rows.map((row:any)=>Number(row.id_seguimiento))
  if(!ids.length)return
  const placeholders=ids.map(()=>'?').join(',')
  await connection.execute('DELETE FROM EntregaActividad WHERE id_estudiante=?',[studentId])
  await connection.execute(`DELETE FROM EntregaActividad WHERE id_compromiso IN (SELECT id_compromiso FROM Compromiso WHERE id_seguimiento IN (${placeholders}))`,ids)
  await connection.execute(`DELETE FROM Evidencia WHERE id_seguimiento IN (${placeholders})`,ids)
  await connection.execute(`DELETE FROM Compromiso WHERE id_seguimiento IN (${placeholders})`,ids)
  await connection.execute('DELETE FROM Seguimiento WHERE id_estudiante=?',[studentId])
}

export async function deleteAdminUser(id: number, currentUserId?: number) {
  if (currentUserId && id === Number(currentUserId)) {
    throw new DataError(400, 'CANNOT_DELETE_SELF', 'No puedes eliminar tu propia cuenta de usuario en sesión.')
  }
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [existing] = await connection.query('SELECT id_usuario FROM Usuario WHERE id_usuario = ?', [id])
    if (!existing.length) throw new DataError(404, 'USER_NOT_FOUND', 'El usuario no existe.')

    const [assignedSessions]=await connection.query('SELECT s.id_sesion FROM Sesion s JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion WHERE aa.id_usuario=? LIMIT 1',[id])
    if(assignedSessions.length)throw new DataError(409,'USER_HAS_ASSIGNED_SESSIONS','No se puede eliminar este usuario mientras tenga sesiones asignadas. Reasigna o resuelve esas sesiones primero.')

    // 1. Estudiante & dependencias
    const [studentRows] = await connection.query('SELECT id_estudiante FROM Estudiante WHERE id_usuario = ?', [id])
    for (const s of studentRows) {
      const [solRows] = await connection.query('SELECT id_solicitud FROM Solicitud WHERE id_estudiante = ?', [s.id_estudiante])
      for (const sol of solRows) {
        await deleteRequestSessionData(connection,Number(sol.id_solicitud))
      }
      await deleteStudentFollowups(connection,Number(s.id_estudiante))
      await connection.execute('DELETE FROM Solicitud WHERE id_estudiante = ?', [s.id_estudiante])
      await connection.execute('DELETE FROM EstudiantePrograma WHERE id_estudiante = ?', [s.id_estudiante])
    }
    await connection.execute('DELETE FROM Estudiante WHERE id_usuario = ?', [id])

    // 2. Asignaciones académicas & disponibilidad
    await connection.execute('DELETE d FROM Disponibilidad d JOIN AsignacionAcademica aa ON aa.id_asignacion = d.id_asignacion WHERE aa.id_usuario = ?', [id])
    await connection.execute('DELETE FROM AsignacionAcademica WHERE id_usuario = ?', [id])

    // 3. Horarios monitor & informes
    await connection.execute('DELETE FROM HorarioMonitor WHERE id_usuario = ?', [id])
    await connection.execute('DELETE FROM RecuperacionMonitoria WHERE id_usuario = ?', [id])
    await connection.execute('DELETE FROM ReporteMonitoria WHERE id_usuario = ?', [id])
    await connection.execute('DELETE FROM HistorialInforme WHERE id_usuario = ?', [id])
    await connection.execute('DELETE FROM Informe WHERE id_usuario = ? OR revisado_por = ?', [id, id])

    // 4. Perfiles
    await connection.execute('DELETE FROM Tutor WHERE id_usuario = ?', [id])
    await connection.execute('DELETE FROM Monitor WHERE id_usuario = ?', [id])
    await connection.execute('DELETE FROM Administrador WHERE id_usuario = ?', [id])

    // 5. Credenciales y roles
    await connection.execute('DELETE FROM Credencial WHERE id_usuario = ?', [id])
    await connection.execute('DELETE FROM UsuarioRol WHERE id_usuario = ?', [id])

    // 6. Registro principal en Usuario
    await connection.execute('DELETE FROM Usuario WHERE id_usuario = ?', [id])

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

function normalizeSpace(row: any) {
  const rawBuilding = row.building ?? ''
  const block = row.block ?? ''
  const room = row.room ?? ''
  const floor = row.floor ?? ''
  const building = block && rawBuilding.trim().toLowerCase() === `bloque ${block.trim().toLowerCase()}`
    ? ''
    : rawBuilding
  const hasStructuredLocation = Boolean(building || block || room || floor)
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    building,
    block,
    room,
    floor,
    location: hasStructuredLocation ? '' : row.location ?? '',
    description: row.description ?? '',
    resources: row.resources ?? '',
    observations: row.observations ?? '',
    capacity: Number(row.capacity),
    type: row.type ?? 'Otro',
    status: row.status,
  }
}
const spaceSchema = z.object({ code:z.string().trim().min(2).max(20), name:z.string().trim().min(2).max(120), building:z.string().max(80).optional().default(''), block:z.string().max(20).optional().default(''), room:z.string().max(20).optional().default(''), floor:z.string().max(10).optional().default(''), location:z.string().max(200).optional().default(''), description:z.string().max(300).optional().default(''), resources:z.string().max(500).optional().default(''), observations:z.string().max(300).optional().default(''), capacity:z.coerce.number().int().min(1).max(1000), type:z.enum(['Aula','Laboratorio','Sala','Sala de informática','Biblioteca','Salón de reuniones','Otro','Virtual']), status:z.enum(['Activo','Inactivo']).optional() }).strict()

export async function listAdminSpaces(query:any={}) { const where=['1=1'];const params:any[]=[]; if(query.search){where.push('(codigo LIKE ? OR nombre LIKE ? OR ubicacion LIKE ? OR edificio LIKE ?)');const v=`%${query.search}%`;params.push(v,v,v,v)} if(query.status==='Activo'||query.status==='Inactivo'){where.push('estado=?');params.push(query.status)} if(query.type){where.push('tipo=?');params.push(query.type)} if(query.building){where.push('edificio=?');params.push(query.building)} if(query.minCapacity){where.push('capacidad>=?');params.push(Number(query.minCapacity))} const [rows]=await pool.query(`SELECT id_espacio AS id,codigo AS code,nombre AS name,edificio AS building,bloque AS block,salon AS room,piso AS floor,ubicacion AS location,descripcion AS description,recursos AS resources,observaciones AS observations,capacidad AS capacity,tipo AS type,estado AS status FROM Espacio WHERE ${where.join(' AND ')} ORDER BY id_espacio`,params);return rows.map(normalizeSpace) }

export async function createAdminSpace(payload:any) {
  const input=spaceSchema.parse(payload)
  try {
    const [result]=await pool.execute(
      'INSERT INTO Espacio (codigo,nombre,edificio,bloque,salon,piso,ubicacion,descripcion,recursos,observaciones,capacidad,tipo,estado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [input.code,input.name,input.building,input.block,input.room,input.floor,input.location,input.description,input.resources,input.observations,input.capacity,input.type,input.status??'Activo'],
    )
    // Leer por la PK insertada evita depender de la consulta paginada/filtrada del listado
    // para confirmar el alta y devolver el registro recién creado.
    const [rows]=await pool.query(
      'SELECT id_espacio AS id,codigo AS code,nombre AS name,edificio AS building,bloque AS block,salon AS room,piso AS floor,ubicacion AS location,descripcion AS description,recursos AS resources,observaciones AS observations,capacidad AS capacity,tipo AS type,estado AS status FROM Espacio WHERE id_espacio=?',
      [result.insertId],
    )
    return normalizeSpace(rows[0])
  } catch(error:any) {
    if(error?.code==='ER_DUP_ENTRY')throw new DataError(409,'DUPLICATE_SPACE','El código del espacio ya está registrado.')
    if(error?.code==='ER_DATA_TOO_LONG'||error?.code==='ER_TRUNCATED_WRONG_VALUE')throw new DataError(422,'INVALID_SPACE_DATA','Uno de los datos supera el formato permitido por la base de datos.')
    throw error
  }
}
export async function updateAdminSpace(id:number,payload:any){
  const input=spaceSchema.partial().strict().refine((value)=>Object.keys(value).length>0,'Debe enviar al menos un campo.').parse(payload)
  const [existing]=await pool.query('SELECT id_espacio FROM Espacio WHERE id_espacio=?',[id])
  if(!existing.length)throw new DataError(404,'SPACE_NOT_FOUND','El espacio no existe.')
  const map:any={code:'codigo',name:'nombre',building:'edificio',block:'bloque',room:'salon',floor:'piso',location:'ubicacion',description:'descripcion',resources:'recursos',observations:'observaciones',capacity:'capacidad',type:'tipo',status:'estado'}
  const fields:string[]=[];const values:any[]=[]
  for(const key of Object.keys(map))if(input[key]!==undefined){fields.push(`${map[key]}=?`);values.push(input[key])}
  values.push(id)
  try{
    await pool.execute(`UPDATE Espacio SET ${fields.join(',')} WHERE id_espacio=?`,values)
  }catch(error:any){
    if(error?.code==='ER_DUP_ENTRY')throw new DataError(409,'DUPLICATE_SPACE','El código del espacio ya está registrado.')
    throw error
  }
  return (await listAdminSpaces()).find((row)=>row.id===id)
}
export async function deleteAdminSpace(id: number) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [existing] = await connection.query('SELECT id_espacio FROM Espacio WHERE id_espacio = ?', [id])
    if (!existing.length) throw new DataError(404, 'SPACE_NOT_FOUND', 'El espacio no existe.')

    await connection.execute('DELETE FROM HorarioMonitor WHERE id_espacio = ?', [id])
    await connection.execute('DELETE FROM AsignacionEspacio WHERE id_espacio = ?', [id])
    await connection.execute('DELETE FROM Espacio WHERE id_espacio = ?', [id])

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

function normalizeAdminRequest(row:any){return {id:Number(row.id),studentId:Number(row.studentId),student:row.student,programId:Number(row.programId),program:row.program,subjectId:Number(row.subjectId),subject:row.subject,type:row.type,priority:row.priority,status:row.status,date:row.date,motive:row.motivo??'',description:row.descripcion??'',period:row.period,periodId:Number(row.periodId)}}
const requestSelect=`SELECT s.id_solicitud AS id,e.id_usuario AS studentId,CONCAT(u.nombres,' ',u.apellidos) AS student,p.id_programa AS programId,p.nombre AS program,a.id_asignatura AS subjectId,a.nombre AS subject,ts.nombre AS type,s.prioridad AS priority,s.estado AS status,DATE_FORMAT(s.fecha_solicitud,'%Y-%m-%d') AS date,s.motivo,s.descripcion,pa.nombre AS period,s.id_periodo AS periodId FROM Solicitud s JOIN Estudiante e ON e.id_estudiante=s.id_estudiante JOIN Usuario u ON u.id_usuario=e.id_usuario JOIN Programa p ON p.id_programa=s.id_programa JOIN Asignatura a ON a.id_asignatura=s.id_asignatura JOIN TipoSolicitud ts ON ts.id_tipo_solicitud=s.id_tipo_solicitud JOIN PeriodoAcademico pa ON pa.id_periodo=s.id_periodo`;
export async function listAdminRequests(query: any = {}) {
  const where = ['1=1']
  const params: any[] = []
  const search = String(query.search ?? '').trim()
  if (search) {
    where.push('(CONCAT(u.nombres, \' \', u.apellidos) LIKE ? OR a.nombre LIKE ? OR p.nombre LIKE ?)')
    const value = `%${search}%`
    params.push(value, value, value)
  }
  if (query.status) {
    where.push('s.estado = ?')
    params.push(query.status)
  }
  if (query.subjectId) {
    where.push('s.id_asignatura = ?')
    params.push(Number(query.subjectId))
  }

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 100))
  const offset = (page - 1) * pageSize
  const whereClause = where.join(' AND ')
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM (${requestSelect} WHERE ${whereClause}) AS filtered_requests`,
    params,
  )
  const [rows] = await pool.query(
    `${requestSelect} WHERE ${whereClause} ORDER BY s.fecha_solicitud DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  )
  const total = Number(countRows[0]?.total ?? 0)
  return {
    data: rows.map(normalizeAdminRequest),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
}
const adminRequestSchema=z.object({studentId:z.coerce.number().int().positive(),programId:z.coerce.number().int().positive(),subjectId:z.coerce.number().int().positive(),type:z.enum(['Monitoría','Tutoría','Acompañamiento']),priority:z.enum(['Alta','Media','Baja']),motive:z.string().trim().min(3).max(500),description:z.string().trim().min(3).max(500),periodId:z.coerce.number().int().positive().optional()}).strict()
export async function createAdminRequest(payload:unknown){
  const input=adminRequestSchema.parse(payload)
  const [students]=await pool.query("SELECT e.id_estudiante AS studentId,ep.id_programa AS programId FROM Estudiante e LEFT JOIN EstudiantePrograma ep ON ep.id_estudiante=e.id_estudiante AND ep.principal=1 AND ep.estado='Activo' WHERE e.id_usuario=? AND e.estado='Activo'",[input.studentId])
  if(!students.length)throw new DataError(422,'STUDENT_NOT_FOUND','El estudiante no está activo.')
  if(!students[0].programId||Number(students[0].programId)!==input.programId)throw new DataError(422,'STUDENT_PROGRAM_MISMATCH','El programa seleccionado no corresponde al programa principal del estudiante.')
  const [programs]=await pool.query("SELECT id_programa FROM Programa WHERE id_programa=? AND estado='Activo'",[input.programId])
  if(!programs.length)throw new DataError(422,'PROGRAM_NOT_FOUND','El programa académico no está activo.')
  const [subjects]=await pool.query("SELECT id_asignatura FROM Asignatura WHERE id_asignatura=? AND estado='Activo'",[input.subjectId])
  if(!subjects.length)throw new DataError(422,'SUBJECT_NOT_FOUND','La asignatura no está activa.')
  const [types]=await pool.query("SELECT id_tipo_solicitud FROM TipoSolicitud WHERE nombre=? AND estado='Activo'",[input.type])
  if(!types.length)throw new DataError(422,'REQUEST_TYPE_NOT_FOUND','El tipo de acompañamiento no está disponible.')
  const periodId=input.periodId??(await pool.query("SELECT id_periodo FROM PeriodoAcademico WHERE estado='Activo' ORDER BY fecha_inicio DESC LIMIT 1"))[0][0]?.id_periodo
  if(!periodId)throw new DataError(422,'PERIOD_REQUIRED','Selecciona un periodo académico activo.')
  const [periods]=await pool.query("SELECT id_periodo FROM PeriodoAcademico WHERE id_periodo=? AND estado IN ('Activo','Planeado')",[periodId])
  if(!periods.length)throw new DataError(422,'PERIOD_NOT_AVAILABLE','El periodo no está disponible para nuevas solicitudes.')
  const [result]=await pool.execute("INSERT INTO Solicitud (id_estudiante,id_programa,id_asignatura,id_tipo_solicitud,id_periodo,fecha_solicitud,motivo,descripcion,prioridad,estado) VALUES (?,?,?,?,?,NOW(),?,?,?,'Pendiente')",[students[0].studentId,input.programId,input.subjectId,types[0].id_tipo_solicitud,periodId,input.motive,input.description,input.priority])
  const [rows]=await pool.query(`${requestSelect} WHERE s.id_solicitud=?`,[result.insertId])
  return normalizeAdminRequest(rows[0])
}

const requestAssignmentSchema = z.object({
  userId: z.coerce.number().int().positive(),
  role: z.enum(['Tutor', 'Monitor']),
  date: z.string().refine(isoDateIsValid, 'La fecha debe ser válida y usar el formato AAAA-MM-DD.'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  modality: z.enum(['Presencial', 'Virtual']),
}).refine((value) => value.startTime < value.endTime, { message: 'La hora de inicio debe ser anterior a la hora final.' })

export async function assignAdminRequest(id: number, payload: unknown) {
  const assignment = requestAssignmentSchema.parse(payload)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [requestRows] = await connection.query('SELECT id_asignatura,id_periodo,estado FROM Solicitud WHERE id_solicitud=? FOR UPDATE', [id])
    if (!requestRows.length) throw new DataError(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe.')
    if (!['Pendiente', 'Aprobada'].includes(requestRows[0].estado)) throw new DataError(409, 'REQUEST_NOT_ASSIGNABLE', 'Solo se pueden asignar solicitudes pendientes o aprobadas.')
    const [assignmentRows] = await connection.query(
      `SELECT aa.id_asignacion AS id
         FROM AsignacionAcademica aa
         JOIN Rol r ON r.id_rol=aa.id_rol
         JOIN Usuario u ON u.id_usuario=aa.id_usuario
         JOIN UsuarioRol ur ON ur.id_usuario=u.id_usuario AND ur.id_rol=r.id_rol
        WHERE aa.id_usuario=? AND r.nombre=? AND aa.id_asignatura=? AND aa.id_periodo=?
          AND aa.estado='Activa' AND u.estado='Activo' AND ur.estado='Activo'
        LIMIT 1`,
      [assignment.userId, assignment.role, requestRows[0].id_asignatura, requestRows[0].id_periodo],
    )
    if (!assignmentRows.length) throw new DataError(422, 'STAFF_SUBJECT_MISMATCH', 'La persona seleccionada no tiene una asignación activa para esta asignatura y periodo.')
    const [sessionExists] = await connection.query("SELECT id_sesion FROM Sesion WHERE id_solicitud=? AND estado NOT IN ('Cancelada','No Asistida') LIMIT 1", [id])
    if (sessionExists.length) throw new DataError(409, 'REQUEST_ALREADY_ASSIGNED', 'La solicitud ya cuenta con una sesión activa.')
    await connection.execute(
      "INSERT INTO Sesion (id_solicitud,id_asignacion,fecha,hora_inicio,hora_fin,modalidad,tipo,tema,estado) VALUES (?,?,?,?,?,?,?,?,'Programada')",
      [id, assignmentRows[0].id, assignment.date, assignment.startTime, assignment.endTime, assignment.modality, assignment.role === 'Tutor' ? 'Tutoría' : 'Monitoría', 'Primera sesión de acompañamiento'],
    )
    await connection.execute("UPDATE Solicitud SET estado='Asignada' WHERE id_solicitud=?", [id])
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  const [rows] = await pool.query(`${requestSelect} WHERE s.id_solicitud=?`, [id])
  return normalizeAdminRequest(rows[0])
}

export async function updateAssignedRequestStatus(session: any, id: number, payload: unknown) {
  const input = z.object({ status: z.enum(['Atendida']) }).strict().parse(payload)
  const [assigned] = await pool.query(
    `SELECT s.id_sesion
       FROM Sesion s JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion
       JOIN Rol r ON r.id_rol=aa.id_rol
      WHERE s.id_solicitud=? AND aa.id_usuario=? AND r.nombre=? AND s.estado NOT IN ('Cancelada','No Asistida')`,
    [id, session.user.id, session.activeRole],
  )
  if (!assigned.length) throw new DataError(404, 'ASSIGNED_REQUEST_NOT_FOUND', 'La solicitud no está asignada a tu cuenta y rol.')
  const [rows] = await pool.query('SELECT estado FROM Solicitud WHERE id_solicitud=?', [id])
  if (!rows.length) throw new DataError(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe.')
  if (rows[0].estado !== 'Asignada') throw new DataError(409, 'INVALID_STATUS_TRANSITION', 'Solo se pueden marcar como atendidas las solicitudes asignadas.')
  await pool.execute("UPDATE Solicitud SET estado='Atendida' WHERE id_solicitud=?", [id])
  await pool.execute("UPDATE Sesion SET estado='Realizada' WHERE id_solicitud=? AND estado IN ('Programada','Confirmada','En Proceso')", [id])
  const [result] = await pool.query(`${requestSelect} WHERE s.id_solicitud=?`, [id])
  return normalizeAdminRequest(result[0])
}
export async function updateAdminRequest(id:number,payload:any){
  const input=z.object({status:z.enum(['Pendiente','Aprobada','Rechazada','Asignada','Atendida','Cancelada','Finalizada'])}).strict().parse(payload)
  const [currentRows]=await pool.query('SELECT estado FROM Solicitud WHERE id_solicitud=?',[id])
  if(!currentRows.length)throw new DataError(404,'REQUEST_NOT_FOUND','La solicitud no existe.')
  const currentStatus=currentRows[0].estado
  if(input.status==='Asignada'&&currentStatus!=='Asignada')throw new DataError(422,'ASSIGNMENT_REQUIRED','Usa la operación de asignación para vincular un tutor o monitor y programar la sesión.')
  const transitions:Record<string,string[]>={
    Pendiente:['Aprobada','Rechazada','Cancelada'],
    Aprobada:['Asignada','Cancelada'],
    Asignada:['Atendida','Cancelada'],
    Atendida:['Finalizada','Cancelada'],
    Rechazada:[],Cancelada:[],Finalizada:[],
  }
  if(currentStatus!==input.status&&!transitions[currentStatus]?.includes(input.status)){
    throw new DataError(409,'INVALID_STATUS_TRANSITION',`No se puede cambiar una solicitud de ${currentStatus} a ${input.status}.`)
  }
  if(currentStatus!==input.status)await pool.execute('UPDATE Solicitud SET estado=? WHERE id_solicitud=?',[input.status,id])
  const [rows]=await pool.query(`${requestSelect} WHERE s.id_solicitud=?`,[id])
  return normalizeAdminRequest(rows[0])
}

export async function deleteAdminRequest(id: number) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [existing] = await connection.query('SELECT id_solicitud FROM Solicitud WHERE id_solicitud = ?', [id])
    if (!existing.length) throw new DataError(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe.')

    await deleteRequestSessionData(connection,id)
    await connection.execute('DELETE FROM Solicitud WHERE id_solicitud = ?', [id])

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

function isoDateIsValid(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false
  const date=new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value
}
const academicPeriodFieldsSchema=z.object({
  name:z.string().trim().min(4).max(20),
  startDate:z.string().refine(isoDateIsValid,'La fecha debe tener formato AAAA-MM-DD y ser válida.'),
  endDate:z.string().refine(isoDateIsValid,'La fecha debe tener formato AAAA-MM-DD y ser válida.'),
  status:z.enum(['Planeado','Activo','Finalizado']).default('Planeado'),
}).strict()
const academicPeriodSchema=academicPeriodFieldsSchema.refine((value)=>value.startDate<value.endDate,{path:['endDate'],message:'La fecha final debe ser posterior a la fecha inicial.'})
const academicPeriodUpdateSchema=academicPeriodFieldsSchema.partial().strict().refine((value)=>Object.keys(value).length>0,'Debe enviar al menos un campo para actualizar.')

async function findAdminPeriod(id:number){
  const [rows]=await pool.query("SELECT id_periodo AS id,nombre,DATE_FORMAT(fecha_inicio,'%Y-%m-%d') AS startDate,DATE_FORMAT(fecha_fin,'%Y-%m-%d') AS endDate,estado FROM PeriodoAcademico WHERE id_periodo=?",[id])
  if(!rows.length)throw new DataError(404,'PERIOD_NOT_FOUND','El periodo académico no existe.')
  return {...rows[0],id:Number(rows[0].id)}
}

export async function listAdminPeriods(){
  const [rows]=await pool.query("SELECT id_periodo AS id,nombre,DATE_FORMAT(fecha_inicio,'%Y-%m-%d') AS startDate,DATE_FORMAT(fecha_fin,'%Y-%m-%d') AS endDate,estado FROM PeriodoAcademico ORDER BY fecha_inicio DESC,id_periodo DESC")
  return rows.map((row:any)=>({...row,id:Number(row.id)}))
}

async function ensureSingleActivePeriod(exceptId?:number){
  const query=exceptId===undefined
    ? "SELECT id_periodo FROM PeriodoAcademico WHERE estado='Activo' LIMIT 1"
    : "SELECT id_periodo FROM PeriodoAcademico WHERE estado='Activo' AND id_periodo<>? LIMIT 1"
  const [rows]=await pool.query(query,exceptId===undefined?[]:[exceptId])
  if(rows.length)throw new DataError(409,'ACTIVE_PERIOD_EXISTS','Ya existe otro periodo académico activo.')
}

export async function createAdminPeriod(payload:unknown){
  const input=academicPeriodSchema.parse(payload)
  try{
    if(input.status==='Activo')await ensureSingleActivePeriod()
    const [result]=await pool.execute('INSERT INTO PeriodoAcademico (nombre,fecha_inicio,fecha_fin,estado) VALUES (?,?,?,?)',[input.name,input.startDate,input.endDate,input.status])
    return findAdminPeriod(result.insertId)
  }catch(error:any){
    if(error?.code==='ER_DUP_ENTRY')throw new DataError(409,'DUPLICATE_PERIOD','Ya existe un periodo con ese nombre.')
    throw error
  }
}

export async function updateAdminPeriod(id:number,payload:unknown){
  const patch=academicPeriodUpdateSchema.parse(payload)
  const current=await findAdminPeriod(id)
  const input={name:patch.name??current.nombre,startDate:patch.startDate??current.startDate,endDate:patch.endDate??current.endDate,status:patch.status??current.estado}
  if(input.startDate>=input.endDate)throw new DataError(422,'INVALID_PERIOD_DATES','La fecha final debe ser posterior a la fecha inicial.')
  try{
    if(input.status==='Activo')await ensureSingleActivePeriod(id)
    await pool.execute('UPDATE PeriodoAcademico SET nombre=?,fecha_inicio=?,fecha_fin=?,estado=? WHERE id_periodo=?',[input.name,input.startDate,input.endDate,input.status,id])
    return findAdminPeriod(id)
  }catch(error:any){
    if(error?.code==='ER_DUP_ENTRY')throw new DataError(409,'DUPLICATE_PERIOD','Ya existe un periodo con ese nombre.')
    throw error
  }
}

export async function deleteAdminPeriod(id:number){
  const [rows]=await pool.query('SELECT id_periodo FROM PeriodoAcademico WHERE id_periodo=?',[id])
  if(!rows.length)throw new DataError(404,'PERIOD_NOT_FOUND','El periodo académico no existe.')
  const [usageRows]=await pool.query('SELECT (SELECT COUNT(*) FROM AsignacionAcademica WHERE id_periodo=?)+(SELECT COUNT(*) FROM HorarioMonitor WHERE id_periodo=?)+(SELECT COUNT(*) FROM Solicitud WHERE id_periodo=?) AS referencesCount',[id,id,id])
  if(Number(usageRows[0]?.referencesCount??0)>0)throw new DataError(409,'PERIOD_IN_USE','No se puede eliminar un periodo que ya tiene asignaciones, horarios o solicitudes asociadas.')
  try{
    await pool.execute('DELETE FROM PeriodoAcademico WHERE id_periodo=?',[id])
  }catch(error:any){
    if(error?.code==='ER_ROW_IS_REFERENCED_2')throw new DataError(409,'PERIOD_IN_USE','No se puede eliminar un periodo que tiene registros asociados.')
    throw error
  }
}

export async function adminCatalogs(){
  const [programs]=await pool.query("SELECT p.id_programa AS id,p.codigo,p.nombre,p.id_facultad AS facultyId,f.nombre AS facultyName FROM Programa p JOIN Facultad f ON f.id_facultad=p.id_facultad WHERE p.estado='Activo' ORDER BY p.nombre")
  const [subjects]=await pool.query("SELECT id_asignatura AS id,codigo,nombre FROM Asignatura WHERE estado='Activo' ORDER BY nombre")
  const [periods]=await pool.query('SELECT id_periodo AS id,nombre,estado FROM PeriodoAcademico ORDER BY fecha_inicio DESC')
  const [students]=await pool.query("SELECT u.id_usuario AS id,CONCAT(u.nombres,' ',u.apellidos) AS name,e.codigo_estudiantil AS studentCode,ep.id_programa AS programId,p.nombre AS programName FROM Estudiante e JOIN Usuario u ON u.id_usuario=e.id_usuario LEFT JOIN EstudiantePrograma ep ON ep.id_estudiante=e.id_estudiante AND ep.principal=1 AND ep.estado='Activo' LEFT JOIN Programa p ON p.id_programa=ep.id_programa WHERE e.estado='Activo' AND u.estado='Activo' ORDER BY u.nombres,u.apellidos")
  const [types]=await pool.query("SELECT id_tipo_solicitud AS id,nombre FROM TipoSolicitud WHERE estado='Activo' ORDER BY nombre")
  const [staffAssignments]=await pool.query("SELECT aa.id_usuario AS userId,CONCAT(u.nombres,' ',u.apellidos) AS name,r.nombre AS role,aa.id_asignatura AS subjectId,aa.id_periodo AS periodId,aa.horas_semanales AS weeklyHours FROM AsignacionAcademica aa JOIN Rol r ON r.id_rol=aa.id_rol JOIN Usuario u ON u.id_usuario=aa.id_usuario JOIN UsuarioRol ur ON ur.id_usuario=u.id_usuario AND ur.id_rol=r.id_rol WHERE r.nombre IN ('Tutor','Monitor') AND aa.estado='Activa' AND u.estado='Activo' AND ur.estado='Activo' ORDER BY u.apellidos,u.nombres")
  return {programs,subjects,periods,students,requestTypes:types,staffAssignments}
}

async function aggregateReport(filters: any = {}) {
  const params: any[] = []
  const sessionWhere = ['1=1']
  if (filters.subjectId) {
    sessionWhere.push('aa.id_asignatura = ?')
    params.push(Number(filters.subjectId))
  }
  if (filters.from) {
    sessionWhere.push('s.fecha >= ?')
    params.push(filters.from)
  }
  if (filters.to) {
    sessionWhere.push('s.fecha <= ?')
    params.push(filters.to)
  }

  const [subjectRows] = await pool.query(
    `SELECT a.id_asignatura AS id, a.nombre AS name,
            COUNT(s.id_sesion) AS sessions,
            SUM(s.estado IN ('Realizada', 'Finalizada')) AS completed,
            SUM(s.estado = 'Cancelada') AS cancelled
       FROM Asignatura a
       LEFT JOIN AsignacionAcademica aa ON aa.id_asignatura = a.id_asignatura
       LEFT JOIN Sesion s ON s.id_asignacion = aa.id_asignacion
      WHERE a.estado = 'Activo' ${filters.subjectId ? 'AND a.id_asignatura = ?' : ''}
      GROUP BY a.id_asignatura
      ORDER BY sessions DESC`,
    filters.subjectId ? [Number(filters.subjectId)] : [],
  )
  const [roleRows] = await pool.query(
    `SELECT r.nombre AS role, COUNT(DISTINCT aa.id_usuario) AS people,
            COUNT(s.id_sesion) AS sessions
       FROM Rol r
       LEFT JOIN AsignacionAcademica aa ON aa.id_rol = r.id_rol
       LEFT JOIN Sesion s ON s.id_asignacion = aa.id_asignacion
      WHERE r.nombre IN ('Tutor', 'Monitor')
      GROUP BY r.id_rol
      ORDER BY r.id_rol`,
  )
  const [statusRows] = await pool.query(
    'SELECT estado AS status, COUNT(*) AS total FROM Solicitud GROUP BY estado ORDER BY total DESC',
  )
  const [attendanceRows] = await pool.query(
    'SELECT asistencia AS status, COUNT(*) AS total FROM Asistencia GROUP BY asistencia ORDER BY total DESC',
  )
  const [monthlyRows] = await pool.query(
    `SELECT DATE_FORMAT(fecha, '%Y-%m') AS period, COUNT(*) AS total
       FROM Sesion
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY period
      ORDER BY period`,
  )
  const [sessions] = await pool.query(
    `SELECT s.id_sesion AS id, DATE_FORMAT(s.fecha, '%Y-%m-%d') AS fecha,
            s.hora_inicio AS startTime, s.hora_fin AS endTime, s.modalidad,
            s.tipo, s.estado, a.nombre AS subject,
            CONCAT(u.nombres, ' ', u.apellidos) AS assignedUser
       FROM Sesion s
       JOIN AsignacionAcademica aa ON aa.id_asignacion = s.id_asignacion
       JOIN Asignatura a ON a.id_asignatura = aa.id_asignatura
       JOIN Usuario u ON u.id_usuario = aa.id_usuario
      WHERE ${sessionWhere.join(' AND ')}
      ORDER BY s.fecha DESC`,
    params,
  )

  return {
    bySubject: subjectRows,
    byRole: roleRows,
    byRequestStatus: statusRows,
    attendance: attendanceRows,
    byMonth: monthlyRows,
    sessions,
  }
}
export async function adminDashboard(){const report=await aggregateReport();const [userCounts]=await pool.query("SELECT COUNT(*) AS total,SUM(estado='Activo') AS active FROM Usuario");const [spaceCounts]=await pool.query("SELECT COUNT(*) AS total,SUM(estado='Activo') AS active FROM Espacio");const [requestCounts]=await pool.query("SELECT COUNT(*) AS total,SUM(estado='Pendiente') AS pending FROM Solicitud");const [sessionCounts]=await pool.query("SELECT COUNT(*) AS total,SUM(estado IN ('Realizada','Finalizada')) AS completed FROM Sesion");return {generatedAt:new Date().toISOString(),summary:{users:{total:Number(userCounts[0].total),active:Number(userCounts[0].active)},spaces:{total:Number(spaceCounts[0].total),active:Number(spaceCounts[0].active)},requests:{total:Number(requestCounts[0].total),pending:Number(requestCounts[0].pending)},sessions:{total:Number(sessionCounts[0].total),completed:Number(sessionCounts[0].completed)}},charts:report}}
export async function adminReport(query:any={}){return {generatedAt:new Date().toISOString(),filters:{subjectId:query.subjectId??null,from:query.from??null,to:query.to??null},...(await aggregateReport(query))}}

export async function listCredentials(role?:string){
  const condition=roleNames.includes(role)?'AND r.nombre=?':''
  const params:any[]=roleNames.includes(role)?[role]:[]
  const [rows]=await pool.query(`SELECT u.id_usuario AS id,u.codigo AS code,u.correo AS email,CONCAT(u.nombres,' ',u.apellidos) AS name,u.estado AS status,GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.id_rol SEPARATOR ',') AS roles FROM Usuario u JOIN Credencial c ON c.id_usuario=u.id_usuario LEFT JOIN UsuarioRol ur ON ur.id_usuario=u.id_usuario LEFT JOIN Rol r ON r.id_rol=ur.id_rol WHERE 1=1 ${condition} GROUP BY u.id_usuario ORDER BY u.id_usuario`,params)
  return rows.map((row:any)=>({...row,id:Number(row.id),roles:String(row.roles??'').split(',').filter(Boolean)}))
}

export async function resetCredential(id:number){
  const [rows]=await pool.query('SELECT correo FROM Usuario WHERE id_usuario=?',[id])
  if(!rows.length)throw new DataError(404,'USER_NOT_FOUND','El usuario no existe.')
  const temporaryPassword=randomBytes(12).toString('base64url')
  const hash=await bcrypt.hash(temporaryPassword,12)
  await pool.execute("UPDATE Credencial SET password_hash=?,usuario=?,primer_inicio=1,estado='Activo' WHERE id_usuario=?",[hash,rows[0].correo,id])
  return {id,temporaryPassword}
}

export async function changePassword(id:number,payload:any){
  const passwordSchema=z.string().min(8,'La contraseña debe tener al menos 8 caracteres.').max(72,'La contraseña no puede superar 72 caracteres.').refine((value)=>Buffer.byteLength(value,'utf8')<=72,'La contraseña supera el límite admitido.')
  const input=z.object({currentPassword:z.string().min(1),newPassword:passwordSchema,confirmPassword:passwordSchema}).strict().refine((value)=>value.newPassword===value.confirmPassword,'Las contraseñas nuevas no coinciden.').parse(payload)
  const [rows]=await pool.query("SELECT password_hash FROM Credencial WHERE id_usuario=? AND estado='Activo'",[id])
  if(!rows.length)throw new DataError(404,'CREDENTIAL_NOT_FOUND','No existe una credencial activa.')
  const stored=rows[0].password_hash
  const valid=stored.startsWith('$2')?await bcrypt.compare(input.currentPassword,stored):process.env.NODE_ENV!=='production'&&input.currentPassword===stored
  if(!valid)throw new DataError(401,'INVALID_CURRENT_PASSWORD','La contraseña actual no es válida.')
  await pool.execute('UPDATE Credencial SET password_hash=?,primer_inicio=0 WHERE id_usuario=?',[await bcrypt.hash(input.newPassword,12),id])
  return {changed:true}
}

export async function listSettings(){
  const [rows]=await pool.query('SELECT id_configuracion AS id,clave,valor,tipo,descripcion,fecha_actualizacion AS updatedAt FROM Configuracion ORDER BY clave')
  return rows
}

const settingsUpdateSchema=z.object({
  settings:z.array(z.object({key:z.string().trim().min(1).max(120),value:z.string().max(5000)}).strict()).min(1).refine((items)=>new Set(items.map((item)=>item.key)).size===items.length,'No se permiten claves de configuración repetidas.'),
}).strict()

export async function updateSettings(payload:unknown){
  const input=settingsUpdateSchema.parse(payload)
  const keys=input.settings.map((setting)=>setting.key)
  const placeholders=keys.map(()=>'?').join(',')
  const [existing]=await pool.query(`SELECT clave FROM Configuracion WHERE clave IN (${placeholders})`,keys)
  if(existing.length!==keys.length)throw new DataError(422,'SETTING_NOT_FOUND','Una o varias claves de configuración no existen.')
  const connection=await pool.getConnection()
  try{
    await connection.beginTransaction()
    for(const setting of input.settings)await connection.execute('UPDATE Configuracion SET valor=? WHERE clave=?',[setting.value,setting.key])
    await connection.commit()
  }catch(error){
    await connection.rollback()
    throw error
  }finally{
    connection.release()
  }
  return listSettings()
}

export async function adminDbStatus() {
  const [versionRows] = await pool.query('SELECT VERSION() AS version, DATABASE() AS databaseName, @@hostname AS hostname, @@port AS port')
  const [tableCountRows] = await pool.query('SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE()')
  const [userCounts] = await pool.query('SELECT COUNT(*) AS total, SUM(estado = "Activo") AS active FROM Usuario')
  const [spaceCounts] = await pool.query('SELECT COUNT(*) AS total, SUM(estado = "Activo") AS active FROM Espacio')
  const [requestCounts] = await pool.query('SELECT COUNT(*) AS total, SUM(estado = "Pendiente") AS pending FROM Solicitud')
  const [subjectCounts] = await pool.query('SELECT COUNT(*) AS total, SUM(estado = "Activo") AS active FROM Asignatura')
  const [sessionCounts] = await pool.query('SELECT COUNT(*) AS total FROM Sesion')
  const [periodCounts] = await pool.query('SELECT COUNT(*) AS total, SUM(estado = "Activo") AS active FROM PeriodoAcademico')

  return {
    engine: String(versionRows[0]?.version ?? 'MariaDB'),
    database: String(versionRows[0]?.databaseName ?? 'gestion_monitorias_tutorias'),
    host: `${versionRows[0]?.hostname ?? 'unknown'}:${versionRows[0]?.port ?? 'unknown'}`,
    status: 'connected',
    totalTables: Number(tableCountRows[0]?.total ?? 0),
    tables: {
      Usuario: { total: Number(userCounts[0]?.total ?? 0), active: Number(userCounts[0]?.active ?? 0) },
      Espacio: { total: Number(spaceCounts[0]?.total ?? 0), active: Number(spaceCounts[0]?.active ?? 0) },
      Solicitud: { total: Number(requestCounts[0]?.total ?? 0), pending: Number(requestCounts[0]?.pending ?? 0) },
      Asignatura: { total: Number(subjectCounts[0]?.total ?? 0), active: Number(subjectCounts[0]?.active ?? 0) },
      Sesion: { total: Number(sessionCounts[0]?.total ?? 0) },
      PeriodoAcademico: { total: Number(periodCounts[0]?.total ?? 0), active: Number(periodCounts[0]?.active ?? 0) },
    },
    checkedAt: new Date().toISOString(),
  }
}

