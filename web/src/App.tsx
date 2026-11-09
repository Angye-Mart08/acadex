import { FormEvent, ReactNode, useEffect, useState } from 'react'
import {
  AcademicPeriod,
  AdminProgram,
  AdminRequestSlot,
  AdminSubject,
  AdminFaculty,
  AdminCatalogs,
  AdminDashboard,
  AdminReport,
  ApiError,
  CredentialAccount,
  LoginLockout,
  SuspendedAccount,
  DbStatus,
  NotificationItem,
  MonthlyTutorReport,
  PortalAvailability,
  PortalSession,
  TutorAssignment,
  TutorDashboardData,
  TutorRecovery,
  TutorRecoverableSession,
  TutorReportRecord,
  TutorReportableSession,
  RoleProfiles,
  assignRequest as assignRequestApi,
  changePassword,
  cancelTutorRecovery,
  cancelRoleSelection as cancelRoleSelectionApi,
  completeTutorRecovery,
  createTutorAvailability,
  createTutorRecovery,
  decideTutorRequest,
  deleteTutorAvailability,
  getTutorDashboard,
  getNotifications,
  getMonthlyTutorReport,
  saveMonthlyTutorReport,
  markNotificationRead,
  markAllNotificationsRead,
  listTutorAssignments,
  listTutorRecoveries,
  listTutorRecoverableSessions,
  listTutorReportableSessions,
  saveTutorReport as saveTutorReportApi,
  submitTutorReport as submitTutorReportApi,
  getTutorReport,
  updateTutorReport,
  deleteTutorReport,
  downloadTutorReportAttachment,
  updateTutorAvailability,
  unlockSuspendedAccount,
  createAcademicPeriod,
  createAdminProgram,
  createAdminFaculty,
  updateAdminFaculty,
  deleteAdminFaculty,
  createAdminSubject,
  createAdminRequest,
  createRequest as createRequestApi,
  createSpace as createSpaceApi,
  createUser as createUserApi,
  deleteRequest as deleteRequestApi,
  deleteAcademicPeriod,
  deleteAdminProgram,
  deleteAdminSubject,
  deleteSpace as deleteSpaceApi,
  deleteUser as deleteUserApi,
  exportTemporaryCredentials as exportTemporaryCredentialsApi,
  getAdminCatalogs,
  getAdminDashboard,
  getAdminReport,
  getCurrentUser,
  getDbStatus,
  listCredentials,
  listSuspendedAccounts,
  listAdminPeriods,
  listAdminPrograms,
  listAdminFaculties,
  listAdminRequestSlots,
  listAdminSubjects,
  listPeriods as listPeriodsApi,
  listPortalAvailability as listPortalAvailabilityApi,
  listPortalSessions as listPortalSessionsApi,
  listRequests as listRequestsApi,
  listSpaces as listSpacesApi,
  listSubjects as listSubjectsApi,
  listUsers as listUsersApi,
  markAssignedRequestAttended,
  login as loginApi,
  requestPasswordChange as requestPasswordChangeApi,
  resetAdminPassword as resetAdminPasswordApi,
  changeActiveRole as changeActiveRoleApi,
  logout as logoutApi,
  resetCredential,
  selectRole as selectRoleApi,
  updateRequest as updateRequestApi,
  updateAcademicPeriod,
  updateAdminProgram,
  updateAdminSubject,
  updateSpace as updateSpaceApi,
  updateUser as updateUserApi,
} from './api'
import { logNavigation } from './navigation-log'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarClock,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  Clock3,
  Database,
  Eye,
  EyeOff,
  LayoutDashboard,
  FileText,
  GraduationCap,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  Plus,
  Search,
  Settings2,
  Send,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  BarChart3,
  Bell,
  Download,
  FileDown,
  KeyRound,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'

function generateUserCode(roles: Role[], existingCodes: string[] = []): string {
  const prefix = roles.includes('Administrador')
    ? 'ADM'
    : roles.includes('Tutor')
      ? 'TUT'
      : roles.includes('Monitor')
        ? 'MON'
        : 'EST'
  let code = ''
  let attempts = 0
  do {
    const num = Math.floor(100 + Math.random() * 900)
    code = `${prefix}${num}`
    attempts++
  } while (existingCodes.includes(code) && attempts < 100)
  return code
}

