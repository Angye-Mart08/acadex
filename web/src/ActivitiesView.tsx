import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Download, Plus, X } from 'lucide-react'
import { ApiError, createActivity, downloadActivityFile, listActivities, listActivitySessions, listMonitorActivitySessions, listActivityStudents, listMonitorActivityStudents, submitActivity, type Activity, type ActivitySession, type ActivityStudent } from './api'
import './activities.css'

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
})

async function readAttachment(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || !file.size) throw new Error('Selecciona un archivo con contenido.')
  if (file.size > 4 * 1024 * 1024) throw new Error('El archivo supera el límite de 4 MB.')
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'))
    reader.readAsDataURL(file)
  })
  return { name: file.name, base64 }
}

function sessionLabel(subject: string | null, date: string | null, time: string | null, id: number) {
  const formattedDate = date ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' })
    .format(new Date(`${date}T12:00:00-05:00`)) : null
  return [subject, formattedDate, time, `Sesión #${id}`].filter(Boolean).join(' · ')
}

export function ActivitiesView({ accessToken, isTutor, staffRole='Tutor', notificationTarget, initialSessionId }: {
  accessToken: string
  isTutor: boolean
  staffRole?: 'Tutor'|'Monitor'
  notificationTarget: { activityId: number } | null
  initialSessionId: number | null
}) {
  const [activities, setActivities] = useState<Activity[] | null>(null)
  const [sessions, setSessions] = useState<ActivitySession[] | null>(null)
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId)
  const [assignOpen, setAssignOpen] = useState(Boolean(initialSessionId))
  const assignDialogRef = useRef<HTMLDialogElement|null>(null)
  const [attendance, setAttendance] = useState<{ sessionId: number; students: ActivityStudent[] } | null>(null)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const selectedSession = sessions?.find((session) => session.id === sessionId)
  const students = attendance?.sessionId === selectedSession?.id ? attendance?.students : undefined
  const groups = new Map<number | null, Activity[]>()
  for (const activity of activities ?? []) {
    const group = groups.get(activity.sessionId)
    if (group) group.push(activity)
    else groups.set(activity.sessionId, [activity])
  }

  useEffect(() => {
    if (!initialSessionId) return
    setSessionId(initialSessionId)
    setAssignOpen(true)
  }, [initialSessionId])

  useEffect(() => {
    const dialog = assignDialogRef.current
    if (!dialog) return
    if (assignOpen && !dialog.open) dialog.showModal()
    if (!assignOpen && dialog.open) dialog.close()
  }, [assignOpen])

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    void listActivities(accessToken)
      .then((rows) => {
        if (!active) return
        setActivities(rows)
        if (notificationTarget) {
          window.requestAnimationFrame(() => {
            if (!active) return
            const activity = document.getElementById(`activity-${notificationTarget.activityId}`)
            activity?.focus({ preventScroll: true })
            activity?.scrollIntoView({ block: 'nearest' })
          })
        }
      })
      .catch((err: Error) => { if (active) setLoadError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [accessToken, revision, notificationTarget])

  useEffect(() => {
    if (!isTutor) return
    let active = true
    const get=staffRole==='Monitor'?listMonitorActivitySessions:listActivitySessions
    void get(accessToken)
      .then((rows) => { if (active) setSessions(rows) })
      .catch((err: Error) => { if (active) setLoadError(err.message) })
    return () => { active = false }
  }, [accessToken, isTutor, staffRole, revision])

  const selectedSessionId = selectedSession?.id
  useEffect(() => {
    if (!isTutor || !selectedSessionId) return
    let active = true
    const get=staffRole==='Monitor'?listMonitorActivityStudents:listActivityStudents
    void get(accessToken, selectedSessionId)
      .then((rows) => { if (active) setAttendance({ sessionId: selectedSessionId, students: rows }) })
      .catch((err: Error) => { if (active) setLoadError(err.message) })
    return () => { active = false }
  }, [accessToken, isTutor, staffRole, selectedSessionId, revision])

  async function save(event: FormEvent<HTMLFormElement>, activityId?: number) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const fields = new FormData(form)
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const file = await readAttachment(fields.get('file'))
      if (activityId === undefined) {
        const studentIds = fields.getAll('students').map(Number)
        if (!selectedSession || !studentIds.length) throw new Error('Selecciona la tutoría y al menos un estudiante que asistió.')
        const deadline = new Date(`${fields.get('deadline')}:00-05:00`)
        if (!(deadline.getTime() > Date.now())) throw new Error('Selecciona una fecha límite futura.')
        await createActivity(accessToken, {
          sessionId: selectedSession.id,
          studentIds,
          title: String(fields.get('title')),
          description: String(fields.get('description')),
          dueAt: deadline.toISOString(),
          file,
        })
        setSuccess(studentIds.length === 1 ? 'Actividad asignada correctamente.' : `Actividad asignada a ${studentIds.length} estudiantes.`)
        setAssignOpen(false)
        setSessionId(null)
      } else {
        const comment = String(fields.get('comment') ?? '').trim()
        await submitActivity(accessToken, activityId, { ...file, comment: comment || undefined })
        setSuccess('Actividad entregada correctamente.')
      }
      form.reset()
      setRevision((value) => value + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la actividad.')
      if (err instanceof ApiError && err.status === 409) setRevision((value) => value + 1)
      if (err instanceof ApiError && err.code === 'INVALID_ACTIVITY_ATTENDEES') {
        setAttendance(null)
        setRevision((value) => value + 1)
      }
    } finally {
      setBusy(false)
    }
  }

  async function download(id: number, kind: 'adjunto' | 'entrega', name: string) {
    setError('')
    try {
      const blob = await downloadActivityFile(accessToken, id, kind)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el archivo.')
    }
  }

  return <div className="activities-view">
    {loadError && (!isTutor || !assignOpen) && <div className="error-message" role="alert">{loadError}{' '}
      <button type="button" className="text-button" onClick={() => setRevision((value) => value + 1)}>Reintentar</button>
    </div>}
    {error && (!isTutor || !assignOpen) && <div className="error-message" role="alert">{error}</div>}
    {success && <div className="success-message" role="status">{success}</div>}

    {isTutor && <section className="panel activity-assignment-launcher">
      <div><span className="eyebrow">GESTIÓN DE ACTIVIDADES</span><h2>Asignar actividad</h2><p>Elige una sesión atendida, selecciona a sus asistentes y adjunta las instrucciones de trabajo.</p></div>
      {sessions?.length === 0 ? <div className="activity-launcher-empty">Aún no tienes sesiones realizadas con las que puedas asignar actividades.</div> : <button type="button" className="primary-button" onClick={() => { setError(''); setSuccess(''); setAssignOpen(true) }} disabled={!sessions?.length || busy}><Plus size={17}/> Nueva asignación</button>}
    </section>}

    {isTutor && <dialog ref={assignDialogRef} className="activity-assignment-dialog" aria-labelledby="activity-assignment-title" onClose={() => setAssignOpen(false)} onClick={(event) => { if (event.target === assignDialogRef.current) setAssignOpen(false) }}>
      <header className="activity-assignment-dialog-header"><div><span className="eyebrow">{staffRole==='Tutor'?'TUTORÍA':'MONITORÍA'} · NUEVA TAREA</span><h2 id="activity-assignment-title">Asignar actividad</h2><p>Completa la sesión, estudiantes, instrucciones y fecha de entrega.</p></div><button type="button" className="modal-close" aria-label="Cerrar formulario" onClick={() => setAssignOpen(false)}><X size={19}/></button></header>
      {loadError&&<div className="error-message" role="alert">{loadError} <button type="button" className="text-button" onClick={()=>setRevision(value=>value+1)}>Reintentar</button></div>}
      {error&&<div className="error-message" role="alert">{error}</div>}
      {sessions?.length === 0 && <p>Aún no tienes sesiones realizadas.</p>}
      {!!sessions?.length && <form className="portal-form activity-assignment-form" onSubmit={(event) => void save(event)}>
        <label>Sesión de {staffRole==='Tutor'?'tutoría':'monitoría'}
          <select name="session" required value={selectedSessionId ?? ''} disabled={busy} onChange={(event) => {
            setSessionId(Number(event.target.value))
            setAttendance(null)
            setError('')
            setSuccess('')
          }}>
            <option value="" disabled>Selecciona una sesión realizada</option>
            {sessions.map((session) => <option key={session.id} value={session.id}>{sessionLabel(session.subject, session.date, session.startTime, session.id)}</option>)}
          </select>
        </label>
        {selectedSession && !students && !loadError && <p role="status">Consultando la asistencia…</p>}
        {students?.length === 0 && <p>Esta sesión no tiene estudiantes activos con asistencia registrada. Revisa la asistencia en Reportes.</p>}
        {!!students?.length && <>
        <fieldset className="activity-attendees" key={selectedSessionId} disabled={busy}>
          <legend>Estudiantes que asistieron</legend>
          {students.map((student) => <label key={student.id}>
            <input type="checkbox" name="students" value={student.id} defaultChecked={students.length === 1} />
            <span>{student.name} · {student.code}</span>
          </label>)}
        </fieldset>
        <label>Título<input name="title" maxLength={150} required /></label>
        <label>Descripción<textarea name="description" maxLength={2000} required /></label>
        <div className="form-columns"><label>Fecha y hora límite (Colombia)<input name="deadline" type="datetime-local" required /></label><label>Archivo de la actividad (máx. 4 MB)<input name="file" type="file" required /></label></div>
        </>}
        <div className="activity-assignment-actions"><button type="button" className="secondary-button" onClick={() => setAssignOpen(false)} disabled={busy}>Cancelar</button>{!!students?.length&&<button type="submit" className="primary-button" disabled={busy}>{busy ? 'Asignando…' : 'Asignar actividad'}</button>}</div>
      </form>}
    </dialog>}

    {loading && <div className="data-loading" role="status">Cargando actividades…</div>}
    {activities && <section className="panel activity-list-panel">
      <header className="activity-list-heading"><div><span className="eyebrow">MI ESPACIO / ACTIVIDADES</span><h2>{isTutor ? 'Actividades asignadas' : 'Actividades recibidas'}</h2><p>{activities.length?`${activities.length} actividad${activities.length===1?'':'es'} en total`:isTutor?'Las actividades que asignes aparecerán aquí organizadas por sesión.':'Las actividades que te asignen aparecerán aquí.'}</p></div>{isTutor&&!!activities.length&&<span className="role-pill">{activities.length} asignadas</span>}</header>
      {!activities.length && <div className="activity-list-empty"><div className="activity-list-empty-icon"><Download size={20}/></div><strong>{isTutor ? 'Todavía no has asignado actividades.' : 'Todavía no tienes actividades asignadas.'}</strong><span>{isTutor?'Usa “Nueva asignación” para preparar y enviar una actividad a los estudiantes que asistieron.':'Cuando recibas una actividad, podrás consultar sus instrucciones y entregar tu trabajo desde aquí.'}</span></div>}
      {[...groups].map(([id, group]) => <section className="activity-session-group" key={id ?? 'previous'}>
        <h3>{id === null ? 'Actividades sin sesión vinculada' : sessionLabel(group[0].sessionSubject, group[0].sessionDate, group[0].sessionStartTime, id)}</h3>
        {group.map((activity) => <article className="activity-task" key={activity.id} id={`activity-${activity.id}`} tabIndex={-1}>
          <header className="activity-task-header">
            <div>
              <h4>{activity.title}</h4>
              <p>{isTutor ? 'Estudiante' : 'Tutor'} · {isTutor ? activity.student : activity.tutor}</p>
            </div>
            <span className="role-pill">{activity.status}</span>
          </header>
          <p className="activity-task-description">{activity.description}</p>
          <dl className="activity-task-dates">
            <div>
              <dt>Fecha límite</dt>
              <dd><time dateTime={new Date(activity.dueAt * 1000).toISOString()}>{dateFormatter.format(activity.dueAt * 1000)}</time> (Colombia)</dd>
            </div>
            {activity.submittedAt !== null && <div>
              <dt>Entrega registrada</dt>
              <dd><time dateTime={new Date(activity.submittedAt * 1000).toISOString()}>{dateFormatter.format(activity.submittedAt * 1000)}</time> (Colombia)</dd>
            </div>}
          </dl>
          {activity.submissionComment && <div className="activity-task-comment">
            <strong>Comentario de la entrega</strong>
            <p className="activity-task-description">{activity.submissionComment}</p>
          </div>}
          <div className="activity-task-files">
            <button type="button" className="secondary-button" onClick={() => void download(activity.id, 'adjunto', activity.attachmentName)}>
              <Download size={16} aria-hidden="true" /> <span><strong>Material</strong><small>{activity.attachmentName}</small></span>
            </button>
            {activity.submissionName && <button type="button" className="secondary-button" onClick={() => void download(activity.id, 'entrega', activity.submissionName!)}>
              <Download size={16} aria-hidden="true" /> <span><strong>Entrega</strong><small>{activity.submissionName}</small></span>
            </button>}
          </div>
          {!isTutor && activity.status === 'Pendiente' && <form className="portal-form activity-task-form" onSubmit={(event) => void save(event, activity.id)}>
            <label>Archivo de entrega (máx. 4 MB)<input name="file" type="file" required /></label>
            <label>Comentario de la entrega (opcional)<textarea name="comment" maxLength={4000} /></label>
            <div><button type="submit" className="primary-button" disabled={busy || loading}>Entregar actividad</button></div>
          </form>}
        </article>)}
      </section>)}
    </section>}
  </div>
}
