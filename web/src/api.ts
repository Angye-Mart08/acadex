export type Role = 'Administrador' | 'Tutor' | 'Monitor' | 'Estudiante'

export type ApiUser = {
  id: number
  code: string
  name: string
  email: string
  phone?: string | null
  roles: Role[]
  status: 'Activo' | 'Inactivo'
  initials: string
  activeRole?: Role
  document?: string
  profiles?: RoleProfiles
  mustChangePassword?: boolean
}

export type RoleAssignment = { subjectId: number; subjectName?: string; periodId?: number; periodName?: string; weeklyHours?: number; status?: string }
export type RoleAssignmentInput = { subjectIds: number[]; periodId?: number; weeklyHours?: number }
export type RoleProfiles = {
  administrador?: { cargo: string; dependencia: string; institutionalEmail: string; observaciones: string }
  estudiante?: { studentCode: string; semestre: number; programId: number; programName?: string; facultyName?: string }
  tutor?: { teachingCategory: string; employmentType: string; currentPeriod: string; weeklyHours: number; observations: string; assignments: RoleAssignment[] | RoleAssignmentInput }
  monitor?: { monitorType: string; resolution: string; currentPeriod: string; weeklyHours: number; observations: string; assignments: RoleAssignment[] | RoleAssignmentInput }
}

export type ApiSpace = {
  id: number
  code: string
  name: string
  type: string
  location: string
  capacity: number
  status: 'Activo' | 'Inactivo'
  building?: string
  block?: string
  room?: string
  floor?: string
  description?: string
  resources?: string
  observations?: string
}

export type ApiRequest = {
  id: number
  student: string
  subject: string
  type: 'Monitoría' | 'Tutoría' | 'Acompañamiento'
  priority: 'Alta' | 'Media' | 'Baja'
  status: 'Pendiente' | 'Aprobada' | 'Asignada' | 'Rechazada' | 'Cancelada' | 'Atendida' | 'Finalizada'
  date: string
  studentId?: number
  programId?: number
  program?: string
  subjectId?: number
  motive?: string
  description?: string
  period?: string
  periodId?: number
  sessionStatus?: string | null
}

export type PortalSession = {
  id: number
  requestId?: number
  subject: string
  date: string
  startTime: string
  endTime: string
  modality: 'Presencial' | 'Virtual' | 'Híbrida'
  place: string
  status: string
}

export type PortalAvailability = {
  id: number
  assignmentId?: number
  day: string
  startTime: string
  endTime: string
  subject: string
  place: string
  modality: 'Presencial' | 'Virtual' | 'Híbrida'
  status: 'Activo' | 'Inactivo'
}

export type TutorAssignment = { id: number; subjectId: number; codigo: string; subject: string; periodId: number; period: string }
export type TutorDashboardData = { metrics: { upcoming: number; completed: number; openRequests: number; pendingReports: number }; upcoming: Array<{ id: number; subject: string; date: string; startTime: string; endTime: string; status: string; place: string }> }
export type TutorRecovery = { id: number; originalSessionId: number; date: string; startTime: string; endTime: string; description: string; status: 'Programada'|'Realizada'|'Cancelada'; subject: string }
export type TutorRecoverableSession = { id:number;requestId:number;subject:string;date:string;startTime:string;endTime:string;status:'Cancelada'|'No Asistida';cancellationReason:string }
export type TutorReport = { id: number; sessionId: number; subject: string; date: string; status: string; title: string; content: string; activities: string; achievements: string; difficulties: string; recommendations: string }
export type TutorReportAttachment = {id:number;category:string;name:string;mimeType:string;size:number}
export type TutorReportRecord = {id:number;sessionId:number;subject:string;student:string;status:string;title:string;content:Record<string,unknown>|string|null;activities:string;achievements:string;difficulties:string;recommendations:string;date:string;startTime:string;endTime:string;place:string;description:string;attendanceCount:number;satCount:number;attendees:number[];satDetails:Array<{studentId:number;description:string}>;recovered:boolean;recoveryId:number|null;attachments:TutorReportAttachment[]}
export type TutorReportableSession = { id:number; requestId:number; studentId:number; student:string; subject:string; date:string; startTime:string; endTime:string; modality:string; status:string; place:string; reportId:number|null; reportStatus:string|null; reportTitle:string|null; isRecovery?:boolean; recoveryId?:number|null }
export type NotificationItem = { id:number; category:'Solicitud'|'Sesion'|'Informe'|'Sistema'; title:string; message:string; entityType:string|null; entityId:number|null; createdAt:string; read:boolean }
export type NotificationResponse = { items:NotificationItem[]; unread:number }
export type MonthlyTutorSession = { id:number; requestId:number; subjectCode:string; subject:string; date:string; startTime:string; endTime:string; place:string; modality:string; sessionStatus:string; reportId:number|null; reportStatus:string|null; reportTitle:string|null; activities:string|null; achievements:string|null; difficulties:string|null; reportRecommendations:string|null; attendees:number; satCount:number; description:string; recovered:boolean; attachmentCount:number; attachments:Array<{id:number;category:string;name:string;mimeType:string;size:number}> }
export type MonthlyTutorReport = { month:string; tutor:string; tutorDocument:string; weeklyHours:number; totals:{sessions:number;attendees:number;sat:number;minutes:number}; sessions:MonthlyTutorSession[]; draft:null|{id:number;title:string;content:{introduction:string;achievements:string;challenges:string;recommendations:string};status:'Borrador'|'Enviado';updatedAt:string} }

