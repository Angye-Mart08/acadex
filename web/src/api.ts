export type Role = 'Administrador' | 'Tutor' | 'Monitor' | 'Estudiante'

export type ApiUser = {
  id: number
  code: string
  name: string
  email: string
  roles: Role[]
  status: 'Activo' | 'Inactivo'
  initials: string
  activeRole?: Role
  document?: string
  profiles?: RoleProfiles
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
  type: 'Monitoría' | 'Tutoría'
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
}

export type PortalSession = {
  id: number
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
  day: string
  startTime: string
  endTime: string
  subject: string
  place: string
  modality: 'Presencial' | 'Virtual' | 'Híbrida'
  status: 'Activo' | 'Inactivo'
}

export type AdminCatalogs = {
  programs: Array<{ id: number; codigo: string; nombre: string; facultyName?: string }>
  subjects: Array<{ id: number; codigo: string; nombre: string }>
  periods: Array<{ id: number; nombre: string; estado: string }>
  students: Array<{ id: number; name: string; studentCode: string; programId?: number; programName?: string }>
  requestTypes: Array<{ id: number; nombre: string }>
}

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

export type CredentialAccount = { id: number; code: string; document: string; email: string; name: string; status: string; roles: Role[]; initialPassword: string }
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

const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '')

class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    })
  } catch {
    throw new ApiError(0, 'API_UNAVAILABLE', 'No fue posible conectar con el servidor. Verifica que la API esté ejecutándose.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { code?: string; message?: string } | null
    throw new ApiError(response.status, body?.code ?? 'API_ERROR', body?.message ?? 'La solicitud no pudo ser procesada.')
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function login(email: string, document: string) {
  return request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, document }) })
}

export function selectRole(preAuthToken: string, role: Role) {
  return request<LoginResponse>('/auth/select-role', { method: 'POST', body: JSON.stringify({ preAuthToken, role }) })
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

export function createUser(accessToken: string, input: { code: string; document: string; name: string; email: string; roles: Role[]; profiles: RoleProfiles }) {
  return request<ApiUser>('/users', authenticatedOptions(accessToken, { method: 'POST', body: JSON.stringify(input) }))
}

export function updateUser(accessToken: string, id: number, input: Partial<{ code: string; document: string; name: string; email: string; roles: Role[]; status: 'Activo' | 'Inactivo'; profiles: RoleProfiles }>) {
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

export function getAdminDashboard(accessToken: string) {
  return request<AdminDashboard>('/admin/dashboard', authenticatedOptions(accessToken))
}

export function getAdminReport(accessToken: string, query = '') {
  return request<AdminReport>(`/admin/reports${query ? `?${query}` : ''}`, authenticatedOptions(accessToken))
}

export function getAdminCatalogs(accessToken: string) {
  return request<AdminCatalogs>('/admin/catalogs', authenticatedOptions(accessToken))
}

export function listCredentials(accessToken: string, role = '') {
  return request<CredentialAccount[]>(`/admin/configuration/credentials${role ? `?role=${encodeURIComponent(role)}` : ''}`, authenticatedOptions(accessToken))
}

export function resetCredential(accessToken: string, id: number) {
  return request<{ id: number; initialPassword: string }>(`/admin/configuration/credentials/${id}/reset`, authenticatedOptions(accessToken, { method: 'POST' }))
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

export function createRequest(accessToken: string, input: { subject: string; type: 'Monitoría' | 'Tutoría'; priority: 'Alta' | 'Media' | 'Baja'; reason: string }) {
  return request<ApiRequest>('/requests', authenticatedOptions(accessToken, { method: 'POST', body: JSON.stringify(input) }))
}

export type AcademicPeriod = { id: number; nombre: string; estado: string }

export function listPeriods(accessToken: string) {
  return request<AcademicPeriod[]>('/catalogs/periods', authenticatedOptions(accessToken))
}

export function listPortalSessions(accessToken: string) {
  return request<PortalSession[]>('/sessions', authenticatedOptions(accessToken))
}

export function listPortalAvailability(accessToken: string) {
  return request<PortalAvailability[]>('/availability', authenticatedOptions(accessToken))
}

export function listSubjects(accessToken: string) {
  return request<Array<{ id: number; codigo: string; nombre: string }>>('/catalogs/subjects', authenticatedOptions(accessToken))
}

export { ApiError }
