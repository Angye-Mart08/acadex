import { FormEvent, ReactNode, useEffect, useState } from 'react'
import {
  AcademicPeriod,
  AdminCatalogs,
  AdminDashboard,
  AdminReport,
  ApiError,
  CredentialAccount,
  DbStatus,
  PortalAvailability,
  PortalSession,
  RoleProfiles,
  assignRequest as assignRequestApi,
  changePassword,
  createAcademicPeriod,
  createAdminRequest,
  createRequest as createRequestApi,
  createSpace as createSpaceApi,
  createUser as createUserApi,
  deleteRequest as deleteRequestApi,
  deleteAcademicPeriod,
  deleteSpace as deleteSpaceApi,
  deleteUser as deleteUserApi,
  exportTemporaryCredentials as exportTemporaryCredentialsApi,
  getAdminCatalogs,
  getAdminDashboard,
  getAdminReport,
  getCurrentUser,
  getDbStatus,
  listCredentials,
  listAdminPeriods,
  listPeriods as listPeriodsApi,
  listPortalAvailability as listPortalAvailabilityApi,
  listPortalSessions as listPortalSessionsApi,
  listRequests as listRequestsApi,
  listSpaces as listSpacesApi,
  listSubjects as listSubjectsApi,
  listUsers as listUsersApi,
  markAssignedRequestAttended,
  login as loginApi,
  logout as logoutApi,
  resetCredential,
  selectRole as selectRoleApi,
  updateRequest as updateRequestApi,
  updateAcademicPeriod,
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
type View = 'dashboard' | 'usuarios' | 'espacios' | 'solicitudes' | 'reportes' | 'configuracion'
type PortalView = 'inicio' | 'disponibilidad' | 'horarios' | 'solicitudes' | 'sesiones' | 'informes' | 'solicitar' | 'mis-solicitudes' | 'mis-sesiones'
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
}