export type AdminCatalogs = {
  programs: Array<{ id: number; codigo: string; nombre: string; facultyName?: string }>
  faculties: Array<{ id: number; nombre: string }>
  subjects: Array<{ id: number; codigo: string; nombre: string }>
  periods: Array<{ id: number; nombre: string; estado: string }>
  students: Array<{ id: number; name: string; studentCode: string; programId?: number; programName?: string }>
  requestTypes: Array<{ id: number; nombre: string }>
  staffAssignments: Array<{ userId: number; name: string; role: 'Tutor' | 'Monitor'; subjectId: number; periodId: number; weeklyHours: number }>
}

export type RequestAssignmentInput = { userId: number; role: 'Tutor' | 'Monitor'; date: string; startTime: string; endTime: string; modality: 'Presencial' | 'Virtual' }
export type AdminRequestSlot = {date:string;day:string;startTime:string;endTime:string;modality:'Presencial'|'Virtual'}
export type StudentRequestStaff = {userId:number;name:string;role:'Tutor'|'Monitor';weeklyHours:number}
export function listAdminRequestSlots(accessToken:string,input:{userId:number;role:'Tutor'|'Monitor';subjectId:number;periodId:number}) { const query=new URLSearchParams({userId:String(input.userId),role:input.role,subjectId:String(input.subjectId),periodId:String(input.periodId)});return request<AdminRequestSlot[]>(`/admin/request-slots?${query}`,authenticatedOptions(accessToken)) }
export function listAdminRequestStaff(accessToken:string,input:{role:'Tutor'|'Monitor';subjectId:number;periodId:number}) { const query=new URLSearchParams({role:input.role,subjectId:String(input.subjectId),periodId:String(input.periodId)});return request<StudentRequestStaff[]>(`/admin/request-staff?${query}`,authenticatedOptions(accessToken)) }
export function listStudentRequestStaff(accessToken:string,input:{role:'Tutor'|'Monitor';subjectId:number;periodId:number}) { const query=new URLSearchParams({role:input.role,subjectId:String(input.subjectId),periodId:String(input.periodId)});return request<StudentRequestStaff[]>(`/requests/eligible-staff?${query}`,authenticatedOptions(accessToken)) }
export function listStudentRequestSlots(accessToken:string,input:{userId:number;role:'Tutor'|'Monitor';subjectId:number;periodId:number}) { const query=new URLSearchParams({userId:String(input.userId),role:input.role,subjectId:String(input.subjectId),periodId:String(input.periodId)});return request<AdminRequestSlot[]>(`/requests/available-slots?${query}`,authenticatedOptions(accessToken)) }