type Notice = { id: number; message: string; kind: 'error' | 'success' | 'info' }
function NoticeHost() {
  const [notices, setNotices] = useState<Notice[]>([])
  useEffect(() => {
    const emit = (message: string) => {
      const kind: Notice['kind'] = /correctamente|fue eliminado|se descargó/i.test(message) ? 'success' : /^(Nueva solicitud estudiantil|Solicitud de acompañamiento|Acompañamiento asignado|Acompañamiento marcado|Tutoría confirmada|Tutoría cancelada|Actualización de solicitud|Nuevo reporte de tutoría):/i.test(message) ? 'info' : 'error'
      const id = Date.now() + Math.random()
      setNotices((items) => [...items.slice(-3), { id, message, kind }])
      window.setTimeout(() => setNotices((items) => items.filter((item) => item.id !== id)), kind === 'success' ? 5000 : 8000)
    }
    const originalAlert = window.alert.bind(window)
    const customAlert = (message?: unknown) => {
      const text = String(message ?? '')
      // Las claves temporales se mantienen en un diálogo explícito para evitar que desaparezcan como una notificación efímera.
      if (text.startsWith('Clave temporal de un solo uso:')) originalAlert(text)
      else emit(text)
    }
    window.alert = customAlert
    const listener = (event: Event) => emit(String((event as CustomEvent<string>).detail ?? ''))
    window.addEventListener('acadex:notice', listener)
    return () => { window.alert = originalAlert; window.removeEventListener('acadex:notice', listener) }
  }, [])
  return <div className="notice-stack" aria-live="polite" aria-relevant="additions removals">{notices.map((notice) => <div key={notice.id} className={`app-notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}><span className="notice-icon">{notice.kind === 'success' ? <Check size={18}/> : <CircleAlert size={18}/>}</span><p>{notice.message}</p><button type="button" aria-label="Cerrar aviso" onClick={()=>setNotices((items)=>items.filter((item)=>item.id!==notice.id))}><X size={17}/></button></div>)}</div>
}

function generateSpaceCode(type: string, existingCodes: string[] = []): string {
  const prefixes: Record<string, string> = {
    Aula: 'AUL',
    Laboratorio: 'LAB',
    Sala: 'SAL',
    'Sala de informática': 'INF',
    Biblioteca: 'BIB',
    'Salón de reuniones': 'REU',
    Virtual: 'VIR',
    Otro: 'ESP',
  }
  const prefix = prefixes[type] || 'ESP'
  let code = ''
  let attempts = 0
  do {
    const num = Math.floor(100 + Math.random() * 900)
    code = `${prefix}-${num}`
    attempts++
  } while (existingCodes.includes(code) && attempts < 100)
  return code
}

type Role = 'Administrador' | 'Tutor' | 'Monitor' | 'Estudiante'
function isValidUserRoleSet(roles: Role[]) {
  if (!roles.length || roles.length > 2) return false
  if (roles.includes('Administrador') || roles.includes('Tutor')) return roles.length === 1
  if (roles.includes('Monitor')) return roles.length === 1 || (roles.length === 2 && roles.includes('Estudiante'))
  return roles.length === 1 && roles[0] === 'Estudiante'
}
type PortalRole = Exclude<Role, 'Administrador'>
type View = 'dashboard' | 'usuarios' | 'asignaturas' | 'programas' | 'espacios' | 'solicitudes' | 'reportes' | 'configuracion'
type PortalView = 'inicio' | 'disponibilidad' | 'horarios' | 'solicitudes' | 'sesiones' | 'informes' | 'informe-mensual' | 'solicitar' | 'mis-solicitudes' | 'mis-sesiones' | 'configuracion'
type Status = 'Activo' | 'Inactivo'

type User = {
  id: number
  code: string
  name: string
  email: string
  document?: string
  phone?: string | null
  roles: Role[]
  status: Status
  initials: string
  profiles?: RoleProfiles
  mustChangePassword?: boolean
}

type Space = {
  id: number
  code: string
  name: string
  type: string
  location: string
  capacity: number
  status: Status
  building?: string
  block?: string
  room?: string
  floor?: string
  description?: string
  resources?: string
  observations?: string
}

type Request = {
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
  cancellationReason?: string | null
}

const accessTokenStorageKey = 'acadex:access-token'
const roleTokenStorageKey = 'acadex:role-token'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [accessToken, setAccessToken] = useState(() => window.sessionStorage.getItem(accessTokenStorageKey) ?? '')
  const [roleToken, setRoleToken] = useState(() => window.sessionStorage.getItem(accessTokenStorageKey) ? '' : window.sessionStorage.getItem(roleTokenStorageKey) ?? '')
  const [hydratingSession, setHydratingSession] = useState(true)
  const [sessionVersion, setSessionVersion] = useState(0)
  const [view, setView] = useState<View>('dashboard')
  const [portalView, setPortalView] = useState<PortalView>('inicio')
  const [loginError, setLoginError] = useState('')
  const [loginLockout, setLoginLockout] = useState<LoginLockout | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [spaces, setSpaces] = useState<Space[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [portalSessions, setPortalSessions] = useState<PortalSession[]>([])
  const [availability, setAvailability] = useState<PortalAvailability[]>([])
  const [subjects, setSubjects] = useState<Array<{ id: number; codigo: string; nombre: string }>>([])
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [adminCatalogs, setAdminCatalogs] = useState<AdminCatalogs | null>(null)
  const [dashboardData, setDashboardData] = useState<AdminDashboard | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState('')
  const activeView = selectedRole === 'Administrador' ? view : portalView

  useEffect(() => {
    // Retira JWT guardados por versiones anteriores en almacenamiento persistente.
    window.localStorage.removeItem(accessTokenStorageKey)
    window.localStorage.removeItem(roleTokenStorageKey)
    if (window.sessionStorage.getItem(accessTokenStorageKey)) window.sessionStorage.removeItem(roleTokenStorageKey)
  }, [])

  useEffect(() => {
    if (!authenticated || !selectedRole || currentUser?.mustChangePassword) return
    logNavigation(selectedRole, activeView)
  }, [authenticated, currentUser?.mustChangePassword, selectedRole, activeView])

  useEffect(() => {
    if (!accessToken) {
      setHydratingSession(false)
      return
    }
    getCurrentUser(accessToken)
      .then((user) => {
        setCurrentUser(user)
        setAuthenticated(true)
        setSelectedRole(user.activeRole ?? (user.roles.length === 1 ? user.roles[0] : null))
      })
      .catch(() => {
        window.sessionStorage.removeItem(accessTokenStorageKey)
        window.sessionStorage.removeItem(roleTokenStorageKey)
        setAccessToken('')
        setRoleToken('')
      })
      .finally(() => setHydratingSession(false))
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || !selectedRole || currentUser?.mustChangePassword) return
    let mounted = true
    setDataLoading(true)
    const loadData = async () => {
      try {
        const requestsResponse = await listRequestsApi(accessToken)
        if (!mounted) return
        setRequests(requestsResponse.data as Request[])
        setPeriods(await listPeriodsApi(accessToken).catch(() => []))
        if (!mounted) return
        if (selectedRole === 'Estudiante') {
          const subjectsResponse = await listSubjectsApi(accessToken)
          if (!mounted) return
          setSubjects(subjectsResponse)
        }
        if (selectedRole === 'Tutor' || selectedRole === 'Monitor' || selectedRole === 'Estudiante') {
          const [sessionsResponse, availabilityResponse] = await Promise.all([
            listPortalSessionsApi(accessToken),
            listPortalAvailabilityApi(accessToken),
          ])
          if (!mounted) return
          setPortalSessions(sessionsResponse)
          setAvailability(availabilityResponse)
        }
        if (selectedRole === 'Administrador') {
          const [usersResponse, spacesResponse, dashboardResponse, catalogsResponse] = await Promise.all([listUsersApi(accessToken), listSpacesApi(accessToken), getAdminDashboard(accessToken), getAdminCatalogs(accessToken)])
          if (!mounted) return
          setUsers(usersResponse.data as User[])
          setSpaces(spacesResponse as Space[])
          setDashboardData(dashboardResponse)
          setAdminCatalogs(catalogsResponse)
        }
        setDataError('')
      } catch (error) {
        if (mounted) setDataError(error instanceof ApiError ? error.message : 'No fue posible cargar los datos de MariaDB.')
      } finally {
        if (mounted) setDataLoading(false)
      }
    }
    void loadData()
    return () => { mounted = false }
  }, [accessToken, selectedRole, sessionVersion, currentUser?.mustChangePassword])
  const currentPeriod = periods.find((period) => period.estado === 'Activo')?.nombre ?? 'No disponible'

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim().toLowerCase()
    const password = String(form.get('password') ?? '')
    try {
      const response = await loginApi(email, password)
      setLoginLockout(null)
      setCurrentUser(response.user)
      setAuthenticated(true)
      setRoleToken(response.preAuthToken ?? '')
      if (response.preAuthToken) window.sessionStorage.setItem(roleTokenStorageKey, response.preAuthToken)
      else window.sessionStorage.removeItem(roleTokenStorageKey)
      setSelectedRole(response.activeRole ?? null)
      if (response.accessToken) {
        setAccessToken(response.accessToken)
        window.sessionStorage.setItem(accessTokenStorageKey, response.accessToken)
      }
      setLoginError('')
    } catch (error) {
      if (error instanceof ApiError && error.lockout) setLoginLockout(error.lockout)
      setLoginError(error instanceof ApiError ? error.message : 'No fue posible iniciar sesión.')
    }
  }

  const handlePasswordChangeRequest = async (email: string) => {
    const response = await requestPasswordChangeApi(email)
    return response.message
  }

  const handleAdminPasswordReset = async (input: { email: string; code: string; newPassword: string; confirmPassword: string }) => {
    await resetAdminPasswordApi(input)
  }

  const handleRoleSelect = async (role: Role) => {
    if (!roleToken && !accessToken) {
      setLoginError('La selección de rol expiró. Inicia sesión nuevamente.')
      return
    }
    try {
      const response = roleToken
        ? await selectRoleApi(roleToken, role)
        : await changeActiveRoleApi(accessToken, role)
      if (!response.accessToken) throw new Error('La API no devolvió el token de acceso.')
      setCurrentUser(response.user)
      setSelectedRole(response.activeRole ?? role)
      setAccessToken(response.accessToken)
      setRoleToken('')
      window.sessionStorage.removeItem(roleTokenStorageKey)
      window.sessionStorage.setItem(accessTokenStorageKey, response.accessToken)
      setLoginError('')
    } catch (error) {
      setLoginError(error instanceof ApiError ? error.message : 'No fue posible seleccionar el rol.')
    }
  }

  const logout = async () => {
    try {
      if (accessToken) await logoutApi(accessToken)
      else if (roleToken) await cancelRoleSelectionApi(roleToken)
    } catch {
      // La interfaz siempre debe permitir salir; si la API no está disponible,
      // el token local se elimina y expirará según su TTL.
    } finally {
      setAuthenticated(false)
      setCurrentUser(null)
      setSelectedRole(null)
      setAccessToken('')
      setPeriods([])
      setPortalSessions([])
      setAvailability([])
      setRoleToken('')
      window.sessionStorage.removeItem(accessTokenStorageKey)
      window.sessionStorage.removeItem(roleTokenStorageKey)
      setView('dashboard')
      setPortalView('inicio')
    }
  }

  if (hydratingSession) return <><div className="session-loading">Validando sesión...</div><NoticeHost /></>
  if (!authenticated || !currentUser) return <><LoginPage onSubmit={handleLogin} error={loginError} lockout={loginLockout} onEmailChange={() => { setLoginError(''); setLoginLockout(null) }} onRequestPasswordChange={handlePasswordChangeRequest} onAdminPasswordReset={handleAdminPasswordReset} /><NoticeHost /></>

  if (!selectedRole) return <><RoleSelector user={currentUser} onSelect={(role) => { void handleRoleSelect(role); setPortalView('inicio') }} onLogout={logout} error={loginError} /><NoticeHost /></>

  if (currentUser.mustChangePassword) return <><FirstPasswordChange accessToken={accessToken} onLogout={logout} onComplete={(user) => { setCurrentUser(user); setSessionVersion((version) => version + 1) }} /><NoticeHost /></>

  if (selectedRole !== 'Administrador') {
    return <><RoleShell user={currentUser} activeRole={selectedRole} periodName={currentPeriod} periods={periods} view={portalView} onNavigate={setPortalView} onLogout={logout} onChangeRole={() => { setSelectedRole(null); setPortalView('inicio') }} accessToken={accessToken} requests={requests} subjects={subjects} sessions={portalSessions} availability={availability} onSessionsChange={setPortalSessions} dataError={dataError} dataLoading={dataLoading} onRequestsChange={setRequests} /><NoticeHost /></>
  }

  return (
    <><AdminShell
      user={currentUser}
      periodName={currentPeriod}
      periods={periods}
      activeRole={selectedRole}
      view={view}
      onNavigate={(nextView) => {
        setView(nextView)
        setMobileNav(false)
      }}
      onLogout={logout}
      onChangeRole={() => { setSelectedRole(null); setView('dashboard') }}
      accessToken={accessToken}
      mobileNav={mobileNav}
      onToggleMobileNav={() => setMobileNav((current) => !current)}
    >
      {dataError && <div className="error-message">{dataError}</div>}
      {dataLoading && <div className="data-loading">Actualizando datos desde MariaDB...</div>}
      {view === 'dashboard' && <Dashboard users={users} spaces={spaces} requests={requests} data={dashboardData} onNavigate={setView} />}
      {view === 'usuarios' && <UsersView users={users} accessToken={accessToken} catalogs={adminCatalogs} onChange={setUsers} />}
      {view === 'asignaturas' && <AcademicCatalogView kind="subjects" accessToken={accessToken} catalogs={adminCatalogs} onCatalogsChange={setAdminCatalogs} />}
      {view === 'programas' && <AcademicCatalogView kind="programs" accessToken={accessToken} catalogs={adminCatalogs} onCatalogsChange={setAdminCatalogs} />}
      {view === 'espacios' && <SpacesView spaces={spaces} accessToken={accessToken} onChange={setSpaces} />}
      {view === 'solicitudes' && <RequestsView requests={requests} accessToken={accessToken} catalogs={adminCatalogs} onChange={setRequests} />}
      {view === 'reportes' && <ReportsView accessToken={accessToken} catalogs={adminCatalogs} />}
      {view === 'configuracion' && <ConfigurationView accessToken={accessToken} currentUser={currentUser} />}
    </AdminShell><NoticeHost /></>
  )
}

function AcadexBrand({ light = false, compact = false, className = '' }: { light?: boolean; compact?: boolean; className?: string }) {
  return <div className={`acadex-brand ${light ? 'light' : ''} ${compact ? 'compact' : ''} ${className}`}><span className="acadex-symbol"><GraduationCap size={32} strokeWidth={2.25} /></span><span className="acadex-wordmark"><strong>Acadex</strong><small>Monitorías y Tutorías</small></span></div>
}

function UniversitySignature({ onGreen = false }: { onGreen?: boolean }) {
  return <div className={`university-signature ${onGreen ? 'on-green' : ''}`}><img src={onGreen ? '/marca/unitropico-logotipo-oscuro.png' : '/marca/unitropico-logotipo.png'} alt="Unitrópico · Universidad Internacional del Trópico Americano" /></div>
}

function FirstPasswordChange({ accessToken, onLogout, onComplete }: { accessToken: string; onLogout: () => void; onComplete: (user: User) => void }) {
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await changePassword(accessToken, passwords)
      const user = await getCurrentUser(accessToken)
      onComplete(user as User)
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : 'No fue posible cambiar la contraseña.')
    } finally {
      setSaving(false)
    }
  }
  return <div className="role-selector-backdrop"><section className="role-selector-card" role="dialog" aria-modal="true" aria-labelledby="first-password-title"><div className="role-selector-header"><div><span className="eyebrow">Actualización de seguridad</span><h2 id="first-password-title">Crea tu contraseña personal</h2><p>Este acceso usa una clave temporal. Cámbiala antes de continuar.</p></div></div><form className="portal-form" onSubmit={submit}><label>Contraseña temporal o actual<input type="password" required autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label><label>Nueva contraseña<input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label><label>Confirmar nueva contraseña<input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} /></label>{error && <div className="form-error"><CircleAlert size={16} />{error}</div>}<div className="role-selector-actions"><button type="button" className="secondary-button" onClick={onLogout}>Cerrar sesión</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando...' : 'Guardar contraseña'} <ArrowRight size={17} /></button></div></form></section></div>
}

function LoginPage({ onSubmit, error, lockout, onEmailChange, onRequestPasswordChange, onAdminPasswordReset }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; error: string; lockout: LoginLockout | null; onEmailChange: () => void; onRequestPasswordChange: (email: string) => Promise<string>; onAdminPasswordReset: (input: { email: string; code: string; newPassword: string; confirmPassword: string }) => Promise<void> }) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(() => window.localStorage.getItem('acadex:remembered-email') ?? '')
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(window.localStorage.getItem('acadex:remembered-email')))
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [requestingChange, setRequestingChange] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [resetCodeRequested, setResetCodeRequested] = useState(false)
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    setRemainingSeconds(lockout?.retryAfterSeconds ?? 0)
    if (!lockout?.retryAfterSeconds) return
    const timer = window.setInterval(() => setRemainingSeconds((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [lockout?.retryAfterSeconds, lockout?.type, lockout?.attempts])

  const formatRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const rest = seconds % 60
    return [hours, minutes, rest].map((value) => String(value).padStart(2, '0')).join(':')
  }

  const requestPasswordHelp = async () => {
    setRequestingChange(true)
    setRequestMessage('')
    setResetError('')
    try {
      const message = await onRequestPasswordChange(email)
      if (lockout?.canResetWithCode) {
        setResetCodeRequested(true)
        setRequestMessage('Si la cuenta cumple los requisitos, enviamos un código al correo institucional registrado. Revisa tu bandeja de entrada.')
      } else setRequestMessage(message)
    } catch (error) { setRequestMessage(error instanceof ApiError ? error.message : 'No fue posible enviar la solicitud.') }
    finally { setRequestingChange(false) }
  }

  const submitPasswordReset = async () => {
    setResetError('')
    if (!/^\d{6}$/.test(resetCode)) { setResetError('Escribe el código de seis dígitos que recibiste.'); return }
    if (newPassword.length < 8) { setResetError('La nueva contraseña debe tener al menos 8 caracteres.'); return }
    if (newPassword !== confirmNewPassword) { setResetError('La nueva contraseña y su confirmación no coinciden.'); return }
    setRequestingChange(true)
    try {
      await onAdminPasswordReset({ email, code: resetCode, newPassword, confirmPassword: confirmNewPassword })
      setRequestMessage('Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.')
      setResetCodeRequested(false)
      setResetCode('')
      setNewPassword('')
      setConfirmNewPassword('')
      setRemainingSeconds(0)
    } catch (error) { setResetError(error instanceof ApiError ? error.message : 'No fue posible cambiar la contraseña.') }
    finally { setRequestingChange(false) }
  }

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    const submittedEmail = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    if (rememberEmail && submittedEmail) window.localStorage.setItem('acadex:remembered-email', submittedEmail)
    else window.localStorage.removeItem('acadex:remembered-email')
    onSubmit(event)
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="hero-brand-row"><AcadexBrand light /><UniversitySignature onGreen /></div>
        <div className="hero-copy">
          <span className="eyebrow">Acompañamiento que impulsa tu futuro</span>
          <h1>Conocimiento que te acompaña.</h1>
          <p>Un espacio para conectar estudiantes, tutores y monitores, fortaleciendo el aprendizaje y el desarrollo académico en Unitrópico.</p>
          <div className="hero-benefits">
            <div><span><UsersRound size={19} /></span><p><strong>Aprende</strong><small>Con el apoyo de tutores y monitores.</small></p></div>
            <div><span><Activity size={19} /></span><p><strong>Crece</strong><small>Avanza en tu desarrollo académico.</small></p></div>
            <div><span><BookOpen size={19} /></span><p><strong>Comparte</strong><small>Construye una comunidad universitaria.</small></p></div>
          </div>
        </div>
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-footer"><span>Educación para un territorio posible</span></div>
      </section>

      <section className="login-panel">
        <div className="login-panel-inner">
          <div className="login-heading">
            <span className="eyebrow">Acceso institucional</span>
            <h2>Bienvenido a Acadex</h2>
            <p>Sistema de Gestión de Monitorías y Tutorías Académicas.</p>
          </div>
          <form className="login-form" onSubmit={submitLogin}>
            <label>Correo institucional<div className="login-input"><Mail size={18} /><input name="email" type="email" pattern=".+@unitropico[.]edu[.]co" title="Usa tu correo institucional @unitropico.edu.co." placeholder="nombre@unitropico.edu.co" autoComplete="username" value={email} onChange={(event) => { setEmail(event.target.value); onEmailChange(); setRequestMessage(''); setResetCodeRequested(false); setResetCode('') }} required /></div></label>
            <label>Contraseña<div className="password-field login-input"><LockKeyhole size={18} /><input name="password" type={showPassword ? 'text' : 'password'} placeholder="Ingresa tu contraseña" autoComplete="current-password" minLength={1} maxLength={72} required /><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            <div className="form-row"><label className="check-label"><input type="checkbox" checked={rememberEmail} onChange={(event) => setRememberEmail(event.target.checked)} /> <span>Recordarme</span></label></div>
            {error && !(lockout && remainingSeconds === 0) && <div className="form-error"><CircleAlert size={16} />{error}</div>}
            {lockout && <div className="login-lockout-notice" role="status"><strong>{lockout.type === 'suspension24h' ? 'Cuenta suspendida temporalmente' : 'Pausa de seguridad'}</strong><span>{remainingSeconds > 0 ? `Podrás volver a intentar en ${formatRemaining(remainingSeconds)}.` : 'Ya puedes volver a intentar iniciar sesión.'}</span>{lockout.type === 'suspension24h' && remainingSeconds > 0 && <button className="secondary-button" type="button" onClick={() => void requestPasswordHelp()} disabled={requestingChange || !/.+@unitropico\.edu\.co$/i.test(email)}>{requestingChange ? 'Enviando...' : lockout.canResetWithCode ? 'Enviar código para cambiar mi contraseña' : 'Notificar al administrador para cambiar mi contraseña'}</button>}{requestMessage && <small>{requestMessage}</small>}{resetCodeRequested && lockout.canResetWithCode && <div className="admin-reset-code-form"><label>Código de 6 dígitos<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={resetCode} onChange={(event) => setResetCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" /></label><label>Nueva contraseña<input type="password" autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><label>Confirmar nueva contraseña<input type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} /></label>{resetError && <small className="admin-reset-error" role="alert">{resetError}</small>}<button className="primary-button" type="button" disabled={requestingChange} onClick={() => void submitPasswordReset()}>{requestingChange ? 'Actualizando...' : 'Verificar código y cambiar contraseña'}</button></div>}</div>}
            <button className="primary-button login-button" type="submit" disabled={lockout?.type === 'espera' && remainingSeconds > 0}>Iniciar sesión <ArrowRight size={18} /></button>
          </form>
          <p className="login-note">Al continuar, accederás con tus credenciales institucionales.</p>
          <div className="login-footer-quote">“Juntos construimos más oportunidades”</div>
        </div>
      </section>
    </main>
  )
}

function RoleSelector({ user, onSelect, onLogout, error }: { user: User; onSelect: (role: Role) => void; onLogout: () => void; error: string }) {
  const [role, setRole] = useState<Role>(user.roles[0])
  const descriptions: Record<Role, string> = {
    Administrador: 'Gestiona usuarios, espacios y solicitudes.',
    Tutor: 'Administra tu disponibilidad, sesiones e informes.',
    Monitor: 'Consulta horarios y atiende monitorías asignadas.',
    Estudiante: 'Solicita acompañamiento y revisa tus sesiones.',
  }
  const icons: Record<Role, ReactNode> = {
    Administrador: <ShieldCheck size={22} />,
    Tutor: <GraduationCap size={22} />,
    Monitor: <BookOpen size={22} />,
    Estudiante: <UserRound size={22} />,
  }

  return <div className="role-selector-backdrop"><section className="role-selector-card" role="dialog" aria-modal="true" aria-labelledby="role-selector-title"><div className="role-selector-header"><div><span className="eyebrow">Acceso institucional</span><h2 id="role-selector-title">¿Con qué rol deseas ingresar?</h2><p>{user.name}, selecciona el espacio que quieres utilizar en esta sesión.</p></div></div><div className="role-selector-grid">{user.roles.map((availableRole) => <button key={availableRole} className={`role-card ${role === availableRole ? 'selected' : ''}`} onClick={() => setRole(availableRole)}><span className="role-card-icon">{icons[availableRole]}</span><span><strong>{availableRole}</strong><small>{descriptions[availableRole]}</small></span>{role === availableRole && <Check size={18} />}</button>)}</div>{error && <div className="form-error"><CircleAlert size={16} />{error}</div>}<div className="role-selector-actions"><button className="secondary-button" onClick={onLogout}>Cerrar sesión</button><button className="primary-button" onClick={() => onSelect(role)}>Continuar <ArrowRight size={17} /></button></div></section></div>
}

function AdminShell({ user, activeRole, periodName, periods, children, view, onNavigate, onLogout, onChangeRole, accessToken, mobileNav, onToggleMobileNav }: { user: User; activeRole: Role; periodName: string; periods: AcademicPeriod[]; children: ReactNode; view: View; onNavigate: (view: View) => void; onLogout: () => void; onChangeRole: () => void; accessToken: string; mobileNav: boolean; onToggleMobileNav: () => void }) {
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const navItems: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'dashboard', label: 'Resumen general', icon: <LayoutDashboard size={19} /> },
    { id: 'usuarios', label: 'Gestión de usuarios', icon: <UsersRound size={19} /> },
    { id: 'asignaturas', label: 'Gestión de asignaturas', icon: <BookOpen size={19} /> },
    { id: 'programas', label: 'Programas académicos', icon: <GraduationCap size={19} /> },
    { id: 'espacios', label: 'Gestión de espacios', icon: <Building2 size={19} /> },
    { id: 'solicitudes', label: 'Gestión de solicitudes', icon: <CalendarDays size={19} /> },
    { id: 'reportes', label: 'Reportes', icon: <BarChart3 size={19} /> },
    { id: 'configuracion', label: 'Configuración', icon: <SlidersHorizontal size={19} /> },
  ]
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <AcadexBrand className="sidebar-brand" />
          <button className="sidebar-close" onClick={onToggleMobileNav}><X size={18} /></button>
          <div className="workspace-card"><div className="workspace-icon"><Settings2 size={16} /></div><div><span>Espacio de trabajo</span><strong>Administración</strong></div></div>
          <nav className="main-nav"><span className="nav-label">MENÚ PRINCIPAL</span>{navItems.map((item) => <button key={item.id} className={view === item.id ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>
        </div>
        <div className="sidebar-bottom"><UniversitySignature onGreen /><a className="help-card" href="mailto:soporte.tutorias@unitropico.edu.co?subject=Soporte%20Acadex"><Mail size={17} /><div><strong>¿Necesitas ayuda?</strong><span>Contactar soporte</span></div><ArrowRight size={15} /></a></div>
      </aside>
      {mobileNav && <button className="mobile-overlay" aria-label="Cerrar menú" onClick={onToggleMobileNav} />}
      <div className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={onToggleMobileNav} aria-label="Abrir menú"><Menu size={22} /></button>
          <div className="breadcrumb"><span>Administración</span><span>/</span><strong>{navItems.find((item) => item.id === view)?.label ?? 'Resumen general'}</strong></div>
          <div className="topbar-actions">
            <button
              type="button"
              className="period-chip interactive"
              onClick={() => setPeriodModalOpen(true)}
              title="Haz clic para ver detalles del periodo académico y calendario"
            >
              <span className="status-dot active" />
              <span>Periodo {periodName}</span>
            </button>
            <NotificationCenter accessToken={accessToken} activeRole={activeRole} onNavigate={onNavigate} />
            {user.roles.length > 1 && <button className="role-switcher" onClick={onChangeRole}><UsersRound size={15} /> Cambiar rol</button>}
            <button className="mobile-logout-button" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout}><LogOut size={17} /><span>Cerrar sesión</span></button>
            <ProfileMenu user={user} activeRole={activeRole} onLogout={onLogout} />
          </div>
        </header>
        <main className="page-content">{children}</main>
        {periodModalOpen && <PeriodModal periodName={periodName} periods={periods} onClose={() => setPeriodModalOpen(false)} />}
      </div>
    </div>
  )
}

function ProfileMenu({ user, activeRole, onLogout }: { user: User; activeRole: Role; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  return <div className={`profile profile-menu ${open ? 'menu-open' : ''}`}><button className="profile-trigger" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span className="avatar"><img src="/marca/avatar-default.svg" alt="" /></span><span className="profile-details"><strong>{user.name}</strong><span>{activeRole}</span></span><ChevronDown size={16} /></button>{open && <div className="profile-dropdown" role="menu"><button type="button" role="menuitem" onClick={onLogout}><LogOut size={17} />Cerrar sesión</button></div>}</div>
}

function RoleShell({ user, activeRole, periodName, periods, view, onNavigate, onLogout, onChangeRole, accessToken, requests, subjects, sessions, availability, onSessionsChange, dataError, dataLoading, onRequestsChange }: { user: User; activeRole: PortalRole; periodName: string; periods: AcademicPeriod[]; view: PortalView; onNavigate: (view: PortalView) => void; onLogout: () => void; onChangeRole: () => void; accessToken: string; requests: Request[]; subjects: Array<{ id: number; codigo: string; nombre: string }>; sessions: PortalSession[]; availability: PortalAvailability[]; onSessionsChange: (sessions: PortalSession[]) => void; dataError: string; dataLoading: boolean; onRequestsChange: (requests: Request[]) => void }) {
  const [mobileNav, setMobileNav] = useState(false)
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const navByRole: Record<PortalRole, { id: PortalView; label: string; icon: ReactNode }[]> = {
    Tutor: [
      { id: 'inicio', label: 'Mi resumen', icon: <LayoutDashboard size={19} /> },
      { id: 'disponibilidad', label: 'Horario', icon: <CalendarClock size={19} /> },
      { id: 'solicitudes', label: 'Solicitudes', icon: <ClipboardIcon /> },
      { id: 'sesiones', label: 'Mis sesiones', icon: <CalendarDays size={19} /> },
      { id: 'informes', label: 'Reportes', icon: <FileText size={19} /> },
      { id: 'informe-mensual', label: 'Informe mensual', icon: <CalendarDays size={19} /> },
      { id: 'configuracion', label: 'Configuración', icon: <Settings2 size={19} /> },
    ],
    Monitor: [
      { id: 'inicio', label: 'Mi resumen', icon: <LayoutDashboard size={19} /> },
      { id: 'horarios', label: 'Mis horarios', icon: <CalendarClock size={19} /> },
      { id: 'solicitudes', label: 'Solicitudes asignadas', icon: <ClipboardIcon /> },
      { id: 'sesiones', label: 'Mis sesiones', icon: <CalendarDays size={19} /> },
    ],
    Estudiante: [
      { id: 'inicio', label: 'Mi resumen', icon: <LayoutDashboard size={19} /> },
      { id: 'solicitar', label: 'Solicitar acompañamiento', icon: <Send size={19} /> },
      { id: 'mis-solicitudes', label: 'Mis solicitudes', icon: <ClipboardIcon /> },
      { id: 'mis-sesiones', label: 'Mis sesiones', icon: <CalendarDays size={19} /> },
    ],
  }
  const portalRole = activeRole
  const navItems = navByRole[portalRole]
  const go = (nextView: PortalView) => { onNavigate(nextView); setMobileNav(false) }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <div className="sidebar-top">
        <AcadexBrand className="sidebar-brand" />
        <button className="sidebar-close" onClick={() => setMobileNav(false)}><X size={18} /></button>
        <div className="workspace-card"><div className="workspace-icon"><GraduationCap size={16} /></div><div><span>Portal personal</span><strong>{activeRole}</strong></div></div>
        <nav className="main-nav"><span className="nav-label">MI ESPACIO</span>{navItems.map((item) => <button key={item.id} className={view === item.id ? 'nav-item active' : 'nav-item'} onClick={() => go(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>
      </div>
      <div className="sidebar-bottom"><UniversitySignature onGreen /><a className="help-card" href="mailto:soporte.tutorias@unitropico.edu.co?subject=Soporte%20Acadex"><Mail size={17} /><div><strong>¿Necesitas ayuda?</strong><span>Contactar soporte</span></div><ArrowRight size={15} /></a></div>
    </aside>
    {mobileNav && <button className="mobile-overlay" aria-label="Cerrar menú" onClick={() => setMobileNav(false)} />}
    <div className="main-area">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={22} /></button>
        <div className="breadcrumb"><span>{activeRole}</span><span>/</span><strong>{navItems.find((item) => item.id === view)?.label ?? 'Mi resumen'}</strong></div>
        <div className="topbar-actions">
          <button
            type="button"
            className="period-chip interactive"
            onClick={() => setPeriodModalOpen(true)}
            title="Haz clic para ver detalles del periodo académico y calendario"
          >
            <span className="status-dot active" />
            <span>Periodo {periodName}</span>
          </button>
          <NotificationCenter accessToken={accessToken} activeRole={activeRole} onNavigate={onNavigate} />
          {user.roles.length > 1 && <button className="role-switcher" onClick={onChangeRole}><UsersRound size={15} /> Cambiar rol</button>}
          <button className="mobile-logout-button" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout}><LogOut size={17} /><span>Cerrar sesión</span></button>
          <ProfileMenu user={user} activeRole={activeRole} onLogout={onLogout} />
        </div>
      </header>
      <main className="page-content">
        {dataError && <div className="error-message">{dataError}</div>}
        {dataLoading && <div className="data-loading">Actualizando datos desde MariaDB...</div>}
        {activeRole === 'Tutor' && <><TutorReportReminder accessToken={accessToken}/><MonthlyReportReminder accessToken={accessToken} onNavigate={go}/></>}
        {view === 'inicio' && (activeRole === 'Tutor' ? <TutorHome user={user} periodName={periodName} accessToken={accessToken} /> : <PortalHome user={user} activeRole={activeRole} periodName={periodName} requests={requests} onNavigate={go} />)}
        {view === 'disponibilidad' && <AvailabilityView periodName={periodName} availability={availability} accessToken={accessToken} />}
        {view === 'horarios' && <ScheduleView user={user} periodName={periodName} availability={availability} />}
        {(view === 'sesiones' || view === 'mis-sesiones') && <PortalSessions sessions={sessions} activeRole={activeRole} periodName={periodName} accessToken={accessToken} onChange={onSessionsChange} />}
        {view === 'solicitar' && <StudentRequestForm accessToken={accessToken} subjects={subjects} user={user} requests={requests} onChange={onRequestsChange} />}
        {view === 'mis-solicitudes' && <MyRequests requests={requests} />}
        {view === 'solicitudes' && <AssignedRequests accessToken={accessToken} activeRole={activeRole} requests={requests} onChange={onRequestsChange} />}
        {view === 'informes' && activeRole === 'Tutor' && <TutorReports accessToken={accessToken} sessions={sessions} />}
        {view === 'informe-mensual' && activeRole === 'Tutor' && <MonthlyTutorReportView accessToken={accessToken} />}
        {view === 'configuracion' && activeRole === 'Tutor' && <TutorConfiguration accessToken={accessToken} />}
      </main>
      {periodModalOpen && <PeriodModal periodName={periodName} periods={periods} onClose={() => setPeriodModalOpen(false)} />}
    </div>
  </div>
}

function NotificationCenter({accessToken,activeRole,onNavigate}:{accessToken:string;activeRole:Role;onNavigate:(view:any)=>void}) {
  const [items,setItems]=useState<NotificationItem[]>([]);const [unread,setUnread]=useState(0);const [open,setOpen]=useState(false)
  useEffect(()=>{let active=true;let initialized=false;let known=new Set<number>();const refresh=async()=>{try{const response=await getNotifications(accessToken);if(!active)return;const incoming=response.items;if(initialized){incoming.filter(item=>!known.has(item.id)&&!item.read).slice(0,3).forEach(item=>window.dispatchEvent(new CustomEvent('acadex:notice',{detail:`${item.title}: ${item.message}`})))}known=new Set(incoming.map(item=>item.id));initialized=true;setItems(incoming);setUnread(response.unread)}catch{/* La bandeja volverá a consultar en el siguiente intervalo. */}};void refresh();const timer=window.setInterval(()=>void refresh(),30000);return()=>{active=false;window.clearInterval(timer)}},[accessToken])
  const openItem=async(item:NotificationItem)=>{try{if(!item.read){await markNotificationRead(accessToken,item.id);setItems(current=>current.map(row=>row.id===item.id?{...row,read:true}:row));setUnread(value=>Math.max(0,value-1))}}catch{/* El refresco periódico sincroniza el estado. */}setOpen(false);if(activeRole==='Administrador')onNavigate(item.category==='Informe'?'reportes':'solicitudes');else if(activeRole==='Tutor')onNavigate(item.category==='Informe'?'informes':item.category==='Sesion'?'sesiones':'solicitudes');else if(activeRole==='Estudiante')onNavigate(item.category==='Sesion'?'mis-sesiones':'mis-solicitudes');else onNavigate(item.category==='Sesion'?'sesiones':'solicitudes')}
  const markAll=async()=>{try{await markAllNotificationsRead(accessToken);setItems(current=>current.map(item=>({...item,read:true})));setUnread(0)}catch(error){window.dispatchEvent(new CustomEvent('acadex:notice',{detail:error instanceof Error?error.message:'No se pudieron marcar como leídas.'}))}}
  return <div className={`notification-center ${open?'is-open':''}`}><button type="button" className="notification-trigger" aria-label={`Notificaciones${unread?`, ${unread} sin leer`:''}`} aria-expanded={open} onClick={()=>setOpen(value=>!value)}><Bell size={19}/>{unread>0&&<span className="notification-count">{unread>99?'99+':unread}</span>}</button>{open&&<section className="notification-popover" aria-label="Bandeja de notificaciones"><div className="notification-heading"><div><strong>Notificaciones</strong><small>{unread} sin leer</small></div>{unread>0&&<button type="button" onClick={()=>void markAll()}>Marcar todas</button>}</div><div className="notification-list">{items.length?items.map(item=><button type="button" key={item.id} className={`notification-item ${item.read?'read':''}`} onClick={()=>void openItem(item)}><span className="notification-dot"/><span><strong>{item.title}</strong><small>{item.message}</small><time>{new Date(item.createdAt).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'})}</time></span></button>):<p className="notification-empty">No tienes notificaciones por ahora.</p>}</div></section>}</div>
}

function MonthlyReportReminder({accessToken,onNavigate}:{accessToken:string;onNavigate:(view:PortalView)=>void}){const [pending,setPending]=useState(false);useEffect(()=>{const month=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);void getMonthlyTutorReport(accessToken,month).then(result=>setPending(result.sessions.length>0&&!result.draft)).catch(()=>setPending(false))},[accessToken]);return pending?<div className="notice-card tutor-reminder"><span><strong>Informe mensual pendiente</strong><small>Tienes sesiones reportadas este mes y aún no has creado el borrador de cierre.</small></span><button type="button" className="text-button" onClick={()=>onNavigate('informe-mensual')}>Crear informe <ArrowRight size={15}/></button></div>:null}

function MonthlyTutorReportView({accessToken}:{accessToken:string}){const currentMonth=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);const [month,setMonth]=useState(currentMonth);const [report,setReport]=useState<MonthlyTutorReport|null>(null);const [form,setForm]=useState({title:'',introduction:'',achievements:'',challenges:'',recommendations:''});const [loading,setLoading]=useState(false);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [success,setSuccess]=useState('');const [preview,setPreview]=useState(false)
  const refresh=async(selected=month)=>{setLoading(true);setError('');try{const data=await getMonthlyTutorReport(accessToken,selected);setReport(data);const unique=(values:Array<string|null|undefined>)=>[...new Set(values.map(value=>String(value??'').trim()).filter(Boolean))].join('\n');setForm({title:data.draft?.title??`Informe mensual de tutorías · ${selected}`,introduction:data.draft?.content?.introduction??`Durante ${selected}, ${data.tutor} realizó ${data.totals.sessions} sesión(es) de acompañamiento académico, con ${data.totals.attendees} asistencias registradas y ${data.totals.sat} estudiantes SAT con seguimiento.`,achievements:data.draft?.content?.achievements??unique(data.sessions.flatMap(row=>[row.activities,row.achievements])),challenges:data.draft?.content?.challenges??unique(data.sessions.map(row=>row.difficulties)),recommendations:data.draft?.content?.recommendations??unique(data.sessions.map(row=>row.reportRecommendations))})}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar el informe mensual.')}finally{setLoading(false)}}
  useEffect(()=>{void refresh(month)},[accessToken,month])
  const save=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setSaving(true);setError('');setSuccess('');try{await saveMonthlyTutorReport(accessToken,{month,...form});await refresh(month);setSuccess('El borrador mensual quedó guardado. Ya puedes previsualizarlo o exportarlo.')}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el borrador mensual.')}finally{setSaving(false)}}
  const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]??char)).replace(/\n/g,'<br/>')
  const exportWord=async()=>{
    if(!report)return
    const evidence=await Promise.all(report.sessions.flatMap(session=>(session.attachments??[]).map(async file=>{
      if(!file.mimeType.startsWith('image/'))return `<li>${escape(file.name)} (${escape(file.category)})</li>`
      try{const blob=await downloadTutorReportAttachment(accessToken,Number(session.reportId),file.id);const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});return `<figure><img src="${data}" alt="${escape(file.name)}"><figcaption>${escape(file.category)} · ${escape(file.name)}</figcaption></figure>`}catch{return `<li>${escape(file.name)} (${escape(file.category)}; no fue posible cargar la imagen)</li>`}
    })))
    const activities=report.sessions.map((row,index)=>`<tr><td>Actividad No. ${index+1}<br>${formatDate(row.date)} · ${escape(row.subject)}</td><td>${escape(row.activities||row.description||'Sin descripción individual diligenciada.')}</td><td>${(row.attachments??[]).map(file=>escape(file.name)).join('<br>')||'Sin evidencia adjunta'}</td></tr>`).join('')
    const consolidated=report.sessions.map(row=>`<tr><td>${formatDate(row.date)}${row.recovered?' · Recuperación':''}</td><td>${escape(row.subjectCode)} · ${escape(row.subject)}</td><td>${row.startTime}–${row.endTime}</td><td>${escape(row.place||'—')}</td><td>${row.attendees}</td><td>${row.satCount}</td><td>${escape(row.reportStatus??'Borrador')}</td></tr>`).join('')
    const hoursScheduled=report.weeklyHours?`${report.weeklyHours} horas semanales`:'Según asignación activa'
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>${escape(form.title)}</title><style>@page{size:letter;margin:1.5cm}body{font-family:Arial,sans-serif;color:#1e2d27;font-size:10pt;line-height:1.25;margin:0}h1{text-align:center;font-size:15pt;margin:0 0 14pt}h2{font-size:11pt;margin:13pt 0 6pt;padding-bottom:3pt;border-bottom:1px solid #789184}p{margin:5pt 0}table{border-collapse:collapse;width:100%;font-size:8.5pt}td,th{border:1px solid #66776e;padding:5px;vertical-align:top;text-align:left}th{background:#eaf0ec}.basic td:first-child{width:34%;font-weight:bold}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:26px}.signatures div{border-top:1px solid #33483c;padding-top:6px}.evidence{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.evidence figure{margin:0;break-inside:avoid}.evidence img{max-width:100%;max-height:180px;object-fit:contain}.evidence figcaption{font-size:8pt}.consolidated{break-before:page;page-break-before:always;font-size:7.5pt}.consolidated table{font-size:7pt}.consolidated td,.consolidated th{padding:3px}.activity-table tr{break-inside:avoid}</style></head><body><h1>INFORME DE MONITORÍAS · ${escape(report.month)}</h1><table class="basic"><tr><td>PROYECTO</td><td>TUTORÍAS Y MONITORÍAS PARA EL RENDIMIENTO ACADÉMICO Y LA PERMANENCIA (BPU-2025017)</td></tr><tr><td>RESOLUCIÓN DE DESIGNACIÓN</td><td>Res. Rectoral No. 0347 de 2026 (o sus modificatorias)</td></tr><tr><td>NOMBRE DEL TUTOR</td><td>${escape(report.tutor)}</td></tr><tr><td>IDENTIFICACIÓN / CÓDIGO</td><td>${escape(report.tutorDocument||'—')}</td></tr><tr><td>ASIGNATURA(S) DE TUTORÍA</td><td>${[...new Set(report.sessions.map(row=>row.subject))].map(escape).join(', ')||'—'}</td></tr><tr><td>PERIODO DEL INFORME</td><td>${escape(report.month)}</td></tr><tr><td>INTENSIDAD HORARIA PACTADA</td><td>${hoursScheduled}</td></tr><tr><td>HORAS REPORTADAS EN EL PERIODO</td><td>${(report.totals.minutes/60).toFixed(1)}</td></tr></table><h2>REPORTE DE CUMPLIMIENTO DE ACTIVIDADES</h2><table class="activity-table"><tr><th>ACTIVIDAD</th><th>DESCRIPCIÓN DE LA ACTIVIDAD</th><th>EVIDENCIA DE LA ACTIVIDAD</th></tr>${activities||'<tr><td colspan="3">No existen reportes de tutoría en el periodo seleccionado.</td></tr>'}</table><h2>3. REPORTE DE ATENCIÓN ESTUDIANTIL</h2><table><tr><th>CONCEPTO</th><th>CANTIDAD</th></tr><tr><td>Número total de estudiantes atendidos</td><td>${report.totals.attendees}</td></tr><tr><td>Número de sesiones realizadas</td><td>${report.totals.sessions}</td></tr><tr><td>Número de estudiantes SAT acompañados</td><td>${report.totals.sat}</td></tr></table><h2>4. DIFICULTADES Y OBSERVACIONES</h2><p>${escape(form.challenges||'Sin dificultades u observaciones registradas.')}</p><p><b>Logros:</b> ${escape(form.achievements||'—')}</p><p><b>Recomendaciones:</b> ${escape(form.recommendations||'—')}</p><h2>6. DECLARACIÓN DEL ESTUDIANTE TUTOR</h2><p>Manifiesto que las actividades descritas en el presente informe fueron desarrolladas conforme al Plan de Trabajo aprobado y corresponden a las labores efectivamente ejecutadas durante el periodo reportado. Así mismo, declaro que la información aquí consignada es veraz y verificable.</p><p>Reconozco que la monitoría académica constituye un estímulo de carácter formativo y académico, y que no genera vínculo laboral, contractual ni prestacional con la Universidad Internacional del Trópico Americano – Unitrópico.</p><h2>7. FIRMAS DE VALIDACIÓN</h2><div class="signatures"><div>NOMBRE: ${escape(report.tutor)}<br>IDENTIFICACIÓN: ${escape(report.tutorDocument||'')}<br>PROFESOR TUTOR<br><br>Firma:</div><div>NOMBRE: COORDINADOR DEL PROYECTO<br>COORDINACIÓN DEL PROYECTO<br><br>Firma:</div></div><h2>8. ANEXOS · EVIDENCIAS FOTOGRÁFICAS Y DOCUMENTALES</h2><div class="evidence">${evidence.filter(item=>item.startsWith('<figure')).join('')||'<p>No se adjuntaron evidencias fotográficas.</p>'}</div><ul>${evidence.filter(item=>item.startsWith('<li>')).join('')}</ul><h2>REPORTE DE ACOMPAÑAMIENTO SAT</h2><p>Los seguimientos individuales SAT quedan consignados en los reportes diarios asociados a cada sesión.</p><section class="consolidated"><h2>SESIONES CONSOLIDADAS</h2><table><tr><th>FECHA</th><th>ASIGNATURA</th><th>HORARIO</th><th>LUGAR</th><th>ASISTENTES</th><th>SAT</th><th>ESTADO DEL REPORTE</th></tr>${consolidated||'<tr><td colspan="7">No hay sesiones reportadas.</td></tr>'}</table></section></body></html>`
    const blob=new Blob(['\ufeff',html],{type:'application/msword'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`informe-tutor-${report.month}.doc`;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1500)
  }
  return <><PageHeader eyebrow="Mi espacio / Informe mensual" title="Cierre mensual de tutorías" description="Consolida los reportes individuales del mes y genera el documento con las secciones del formato institucional cargado." action={<label className="month-selector">Mes<input type="month" value={month} onChange={event=>setMonth(event.target.value)}/></label>}/>{error&&<div className="error-message">{error}</div>}{success&&<div className="success-message"><Check size={16}/>{success}</div>}<div className="provisional-report-note"><FileText size={18}/><span><strong>Secciones del formato institucional</strong><small>La exportación organiza actividades, atención estudiantil, observaciones, declaración, firmas y anexos; las sesiones consolidadas comienzan en una página final.</small></span></div>{loading?<div className="data-loading">Consolidando sesiones y reportes…</div>:<><section className="metrics-grid"><MetricCard label="Sesiones reportadas" value={String(report?.totals.sessions??0)} detail="En el mes seleccionado" icon={<CalendarDays size={20}/>} tone="blue"/><MetricCard label="Asistencias" value={String(report?.totals.attendees??0)} detail="Estudiantes registrados" icon={<UsersRound size={20}/>} tone="green"/><MetricCard label="Estudiantes SAT" value={String(report?.totals.sat??0)} detail="Con seguimiento" icon={<ShieldCheck size={20}/>} tone="amber"/><MetricCard label="Horas de tutoría" value={((report?.totals.minutes??0)/60).toFixed(1)} detail="Según hora real reportada" icon={<Clock3 size={20}/>} tone="purple"/></section><section className="panel form-panel monthly-report-editor"><div className="panel-heading"><div><h3>Contenido del informe</h3><p>{report?.draft?`Borrador guardado ${report.draft.updatedAt?`· ${formatDate(report.draft.updatedAt.slice(0,10))}`:''}`:'Crea el primer borrador para este mes.'}</p></div><span className="role-pill">{report?.draft?.status??'Sin crear'}</span></div><form className="portal-form" onSubmit={save}><label>Título<input value={form.title} required minLength={3} maxLength={200} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Introducción<textarea value={form.introduction} maxLength={3000} onChange={e=>setForm({...form,introduction:e.target.value})} placeholder="Contexto del acompañamiento realizado durante el mes."/></label><div className="form-columns"><label>Actividades y logros<textarea value={form.achievements} maxLength={3000} onChange={e=>setForm({...form,achievements:e.target.value})}/></label><label>Dificultades<textarea value={form.challenges} maxLength={3000} onChange={e=>setForm({...form,challenges:e.target.value})}/></label></div><label>Recomendaciones<textarea value={form.recommendations} maxLength={3000} onChange={e=>setForm({...form,recommendations:e.target.value})}/></label><div className="actions-inline"><button className="primary-button" disabled={saving}>{saving?'Guardando…':'Guardar borrador'}</button><button type="button" className="secondary-button" onClick={()=>setPreview(v=>!v)}>{preview?'Ocultar vista previa':'Previsualizar'}</button><button type="button" className="secondary-button" onClick={exportWord} disabled={!report}>Descargar Word (.doc) <Download size={16}/></button></div></form></section>{preview&&report&&<section className="panel monthly-report-preview"><div className="preview-watermark">BORRADOR PROVISIONAL</div><h2>{form.title}</h2><p><strong>Tutor:</strong> {report.tutor} · <strong>Periodo:</strong> {report.month}</p><div className="monthly-report-summary"><span><b>{report.totals.sessions}</b> sesiones</span><span><b>{report.totals.attendees}</b> asistencias</span><span><b>{report.totals.sat}</b> estudiantes SAT</span><span><b>{(report.totals.minutes/60).toFixed(1)}</b> horas</span></div><h3>Introducción</h3><p>{form.introduction||'Sin diligenciar.'}</p><h3>Actividades y logros</h3><p>{form.achievements||'Sin diligenciar.'}</p><h3>Dificultades</h3><p>{form.challenges||'Sin diligenciar.'}</p><h3>Recomendaciones</h3><p>{form.recommendations||'Sin diligenciar.'}</p><h3 className="monthly-report-consolidated">Sesiones consolidadas</h3><div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Asignatura</th><th>Horario</th><th>Asistencia</th><th>SAT</th><th>Adjuntos</th></tr></thead><tbody>{report.sessions.map(row=><tr key={row.id}><td>{formatDate(row.date)}{row.recovered?' · Recuperación':''}</td><td>{row.subject}</td><td>{row.startTime}–{row.endTime}</td><td>{row.attendees}</td><td>{row.satCount}</td><td>{row.attachments?.map(file=>`${file.category}: ${file.name}`).join(`; `)||'—'}</td></tr>)}{!report.sessions.length&&<tr><td colSpan={6}>No hay sesiones con reporte para este mes.</td></tr>}</tbody></table></div></section>}</>}</>
}

function PeriodModal({ periodName, periods, onClose }: { periodName: string; periods: AcademicPeriod[]; onClose: () => void }) {
  const activePeriod = periods.find((p) => p.nombre === periodName || p.estado === 'Activo')
  return (
    <Modal title="Ciclo y Periodo Académico" subtitle="Información institucional sobre el calendario y vigencia del periodo actual." onClose={onClose}>
      <div className="period-modal-content">
        <div className="period-status-card">
          <div className="period-badge-large">
            <Clock3 size={24} />
            <div>
              <h3>Periodo {periodName}</h3>
              <span className="badge-active-tag">Estado: {activePeriod?.estado ?? 'Activo'}</span>
            </div>
          </div>
          <p className="period-description">
            Este periodo define la vigencia para la radicación de solicitudes SAT, asignación de monitorías, disponibilidad docente y reportes de atención académica en Unitrópico. El indicador verde confirma que el periodo se encuentra en curso y apto para registrar sesiones.
          </p>
        </div>
        <div className="period-details-grid">
          <div className="period-detail-item">
            <span className="detail-label">Ciclo operativo</span>
            <span className="detail-value">2026 - Segundo Semestre</span>
          </div>
          <div className="period-detail-item">
            <span className="detail-label">Base de datos</span>
            <span className="detail-value">MariaDB / PeriodoAcademico</span>
          </div>
          <div className="period-detail-item">
            <span className="detail-label">Periodos disponibles</span>
            <span className="detail-value">{periods.length ? periods.map((p) => p.nombre).join(', ') : '2026-2'}</span>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="primary-button" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </Modal>
  )
}

function CalendarModal({ requests, onClose }: { requests: Request[]; onClose: () => void }) {
  const sorted = [...requests].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return (
    <Modal title="Calendario y Flujo de Solicitudes" subtitle="Vista cronológica de las solicitudes de acompañamiento académico registradas." wide onClose={onClose}>
      <div className="calendar-modal-content">
        <div className="calendar-stats-row">
          <div className="calendar-stat-chip"><strong>{requests.length}</strong><span>Solicitudes totales</span></div>
          <div className="calendar-stat-chip"><strong>{requests.filter((r) => r.status === 'Pendiente').length}</strong><span>Pendientes</span></div>
          <div className="calendar-stat-chip"><strong>{requests.filter((r) => r.status === 'Aprobada' || r.status === 'Asignada').length}</strong><span>En curso</span></div>
          <div className="calendar-stat-chip"><strong>{requests.filter((r) => r.status === 'Finalizada' || r.status === 'Atendida').length}</strong><span>Atendidas</span></div>
        </div>
        <div className="calendar-requests-scroll">
          {sorted.map((req) => (
            <div className="calendar-request-card" key={req.id}>
              <div className="calendar-card-header">
                <span className="calendar-date-badge"><CalendarDays size={14} /> {req.date || 'Sin fecha'}</span>
                <span className={`priority ${req.priority.toLowerCase()}`}><span />{req.priority}</span>
              </div>
              <div className="calendar-card-body">
                <strong>{req.subject}</strong>
                <span>Estudiante: {req.student}</span>
                {req.program && <small>{req.program}</small>}
                {req.motive && <p className="calendar-card-motive">“{req.motive}”</p>}
              </div>
              <div className="calendar-card-footer">
                <span className="type-label"><span className={req.type === 'Monitoría' ? 'type-dot blue-dot' : 'type-dot purple-dot'} />{req.type}</span>
                <RequestStatus status={req.status} />
              </div>
            </div>
          ))}
          {!sorted.length && <div className="activity-empty">No hay solicitudes para mostrar en el calendario.</div>}
        </div>
        <div className="modal-actions">
          <button type="button" className="primary-button" onClick={onClose}>Cerrar calendario</button>
        </div>
      </div>
    </Modal>
  )
}

function ClipboardIcon() { return <BookOpen size={19} /> }

function PortalHome({ user, activeRole, periodName, requests, onNavigate }: { user: User; activeRole: PortalRole; periodName: string; requests: Request[]; onNavigate: (view: PortalView) => void }) {
  const descriptions: Record<PortalRole, string> = {
    Tutor: 'Consulta tus horarios, sesiones e informes de acompañamiento docente.',
    Monitor: 'Consulta tus horarios y atiende las solicitudes de monitoría asignadas.',
    Estudiante: 'Solicita acompañamiento y revisa el avance de tus tutorías y monitorías.',
  }
  const roleAction: Record<PortalRole, { label: string; view: PortalView; icon: ReactNode }> = {
    Tutor: { label: 'Gestionar disponibilidad', view: 'disponibilidad', icon: <CalendarClock size={18} /> },
    Monitor: { label: 'Ver mis horarios', view: 'horarios', icon: <CalendarClock size={18} /> },
    Estudiante: { label: 'Solicitar acompañamiento', view: 'solicitar', icon: <Send size={18} /> },
  }
  const action = roleAction[activeRole]
  const today = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  return <>
    <PageHeader eyebrow={`Portal ${activeRole.toLowerCase()} · ${today}`} title={`Hola, ${user.name.split(' ')[0]}`} description={descriptions[activeRole]} action={<button className="primary-button" onClick={() => onNavigate(action.view)}>{action.icon}{action.label}</button>} />
    <section className="metrics-grid"><MetricCard label="Solicitudes visibles" value={String(requests.length)} detail="Datos cargados desde MariaDB" icon={<CalendarDays size={20} />} tone="blue" /><MetricCard label="Periodo académico" value={periodName} detail="Periodo activo" icon={<Clock3 size={20} />} tone="green" /><MetricCard label="Estado de cuenta" value={user.status} detail="Acceso institucional" icon={<ShieldCheck size={20} />} tone="purple" /></section>
    <div className="dashboard-grid"><section className="panel activity-panel"><div className="panel-heading"><div><h3>Solicitudes recientes</h3><p>Registros asociados a tu rol</p></div><button className="text-button" onClick={() => onNavigate(activeRole === 'Estudiante' ? 'mis-solicitudes' : activeRole === 'Monitor' ? 'solicitudes' : 'disponibilidad')}>Ver detalles <ArrowRight size={15} /></button></div><div className="activity-list">{requests.length ? requests.slice(0, 3).map((request) => <ActivityRow key={request.id} color={request.status === 'Pendiente' ? 'amber' : 'green'} title={request.subject} description={`${request.type} · ${request.status}`} time={request.date} />) : <div className="activity-empty">No hay solicitudes disponibles para mostrar.</div>}</div></section><section className="panel quick-panel"><div className="panel-heading"><div><h3>Accesos rápidos</h3><p>Acciones disponibles para ti</p></div></div><div className="quick-actions"><button onClick={()=>onNavigate(action.view)}><span className="quick-icon blue-bg">{action.icon}</span><span><b>{action.label}</b><small>Continúa tu gestión</small></span><ArrowRight size={16}/></button>{activeRole === 'Estudiante' && <button onClick={() => onNavigate('mis-solicitudes')}><span className="quick-icon green-bg"><BookOpen size={18}/></span><span><b>Mis solicitudes</b><small>Revisa su estado</small></span><ArrowRight size={16}/></button>}</div></section></div>
  </>
}

function TutorHome({ user, periodName, accessToken }: { user: User; periodName: string; accessToken: string }) {
  const [data,setData]=useState<TutorDashboardData|null>(null)
  const [error,setError]=useState('')
  useEffect(()=>{void getTutorDashboard(accessToken).then(setData).catch((e)=>setError(e instanceof Error?e.message:'No se pudo cargar el resumen.'))},[accessToken])
  const metrics=data?.metrics
  return <><PageHeader eyebrow="Portal Tutor · Resumen" title={`Hola, ${user.name.split(' ')[0]}`} description={`Seguimiento de agenda, solicitudes y reportes del periodo ${periodName}.`} />{error&&<div className="error-message">{error}</div>}<section className="metrics-grid"><MetricCard label="Sesiones próximas" value={String(metrics?.upcoming??'—')} detail="Pendientes de realizar" icon={<CalendarDays size={20}/>} tone="blue"/><MetricCard label="Sesiones realizadas" value={String(metrics?.completed??'—')} detail="En tu asignación" icon={<Check size={20}/>} tone="green"/><MetricCard label="Solicitudes por atender" value={String(metrics?.openRequests??'—')} detail="Asignadas a tu usuario" icon={<ClipboardIcon/>} tone="amber"/><MetricCard label="Reportes pendientes" value={String(metrics?.pendingReports??'—')} detail="Borradores o devueltos" icon={<FileText size={20}/>} tone="purple"/></section><div className="dashboard-grid tutor-dashboard-grid"><section className="panel activity-panel"><div className="panel-heading"><div><h3>Próximas tutorías</h3><p>Agenda confirmada y sesiones por atender</p></div><span className="role-pill">{data?.upcoming.length??0} próximas</span></div><div className="activity-list">{data?.upcoming.length?data.upcoming.map(item=><ActivityRow key={item.id} color="blue" title={item.subject} description={`${formatDate(item.date)} · ${item.startTime}–${item.endTime} · ${item.place}`} time={item.status}/>):<div className="activity-empty">No tienes tutorías próximas registradas.</div>}</div></section></div></>
}

const tutorWeekDays=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
function AvailabilityView({ periodName, availability, accessToken }: { periodName: string; availability: PortalAvailability[]; accessToken: string }) {
  const [items,setItems]=useState(availability)
  const [assignments,setAssignments]=useState<TutorAssignment[]>([])
  const [recoveries,setRecoveries]=useState<TutorRecovery[]>([])
  const [recoverableSessions,setRecoverableSessions]=useState<TutorRecoverableSession[]>([])
  const [editing,setEditing]=useState<PortalAvailability|null>(null)
  const [recoveryOpen,setRecoveryOpen]=useState(false)
  const [error,setError]=useState('')
  const refresh=async()=>{const [a,r,candidates]=await Promise.all([listTutorAssignments(accessToken),listTutorRecoveries(accessToken),listTutorRecoverableSessions(accessToken)]);setAssignments(a);setRecoveries(r);setRecoverableSessions(candidates);setItems(await listPortalAvailabilityApi(accessToken))}
  useEffect(()=>{setItems(availability);void refresh().catch(e=>setError(e instanceof Error?e.message:'No se pudo cargar el calendario.'))},[accessToken])
  const save=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const form=new FormData(event.currentTarget);const selectedAssignment=Number(form.get('assignmentId'));const assignmentId=assignments.some(row=>row.id===selectedAssignment)?selectedAssignment:assignments.length===1?assignments[0].id:undefined;if(!assignmentId&&assignments.length!==1){setError('Selecciona una asignatura activa para asociar el bloque horario.');return}const input={assignmentId,day:String(form.get('day')),startTime:String(form.get('startTime')),endTime:String(form.get('endTime')),modality:String(form.get('modality')) as 'Presencial'|'Virtual'};try{if(editing&&editing.id>0)await updateTutorAvailability(accessToken,editing.id,input);else await createTutorAvailability(accessToken,input);setEditing(null);setError('');await refresh()}catch(e){setError(e instanceof ApiError?e.message:e instanceof Error?e.message:'No se pudo guardar el horario.')}}
  const remove=async(item:PortalAvailability)=>{if(!window.confirm(`¿Retirar el bloque de ${item.day} de ${item.startTime} a ${item.endTime}?`))return;try{await deleteTutorAvailability(accessToken,item.id);await refresh()}catch(e){setError(e instanceof Error?e.message:'No se pudo eliminar el bloque.')}}
  const saveRecovery=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const form=new FormData(event.currentTarget);try{await createTutorRecovery(accessToken,{originalSessionId:Number(form.get('originalSessionId')),date:String(form.get('date')),startTime:String(form.get('startTime')),endTime:String(form.get('endTime')),description:String(form.get('description'))});setRecoveryOpen(false);await refresh()}catch(e){setError(e instanceof Error?e.message:'No se pudo programar la recuperación.')}}
  const removeRecovery=async(row:TutorRecovery)=>{if(!window.confirm('¿Cancelar esta recuperación programada?'))return;try{await cancelTutorRecovery(accessToken,row.id);await refresh()}catch(e){setError(e instanceof Error?e.message:'No se pudo cancelar la recuperación.')}};const finishRecovery=async(row:TutorRecovery)=>{if(!window.confirm('¿Marcar esta tutoría recuperada como realizada?'))return;try{await completeTutorRecovery(accessToken,row.id);await refresh()}catch(e){setError(e instanceof Error?e.message:'No se pudo finalizar la recuperación.')}}
  return <><PageHeader eyebrow="Mi espacio / Horario" title="Horario" description={`Calendario semanal del periodo ${periodName}. Administra tus bloques y programa recuperaciones puntuales.`} action={<div className="actions-inline"><button className="secondary-button" onClick={()=>setRecoveryOpen(true)}><CalendarClock size={17}/> Recuperar tutoría</button><button className="primary-button" disabled={!assignments.length} onClick={()=>setEditing({id:0,assignmentId:assignments[0]?.id,day:'Lunes',startTime:'08:00',endTime:'09:00',subject:assignments[0]?.subject??'',place:'Sin espacio asignado',modality:'Presencial',status:'Activo'})}><Plus size={17}/> Añadir horario</button></div>}/>{error&&<div className="error-message">{error}</div>}{!assignments.length&&<div className="form-field-hint">No hay una asignación académica activa en el periodo. Solicita al administrador que revise tu rol, asignatura y periodo.</div>}<section className="panel tutor-calendar"><div className="panel-heading"><div><h3>Calendario semanal</h3><p>Bloques activos de atención · {periodName}</p></div><span className="role-pill">{items.length} bloques</span></div><div className="tutor-week-grid">{tutorWeekDays.map(day=><section className="tutor-day-column" key={day}><h4>{day}</h4>{items.filter(item=>item.day===day).map(item=><article className="tutor-calendar-event" key={item.id}><strong>{item.startTime}–{item.endTime}</strong><span>{item.subject}</span><small>{item.modality} · {item.place}</small><div className="actions-inline"><button className="row-action" onClick={()=>setEditing(item)}>Editar</button><button className="delete-action" title="Eliminar bloque" onClick={()=>void remove(item)}><Trash2 size={15}/></button></div></article>)}{!items.some(item=>item.day===day)&&<p className="calendar-empty">Sin bloques</p>}</section>)}</div></section><section className="panel table-panel"><div className="panel-heading"><div><h3>Recuperaciones de tutoría</h3><p>Sesiones puntuales asociadas a una tutoría que requiere nueva fecha.</p></div></div><div className="table-scroll"><table><thead><tr><th>ASIGNATURA</th><th>FECHA Y HORA</th><th>MOTIVO</th><th>ESTADO</th><th/></tr></thead><tbody>{recoveries.map(row=><tr key={row.id}><td>{row.subject}</td><td>{formatDate(row.date)} · {row.startTime}–{row.endTime}</td><td>{row.description}</td><td><RequestStatus status={row.status}/></td><td className="align-right">{row.status==='Programada'&&<div className="actions-inline">{(row.date<new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota'}).format(new Date())||(row.date===new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota'}).format(new Date())&&row.endTime<=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Bogota',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date())))&&<button className="row-action" onClick={()=>void finishRecovery(row)}>Marcar realizada</button>}<button className="delete-action" title="Cancelar recuperación" onClick={()=>void removeRecovery(row)}><Trash2 size={16}/></button></div>}</td></tr>)}{!recoveries.length&&<tr><td colSpan={5} className="empty-table-cell">Aún no hay recuperaciones programadas.</td></tr>}</tbody></table></div></section>{editing&&<Modal title={editing.id?'Editar disponibilidad':'Nuevo bloque de disponibilidad'} subtitle="El horario se guarda para tu asignación activa del periodo." onClose={()=>setEditing(null)}><form className="modal-form" onSubmit={save}><label>Asignatura<select name="assignmentId" required defaultValue={editing.assignmentId??''}>{assignments.map(item=><option key={item.id} value={item.id}>{item.codigo} · {item.subject}</option>)}</select></label><label>Día<select name="day" defaultValue={editing.day}>{tutorWeekDays.map(day=><option key={day}>{day}</option>)}</select></label><div className="form-columns"><label>Hora inicial<input name="startTime" type="time" required defaultValue={editing.startTime}/></label><label>Hora final<input name="endTime" type="time" required defaultValue={editing.endTime}/></label></div><label>Modalidad<select name="modality" defaultValue={editing.modality}><option>Presencial</option><option>Virtual</option></select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(null)}>Cancelar</button><button className="primary-button" disabled={!assignments.length}>Guardar horario</button></div>{!assignments.length&&<small className="form-field-hint">No hay asignación activa para este periodo. Solicita al administrador que configure tu asignatura.</small>}</form></Modal>}{recoveryOpen&&<Modal title="Programar recuperación de tutoría" subtitle="Selecciona la sesión original y define la nueva fecha y horario." onClose={()=>setRecoveryOpen(false)}><form className="modal-form" onSubmit={saveRecovery}><label>Tutoría a recuperar<select name="originalSessionId" required defaultValue="" disabled={!recoverableSessions.length}><option value="">{recoverableSessions.length?"Selecciona una sesión pendiente":"No hay sesiones canceladas o no asistidas para recuperar"}</option>{recoverableSessions.map(s=><option key={s.id} value={s.id}>#{s.id} · {s.subject} · {formatDate(s.date)} · {s.startTime}–{s.endTime} · {s.status}</option>)}</select></label><label>Nueva fecha<input name="date" type="date" required min={new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota'}).format(new Date())}/></label><div className="form-columns"><label>Hora inicial<input name="startTime" type="time" required/></label><label>Hora final<input name="endTime" type="time" required/></label></div><label>Motivo / detalle<textarea name="description" required minLength={3} maxLength={1000}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setRecoveryOpen(false)}>Cancelar</button><button className="primary-button" disabled={!recoverableSessions.length}>Programar recuperación</button></div></form></Modal>}</>
}