const accessTokenStorageKey = 'acadex:access-token'
const roleTokenStorageKey = 'acadex:role-token'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [accessToken, setAccessToken] = useState(() => window.localStorage.getItem(accessTokenStorageKey) ?? '')
  const [roleToken, setRoleToken] = useState(() => window.localStorage.getItem(roleTokenStorageKey) ?? '')
  const [hydratingSession, setHydratingSession] = useState(true)
  const [sessionVersion, setSessionVersion] = useState(0)
  const [view, setView] = useState<View>('dashboard')
  const [portalView, setPortalView] = useState<PortalView>('inicio')
  const [loginError, setLoginError] = useState('')
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
        window.localStorage.removeItem(accessTokenStorageKey)
        window.localStorage.removeItem(roleTokenStorageKey)
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
      setCurrentUser(response.user)
      setAuthenticated(true)
      setRoleToken(response.preAuthToken ?? '')
      if (response.preAuthToken) window.localStorage.setItem(roleTokenStorageKey, response.preAuthToken)
      else window.localStorage.removeItem(roleTokenStorageKey)
      setSelectedRole(response.activeRole ?? null)
      if (response.accessToken) {
        setAccessToken(response.accessToken)
        window.localStorage.setItem(accessTokenStorageKey, response.accessToken)
      }
      setLoginError('')
    } catch (error) {
      setLoginError(error instanceof ApiError ? error.message : 'No fue posible iniciar sesión.')
    }
  }

  const handleRoleSelect = async (role: Role) => {
    if (!roleToken) {
      setLoginError('La selección de rol expiró. Inicia sesión nuevamente.')
      return
    }
    try {
      const response = await selectRoleApi(roleToken, role)
      if (!response.accessToken) throw new Error('La API no devolvió el token de acceso.')
      setCurrentUser(response.user)
      setSelectedRole(response.activeRole ?? role)
      setAccessToken(response.accessToken)
      if (response.preAuthToken) {
        setRoleToken(response.preAuthToken)
        window.localStorage.setItem(roleTokenStorageKey, response.preAuthToken)
      }
      window.localStorage.setItem(accessTokenStorageKey, response.accessToken)
      setLoginError('')
    } catch (error) {
      setLoginError(error instanceof ApiError ? error.message : 'No fue posible seleccionar el rol.')
    }
  }

  const logout = () => {
    if (accessToken) void logoutApi(accessToken).catch(() => undefined)
    setAuthenticated(false)
    setCurrentUser(null)
    setSelectedRole(null)
    setAccessToken('')
    setPeriods([])
    setPortalSessions([])
    setAvailability([])
    setRoleToken('')
    window.localStorage.removeItem(accessTokenStorageKey)
    window.localStorage.removeItem(roleTokenStorageKey)
    setView('dashboard')
    setPortalView('inicio')
  }

  if (hydratingSession) return <div className="session-loading">Validando sesión...</div>
  if (!authenticated || !currentUser) return <LoginPage onSubmit={handleLogin} error={loginError} />

  if (!selectedRole) return <RoleSelector user={currentUser} onSelect={(role) => { void handleRoleSelect(role); setPortalView('inicio') }} onLogout={logout} error={loginError} />

  if (currentUser.mustChangePassword) return <FirstPasswordChange accessToken={accessToken} onLogout={logout} onComplete={(user) => { setCurrentUser(user); setSessionVersion((version) => version + 1) }} />

  if (selectedRole !== 'Administrador') {
    return <RoleShell user={currentUser} activeRole={selectedRole} periodName={currentPeriod} periods={periods} view={portalView} onNavigate={setPortalView} onLogout={logout} onChangeRole={() => { setSelectedRole(null); setPortalView('inicio') }} accessToken={accessToken} requests={requests} subjects={subjects} sessions={portalSessions} availability={availability} dataError={dataError} dataLoading={dataLoading} onRequestsChange={setRequests} />
  }

  return (
    <AdminShell
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
      mobileNav={mobileNav}
      onToggleMobileNav={() => setMobileNav((current) => !current)}
    >
      {dataError && <div className="error-message">{dataError}</div>}
      {dataLoading && <div className="data-loading">Actualizando datos desde MariaDB...</div>}
      {view === 'dashboard' && <Dashboard users={users} spaces={spaces} requests={requests} data={dashboardData} onNavigate={setView} />}
      {view === 'usuarios' && <UsersView users={users} accessToken={accessToken} catalogs={adminCatalogs} onChange={setUsers} />}
      {view === 'espacios' && <SpacesView spaces={spaces} accessToken={accessToken} onChange={setSpaces} />}
      {view === 'solicitudes' && <RequestsView requests={requests} accessToken={accessToken} catalogs={adminCatalogs} onChange={setRequests} />}
      {view === 'reportes' && <ReportsView accessToken={accessToken} catalogs={adminCatalogs} />}
      {view === 'configuracion' && <ConfigurationView accessToken={accessToken} currentUser={currentUser} />}
    </AdminShell>
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

function LoginPage({ onSubmit, error }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; error: string }) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(() => window.localStorage.getItem('acadex:remembered-email') ?? '')
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(window.localStorage.getItem('acadex:remembered-email')))

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
          <div className="mobile-login-brand"><AcadexBrand /><UniversitySignature /></div>
          <div className="login-heading">
            <span className="eyebrow">Acceso institucional</span>
            <h2>Bienvenido a Acadex</h2>
            <p>Sistema de Gestión de Monitorías y Tutorías Académicas.</p>
          </div>
          <form className="login-form" onSubmit={submitLogin}>
            <label>Correo institucional<div className="login-input"><Mail size={18} /><input name="email" type="email" pattern=".+@unitropico[.]edu[.]co" title="Usa tu correo institucional @unitropico.edu.co." placeholder="nombre@unitropico.edu.co" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></label>
            <label>Contraseña<div className="password-field login-input"><LockKeyhole size={18} /><input name="password" type={showPassword ? 'text' : 'password'} placeholder="Ingresa tu contraseña" autoComplete="current-password" minLength={1} maxLength={72} required /><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            <div className="form-row"><label className="check-label"><input type="checkbox" checked={rememberEmail} onChange={(event) => setRememberEmail(event.target.checked)} /> <span>Recordarme</span></label></div>
            {error && <div className="form-error"><CircleAlert size={16} />{error}</div>}
            <button className="primary-button login-button" type="submit">Iniciar sesión <ArrowRight size={18} /></button>
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