export type AdminDashboard = {
  generatedAt: string
  summary: { users: { total: number; active: number }; spaces: { total: number; active: number }; requests: { total: number; pending: number }; sessions: { total: number; completed: number } }
  charts: { bySubject: Array<{ id: number; name: string; sessions: number; completed: number; cancelled: number }>; byRole: Array<{ role: string; people: number; sessions: number }>; byRequestStatus: Array<{ status: string; total: number }>; attendance: Array<{ status: string; total: number }>; byMonth: Array<{ period: string; total: number }>; sessions: Array<Record<string, unknown>> }
}

export type AdminReport = {
  generatedAt: string
  filters: { subjectId: string | null; from: string | null; to: string | null }
  bySubject: AdminDashboard['charts']['bySubject']
  byRole: AdminDashboard['charts']['byRole']
  byRequestStatus: AdminDashboard['charts']['byRequestStatus']
  attendance: AdminDashboard['charts']['attendance']
  byMonth: AdminDashboard['charts']['byMonth']
  sessions: Array<Record<string, unknown>>
}

export type CredentialAccount = { id: number; code: string; email: string; name: string; status: string; roles: Role[] }
export type SuspendedAccount = { id: number; email: string; name: string; failedAttempts: number; lockedUntil: string; passwordChangeRequested: boolean }
export type PasswordChangeRequestHistory = { id: number; userId: number | null; email: string; name: string; requestType: 'AyudaAdministrador' | 'CodigoCorreo'; status: 'Pendiente' | 'Completada'; requestedAt: string; completedAt: string | null; managedBy: string | null }
export type TemporaryCredentialExport = { generatedAt: string; role: Role; accounts: Array<Pick<CredentialAccount, 'id' | 'code' | 'email' | 'name' | 'roles'> & { temporaryPassword: string }> }
export type AppSetting = { id: number; clave: string; valor: string; tipo: string; descripcion?: string; updatedAt?: string }

