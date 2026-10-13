import { FormEvent, ReactNode, useEffect, useState } from 'react'
import {
  AcademicPeriod,
  AdminCatalogs,
  AdminDashboard,
  AdminReport,
  ApiError,
  AppSetting,
  CredentialAccount,
  PortalAvailability,
  PortalSession,
  RoleProfiles,
  changePassword,
  createAdminRequest,
  createRequest as createRequestApi,
  createSpace as createSpaceApi,
  createUser as createUserApi,
  deleteSpace as deleteSpaceApi,
  deleteUser as deleteUserApi,
  getAdminCatalogs,
  getAdminDashboard,
  getAdminReport,
  getCurrentUser,
  listCredentials,
  listPeriods as listPeriodsApi,
  listPortalAvailability as listPortalAvailabilityApi,
  listPortalSessions as listPortalSessionsApi,
  listRequests as listRequestsApi,
  listSettings,
  listSpaces as listSpacesApi,
  listSubjects as listSubjectsApi,
  listUsers as listUsersApi,
  login as loginApi,
  logout as logoutApi,
  resetCredential,
  selectRole as selectRoleApi,
  updateRequest as updateRequestApi,
  updateSettings,
  updateSpace as updateSpaceApi,
  updateUser as updateUserApi,
} from './api'
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
} from 'lucide-react'

type Role = 'Administrador' | 'Tutor' | 'Monitor' | 'Estudiante'
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
  roles: Role[]
  status: Status
  initials: string
  profiles?: RoleProfiles
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
  const [view, setView] = useState<View>('dashboard')
  const [portalView, setPortalView] = useState<PortalView>('inicio')
  const [loginError, setLoginError] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [spaces, setSpaces] = useState<Space[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [portalSessions, setPortalSessions] = useState<PortalSession[]>([])
  const [availability, setAvailability] = useState<PortalAvailability[]>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [adminCatalogs, setAdminCatalogs] = useState<AdminCatalogs | null>(null)
  const [dashboardData, setDashboardData] = useState<AdminDashboard | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState('')

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
    if (!accessToken || !selectedRole) return
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
          setSubjects(subjectsResponse.map((subject) => subject.nombre))
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
  }, [accessToken, selectedRole])
  const currentPeriod = periods.find((period) => period.estado === 'Activo')?.nombre ?? 'No disponible'

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim().toLowerCase()
    const document = String(form.get('password') ?? '').trim()
    try {
      const response = await loginApi(email, document)
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

  if (selectedRole !== 'Administrador') {
    return <RoleShell user={currentUser} activeRole={selectedRole} periodName={currentPeriod} view={portalView} onNavigate={setPortalView} onLogout={logout} onChangeRole={() => { setSelectedRole(null); setPortalView('inicio') }} accessToken={accessToken} requests={requests} subjects={subjects} sessions={portalSessions} availability={availability} dataError={dataError} dataLoading={dataLoading} onRequestsChange={setRequests} />
  }

  return (
    <AdminShell
      user={currentUser}
      periodName={currentPeriod}
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
      {view === 'configuracion' && <ConfigurationView accessToken={accessToken} />}
    </AdminShell>
  )
}

function AcadexBrand({ light = false, compact = false, className = '' }: { light?: boolean; compact?: boolean; className?: string }) {
  return <div className={`acadex-brand ${light ? 'light' : ''} ${compact ? 'compact' : ''} ${className}`}><span className="acadex-symbol"><GraduationCap size={32} strokeWidth={2.25} /></span><span className="acadex-wordmark"><strong>Acadex</strong><small>Monitorías y Tutorías</small></span></div>
}

function UniversitySignature({ onGreen = false }: { onGreen?: boolean }) {
  return <div className={`university-signature ${onGreen ? 'on-green' : ''}`}><img src={onGreen ? '/marca/unitropico-logotipo-oscuro.png' : '/marca/unitropico-logotipo.png'} alt="Unitrópico · Universidad Internacional del Trópico Americano" /></div>
}