function AdminShell({ user, activeRole, periodName, periods, children, view, onNavigate, onLogout, onChangeRole, mobileNav, onToggleMobileNav }: { user: User; activeRole: Role; periodName: string; periods: AcademicPeriod[]; children: ReactNode; view: View; onNavigate: (view: View) => void; onLogout: () => void; onChangeRole: () => void; mobileNav: boolean; onToggleMobileNav: () => void }) {
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const navItems: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'dashboard', label: 'Resumen general', icon: <LayoutDashboard size={19} /> },
    { id: 'usuarios', label: 'Gestión de usuarios', icon: <UsersRound size={19} /> },
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

function RoleShell({ user, activeRole, periodName, periods, view, onNavigate, onLogout, onChangeRole, accessToken, requests, subjects, sessions, availability, dataError, dataLoading, onRequestsChange }: { user: User; activeRole: PortalRole; periodName: string; periods: AcademicPeriod[]; view: PortalView; onNavigate: (view: PortalView) => void; onLogout: () => void; onChangeRole: () => void; accessToken: string; requests: Request[]; subjects: Array<{ id: number; codigo: string; nombre: string }>; sessions: PortalSession[]; availability: PortalAvailability[]; dataError: string; dataLoading: boolean; onRequestsChange: (requests: Request[]) => void }) {
  const [mobileNav, setMobileNav] = useState(false)
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const navByRole: Record<PortalRole, { id: PortalView; label: string; icon: ReactNode }[]> = {
    Tutor: [
      { id: 'inicio', label: 'Mi resumen', icon: <LayoutDashboard size={19} /> },
      { id: 'disponibilidad', label: 'Mi disponibilidad', icon: <CalendarClock size={19} /> },
      { id: 'sesiones', label: 'Mis sesiones', icon: <CalendarDays size={19} /> },
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
          {user.roles.length > 1 && <button className="role-switcher" onClick={onChangeRole}><UsersRound size={15} /> Cambiar rol</button>}
          <button className="mobile-logout-button" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout}><LogOut size={17} /><span>Cerrar sesión</span></button>
          <ProfileMenu user={user} activeRole={activeRole} onLogout={onLogout} />
        </div>
      </header>
      <main className="page-content">
        {dataError && <div className="error-message">{dataError}</div>}
        {dataLoading && <div className="data-loading">Actualizando datos desde MariaDB...</div>}
        {view === 'inicio' && <PortalHome user={user} activeRole={activeRole} periodName={periodName} requests={requests} onNavigate={go} />}
        {view === 'disponibilidad' && <AvailabilityView periodName={periodName} availability={availability} />}
        {view === 'horarios' && <ScheduleView user={user} periodName={periodName} availability={availability} />}
        {(view === 'sesiones' || view === 'mis-sesiones') && <PortalSessions sessions={sessions} activeRole={activeRole} periodName={periodName} />}
        {view === 'solicitar' && <StudentRequestForm accessToken={accessToken} subjects={subjects} user={user} requests={requests} onChange={onRequestsChange} />}
        {view === 'mis-solicitudes' && <MyRequests requests={requests} />}
        {view === 'solicitudes' && <AssignedRequests accessToken={accessToken} activeRole={activeRole} requests={requests} onChange={onRequestsChange} />}
      </main>
      {periodModalOpen && <PeriodModal periodName={periodName} periods={periods} onClose={() => setPeriodModalOpen(false)} />}
    </div>
  </div>
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
    <div className="dashboard-grid"><section className="panel activity-panel"><div className="panel-heading"><div><h3>Solicitudes recientes</h3><p>Registros asociados a tu rol</p></div><button className="text-button" onClick={() => onNavigate(activeRole === 'Estudiante' ? 'mis-solicitudes' : activeRole === 'Monitor' ? 'solicitudes' : 'disponibilidad')}>Ver detalles <ArrowRight size={15} /></button></div><div className="activity-list">{requests.length ? requests.slice(0, 3).map((request) => <ActivityRow key={request.id} color={request.status === 'Pendiente' ? 'amber' : 'green'} title={request.subject} description={`${request.type} · ${request.status}`} time={request.date} />) : <div className="activity-empty">No hay solicitudes disponibles para mostrar.</div>}</div></section><section className="panel quick-panel"><div className="panel-heading"><div><h3>Accesos rápidos</h3><p>Acciones disponibles para ti</p></div></div><div className="quick-actions"><button onClick={() => onNavigate(action.view)}><span className="quick-icon blue-bg">{action.icon}</span><span><b>{action.label}</b><small>Continúa tu gestión</small></span><ArrowRight size={16} /></button>{activeRole === 'Estudiante' && <button onClick={() => onNavigate('mis-solicitudes')}><span className="quick-icon green-bg"><BookOpen size={18} /></span><span><b>Mis solicitudes</b><small>Revisa su estado</small></span><ArrowRight size={16} /></button>}</div></section></div>
  </>
}

function AvailabilityView({ periodName, availability }: { periodName: string; availability: PortalAvailability[] }) {
  return <><PageHeader eyebrow="Mi espacio / Disponibilidad" title="Mi disponibilidad" description="Bloques registrados para el periodo académico activo." /><section className="panel schedule-panel"><div className="panel-heading"><div><h3>Disponibilidad registrada</h3><p>Periodo {periodName}</p></div></div><div className="schedule-list">{availability.length ? availability.map((item) => <ScheduleRow key={item.id} day={item.day} time={`${item.startTime} — ${item.endTime}`} subject={item.subject} place={item.place} />) : <div className="activity-empty">No hay bloques de disponibilidad para este periodo.</div>}</div></section></>
}

function ScheduleView({ user, periodName, availability }: { user: User; periodName: string; availability: PortalAvailability[] }) {
  return <><PageHeader eyebrow="Mi espacio / Horarios" title="Mis horarios" description="Horario de monitoría registrado para el periodo activo." /><section className="panel schedule-panel"><div className="panel-heading"><div><h3>{user.name}</h3><p>Periodo {periodName}</p></div></div><div className="schedule-list">{availability.length ? availability.map((item) => <ScheduleRow key={item.id} day={item.day} time={`${item.startTime} — ${item.endTime}`} subject={item.subject} place={item.place} />) : <div className="activity-empty">No hay horarios de monitoría para este periodo.</div>}</div></section></>
}

function ScheduleRow({ day, time, subject, place }: { day: string; time: string; subject: string; place: string }) { return <div className="schedule-row"><div className="schedule-day"><strong>{day}</strong><span>{time}</span></div><div className="schedule-main"><strong>{subject}</strong><span>{place}</span></div><StatusPill status="Activo" /></div> }

function PortalSessions({ sessions, activeRole, periodName }: { sessions: PortalSession[]; activeRole: PortalRole; periodName: string }) {
  const formatDate = (date: string) => new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
  return <><PageHeader eyebrow={`Mi espacio / ${activeRole === 'Estudiante' ? 'Mis sesiones' : 'Sesiones'}`} title="Mis sesiones" description="Sesiones registradas para tu rol en el periodo académico activo." /><section className="panel table-panel"><div className="table-meta"><span><strong>{sessions.length}</strong> sesiones en tu agenda</span><span>Periodo {periodName}</span></div><div className="table-scroll"><table><thead><tr><th>SESIÓN</th><th>FECHA Y HORA</th><th>MODALIDAD</th><th>ESTADO</th></tr></thead><tbody>{sessions.length ? sessions.map((session) => <tr key={session.id}><td><div className="request-cell"><div className="request-id">#{String(session.id).padStart(4, '0')}</div><div><strong>{session.subject}</strong><span>{session.place}</span></div></div></td><td><span className="muted-cell">{formatDate(session.date)} · {session.startTime}–{session.endTime}</span></td><td>{session.modality}</td><td><span className="request-status">{session.status}</span></td></tr>) : <tr><td colSpan={4}><div className="activity-empty">No hay sesiones registradas para este periodo.</div></td></tr>}</tbody></table></div></section></>
}

function PortalReports() { return <><PageHeader eyebrow="Mi espacio / Informes" title="Mis informes" description="Consulta el estado de los informes asociados a tus sesiones de tutoría." /><div className="report-grid"><article className="report-card"><div className="report-icon"><FileText size={20} /></div><span className="report-state">Pendiente de envío</span><h3>Informe de acompañamiento · Septiembre</h3><p>Resumen de actividades, logros y recomendaciones del periodo.</p></article><article className="report-card"><div className="report-icon green-bg"><Check size={20} /></div><span className="report-state approved">Aprobado</span><h3>Informe de acompañamiento · Agosto</h3><p>Revisado por la coordinación académica.</p></article></div></> }

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
          <td><RequestStatus status={request.status} /></td>
          <td><span className="muted-cell">{request.date}</span></td>
        </tr>) : <tr><td colSpan={5}><div className="activity-empty">Aún no tienes solicitudes registradas.</div></td></tr>}</tbody>
      </table></div>
    </section>
  </>
}