export type Paginated<T> = {
  data: T[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

export type LoginResponse = {
  preAuthToken?: string
  accessToken?: string
  tokenType?: 'Bearer'
  expiresIn?: number
  requiresRoleSelection: boolean
  activeRole?: Role
  roles: Role[]
  user: ApiUser
}

export type LoginLockout = { type: 'espera' | 'suspension24h'; retryAfterSeconds: number; attempts: number; canResetWithCode?: boolean }

const explicitApiUrl = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '') : null

class ApiError extends Error {
  status: number
  code: string
  lockout?: LoginLockout

  constructor(status: number, code: string, message: string, lockout?: LoginLockout) {
    super(message)
    this.status = status
    this.code = code
    this.lockout = lockout
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const candidateUrls: string[] = []
  if (explicitApiUrl) {
    candidateUrls.push(`${explicitApiUrl}${path}`)
  } else {
    // 1. Proxy relativo de Vite (evita CORS y bloqueos de red en el navegador)
    if (typeof window !== 'undefined' && window.location) {
      candidateUrls.push(`/api/v1${path}`)
    }
    // 2. Conexión directa a localhost
    candidateUrls.push(`http://localhost:3000/api/v1${path}`)
    // 3. Conexión directa a 127.0.0.1
    candidateUrls.push(`http://127.0.0.1:3000/api/v1${path}`)
  }

  let response: Response | null = null

  for (const targetUrl of candidateUrls) {
    try {
      const res = await fetch(targetUrl, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      })
      if ((res.status === 502 || res.status === 504) && candidateUrls.indexOf(targetUrl) < candidateUrls.length - 1) {
        continue
      }
      response = res
      break
    } catch {
      // Continuar al siguiente endpoint candidato
    }
  }

  if (!response) {
    throw new ApiError(
      0,
      'API_UNAVAILABLE',
      'No fue posible conectar con el servidor API de Acadex (puerto 3000). Verifica que la API y MariaDB (puerto 3306) estén en ejecución con "npm run dev" desde la raíz del proyecto.'
    )
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { code?: string; message?: string; details?: Array<{ path?: Array<string | number>; message?: string }>; type?: LoginLockout['type']; retryAfterSeconds?: number; attempts?: number; canResetWithCode?: boolean } | null
    const fieldNames: Record<string,string> = { name:'Nombre', roles:'Roles', code:'Código', document:'Documento', email:'Correo', phone:'Número de contacto', credits:'Créditos', capacity:'Capacidad', semester:'Semestre', programId:'Programa', facultyId:'Facultad', weeklyHours:'Horas semanales', subjectIds:'Asignatura', startDate:'Fecha inicial', endDate:'Fecha final', status:'Estado', location:'Ubicación', type:'Tipo' }
    const details = body?.details?.map((issue) => {
      const path = issue.path?.map((part) => fieldNames[String(part)] ?? String(part)).join(' → ')
      return path ? `${path}: ${issue.message ?? 'valor inválido'}` : issue.message
    }).filter(Boolean)
    const message = [body?.message ?? 'La solicitud no pudo ser procesada.', ...(details ?? [])].join(' ')
    const lockout = body?.type && body.retryAfterSeconds !== undefined && body.attempts !== undefined
      ? { type: body.type, retryAfterSeconds: body.retryAfterSeconds, attempts: body.attempts, canResetWithCode: body.canResetWithCode }
      : undefined
    throw new ApiError(response.status, body?.code ?? 'API_ERROR', message, lockout)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

async function requestFile(path:string,accessToken:string):Promise<Blob>{const targets=explicitApiUrl?[`${explicitApiUrl}${path}`]:[...(typeof window!=='undefined'&&window.location?['/api/v1'+path]:[]),`http://localhost:3000/api/v1${path}`,`http://127.0.0.1:3000/api/v1${path}`];let response:Response|null=null;for(const target of targets){try{response=await fetch(target,{headers:{Authorization:`Bearer ${accessToken}`}});if((response.status===502||response.status===504)&&targets.indexOf(target)<targets.length-1)continue;break}catch{}}if(!response)throw new ApiError(0,'API_UNAVAILABLE','No fue posible conectar con el servidor API de Acadex.');if(!response.ok){const body=await response.json().catch(()=>null) as {code?:string;message?:string}|null;throw new ApiError(response.status,body?.code??'API_ERROR',body?.message??'No se pudo descargar el adjunto.')}return response.blob()}

export function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export function requestPasswordChange(email: string, method: 'ayuda-admin' | 'codigo') {
  return request<{ requested: boolean; message: string }>('/auth/request-password-change', { method: 'POST', body: JSON.stringify({ email, method }) })
}

export function verifyLockoutPasswordCode(email: string, code: string) {
  return request<{ verified: boolean }>('/auth/verify-lockout-password-code', { method: 'POST', body: JSON.stringify({ email, code }) })
}

export function changeLockedOutPassword(input: { email: string; newPassword: string; confirmPassword: string }) {
  return request<{ changed: boolean }>('/auth/change-locked-out-password', { method: 'POST', body: JSON.stringify(input) })
}

export function requestAccountPasswordCode(accessToken: string) {
  return request<{ sent: boolean; message: string }>('/auth/account/password-code/request', authenticatedOptions(accessToken, { method: 'POST' }))
}

export function verifyAccountPasswordCode(accessToken: string, code: string) {
  return request<{ verified: boolean }>('/auth/account/password-code/verify', authenticatedOptions(accessToken, { method: 'POST', body: JSON.stringify({ code }) }))
}

export function changeAccountPasswordWithCode(accessToken: string, input: { newPassword: string; confirmPassword: string }) {
  return request<{ changed: boolean }>('/auth/account/password-code/change', authenticatedOptions(accessToken, { method: 'POST', body: JSON.stringify(input) }))
}

export function selectRole(preAuthToken: string, role: Role) {
  return request<LoginResponse>('/auth/select-role', { method: 'POST', body: JSON.stringify({ preAuthToken, role }) })
}

export function cancelRoleSelection(preAuthToken: string) {
  return request<void>('/auth/cancel-role-selection', { method: 'POST', body: JSON.stringify({ preAuthToken }) })
}

export function changeActiveRole(accessToken: string, role: Role) {
  return request<LoginResponse>('/auth/change-role', authenticatedOptions(accessToken, { method: 'POST', body: JSON.stringify({ role }) }))
}

export function getCurrentUser(accessToken: string) {
  return request<ApiUser>('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } })
}

export function logout(accessToken: string) {
  return request<void>('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } })
}

function authenticatedOptions(accessToken: string, options: RequestInit = {}): RequestInit {
  return { ...options, headers: { ...(options.headers ?? {}), Authorization: `Bearer ${accessToken}` } }
}

export function listUsers(accessToken: string) {
  return request<Paginated<ApiUser>>('/users?page=1&pageSize=100', authenticatedOptions(accessToken))
}

export function createUser(accessToken: string, input: { code: string; document: string; name: string; email: string; phone?: string | null; roles: Role[]; profiles: RoleProfiles }) {
  return request<ApiUser>('/users', authenticatedOptions(accessToken, { method: 'POST', body: JSON.stringify(input) }))
}

export function updateUser(accessToken: string, id: number, input: Partial<{ code: string; document: string; name: string; email: string; phone: string | null; roles: Role[]; status: 'Activo' | 'Inactivo'; profiles: RoleProfiles }>) {
  return request<ApiUser>(`/users/${id}`, authenticatedOptions(accessToken, { method: 'PATCH', body: JSON.stringify(input) }))
}

export function deleteUser(accessToken: string, id: number) {
  return request<void>(`/users/${id}`, authenticatedOptions(accessToken, { method: 'DELETE' }))
}

export function listSpaces(accessToken: string) {
  return request<ApiSpace[]>('/spaces', authenticatedOptions(accessToken))
}

export function createSpace(accessToken: string, input: { code: string; name: string; type: string; building?: string; block?: string; room?: string; floor?: string; location?: string; description?: string; resources?: string; observations?: string; capacity: number; status?: 'Activo' | 'Inactivo' }) {
  return request<ApiSpace>('/spaces', authenticatedOptions(accessToken, { method: 'POST', body: JSON.stringify(input) }))
}

export function updateSpace(accessToken: string, id: number, input: Partial<{ code: string; name: string; type: string; building: string; block: string; room: string; floor: string; location: string; description: string; resources: string; observations: string; capacity: number; status: 'Activo' | 'Inactivo' }>) {
  return request<ApiSpace>(`/spaces/${id}`, authenticatedOptions(accessToken, { method: 'PATCH', body: JSON.stringify(input) }))
}

export function deleteSpace(accessToken: string, id: number) {
  return request<void>(`/spaces/${id}`, authenticatedOptions(accessToken, { method: 'DELETE' }))
}

export function listRequests(accessToken: string) {
  return request<Paginated<ApiRequest>>('/requests?page=1&pageSize=100', authenticatedOptions(accessToken))
}

export function updateRequest(accessToken: string, id: number, status: ApiRequest['status']) {
  return request<ApiRequest>(`/requests/${id}`, authenticatedOptions(accessToken, { method: 'PATCH', body: JSON.stringify({ status }) }))
}

export function assignRequest(accessToken: string, id: number, assignment: RequestAssignmentInput) {
  return request<ApiRequest>(`/requests/${id}/assign`, authenticatedOptions(accessToken, { method: 'POST', body: JSON.stringify(assignment) }))
}

export function markAssignedRequestAttended(accessToken: string, id: number) {
  return request<ApiRequest>(`/requests/${id}/attendance`, authenticatedOptions(accessToken, { method: 'PATCH', body: JSON.stringify({ status: 'Atendida' }) }))
}

export function deleteRequest(accessToken: string, id: number) {
  return request<void>(`/requests/${id}`, authenticatedOptions(accessToken, { method: 'DELETE' }))
}

export function getAdminDashboard(accessToken: string) {
  return request<AdminDashboard>('/admin/dashboard', authenticatedOptions(accessToken))
}

export function getAdminReport(accessToken: string, query = '') {
  return request<AdminReport>(`/admin/reports${query ? `?${query}` : ''}`, authenticatedOptions(accessToken))
}

export function getAdminCatalogs(accessToken: string) {
  return request<AdminCatalogs>('/admin/catalogs', authenticatedOptions(accessToken))
}

export type AdminSubject = { id: number; code: string; name: string; credits: number | null; description: string | null; status: 'Activo' | 'Inactivo' }
export type AdminProgram = { id: number; code: string; name: string; snies: string | null; facultyId: number; facultyName: string; status: 'Activo' | 'Inactivo' }
export type AdminFaculty = { id: number; name: string; description?: string | null; status?: 'Activo' | 'Inactivo'; programCount?: number }
export function listAdminSubjects(accessToken: string) { return request<AdminSubject[]>('/admin/subjects', authenticatedOptions(accessToken)) }
export function createAdminSubject(accessToken: string, input: Omit<AdminSubject,'id'>) { return request<AdminSubject>('/admin/subjects', authenticatedOptions(accessToken,{method:'POST',body:JSON.stringify(input)})) }
export function updateAdminSubject(accessToken: string, id: number, input: Partial<Omit<AdminSubject,'id'>>) { return request<AdminSubject>(`/admin/subjects/${id}`, authenticatedOptions(accessToken,{method:'PATCH',body:JSON.stringify(input)})) }
export function deleteAdminSubject(accessToken: string, id: number) { return request<void>(`/admin/subjects/${id}`, authenticatedOptions(accessToken,{method:'DELETE'})) }
export function listAdminPrograms(accessToken: string) { return request<{data:AdminProgram[];faculties:AdminFaculty[]}>('/admin/programs', authenticatedOptions(accessToken)) }
export function listAdminFaculties(accessToken:string) { return request<AdminFaculty[]>('/admin/faculties',authenticatedOptions(accessToken)) }
export function createAdminProgram(accessToken: string, input: Omit<AdminProgram,'id'|'facultyName'>) { return request<AdminProgram>('/admin/programs', authenticatedOptions(accessToken,{method:'POST',body:JSON.stringify(input)})) }
export function createAdminFaculty(accessToken:string,input:{name:string;description:string}) { return request<AdminFaculty>('/admin/faculties',authenticatedOptions(accessToken,{method:'POST',body:JSON.stringify(input)})) }
export function updateAdminFaculty(accessToken:string,id:number,input:{name:string;description:string;status:'Activo'|'Inactivo'}) { return request<AdminFaculty>(`/admin/faculties/${id}`,authenticatedOptions(accessToken,{method:'PATCH',body:JSON.stringify(input)})) }
export function deleteAdminFaculty(accessToken:string,id:number) { return request<void>(`/admin/faculties/${id}`,authenticatedOptions(accessToken,{method:'DELETE'})) }
export function updateAdminProgram(accessToken: string, id: number, input: Partial<Omit<AdminProgram,'id'|'facultyName'>>) { return request<AdminProgram>(`/admin/programs/${id}`, authenticatedOptions(accessToken,{method:'PATCH',body:JSON.stringify(input)})) }
export function deleteAdminProgram(accessToken: string, id: number) { return request<void>(`/admin/programs/${id}`, authenticatedOptions(accessToken,{method:'DELETE'})) }

export function listCredentials(accessToken: string, role = '') {
  return request<CredentialAccount[]>(`/admin/configuration/credentials${role ? `?role=${encodeURIComponent(role)}` : ''}`, authenticatedOptions(accessToken))
}

export function listSuspendedAccounts(accessToken: string) {
  return request<SuspendedAccount[]>('/admin/configuration/suspended-accounts', authenticatedOptions(accessToken))
}

export function listPasswordChangeRequests(accessToken: string) {
  return request<PasswordChangeRequestHistory[]>('/admin/configuration/password-change-requests', authenticatedOptions(accessToken))
}

export function unlockSuspendedAccount(accessToken: string, id: number) {
  return request<{ unlocked: boolean }>(`/admin/configuration/suspended-accounts/${id}/unlock`, authenticatedOptions(accessToken, { method: 'POST' }))
}

export function resetCredential(accessToken: string, id: number) {
  return request<{ id: number; temporaryPassword: string }>(`/admin/configuration/credentials/${id}/reset`, authenticatedOptions(accessToken, { method: 'POST' }))
}

export function exportTemporaryCredentials(accessToken: string, role: Role) {
  return request<TemporaryCredentialExport>('/admin/configuration/credentials/export', authenticatedOptions(accessToken, { method: 'POST', body: JSON.stringify({ role }) }))
}

export function changePassword(accessToken: string, input: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  return request<{ changed: boolean }>('/admin/configuration/password', authenticatedOptions(accessToken, { method: 'PATCH', body: JSON.stringify(input) }))
}

export function listSettings(accessToken: string) {
  return request<AppSetting[]>('/admin/configuration/settings', authenticatedOptions(accessToken))
}

export function updateSettings(accessToken: string, settings: Array<{ key: string; value: string }>) {
  return request<AppSetting[]>('/admin/configuration/settings', authenticatedOptions(accessToken, { method: 'PATCH', body: JSON.stringify({ settings }) }))
}

export function createAdminRequest(accessToken: string, input: { studentId: number; programId: number; subjectId: number; type: 'Monitoría' | 'Tutoría' | 'Acompañamiento'; priority: 'Alta' | 'Media' | 'Baja'; motive: string; description: string; periodId?: number }) {
  return request<ApiRequest>('/requests', authenticatedOptions(accessToken, { method: 'POST', body: JSON.stringify(input) }))
}

export function createRequest(accessToken: string, input: { subjectId:number; type: 'Monitoría' | 'Tutoría' | 'Acompañamiento'; priority: 'Alta' | 'Media' | 'Baja'; motive:string; description:string; periodId:number }) {
  return request<ApiRequest>('/requests', authenticatedOptions(accessToken, { method: 'POST', body: JSON.stringify(input) }))
}

export type AcademicPeriod = { id: number; nombre: string; estado: 'Planeado' | 'Activo' | 'Finalizado'; startDate?: string; endDate?: string }

export type AcademicPeriodInput = { name: string; startDate: string; endDate: string; status?: AcademicPeriod['estado'] }

export function listPeriods(accessToken: string) {
  return request<AcademicPeriod[]>('/catalogs/periods', authenticatedOptions(accessToken))
}

export function listAdminPeriods(accessToken: string) {
  return request<AcademicPeriod[]>('/periods', authenticatedOptions(accessToken))
}

export function createAcademicPeriod(accessToken: string, input: AcademicPeriodInput) {
  return request<AcademicPeriod>('/periods', authenticatedOptions(accessToken, { method: 'POST', body: JSON.stringify(input) }))
}

export function updateAcademicPeriod(accessToken: string, id: number, input: Partial<AcademicPeriodInput>) {
  return request<AcademicPeriod>(`/periods/${id}`, authenticatedOptions(accessToken, { method: 'PATCH', body: JSON.stringify(input) }))
}

export function deleteAcademicPeriod(accessToken: string, id: number) {
  return request<void>(`/periods/${id}`, authenticatedOptions(accessToken, { method: 'DELETE' }))
}

export function listPortalSessions(accessToken: string) {
  return request<PortalSession[]>('/sessions', authenticatedOptions(accessToken))
}

export function listPortalAvailability(accessToken: string) {
  return request<PortalAvailability[]>('/availability', authenticatedOptions(accessToken))
}

export function getTutorDashboard(accessToken: string) { return request<TutorDashboardData>('/tutor/dashboard', authenticatedOptions(accessToken)) }
export function listTutorAssignments(accessToken: string) { return request<TutorAssignment[]>('/tutor/assignments', authenticatedOptions(accessToken)) }
export function createTutorAvailability(accessToken: string, input: { assignmentId?: number; day: string; startTime: string; endTime: string; modality: 'Presencial'|'Virtual' }) { return request<{id:number}>('/tutor/availability', authenticatedOptions(accessToken,{method:'POST',body:JSON.stringify(input)})) }
export function updateTutorAvailability(accessToken: string, id: number, input: { assignmentId?: number; day: string; startTime: string; endTime: string; modality: 'Presencial'|'Virtual' }) { return request<{id:number}>(`/tutor/availability/${id}`, authenticatedOptions(accessToken,{method:'PATCH',body:JSON.stringify(input)})) }
export function deleteTutorAvailability(accessToken: string,id:number) { return request<void>(`/tutor/availability/${id}`,authenticatedOptions(accessToken,{method:'DELETE'})) }
export function listTutorRecoveries(accessToken:string) { return request<TutorRecovery[]>('/tutor/recoveries',authenticatedOptions(accessToken)) }
export function listTutorRecoverableSessions(accessToken:string) { return request<TutorRecoverableSession[]>('/tutor/recoverable-sessions',authenticatedOptions(accessToken)) }
export function createTutorRecovery(accessToken:string,input:Omit<TutorRecovery,'id'|'status'|'subject'>) { return request<{id:number}>('/tutor/recoveries',authenticatedOptions(accessToken,{method:'POST',body:JSON.stringify(input)})) }
export function cancelTutorRecovery(accessToken:string,id:number) { return request<void>(`/tutor/recoveries/${id}`,authenticatedOptions(accessToken,{method:'DELETE'})) }
export function completeTutorRecovery(accessToken:string,id:number) { return request<void>(`/tutor/recoveries/${id}/complete`,authenticatedOptions(accessToken,{method:'POST'})) }
export function decideTutorRequest(accessToken:string,id:number,input:{action:'accept'|'cancel';reason?:string}) { return request<ApiRequest>(`/requests/${id}/decision`,authenticatedOptions(accessToken,{method:'POST',body:JSON.stringify(input)})) }
export function listTutorReportableSessions(accessToken:string) { return request<TutorReportableSession[]>('/tutor/reportable-sessions',authenticatedOptions(accessToken)) }
export function saveTutorReport(accessToken:string,input:Record<string,unknown>) { return request<{id:number;status:string}>('/tutor/reports',authenticatedOptions(accessToken,{method:'POST',body:JSON.stringify(input)})) }
export function submitTutorReport(accessToken:string,id:number) { return request<{id:number;status:string}>(`/tutor/reports/${id}/submit`,authenticatedOptions(accessToken,{method:'POST'})) }
export function getTutorReport(accessToken:string,id:number) { return request<TutorReportRecord>(`/tutor/reports/${id}`,authenticatedOptions(accessToken)) }
export function updateTutorReport(accessToken:string,id:number,input:Record<string,unknown>) { return request<{id:number;status:string}>(`/tutor/reports/${id}`,authenticatedOptions(accessToken,{method:'PATCH',body:JSON.stringify(input)})) }
export function deleteTutorReport(accessToken:string,id:number) { return request<{id:number;deleted:boolean}>(`/tutor/reports/${id}`,authenticatedOptions(accessToken,{method:'DELETE'})) }
export function downloadTutorReportAttachment(accessToken:string,reportId:number,attachmentId:number) { return requestFile(`/tutor/reports/${reportId}/attachments/${attachmentId}`,accessToken) }
export function getNotifications(accessToken:string) { return request<NotificationResponse>('/notifications',authenticatedOptions(accessToken)) }
export function markNotificationRead(accessToken:string,id:number) { return request<{read:boolean}>(`/notifications/${id}/read`,authenticatedOptions(accessToken,{method:'PATCH'})) }
export function markAllNotificationsRead(accessToken:string) { return request<{read:boolean}>('/notifications/read-all',authenticatedOptions(accessToken,{method:'POST'})) }
export function getMonthlyTutorReport(accessToken:string,month:string) { return request<MonthlyTutorReport>(`/tutor/monthly-report?month=${encodeURIComponent(month)}`,authenticatedOptions(accessToken)) }
export function saveMonthlyTutorReport(accessToken:string,input:{month:string;title:string;introduction:string;achievements:string;challenges:string;recommendations:string}) { return request<{id:number;status:string;updated:boolean}>('/tutor/monthly-report',authenticatedOptions(accessToken,{method:'PUT',body:JSON.stringify(input)})) }

export function listSubjects(accessToken: string) {
  return request<Array<{ id: number; codigo: string; nombre: string }>>('/catalogs/subjects', authenticatedOptions(accessToken))
}

export type DbStatus = {
  engine: string
  database: string
  host: string
  status: string
  totalTables: number
  tables: Record<string, { total: number; active?: number; pending?: number }>
  checkedAt: string
}

export function getDbStatus(accessToken: string) {
  return request<DbStatus>('/admin/db-status', authenticatedOptions(accessToken))
}

export { ApiError }