function LoginPage({ onSubmit, error }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; error: string }) {
  const [showDocument, setShowDocument] = useState(false)
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
          <div className="login-heading">
            <span className="eyebrow">Acceso institucional</span>
            <h2>Bienvenido a Acadex</h2>
            <p>Sistema de Gestión de Monitorías y Tutorías Académicas.</p>
          </div>
          <form className="login-form" onSubmit={submitLogin}>
            <label>Correo institucional<div className="login-input"><Mail size={18} /><input name="email" type="email" placeholder="nombre@unitropico.edu.co" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></label>
            <label>Documento de identidad<div className="password-field login-input"><LockKeyhole size={18} /><input name="password" type={showDocument ? 'text' : 'password'} placeholder="Ingresa tu documento" autoComplete="current-password" required /><button type="button" aria-label={showDocument ? 'Ocultar documento' : 'Mostrar documento'} onClick={() => setShowDocument((visible) => !visible)}>{showDocument ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
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

function AdminShell({ user, activeRole, periodName, children, view, onNavigate, onLogout, onChangeRole, mobileNav, onToggleMobileNav }: { user: User; activeRole: Role; periodName: string; children: ReactNode; view: View; onNavigate: (view: View) => void; onLogout: () => void; onChangeRole: () => void; mobileNav: boolean; onToggleMobileNav: () => void }) {
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
        <header className="topbar"><button className="mobile-menu" onClick={onToggleMobileNav} aria-label="Abrir menú"><Menu size={22} /></button><div className="breadcrumb"><span>Administración</span><span>/</span><strong>{navItems.find((item) => item.id === view)?.label ?? 'Resumen general'}</strong></div><div className="topbar-actions"><span className="period-chip"><span className="status-dot" />Periodo {periodName}</span>{user.roles.length > 1 && <button className="role-switcher" onClick={onChangeRole}><UsersRound size={15} /> Cambiar rol</button>}<ProfileMenu user={user} activeRole={activeRole} onLogout={onLogout} /></div></header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}

function ProfileMenu({ user, activeRole, onLogout }: { user: User; activeRole: Role; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  return <div className={`profile profile-menu ${open ? 'menu-open' : ''}`}><button className="profile-trigger" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span className="avatar"><img src="/marca/avatar-default.svg" alt="" /></span><span className="profile-details"><strong>{user.name}</strong><span>{activeRole}</span></span><ChevronDown size={16} /></button>{open && <div className="profile-dropdown" role="menu"><button type="button" role="menuitem" onClick={onLogout}><LogOut size={17} />Cerrar sesión</button></div>}</div>
}

function RoleShell({ user, activeRole, periodName, view, onNavigate, onLogout, onChangeRole, accessToken, requests, subjects, sessions, availability, dataError, dataLoading, onRequestsChange }: { user: User; activeRole: PortalRole; periodName: string; view: PortalView; onNavigate: (view: PortalView) => void; onLogout: () => void; onChangeRole: () => void; accessToken: string; requests: Request[]; subjects: string[]; sessions: PortalSession[]; availability: PortalAvailability[]; dataError: string; dataLoading: boolean; onRequestsChange: (requests: Request[]) => void }) {
  const [mobileNav, setMobileNav] = useState(false)
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
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={22} /></button><div className="breadcrumb"><span>{activeRole}</span><span>/</span><strong>{navItems.find((item) => item.id === view)?.label ?? 'Mi resumen'}</strong></div><div className="topbar-actions"><span className="period-chip"><span className="status-dot" />Periodo {periodName}</span>{user.roles.length > 1 && <button className="role-switcher" onClick={onChangeRole}><UsersRound size={15} /> Cambiar rol</button>}<ProfileMenu user={user} activeRole={activeRole} onLogout={onLogout} /></div></header>
      <main className="page-content">
        {dataError && <div className="error-message">{dataError}</div>}
        {dataLoading && <div className="data-loading">Actualizando datos desde MariaDB...</div>}
        {view === 'inicio' && <PortalHome user={user} activeRole={activeRole} periodName={periodName} requests={requests} onNavigate={go} />}
        {view === 'disponibilidad' && <AvailabilityView periodName={periodName} availability={availability} />}
        {view === 'horarios' && <ScheduleView user={user} periodName={periodName} availability={availability} />}
        {(view === 'sesiones' || view === 'mis-sesiones') && <PortalSessions sessions={sessions} activeRole={activeRole} periodName={periodName} />}
        {view === 'solicitar' && <StudentRequestForm accessToken={accessToken} subjects={subjects} user={user} requests={requests} onChange={onRequestsChange} />}
        {view === 'mis-solicitudes' && <MyRequests requests={requests} />}
        {view === 'solicitudes' && <AssignedRequests requests={requests} />}
      </main>
    </div>
  </div>
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

function StudentRequestForm({ accessToken, subjects, user, requests, onChange }: { accessToken: string; subjects: string[]; user: User; requests: Request[]; onChange: (requests: Request[]) => void }) {
  const [sent, setSent] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { const saved = await createRequestApi(accessToken, { subject: String(form.get('subject') ?? ''), type: String(form.get('type') ?? 'Monitoría') as 'Monitoría' | 'Tutoría', priority: String(form.get('priority') ?? 'Media') as 'Alta' | 'Media' | 'Baja', reason: String(form.get('reason') ?? '') }); onChange([saved as Request, ...requests]); setSent(true); event.currentTarget.reset() } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible registrar la solicitud.') } }
  return <><PageHeader eyebrow="Mi espacio / Solicitudes" title="Solicitar acompañamiento" description="Cuéntanos en qué asignatura necesitas apoyo y te ayudaremos a encontrar el acompañamiento adecuado." /><section className="panel form-panel"><div className="panel-heading"><div><h3>Nueva solicitud</h3><p>La coordinación revisará tu solicitud y te notificará el resultado.</p></div><div className="quick-icon blue-bg"><Send size={18} /></div></div><form className="portal-form" onSubmit={submit}><div className="form-columns"><label>Tipo de acompañamiento<select name="type"><option>Monitoría</option><option>Tutoría</option></select></label><label>Prioridad<select name="priority"><option>Media</option><option>Alta</option><option>Baja</option></select></label></div><label>Asignatura<select name="subject" required><option value="">Selecciona una asignatura</option>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Motivo<textarea name="reason" required placeholder="Describe brevemente en qué necesitas apoyo..." /></label><button className="primary-button" type="submit"><Send size={17} /> Enviar solicitud</button>{sent && <div className="success-message"><Check size={16} /> Solicitud creada correctamente. Puedes consultarla en “Mis solicitudes”.</div>}</form></section></>
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

function AssignedRequests({ requests }: { requests: Request[] }) { const assigned = requests.filter((request) => request.status === 'Aprobada' || request.status === 'Asignada'); return <><PageHeader eyebrow="Mi espacio / Solicitudes" title="Solicitudes asignadas" description="Consulta los acompañamientos que requieren tu atención." /><section className="panel table-panel"><div className="table-meta"><span><strong>{assigned.length}</strong> solicitudes asignadas</span><span>Coordinación académica</span></div><div className="table-scroll"><table><thead><tr><th>ESTUDIANTE</th><th>ASIGNATURA</th><th>TIPO</th><th>ESTADO</th></tr></thead><tbody>{assigned.map((request) => <tr key={request.id}><td><strong>{request.student}</strong></td><td>{request.subject}</td><td>{request.type}</td><td><RequestStatus status={request.status} /></td></tr>)}</tbody></table></div></section></> }

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
    {roles.includes('Administrador') && <fieldset className="role-profile-fieldset"><legend><ShieldCheck size={15} /> Administrador</legend><div className="form-columns"><label>Cargo<input name="adminCargo" required defaultValue={admin?.cargo ?? ''} placeholder="Coordinación académica" /></label><label>Dependencia<input name="adminDependency" required defaultValue={admin?.dependencia ?? ''} placeholder="Facultad o dependencia" /></label></div><label>Observaciones del rol<textarea name="adminObservations" defaultValue={admin?.observaciones ?? ''} placeholder="Responsabilidades o notas del rol" /></label></fieldset>}
    {roles.includes('Estudiante') && <fieldset className="role-profile-fieldset"><legend><GraduationCap size={15} /> Estudiante</legend><div className="form-columns"><label>Código estudiantil<input name="studentCode" required defaultValue={student?.studentCode ?? ''} placeholder="20262001" /></label><label>Semestre<input type="number" min="1" max="20" name="studentSemester" required defaultValue={student?.semestre ?? ''} /></label></div><label>Programa académico<select name="studentProgramId" required defaultValue={student?.programId ?? ''}><option value="">Selecciona un programa</option>{(catalogs?.programs ?? []).map((program) => <option key={program.id} value={program.id}>{program.codigo} · {program.nombre}</option>)}</select></label></fieldset>}
    {roles.includes('Tutor') && <fieldset className="role-profile-fieldset"><legend><GraduationCap size={15} /> Tutor</legend><div className="form-columns"><label>Categoría docente<input name="tutorCategory" required defaultValue={tutor?.teachingCategory ?? ''} placeholder="Tiempo completo" /></label><label>Tipo de vinculación<input name="tutorEmployment" required defaultValue={tutor?.employmentType ?? ''} placeholder="Planta" /></label><label>Periodo actual<select name="tutorPeriodId" required defaultValue={tutorAssignments[0]?.periodId ?? periods.find((period) => period.estado === 'Activo')?.id ?? ''}>{periods.map((period) => <option key={period.id} value={period.id}>{period.nombre} · {period.estado}</option>)}</select></label><label>Horas semanales<input type="number" min="1" max="60" name="tutorHours" required defaultValue={tutor?.weeklyHours ?? ''} /></label></div><SubjectDropdown label="Asignaturas asignadas" name="tutorSubjectIds" subjects={subjects} selectedIds={tutorAssignments.filter((assignment) => assignment.status === 'Activa').map((assignment) => assignment.subjectId)} /><label>Observaciones<textarea name="tutorObservations" defaultValue={tutor?.observations ?? ''} /></label></fieldset>}
    {roles.includes('Monitor') && <fieldset className="role-profile-fieldset"><legend><BookOpen size={15} /> Monitor</legend><div className="form-columns"><label>Tipo de monitor<input name="monitorType" required defaultValue={monitor?.monitorType ?? 'Monitor académico'} placeholder="Monitor académico" /></label><label>Resolución<input name="monitorResolution" defaultValue={monitor?.resolution ?? ''} placeholder="Resolución 2026-01" /></label><label>Periodo actual<select name="monitorPeriodId" required defaultValue={monitorAssignments[0]?.periodId ?? periods.find((period) => period.estado === 'Activo')?.id ?? ''}>{periods.map((period) => <option key={period.id} value={period.id}>{period.nombre} · {period.estado}</option>)}</select></label><label>Horas semanales<input type="number" min="1" max="60" name="monitorHours" required defaultValue={monitor?.weeklyHours ?? ''} /></label></div><SubjectDropdown label="Asignaturas de monitoría" name="monitorSubjectIds" subjects={subjects} selectedIds={monitorAssignments.filter((assignment) => assignment.status === 'Activa').map((assignment) => assignment.subjectId)} /><label>Observaciones<textarea name="monitorObservations" defaultValue={monitor?.observations ?? ''} /></label></fieldset>}
  </div>
}

function SubjectDropdown({ label, name, subjects, selectedIds }: { label: string; name: string; subjects: AdminCatalogs['subjects']; selectedIds: number[] }) {
  const [selected, setSelected] = useState(selectedIds)
  return <div className="subject-multiselect">
    <span className="subject-multiselect-label">{label}</span>
    <details className="subject-dropdown">
      <summary><span>{selected.length ? `${selected.length} asignaturas seleccionadas` : 'Seleccionar asignaturas'}</span><ChevronDown size={16} /></summary>
      <div className="subject-dropdown-options" role="group" aria-label={label}>
        {subjects.map((subject) => <label className="subject-dropdown-option" key={subject.id}>
          <input type="checkbox" name={name} value={subject.id} checked={selected.includes(subject.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, subject.id] : current.filter((id) => id !== subject.id))} />
          <span><strong>{subject.codigo}</strong>{subject.nombre}</span>
        </label>)}
        {!subjects.length && <span className="subject-dropdown-empty">No hay asignaturas activas.</span>}
      </div>
    </details>
  </div>
}

function UsersView({ users, accessToken, catalogs, onChange }: { users: User[]; accessToken: string; catalogs: AdminCatalogs | null; onChange: (users: User[]) => void }) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('Todos los roles')
  const [status, setStatus] = useState('Todos los estados')
  const [modal, setModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(['Estudiante'])
  const filtered = users.filter((user) => `${user.name} ${user.email} ${user.code} ${user.document ?? ''}`.toLowerCase().includes(query.toLowerCase()) && (role === 'Todos los roles' || user.roles.includes(role as Role)) && (status === 'Todos los estados' || user.status === status))
  const openCreate = () => { setEditingUser(null); setSelectedRoles(['Estudiante']); setModal(true) }
  const openEdit = (user: User) => { setEditingUser(user); setSelectedRoles(user.roles); setModal(true) }
  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const roles = selectedRoles
    if (!roles.length) return
    const email = String(form.get('email') ?? '').trim()
    const document = String(form.get('document') ?? '').trim()
    const code = String(form.get('code') ?? '').trim().toUpperCase()
    const profiles: RoleProfiles = {}
    if (roles.includes('Administrador')) profiles.administrador = { cargo: String(form.get('adminCargo') ?? ''), dependencia: String(form.get('adminDependency') ?? ''), institutionalEmail: String(form.get('adminInstitutionalEmail') ?? email), observaciones: String(form.get('adminObservations') ?? '') }
    if (roles.includes('Estudiante')) profiles.estudiante = { studentCode: String(form.get('studentCode') ?? ''), semestre: Number(form.get('studentSemester') ?? 0), programId: Number(form.get('studentProgramId') ?? 0) }
    if (roles.includes('Tutor')) { const periodId = Number(form.get('tutorPeriodId') ?? 0); profiles.tutor = { teachingCategory: String(form.get('tutorCategory') ?? ''), employmentType: String(form.get('tutorEmployment') ?? ''), currentPeriod: catalogs?.periods.find((period) => period.id === periodId)?.nombre ?? String(periodId), weeklyHours: Number(form.get('tutorHours') ?? 0), observations: String(form.get('tutorObservations') ?? ''), assignments: { subjectIds: form.getAll('tutorSubjectIds').map(Number), periodId, weeklyHours: Number(form.get('tutorHours') ?? 0) } } }
    if (roles.includes('Monitor')) { const periodId = Number(form.get('monitorPeriodId') ?? 0); profiles.monitor = { monitorType: String(form.get('monitorType') ?? ''), resolution: String(form.get('monitorResolution') ?? ''), currentPeriod: catalogs?.periods.find((period) => period.id === periodId)?.nombre ?? String(periodId), weeklyHours: Number(form.get('monitorHours') ?? 0), observations: String(form.get('monitorObservations') ?? ''), assignments: { subjectIds: form.getAll('monitorSubjectIds').map(Number), periodId, weeklyHours: Number(form.get('monitorHours') ?? 0) } } }
    try {
      if (editingUser) {
        const saved = await updateUserApi(accessToken, editingUser.id, { code, document, name, email, roles, profiles })
        onChange(users.map((user) => user.id === editingUser.id ? saved as User : user))
      } else {
        const saved = await createUserApi(accessToken, { code, document, name, email, roles, profiles })
        onChange([saved as User, ...users])
      }
      setModal(false)
      setEditingUser(null)
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible guardar el usuario.')
    }
  }
  const deleteUser = async (user: User) => {
    if (!window.confirm(`¿Desactivar a ${user.name}?`)) return
    try { await deleteUserApi(accessToken, user.id); onChange(users.map((item) => item.id === user.id ? { ...item, status: 'Inactivo' } : item)) }
    catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible desactivar el usuario.') }
  }
  const toggleUser = async (user: User) => {
    try {
      const saved = await updateUserApi(accessToken, user.id, { status: user.status === 'Activo' ? 'Inactivo' : 'Activo' })
      onChange(users.map((item) => item.id === user.id ? saved as User : item))
    } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible actualizar el estado.') }
  }
  return <><PageHeader eyebrow="Administración / Usuarios" title="Gestión de usuarios" description="Administra accesos, roles y perfiles académicos vinculados a MariaDB." action={<button className="primary-button" onClick={openCreate}><Plus size={18} /> Nuevo usuario</button>} /><section className="panel table-panel"><div className="table-toolbar"><div className="search-input"><Search size={17} /><input placeholder="Buscar por nombre, código, documento o correo..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><select value={role} onChange={(event) => setRole(event.target.value)}><option>Todos los roles</option><option>Administrador</option><option>Estudiante</option><option>Monitor</option><option>Tutor</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Todos los estados</option><option>Activo</option><option>Inactivo</option></select><button className="secondary-button filter-button" type="button" onClick={() => { setQuery(''); setRole('Todos los roles'); setStatus('Todos los estados') }}><RefreshCw size={16} /> Limpiar filtros</button></div><div className="table-meta"><span><strong>{filtered.length}</strong> usuarios encontrados</span><span>Datos persistidos en MariaDB</span></div><div className="table-scroll"><table><thead><tr><th>USUARIO</th><th>ROLES</th><th>CONTACTO</th><th>ESTADO</th><th className="align-right">ACCIONES</th></tr></thead><tbody>{filtered.map((user) => <tr key={user.id}><td><div className="person-cell"><div className="mini-avatar">{user.initials}</div><div><strong>{user.name}</strong><span>{user.code} · {user.document ?? 'Sin documento'}</span></div></div></td><td><div className="user-roles">{user.roles.map((userRole) => <span className="role-pill" key={userRole}>{userRole}</span>)}</div></td><td><span className="muted-cell">{user.email}</span></td><td><StatusPill status={user.status} /></td><td className="align-right"><div className="action-group"><button className="row-action" onClick={() => openEdit(user)}>Editar</button><button className="row-action" onClick={() => toggleUser(user)}>{user.status === 'Activo' ? 'Desactivar' : 'Activar'}</button><button className="row-action danger-action" onClick={() => deleteUser(user)}>Desactivar</button></div></td></tr>)}</tbody></table></div></section>{modal && <Modal title={editingUser ? 'Editar usuario' : 'Nuevo usuario'} subtitle="Los campos específicos aparecen según el o los roles seleccionados." onClose={() => setModal(false)}><form className="modal-form" onSubmit={saveUser} key={editingUser?.id ?? 'new'}><div className="form-columns"><label>Código institucional<input name="code" required defaultValue={editingUser?.code ?? ''} placeholder="Ej. EST004" /></label><label>Documento de identidad<input name="document" required defaultValue={editingUser?.document ?? ''} placeholder="Ej. 1093432540" /></label></div><label>Nombre completo<input name="name" required defaultValue={editingUser?.name ?? ''} placeholder="Ej. Ana María López" /></label><label>Correo institucional<input type="email" name="email" required defaultValue={editingUser?.email ?? ''} placeholder="correo@unitropico.edu.co" /></label><fieldset className="role-options"><legend>Roles de acceso</legend>{(['Administrador', 'Tutor', 'Monitor', 'Estudiante'] as Role[]).map((availableRole) => <label className="role-option" key={availableRole}><input type="checkbox" name="roles" value={availableRole} checked={selectedRoles.includes(availableRole)} onChange={() => setSelectedRoles((current) => current.includes(availableRole) ? current.filter((item) => item !== availableRole) : [...current, availableRole])} /><span>{availableRole}</span></label>)}</fieldset><RoleProfileFields roles={selectedRoles} catalogs={catalogs} user={editingUser} /><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(false)}>Cancelar</button><button className="primary-button" type="submit">{editingUser ? 'Guardar cambios' : 'Crear usuario'}</button></div></form></Modal>}</>
}

function LegacySpacesView({ spaces, accessToken, onChange }: { spaces: Space[]; accessToken: string; onChange: (spaces: Space[]) => void }) {
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(false)
  const [editingSpace, setEditingSpace] = useState<Space | null>(null)
  const filtered = spaces.filter((space) => `${space.name} ${space.code} ${space.location}`.toLowerCase().includes(query.toLowerCase()))
  const openCreate = () => { setEditingSpace(null); setModal(true) }
  const openEdit = (space: Space) => { setEditingSpace(space); setModal(true) }
  const saveSpace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const spaceData = { code: String(form.get('code') ?? '').trim().toUpperCase(), name: String(form.get('name') ?? '').trim(), type: String(form.get('type') ?? 'Aula'), location: String(form.get('location') ?? '').trim(), capacity: Number(form.get('capacity') ?? 0) }
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
    } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible guardar el espacio.') }
  }
  const deleteSpace = async (space: Space) => { if (!window.confirm(`¿Desactivar ${space.name}?`)) return; try { await deleteSpaceApi(accessToken, space.id); onChange(spaces.map((item) => item.id === space.id ? { ...item, status: 'Inactivo' } : item)) } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible desactivar el espacio.') } }
  const toggleSpace = async (space: Space) => { try { const saved = await updateSpaceApi(accessToken, space.id, { status: space.status === 'Activo' ? 'Inactivo' : 'Activo' }); onChange(spaces.map((item) => item.id === space.id ? saved as Space : item)) } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible actualizar el espacio.') } }
  return <><PageHeader eyebrow="Administración / Espacios" title="Gestión de espacios" description="Organiza los espacios disponibles para las sesiones de acompañamiento." action={<button className="primary-button" onClick={openCreate}><Plus size={18} /> Nuevo espacio</button>} /><section className="panel table-panel"><div className="table-toolbar"><div className="search-input"><Search size={17} /><input placeholder="Buscar por nombre, código o ubicación..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><button className="secondary-button filter-button"><Settings2 size={16} /> Filtros</button></div><div className="table-meta"><span><strong>{filtered.length}</strong> espacios registrados</span><span><span className="legend-dot active-legend" /> Datos de MariaDB</span></div><div className="space-grid">{filtered.map((space) => <article className="space-card" key={space.id}><div className="space-card-top"><div className="space-icon"><Building2 size={19} /></div><StatusPill status={space.status} /></div><span className="space-code">{space.code}</span><h3>{space.name}</h3><p>{space.location}</p><div className="space-card-footer"><span><UsersRound size={15} /> Capacidad <b>{space.capacity}</b></span><span>{space.type}</span></div><div className="space-actions"><button className="space-toggle" onClick={() => toggleSpace(space)}>{space.status === 'Activo' ? 'Marcar no disponible' : 'Habilitar espacio'}</button><button className="row-action" onClick={() => openEdit(space)}>Editar</button><button className="row-action danger-action" onClick={() => deleteSpace(space)}>Eliminar</button></div></article>)}</div></section>{modal && <Modal title={editingSpace ? 'Editar espacio' : 'Nuevo espacio'} subtitle="Registra la información del espacio académico." onClose={() => setModal(false)}><form className="modal-form" onSubmit={saveSpace} key={editingSpace?.id ?? 'new'}><div className="form-columns"><label>Código<input name="code" required defaultValue={editingSpace?.code ?? ''} placeholder="Ej. 305A" /></label><label>Capacidad<input name="capacity" type="number" min="1" required defaultValue={editingSpace?.capacity ?? ''} placeholder="30" /></label></div><label>Nombre del espacio<input name="name" required defaultValue={editingSpace?.name ?? ''} placeholder="Ej. Salón 305A" /></label><label>Ubicación<input name="location" required defaultValue={editingSpace?.location ?? ''} placeholder="Bloque A · Piso 3" /></label><label>Tipo<select name="type" defaultValue={editingSpace?.type ?? 'Aula'}><option>Aula</option><option>Laboratorio</option><option>Biblioteca</option><option>Sala</option></select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(false)}>Cancelar</button><button className="primary-button" type="submit">{editingSpace ? 'Guardar cambios' : 'Crear espacio'}</button></div></form></Modal>}</>
}

function LegacyRequestsView({ requests, accessToken, onChange }: { requests: Request[]; accessToken: string; onChange: (requests: Request[]) => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todos los estados')
  const filtered = requests.filter((request) => `${request.student} ${request.subject}`.toLowerCase().includes(query.toLowerCase()) && (status === 'Todos los estados' || request.status === status))
  const updateStatus = async (id: number, nextStatus: Request['status']) => {
    try {
      const saved = await updateRequestApi(accessToken, id, nextStatus)
      onChange(requests.map((request) => request.id === id ? saved as Request : request))
    } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible actualizar la solicitud.') }
  }
  return <><PageHeader eyebrow="Administración / Solicitudes" title="Gestión de solicitudes" description="Revisa, prioriza y asigna las solicitudes de acompañamiento académico." action={<button className="secondary-button"><CalendarDays size={17} /> Ver calendario</button>} /><section className="panel table-panel"><div className="table-toolbar"><div className="search-input"><Search size={17} /><input placeholder="Buscar por estudiante o asignatura..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Todos los estados</option><option>Pendiente</option><option>Aprobada</option><option>Asignada</option><option>Rechazada</option><option>Cancelada</option><option>Atendida</option><option>Finalizada</option></select><button className="secondary-button filter-button"><Settings2 size={16} /> Filtros</button></div><div className="table-meta"><span><strong>{filtered.length}</strong> solicitudes encontradas</span><span><span className="priority-dot" /> Datos persistidos en MariaDB</span></div><div className="table-scroll"><table><thead><tr><th>SOLICITUD</th><th>TIPO</th><th>PRIORIDAD</th><th>ESTADO</th><th>FECHA</th><th className="align-right">ACCIONES</th></tr></thead><tbody>{filtered.map((request) => <tr key={request.id}><td><div className="request-cell"><div className="request-id">#{String(request.id).padStart(4, '0')}</div><div><strong>{request.subject}</strong><span>{request.student}</span></div></div></td><td><span className="type-label"><span className={request.type === 'Monitoría' ? 'type-dot blue-dot' : 'type-dot purple-dot'} />{request.type}</span></td><td><span className={`priority ${request.priority.toLowerCase()}`}><span />{request.priority}</span></td><td><RequestStatus status={request.status} /></td><td><span className="muted-cell">{request.date}</span></td><td className="align-right"><div className="actions-inline">{request.status === 'Pendiente' && <><button className="approve-action" onClick={() => updateStatus(request.id, 'Aprobada')} title="Aprobar"><Check size={16} /></button><button className="reject-action" onClick={() => updateStatus(request.id, 'Rechazada')} title="Rechazar"><X size={16} /></button></>} {request.status === 'Aprobada' && <button className="row-action" onClick={() => updateStatus(request.id, 'Asignada')}>Asignar</button>}</div></td></tr>)}</tbody></table></div></section></>
}

function SpacesView({ spaces, accessToken, onChange }: { spaces: Space[]; accessToken: string; onChange: (spaces: Space[]) => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todos los estados')
  const [type, setType] = useState('Todos los tipos')
  const [building, setBuilding] = useState('Todos los edificios')
  const [modal, setModal] = useState(false)
  const [editingSpace, setEditingSpace] = useState<Space | null>(null)
  const displayBuilding = (space: Space) => space.building || (space.block ? `Bloque ${space.block}` : '')
  const buildings = [...new Set(spaces.map(displayBuilding).filter(Boolean))]
  const filtered = spaces.filter((space) => `${space.name} ${space.code} ${space.location} ${displayBuilding(space)} ${space.room ?? ''}`.toLowerCase().includes(query.toLowerCase()) && (status === 'Todos los estados' || space.status === status) && (type === 'Todos los tipos' || space.type === type) && (building === 'Todos los edificios' || displayBuilding(space) === building))
  const openCreate = () => { setEditingSpace(null); setModal(true) }
  const openEdit = (space: Space) => { setEditingSpace(space); setModal(true) }
  const saveSpace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const building = String(form.get('building') ?? '').trim()
    const block = String(form.get('block') ?? '').trim()
    const room = String(form.get('room') ?? '').trim()
    const floor = String(form.get('floor') ?? '').trim()
    const location = [building, block && `Bloque ${block}`, room && `Salón ${room}`, floor && `Piso ${floor}`].filter(Boolean).join(' · ') || editingSpace?.location || ''
    const spaceData = { code: String(form.get('code') ?? '').trim().toUpperCase(), name: String(form.get('name') ?? '').trim(), building, block, room, floor, location, description: String(form.get('description') ?? '').trim(), resources: String(form.get('resources') ?? '').trim(), observations: String(form.get('observations') ?? '').trim(), capacity: Number(form.get('capacity') ?? 0), type: String(form.get('type') ?? 'Aula'), status: String(form.get('status') ?? 'Activo') as Status }
    try {
      if (editingSpace) { const saved = await updateSpaceApi(accessToken, editingSpace.id, spaceData); onChange(spaces.map((space) => space.id === editingSpace.id ? saved as Space : space)) }
      else { const saved = await createSpaceApi(accessToken, spaceData); onChange([saved as Space, ...spaces]) }
      setModal(false); setEditingSpace(null)
    } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible guardar el espacio.') }
  }
  const deleteSpace = async (space: Space) => { if (!window.confirm(`¿Desactivar ${space.name}?`)) return; try { await deleteSpaceApi(accessToken, space.id); onChange(spaces.map((item) => item.id === space.id ? { ...item, status: 'Inactivo' } : item)) } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible desactivar el espacio.') } }
  const toggleSpace = async (space: Space) => { try { const saved = await updateSpaceApi(accessToken, space.id, { status: space.status === 'Activo' ? 'Inactivo' : 'Activo' }); onChange(spaces.map((item) => item.id === space.id ? saved as Space : item)) } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible actualizar el espacio.') } }
  const clearFilters = () => { setQuery(''); setStatus('Todos los estados'); setType('Todos los tipos'); setBuilding('Todos los edificios') }
  return <><PageHeader eyebrow="Administración / Espacios" title="Gestión de espacios" description="Registra la ubicación, capacidad, recursos y disponibilidad de los espacios para tutorías y monitorías." action={<button className="primary-button" onClick={openCreate}><Plus size={18} /> Nuevo espacio</button>} /><section className="panel table-panel"><div className="table-toolbar"><div className="search-input"><Search size={17} /><input placeholder="Buscar por código, salón, edificio o ubicación..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><select value={type} onChange={(event) => setType(event.target.value)}><option>Todos los tipos</option><option>Aula</option><option>Laboratorio</option><option>Sala</option><option>Sala de informática</option><option>Biblioteca</option><option>Salón de reuniones</option><option>Virtual</option><option>Otro</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Todos los estados</option><option>Activo</option><option>Inactivo</option></select><button className="secondary-button filter-button" onClick={clearFilters}><RefreshCw size={16} /> Limpiar</button></div><div className="space-filter-row"><label>Edificio<select value={building} onChange={(event) => setBuilding(event.target.value)}><option>Todos los edificios</option>{buildings.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="table-meta"><span><strong>{filtered.length}</strong> espacios registrados</span><span><span className="legend-dot active-legend" /> Datos de MariaDB</span></div><div className="space-grid">{filtered.map((space) => <article className="space-card" key={space.id}><div className="space-card-top"><div className="space-icon"><Building2 size={19} /></div><StatusPill status={space.status} /></div><span className="space-code">{space.code}</span><h3>{space.name}</h3><p>{[space.building, space.block && `Bloque ${space.block}`, space.room && `Salón ${space.room}`, space.floor && `Piso ${space.floor}`].filter(Boolean).join(' · ') || space.location || 'Ubicación pendiente'}</p><div className="space-card-footer"><span><UsersRound size={15} /> Capacidad <b>{space.capacity}</b></span><span>{space.type}</span></div><div className="space-actions"><button className="space-toggle" onClick={() => toggleSpace(space)}>{space.status === 'Activo' ? 'Marcar no disponible' : 'Habilitar espacio'}</button><button className="row-action" onClick={() => openEdit(space)}>Editar</button><button className="row-action danger-action" onClick={() => deleteSpace(space)}>Desactivar</button></div></article>)}</div></section>{modal && <Modal title={editingSpace ? 'Editar espacio' : 'Nuevo espacio'} subtitle="Completa la ficha física y operativa del espacio académico." wide onClose={() => setModal(false)}><form className="modal-form" onSubmit={saveSpace} key={editingSpace?.id ?? 'new'}><div className="form-columns"><label>Código<input name="code" required defaultValue={editingSpace?.code ?? ''} placeholder="Ej. LAB-02" /></label><label>Nombre<input name="name" required defaultValue={editingSpace?.name ?? ''} placeholder="Ej. Laboratorio de sistemas" /></label></div><div className="form-columns"><label>Edificio<input name="building" defaultValue={editingSpace?.building ?? ''} placeholder="Edificio principal" /></label><label>Bloque<input name="block" defaultValue={editingSpace?.block ?? ''} placeholder="A" /></label><label>Salón / aula<input name="room" defaultValue={editingSpace?.room ?? ''} placeholder="202B" /></label><label>Piso<input name="floor" defaultValue={editingSpace?.floor ?? ''} placeholder="2" /></label></div><div className="form-columns"><label>Tipo<select name="type" defaultValue={editingSpace?.type ?? 'Aula'}><option>Aula</option><option>Laboratorio</option><option>Sala</option><option>Sala de informática</option><option>Biblioteca</option><option>Salón de reuniones</option><option>Virtual</option><option>Otro</option></select></label><label>Capacidad<input name="capacity" type="number" min="1" max="1000" required defaultValue={editingSpace?.capacity ?? ''} placeholder="30" /></label><label>Estado<select name="status" defaultValue={editingSpace?.status ?? 'Activo'}><option>Activo</option><option>Inactivo</option></select></label></div><label>Ubicación detallada<input name="location" defaultValue={editingSpace?.location ?? ''} placeholder="Referencia para llegar al espacio" /></label><label>Descripción<textarea name="description" defaultValue={editingSpace?.description ?? ''} placeholder="Características del espacio y condiciones de uso" /></label><label>Recursos disponibles<textarea name="resources" defaultValue={editingSpace?.resources ?? ''} placeholder="Video beam, tablero, computadores, conexión..." /></label><label>Observaciones<textarea name="observations" defaultValue={editingSpace?.observations ?? ''} placeholder="Restricciones, horarios o notas administrativas" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(false)}>Cancelar</button><button className="primary-button" type="submit">{editingSpace ? 'Guardar cambios' : 'Crear espacio'}</button></div></form></Modal>}</>
}

function RequestsView({ requests, accessToken, catalogs, onChange }: { requests: Request[]; accessToken: string; catalogs: AdminCatalogs | null; onChange: (requests: Request[]) => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todos los estados')
  const [subjectId, setSubjectId] = useState('Todos')
  const [modal, setModal] = useState(false)
  const filtered = requests.filter((request) => `${request.student} ${request.subject} ${request.program ?? ''} ${request.motive ?? ''}`.toLowerCase().includes(query.toLowerCase()) && (status === 'Todos los estados' || request.status === status) && (subjectId === 'Todos' || String(request.subjectId) === subjectId))
  const updateStatus = async (id: number, nextStatus: Request['status']) => { try { const saved = await updateRequestApi(accessToken, id, nextStatus); onChange(requests.map((request) => request.id === id ? saved as Request : request)) } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible actualizar la solicitud.') } }
  const createRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const studentId = Number(form.get('studentId'))
    const student = catalogs?.students.find((item) => item.id === studentId)
    if (!student?.programId) {
      window.alert('El estudiante seleccionado no tiene un programa académico activo.')
      return
    }
    try {
      const saved = await createAdminRequest(accessToken, {
        studentId,
        programId: student.programId,
        subjectId: Number(form.get('subjectId')),
        type: String(form.get('type')) as 'Monitoría' | 'Tutoría' | 'Acompañamiento',
        priority: String(form.get('priority')) as 'Alta' | 'Media' | 'Baja',
        motive: String(form.get('motive') ?? ''),
        description: String(form.get('description') ?? ''),
        periodId: Number(form.get('periodId')) || undefined,
      })
      onChange([saved as Request, ...requests])
      setModal(false)
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'No fue posible crear la solicitud.')
    }
  }
  const clearFilters = () => { setQuery(''); setStatus('Todos los estados'); setSubjectId('Todos') }
  const requestTypes = catalogs?.requestTypes.map((item) => item.nombre).filter((name): name is 'Monitoría' | 'Tutoría' | 'Acompañamiento' => ['Monitoría', 'Tutoría', 'Acompañamiento'].includes(name as never)) ?? []
  return <>
    <PageHeader eyebrow="Administración / Solicitudes" title="Gestión de solicitudes" description="Crea solicitudes SAT o de acompañamiento, revisa su prioridad y controla el flujo de atención." action={<button className="primary-button" onClick={() => setModal(true)}><Plus size={18} /> Nueva solicitud</button>} />
    <section className="panel table-panel">
      <div className="table-toolbar">
        <div className="search-input"><Search size={17} /><input placeholder="Buscar por estudiante, programa, asignatura o motivo..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="Todos">Todas las asignaturas</option>{(catalogs?.subjects ?? []).map((subject) => <option key={subject.id} value={subject.id}>{subject.nombre}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option>Todos los estados</option><option>Pendiente</option><option>Aprobada</option><option>Asignada</option><option>Rechazada</option><option>Cancelada</option><option>Atendida</option><option>Finalizada</option></select>
        <button className="secondary-button filter-button" onClick={clearFilters}><RefreshCw size={16} /> Limpiar</button>
      </div>
      <div className="table-meta"><span><strong>{filtered.length}</strong> solicitudes encontradas</span><span><span className="priority-dot" /> Datos persistidos en MariaDB</span></div>
      <div className="table-scroll"><table><thead><tr><th>SOLICITUD</th><th>PROGRAMA</th><th>TIPO</th><th>PRIORIDAD</th><th>ESTADO</th><th>FECHA</th><th className="align-right">ACCIONES</th></tr></thead><tbody>{filtered.map((request) => <tr key={request.id}><td><div className="request-cell"><div className="request-id">#{String(request.id).padStart(4, '0')}</div><div><strong>{request.subject}</strong><span>{request.student}</span>{request.motive && <small className="table-subtext">{request.motive}</small>}</div></div></td><td>{request.program ?? '—'}</td><td><span className="type-label"><span className={request.type === 'Monitoría' ? 'type-dot blue-dot' : 'type-dot purple-dot'} />{request.type}</span></td><td><span className={`priority ${request.priority.toLowerCase()}`}><span />{request.priority}</span></td><td><RequestStatus status={request.status} /></td><td><span className="muted-cell">{request.date}</span></td><td className="align-right"><div className="actions-inline">{request.status === 'Pendiente' && <><button className="approve-action" onClick={() => updateStatus(request.id, 'Aprobada')} title="Aprobar"><Check size={16} /></button><button className="reject-action" onClick={() => updateStatus(request.id, 'Rechazada')} title="Rechazar"><X size={16} /></button></>}{request.status === 'Aprobada' && <button className="row-action" onClick={() => updateStatus(request.id, 'Asignada')}>Asignar</button>}</div></td></tr>)}</tbody></table></div>
    </section>
    {modal && <Modal title="Crear solicitud administrativa" subtitle="Selecciona al estudiante y el programa se asignará desde su perfil." wide onClose={() => setModal(false)}>
      <form className="modal-form" onSubmit={createRequest}>
        <div className="form-columns">
          <label>Estudiante solicitante<select name="studentId" required defaultValue=""><option value="">Selecciona un estudiante</option>{(catalogs?.students ?? []).map((student) => <option key={student.id} value={student.id} disabled={!student.programId}>{student.name} · {student.studentCode} · {student.programName ?? 'Sin programa activo'}</option>)}</select></label>
          <label>Asignatura<select name="subjectId" required defaultValue=""><option value="">Selecciona una asignatura</option>{(catalogs?.subjects ?? []).map((subject) => <option key={subject.id} value={subject.id}>{subject.codigo} · {subject.nombre}</option>)}</select></label>
        </div>
        <div className="form-columns">
          <label>Periodo académico<select name="periodId" defaultValue={catalogs?.periods.find((period) => period.estado === 'Activo')?.id ?? ''}>{(catalogs?.periods ?? []).map((period) => <option key={period.id} value={period.id}>{period.nombre} · {period.estado}</option>)}</select></label>
          <label>Tipo de acompañamiento<select name="type" defaultValue={requestTypes[0] ?? 'Monitoría'}>{(requestTypes.length ? requestTypes : ['Monitoría', 'Tutoría', 'Acompañamiento']).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Prioridad<select name="priority" defaultValue="Alta"><option>Alta</option><option>Media</option><option>Baja</option></select></label>
        </div>
        <label>Motivo<input name="motive" required placeholder="Ej. SAT - tercera vez cursando la asignatura" /></label>
        <label>Descripción detallada<textarea name="description" required placeholder="Explica el contexto, antecedentes y apoyo requerido" /></label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(false)}>Cancelar</button><button className="primary-button" type="submit"><Send size={17} /> Crear solicitud</button></div>
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

function ConfigurationView({ accessToken }: { accessToken: string }) {
  const [role, setRole] = useState('')
  const [accounts, setAccounts] = useState<CredentialAccount[]>([])
  const [settings, setSettings] = useState<AppSetting[]>([])
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const loadAccounts = async (selectedRole = role) => { setLoading(true); try { setAccounts(await listCredentials(accessToken, selectedRole)) } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible cargar las credenciales.') } finally { setLoading(false) } }
  useEffect(() => { void Promise.all([loadAccounts(''), listSettings(accessToken).then(setSettings).catch(() => undefined)]) }, [accessToken])
  const reset = async (account: CredentialAccount) => { if (!window.confirm(`¿Restablecer la contraseña de ${account.name} al documento registrado?`)) return; try { const result = await resetCredential(accessToken, account.id); setAccounts(accounts.map((item) => item.id === account.id ? { ...item, initialPassword: result.initialPassword } : item)); window.alert('Credencial restablecida. La contraseña inicial vuelve a ser el documento de identidad.') } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible restablecer la credencial.') } }
  const savePassword = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); try { await changePassword(accessToken, passwords); setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); window.alert('Contraseña actualizada correctamente.') } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible cambiar la contraseña.') } }
  const saveSettings = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); try { setSettings(await updateSettings(accessToken, settings.map((setting) => ({ key: setting.clave, value: setting.valor })))); window.alert('Configuración guardada.') } catch (error) { window.alert(error instanceof ApiError ? error.message : 'No fue posible guardar la configuración.') } }
  const exportCredentials = () => downloadCsv(`credenciales${role ? `-${role.toLowerCase()}` : ''}.csv`, accounts.map((account) => ({ nombre: account.name, codigo: account.code, correo: account.email, roles: account.roles.join(' / '), estado: account.status, contraseña_inicial: account.initialPassword })))
  return <><PageHeader eyebrow="Administración / Configuración" title="Configuración y credenciales" description="Gestiona contraseñas, credenciales iniciales y parámetros operativos del sistema." action={<button className="secondary-button" onClick={exportCredentials} disabled={!accounts.length}><Download size={17} /> Exportar credenciales</button>} /><div className="configuration-grid"><section className="panel table-panel"><div className="panel-heading"><div><h3>Credenciales de usuarios</h3><p>La contraseña inicial corresponde al documento de identidad.</p></div><KeyRound size={20} /></div><div className="table-toolbar config-toolbar"><select value={role} onChange={(event) => { setRole(event.target.value); void loadAccounts(event.target.value) }}><option value="">Todos los roles</option><option>Administrador</option><option>Estudiante</option><option>Tutor</option><option>Monitor</option></select><button className="secondary-button filter-button" onClick={() => void loadAccounts()}><RefreshCw size={16} /> {loading ? 'Cargando...' : 'Actualizar'}</button></div><div className="table-scroll"><table><thead><tr><th>USUARIO</th><th>ROLES</th><th>CONTRASEÑA INICIAL</th><th>ESTADO</th><th /></tr></thead><tbody>{accounts.map((account) => <tr key={account.id}><td><strong>{account.name}</strong><span className="table-subtext">{account.email}</span></td><td><div className="user-roles">{account.roles.map((item) => <span className="role-pill" key={item}>{item}</span>)}</div></td><td><code className="credential-code">{account.initialPassword}</code></td><td>{account.status}</td><td className="align-right"><button className="row-action" onClick={() => void reset(account)}>Restablecer</button></td></tr>)}</tbody></table></div></section><section className="panel form-panel"><div className="panel-heading"><div><h3>Cambiar mi contraseña</h3><p>Usa una contraseña nueva de mínimo ocho caracteres.</p></div><LockKeyhole size={20} /></div><form className="portal-form" onSubmit={savePassword}><label>Contraseña actual<input type="password" required value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label><label>Nueva contraseña<input type="password" minLength={8} required value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label><label>Confirmar contraseña<input type="password" minLength={8} required value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} /></label><button className="primary-button" type="submit"><KeyRound size={17} /> Cambiar contraseña</button></form></section></div><section className="panel form-panel settings-panel"><div className="panel-heading"><div><h3>Parámetros institucionales</h3><p>Valores almacenados en la tabla Configuracion.</p></div><Settings2 size={20} /></div><form className="settings-form" onSubmit={saveSettings}>{settings.map((setting) => <label key={setting.id}>{setting.descripcion || setting.clave}<input value={setting.valor} onChange={(event) => setSettings(settings.map((item) => item.id === setting.id ? { ...item, valor: event.target.value } : item))} /></label>)}<button className="primary-button" type="submit"><Check size={17} /> Guardar parámetros</button></form></section></>
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
}

function StatusPill({ status }: { status: Status }) { return <span className={`status-pill ${status.toLowerCase()}`}><span />{status}</span> }
function RequestStatus({ status }: { status: Request['status'] }) { return <span className={`request-status ${status.toLowerCase()}`}><span />{status}</span> }
function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle: string; children: ReactNode; onClose: () => void; wide?: boolean }) { return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className={`modal ${wide ? 'modal-wide' : ''}`}><div className="modal-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>{children}</div></div> }

export default App
