// @ts-nocheck
import { z } from 'zod'
import { pool } from './db.js'
import { DataError } from './data.js'

export async function publishNotifications(userIds:number[],input:{category:'Solicitud'|'Sesion'|'Informe'|'Sistema';title:string;message:string;entityType?:string;entityId?:number}){
  const ids=[...new Set(userIds.map(Number).filter(id=>Number.isInteger(id)&&id>0))]
  if(!ids.length)return
  try{
    const placeholders=ids.map(()=>'(?,?,?,?,?,?,FALSE)').join(',')
    const values=ids.flatMap(id=>[id,input.category,input.title,input.message,input.entityType??null,input.entityId??null])
    await pool.execute(`INSERT INTO Notificacion(id_usuario,categoria,titulo,mensaje,entidad_tipo,entidad_id,leida) VALUES ${placeholders}`,values)
  }catch(error){console.error('No se pudo registrar notificación:',error?.message??error)}
}

export async function publishRoleNotification(role:string,input:{category:'Solicitud'|'Sesion'|'Informe'|'Sistema';title:string;message:string;entityType?:string;entityId?:number}){
  try{const [rows]=await pool.query("SELECT DISTINCT u.id_usuario AS id FROM Usuario u JOIN UsuarioRol ur ON ur.id_usuario=u.id_usuario JOIN Rol r ON r.id_rol=ur.id_rol WHERE r.nombre=? AND r.estado='Activo' AND ur.estado='Activo' AND u.estado='Activo'",[role]);await publishNotifications(rows.map(row=>row.id),input)}catch(error){console.error('No se pudo resolver destinatarios de notificación:',error?.message??error)}
}

export async function publishRequestNotifications(requestId:number,input:{title:string;message:string;category?:'Solicitud'|'Sesion';includeStaff?:boolean}){
  try{const [rows]=await pool.query(`SELECT e.id_usuario AS studentId${input.includeStaff?',aa.id_usuario AS staffId':''}
    FROM Solicitud s JOIN Estudiante e ON e.id_estudiante=s.id_estudiante${input.includeStaff?' LEFT JOIN Sesion se ON se.id_solicitud=s.id_solicitud LEFT JOIN AsignacionAcademica aa ON aa.id_asignacion=se.id_asignacion':''}
    WHERE s.id_solicitud=?`,[requestId])
  await publishNotifications(rows.flatMap(row=>[row.studentId,row.staffId].filter(Boolean)),{category:input.category??'Solicitud',title:input.title,message:input.message,entityType:'solicitud',entityId:requestId})}catch(error){console.error('No se pudo crear notificación asociada a solicitud:',error?.message??error)}
}

export async function listNotifications(session:any){
  const [rows]=await pool.query(`SELECT id_notificacion AS id,categoria AS category,titulo AS title,mensaje AS message,entidad_tipo AS entityType,entidad_id AS entityId,DATE_FORMAT(fecha,'%Y-%m-%dT%H:%i:%s-05:00') AS createdAt,leida AS \`read\` FROM Notificacion WHERE id_usuario=? ORDER BY fecha DESC,id_notificacion DESC LIMIT 50`,[session.user.id])
  const [count]=await pool.query('SELECT COUNT(*) AS unread FROM Notificacion WHERE id_usuario=? AND leida=FALSE',[session.user.id])
  return {items:rows,unread:Number(count[0]?.unread??0)}
}

export async function markNotificationRead(session:any,id:number){
  const [result]=await pool.execute('UPDATE Notificacion SET leida=TRUE WHERE id_notificacion=? AND id_usuario=?',[id,session.user.id])
  if(!result.affectedRows){const [rows]=await pool.query('SELECT id_notificacion FROM Notificacion WHERE id_notificacion=? AND id_usuario=?',[id,session.user.id]);if(!rows.length)throw new DataError(404,'NOTIFICATION_NOT_FOUND','La notificación no existe o no te pertenece.')}
  return {read:true}
}

export async function markAllNotificationsRead(session:any){await pool.execute('UPDATE Notificacion SET leida=TRUE WHERE id_usuario=? AND leida=FALSE',[session.user.id]);return {read:true}}

const monthSchema=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/,'El mes debe tener formato AAAA-MM.')
const monthlyDraftSchema=z.object({month:monthSchema,title:z.string().trim().min(3).max(200),introduction:z.string().trim().max(3000),achievements:z.string().trim().max(3000),challenges:z.string().trim().max(3000),recommendations:z.string().trim().max(3000)}).strict()