function ScheduleView({ user, periodName, availability }: { user: User; periodName: string; availability: PortalAvailability[] }) {
  return <><PageHeader eyebrow="Mi espacio / Horarios" title="Mis horarios" description="Horario de monitoría registrado para el periodo activo." /><section className="panel schedule-panel"><div className="panel-heading"><div><h3>{user.name}</h3><p>Periodo {periodName}</p></div></div><div className="schedule-list">{availability.length ? availability.map((item) => <ScheduleRow key={item.id} day={item.day} time={`${item.startTime} — ${item.endTime}`} subject={item.subject} place={item.place} />) : <div className="activity-empty">No hay horarios de monitoría para este periodo.</div>}</div></section></>
}

function ScheduleRow({ day, time, subject, place }: { day: string; time: string; subject: string; place: string }) { return <div className="schedule-row"><div className="schedule-day"><strong>{day}</strong><span>{time}</span></div><div className="schedule-main"><strong>{subject}</strong><span>{place}</span></div><StatusPill status="Activo" /></div> }

function PortalSessions({ sessions, activeRole, periodName, accessToken, onChange }: { sessions: PortalSession[]; activeRole: PortalRole; periodName: string; accessToken:string; onChange:(sessions:PortalSession[])=>void }) {
  const [filter,setFilter]=useState('Todas');const [query,setQuery]=useState('');const [error,setError]=useState('')
  const statuses=['Todas',...new Set(sessions.map(session=>session.status))]
  const filtered=sessions.filter(session=>(filter==='Todas'||session.status===filter)&&`${session.subject} ${session.place} ${session.modality}`.toLowerCase().includes(query.trim().toLowerCase()))
  const upcoming=sessions.filter(session=>['Programada','Confirmada','Reprogramada','En Proceso'].includes(session.status)).length
  const completed=sessions.filter(session=>['Realizada','Finalizada'].includes(session.status)).length
  const complete=async(session:PortalSession)=>{if(!session.requestId)return;if(!window.confirm(`¿Marcar como realizada la tutoría de ${session.subject}?`))return;try{await markAssignedRequestAttended(accessToken,session.requestId);onChange(sessions.map(item=>item.id===session.id?{...item,status:'Realizada'}:item));setError('')}catch(e){setError(e instanceof ApiError?e.message:'No se pudo cerrar la tutoría como realizada.')}}
  return <><PageHeader eyebrow={`Mi espacio / ${activeRole==='Estudiante'?'Mis sesiones':'Mis sesiones'}`} title="Mis sesiones" description={activeRole==='Tutor'?'Consulta tu agenda y registra la atención cuando finalice cada tutoría.':'Revisa aquí las sesiones registradas para tu rol en el periodo académico activo.'}/><section className="metrics-grid sessions-summary"><MetricCard label="En agenda" value={String(upcoming)} detail={`Periodo ${periodName}`} icon={<CalendarDays size={20}/>} tone="blue"/><MetricCard label="Realizadas" value={String(completed)} detail="Atenciones completadas" icon={<Check size={20}/>} tone="green"/><MetricCard label="Total" value={String(sessions.length)} detail="Sesiones registradas" icon={<Clock3 size={20}/>} tone="purple"/></section>{error&&<div className="error-message">{error}</div>}<section className="panel sessions-panel"><div className="sessions-toolbar"><label className="sessions-search"><Search size={18}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por asignatura, lugar o modalidad" aria-label="Buscar sesiones"/></label><label className="sessions-filter-label">Estado<select value={filter} onChange={event=>setFilter(event.target.value)}>{statuses.map(status=><option key={status}>{status}</option>)}</select></label><span className="sessions-result-count">{filtered.length} de {sessions.length}</span></div><div className="session-card-list">{filtered.map(session=><article className="session-card" key={session.id}><div className="session-card-date"><strong>{new Date(`${session.date}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('es-CO',{month:'short'}).format(new Date(`${session.date}T12:00:00`))}</span></div><div className="session-card-main"><div className="session-card-heading"><div><span className="session-reference">Sesión #{String(session.id).padStart(4,'0')}</span><h3>{session.subject}</h3></div><RequestStatus status={session.status}/></div><div className="session-card-details"><span><Clock3 size={15}/>{formatDate(session.date)} · {session.startTime}–{session.endTime}</span><span><Building2 size={15}/>{session.place||'Sin espacio asignado'}</span><span><CalendarClock size={15}/>{session.modality}</span></div></div>{activeRole==='Tutor'&&session.requestId&&['Confirmada','Programada','Reprogramada','En Proceso'].includes(session.status)&&<button className="secondary-button small-button session-complete-action" onClick={()=>void complete(session)}><Check size={16}/> Marcar realizada</button>}</article>)}{!filtered.length&&<div className="sessions-empty"><CalendarDays size={28}/><strong>{sessions.length?'No hay sesiones que coincidan con los filtros.':'Aún no tienes sesiones registradas.'}</strong><span>{sessions.length?'Ajusta la búsqueda o el estado seleccionado.':'Cuando se asigne una tutoría o monitoría aparecerá aquí.'}</span></div>}</div></section></>
}
function TutorReports({accessToken,sessions:portalSessions}:{accessToken:string;sessions:PortalSession[]}){
  const [sessions,setSessions]=useState<TutorReportableSession[]>([]);const [active,setActive]=useState<(TutorReportableSession&Partial<TutorReportRecord>)|null>(null);const [viewOnly,setViewOnly]=useState(false);const [attendees,setAttendees]=useState<number[]>([]);const [satIds,setSatIds]=useState<number[]>([]);const [satText,setSatText]=useState<Record<number,string>>({});const [error,setError]=useState('');const [success,setSuccess]=useState('');const [busy,setBusy]=useState(false)
  const refresh=async()=>setSessions(await listTutorReportableSessions(accessToken));useEffect(()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:'No fue posible cargar los reportes.'))},[accessToken])
  const toggle=(id:number,kind:'attendee'|'sat')=>{if(kind==='attendee')setAttendees(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);else setSatIds(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])}
  const begin=async(session:TutorReportableSession,readOnly=false)=>{setError('');setBusy(true);try{if(session.reportId){const report=await getTutorReport(accessToken,session.reportId);setActive({...session,...report,id:session.id,reportId:report.id,reportTitle:report.title,reportStatus:report.status});setAttendees(report.attendees);setSatIds(report.satDetails.map(item=>item.studentId));setSatText(Object.fromEntries(report.satDetails.map(item=>[item.studentId,item.description])))}else{setActive(session);setAttendees([]);setSatIds([]);setSatText({})}setViewOnly(readOnly)}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar el detalle del reporte.')}finally{setBusy(false)}}
  const save=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!active)return;setBusy(true);setError('');const form=new FormData(event.currentTarget);try{
    const attachments:Record<string,unknown>[]=[];const categories=['Asistencia','Actividades','EvidenciaInicio','EvidenciaFin'] as const
    for(const category of categories){const file=form.get(category) as File|null;if(file&&file.size){if(file.size>4*1024*1024)throw new Error(`${file.name} supera el límite de 4 MB.`);const encoded=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]??'');reader.onerror=()=>reject(new Error('No se pudo leer el archivo.'));reader.readAsDataURL(file)});attachments.push({category,name:file.name,mime:file.type||'application/octet-stream',dataBase64:encoded})}}
    const payload={sessionId:active.id,recoveryId:active.recoveryId??undefined,title:String(form.get('title')),date:active.date,startTime:String(form.get('startTime')),endTime:String(form.get('endTime')),place:String(form.get('place')),description:String(form.get('description')),attendanceCount:attendees.length,satCount:satIds.length,attendees,satDetails:satIds.map(studentId=>({studentId,description:satText[studentId]??''})),activities:String(form.get('activities')??''),achievements:String(form.get('achievements')??''),difficulties:String(form.get('difficulties')??''),recommendations:String(form.get('recommendations')??''),recovered:Boolean(active.isRecovery||active.recovered),attachments}
    const result=active.reportId?await updateTutorReport(accessToken,active.reportId,payload):await saveTutorReportApi(accessToken,payload)
    setSuccess(`Borrador ${result.id} ${active.reportId?'actualizado':'guardado'}.`);setActive(null);await refresh()
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el reporte.')}finally{setBusy(false)}}
  const submit=async(row:TutorReportableSession)=>{if(!row.reportId||!window.confirm('¿Enviar este reporte a administración? Después del envío no podrás editarlo.'))return;try{await submitTutorReportApi(accessToken,row.reportId);setSuccess('Reporte enviado a administración.');await refresh()}catch(e){setError(e instanceof Error?e.message:'No se pudo enviar el reporte.')}}
  const remove=async(row:TutorReportableSession)=>{if(!row.reportId||!window.confirm(`¿Eliminar el borrador del reporte de ${row.subject}? Esta acción también retira sus adjuntos.`))return;try{await deleteTutorReport(accessToken,row.reportId);setSuccess('Borrador eliminado.');await refresh()}catch(e){setError(e instanceof Error?e.message:'No se pudo eliminar el borrador.')}}
  const downloadAttachment=async(reportId:number,file:NonNullable<TutorReportRecord['attachments']>[number])=>{try{const blob=await downloadTutorReportAttachment(accessToken,reportId,file.id);const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=file.name;anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),1500)}catch(e){setError(e instanceof Error?e.message:'No se pudo descargar el adjunto.')}}
  const hasPortalSessions=portalSessions.length>0
  const pendingReports=sessions.filter(row=>!row.reportId).length
  return <><PageHeader eyebrow="Mi espacio / Reportes" title="Reportes de tutoría" description="Crea reportes para sesiones finalizadas, edita borradores o reportes devueltos y consulta los enviados." />{error&&<div className="error-message">{error}</div>}{success&&<div className="success-message"><Check size={16}/>{success}</div>}{!hasPortalSessions&&<div className="form-field-hint">No se cargaron sesiones para este periodo.</div>}{sessions.length>0&&pendingReports===0&&<div className="notice-card" role="status">Todas las tutorías finalizadas ya tienen un reporte. Los reportes enviados, aprobados o entregados se conservan como historial; se habilita Crear cuando finalice una tutoría aún no reportada.</div>}<section className="panel table-panel"><div className="table-meta"><span><strong>{sessions.length}</strong> sesiones realizadas</span><span>El reporte queda ligado a la sesión</span></div><div className="table-scroll"><table><thead><tr><th>SESIÓN</th><th>FECHA</th><th>ESTADO DEL REPORTE</th><th className="align-right">ACCIÓN</th></tr></thead><tbody>{sessions.map(row=><tr key={row.id}><td><strong>{row.subject}</strong>{row.isRecovery&&<span className="table-subtext">Recuperación de tutoría</span>}<span className="table-subtext">{row.student} · {row.startTime}–{row.endTime}</span></td><td>{formatDate(row.date)}</td><td>{row.reportStatus??'Pendiente'}</td><td className="align-right">{!row.reportId?<button className="primary-button small-button" onClick={()=>void begin(row)}>Crear reporte</button>:row.reportStatus==='Borrador'||row.reportStatus==='Devuelto'?<div className="report-actions"><button className="secondary-button small-button" onClick={()=>void begin(row)}>Editar</button><button className="primary-button small-button" onClick={()=>void submit(row)}>Enviar</button>{row.reportStatus==='Borrador'&&<button className="delete-action" aria-label="Eliminar borrador" title="Eliminar borrador" onClick={()=>void remove(row)}><Trash2 size={16}/></button>}</div>:<button className="secondary-button small-button" onClick={()=>void begin(row,true)}>Ver reporte</button>}</td></tr>)}{!sessions.length&&<tr><td colSpan={4} className="empty-table-cell">No hay tutorías finalizadas que requieran reporte. Los reportes existentes permanecen disponibles en el historial.</td></tr>}</tbody></table></div></section>{active&&<Modal title={viewOnly?`Reporte · ${active.reportTitle??active.subject}`:'Reporte de tutoría'} subtitle={`${active.isRecovery?'Recuperación de tutoría':'Tutoría'} · ${active.subject} · ${formatDate(active.date)} · ${active.student}`} wide onClose={()=>setActive(null)}><form className="modal-form tutor-report-form" onSubmit={save}><fieldset className="report-fields" disabled={viewOnly}><label>Título del reporte<input name="title" required minLength={3} maxLength={200} defaultValue={active.reportTitle??`Tutoría de ${active.subject} · ${active.date}`}/></label><div className="form-columns"><label>Día de tutoría<input type="date" value={active.date} readOnly/></label><label>Lugar de la tutoría<input name="place" required minLength={2} maxLength={255} defaultValue={active.place||''}/></label></div><div className="form-columns"><label>Hora real de inicio<input name="startTime" type="time" required defaultValue={active.startTime}/></label><label>Hora real de fin<input name="endTime" type="time" required defaultValue={active.endTime}/></label></div><label>Descripción de la tutoría<textarea name="description" required minLength={5} maxLength={5000} defaultValue={active.description??''}/></label><fieldset className="role-profile-fieldset"><legend>Asistencia · {active.student}</legend><label className="check-row"><input type="checkbox" checked={attendees.includes(active.studentId)} onChange={()=>toggle(active.studentId,'attendee')}/> {active.student} asistió</label>{attendees.includes(active.studentId)&&<label className="check-row"><input type="checkbox" checked={satIds.includes(active.studentId)} onChange={()=>toggle(active.studentId,'sat')}/> Este estudiante pertenece a categoría SAT</label>}{satIds.includes(active.studentId)&&<label>Seguimiento del estudiante SAT<textarea required minLength={5} maxLength={1000} value={satText[active.studentId]??''} onChange={e=>setSatText({...satText,[active.studentId]:e.target.value})} placeholder="Describe su participación, dificultades y seguimiento recomendado."/></label>}<p className="form-field-hint">Asistentes seleccionados: {attendees.length} · Estudiantes SAT: {satIds.length}</p></fieldset><label>Actividades realizadas<textarea name="activities" maxLength={2000} defaultValue={active.activities??''}/></label><div className="form-columns"><label>Logros<textarea name="achievements" maxLength={1000} defaultValue={active.achievements??''}/></label><label>Dificultades<textarea name="difficulties" maxLength={1000} defaultValue={active.difficulties??''}/></label></div><label>Recomendaciones<textarea name="recommendations" maxLength={1000} defaultValue={active.recommendations??''}/></label><fieldset className="role-profile-fieldset"><legend>Adjuntos (máximo 4 MB cada uno)</legend><label>Listado de asistencia (PDF o imagen)<input name="Asistencia" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"/></label><label>Actividades realizadas (PDF, imagen o Word)<input name="Actividades" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,.doc,.docx"/></label><div className="form-columns"><label>Evidencia de inicio<input name="EvidenciaInicio" type="file" accept="image/png,image/jpeg,image/webp"/></label><label>Evidencia de fin<input name="EvidenciaFin" type="file" accept="image/png,image/jpeg,image/webp"/></label></div></fieldset></fieldset>{Boolean(active.reportId&&active.attachments?.length)&&<div className="report-attachments"><strong>Adjuntos existentes</strong>{active.attachments?.map(file=><button type="button" key={file.id} onClick={()=>void downloadAttachment(Number(active.reportId),file)}><Download size={15}/><span>{file.name}</span><small>{file.category}</small></button>)}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setActive(null)}>{viewOnly?'Cerrar':'Cancelar'}</button>{!viewOnly&&<button className="primary-button" disabled={busy}>{busy?'Guardando…':active.reportId?'Actualizar borrador':'Guardar borrador'}</button>}</div></form></Modal>}</>
}