function AssignedRequests({ accessToken, activeRole, requests, onChange }: { accessToken: string; activeRole: PortalRole; requests: Request[]; onChange: (requests: Request[]) => void }) {
  const assigned = requests.filter((request) => request.status === 'Asignada' || request.status === 'Atendida')
  const markAttended = async (request: Request) => {
    try {
      const saved = await markAssignedRequestAttended(accessToken, request.id)
      onChange(requests.map((item) => item.id === request.id ? saved as Request : item))
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible actualizar la solicitud asignada.')
    }
  }
  return <><PageHeader eyebrow={`Mi espacio / Solicitudes · ${activeRole}`} title="Solicitudes asignadas" description="Atiende las solicitudes vinculadas a tus asignaturas y registra su cierre." /><section className="panel table-panel"><div className="table-meta"><span><strong>{assigned.length}</strong> solicitudes asignadas a tu rol</span><span>Información sincronizada con MariaDB</span></div><div className="table-scroll"><table><thead><tr><th>ESTUDIANTE</th><th>ASIGNATURA</th><th>TIPO</th><th>PRIORIDAD</th><th>ESTADO</th><th>FECHA</th><th className="align-right">ACCIÓN</th></tr></thead><tbody>{assigned.map((request) => <tr key={request.id}><td><strong>{request.student}</strong></td><td>{request.subject}</td><td>{request.type}</td><td><span className={`priority ${request.priority.toLowerCase()}`}><span />{request.priority}</span></td><td><RequestStatus status={request.status} /></td><td>{request.date}</td><td className="align-right">{request.status === 'Asignada' && <button className="row-action" onClick={() => void markAttended(request)}>Marcar atendida</button>}</td></tr>)}{!assigned.length && <tr><td colSpan={7} className="empty-table-cell">No tienes solicitudes asignadas para el rol {activeRole}.</td></tr>}</tbody></table></div></section></>
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
    {modal && <Modal title={editingUser ? 'Editar usuario' : 'Nuevo usuario'} subtitle="Los campos específicos aparecen según el o los roles seleccionados." wide onClose={() => setModal(false)}>
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
        <label>Nombre completo<input name="name" required minLength={5} maxLength={160} pattern=".*\s+.*" title="Ingresa al menos un nombre y un apellido." autoComplete="name" defaultValue={editingUser?.name ?? ''} placeholder="Ej. Ana María López" /></label>
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
          <label>Capacidad de estudiantes<input name="capacity" type="number" min="1" max="1000" step="1" required defaultValue={editingSpace?.capacity ?? ''} placeholder="30" /></label>
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
  const [assignmentDate, setAssignmentDate] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [motiveText, setMotiveText] = useState('')
  const [newRequestType, setNewRequestType] = useState<'Monitoría' | 'Tutoría' | 'Acompañamiento'>('Monitoría')
  const [newRequestSubjectId, setNewRequestSubjectId] = useState('')
  const [newRequestPeriodId, setNewRequestPeriodId] = useState('')
  const [newRequestStaffRole, setNewRequestStaffRole] = useState<'Tutor' | 'Monitor'>('Monitor')
  const [newRequestStaffId, setNewRequestStaffId] = useState('')
  const [radicadoCode, setRadicadoCode] = useState(() => `RAD-2026-${Math.floor(1000 + Math.random() * 9000)}`)

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
            date: String(form.get('firstSessionDate')),
            startTime: String(form.get('firstSessionStart')),
            endTime: String(form.get('firstSessionEnd')),
            modality: String(form.get('firstSessionModality')) as 'Presencial' | 'Virtual',
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
  const requestTypes = catalogs?.requestTypes.map((item) => item.nombre).filter((name): name is 'Monitoría' | 'Tutoría' | 'Acompañamiento' => ['Monitoría', 'Tutoría', 'Acompañamiento'].includes(name as never)) ?? []
  const currentStudent = catalogs?.students.find((s) => s.id === selectedStudentId)
  const createAssignmentRole: 'Tutor' | 'Monitor' = newRequestType === 'Acompañamiento' ? newRequestStaffRole : newRequestType === 'Tutoría' ? 'Tutor' : 'Monitor'
  const createEligibleStaff = catalogs?.staffAssignments.filter((item) => item.subjectId === Number(newRequestSubjectId) && item.periodId === Number(newRequestPeriodId) && item.role === createAssignmentRole) ?? []
  const eligibleAssignments = catalogs?.staffAssignments.filter((item) => item.subjectId === assigningRequest?.subjectId && item.periodId === assigningRequest?.periodId && item.role === assignmentRole) ?? []
  const openAssignment = (request: Request) => { setAssigningRequest(request); setAssignmentRole(request.type === 'Tutoría' ? 'Tutor' : 'Monitor'); setAssignmentUserId(''); setAssignmentDate('') }
  const submitAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!assigningRequest) return
    const form = new FormData(event.currentTarget)
    try {
      const saved = await assignRequestApi(accessToken, assigningRequest.id, { userId: Number(form.get('userId')), role: assignmentRole, date: String(form.get('date')), startTime: String(form.get('startTime')), endTime: String(form.get('endTime')), modality: String(form.get('modality')) as 'Presencial' | 'Virtual' })
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
      <div className="table-scroll"><table><thead><tr><th>SOLICITUD</th><th>PROGRAMA</th><th>TIPO</th><th>PRIORIDAD</th><th>ESTADO</th><th>FECHA</th><th className="align-right">ACCIONES</th></tr></thead><tbody>{filtered.map((request) => <tr key={request.id}><td><div className="request-cell"><div className="request-id">#{String(request.id).padStart(4, '0')}</div><div><strong>{request.subject}</strong><span>{request.student}</span>{request.motive && <small className="table-subtext">{request.motive}</small>}</div></div></td><td>{request.program ?? '—'}</td><td><span className="type-label"><span className={request.type === 'Monitoría' ? 'type-dot blue-dot' : 'type-dot purple-dot'} />{request.type}</span></td><td><span className={`priority ${request.priority.toLowerCase()}`}><span />{request.priority}</span></td><td><RequestStatus status={request.status} /></td><td><span className="muted-cell">{request.date}</span></td><td className="align-right"><div className="actions-inline">{request.status === 'Pendiente' && <><button className="approve-action" onClick={() => updateStatus(request.id, 'Aprobada')} title="Aprobar"><Check size={16} /></button><button className="reject-action" onClick={() => updateStatus(request.id, 'Rechazada')} title="Rechazar"><X size={16} /></button></>}{['Pendiente', 'Aprobada'].includes(request.status) && <button className="row-action" onClick={() => openAssignment(request)}>Asignar tutor/monitor</button>}<button className="delete-action" onClick={() => deleteRequestPermanently(request)} title="Eliminar permanentemente de MariaDB"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>
    </section>

    {calendarModalOpen && <CalendarModal requests={requests} onClose={() => setCalendarModalOpen(false)} />}

    {assigningRequest && <Modal title="Asignar acompañamiento" subtitle={`${assigningRequest.student} · ${assigningRequest.subject} · ${assigningRequest.period ?? 'Periodo actual'}`} wide onClose={() => setAssigningRequest(null)}><form className="modal-form" onSubmit={submitAssignment}><div className="form-columns"><label>Rol responsable<select value={assignmentRole} onChange={(event) => { setAssignmentRole(event.target.value as 'Tutor' | 'Monitor'); setAssignmentUserId('') }}><option value="Monitor">Monitor</option><option value="Tutor">Tutor</option></select></label><label>{assignmentRole} con asignación activa<select name="userId" required value={assignmentUserId} onChange={(event) => setAssignmentUserId(event.target.value)}><option value="">Selecciona una persona</option>{eligibleAssignments.map((item) => <option key={`${item.role}-${item.userId}`} value={item.userId}>{item.name} · {item.weeklyHours} h/semana</option>)}</select>{eligibleAssignments.length === 0 && <small className="form-field-hint">No hay {assignmentRole.toLowerCase()} asignados a esta asignatura y periodo. Revisa Gestión de usuarios.</small>}</label></div><div className="form-columns"><label>Fecha de primera sesión<input name="date" type="date" required min={new Date().toISOString().slice(0, 10)} value={assignmentDate} onChange={(event) => setAssignmentDate(event.target.value)} /></label><label>Modalidad<select name="modality"><option>Presencial</option><option>Virtual</option></select></label></div><div className="form-columns"><label>Hora de inicio<input name="startTime" type="time" required /></label><label>Hora de finalización<input name="endTime" type="time" required /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAssigningRequest(null)}>Cancelar</button><button className="primary-button" type="submit" disabled={!eligibleAssignments.length || !assignmentUserId}><CalendarClock size={17} /> Asignar y programar sesión</button></div></form></Modal>}

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
            <select name="assignedUserId" required={createEligibleStaff.length > 0} value={newRequestStaffId} onChange={(event) => setNewRequestStaffId(event.target.value)}>
              <option value="">{createEligibleStaff.length ? `Selecciona ${createAssignmentRole.toLowerCase()}` : `No hay ${createAssignmentRole.toLowerCase()} asignados disponibles`}</option>
              {createEligibleStaff.map((person) => <option key={`${person.role}-${person.userId}`} value={person.userId}>{person.name} · {person.weeklyHours} h/semana</option>)}
            </select>
            {createEligibleStaff.length === 0 && <small className="form-field-hint">Puedes crear la solicitud ahora y asignar el acompañamiento más tarde, cuando exista personal activo para esta materia y periodo.</small>}
          </label>
          {newRequestStaffId && <><div className="form-columns"><label>Fecha de primera sesión<input name="firstSessionDate" type="date" required min={new Date().toISOString().slice(0, 10)} /></label><label>Modalidad<select name="firstSessionModality"><option>Presencial</option><option>Virtual</option></select></label></div><div className="form-columns"><label>Hora de inicio<input name="firstSessionStart" type="time" required /></label><label>Hora de finalización<input name="firstSessionEnd" type="time" required /></label></div></>}
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

function ConfigurationView({ accessToken, currentUser }: { accessToken: string; currentUser: User }) {
  const [role, setRole] = useState('')
  const [accounts, setAccounts] = useState<CredentialAccount[]>([])
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [exportingSecrets, setExportingSecrets] = useState(false)
  const loadAccounts = async (selectedRole = role) => { setLoading(true); try { setAccounts(await listCredentials(accessToken, selectedRole)) } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible cargar las credenciales.') } finally { setLoading(false) } }
  useEffect(() => { void loadAccounts('') }, [accessToken])
  const reset = async (account: CredentialAccount) => { if(account.id===currentUser.id)return; if (!window.confirm(`¿Generar una clave temporal nueva para ${account.name}? Revocará su contraseña actual y deberá cambiarla al iniciar sesión.`)) return; try { const result = await resetCredential(accessToken, account.id); window.alert(`Clave temporal de un solo uso:\n\n${result.temporaryPassword}\n\nEntrégala por un canal seguro. Se exigirá cambiarla al iniciar sesión.`) } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible restablecer la credencial.') } }
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
  return <><PageHeader eyebrow="Administración / Configuración" title="Configuración y credenciales" description="Gestiona el acceso de usuarios y la operación académica del sistema." action={<button className="secondary-button" onClick={exportCredentials} disabled={!accounts.length}><Download size={17} /> Exportar listado</button>} /><section className="configuration-section"><header className="configuration-section-heading"><span>OPERACIÓN ACADÉMICA</span><h2>Supervisión y periodos</h2><p>Estado de MariaDB y vigencia del calendario académico.</p></header><div className="configuration-stack"><DatabaseControlPanel accessToken={accessToken} /><AcademicPeriodsPanel accessToken={accessToken} /></div></section><section className="configuration-section"><header className="configuration-section-heading"><span>SEGURIDAD</span><h2>Acceso y credenciales</h2><p>Consulta cuentas, restablece claves temporales y actualiza tu contraseña.</p></header><div className="configuration-grid"><section className="panel table-panel"><div className="panel-heading"><div><h3>Credenciales de usuarios</h3><p>Las claves guardadas no se muestran. Solo se exportan claves temporales de un uso.</p></div><KeyRound size={20} /></div><div className="table-toolbar config-toolbar"><select value={role} onChange={(event) => { setRole(event.target.value); void loadAccounts(event.target.value) }}><option value="">Todos los roles</option><option>Administrador</option><option>Estudiante</option><option>Tutor</option><option>Monitor</option></select><button className="secondary-button filter-button" onClick={() => void loadAccounts()}><RefreshCw size={16} /> {loading ? 'Cargando...' : 'Actualizar'}</button></div><div className="credential-export-panel"><div><strong>Exportar claves temporales</strong><span>Selecciona un rol. Las claves actuales se revocan y se exige cambiarlas en el primer acceso.</span></div><button className="secondary-button" type="button" onClick={() => void exportTemporaryPasswords()} disabled={!role || loading || !eligibleForSecretExport.length || exportingSecrets}>{exportingSecrets ? 'Generando...' : `Generar CSV (${eligibleForSecretExport.length})`} <Download size={16} /></button></div><div className="table-scroll"><table><thead><tr><th>USUARIO</th><th>ROLES</th><th>CLAVE</th><th>ESTADO</th><th /></tr></thead><tbody>{accounts.map((account) => <tr key={account.id}><td><strong>{account.name}</strong><span className="table-subtext">{account.email}</span></td><td><div className="user-roles">{account.roles.map((item) => <span className="role-pill" key={item}>{item}</span>)}</div></td><td><code className="credential-code">Protegida</code></td><td>{account.status}</td><td className="align-right"><button className="row-action" disabled={account.id===currentUser.id || account.status!=='Activo'} title={account.id===currentUser.id ? 'Usa el formulario Cambiar mi contraseña' : 'Generar una clave temporal de un solo uso'} onClick={() => void reset(account)}>Generar clave temporal</button></td></tr>)}</tbody></table></div></section><section className="panel form-panel"><div className="panel-heading"><div><h3>Cambiar mi contraseña</h3><p>Usa una contraseña nueva de 8 a 72 caracteres.</p></div><LockKeyhole size={20} /></div><form className="portal-form" onSubmit={savePassword}><label>Contraseña actual<input type="password" required value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label><label>Nueva contraseña<input type="password" minLength={8} maxLength={72} required value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label><label>Confirmar contraseña<input type="password" minLength={8} maxLength={72} required value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} /></label><button className="primary-button" type="submit"><KeyRound size={17} /> Cambiar contraseña</button></form></section></div></section></>
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
function RequestStatus({ status }: { status: Request['status'] }) { return <span className={`request-status ${status.toLowerCase()}`}><span />{status}</span> }
function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle: string; children: ReactNode; onClose: () => void; wide?: boolean }) { return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-subtitle"><div className="modal-header"><div><h2 id="modal-title">{title}</h2><p id="modal-subtitle">{subtitle}</p></div><button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div><div className="modal-body">{children}</div></section></div> }

export default App