export async function getMonthlyTutorReport(session:any,monthValue:string){
  if(session.activeRole!=='Tutor')throw new DataError(403,'FORBIDDEN','El informe mensual está disponible para tutores.')
  const month=monthSchema.parse(monthValue)
  const [profile]=await pool.query("SELECT CONCAT(u.nombres,' ',u.apellidos) AS tutor,u.documento AS tutorDocument,t.horas_semanales AS weeklyHours FROM Usuario u JOIN Tutor t ON t.id_usuario=u.id_usuario AND t.estado='Activo' WHERE u.id_usuario=? AND u.estado='Activo'",[session.user.id])
  if(!profile.length)throw new DataError(403,'TUTOR_PROFILE_REQUIRED','No se encontró un perfil activo de tutor.')
  const [sessions]=await pool.query(`SELECT s.id_sesion AS id,so.id_solicitud AS requestId,a.codigo AS subjectCode,a.nombre AS subject,DATE_FORMAT(COALESCE(d.fecha_monitoria,s.fecha),'%Y-%m-%d') AS date,TIME_FORMAT(COALESCE(d.hora_inicio_real,s.hora_inicio),'%H:%i') AS startTime,TIME_FORMAT(COALESCE(d.hora_fin_real,s.hora_fin),'%H:%i') AS endTime,COALESCE(d.lugar,esp.nombre,'Sin espacio asignado') AS place,s.modalidad AS modality,s.estado AS sessionStatus,i.id_informe AS reportId,i.estado AS reportStatus,i.titulo AS reportTitle,i.contenido AS reportContent,i.actividades_desarrolladas AS activities,i.logros AS achievements,i.dificultades AS difficulties,i.recomendaciones AS reportRecommendations,COALESCE(d.cantidad_asistentes,0) AS attendees,COALESCE(d.cantidad_sat,0) AS satCount,COALESCE(d.descripcion,'') AS description,COALESCE(d.recuperada,FALSE) AS recovered,
      (SELECT COUNT(*) FROM AdjuntoInformeTutor at WHERE at.id_informe=i.id_informe) AS attachmentCount
    FROM Sesion s JOIN Solicitud so ON so.id_solicitud=s.id_solicitud JOIN Asignatura a ON a.id_asignatura=so.id_asignatura JOIN AsignacionAcademica aa ON aa.id_asignacion=s.id_asignacion JOIN Rol r ON r.id_rol=aa.id_rol LEFT JOIN Informe i ON i.id_sesion=s.id_sesion LEFT JOIN InformeTutorDetalle d ON d.id_informe=i.id_informe LEFT JOIN AsignacionEspacio ae ON ae.id_asignacion_espacio=s.id_asignacion_espacio LEFT JOIN Espacio esp ON esp.id_espacio=ae.id_espacio
    WHERE aa.id_usuario=? AND r.nombre='Tutor' AND DATE_FORMAT(COALESCE(d.fecha_monitoria,s.fecha),'%Y-%m')=? AND s.estado IN ('Realizada','Finalizada') AND i.id_informe IS NOT NULL ORDER BY COALESCE(d.fecha_monitoria,s.fecha),s.hora_inicio`,[session.user.id,month])
  for(const row of sessions){let legacy:any=row.reportContent;try{if(typeof legacy==='string')legacy=JSON.parse(legacy)}catch{legacy={}};if(!legacy||typeof legacy!=='object')legacy={};row.attendees=Number(row.attendees||legacy.attendanceCount||0);row.satCount=Number(row.satCount||legacy.satCount||0);row.description=row.description||legacy.description||'';row.activities=row.activities||legacy.activities||'';row.achievements=row.achievements||legacy.achievements||'';row.difficulties=row.difficulties||legacy.difficulties||'';row.reportRecommendations=row.reportRecommendations||legacy.recommendations||'';delete row.reportContent}
  const reportIds=sessions.map(row=>Number(row.reportId)).filter(id=>id>0)
  const attachments=reportIds.length?(await pool.query(`SELECT id_adjunto AS id,id_informe AS reportId,categoria AS category,nombre_archivo AS name,tipo_archivo AS mimeType,tamano_archivo AS size FROM AdjuntoInformeTutor WHERE id_informe IN (${reportIds.map(()=>'?').join(',')}) ORDER BY id_adjunto` ,reportIds))[0]:[]
  for(const row of sessions)row.attachments=attachments.filter(file=>Number(file.reportId)===Number(row.reportId)).map(({reportId,...file})=>file)
  const [drafts]=await pool.query('SELECT id_informe_mensual AS id,titulo AS title,contenido AS content,estado AS status,DATE_FORMAT(actualizado_en,\'%Y-%m-%d %H:%i:%s\') AS updatedAt FROM InformeMensualTutor WHERE id_usuario=? AND periodo_mes=?',[session.user.id,month])
  let draft=null
  if(drafts.length){let content=drafts[0].content;try{if(typeof content==='string')content=JSON.parse(content)}catch{};draft={...drafts[0],content}}
  const totals=sessions.reduce((sum,row)=>{const [startHour,startMinute]=String(row.startTime).split(':').map(Number);const [endHour,endMinute]=String(row.endTime).split(':').map(Number);return {...sum,sessions:sum.sessions+1,attendees:sum.attendees+Number(row.attendees),sat:sum.sat+Number(row.satCount),minutes:sum.minutes+(endHour*60+endMinute)-(startHour*60+startMinute)}},{sessions:0,attendees:0,sat:0,minutes:0})
  return {month,tutor:profile[0].tutor,tutorDocument:profile[0].tutorDocument,weeklyHours:Number(profile[0].weeklyHours??0),totals,sessions,draft}
}

export async function saveMonthlyTutorDraft(session:any,payload:unknown){
  if(session.activeRole!=='Tutor')throw new DataError(403,'FORBIDDEN','El informe mensual está disponible para tutores.')
  const input=monthlyDraftSchema.parse(payload)
  const [result]=await pool.execute(`INSERT INTO InformeMensualTutor(id_usuario,periodo_mes,titulo,contenido,estado) VALUES(?,?,?,?,'Borrador') ON DUPLICATE KEY UPDATE titulo=IF(estado='Borrador',VALUES(titulo),titulo),contenido=IF(estado='Borrador',VALUES(contenido),contenido),actualizado_en=IF(estado='Borrador',CURRENT_TIMESTAMP,actualizado_en)`,[session.user.id,input.month,input.title,JSON.stringify({introduction:input.introduction,achievements:input.achievements,challenges:input.challenges,recommendations:input.recommendations})])
  const [rows]=await pool.query('SELECT id_informe_mensual AS id,estado AS status FROM InformeMensualTutor WHERE id_usuario=? AND periodo_mes=?',[session.user.id,input.month])
  if(rows[0]?.status!=='Borrador')throw new DataError(409,'MONTHLY_REPORT_LOCKED','El informe mensual ya fue enviado y no se puede editar.')
  return {id:Number(rows[0]?.id),status:rows[0]?.status,updated:!!result.affectedRows}
}