function TutorReportReminder({accessToken}:{accessToken:string}){const [pending,setPending]=useState<TutorReportableSession[]>([]);useEffect(()=>{void listTutorReportableSessions(accessToken).then(rows=>setPending(rows.filter(row=>!row.reportId))).catch(()=>undefined)},[accessToken]);const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota'}).format(new Date());const late=pending.filter(row=>row.date<today);if(localStorage.getItem('acadex:tutor-report-reminders')==='false'||!late.length)return null;const day=new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'America/Bogota'}).format(new Date());const catchup=['Friday','Saturday','Sunday'].includes(day);return <div className={catchup?'notice-card':'error-message'} role="status">Tienes {late.length} tutoría(s) realizada(s) sin reporte. {catchup?'Puedes completar ahora los reportes atrasados.':'Podrás completar los reportes pendientes desde el viernes y durante el fin de semana.'}</div>}function TutorConfiguration({accessToken}:{accessToken:string}){const [error,setError]=useState('');const [success,setSuccess]=useState('');const [busy,setBusy]=useState(false);const [reminders,setReminders]=useState(()=>localStorage.getItem('acadex:tutor-report-reminders')!=='false');const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const form=new FormData(event.currentTarget);const currentPassword=String(form.get('currentPassword')??''),newPassword=String(form.get('newPassword')??''),confirmPassword=String(form.get('confirmPassword')??'');if(newPassword!==confirmPassword){setError('La nueva contraseña y la confirmación no coinciden.');return}setBusy(true);setError('');setSuccess('');try{await changePassword(accessToken,{currentPassword,newPassword,confirmPassword});event.currentTarget.reset();setSuccess('La contraseña se actualizó correctamente.')}catch(e){setError(e instanceof ApiError?e.message:'No se pudo actualizar la contraseña.')}finally{setBusy(false)}};return <><PageHeader eyebrow="Mi espacio / Configuración" title="Configuración de cuenta" description="Administra de forma segura tus credenciales y preferencias personales."/><div className="tutor-settings-grid"><section className="panel form-panel"><div className="panel-heading"><div><h3>Cambiar contraseña</h3><p>Usa una contraseña robusta de al menos 8 caracteres.</p></div><LockKeyhole size={20}/></div>{error&&<div className="error-message">{error}</div>}{success&&<div className="success-message"><Check size={16}/>{success}</div>}<form className="portal-form" onSubmit={submit}><label>Contraseña actual<input name="currentPassword" type="password" required autoComplete="current-password"/></label><label>Nueva contraseña<input name="newPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password"/></label><label>Confirmar nueva contraseña<input name="confirmPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password"/></label><button className="primary-button" disabled={busy}><LockKeyhole size={17}/>{busy?'Actualizando…':'Actualizar contraseña'}</button></form></section><section className="panel form-panel"><div className="panel-heading"><div><h3>Preferencias de trabajo</h3><p>Información visible para organizar tu actividad docente.</p></div><Settings2 size={20}/></div><label className="tutor-pref-toggle"><input type="checkbox" checked={reminders} onChange={event=>{setReminders(event.target.checked);localStorage.setItem("acadex:tutor-report-reminders",String(event.target.checked))}}/><span><strong>Avisos de reportes pendientes</strong><small>Mostrar recordatorios de tutorías realizadas sin reporte.</small></span></label><ul className="tutor-preference-list"><li><Check size={16}/> Periodo académico: datos sincronizados con el periodo activo.</li><li><Check size={16}/> Disponibilidad: gestionada desde el calendario semanal.</li><li><Check size={16}/> Reportes: guarda borradores antes de enviarlos.</li><li><ShieldCheck size={16}/> La preferencia de avisos se guarda en este navegador.</li></ul></section></div></>}

function StudentRequestForm({ accessToken, subjects, user, requests, onChange }: { accessToken: string; subjects: Array<{ id: number; codigo: string; nombre: string }>; user: User; requests: Request[]; onChange: (requests: Request[]) => void }) {
  const [sent, setSent] = useState(false)
  const [reason, setReason] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      const saved = await createRequestApi(accessToken, {
        subject: String(form.get('subject') ?? ''),
        type: String(form.get('type') ?? 'Monitoría') as 'Monitoría' | 'Tutoría',
        priority: String(form.get('priority') ?? 'Media') as 'Alta' | 'Media' | 'Baja',
        reason,
      })
      onChange([saved as Request, ...requests])
      setSent(true)
      setReason('')
      event.currentTarget.reset()
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible registrar la solicitud.')
    }
  }
  return <>
    <PageHeader eyebrow="Mi espacio / Solicitudes" title="Solicitar acompañamiento" description="Cuéntanos en qué asignatura necesitas apoyo y te ayudaremos a encontrar el acompañamiento adecuado." />
    <section className="panel form-panel">
      <div className="panel-heading">
        <div>
          <h3>Nueva solicitud de acompañamiento</h3>
          <p>La coordinación académica revisará tu requerimiento y asignará un tutor o monitor calificado.</p>
        </div>
        <div className="quick-icon blue-bg"><Send size={18} /></div>
      </div>
      <form className="portal-form" onSubmit={submit}>
        <div className="form-columns">
          <label>Código institucional del estudiante
            <input value={user.code} readOnly className="readonly-code-input" title="Código institucional asociado a tu cuenta" />
            <span className="form-field-hint">Código único asignado a tu perfil institucional (no editable).</span>
          </label>
          <label>Tipo de acompañamiento
            <select name="type">
              <option>Monitoría</option>
              <option>Tutoría</option>
            </select>
          </label>
          <label>Prioridad estimada
            <select name="priority" defaultValue="Media">
              <option>Media</option>
              <option>Alta</option>
              <option>Baja</option>
            </select>
          </label>
        </div>
        <label>Asignatura registrada en MariaDB
          <select name="subject" required defaultValue="">
            <option value="">Selecciona la asignatura que estás cursando</option>
            {subjects.map((s) => <option key={s.id} value={s.nombre}>[{s.codigo}] {s.nombre}</option>)}
          </select>
        </label>
        <label>Motivo y necesidad académica
          <textarea
            name="reason"
            required
            minLength={5}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe brevemente los temas o dificultades que deseas reforzar (ej. Repaso para parcial de cálculo o apoyo en ejercicios prácticos)..."
          />
          <div className="form-field-meta">
            <span>{reason.length}/500 caracteres</span>
          </div>
        </label>
        <button className="primary-button" type="submit"><Send size={17} /> Enviar solicitud</button>
        {sent && <div className="success-message"><Check size={16} /> Solicitud registrada con éxito en MariaDB. Puedes seguir su avance en “Mis solicitudes”.</div>}
      </form>
    </section>
  </>
}

