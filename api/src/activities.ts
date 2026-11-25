import { z } from 'zod'
import type { AuthenticatedSession } from './auth.js'
import { DataError } from './data.js'
import { pool } from './db.js'
import { publishNotifications } from './notifications.js'

const maxFileSize = 4 * 1024 * 1024
const fileFields = z.object({
  name: z.string().trim().min(1).max(180).regex(/^[^\/\\\p{Cc}]+$/u),
  base64: z.string().min(4).max(Math.ceil(maxFileSize / 3) * 4),
})
const fileSchema = fileFields.transform(({ name, base64 }, ctx) => {
  const data = Buffer.from(base64, 'base64')
  if (!data.length || data.length > maxFileSize || data.toString('base64') !== base64) {
    ctx.addIssue({ code: 'custom', message: 'Adjunta un archivo válido de hasta 4 MB.' })
    return z.NEVER
  }
  return { name, data }
})

const activitySchema = z.object({
  sessionId: z.number().int().positive(),
  studentIds: z.array(z.number().int().positive()).min(1).max(500).transform((ids) => [...new Set(ids)]),
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(2000),
  dueAt: z.iso.datetime({ offset: true }).transform((value) => Math.floor(Date.parse(value) / 1000)),
  file: fileSchema,
})
const submissionSchema = fileFields.extend({ comment: z.string().trim().max(4000).optional() })