function MyRequests({ requests }: { requests: Request[] }) {
  return <>
    <PageHeader eyebrow="Mi espacio / Solicitudes" title="Mis solicitudes" description="Consulta el estado de las solicitudes de acompañamiento que has realizado." />
    <section className="panel table-panel">
      <div className="table-meta"><span><strong>{requests.length}</strong> solicitudes asociadas a tu cuenta</span><span>Datos de MariaDB</span></div>
      <div className="table-scroll"><table>
        <thead><tr><th>ASIGNATURA</th><th>TIPO</th><th>PRIORIDAD</th><th>ESTADO</th><th>FECHA</th></tr></thead>
        <tbody>{requests.length ? requests.map((request) => <tr key={request.id}>
          <td><div className="request-cell"><div className="request-id">#{String(request.id).padStart(4, '0')}</div><div><strong>{request.subject}</strong><span>Solicitud de acompañamiento</span></div></div></td>
          <td>{request.type}</td>
          <td><span className={`priority ${request.priority.toLowerCase()}`}><span />{request.priority}</span></td>
          <td><RequestStatus status={request.status} />{request.status==='Cancelada'&&request.cancellationReason&&<small className="table-subtext cancellation-note">Motivo de cancelación: {request.cancellationReason}</small>}</td>
          <td><span className="muted-cell">{request.date}</span></td>
        </tr>) : <tr><td colSpan={5}><div className="activity-empty">Aún no tienes solicitudes registradas.</div></td></tr>}</tbody>
      </table></div>
    </section>
  </>
}

function AssignedRequests({ accessToken, activeRole, requests, onChange }: { accessToken: string; activeRole: PortalRole; requests: Request[]; onChange: (requests: Request[]) => void }) {
  const assigned=requests.filter(request=>['Asignada','Atendida','Cancelada','Rechazada','Finalizada'].includes(request.status));const [canceling,setCanceling]=useState<Request|null>(null);const [error,setError]=useState('');const [search,setSearch]=useState('');const [status,setStatus]=useState('Todas')
  const statuses=['Todas',...new Set(assigned.map(row=>row.status))];const filtered=assigned.filter(row=>(status==='Todas'||row.status===status)&&`${row.student} ${row.subject} ${row.type} ${row.priority}`.toLowerCase().includes(search.trim().toLowerCase()))
  const pending=assigned.filter(row=>row.status==='Asignada').length;const completed=assigned.filter(row=>['Atendida','Finalizada'].includes(row.status)).length;const canceled=assigned.filter(row=>['Cancelada','Rechazada'].includes(row.status)).length
  const accept=async(request:Request)=>{try{const saved=await decideTutorRequest(accessToken,request.id,{action:'accept'});onChange(requests.map(item=>item.id===request.id?saved as Request:item));setError('')}catch(e){setError(e instanceof ApiError?e.message:'No se pudo confirmar el acompañamiento.')}}
  const markAttended=async(request:Request)=>{if(!window.confirm(`¿Confirmas que atendiste la solicitud de ${request.student} en ${request.subject}?`))return;try{const saved=await markAssignedRequestAttended(accessToken,request.id);onChange(requests.map(item=>item.id===request.id?saved as Request:item));setError('')}catch(e){setError(e instanceof ApiError?e.message:'No se pudo marcar la solicitud como atendida.')}}
  const cancel=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!canceling)return;const reason=String(new FormData(event.currentTarget).get('reason')??'');try{const saved=await decideTutorRequest(accessToken,canceling.id,{action:'cancel',reason});onChange(requests.map(item=>item.id===canceling.id?saved as Request:item));setCanceling(null);setError('')}catch(e){setError(e instanceof ApiError?e.message:'No se pudo cancelar la solicitud.')}}
  return <><PageHeader eyebrow={`Mi espacio / Solicitudes · ${activeRole}`} title="Solicitudes asignadas" description={activeRole==='Tutor'?'Revisa cada solicitud, confirma la tutoría o registra una cancelación justificada.':'Consulta tus solicitudes de monitoría y confirma su atención.'}/>{error&&<div className="error-message">{error}</div>}<section className="request-queue-summary"><div><span className="eyebrow">Bandeja de trabajo</span><h2>{pending?`${pending} solicitud${pending===1?'':'es'} requieren atención`:'Solicitudes al día'}</h2><p>Consulta el contexto, el estudiante y el estado antes de realizar una acción.</p></div><div className="request-queue-stats"><span><strong>{pending}</strong>Pendientes</span><span><strong>{completed}</strong>Atendidas</span><span><strong>{canceled}</strong>Canceladas</span></div></section><section className="panel request-management-panel"><div className="request-toolbar"><label className="request-search"><Search size={18}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar estudiante, asignatura o tipo" aria-label="Buscar solicitudes"/></label><label className="request-status-filter">Estado<select value={status} onChange={event=>setStatus(event.target.value)}>{statuses.map(value=><option key={value}>{value}</option>)}</select></label><span className="sessions-result-count">{filtered.length} resultado{filtered.length===1?'':'s'}</span></div><div className="assigned-request-list">{filtered.map(request=><article className="assigned-request-card" key={request.id}><div className="assigned-request-top"><span className="request-id">Solicitud #{String(request.id).padStart(4,'0')}</span><div className="assigned-request-tags"><span className={`priority ${request.priority.toLowerCase()}`}><span/>{request.priority}</span><RequestStatus status={request.status}/></div></div><div className="assigned-request-content"><div><span className="assigned-request-label">ESTUDIANTE</span><h3>{request.student}</h3><span className="assigned-request-subtitle">{request.type} · {request.date}</span></div><div><span className="assigned-request-label">ASIGNATURA</span><h3>{request.subject}</h3><span className="assigned-request-subtitle">Acompañamiento vinculado a tu asignación</span></div></div>{request.cancellationReason&&<div className="cancellation-reason"><strong>Justificación de cancelación</strong><p>{request.cancellationReason}</p></div>}<div className="assigned-request-footer"><span><ClipboardIcon/> La actualización se guarda en el historial de la solicitud</span><div className="actions-inline">{['Tutor','Monitor'].includes(activeRole)&&request.status==='Asignada'&&<><button className="primary-button small-button" onClick={()=>void accept(request)}><Check size={16}/> Confirmar {activeRole==='Tutor'?'tutoría':'monitoría'}</button><button className="secondary-button small-button" onClick={()=>setCanceling(request)}><X size={16}/> Cancelar con motivo</button></>}{activeRole==='Monitor'&&request.status==='Asignada'&&<button className="primary-button small-button" onClick={()=>void markAttended(request)}><Check size={16}/> Marcar atendida</button>}</div></div></article>)}{!filtered.length&&<div className="sessions-empty"><ClipboardIcon/><strong>{assigned.length?'No hay solicitudes para esos filtros.':'No tienes solicitudes asignadas.'}</strong><span>{assigned.length?'Prueba con otro estado o término de búsqueda.':'Cuando administración asigne una tutoría o monitoría aparecerá aquí.'}</span></div>}</div></section>{canceling&&<Modal title="Cancelar tutoría" subtitle={`Solicitud #${canceling.id} · ${canceling.student} · ${canceling.subject}`} onClose={()=>setCanceling(null)}><form className="modal-form cancellation-form" onSubmit={cancel}><div className="cancellation-context"><CircleAlert size={19}/><p>La solicitud se notificará al estudiante y a administración. La justificación quedará visible en el historial.</p></div><label>Motivo de la cancelación<span className="required-mark">*</span><textarea name="reason" required minLength={5} maxLength={1000} placeholder="Explica brevemente el motivo y cualquier detalle útil para reprogramar la tutoría."/></label><small className="form-field-hint">Entre 5 y 1000 caracteres. El estudiante podrá consultar este motivo.</small><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setCanceling(null)}>Volver</button><button className="danger-button" type="submit">Confirmar cancelación</button></div></form></Modal>}</>
}
function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Dashboard({ users, spaces, requests, data, onNavigate }: { users: User[]; spaces: Space[]; requests: Request[]; data: AdminDashboard | null; onNavigate: (view: View) => void }) {
  const pending = data?.summary.requests.pending ?? requests.filter((request) => request.status === 'Pendiente').length
  const activeSpaces = data?.summary.spaces.active ?? spaces.filter((space) => space.status === 'Activo').length
  const userTotal = data?.summary.users.total ?? users.length
  const sessionTotal = data?.summary.sessions.total ?? 0
  const months = data?.charts.byMonth ?? []
  const subjects = (data?.charts.bySubject ?? []).filter((item) => item.sessions > 0).slice(0, 6)
  const statuses = data?.charts.byRequestStatus ?? []
  const maxMonth = Math.max(1, ...months.map((item) => Number(item.total)))
  const maxSubject = Math.max(1, ...subjects.map((item) => Number(item.sessions)))
  return <>
    <PageHeader eyebrow="Supervisión académica" title="Dashboard administrativo" description="Resumen operativo de tutorías, monitorías, usuarios, espacios y solicitudes conectado a MariaDB." action={<button className="secondary-button" onClick={() => onNavigate('reportes')}><FileDown size={17} /> Generar reporte</button>} />
    <section className="metrics-grid"><MetricCard label="Usuarios registrados" value={String(userTotal)} detail={`${data?.summary.users.active ?? userTotal} activos`} icon={<UsersRound size={20} />} tone="blue" /><MetricCard label="Solicitudes pendientes" value={String(pending).padStart(2, '0')} detail="Requieren atención" icon={<Clock3 size={20} />} tone="amber" /><MetricCard label="Espacios disponibles" value={String(activeSpaces).padStart(2, '0')} detail={`De ${data?.summary.spaces.total ?? spaces.length} registrados`} icon={<Building2 size={20} />} tone="green" /><MetricCard label="Sesiones registradas" value={String(sessionTotal)} detail={`${data?.summary.sessions.completed ?? 0} finalizadas`} icon={<Activity size={20} />} tone="purple" /></section>
    <div className="admin-chart-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h3>Sesiones por periodo</h3><p>Comportamiento de los acompañamientos registrados.</p></div><BarChart3 size={21} /></div><div className="bar-chart">{months.length ? months.map((item) => <div className="bar-column" key={item.period}><span className="bar-value">{item.total}</span><div className="bar-track"><div className="bar-fill blue-fill" style={{ height: `${Math.max(8, Number(item.total) / maxMonth * 100)}%` }} /></div><small>{item.period}</small></div>) : <EmptyChart text="No hay sesiones registradas en los últimos seis meses." />}</div></section><section className="panel chart-panel"><div className="panel-heading"><div><h3>Estado de solicitudes</h3><p>Distribución actual de las solicitudes.</p></div><Activity size={21} /></div><div className="status-summary">{statuses.map((item) => <div className="status-summary-row" key={item.status}><span className={`status-summary-dot ${item.status.toLowerCase()}`} /><strong>{item.status}</strong><b>{item.total}</b></div>)}</div></section></div>
    <div className="admin-chart-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h3>Asignaturas con acompañamiento</h3><p>Sesiones acumuladas por asignatura.</p></div><BookOpen size={21} /></div><div className="horizontal-bars">{subjects.length ? subjects.map((item) => <div className="horizontal-bar" key={item.id}><div><span>{item.name}</span><b>{item.sessions}</b></div><div className="horizontal-track"><div className="horizontal-fill" style={{ width: `${Math.max(5, Number(item.sessions) / maxSubject * 100)}%` }} /></div></div>) : <EmptyChart text="No hay sesiones asociadas a asignaturas." />}</div></section><section className="panel chart-panel"><div className="panel-heading"><div><h3>Supervisión por rol</h3><p>Personas y sesiones asignadas.</p></div><ShieldCheck size={21} /></div><div className="role-overview">{(data?.charts.byRole ?? []).map((item) => <div className="role-overview-card" key={item.role}><span className="role-pill">{item.role}</span><strong>{item.people}</strong><small>personas · {item.sessions} sesiones</small></div>)}</div><button className="text-button" onClick={() => onNavigate('solicitudes')}>Revisar solicitudes <ArrowRight size={15} /></button></section></div>
  </>
}

function EmptyChart({ text }: { text: string }) { return <div className="empty-chart"><BarChart3 size={28} /><span>{text}</span></div> }

function MetricCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: ReactNode; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-label">{label}</div><strong>{value}</strong><span className={tone === 'amber' ? 'metric-detail warning' : 'metric-detail'}>{detail}</span></div>
}

function formatDate(value:string){return new Intl.DateTimeFormat('es-CO',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`))}

function ActivityRow({ title, description, time, color }: { title: string; description: string; time: string; color: string }) {
  return <div className="activity-row"><span className={`activity-dot ${color}`} /><div><strong>{title}</strong><span>{description}</span></div><time>{time}</time></div>
}

function RoleProfileFields({ roles, catalogs, user }: { roles: Role[]; catalogs: AdminCatalogs | null; user: User | null }) {
  const profiles = user?.profiles ?? {}
  const admin = profiles.administrador
  const student = profiles.estudiante
  const tutor = profiles.tutor
  const monitor = profiles.monitor
  const periods = catalogs?.periods ?? []
  const subjects = catalogs?.subjects ?? []
  const tutorAssignments = Array.isArray(tutor?.assignments) ? tutor.assignments : []
  const monitorAssignments = Array.isArray(monitor?.assignments) ? monitor.assignments : []
  return <div className="role-profile-sections">
    <p className="form-section-title">Información específica de los roles seleccionados</p>
    {roles.includes('Administrador') && <fieldset className="role-profile-fieldset"><legend><ShieldCheck size={15} /> Administrador</legend><div className="form-columns"><label>Cargo<input name="adminCargo" required minLength={2} maxLength={120} defaultValue={admin?.cargo ?? ''} placeholder="Coordinación académica" /></label><label>Dependencia<input name="adminDependency" required minLength={2} maxLength={120} defaultValue={admin?.dependencia ?? ''} placeholder="Facultad o dependencia" /></label></div><label>Observaciones del rol<textarea name="adminObservations" maxLength={300} defaultValue={admin?.observaciones ?? ''} placeholder="Responsabilidades o notas del rol" /></label></fieldset>}
    {roles.includes('Estudiante') && <fieldset className="role-profile-fieldset"><legend><GraduationCap size={15} /> Estudiante</legend><div className="form-columns"><label>Semestre actual<select name="studentSemester" defaultValue={student?.semestre || 1}>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => <option key={s} value={s}>Semestre {s}</option>)}</select></label><label>Programa académico<select name="studentProgramId" required defaultValue={student?.programId ?? ''}><option value="">Selecciona un programa académico de la universidad</option>{(catalogs?.programs ?? []).map((program) => <option key={program.id} value={program.id}>{program.codigo} · {program.nombre}</option>)}</select></label></div></fieldset>}
    {roles.includes('Tutor') && <fieldset className="role-profile-fieldset"><legend><GraduationCap size={15} /> Tutor</legend><div className="form-columns"><label>Categoría docente<select name="tutorCategory" defaultValue={tutor?.teachingCategory ?? 'Profesor Asistente'}><option>Profesor Titular</option><option>Profesor Asociado</option><option>Profesor Asistente</option><option>Profesor Auxiliar</option><option>Docente Ocasional</option><option>Docente Catedrático</option></select></label><label>Tipo de vinculación<select name="tutorEmployment" defaultValue={tutor?.employmentType ?? 'Tiempo completo'}><option>Tiempo completo</option><option>Medio tiempo</option><option>Cátedra</option><option>Planta</option></select></label><label>Periodo académico<select name="tutorPeriodId" required defaultValue={tutorAssignments[0]?.periodId ?? periods.find((period) => period.estado === 'Activo')?.id ?? ''}>{periods.map((period) => <option key={period.id} value={period.id}>{period.nombre} · {period.estado}</option>)}</select></label><label>Horas semanales<input type="number" min="1" max="60" name="tutorHours" required defaultValue={tutor?.weeklyHours ?? 20} /></label></div><SubjectAssignmentSelect label="Asignatura asignada (MariaDB)" name="tutorSubjectIds" subjects={subjects} selectedIds={tutorAssignments.filter((assignment) => assignment.status === 'Activa').map((assignment) => assignment.subjectId)} /><label>Observaciones del tutor<textarea name="tutorObservations" defaultValue={tutor?.observations ?? ''} placeholder="Notas docentes, disponibilidad horaria o restricciones" /></label></fieldset>}
    {roles.includes('Monitor') && <fieldset className="role-profile-fieldset"><legend><BookOpen size={15} /> Monitor</legend><div className="form-columns"><label>Tipo de monitor<select name="monitorType" defaultValue={monitor?.monitorType ?? 'Monitor académico'}><option>Monitor académico</option><option>Monitor de investigación</option><option>Monitor de bienestar</option><option>Monitor de laboratorio</option><option>Monitor par</option></select></label><label>Resolución<input name="monitorResolution" defaultValue={monitor?.resolution ?? ''} placeholder="Ej. Resolución 2026-01" /></label><label>Periodo académico<select name="monitorPeriodId" required defaultValue={monitorAssignments[0]?.periodId ?? periods.find((period) => period.estado === 'Activo')?.id ?? ''}>{periods.map((period) => <option key={period.id} value={period.id}>{period.nombre} · {period.estado}</option>)}</select></label><label>Horas semanales<input type="number" min="1" max="60" name="monitorHours" required defaultValue={monitor?.weeklyHours ?? 10} /></label></div><SubjectAssignmentSelect label="Asignatura de monitoría (MariaDB)" name="monitorSubjectIds" subjects={subjects} selectedIds={monitorAssignments.filter((assignment) => assignment.status === 'Activa').map((assignment) => assignment.subjectId)} /><label>Observaciones del monitor<textarea name="monitorObservations" defaultValue={monitor?.observations ?? ''} placeholder="Notas operativas, horarios asignados" /></label></fieldset>}
  </div>
}

function SubjectAssignmentSelect({ label, name, subjects, selectedIds }: { label: string; name: string; subjects: AdminCatalogs['subjects']; selectedIds: number[] }) {
  const initialSubjectId = selectedIds[0] ?? ''
  const [selected, setSelected] = useState<number | ''>(initialSubjectId)

  useEffect(() => {
    setSelected(initialSubjectId)
  }, [initialSubjectId])

  return (
    <label className="single-subject-field">{label}
      <select name={name} value={selected} required onChange={(event) => setSelected(Number(event.target.value) || '')}>
        <option value="">Selecciona una asignatura</option>
        {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.codigo} · {subject.nombre}</option>)}
      </select>
      <small className="form-field-hint">Cada tutor o monitor puede tener una sola asignatura asignada por este formulario.</small>
    </label>
  )
}

function UsersView({ users, accessToken, catalogs, onChange, currentUserId }: { users: User[]; accessToken: string; catalogs: AdminCatalogs | null; onChange: (users: User[]) => void; currentUserId?: number }) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('Todos los roles')
  const [status, setStatus] = useState('Todos los estados')
  const [modal, setModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([])
  const [userCode, setUserCode] = useState('')

  const filtered = users.filter((user) => `${user.name} ${user.email} ${user.code} ${user.document ?? ''}`.toLowerCase().includes(query.toLowerCase()) && (role === 'Todos los roles' || user.roles.includes(role as Role)) && (status === 'Todos los estados' || user.status === status))

  const openCreate = () => {
    setEditingUser(null)
    setSelectedRoles([])
    setUserCode('')
    setModal(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setSelectedRoles(user.roles)
    setUserCode(user.code)
    setModal(true)
  }

  const handleRolesToggle = (availableRole: Role) => {
    const next = selectedRoles.includes(availableRole)
      ? selectedRoles.filter((r) => r !== availableRole)
      : [...selectedRoles, availableRole]
    if (selectedRoles.includes(availableRole) === false && !isValidUserRoleSet(next)) return
    setSelectedRoles(next)
    if (!editingUser) {
      setUserCode(next.length > 0 ? generateUserCode(next, users.map((u) => u.code)) : '')
    }
  }

  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const roles = selectedRoles
    if (!isValidUserRoleSet(roles)) {
      window.alert('Selecciona al menos un rol. Combinaciones permitidas: Administrador solo, Tutor solo, Estudiante solo o Monitor con Estudiante.')
      return
    }
    const email = String(form.get('email') ?? '').trim().toLowerCase()
    const phone = String(form.get('phone') ?? '').trim()
    const document = String(form.get('document') ?? '').trim()
    const code = editingUser ? editingUser.code : (userCode || String(form.get('code') ?? '').trim().toUpperCase())
    const profiles: RoleProfiles = {}
    if (roles.includes('Administrador')) {
      profiles.administrador = { cargo: String(form.get('adminCargo') ?? ''), dependencia: String(form.get('adminDependency') ?? ''), institutionalEmail: String(form.get('adminInstitutionalEmail') ?? email), observaciones: String(form.get('adminObservations') ?? '') }
    }
    if (roles.includes('Estudiante')) {
      const sem = Number(form.get('studentSemester') ?? 1)
      profiles.estudiante = { studentCode: code, semestre: sem, semester: sem, programId: Number(form.get('studentProgramId') ?? 0) } as any
    }
    if (roles.includes('Tutor')) {
      const periodId = Number(form.get('tutorPeriodId') ?? 0) || catalogs?.periods.find((period) => period.estado === 'Activo')?.id || 1
      const tutorHours = Number(form.get('tutorHours') ?? 0) || 20
      profiles.tutor = { teachingCategory: String(form.get('tutorCategory') ?? ''), employmentType: String(form.get('tutorEmployment') ?? ''), currentPeriod: catalogs?.periods.find((period) => period.id === periodId)?.nombre ?? '2026-2', weeklyHours: tutorHours, observations: String(form.get('tutorObservations') ?? ''), assignments: { subjectIds: form.getAll('tutorSubjectIds').map(Number).filter(Boolean), periodId, weeklyHours: tutorHours } }
    }
    if (roles.includes('Monitor')) {
      const periodId = Number(form.get('monitorPeriodId') ?? 0) || catalogs?.periods.find((period) => period.estado === 'Activo')?.id || 1
      const monitorHours = Number(form.get('monitorHours') ?? 0) || 10
      profiles.monitor = { monitorType: String(form.get('monitorType') ?? ''), resolution: String(form.get('monitorResolution') ?? ''), currentPeriod: catalogs?.periods.find((period) => period.id === periodId)?.nombre ?? '2026-2', weeklyHours: monitorHours, observations: String(form.get('monitorObservations') ?? ''), assignments: { subjectIds: form.getAll('monitorSubjectIds').map(Number).filter(Boolean), periodId, weeklyHours: monitorHours } }
    }
    try {
      if (editingUser) {
        const saved = await updateUserApi(accessToken, editingUser.id, { code, document, name, email, phone, roles, profiles })
        onChange(users.map((user) => user.id === editingUser.id ? saved as User : user))
      } else {
        const saved = await createUserApi(accessToken, { code, document, name, email, phone, roles, profiles })
        onChange([saved as User, ...users])
      }
      setModal(false)
      setEditingUser(null)
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible guardar el usuario.')
    }
  }

  const deleteUserPermanently = async (user: User) => {
    if (currentUserId && user.id === currentUserId) {
      window.alert('No puedes eliminar tu propia cuenta de usuario en sesión activa.')
      return
    }
    if (!window.confirm(`¿Eliminar permanentemente al usuario ${user.name} (${user.code})?\n\nSolo se permite si no tiene historial académico u operativo y no es el último administrador. Si tiene registros asociados, desactiva la cuenta para conservarlos.`)) {
      return
    }
    try {
      await deleteUserApi(accessToken, user.id)
      onChange(users.filter((item) => item.id !== user.id))
      window.alert(`El usuario ${user.name} fue eliminado correctamente de MariaDB.`)
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible eliminar el usuario.')
    }
  }

  const toggleUser = async (user: User) => {
    try {
      const saved = await updateUserApi(accessToken, user.id, { status: user.status === 'Activo' ? 'Inactivo' : 'Activo' })
      onChange(users.map((item) => item.id === user.id ? saved as User : item))
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible actualizar el estado.')
    }
  }

  return <>
    <PageHeader eyebrow="Administración / Usuarios" title="Gestión de usuarios" description="Administra accesos, roles y perfiles académicos vinculados a MariaDB." action={<button className="primary-button" onClick={openCreate}><Plus size={18} /> Nuevo usuario</button>} />
    <section className="panel table-panel">
      <div className="table-toolbar">
        <div className="search-input"><Search size={17} /><input placeholder="Buscar por nombre, código, documento o correo..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          <option>Todos los roles</option>
          <option>Administrador</option>
          <option>Estudiante</option>
          <option>Monitor</option>
          <option>Tutor</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option>Todos los estados</option>
          <option>Activo</option>
          <option>Inactivo</option>
        </select>
        <button className="secondary-button filter-button" type="button" onClick={() => { setQuery(''); setRole('Todos los roles'); setStatus('Todos los estados') }}><RefreshCw size={16} /> Limpiar filtros</button>
      </div>
      <div className="table-meta"><span><strong>{filtered.length}</strong> usuarios encontrados</span><span>Datos persistidos en MariaDB</span></div>
      <div className="table-scroll"><table>
        <thead><tr><th>USUARIO</th><th>ROLES</th><th>CONTACTO</th><th>ESTADO</th><th className="align-right">ACCIONES</th></tr></thead>
        <tbody>{filtered.map((user) => <tr key={user.id}>
          <td><div className="person-cell"><div className="mini-avatar">{user.initials}</div><div><strong>{user.name}</strong><span>{user.code} · {user.document ?? 'Sin documento'}</span></div></div></td>
          <td><div className="user-roles">{user.roles.map((userRole) => <span className="role-pill" key={userRole}>{userRole}</span>)}</div></td>
          <td><span className="muted-cell">{user.email}</span></td>
          <td><StatusPill status={user.status} /></td>
          <td className="align-right">
            <div className="action-group">
              <button className="row-action" onClick={() => openEdit(user)} title="Editar datos del usuario">Editar</button>
              <button className="row-action" onClick={() => toggleUser(user)} title={user.status === 'Activo' ? 'Desactivar usuario' : 'Activar usuario'}>
                {user.status === 'Activo' ? 'Desactivar' : 'Activar'}
              </button>
              <button className="row-action danger-action" onClick={() => deleteUserPermanently(user)} title="Eliminar permanentemente de la base de datos">
                Eliminar
              </button>
            </div>
          </td>
        </tr>)}</tbody>
      </table></div>
    </section>
    {modal && <Modal title={editingUser ? 'Editar usuario' : 'Nuevo usuario'} subtitle="Los campos específicos aparecen según el o los roles seleccionados." onClose={() => setModal(false)}>
      <form className="modal-form" onSubmit={saveUser} key={editingUser?.id ?? 'new'}>
        <div className="form-columns">
          <label>Código institucional
            <div className="generated-code-wrapper">
              <input
                name="code"
                required={selectedRoles.length > 0}
                value={editingUser ? editingUser.code : userCode}
                readOnly
                className="readonly-code-input"
                title="Código institucional autogenerado según el rol"
              />
              {!editingUser && (
                <button
                  type="button"
                  className="regenerate-code-btn"
                  disabled={selectedRoles.length === 0}
                  onClick={() => setUserCode(generateUserCode(selectedRoles, users.map((u) => u.code)))}
                  title="Generar otro código aleatorio"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
            <span className="form-field-hint">{selectedRoles.length ? 'Código generado automáticamente según el rol seleccionado (no editable).' : 'Selecciona un rol para generar el código institucional.'}</span>
          </label>
          <label>Documento de identidad<input name="document" required minLength={5} maxLength={20} pattern="[0-9]{5,20}" inputMode="numeric" autoComplete="off" defaultValue={editingUser?.document ?? ''} placeholder="Ej. 1093432540" /></label>
        </div>
        <label>Nombre completo<input name="name" required minLength={5} maxLength={160} pattern="[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)+" title="Ingresa nombre y apellido usando letras, espacios, apóstrofes o guiones; no se admiten números." autoComplete="name" defaultValue={editingUser?.name ?? ''} placeholder="Ej. Ana María López" /></label>
        <label>Correo institucional<input type="email" name="email" required maxLength={120} pattern=".+@unitropico[.]edu[.]co" title="Usa tu correo institucional @unitropico.edu.co." autoComplete="email" defaultValue={editingUser?.email ?? ''} placeholder="correo@unitropico.edu.co" /></label>
        <label>Número de contacto (opcional)<input type="tel" name="phone" maxLength={20} pattern="\+?[0-9\s().-]{7,20}" title="Ingresa al menos 7 dígitos; puedes usar +, espacios, paréntesis, puntos o guiones." autoComplete="tel" defaultValue={editingUser?.phone ?? ''} placeholder="Ej. +57 310 123 4567" /><small className="form-field-hint">Dato de contacto no obligatorio.</small></label>
        <fieldset className="role-options">
          <legend>Roles de acceso</legend>
          {(['Administrador', 'Tutor', 'Monitor', 'Estudiante'] as Role[]).map((availableRole) => (
            <label className="role-option" key={availableRole}>
              <input
                type="checkbox"
                name="roles"
                value={availableRole}
                checked={selectedRoles.includes(availableRole)}
                disabled={!selectedRoles.includes(availableRole) && !isValidUserRoleSet([...selectedRoles, availableRole])}
                onChange={() => handleRolesToggle(availableRole)}
              />
              <span>{availableRole}</span>
            </label>
          ))}
          <small className="form-field-hint">Administrador y Tutor son exclusivos. Monitor solo puede combinarse con Estudiante.</small>
        </fieldset>
        <RoleProfileFields roles={selectedRoles} catalogs={catalogs} user={editingUser} />
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={() => setModal(false)}>Cancelar</button>
          <button className="primary-button" type="submit">{editingUser ? 'Guardar cambios' : 'Crear usuario'}</button>
        </div>
      </form>
    </Modal>}
  </>
}

function AcademicCatalogView({ kind, accessToken, catalogs, onCatalogsChange }: { kind: 'subjects' | 'programs'; accessToken: string; catalogs: AdminCatalogs | null; onCatalogsChange: (catalogs: AdminCatalogs) => void }) {
  const [subjects, setSubjects] = useState<AdminSubject[]>([])
  const [programs, setPrograms] = useState<AdminProgram[]>([])
  const [faculties, setFaculties] = useState<AdminFaculty[]>([])
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(false)
  const [facultyModal, setFacultyModal] = useState(false)
  const [facultyEditing, setFacultyEditing] = useState<AdminFaculty | null>(null)
  const [editing, setEditing] = useState<AdminSubject | AdminProgram | null>(null)
  const [loading, setLoading] = useState(false)
  const isSubjects = kind === 'subjects'
  const load = async () => {
    setLoading(true)
    try {
      if (isSubjects) setSubjects(await listAdminSubjects(accessToken))
      else { const [result, facultyRows] = await Promise.all([listAdminPrograms(accessToken), listAdminFaculties(accessToken)]); setPrograms(result.data); setFaculties(facultyRows) }
    } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible cargar el catálogo académico.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [accessToken, kind])
  const rows = (isSubjects ? subjects : programs).filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(query.toLowerCase()))
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const status = String(form.get('status')) as 'Activo' | 'Inactivo'
    try {
      if (isSubjects) {
        const input = { code: String(form.get('code')).trim(), name: String(form.get('name')).trim(), credits: String(form.get('credits') ?? '') ? Number(form.get('credits')) : null, description: String(form.get('description') ?? '').trim(), status }
        const saved = editing ? await updateAdminSubject(accessToken, editing.id, input) : await createAdminSubject(accessToken, input)
        const next = editing ? subjects.map((row) => row.id === saved.id ? saved : row) : [saved, ...subjects]
        setSubjects(next)
        if (catalogs) onCatalogsChange({ ...catalogs, subjects: next.filter((row) => row.status === 'Activo').map(({ id, code, name }) => ({ id, codigo: code, nombre: name })) })
      } else {
        const input = { code: String(form.get('code')).trim(), name: String(form.get('name')).trim(), snies: String(form.get('snies') ?? '').trim(), facultyId: Number(form.get('facultyId')), status }
        const saved = editing ? await updateAdminProgram(accessToken, editing.id, input) : await createAdminProgram(accessToken, input)
        const next = editing ? programs.map((row) => row.id === saved.id ? saved : row) : [saved, ...programs]
        setPrograms(next)
        if (catalogs) onCatalogsChange({ ...catalogs, programs: next.filter((row) => row.status === 'Activo').map(({ id, code, name, facultyId, facultyName }) => ({ id, codigo: code, nombre: name, facultyId, facultyName })) })
      }
      setModal(false); setEditing(null)
    } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible guardar el registro académico.') }
  }
  const saveFaculty = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    try {
      const input={name:String(form.get('name')??'').trim(),description:String(form.get('description')??'').trim()}
      const status=String(form.get('status')??'Activo') as 'Activo'|'Inactivo'
      const saved=facultyEditing?await updateAdminFaculty(accessToken,facultyEditing.id,{...input,status}):await createAdminFaculty(accessToken,input)
      const next=facultyEditing?faculties.map(row=>row.id===saved.id?saved:row):[...faculties,saved]
      setFaculties(next.sort((a,b)=>a.name.localeCompare(b.name,'es')))
      if(catalogs)onCatalogsChange({...catalogs,faculties:next.filter(row=>row.status!=='Inactivo').map(({id,name})=>({id,nombre:name}))})
      setFacultyModal(false);setFacultyEditing(null)
    } catch(error) { window.alert(error instanceof ApiError?error.message:'No fue posible registrar la facultad.') }
  }
  const removeFaculty=async(faculty:AdminFaculty)=>{if(!window.confirm(`¿Eliminar la facultad «${faculty.name}»? Si tiene programas relacionados, primero debes desactivarla.`))return;try{await deleteAdminFaculty(accessToken,faculty.id);const next=faculties.filter(row=>row.id!==faculty.id);setFaculties(next);if(catalogs)onCatalogsChange({...catalogs,faculties:next.filter(row=>row.status!=='Inactivo').map(({id,name})=>({id,nombre:name}))})}catch(error){window.alert(error instanceof ApiError?error.message:'No fue posible eliminar la facultad.')}}
  const remove = async (item: AdminSubject | AdminProgram) => {
    if (!window.confirm(`¿Eliminar ${isSubjects ? 'la asignatura' : 'el programa'} «${item.name}»? Si tiene registros relacionados, deberás desactivarlo para conservar el historial.`)) return
    try {
      if (isSubjects) { await deleteAdminSubject(accessToken,item.id); const next=subjects.filter((row)=>row.id!==item.id); setSubjects(next); if(catalogs) onCatalogsChange({...catalogs,subjects:next.filter((row)=>row.status==='Activo').map(({id,code,name})=>({id,codigo:code,nombre:name}))}) }
      else { await deleteAdminProgram(accessToken,item.id); const next=programs.filter((row)=>row.id!==item.id); setPrograms(next); if(catalogs) onCatalogsChange({...catalogs,programs:next.filter((row)=>row.status==='Activo').map(({id,code,name,facultyId,facultyName})=>({id,codigo:code,nombre:name,facultyId,facultyName}))}) }
    } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible eliminar el registro.') }
  }
  return <><PageHeader eyebrow="Administración / Catálogos" title={isSubjects ? 'Gestión de asignaturas' : 'Gestión de programas académicos'} description={isSubjects ? 'Administra códigos, nombres, créditos y descripciones de las asignaturas.' : 'Administra programas, códigos SNIES y facultades asociadas.'} action={<div className="action-button-group">{!isSubjects&&<button className="secondary-button" onClick={()=>setFacultyModal(true)}><Plus size={17}/> Nueva facultad</button>}<button className="primary-button" onClick={() => { setEditing(null); setModal(true) }}><Plus size={17} /> Nuevo {isSubjects ? 'asignatura' : 'programa'}</button></div>} />
    <section className="panel table-panel"><div className="table-toolbar"><div className="search-input"><Search size={17} /><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={`Buscar ${isSubjects ? 'asignatura' : 'programa'}...`} /></div><button className="secondary-button" onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/>{loading?'Actualizando...':'Actualizar'}</button></div><div className="table-scroll"><table><thead><tr><th>CÓDIGO</th><th>NOMBRE</th>{isSubjects?<><th>CRÉDITOS</th><th>DESCRIPCIÓN</th></>:<><th>SNIES</th><th>FACULTAD</th></>}<th>ESTADO</th><th className="align-right">ACCIONES</th></tr></thead><tbody>{rows.map((item)=>{const subject=isSubjects?item as AdminSubject:null; const program=isSubjects?null:item as AdminProgram; return <tr key={item.id}><td><strong>{item.code}</strong></td><td>{item.name}</td>{subject?<><td>{subject.credits??'—'}</td><td>{subject.description||'—'}</td></>:<><td>{program?.snies||'—'}</td><td>{program?.facultyName||'—'}</td></>}<td>{item.status}</td><td className="align-right"><div className="actions-inline"><button className="row-action" onClick={()=>{setEditing(item);setModal(true)}}>Editar</button><button className="delete-action" onClick={()=>void remove(item)} title="Eliminar"> <Trash2 size={16}/></button></div></td></tr>})}{!rows.length&&<tr><td colSpan={6}>No se encontraron registros.</td></tr>}</tbody></table></div></section>
     {!isSubjects&&<section className="panel table-panel"><div className="panel-heading"><div><h3>Facultades institucionales</h3><p>{faculties.length} facultades registradas · administra sus datos y disponibilidad.</p></div></div><div className="table-scroll"><table><thead><tr><th>FACULTAD</th><th>DESCRIPCIÓN</th><th>PROGRAMAS</th><th>ESTADO</th><th className="align-right">ACCIONES</th></tr></thead><tbody>{faculties.map(faculty=><tr key={faculty.id}><td><strong>{faculty.name}</strong></td><td>{faculty.description||'—'}</td><td>{faculty.programCount??0}</td><td>{faculty.status??'Activo'}</td><td className="align-right"><div className="actions-inline"><button className="row-action" onClick={()=>{setFacultyEditing(faculty);setFacultyModal(true)}}>Editar</button><button className="delete-action" title="Eliminar facultad" onClick={()=>void removeFaculty(faculty)}><Trash2 size={16}/></button></div></td></tr>)}{!faculties.length&&<tr><td colSpan={5} className="empty-table-cell">No hay facultades registradas.</td></tr>}</tbody></table></div></section>}
     {modal&&<Modal title={`${editing?'Editar':'Nueva'} ${isSubjects?'asignatura':'programa'}`} subtitle="Los datos se validan antes de guardarse en MariaDB." onClose={()=>{setModal(false);setEditing(null)}}><form className="modal-form" onSubmit={save}><div className="form-columns"><label>Código<input name="code" required maxLength={20} minLength={2} pattern="[A-Za-z0-9][A-Za-z0-9-]*" defaultValue={editing?.code??''} placeholder={isSubjects?'MAT-101':'ING-SIS'}/></label><label>Nombre<input name="name" required minLength={2} maxLength={isSubjects?150:120} defaultValue={editing?.name??''}/></label></div>{isSubjects?<><div className="form-columns"><label>Créditos (opcional)<input name="credits" type="number" min={1} max={30} step={1} defaultValue={(editing as AdminSubject|null)?.credits??''}/></label><label>Estado<select name="status" defaultValue={editing?.status??'Activo'}><option>Activo</option><option>Inactivo</option></select></label></div><label>Descripción<textarea name="description" maxLength={300} defaultValue={(editing as AdminSubject|null)?.description??''}/></label></>:<><div className="form-columns"><label>Registro SNIES (opcional)<input name="snies" maxLength={30} defaultValue={(editing as AdminProgram|null)?.snies??''}/></label><label>Facultad<select name="facultyId" required defaultValue={(editing as AdminProgram|null)?.facultyId??''}><option value="">Selecciona una facultad</option>{faculties.filter(faculty=>faculty.status!=='Inactivo'||faculty.id===(editing as AdminProgram|null)?.facultyId).map((faculty)=><option key={faculty.id} value={faculty.id}>{faculty.name}</option>)}</select></label></div><label>Estado<select name="status" defaultValue={editing?.status??'Activo'}><option>Activo</option><option>Inactivo</option></select></label></>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>{setModal(false);setEditing(null)}}>Cancelar</button><button className="primary-button" type="submit">{editing?'Guardar cambios':'Registrar'}</button></div></form></Modal>}
     {facultyModal&&<Modal title={`${facultyEditing?'Editar':'Registrar'} facultad`} subtitle="Las facultades relacionadas con programas se pueden desactivar para conservar el historial." onClose={()=>{setFacultyModal(false);setFacultyEditing(null)}}><form className="modal-form" onSubmit={saveFaculty}><label>Nombre de la facultad<input name="name" required minLength={2} maxLength={120} defaultValue={facultyEditing?.name??''}/></label><label>Descripción (opcional)<textarea name="description" maxLength={250} defaultValue={facultyEditing?.description??''}/></label>{facultyEditing&&<label>Estado<select name="status" defaultValue={facultyEditing.status??'Activo'}><option>Activo</option><option>Inactivo</option></select></label>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>{setFacultyModal(false);setFacultyEditing(null)}}>Cancelar</button><button className="primary-button" type="submit">{facultyEditing?'Guardar cambios':'Registrar facultad'}</button></div></form></Modal>}
  </>
}

function SpacesView({ spaces, accessToken, onChange }: { spaces: Space[]; accessToken: string; onChange: (spaces: Space[]) => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todos los estados')
  const [type, setType] = useState('Todos los tipos')
  const [building, setBuilding] = useState('Todos los edificios')
  const [modal, setModal] = useState(false)
  const [editingSpace, setEditingSpace] = useState<Space | null>(null)
  const [spaceType, setSpaceType] = useState('Aula')
  const [spaceCode, setSpaceCode] = useState(() => generateSpaceCode('Aula', spaces.map((s) => s.code)))
  const [previewBuilding, setPreviewBuilding] = useState('')
  const [previewBlock, setPreviewBlock] = useState('')
  const [previewRoom, setPreviewRoom] = useState('')
  const [previewFloor, setPreviewFloor] = useState('')
  const [previewRef, setPreviewRef] = useState('')

  const displayBuilding = (space: Space) => space.building || (space.block ? `Bloque ${space.block}` : '')
  const buildings = [...new Set(spaces.map(displayBuilding).filter(Boolean))]
  const filtered = spaces.filter((space) => `${space.name} ${space.code} ${space.location} ${displayBuilding(space)} ${space.room ?? ''}`.toLowerCase().includes(query.toLowerCase()) && (status === 'Todos los estados' || space.status === status) && (type === 'Todos los tipos' || space.type === type) && (building === 'Todos los edificios' || displayBuilding(space) === building))

  const openCreate = () => {
    setEditingSpace(null)
    setSpaceType('Aula')
    setSpaceCode(generateSpaceCode('Aula', spaces.map((s) => s.code)))
    setPreviewBuilding('')
    setPreviewBlock('')
    setPreviewRoom('')
    setPreviewFloor('')
    setPreviewRef('')
    setModal(true)
  }
  const openEdit = (space: Space) => {
    setEditingSpace(space)
    setSpaceType(space.type || 'Aula')
    setSpaceCode(space.code)
    setPreviewBuilding(space.building ?? '')
    setPreviewBlock(space.block ?? '')
    setPreviewRoom(space.room ?? '')
    setPreviewFloor(space.floor ?? '')
    setPreviewRef('')
    setModal(true)
  }
  const handleSpaceTypeChange = (newType: string) => {
    setSpaceType(newType)
    if (!editingSpace) {
      setSpaceCode(generateSpaceCode(newType, spaces.map((s) => s.code)))
    }
  }
  const saveSpace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const buildingVal = String(form.get('building') ?? '').trim()
    const blockVal = String(form.get('block') ?? '').trim()
    const roomVal = String(form.get('room') ?? '').trim()
    const floorVal = String(form.get('floor') ?? '').trim()
    const refVal = String(form.get('reference') ?? '').trim()
    const autoLocation = [buildingVal, blockVal && `Bloque ${blockVal}`, roomVal && `Salón ${roomVal}`, floorVal && `Piso ${floorVal}`].filter(Boolean).join(' · ')
    const location = refVal ? (autoLocation ? `${autoLocation} (${refVal})` : refVal) : (autoLocation || editingSpace?.location || (spaceType === 'Virtual' ? 'Virtual' : ''))

    if (spaceType !== 'Virtual' && ![buildingVal, blockVal, roomVal, refVal, editingSpace?.location].some((value) => value?.trim())) {
      window.alert('Indica al menos el edificio, bloque, salón o una referencia de ubicación para el espacio.')
      return
    }
    if (location.length > 200) {
      window.alert('La ubicación calculada supera los 200 caracteres. Reduce la referencia o los datos de ubicación.')
      return
    }

    const spaceData = {
      code: spaceCode.trim().toUpperCase(),
      name: String(form.get('name') ?? '').trim(),
      building: buildingVal,
      block: blockVal,
      room: roomVal,
      floor: floorVal,
      location,
      description: String(form.get('description') ?? '').trim(),
      resources: String(form.get('resources') ?? '').trim(),
      observations: String(form.get('observations') ?? '').trim(),
      capacity: Number(form.get('capacity') ?? 0),
      type: spaceType,
      status: String(form.get('status') ?? 'Activo') as Status,
    }
    try {
      if (editingSpace) {
        const saved = await updateSpaceApi(accessToken, editingSpace.id, spaceData)
        onChange(spaces.map((space) => space.id === editingSpace.id ? saved as Space : space))
      } else {
        const saved = await createSpaceApi(accessToken, spaceData)
        onChange([saved as Space, ...spaces])
      }
      setModal(false)
      setEditingSpace(null)
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible guardar el espacio.')
    }
  }
  const deleteSpacePermanently = async (space: Space) => {
    if (!window.confirm(`¿Eliminar permanentemente el espacio "${space.name}" (${space.code})?\n\nSolo se permite si no tiene horarios, reservas o sesiones asociadas. Si está en uso, desactívalo para conservar el historial.`)) return
    try {
      await deleteSpaceApi(accessToken, space.id)
      onChange(spaces.filter((item) => item.id !== space.id))
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible eliminar el espacio.')
    }
  }
  const toggleSpace = async (space: Space) => {
    const nextStatus = space.status === 'Activo' ? 'Inactivo' : 'Activo'
    try {
      const saved = await updateSpaceApi(accessToken, space.id, { status: nextStatus })
      onChange(spaces.map((item) => item.id === space.id ? saved as Space : item))
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible actualizar el estado del espacio.')
    }
  }
  const clearFilters = () => { setQuery(''); setStatus('Todos los estados'); setType('Todos los tipos'); setBuilding('Todos los edificios') }

  const calculatedLocation = [previewBuilding, previewBlock && `Bloque ${previewBlock}`, previewRoom && `Salón ${previewRoom}`, previewFloor && `Piso ${previewFloor}`].filter(Boolean).join(' · ')
  const locationPreview = previewRef ? (calculatedLocation ? `${calculatedLocation} (${previewRef})` : previewRef) : calculatedLocation

  return <>
    <PageHeader eyebrow="Administración / Espacios" title="Gestión de espacios" description="Registra la ubicación, capacidad, recursos y disponibilidad de los espacios para tutorías y monitorías." action={<button className="primary-button" onClick={openCreate}><Plus size={18} /> Nuevo espacio</button>} />
    <section className="panel table-panel">
      <div className="table-toolbar">
        <div className="search-input"><Search size={17} /><input placeholder="Buscar por código, salón, edificio o ubicación..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option>Todos los tipos</option>
          <option>Aula</option>
          <option>Laboratorio</option>
          <option>Sala</option>
          <option>Sala de informática</option>
          <option>Biblioteca</option>
          <option>Salón de reuniones</option>
          <option>Virtual</option>
          <option>Otro</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option>Todos los estados</option>
          <option>Activo</option>
          <option>Inactivo</option>
        </select>
        <button className="secondary-button filter-button" onClick={clearFilters}><RefreshCw size={16} /> Limpiar</button>
      </div>
      <div className="space-filter-row">
        <label>Edificio
          <select value={building} onChange={(event) => setBuilding(event.target.value)}>
            <option>Todos los edificios</option>
            {buildings.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="table-meta"><span><strong>{filtered.length}</strong> espacios registrados</span><span><span className="legend-dot active-legend" /> Datos de MariaDB</span></div>
      <div className="space-grid">
        {filtered.map((space) => <article className="space-card" key={space.id}>
          <div className="space-card-top"><div className="space-icon"><Building2 size={19} /></div><StatusPill status={space.status} /></div>
          <span className="space-code">{space.code}</span>
          <h3>{space.name}</h3>
          <p>{[space.building, space.block && `Bloque ${space.block}`, space.room && `Salón ${space.room}`, space.floor && `Piso ${space.floor}`].filter(Boolean).join(' · ') || space.location || 'Ubicación pendiente'}</p>
          <div className="space-card-footer"><span><UsersRound size={15} /> Capacidad <b>{space.capacity}</b></span><span>{space.type}</span></div>
          <div className="space-actions">
            <button className="space-toggle" onClick={() => toggleSpace(space)}>{space.status === 'Activo' ? 'Desactivar' : 'Activar'}</button>
            <button className="row-action" onClick={() => openEdit(space)}>Editar</button>
            <button className="row-action danger-action" onClick={() => deleteSpacePermanently(space)} title="Eliminar permanentemente de la base de datos">Eliminar</button>
          </div>
        </article>)}
      </div>
    </section>
    {modal && <Modal title={editingSpace ? 'Editar espacio' : 'Nuevo espacio'} subtitle="Completa la ficha física y operativa del espacio académico." wide onClose={() => setModal(false)}>
      <form className="modal-form" onSubmit={saveSpace} key={editingSpace?.id ?? 'new'}>
        <div className="form-columns">
          <label>Código del espacio
            <div className="generated-code-wrapper">
              <input
                name="code"
                value={spaceCode}
                readOnly
                className="readonly-code-input"
                title="Código institucional autogenerado según el tipo de espacio"
              />
              {!editingSpace && (
                <button
                  type="button"
                  className="regenerate-code-btn"
                  onClick={() => setSpaceCode(generateSpaceCode(spaceType, spaces.map((s) => s.code)))}
                  title="Generar otro código aleatorio"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
            <span className="form-field-hint">Código institucional generado automáticamente según el tipo de espacio (no editable).</span>
          </label>
          <label>Nombre del espacio<input name="name" required minLength={2} maxLength={120} defaultValue={editingSpace?.name ?? ''} placeholder="Ej. Laboratorio de sistemas" /></label>
        </div>
        <div className="form-columns">
          <label>Edificio<input name="building" maxLength={80} defaultValue={editingSpace?.building ?? ''} placeholder="Edificio principal" onChange={(e) => setPreviewBuilding(e.target.value)} /></label>
          <label>Bloque<input name="block" maxLength={20} defaultValue={editingSpace?.block ?? ''} placeholder="A" onChange={(e) => setPreviewBlock(e.target.value)} /></label>
          <label>Salón / aula<input name="room" maxLength={20} defaultValue={editingSpace?.room ?? ''} placeholder="202B" onChange={(e) => setPreviewRoom(e.target.value)} /></label>
          <label>Piso<input name="floor" maxLength={10} defaultValue={editingSpace?.floor ?? ''} placeholder="2" onChange={(e) => setPreviewFloor(e.target.value)} /></label>
        </div>
        <div className="location-preview-badge">
          <strong>Ubicación calculada:</strong>
          <span>{locationPreview || (editingSpace?.location || 'Se autogenerará según edificio, bloque, salón y piso')}</span>
        </div>
        {spaceType !== 'Virtual' && <span className="form-field-hint">Para un espacio presencial, registra al menos el edificio, bloque, salón o una referencia de ubicación.</span>}
        <label>Indicación de referencia o acceso (opcional)
          <input name="reference" maxLength={200} defaultValue="" placeholder="Ej. Costado occidental, frente a la cafetería central" onChange={(e) => setPreviewRef(e.target.value)} />
          <span className="form-field-hint">Esta referencia complementará de forma automática los datos físicos del espacio sin redundancia.</span>
        </label>
        <div className="form-columns">
          <label>Tipo de espacio
            <select name="type" value={spaceType} onChange={(e) => handleSpaceTypeChange(e.target.value)}>
              <option>Aula</option>
              <option>Laboratorio</option>
              <option>Sala</option>
              <option>Sala de informática</option>
              <option>Biblioteca</option>
              <option>Salón de reuniones</option>
              <option>Virtual</option>
              <option>Otro</option>
            </select>
          </label>
          <label>Capacidad de estudiantes<input name="capacity" type="number" min="1" max="1000" step="1" inputMode="numeric" required defaultValue={editingSpace?.capacity ?? ''} placeholder="30" /></label>
          <label>Estado operativo
            <select name="status" defaultValue={editingSpace?.status ?? 'Activo'}>
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
          </label>
        </div>
        <label>Descripción y características<textarea name="description" maxLength={300} defaultValue={editingSpace?.description ?? ''} placeholder="Condiciones de iluminación, aire acondicionado, mobiliario..." /></label>
        <label>Recursos y tecnología disponible<textarea name="resources" maxLength={500} defaultValue={editingSpace?.resources ?? ''} placeholder="Video beam, tablero acrílico, computadores con software especializado..." /></label>
        <label>Observaciones de uso<textarea name="observations" maxLength={300} defaultValue={editingSpace?.observations ?? ''} placeholder="Horarios de mantenimiento, solicitud previa de llaves..." /></label>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={() => setModal(false)}>Cancelar</button>
          <button className="primary-button" type="submit">{editingSpace ? 'Guardar cambios' : 'Crear espacio'}</button>
        </div>
      </form>
    </Modal>}
  </>
}

function RequestsView({ requests, accessToken, catalogs, onChange }: { requests: Request[]; accessToken: string; catalogs: AdminCatalogs | null; onChange: (requests: Request[]) => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todos los estados')
  const [subjectId, setSubjectId] = useState('Todos')
  const [modal, setModal] = useState(false)
  const [calendarModalOpen, setCalendarModalOpen] = useState(false)
  const [assigningRequest, setAssigningRequest] = useState<Request | null>(null)
  const [assignmentRole, setAssignmentRole] = useState<'Tutor' | 'Monitor'>('Monitor')
  const [assignmentUserId, setAssignmentUserId] = useState('')
  const [assignmentScheduleSlots,setAssignmentScheduleSlots]=useState<AdminRequestSlot[]>([])
  const [assignmentSlotKey,setAssignmentSlotKey]=useState('')
  const [assignmentSlotsLoading,setAssignmentSlotsLoading]=useState(false)
  const [requestScheduleSlots,setRequestScheduleSlots]=useState<AdminRequestSlot[]>([])
  const [requestSlotKey,setRequestSlotKey]=useState('')
  const [requestSlotsLoading,setRequestSlotsLoading]=useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [motiveText, setMotiveText] = useState('')
  const [newRequestType, setNewRequestType] = useState<'Monitoría' | 'Tutoría' | 'Acompañamiento'>('Monitoría')
  const [newRequestSubjectId, setNewRequestSubjectId] = useState('')
  const [newRequestPeriodId, setNewRequestPeriodId] = useState('')
  const [newRequestStaffRole, setNewRequestStaffRole] = useState<'Tutor' | 'Monitor'>('Monitor')
  const [newRequestStaffId, setNewRequestStaffId] = useState('')
  const [radicadoCode, setRadicadoCode] = useState(() => `RAD-2026-${Math.floor(1000 + Math.random() * 9000)}`)
  const requestTypes = catalogs?.requestTypes.map((item) => item.nombre).filter((name): name is 'Monitoría' | 'Tutoría' | 'Acompañamiento' => ['Monitoría', 'Tutoría', 'Acompañamiento'].includes(name as never)) ?? []
  const currentStudent = catalogs?.students.find((s) => s.id === selectedStudentId)
  const createAssignmentRole: 'Tutor' | 'Monitor' = newRequestType === 'Acompañamiento' ? newRequestStaffRole : newRequestType === 'Tutoría' ? 'Tutor' : 'Monitor'
  const createEligibleStaff = catalogs?.staffAssignments.filter((item) => item.subjectId === Number(newRequestSubjectId) && item.periodId === Number(newRequestPeriodId) && item.role === createAssignmentRole) ?? []

  useEffect(()=>{
    let active=true
    setRequestScheduleSlots([]);setRequestSlotKey('');setRequestSlotsLoading(false)
    if(!newRequestStaffId||!newRequestSubjectId||!newRequestPeriodId)return
    setRequestSlotsLoading(true)
    void listAdminRequestSlots(accessToken,{userId:Number(newRequestStaffId),role:createAssignmentRole,subjectId:Number(newRequestSubjectId),periodId:Number(newRequestPeriodId)})
      .then(rows=>{if(active)setRequestScheduleSlots(rows)}).catch(error=>{if(active)window.alert(error instanceof ApiError?error.message:'No fue posible consultar el horario del responsable.')}).finally(()=>{if(active)setRequestSlotsLoading(false)})
    return ()=>{active=false}
  },[accessToken,newRequestStaffId,newRequestSubjectId,newRequestPeriodId,createAssignmentRole])

  useEffect(()=>{
    let active=true
    setAssignmentScheduleSlots([]);setAssignmentSlotKey('');setAssignmentSlotsLoading(false)
    if(!assigningRequest||!assignmentUserId||!assigningRequest.subjectId||!assigningRequest.periodId)return
    setAssignmentSlotsLoading(true)
    void listAdminRequestSlots(accessToken,{userId:Number(assignmentUserId),role:assignmentRole,subjectId:assigningRequest.subjectId,periodId:assigningRequest.periodId})
      .then(rows=>{if(active)setAssignmentScheduleSlots(rows)}).catch(error=>{if(active)window.alert(error instanceof ApiError?error.message:'No fue posible consultar el horario del responsable.')}).finally(()=>{if(active)setAssignmentSlotsLoading(false)})
    return ()=>{active=false}
  },[accessToken,assigningRequest,assignmentUserId,assignmentRole])

  const filtered = requests.filter((request) => `${request.student} ${request.subject} ${request.program ?? ''} ${request.motive ?? ''}`.toLowerCase().includes(query.toLowerCase()) && (status === 'Todos los estados' || request.status === status) && (subjectId === 'Todos' || String(request.subjectId) === subjectId))
  const updateStatus = async (id: number, nextStatus: Request['status']) => {
    try {
      const saved = await updateRequestApi(accessToken, id, nextStatus)
      onChange(requests.map((request) => request.id === id ? saved as Request : request))
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible actualizar la solicitud.')
    }
  }
  const deleteRequestPermanently = async (request: Request) => {
    if (['Asignada','Atendida','Finalizada'].includes(request.status)) { window.alert('Una solicitud asignada o atendida no se puede eliminar; cambia su estado si necesitas cerrarla y conserva el historial.'); return }
    if (!window.confirm(`¿Eliminar permanentemente la solicitud #${String(request.id).padStart(4, '0')} (${request.student} · ${request.subject})?\n\nSolo se permite para solicitudes no asignadas y sin sesiones ni clasificaciones. Los registros académicos asociados se conservan; cambia el estado para cerrar solicitudes en curso.`)) return
    try {
      await deleteRequestApi(accessToken, request.id)
      onChange(requests.filter((item) => item.id !== request.id))
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible eliminar la solicitud.')
    }
  }
  const createRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const studentId = Number(form.get('studentId'))
    const student = catalogs?.students.find((item) => item.id === studentId)
    const selectedSlot=requestScheduleSlots.find(slot=>`${slot.date}|${slot.startTime}|${slot.endTime}|${slot.modality}`===String(form.get('scheduleSlot')))
    if(!newRequestStaffId||!selectedSlot){window.alert('Selecciona un responsable y una fecha disponible de su horario preestablecido.');return}
    if (!student?.programId) {
      window.alert('El estudiante seleccionado no tiene un programa académico activo.')
      return
    }
    let savedRequest: Request
    try {
      const saved = await createAdminRequest(accessToken, {
        studentId,
        programId: student.programId,
        subjectId: Number(form.get('subjectId')),
        type: String(form.get('type')) as 'Monitoría' | 'Tutoría' | 'Acompañamiento',
        priority: String(form.get('priority')) as 'Alta' | 'Media' | 'Baja',
        motive: motiveText.trim() || String(form.get('motive') ?? ''),
        description: String(form.get('description') ?? ''),
        periodId: Number(form.get('periodId')) || undefined,
      })
      savedRequest = saved as Request
      onChange([savedRequest, ...requests])
      const staffId = Number(form.get('assignedUserId'))
      if (staffId) {
      try {
          const assigned = await assignRequestApi(accessToken, savedRequest.id, {
            userId: staffId,
            role: newRequestType === 'Acompañamiento' ? newRequestStaffRole : newRequestType === 'Tutoría' ? 'Tutor' : 'Monitor',
            date: selectedSlot.date,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            modality: selectedSlot.modality,
          })
          onChange([assigned as Request, ...requests])
        } catch (assignmentError) {
          setModal(false)
          window.alert(`La solicitud quedó creada (#${savedRequest.id}), pero no se pudo asignar el responsable: ${assignmentError instanceof ApiError ? assignmentError.message : 'Error al programar la primera sesión.'} Puedes asignarla luego desde Gestión de solicitudes.`)
          setSelectedStudentId(null)
          setMotiveText('')
          return
        }
      }
      setModal(false)
      setSelectedStudentId(null)
      setMotiveText('')
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible crear la solicitud.')
    }
  }
  const clearFilters = () => { setQuery(''); setStatus('Todos los estados'); setSubjectId('Todos') }
  const eligibleAssignments = catalogs?.staffAssignments.filter((item) => item.subjectId === assigningRequest?.subjectId && item.periodId === assigningRequest?.periodId && item.role === assignmentRole) ?? []
  const openAssignment = (request: Request) => { setAssigningRequest(request); setAssignmentRole(request.type === 'Tutoría' ? 'Tutor' : 'Monitor'); setAssignmentUserId('');setAssignmentScheduleSlots([]);setAssignmentSlotKey('') }
  const submitAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!assigningRequest) return
    const form = new FormData(event.currentTarget)
    const selectedSlot=assignmentScheduleSlots.find(slot=>`${slot.date}|${slot.startTime}|${slot.endTime}|${slot.modality}`===String(form.get('scheduleSlot')))
    if(!selectedSlot){window.alert('Selecciona una fecha y un bloque horario disponible del responsable.');return}
    try {
      const saved = await assignRequestApi(accessToken, assigningRequest.id, { userId: Number(form.get('userId')), role: assignmentRole, date: selectedSlot.date, startTime: selectedSlot.startTime, endTime: selectedSlot.endTime, modality: selectedSlot.modality })
      onChange(requests.map((item) => item.id === assigningRequest.id ? saved as Request : item))
      setAssigningRequest(null)
    } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible asignar la solicitud.') }
  }

  return <>
    <PageHeader
      eyebrow="Administración / Solicitudes"
      title="Gestión de solicitudes"
      description="Crea solicitudes SAT o de acompañamiento, revisa su prioridad y controla el flujo de atención."
      action={
        <div className="action-button-group">
          <button type="button" className="secondary-button" onClick={() => setCalendarModalOpen(true)}>
            <CalendarDays size={17} /> Ver calendario
          </button>
          <button type="button" className="primary-button" onClick={() => { setSelectedStudentId(null); setMotiveText(''); setNewRequestType(requestTypes[0] ?? 'Monitoría'); setNewRequestSubjectId(''); setNewRequestPeriodId(String(catalogs?.periods.find((period) => period.estado === 'Activo')?.id ?? '')); setNewRequestStaffRole('Monitor'); setNewRequestStaffId(''); setRadicadoCode(`RAD-2026-${Math.floor(1000 + Math.random() * 9000)}`); setModal(true) }}>
            <Plus size={18} /> Nueva solicitud
          </button>
        </div>
      }
    />
    <section className="panel table-panel">
      <div className="table-toolbar">
        <div className="search-input"><Search size={17} /><input placeholder="Buscar por estudiante, programa, asignatura o motivo..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
          <option value="Todos">Todas las asignaturas</option>
          {(catalogs?.subjects ?? []).map((subject) => <option key={subject.id} value={subject.id}>[{subject.codigo}] {subject.nombre}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option>Todos los estados</option>
          <option>Pendiente</option>
          <option>Aprobada</option>
          <option>Asignada</option>
          <option>Rechazada</option>
          <option>Cancelada</option>
          <option>Atendida</option>
          <option>Finalizada</option>
        </select>
        <button className="secondary-button filter-button" onClick={clearFilters}><RefreshCw size={16} /> Limpiar</button>
      </div>
      <div className="table-meta"><span><strong>{filtered.length}</strong> solicitudes encontradas</span><span><span className="priority-dot" /> Datos persistidos en MariaDB</span></div>
      <div className="table-scroll"><table><thead><tr><th>SOLICITUD</th><th>PROGRAMA</th><th>TIPO</th><th>PRIORIDAD</th><th>ESTADO</th><th>FECHA</th><th className="align-right">ACCIONES</th></tr></thead><tbody>{filtered.map((request) => <tr key={request.id}><td><div className="request-cell"><div className="request-id">#{String(request.id).padStart(4, '0')}</div><div><strong>{request.subject}</strong><span>{request.student}</span>{request.motive && <small className="table-subtext">{request.motive}</small>}{request.cancellationReason && <small className="table-subtext cancellation-note">Cancelación del tutor: {request.cancellationReason}</small>}</div></div></td><td>{request.program ?? '—'}</td><td><span className="type-label"><span className={request.type === 'Monitoría' ? 'type-dot blue-dot' : 'type-dot purple-dot'} />{request.type}</span></td><td><span className={`priority ${request.priority.toLowerCase()}`}><span />{request.priority}</span></td><td><RequestStatus status={request.status} /></td><td><span className="muted-cell">{request.date}</span></td><td className="align-right"><div className="actions-inline">{['Pendiente','Aprobada'].includes(request.status)&&<><button className="reject-action" onClick={()=>void updateStatus(request.id,'Cancelada')} title="Cancelar solicitud">Cancelar</button><button className="row-action" onClick={() => openAssignment(request)}>Asignar tutor/monitor</button></>}{request.status==='Atendida'&&<button className="row-action" onClick={()=>void updateStatus(request.id,'Finalizada')}>Cerrar solicitud</button>}<button className="delete-action" onClick={() => deleteRequestPermanently(request)} title="Eliminar permanentemente de MariaDB"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>
    </section>

    {calendarModalOpen && <CalendarModal requests={requests} onClose={() => setCalendarModalOpen(false)} />}

    {assigningRequest && <Modal title="Asignar acompañamiento" subtitle={`${assigningRequest.student} · ${assigningRequest.subject} · ${assigningRequest.period ?? 'Periodo actual'}`} wide onClose={() => setAssigningRequest(null)}><form className="modal-form" onSubmit={submitAssignment}><div className="form-columns"><label>Rol responsable<select value={assignmentRole} onChange={(event) => { setAssignmentRole(event.target.value as 'Tutor' | 'Monitor'); setAssignmentUserId('') }}><option value="Monitor">Monitor</option><option value="Tutor">Tutor</option></select></label><label>{assignmentRole} con asignación activa<select name="userId" required value={assignmentUserId} onChange={(event) => setAssignmentUserId(event.target.value)}><option value="">Selecciona una persona</option>{eligibleAssignments.map((item) => <option key={`${item.role}-${item.userId}`} value={item.userId}>{item.name} · {item.weeklyHours} h/semana</option>)}</select>{eligibleAssignments.length === 0 && <small className="form-field-hint">No hay {assignmentRole.toLowerCase()} asignados a esta asignatura y periodo. Revisa Gestión de usuarios.</small>}</label></div><label>Fecha y bloque horario disponible<select name="scheduleSlot" required value={assignmentSlotKey} onChange={event=>setAssignmentSlotKey(event.target.value)}><option value="">{assignmentSlotsLoading?"Consultando horarios…":"Selecciona una fecha y bloque del horario activo"}</option>{assignmentScheduleSlots.map(slot=>{const key=`${slot.date}|${slot.startTime}|${slot.endTime}|${slot.modality}`;return <option key={key} value={key}>{formatDate(slot.date)} · {slot.day} · {slot.startTime}–{slot.endTime} · {slot.modality}</option>})}</select>{!assignmentSlotsLoading&&!assignmentScheduleSlots.length&&assignmentUserId&&<small className="form-field-hint">El responsable no tiene fechas libres en su horario activo para este periodo. Revisa su horario semanal o selecciona otra persona.</small>}</label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAssigningRequest(null)}>Cancelar</button><button className="primary-button" type="submit" disabled={!eligibleAssignments.length || !assignmentUserId}><CalendarClock size={17} /> Asignar y programar sesión</button></div></form></Modal>}

    {modal && <Modal title="Crear solicitud administrativa" subtitle="Selecciona al estudiante y la asignatura en MariaDB." wide onClose={() => setModal(false)}>
      <form className="modal-form" onSubmit={createRequest}>
        <div className="form-columns">
          <label>Estudiante solicitante
            <select name="studentId" required defaultValue="" onChange={(e) => setSelectedStudentId(Number(e.target.value) || null)}>
              <option value="">Selecciona un estudiante</option>
              {(catalogs?.students ?? []).map((student) => <option key={student.id} value={student.id} disabled={!student.programId}>{student.name} · {student.studentCode} · {student.programName ?? 'Sin programa'}</option>)}
            </select>
          </label>
          <label>Asignatura de MariaDB
            <select name="subjectId" required value={newRequestSubjectId} onChange={(event) => { setNewRequestSubjectId(event.target.value); setNewRequestStaffId('') }}>
              <option value="">Selecciona una asignatura</option>
              {(catalogs?.subjects ?? []).map((subject) => <option key={subject.id} value={subject.id}>[{subject.codigo}] {subject.nombre}</option>)}
            </select>
          </label>
        </div>

        {currentStudent && (
          <div className="student-selected-banner">
            <div>
              <strong>Estudiante: {currentStudent.name} ({currentStudent.studentCode})</strong>
              <span>Programa académico: {currentStudent.programName ?? 'Sin programa activo'}</span>
            </div>
          </div>
        )}

        <div className="form-columns">
          <label>Radicado institucional
            <div className="generated-code-wrapper">
              <input
                value={radicadoCode}
                readOnly
                className="readonly-code-input"
                title="Radicado institucional generado automáticamente"
              />
              <button
                type="button"
                className="regenerate-code-btn"
                onClick={() => setRadicadoCode(`RAD-2026-${Math.floor(1000 + Math.random() * 9000)}`)}
                title="Generar otro radicado aleatorio"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <span className="form-field-hint">Código de radicado asignado automáticamente para seguimiento de la solicitud (no editable).</span>
          </label>
          <label>Periodo académico
            <select name="periodId" required value={newRequestPeriodId} onChange={(event) => { setNewRequestPeriodId(event.target.value); setNewRequestStaffId('') }}>
              {(catalogs?.periods ?? []).map((period) => <option key={period.id} value={period.id}>{period.nombre} · {period.estado}</option>)}
            </select>
          </label>
          <label>Tipo de acompañamiento
            <select name="type" value={newRequestType} onChange={(event) => { const nextType = event.target.value as typeof newRequestType; setNewRequestType(nextType); setNewRequestStaffRole(nextType === 'Tutoría' ? 'Tutor' : 'Monitor'); setNewRequestStaffId('') }}>
              {(requestTypes.length ? requestTypes : ['Monitoría', 'Tutoría', 'Acompañamiento']).map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>Nivel de prioridad
            <select name="priority" defaultValue="Alta">
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
          </label>
        </div>
        {newRequestType === 'Acompañamiento' && <label>Rol responsable
          <select value={newRequestStaffRole} onChange={(event) => { setNewRequestStaffRole(event.target.value as 'Tutor' | 'Monitor'); setNewRequestStaffId('') }}><option value="Monitor">Monitor</option><option value="Tutor">Tutor</option></select>
        </label>}
        {newRequestSubjectId && newRequestPeriodId && <section className="request-assignment-fields" aria-label="Asignación del acompañamiento">
          <label>{createAssignmentRole} responsable
            <select name="assignedUserId" required value={newRequestStaffId} onChange={(event) => setNewRequestStaffId(event.target.value)}>
              <option value="">{createEligibleStaff.length ? `Selecciona ${createAssignmentRole.toLowerCase()}` : `No hay ${createAssignmentRole.toLowerCase()} asignados disponibles`}</option>
              {createEligibleStaff.map((person) => <option key={`${person.role}-${person.userId}`} value={person.userId}>{person.name} · {person.weeklyHours} h/semana</option>)}
            </select>
            {createEligibleStaff.length === 0 && <small className="form-field-hint">Registra primero el horario semanal del tutor o monitor en su asignación; luego podrás enrutarle la solicitud para confirmación.</small>}
          </label>
          {newRequestStaffId && <><label>Fecha y bloque horario disponible<select name="scheduleSlot" required value={requestSlotKey} onChange={event=>setRequestSlotKey(event.target.value)}><option value="">{requestSlotsLoading?"Consultando horarios…":"Selecciona una fecha y bloque del horario activo"}</option>{requestScheduleSlots.map(slot=>{const key=`${slot.date}|${slot.startTime}|${slot.endTime}|${slot.modality}`;return <option key={key} value={key}>{formatDate(slot.date)} · {slot.day} · {slot.startTime}–{slot.endTime} · {slot.modality}</option>})}</select>{!requestSlotsLoading&&!requestScheduleSlots.length&&newRequestStaffId&&<small className="form-field-hint">El responsable no tiene fechas libres en su horario activo para este periodo. Revisa su horario semanal o selecciona otra persona.</small>}</label></>}
        </section>}
        <label>Motivo principal
          <input
            name="motive"
            required
            minLength={3}
            maxLength={500}
            value={motiveText}
            onChange={(e) => setMotiveText(e.target.value)}
            placeholder="Ej. SAT - tercera vez cursando la asignatura / Alerta temprana académica"
          />
        </label>
        <label>Descripción detallada de la necesidad
          <textarea name="description" required minLength={3} maxLength={500} placeholder="Explica el contexto académico, notas previas, dificultades con los contenidos y apoyo recomendado..." />
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={() => setModal(false)}>Cancelar</button>
          <button className="primary-button" type="submit"><Send size={17} /> Crear solicitud</button>
        </div>
      </form>
    </Modal>}
  </>
}

function ReportsView({ accessToken, catalogs }: { accessToken: string; catalogs: AdminCatalogs | null }) {
  const [report, setReport] = useState<AdminReport | null>(null)
  const [subjectId, setSubjectId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const load = async () => { setLoading(true); try { const params = new URLSearchParams(); if (subjectId) params.set('subjectId', subjectId); if (from) params.set('from', from); if (to) params.set('to', to); setReport(await getAdminReport(accessToken, params.toString())) } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible generar el reporte.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [accessToken])
  const exportReport = () => { if (!report) return; downloadCsv('reporte-acadex.csv', report.bySubject.map((row) => ({ asignatura: row.name, sesiones: row.sessions, finalizadas: row.completed, canceladas: row.cancelled }))) }
  return <><PageHeader eyebrow="Administración / Reportes" title="Reportes académicos" description="Consolida la operación de tutorías y monitorías por asignatura, rol, solicitudes, asistencia y sesiones." action={<button className="secondary-button" onClick={exportReport} disabled={!report}><Download size={17} /> Exportar CSV</button>} /><section className="panel report-filters"><div className="form-columns"><label>Asignatura<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Todas las asignaturas</option>{(catalogs?.subjects ?? []).map((subject) => <option key={subject.id} value={subject.id}>{subject.codigo} · {subject.nombre}</option>)}</select></label><label>Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Hasta<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><button className="primary-button report-run" onClick={() => void load()} disabled={loading}><BarChart3 size={17} /> {loading ? 'Generando...' : 'Generar reporte'}</button></div></section>{report && <div className="report-stack"><section className="admin-chart-grid"><div className="panel chart-panel"><div className="panel-heading"><div><h3>Sesiones por asignatura</h3><p>Incluye sesiones finalizadas y canceladas.</p></div><BookOpen size={20} /></div><div className="horizontal-bars">{report.bySubject.filter((row) => row.sessions > 0).slice(0, 12).map((row) => <div className="horizontal-bar" key={row.id}><div><span>{row.name}</span><b>{row.sessions}</b></div><div className="horizontal-track"><div className="horizontal-fill" style={{ width: `${Math.max(5, Number(row.sessions) / Math.max(1, ...report.bySubject.map((item) => Number(item.sessions))) * 100)}%` }} /></div></div>)}</div></div><div className="panel chart-panel"><div className="panel-heading"><div><h3>Atención por rol</h3><p>Personas y sesiones registradas.</p></div><UsersRound size={20} /></div><div className="role-overview">{report.byRole.map((row) => <div className="role-overview-card" key={row.role}><span className="role-pill">{row.role}</span><strong>{row.people}</strong><small>personas · {row.sessions} sesiones</small></div>)}</div></div></section><section className="admin-report-tables"><div className="panel table-panel"><div className="panel-heading"><div><h3>Estado de solicitudes</h3><p>Consolidado actual del flujo de atención.</p></div></div><div className="table-scroll"><table><thead><tr><th>ESTADO</th><th>TOTAL</th></tr></thead><tbody>{report.byRequestStatus.map((row) => <tr key={row.status}><td>{row.status}</td><td>{row.total}</td></tr>)}</tbody></table></div></div><div className="panel table-panel"><div className="panel-heading"><div><h3>Asistencia</h3><p>Registros de las sesiones atendidas.</p></div></div><div className="table-scroll"><table><thead><tr><th>RESULTADO</th><th>TOTAL</th></tr></thead><tbody>{report.attendance.map((row) => <tr key={row.status}><td>{row.status}</td><td>{row.total}</td></tr>)}</tbody></table></div></div></section><section className="panel table-panel"><div className="panel-heading"><div><h3>Sesiones detalladas</h3><p>Resultado filtrado: {report.sessions.length} registros.</p></div></div><div className="table-scroll"><table><thead><tr><th>FECHA</th><th>ASIGNATURA</th><th>RESPONSABLE</th><th>MODALIDAD</th><th>ESTADO</th></tr></thead><tbody>{report.sessions.map((session, index) => <tr key={String(session.id ?? index)}><td>{String(session.fecha ?? '—')}</td><td>{String(session.subject ?? '—')}</td><td>{String(session.assignedUser ?? '—')}</td><td>{String(session.modalidad ?? '—')}</td><td>{String(session.estado ?? '—')}</td></tr>)}</tbody></table></div></section></div>}</>
}

function DatabaseControlPanel({ accessToken }: { accessToken: string }) {
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null)
  const [dbError, setDbError] = useState('')
  const [loading, setLoading] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      setDbStatus(await getDbStatus(accessToken))
      setDbError('')
    } catch (error) {
      setDbStatus(null)
      setDbError(error instanceof ApiError ? error.message : 'No fue posible consultar MariaDB.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [accessToken])

  return (
    <section className="db-status-panel">
      <div className="db-status-header">
        <div className="db-status-title">
          <div className="db-status-icon"><Database size={22} /></div>
          <div>
            <h3>Control y Observación de MariaDB</h3>
            <p>Monitoreo en vivo de tablas y operaciones CRUD del sistema Acadex.</p>
          </div>
        </div>
        <button type="button" className="secondary-button" onClick={() => void reload()} disabled={loading}>
          <RefreshCw size={15} /> {loading ? 'Consultando...' : 'Refrescar conteos'}
        </button>
      </div>

      {dbError && <div className="form-error"><CircleAlert size={16} />{dbError}</div>}
      <div className="db-overview-cards">
        <div className={`db-card ${dbStatus?.status === 'connected' ? 'status-connected' : ''}`}>
          <span>Estado del motor</span>
          <strong>{dbStatus ? <><span className="db-pulse-dot" /> {dbStatus.status === 'connected' ? 'Conectado' : 'Sin conexión'}</> : 'Sin datos'}</strong>
        </div>
        <div className="db-card">
          <span>Base de datos</span>
          <strong>{dbStatus?.database ?? '—'}</strong>
        </div>
        <div className="db-card">
          <span>Servidor / Puerto</span>
          <strong>{dbStatus?.host ?? '—'}</strong>
        </div>
        <div className="db-card">
          <span>Tablas activas</span>
          <strong>{dbStatus ? `${dbStatus.totalTables} tablas` : '—'}</strong>
        </div>
      </div>

      <div className="db-tables-grid">
        <div className="db-table-chip">
          <small>Usuarios</small>
          <b>{dbStatus?.tables?.Usuario?.total ?? '—'}</b>
        </div>
        <div className="db-table-chip">
          <small>Espacios</small>
          <b>{dbStatus?.tables?.Espacio?.total ?? '—'}</b>
        </div>
        <div className="db-table-chip">
          <small>Solicitudes</small>
          <b>{dbStatus?.tables?.Solicitud?.total ?? '—'}</b>
        </div>
        <div className="db-table-chip">
          <small>Asignaturas</small>
          <b>{dbStatus?.tables?.Asignatura?.total ?? '—'}</b>
        </div>
        <div className="db-table-chip">
          <small>Sesiones</small>
          <b>{dbStatus?.tables?.Sesion?.total ?? '—'}</b>
        </div>
        <div className="db-table-chip">
          <small>Periodos</small>
          <b>{dbStatus?.tables?.PeriodoAcademico?.total ?? '—'}</b>
        </div>
      </div>

      <div className="db-terminal-tip">
        <div>
          <strong>Observación directa en terminal:</strong> Ejecuta <code>npm run db:inspect</code> en la carpeta <code>api/</code> para ver en consola los últimos registros modificados del CRUD.
        </div>
        <span>MariaDB 10.4+</span>
      </div>
    </section>
  )
}

function AcademicPeriodsPanel({ accessToken }: { accessToken: string }) {
  type PeriodForm = { name: string; startDate: string; endDate: string; status: AcademicPeriod['estado'] }
  const emptyForm: PeriodForm = { name: '', startDate: '', endDate: '', status: 'Planeado' }
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [form, setForm] = useState<PeriodForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const load = async () => {
    setLoading(true)
    try { setPeriods(await listAdminPeriods(accessToken)); setError('') }
    catch (loadError) { setError(loadError instanceof ApiError ? loadError.message : 'No fue posible cargar los periodos.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [accessToken])
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingId) await updateAcademicPeriod(accessToken, editingId, form)
      else await createAcademicPeriod(accessToken, form)
      setForm(emptyForm)
      setEditingId(null)
      await load()
    } catch (saveError) { setError(saveError instanceof ApiError ? saveError.message : 'No fue posible guardar el periodo.') }
    finally { setSaving(false) }
  }
  const edit = (period: AcademicPeriod) => {
    setEditingId(period.id)
    setForm({ name: period.nombre, startDate: period.startDate ?? '', endDate: period.endDate ?? '', status: period.estado })
  }
  const remove = async (period: AcademicPeriod) => {
    if (!window.confirm(`¿Eliminar permanentemente el periodo ${period.nombre}? Solo se permite si no está activo y no tiene solicitudes, horarios ni asignaciones asociadas.`)) return
    setError('')
    try { await deleteAcademicPeriod(accessToken, period.id); await load() }
    catch (deleteError) { setError(deleteError instanceof ApiError ? deleteError.message : 'No fue posible eliminar el periodo.') }
  }
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm) }
  return <section className="panel form-panel settings-panel"><div className="panel-heading"><div><h3>Periodos académicos</h3><p>CRUD administrativo. Los periodos vinculados a solicitudes, horarios o asignaciones no se pueden eliminar.</p></div><CalendarDays size={20} /></div>{error && <div className="form-error"><CircleAlert size={16} />{error}</div>}<form className="settings-form" onSubmit={save}><label>Nombre<input required minLength={4} maxLength={20} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="2026-2" /></label><div className="form-columns"><label>Fecha inicial<input type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label>Fecha final<input type="date" required value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label><label>Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AcademicPeriod['estado'] })}><option>Planeado</option><option>Activo</option><option>Finalizado</option></select></label></div><div className="modal-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear periodo'}</button>{editingId && <button type="button" className="secondary-button" onClick={cancelEdit}>Cancelar edición</button>}</div></form><div className="table-scroll"><table><thead><tr><th>PERIODO</th><th>VIGENCIA</th><th>ESTADO</th><th /></tr></thead><tbody>{periods.map((period) => <tr key={period.id}><td><strong>{period.nombre}</strong></td><td>{period.startDate} — {period.endDate}</td><td>{period.estado}</td><td className="align-right"><button className="row-action" onClick={() => edit(period)}>Editar</button><button className="delete-action" onClick={() => void remove(period)} title="Eliminar periodo"><Trash2 size={16} /></button></td></tr>)}{!periods.length && <tr><td colSpan={4}>{loading ? 'Cargando periodos...' : 'No hay periodos registrados.'}</td></tr>}</tbody></table></div></section>
}