async function saveActivityChange<T>(save: (connection: Awaited<ReturnType<typeof pool.getConnection>>) => Promise<T>) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const result = await save(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

const tutorSession = `
  FROM Sesion s
  JOIN AsignacionAcademica aa ON aa.id_asignacion = s.id_asignacion
  JOIN Rol r ON r.id_rol = aa.id_rol
  JOIN Solicitud so ON so.id_solicitud = s.id_solicitud`
const completedTutorSession = "aa.id_usuario = ? AND r.nombre = 'Tutor' AND s.estado IN ('Realizada', 'Finalizada')"

const activityParticipants = `
  FROM ActividadTutor a
  JOIN Estudiante e ON e.id_estudiante = a.id_estudiante
  JOIN Usuario alumno ON alumno.id_usuario = e.id_usuario
  JOIN Usuario tutor ON tutor.id_usuario = a.id_tutor`

function participantFilter(session: AuthenticatedSession) {
  return session.activeRole === 'Tutor' ? 'a.id_tutor = ?' : 'e.id_usuario = ?'
}

export async function listActivitySessions(tutorId: number) {
  const [rows] = await pool.query(`
    SELECT s.id_sesion AS id, a.nombre AS subject, DATE_FORMAT(s.fecha, '%Y-%m-%d') AS date,
      TIME_FORMAT(s.hora_inicio, '%H:%i') AS startTime
    ${tutorSession}
    JOIN Asignatura a ON a.id_asignatura = so.id_asignatura
    WHERE ${completedTutorSession}
    ORDER BY s.fecha DESC, s.hora_inicio DESC, s.id_sesion DESC`, [tutorId])
  return rows
}

export async function listActivityStudents(tutorId: number, sessionId: number) {
  const [rows] = await pool.query(`
    SELECT e.id_estudiante AS id, CONCAT(u.nombres, ' ', u.apellidos) AS name, e.codigo_estudiantil AS code
    ${tutorSession}
    JOIN Estudiante e ON e.estado = 'Activo'
    JOIN Usuario u ON u.id_usuario = e.id_usuario AND u.estado = 'Activo'
    WHERE ${completedTutorSession} AND s.id_sesion = ? AND ${recordedAttendance}
    ORDER BY name, id`, [tutorId, sessionId])
  return rows
}

const recordedAttendance = `COALESCE(
  (SELECT a.asistencia FROM Asistencia a
    WHERE a.id_sesion = s.id_sesion AND a.id_estudiante = e.id_estudiante
    ORDER BY a.fecha_registro DESC, a.id_asistencia DESC LIMIT 1) = 'Asistió',
  EXISTS (
    SELECT 1 FROM Informe i
    JOIN InformeTutorDetalle d ON d.id_informe = i.id_informe
    WHERE i.id_sesion = s.id_sesion AND i.id_usuario = aa.id_usuario
      AND d.id_recuperacion IS NULL
      AND JSON_CONTAINS(d.estudiantes_asistieron, CAST(e.id_estudiante AS CHAR))
  )
)`

export async function listActivities(session: AuthenticatedSession) {
  const [rows] = await pool.query(`
    SELECT a.id_actividad AS id, a.titulo AS title, a.descripcion AS description,
      a.vence_en AS dueAt, a.entregado_en AS submittedAt,
      a.id_sesion AS sessionId, materia.nombre AS sessionSubject,
      DATE_FORMAT(s.fecha, '%Y-%m-%d') AS sessionDate, TIME_FORMAT(s.hora_inicio, '%H:%i') AS sessionStartTime,
      a.nombre_adjunto AS attachmentName, a.nombre_entrega AS submissionName, a.comentario_entrega AS submissionComment,
      CONCAT(alumno.nombres, ' ', alumno.apellidos) AS student,
      CONCAT(tutor.nombres, ' ', tutor.apellidos) AS tutor,
      CASE WHEN a.entregado_en IS NOT NULL THEN 'Entregada'
           WHEN a.vence_en <= UNIX_TIMESTAMP() THEN 'Vencida'
           ELSE 'Pendiente' END AS status
    ${activityParticipants}
    LEFT JOIN Sesion s ON s.id_sesion = a.id_sesion
    LEFT JOIN Solicitud so ON so.id_solicitud = s.id_solicitud
    LEFT JOIN Asignatura materia ON materia.id_asignatura = so.id_asignatura
    WHERE ${participantFilter(session)}
    ORDER BY a.vence_en, a.id_actividad DESC`, [session.user.id])
  return rows
}

export async function createActivity(tutorId: number, body: unknown) {
  const input = activitySchema.parse(body)
  if (input.dueAt <= Math.floor(Date.now() / 1000)) {
    throw new DataError(422, 'INVALID_DEADLINE', 'Selecciona una fecha límite futura.')
  }

  return saveActivityChange(async (connection) => {
    const [students] = await connection.query(`
      SELECT e.id_estudiante AS id, e.id_usuario AS userId
      ${tutorSession}
      JOIN Estudiante e ON e.estado = 'Activo'
      JOIN Usuario u ON u.id_usuario = e.id_usuario AND u.estado = 'Activo'
      WHERE ${completedTutorSession} AND s.id_sesion = ?
        AND e.id_estudiante IN (?) AND ${recordedAttendance}
      ORDER BY e.id_estudiante FOR UPDATE`, [tutorId, input.sessionId, input.studentIds])
    if (students.length !== input.studentIds.length) {
      throw new DataError(422, 'INVALID_ACTIVITY_ATTENDEES', 'Selecciona estudiantes con asistencia registrada en una de tus tutorías realizadas.')
    }
    const ids: number[] = []
    for (const student of students) {
      const [result] = await connection.execute(`
        INSERT INTO ActividadTutor (id_tutor, id_estudiante, titulo, descripcion, vence_en, nombre_adjunto, adjunto, id_sesion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tutorId, student.id, input.title, input.description, input.dueAt, input.file.name, input.file.data, input.sessionId])
      ids.push(result.insertId)
      await publishNotifications([student.userId], {
        category: 'Sistema',
        title: 'Nueva actividad asignada',
        message: `Tu tutor te asignó «${input.title}».`,
        entityType: 'actividad',
        entityId: result.insertId,
      }, connection)
    }
    return { id: ids[0], ids }
  })
}

export async function submitActivity(studentUserId: number, id: number, body: unknown) {
  const input = submissionSchema.parse(body)
  const file = fileSchema.parse(input)
  await saveActivityChange(async (connection) => {
    const [result] = await connection.execute(`
      UPDATE ActividadTutor a JOIN Estudiante e ON e.id_estudiante = a.id_estudiante
      SET a.entrega = ?, a.nombre_entrega = ?, a.comentario_entrega = ?, a.entregado_en = UNIX_TIMESTAMP()
      WHERE a.id_actividad = ? AND e.id_usuario = ?
        AND a.entregado_en IS NULL AND a.vence_en > UNIX_TIMESTAMP()`,
    [file.data, file.name, input.comment || null, id, studentUserId])

    const [rows] = await connection.query(`
      SELECT a.entregado_en AS submittedAt, a.id_tutor AS tutorId, a.titulo AS title
      FROM ActividadTutor a JOIN Estudiante e ON e.id_estudiante = a.id_estudiante
      WHERE a.id_actividad = ? AND e.id_usuario = ? FOR UPDATE`, [id, studentUserId])
    const activity = rows[0]
    if (!activity) throw new DataError(404, 'ACTIVITY_NOT_FOUND', 'No se encontró la actividad.')
    if (!result.affectedRows) {
      if (activity.submittedAt !== null) throw new DataError(409, 'ACTIVITY_SUBMITTED', 'Esta actividad ya fue entregada.')
      throw new DataError(409, 'ACTIVITY_EXPIRED', 'El plazo de entrega ya venció.')
    }
    await publishNotifications([activity.tutorId], {
      category: 'Sistema',
      title: 'Actividad entregada',
      message: `Recibiste una entrega para «${activity.title}».`,
      entityType: 'actividad',
      entityId: id,
    }, connection)
  })
}

export async function getActivityFile(session: AuthenticatedSession, id: number, kind: 'adjunto' | 'entrega') {
  const columns = kind === 'adjunto'
    ? 'a.nombre_adjunto AS name, a.adjunto AS data'
    : 'a.nombre_entrega AS name, a.entrega AS data'
  const [rows] = await pool.query(`
    SELECT ${columns} ${activityParticipants}
    WHERE a.id_actividad = ? AND ${participantFilter(session)}`, [id, session.user.id])
  if (!rows[0]?.data) throw new DataError(404, 'ACTIVITY_FILE_NOT_FOUND', 'No se encontró el archivo.')
  return { name: rows[0].name as string, data: rows[0].data as Buffer }
}