function SuspendedAccountsPanel({ accessToken }: { accessToken: string }) {
  const [accounts, setAccounts] = useState<SuspendedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const load = async () => {
    setLoading(true)
    try { setAccounts(await listSuspendedAccounts(accessToken)) }
    catch (error) { window.dispatchEvent(new CustomEvent('acadex:notice', { detail: error instanceof ApiError ? error.message : 'No se pudieron consultar las cuentas suspendidas.' })) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [accessToken])
  const unlock = async (account: SuspendedAccount) => {
    if (!window.confirm(`¿Levantar la suspensión de 24 horas para ${account.name}?`)) return
    setBusyId(account.id)
    try { await unlockSuspendedAccount(accessToken, account.id); await load() }
    catch (error) { window.alert(error instanceof ApiError ? error.message : 'No se pudo levantar la suspensión.') }
    finally { setBusyId(null) }
  }
  return <section className="panel table-panel suspended-accounts-panel"><div className="panel-heading"><div><h3>Cuentas suspendidas</h3><p>Suspensiones por cinco intentos fallidos. Puedes levantarlas antes de que terminen las 24 horas.</p></div><ShieldCheck size={20}/></div><div className="table-scroll"><table><thead><tr><th>CUENTA</th><th>INTENTOS</th><th>FIN DE SUSPENSIÓN</th><th>SOLICITUD</th><th/></tr></thead><tbody>{accounts.map((account)=><tr key={account.id}><td><strong>{account.name}</strong><span className="table-subtext">{account.email}</span></td><td>{account.failedAttempts} de 5</td><td>{new Date(account.lockedUntil).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'})}</td><td>{account.passwordChangeRequested?'Solicitó cambio de contraseña':'—'}</td><td className="align-right"><button className="row-action" type="button" disabled={busyId===account.id} onClick={()=>void unlock(account)}>{busyId===account.id?'Procesando…':'Levantar suspensión'}</button></td></tr>)}{!accounts.length&&<tr><td colSpan={5}>{loading?'Cargando cuentas…':'No hay cuentas suspendidas.'}</td></tr>}</tbody></table></div></section>
}

function ConfigurationView({ accessToken, currentUser }: { accessToken: string; currentUser: User }) {
  const [role, setRole] = useState('')
  const [accounts, setAccounts] = useState<CredentialAccount[]>([])
  const [resetTarget, setResetTarget] = useState<CredentialAccount | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<{ account: CredentialAccount; value: string } | null>(null)
  const [resetError, setResetError] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [exportingSecrets, setExportingSecrets] = useState(false)
  const loadAccounts = async (selectedRole = role) => { setLoading(true); try { setAccounts(await listCredentials(accessToken, selectedRole)) } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible cargar las credenciales.') } finally { setLoading(false) } }
  useEffect(() => { void loadAccounts('') }, [accessToken])
  const reset = (account: CredentialAccount) => { if (account.id === currentUser.id) return; setResetError(''); setResetTarget(account) }
  const confirmReset = async () => {
    if (!resetTarget) return
    setResetBusy(true)
    setResetError('')
    try {
      const result = await resetCredential(accessToken, resetTarget.id)
      setTemporaryPassword({ account: resetTarget, value: result.temporaryPassword })
      setPasswordCopied(false)
      setResetTarget(null)
    } catch (error) { setResetError(error instanceof ApiError ? error.message : 'No fue posible restablecer la credencial.') }
    finally { setResetBusy(false) }
  }
  const copyTemporaryPassword = async () => {
    if (!temporaryPassword) return
    try { await navigator.clipboard.writeText(temporaryPassword.value); setPasswordCopied(true) }
    catch { setPasswordCopied(false) }
  }
  const savePassword = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); try { await changePassword(accessToken, passwords); setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); window.alert('Contraseña actualizada correctamente.') } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible cambiar la contraseña.') } }
  const exportCredentials = () => downloadCsv(`cuentas${role ? `-${role.toLowerCase()}` : ''}.csv`, accounts.map((account) => ({ nombre: account.name, codigo: account.code, correo: account.email, roles: account.roles.join(' / '), estado: account.status })))
  const eligibleForSecretExport = accounts.filter((account) => account.status === 'Activo' && account.id !== currentUser.id && Boolean(role) && account.roles.includes(role as Role))
  const exportTemporaryPasswords = async () => {
    if (!role) { window.alert('Selecciona primero un rol para limitar la exportación.'); return }
    const count = eligibleForSecretExport.length
    if (!count) { window.alert('No hay cuentas activas de ese rol disponibles para exportar. Tu propia cuenta se excluye.'); return }
    if (!window.confirm(`Se generarán claves temporales nuevas para ${count} cuentas activas del rol ${role}. Sus contraseñas actuales dejarán de funcionar. Se descargará un CSV con claves de un solo uso y se exigirá cambiarlas al iniciar sesión. Tu cuenta no se incluirá. Comparte el archivo por un canal seguro. ¿Continuar?`)) return
    setExportingSecrets(true)
    try {
      const result = await exportTemporaryCredentialsApi(accessToken, role as Role)
      downloadCsv(`claves-temporales-${role.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, result.accounts.map((account) => ({ nombre: account.name, codigo: account.code, correo: account.email, roles: account.roles.join(' / '), clave_temporal_un_solo_uso: account.temporaryPassword, cambiar_al_ingresar: 'Sí' })))
      window.alert(`Se descargó el archivo para ${result.accounts.length} cuentas. Las claves solo se devuelven en esta respuesta; guárdalo de forma segura y elimínalo después de entregarlas.`)
    } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible generar la exportación segura.') }
    finally { setExportingSecrets(false) }
  }
  return <><PageHeader eyebrow="Administración / Configuración" title="Configuración y credenciales" description="Gestiona el acceso de usuarios y la operación académica del sistema." action={<button className="secondary-button" onClick={exportCredentials} disabled={!accounts.length}><Download size={17} /> Exportar listado</button>} /><section className="configuration-section"><header className="configuration-section-heading"><span>OPERACIÓN ACADÉMICA</span><h2>Supervisión y periodos</h2><p>Estado de MariaDB y vigencia del calendario académico.</p></header><div className="configuration-stack"><DatabaseControlPanel accessToken={accessToken} /><AcademicPeriodsPanel accessToken={accessToken} /></div></section><section className="configuration-section"><header className="configuration-section-heading"><span>SEGURIDAD</span><h2>Acceso y credenciales</h2><p>Consulta cuentas, restablece claves temporales y actualiza tu contraseña.</p></header><SuspendedAccountsPanel accessToken={accessToken} /><div className="configuration-grid"><section className="panel table-panel"><div className="panel-heading"><div><h3>Credenciales de usuarios</h3><p>Las claves guardadas no se muestran. Solo se exportan claves temporales de un uso.</p></div><KeyRound size={20} /></div><div className="table-toolbar config-toolbar"><select value={role} onChange={(event) => { setRole(event.target.value); void loadAccounts(event.target.value) }}><option value="">Todos los roles</option><option>Administrador</option><option>Estudiante</option><option>Tutor</option><option>Monitor</option></select><button className="secondary-button filter-button" onClick={() => void loadAccounts()}><RefreshCw size={16} /> {loading ? 'Cargando...' : 'Actualizar'}</button></div><div className="credential-export-panel"><div><strong>Exportar claves temporales</strong><span>Selecciona un rol. Las claves actuales se revocan y se exige cambiarlas en el primer acceso.</span></div><button className="secondary-button" type="button" onClick={() => void exportTemporaryPasswords()} disabled={!role || loading || !eligibleForSecretExport.length || exportingSecrets}>{exportingSecrets ? 'Generando...' : `Generar CSV (${eligibleForSecretExport.length})`} <Download size={16} /></button></div><div className="table-scroll"><table><thead><tr><th>USUARIO</th><th>ROLES</th><th>CLAVE</th><th>ESTADO</th><th /></tr></thead><tbody>{accounts.map((account) => <tr key={account.id}><td><strong>{account.name}</strong><span className="table-subtext">{account.email}</span></td><td><div className="user-roles">{account.roles.map((item) => <span className="role-pill" key={item}>{item}</span>)}</div></td><td><code className="credential-code">Protegida</code></td><td>{account.status}</td><td className="align-right"><button className="row-action" disabled={account.id===currentUser.id || account.status!=='Activo'} title={account.id===currentUser.id ? 'Usa el formulario Cambiar mi contraseña' : 'Generar una clave temporal de un solo uso'} onClick={() => void reset(account)}>Generar clave temporal</button></td></tr>)}</tbody></table></div></section><section className="panel form-panel"><div className="panel-heading"><div><h3>Cambiar mi contraseña</h3><p>Usa una contraseña nueva de 8 a 72 caracteres.</p></div><LockKeyhole size={20} /></div><form className="portal-form" onSubmit={savePassword}><label>Contraseña actual<input type="password" required value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label><label>Nueva contraseña<input type="password" minLength={8} maxLength={72} required value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label><label>Confirmar contraseña<input type="password" minLength={8} maxLength={72} required value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} /></label><button className="primary-button" type="submit"><KeyRound size={17} /> Cambiar contraseña</button></form></section></div></section>
{resetTarget && <Modal title="Restablecer contraseña" subtitle={`Se generará una clave temporal para ${resetTarget.name}.`} onClose={() => { if (!resetBusy) setResetTarget(null) }}><div className="credential-reset-dialog"><div className="credential-reset-notice"><ShieldCheck size={20}/><p>La contraseña actual dejará de funcionar. En el próximo inicio de sesión, la persona deberá cambiar esta clave temporal por una propia.</p></div>{resetError && <div className="form-error"><CircleAlert size={16}/>{resetError}</div>}<div className="modal-actions"><button type="button" className="secondary-button" autoFocus disabled={resetBusy} onClick={() => setResetTarget(null)}>Cancelar</button><button type="button" className="primary-button" disabled={resetBusy} onClick={() => void confirmReset()}>{resetBusy ? 'Generando…' : 'Generar clave temporal'}</button></div></div></Modal>}
{temporaryPassword && <Modal title="Clave temporal generada" subtitle={`Cuenta de ${temporaryPassword.account.name}`} onClose={() => setTemporaryPassword(null)}><div className="credential-reset-dialog"><div className="credential-temporary-password"><span>CLAVE TEMPORAL · USO INICIAL</span><code>{temporaryPassword.value}</code></div><div className="credential-reset-notice"><ShieldCheck size={20}/><p>Comparte esta clave por un canal seguro. La persona deberá cambiarla al iniciar sesión. Esta clave solo se muestra ahora.</p></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => void copyTemporaryPassword()}><Copy size={16}/>{passwordCopied ? 'Copiada' : 'Copiar clave'}</button><button type="button" className="primary-button" onClick={() => setTemporaryPassword(null)}>Listo</button></div></div></Modal>}</>
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escapeCell = (value: unknown) => {
    const raw = String(value ?? '')
    const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw
    return `"${safe.replace(/"/g, '""')}"`
  }
  const csv = [headers.map(escapeCell).join(','), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function StatusPill({ status }: { status: Status }) { return <span className={`status-pill ${status.toLowerCase()}`}><span />{status}</span> }
function RequestStatus({ status }: { status: Request['status'] | TutorRecovery['status'] | PortalSession['status'] }) { return <span className={`request-status ${status.toLowerCase()}`}><span />{status}</span> }
function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle: string; children: ReactNode; onClose: () => void; wide?: boolean }) { return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-subtitle"><div className="modal-header"><div><h2 id="modal-title">{title}</h2><p id="modal-subtitle">{subtitle}</p></div><button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div><div className="modal-body">{children}</div></section></div> }

export default App
