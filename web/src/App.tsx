import { FormEvent, ReactNode, useEffect, useState } from 'react'
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
} from 'lucide-react'

type Role = 'Administrador' | 'Tutor' | 'Monitor' | 'Estudiante'
type PortalRole = Exclude<Role, 'Administrador'>
type View = 'dashboard' | 'usuarios' | 'espacios' | 'solicitudes'
type PortalView = 'inicio' | 'disponibilidad' | 'horarios' | 'solicitudes' | 'sesiones' | 'informes' | 'solicitar' | 'mis-solicitudes' | 'mis-sesiones'
type Status = 'Activo' | 'Inactivo'

type User = {
  id: number
  code: string
  name: string
  email: string
  document: string
  roles: Role[]
  status: Status
  initials: string
}

type Space = {
  id: number
  code: string
  name: string
  type: string
  location: string
  capacity: number
  status: Status
}

type Request = {
  id: number
  student: string
  subject: string
  type: 'Monitoría' | 'Tutoría'
  priority: 'Alta' | 'Media' | 'Baja'
  status: 'Pendiente' | 'Aprobada' | 'Asignada' | 'Rechazada'
  date: string
}

const initialUsers: User[] = [
  { id: 1, code: 'ADM001', name: 'Jayson Eric Quintero', email: 'jaysonquintero@unitropico.edu.co', document: '1000000010', roles: ['Administrador'], status: 'Activo', initials: 'JQ' },
  { id: 2, code: 'MON001', name: 'Brayham Orlando Lindarte', email: 'brayhamlindarte.es@unitropico.edu.co', document: '1093432540', roles: ['Monitor', 'Estudiante'], status: 'Activo', initials: 'BL' },
  { id: 3, code: 'MON002', name: 'Karen Alejandra Gaitán', email: 'karengaitan.es@unitropico.edu.co', document: '1029800072', roles: ['Monitor', 'Estudiante'], status: 'Activo', initials: 'KG' },
  { id: 4, code: 'TUT001', name: 'Raúl Fernando Robayo', email: 'tutormatematica@unitropico.edu.co', document: '1007418843', roles: ['Tutor'], status: 'Activo', initials: 'RR' },
  { id: 5, code: 'EST001', name: 'María Valentina Amezquita', email: 'mariaamezquita.es@unitropico.edu.co', document: '1029663952', roles: ['Estudiante'], status: 'Activo', initials: 'MA' },
]

const initialSpaces: Space[] = [
  { id: 1, code: '101A', name: 'Salón 101A', type: 'Aula', location: 'Bloque A · Piso 1', capacity: 20, status: 'Activo' },
  { id: 2, code: 'BIB01', name: 'Biblioteca central', type: 'Biblioteca', location: 'Edificio Biblioteca · Piso 1', capacity: 40, status: 'Activo' },
  { id: 3, code: 'LAB02', name: 'Laboratorio de sistemas', type: 'Laboratorio', location: 'Bloque C · Piso 2', capacity: 28, status: 'Activo' },
  { id: 4, code: '202B', name: 'Salón 202B', type: 'Aula', location: 'Bloque B · Piso 2', capacity: 22, status: 'Inactivo' },
]

const initialRequests: Request[] = [
  { id: 1, student: 'María Valentina Amezquita', subject: 'Pensamiento matemático', type: 'Monitoría', priority: 'Alta', status: 'Pendiente', date: '30 sep 2026' },
  { id: 2, student: 'Sofía Alejandra Cárdenas', subject: 'Fundamentos de contabilidad', type: 'Tutoría', priority: 'Media', status: 'Aprobada', date: '29 sep 2026' },
  { id: 3, student: 'María Sthefanía Montañez', subject: 'Algoritmos y computación', type: 'Monitoría', priority: 'Media', status: 'Asignada', date: '28 sep 2026' },
  { id: 4, student: 'Daniel Andrés Pérez', subject: 'Cálculo diferencial', type: 'Tutoría', priority: 'Baja', status: 'Rechazada', date: '26 sep 2026' },
]

const usersStorageKey = 'acadex:users'

function loadUsers(): User[] {
  try {
    const savedUsers = window.localStorage.getItem(usersStorageKey)
    if (savedUsers) {
      const parsedUsers: unknown = JSON.parse(savedUsers)
      if (Array.isArray(parsedUsers)) return parsedUsers as User[]
    }
  } catch {
    // If browser storage is unavailable or malformed, start with the demo users.
  }
  return initialUsers
}

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [view, setView] = useState<View>('dashboard')
  const [portalView, setPortalView] = useState<PortalView>('inicio')
  const [loginError, setLoginError] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [users, setUsers] = useState<User[]>(loadUsers)
  const [spaces, setSpaces] = useState(initialSpaces)
  const [requests, setRequests] = useState(initialRequests)

  useEffect(() => {
    try {
      window.localStorage.setItem(usersStorageKey, JSON.stringify(users))
    } catch {
      // Keep the interface usable if browser storage is disabled or full.
    }
  }, [users])

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim().toLowerCase()
    const document = String(form.get('password') ?? '').trim()
    const user = users.find((candidate) => candidate.email.toLowerCase() === email && candidate.document === document && candidate.status === 'Activo')

    if (user) {
      setAuthenticated(true)
      setCurrentUser(user)
      setSelectedRole(user.roles.length === 1 ? user.roles[0] : null)
      setLoginError('')
      return
    }

    setLoginError('Credenciales no válidas. Usa tu correo institucional y documento de identidad.')
  }

  const logout = () => {
    setAuthenticated(false)
    setCurrentUser(null)
    setSelectedRole(null)
    setView('dashboard')
    setPortalView('inicio')
  }

  if (!authenticated || !currentUser) return <LoginPage onSubmit={handleLogin} error={loginError} />

  if (!selectedRole) return <RoleSelector user={currentUser} onSelect={(role) => { setSelectedRole(role); setPortalView('inicio') }} onLogout={logout} />

  if (selectedRole !== 'Administrador') {
    return <RoleShell user={currentUser} activeRole={selectedRole} view={portalView} onNavigate={setPortalView} onLogout={logout} onChangeRole={() => { setSelectedRole(null); setPortalView('inicio') }} requests={requests} onRequestsChange={setRequests} />
  }

  return (
    <AdminShell
      user={currentUser}
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
      {view === 'dashboard' && <Dashboard users={users} spaces={spaces} requests={requests} onNavigate={setView} />}
      {view === 'usuarios' && <UsersView users={users} onChange={setUsers} />}
      {view === 'espacios' && <SpacesView spaces={spaces} onChange={setSpaces} />}
      {view === 'solicitudes' && <RequestsView requests={requests} onChange={setRequests} />}
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
            <div className="form-row"><label className="check-label"><input type="checkbox" checked={rememberEmail} onChange={(event) => setRememberEmail(event.target.checked)} /> <span>Recordarme</span></label><a href="#recuperar">¿Olvidaste tu contraseña?</a></div>
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

function RoleSelector({ user, onSelect, onLogout }: { user: User; onSelect: (role: Role) => void; onLogout: () => void }) {
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

  return <div className="role-selector-backdrop"><section className="role-selector-card" role="dialog" aria-modal="true" aria-labelledby="role-selector-title"><div className="role-selector-header"><div><span className="eyebrow">Acceso institucional</span><h2 id="role-selector-title">¿Con qué rol deseas ingresar?</h2><p>{user.name}, selecciona el espacio que quieres utilizar en esta sesión.</p></div><button className="modal-close" onClick={onLogout} aria-label="Cerrar sesión"><X size={18} /></button></div><div className="role-selector-grid">{user.roles.map((availableRole) => <button key={availableRole} className={`role-card ${role === availableRole ? 'selected' : ''}`} onClick={() => setRole(availableRole)}><span className="role-card-icon">{icons[availableRole]}</span><span><strong>{availableRole}</strong><small>{descriptions[availableRole]}</small></span>{role === availableRole && <Check size={18} />}</button>)}</div><div className="role-selector-actions"><button className="secondary-button" onClick={onLogout}>Cerrar sesión</button><button className="primary-button" onClick={() => onSelect(role)}>Continuar <ArrowRight size={17} /></button></div></section></div>
}

function AdminShell({ user, activeRole, children, view, onNavigate, onLogout, onChangeRole, mobileNav, onToggleMobileNav }: { user: User; activeRole: Role; children: ReactNode; view: View; onNavigate: (view: View) => void; onLogout: () => void; onChangeRole: () => void; mobileNav: boolean; onToggleMobileNav: () => void }) {
  const navItems: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'dashboard', label: 'Resumen general', icon: <LayoutDashboard size={19} /> },
    { id: 'usuarios', label: 'Gestión de usuarios', icon: <UsersRound size={19} /> },
    { id: 'espacios', label: 'Gestión de espacios', icon: <Building2 size={19} /> },
    { id: 'solicitudes', label: 'Gestión de solicitudes', icon: <CalendarDays size={19} /> },
  ]
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <AcadexBrand className="sidebar-brand" />
          <button className="sidebar-close" onClick={onToggleMobileNav}><X size={18} /></button>
          <div className="workspace-card"><div className="workspace-icon"><Settings2 size={16} /></div><div><span>Espacio de trabajo</span><strong>Administración</strong></div><ChevronDown size={16} /></div>
          <nav className="main-nav"><span className="nav-label">MENÚ PRINCIPAL</span>{navItems.map((item) => <button key={item.id} className={view === item.id ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate(item.id)}>{item.icon}<span>{item.label}</span>{item.id === 'solicitudes' && <span className="nav-count">4</span>}</button>)}</nav>
        </div>
        <div className="sidebar-bottom"><UniversitySignature onGreen /><div className="help-card"><CircleAlert size={17} /><div><strong>¿Necesitas ayuda?</strong><span>Consulta el centro de soporte</span></div><ArrowRight size={15} /></div><button className="nav-item" onClick={onLogout}><LogOut size={19} /><span>Cerrar sesión</span></button></div>
      </aside>
      {mobileNav && <button className="mobile-overlay" aria-label="Cerrar menú" onClick={onToggleMobileNav} />}
      <div className="main-area">
        <header className="topbar"><button className="mobile-menu" onClick={onToggleMobileNav} aria-label="Abrir menú"><Menu size={22} /></button><div className="breadcrumb"><span>Administración</span><span>/</span><strong>{navItems.find((item) => item.id === view)?.label ?? 'Resumen general'}</strong></div><div className="topbar-actions"><span className="period-chip"><span className="status-dot" />Periodo 2026-2</span><button className="icon-button" aria-label="Notificaciones"><Activity size={19} /><i>3</i></button>{user.roles.length > 1 && <button className="role-switcher" onClick={onChangeRole}><UsersRound size={15} /> Cambiar rol</button>}<ProfileMenu user={user} activeRole={activeRole} onLogout={onLogout} /></div></header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}

function ProfileMenu({ user, activeRole, onLogout }: { user: User; activeRole: Role; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  return <div className={`profile profile-menu ${open ? 'menu-open' : ''}`}><button className="profile-trigger" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span className="avatar"><img src="/marca/avatar-default.svg" alt="" /></span><span className="profile-details"><strong>{user.name}</strong><span>{activeRole}</span></span><ChevronDown size={16} /></button>{open && <div className="profile-dropdown" role="menu"><button type="button" role="menuitem" onClick={onLogout}><LogOut size={17} />Cerrar sesión</button></div>}</div>
}

function RoleShell({ user, activeRole, view, onNavigate, onLogout, onChangeRole, requests, onRequestsChange }: { user: User; activeRole: PortalRole; view: PortalView; onNavigate: (view: PortalView) => void; onLogout: () => void; onChangeRole: () => void; requests: Request[]; onRequestsChange: (requests: Request[]) => void }) {
  const [mobileNav, setMobileNav] = useState(false)
  const navByRole: Record<PortalRole, { id: PortalView; label: string; icon: ReactNode }[]> = {
    Tutor: [
      { id: 'inicio', label: 'Mi resumen', icon: <LayoutDashboard size={19} /> },
      { id: 'disponibilidad', label: 'Mi disponibilidad', icon: <CalendarClock size={19} /> },
      { id: 'sesiones', label: 'Mis sesiones', icon: <CalendarDays size={19} /> },
      { id: 'informes', label: 'Mis informes', icon: <FileText size={19} /> },
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
        <div className="workspace-card"><div className="workspace-icon"><GraduationCap size={16} /></div><div><span>Portal personal</span><strong>{activeRole}</strong></div><ChevronDown size={16} /></div>
        <nav className="main-nav"><span className="nav-label">MI ESPACIO</span>{navItems.map((item) => <button key={item.id} className={view === item.id ? 'nav-item active' : 'nav-item'} onClick={() => go(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>
      </div>
      <div className="sidebar-bottom"><UniversitySignature onGreen /><div className="help-card"><CircleAlert size={17} /><div><strong>¿Necesitas ayuda?</strong><span>Consulta el centro de soporte</span></div><ArrowRight size={15} /></div><button className="nav-item" onClick={onLogout}><LogOut size={19} /><span>Cerrar sesión</span></button></div>
    </aside>
    {mobileNav && <button className="mobile-overlay" aria-label="Cerrar menú" onClick={() => setMobileNav(false)} />}
    <div className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={22} /></button><div className="breadcrumb"><span>{activeRole}</span><span>/</span><strong>{navItems.find((item) => item.id === view)?.label ?? 'Mi resumen'}</strong></div><div className="topbar-actions"><span className="period-chip"><span className="status-dot" />Periodo 2026-2</span><button className="icon-button" aria-label="Notificaciones"><Activity size={19} /><i>2</i></button>{user.roles.length > 1 && <button className="role-switcher" onClick={onChangeRole}><UsersRound size={15} /> Cambiar rol</button>}<ProfileMenu user={user} activeRole={activeRole} onLogout={onLogout} /></div></header>
      <main className="page-content">
        {view === 'inicio' && <PortalHome user={user} activeRole={activeRole} onNavigate={go} />}
        {view === 'disponibilidad' && <AvailabilityView user={user} activeRole={activeRole} />}
        {view === 'horarios' && <ScheduleView user={user} />}
        {view === 'sesiones' && <PortalSessions user={user} activeRole={activeRole} />}
        {view === 'mis-sesiones' && <PortalSessions user={user} activeRole={activeRole} />}
        {view === 'informes' && <PortalReports />}
        {view === 'solicitar' && <StudentRequestForm user={user} requests={requests} onChange={onRequestsChange} />}
        {view === 'mis-solicitudes' && <MyRequests user={user} requests={requests} />}
        {view === 'solicitudes' && <AssignedRequests requests={requests} />}
      </main>
    </div>
  </div>
}

function ClipboardIcon() { return <BookOpen size={19} /> }

function PortalHome({ user, activeRole, onNavigate }: { user: User; activeRole: PortalRole; onNavigate: (view: PortalView) => void }) {
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
  return <>
    <PageHeader eyebrow={`Portal ${activeRole.toLowerCase()} · Miércoles, 30 de septiembre de 2026`} title={`Hola, ${user.name.split(' ')[0]}`} description={descriptions[activeRole]} action={<button className="primary-button" onClick={() => onNavigate(action.view)}>{action.icon}{action.label}</button>} />
    <section className="metrics-grid"><MetricCard label={activeRole === 'Estudiante' ? 'Solicitudes activas' : 'Sesiones este periodo'} value={activeRole === 'Estudiante' ? '02' : '08'} detail="Información de tu periodo actual" icon={<CalendarDays size={20} />} tone="blue" /><MetricCard label={activeRole === 'Tutor' ? 'Horas disponibles' : activeRole === 'Monitor' ? 'Horas asignadas' : 'Próxima sesión'} value={activeRole === 'Estudiante' ? '02 oct' : activeRole === 'Tutor' ? '12 h' : '10 h'} detail={activeRole === 'Estudiante' ? 'Consulta tu agenda' : 'Periodo 2026-2'} icon={<Clock3 size={20} />} tone="green" /><MetricCard label="Estado de cuenta" value="Activo" detail="Acceso habilitado" icon={<ShieldCheck size={20} />} tone="purple" /></section>
    <div className="dashboard-grid"><section className="panel activity-panel"><div className="panel-heading"><div><h3>Próximos compromisos</h3><p>Información relacionada con tu rol</p></div><button className="text-button" onClick={() => onNavigate(activeRole === 'Estudiante' ? 'mis-sesiones' : 'sesiones')}>Ver agenda <ArrowRight size={15} /></button></div><div className="activity-list"><ActivityRow color="blue" title={activeRole === 'Estudiante' ? 'Monitoría de pensamiento matemático' : 'Acompañamiento académico'} description="Jueves · 9:00 a. m. · Salón 101A" time="En 2 días" /><ActivityRow color="green" title={activeRole === 'Tutor' ? 'Informe pendiente de envío' : activeRole === 'Monitor' ? 'Solicitud pendiente de atención' : 'Material de apoyo disponible'} description="Periodo académico 2026-2" time="Reciente" /><ActivityRow color="purple" title="Perfil actualizado" description="Tus datos institucionales están vigentes" time="Hoy" /></div></section><section className="panel quick-panel"><div className="panel-heading"><div><h3>Accesos rápidos</h3><p>Acciones disponibles para ti</p></div></div><div className="quick-actions"><button onClick={() => onNavigate(action.view)}><span className="quick-icon blue-bg">{action.icon}</span><span><b>{action.label}</b><small>Continúa tu gestión</small></span><ArrowRight size={16} /></button><button onClick={() => onNavigate(activeRole === 'Estudiante' ? 'mis-solicitudes' : 'sesiones')}><span className="quick-icon green-bg"><BookOpen size={18} /></span><span><b>Consultar seguimiento</b><small>Revisa tu información</small></span><ArrowRight size={16} /></button></div></section></div>
  </>
}

function AvailabilityView({ user, activeRole }: { user: User; activeRole: PortalRole }) {
  return <><PageHeader eyebrow="Mi espacio / Disponibilidad" title="Mi disponibilidad" description="Define los bloques en los que puedes acompañar a estudiantes." action={<button className="primary-button"><Plus size={18} /> Nuevo bloque</button>} /><section className="panel schedule-panel"><div className="panel-heading"><div><h3>Disponibilidad registrada</h3><p>Los bloques activos pueden ser utilizados para agendar sesiones.</p></div><span className="status-pill activo"><span />Activo</span></div><div className="schedule-list"><ScheduleRow day="Lunes" time="08:00 — 10:00" subject="Matemáticas básicas" place="Salón 101A" /><ScheduleRow day="Miércoles" time="10:00 — 12:00" subject={activeRole === 'Tutor' ? 'Cálculo diferencial' : 'Acompañamiento académico'} place="Bloque A · Piso 1" /><ScheduleRow day="Viernes" time="14:00 — 16:00" subject="Atención virtual" place="En línea" /></div></section></>
}

function ScheduleView({ user }: { user: User }) {
  return <><PageHeader eyebrow="Mi espacio / Horarios" title="Mis horarios" description="Consulta los horarios de monitoría asignados para el periodo actual." action={<button className="secondary-button"><CalendarDays size={17} /> Ver calendario</button>} /><section className="panel schedule-panel"><div className="panel-heading"><div><h3>Horario de atención</h3><p>{user.name} · Periodo académico 2026-2</p></div><span className="period-chip"><span className="status-dot" />Activo</span></div><div className="schedule-list"><ScheduleRow day="Lunes" time="14:00 — 16:00" subject="Pensamiento matemático" place="Salón 202B" /><ScheduleRow day="Miércoles" time="08:00 — 09:00" subject="Algoritmos y computación" place="Laboratorio de sistemas" /><ScheduleRow day="Sábado" time="10:00 — 11:00" subject="Consultas generales" place="Biblioteca central" /></div></section></>
}

function ScheduleRow({ day, time, subject, place }: { day: string; time: string; subject: string; place: string }) { return <div className="schedule-row"><div className="schedule-day"><strong>{day}</strong><span>{time}</span></div><div className="schedule-main"><strong>{subject}</strong><span>{place}</span></div><StatusPill status="Activo" /></div> }

function PortalSessions({ user, activeRole }: { user: User; activeRole: PortalRole }) {
  return <><PageHeader eyebrow={`Mi espacio / ${activeRole === 'Estudiante' ? 'Mis sesiones' : 'Sesiones'}`} title="Mis sesiones" description="Consulta el estado y los detalles de tus próximos acompañamientos." action={<button className="secondary-button"><CalendarDays size={17} /> Ver calendario</button>} /><section className="panel table-panel"><div className="table-meta"><span><strong>3</strong> sesiones en tu agenda</span><span>Periodo 2026-2</span></div><div className="table-scroll"><table><thead><tr><th>SESIÓN</th><th>FECHA Y HORA</th><th>MODALIDAD</th><th>ESTADO</th></tr></thead><tbody><tr><td><div className="request-cell"><div className="request-id">#001</div><div><strong>{activeRole === 'Tutor' ? 'Tutoría de cálculo' : 'Pensamiento matemático'}</strong><span>{activeRole === 'Estudiante' ? 'Monitoría académica' : 'Acompañamiento académico'}</span></div></div></td><td><span className="muted-cell">02 oct 2026 · 09:00 a. m.</span></td><td><span className="type-label"><span className="type-dot blue-dot" />Presencial</span></td><td><RequestStatus status="Asignada" /></td></tr><tr><td><div className="request-cell"><div className="request-id">#002</div><div><strong>Seguimiento académico</strong><span>Revisión de avances</span></div></div></td><td><span className="muted-cell">05 oct 2026 · 02:00 p. m.</span></td><td><span className="type-label"><span className="type-dot purple-dot" />Virtual</span></td><td><RequestStatus status="Aprobada" /></td></tr></tbody></table></div></section></>
}

function PortalReports() { return <><PageHeader eyebrow="Mi espacio / Informes" title="Mis informes" description="Registra y consulta los informes asociados a tus sesiones de tutoría." action={<button className="primary-button"><Plus size={18} /> Nuevo informe</button>} /><div className="report-grid"><article className="report-card"><div className="report-icon"><FileText size={20} /></div><span className="report-state">Pendiente de envío</span><h3>Informe de acompañamiento · Septiembre</h3><p>Resumen de actividades, logros y recomendaciones del periodo.</p><button className="text-button">Continuar informe <ArrowRight size={15} /></button></article><article className="report-card"><div className="report-icon green-bg"><Check size={20} /></div><span className="report-state approved">Aprobado</span><h3>Informe de acompañamiento · Agosto</h3><p>Revisado por la coordinación académica.</p><button className="text-button">Ver informe <ArrowRight size={15} /></button></article></div></> }

function StudentRequestForm({ user, requests, onChange }: { user: User; requests: Request[]; onChange: (requests: Request[]) => void }) {
  const [sent, setSent] = useState(false)
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const newRequest: Request = { id: Date.now(), student: user.name, subject: String(form.get('subject') ?? ''), type: String(form.get('type') ?? 'Monitoría') as Request['type'], priority: String(form.get('priority') ?? 'Media') as Request['priority'], status: 'Pendiente', date: '30 sep 2026' }; onChange([newRequest, ...requests]); setSent(true); event.currentTarget.reset() }
  return <><PageHeader eyebrow="Mi espacio / Solicitudes" title="Solicitar acompañamiento" description="Cuéntanos en qué asignatura necesitas apoyo y te ayudaremos a encontrar el acompañamiento adecuado." /><section className="panel form-panel"><div className="panel-heading"><div><h3>Nueva solicitud</h3><p>La coordinación revisará tu solicitud y te notificará el resultado.</p></div><div className="quick-icon blue-bg"><Send size={18} /></div></div><form className="portal-form" onSubmit={submit}><div className="form-columns"><label>Tipo de acompañamiento<select name="type"><option>Monitoría</option><option>Tutoría</option></select></label><label>Prioridad<select name="priority"><option>Media</option><option>Alta</option><option>Baja</option></select></label></div><label>Asignatura<select name="subject" required><option value="">Selecciona una asignatura</option><option>Pensamiento matemático</option><option>Algoritmos y computación</option><option>Cálculo diferencial</option><option>Fundamentos de contabilidad</option></select></label><label>Motivo<textarea name="reason" required placeholder="Describe brevemente en qué necesitas apoyo..." /></label><button className="primary-button" type="submit"><Send size={17} /> Enviar solicitud</button>{sent && <div className="success-message"><Check size={16} /> Solicitud creada correctamente. Puedes consultarla en “Mis solicitudes”.</div>}</form></section></>
}

function MyRequests({ user, requests }: { user: User; requests: Request[] }) { const own = requests.filter((request) => request.student === user.name); return <><PageHeader eyebrow="Mi espacio / Solicitudes" title="Mis solicitudes" description="Consulta el estado de las solicitudes de acompañamiento que has realizado." /><section className="panel table-panel"><div className="table-meta"><span><strong>{own.length}</strong> solicitudes asociadas a tu cuenta</span><span>Actualizado recientemente</span></div><div className="table-scroll"><table><thead><tr><th>ASIGNATURA</th><th>TIPO</th><th>PRIORIDAD</th><th>ESTADO</th><th>FECHA</th></tr></thead><tbody>{(own.length ? own : requests.slice(0, 2)).map((request) => <tr key={request.id}><td><div className="request-cell"><div className="request-id">#{String(request.id).padStart(4, '0')}</div><div><strong>{request.subject}</strong><span>Solicitud de acompañamiento</span></div></div></td><td>{request.type}</td><td><span className={`priority ${request.priority.toLowerCase()}`}><span />{request.priority}</span></td><td><RequestStatus status={request.status} /></td><td><span className="muted-cell">{request.date}</span></td></tr>)}</tbody></table></div></section></> }

function AssignedRequests({ requests }: { requests: Request[] }) { const assigned = requests.filter((request) => request.status === 'Aprobada' || request.status === 'Asignada'); return <><PageHeader eyebrow="Mi espacio / Solicitudes" title="Solicitudes asignadas" description="Consulta los acompañamientos que requieren tu atención." /><section className="panel table-panel"><div className="table-meta"><span><strong>{assigned.length}</strong> solicitudes asignadas</span><span>Coordinación académica</span></div><div className="table-scroll"><table><thead><tr><th>ESTUDIANTE</th><th>ASIGNATURA</th><th>TIPO</th><th>ESTADO</th></tr></thead><tbody>{assigned.map((request) => <tr key={request.id}><td><strong>{request.student}</strong></td><td>{request.subject}</td><td>{request.type}</td><td><RequestStatus status={request.status} /></td></tr>)}</tbody></table></div></section></> }

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Dashboard({ users, spaces, requests, onNavigate }: { users: User[]; spaces: Space[]; requests: Request[]; onNavigate: (view: View) => void }) {
  const pending = requests.filter((request) => request.status === 'Pendiente').length
  const activeSpaces = spaces.filter((space) => space.status === 'Activo').length
  return <>
    <PageHeader eyebrow="Miércoles, 30 de septiembre de 2026" title="Buenos días, Jayson" description="Este es el resumen de lo que está sucediendo en tu plataforma." action={<button className="secondary-button"><CalendarDays size={17} /> Ver calendario</button>} />
    <section className="metrics-grid"><MetricCard label="Usuarios registrados" value={users.length.toString()} detail="+12% vs. periodo anterior" icon={<UsersRound size={20} />} tone="blue" /><MetricCard label="Solicitudes pendientes" value={pending.toString().padStart(2, '0')} detail="Requieren atención" icon={<Clock3 size={20} />} tone="amber" /><MetricCard label="Espacios disponibles" value={activeSpaces.toString().padStart(2, '0')} detail={`De ${spaces.length} espacios registrados`} icon={<Building2 size={20} />} tone="green" /><MetricCard label="Acompañamientos" value="128" detail="+18 esta semana" icon={<Activity size={20} />} tone="purple" /></section>
    <div className="dashboard-grid"><section className="panel activity-panel"><div className="panel-heading"><div><h3>Actividad reciente</h3><p>Últimas acciones registradas en el sistema</p></div><button className="text-button" onClick={() => onNavigate('solicitudes')}>Ver todas <ArrowRight size={15} /></button></div><div className="activity-list"><ActivityRow color="blue" title="Nueva solicitud de monitoría" description="María Valentina Amezquita · Pensamiento matemático" time="Hace 12 min" /><ActivityRow color="green" title="Espacio actualizado" description="Laboratorio de sistemas · Bloque C" time="Hace 38 min" /><ActivityRow color="purple" title="Usuario registrado" description="Daniel Andrés Pérez · Estudiante" time="Hace 1 h" /><ActivityRow color="amber" title="Solicitud aprobada" description="Sofía Alejandra Cárdenas · Tutoría" time="Hace 2 h" /></div></section><section className="panel quick-panel"><div className="panel-heading"><div><h3>Acciones rápidas</h3><p>Atajos para tu trabajo diario</p></div></div><div className="quick-actions"><button onClick={() => onNavigate('usuarios')}><span className="quick-icon blue-bg"><UserRound size={18} /></span><span><b>Nuevo usuario</b><small>Registra un usuario</small></span><ArrowRight size={16} /></button><button onClick={() => onNavigate('espacios')}><span className="quick-icon green-bg"><Building2 size={18} /></span><span><b>Agregar espacio</b><small>Registra un espacio físico</small></span><ArrowRight size={16} /></button><button onClick={() => onNavigate('solicitudes')}><span className="quick-icon amber-bg"><CalendarDays size={18} /></span><span><b>Revisar solicitudes</b><small>{pending} pendientes por revisar</small></span><ArrowRight size={16} /></button></div></section></div>
  </>
}

function MetricCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: ReactNode; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-label">{label}</div><strong>{value}</strong><span className={tone === 'amber' ? 'metric-detail warning' : 'metric-detail'}>{detail}</span></div>
}

function ActivityRow({ title, description, time, color }: { title: string; description: string; time: string; color: string }) {
  return <div className="activity-row"><span className={`activity-dot ${color}`} /><div><strong>{title}</strong><span>{description}</span></div><time>{time}</time></div>
}

function UsersView({ users, onChange }: { users: User[]; onChange: (users: User[]) => void }) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('Todos los roles')
  const [modal, setModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const filtered = users.filter((user) => `${user.name} ${user.email} ${user.code}`.toLowerCase().includes(query.toLowerCase()) && (role === 'Todos los roles' || user.roles.includes(role as Role)))
  const openCreate = () => { setEditingUser(null); setModal(true) }
  const openEdit = (user: User) => { setEditingUser(user); setModal(true) }
  const saveUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const roles = form.getAll('roles').map(String) as Role[]
    if (!roles.length) return
    const userData = { name, email: String(form.get('email') ?? '').trim(), document: String(form.get('document') ?? '').trim(), roles, initials: name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() }
    if (editingUser) onChange(users.map((user) => user.id === editingUser.id ? { ...user, ...userData } : user))
    else onChange([{ id: Date.now(), code: `USR${String(users.length + 1).padStart(3, '0')}`, ...userData, status: 'Activo' }, ...users])
    setModal(false)
    setEditingUser(null)
  }
  const deleteUser = (user: User) => { if (window.confirm(`¿Eliminar a ${user.name}?`)) onChange(users.filter((item) => item.id !== user.id)) }
  return <><PageHeader eyebrow="Administración / Usuarios" title="Gestión de usuarios" description="Administra los accesos y roles de las personas vinculadas al programa." action={<button className="primary-button" onClick={openCreate}><Plus size={18} /> Nuevo usuario</button>} /><section className="panel table-panel"><div className="table-toolbar"><div className="search-input"><Search size={17} /><input placeholder="Buscar por nombre, código o correo..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><select value={role} onChange={(event) => setRole(event.target.value)}><option>Todos los roles</option><option>Administrador</option><option>Estudiante</option><option>Monitor</option><option>Tutor</option></select><button className="secondary-button filter-button"><Settings2 size={16} /> Filtros</button></div><div className="table-meta"><span><strong>{filtered.length}</strong> usuarios encontrados</span><span>Guardado en este navegador</span></div><div className="table-scroll"><table><thead><tr><th>USUARIO</th><th>ROLES</th><th>CONTACTO</th><th>ESTADO</th><th className="align-right">ACCIONES</th></tr></thead><tbody>{filtered.map((user) => <tr key={user.id}><td><div className="person-cell"><div className="mini-avatar">{user.initials}</div><div><strong>{user.name}</strong><span>{user.code}</span></div></div></td><td><div className="user-roles">{user.roles.map((userRole) => <span className="role-pill" key={userRole}>{userRole}</span>)}</div></td><td><span className="muted-cell">{user.email}</span></td><td><StatusPill status={user.status} /></td><td className="align-right"><div className="action-group"><button className="row-action" onClick={() => openEdit(user)}>Editar</button><button className="row-action" onClick={() => onChange(users.map((item) => item.id === user.id ? { ...item, status: item.status === 'Activo' ? 'Inactivo' : 'Activo' } : item))}>{user.status === 'Activo' ? 'Desactivar' : 'Activar'}</button><button className="row-action danger-action" onClick={() => deleteUser(user)}>Eliminar</button></div></td></tr>)}</tbody></table></div></section>{modal && <Modal title={editingUser ? 'Editar usuario' : 'Nuevo usuario'} subtitle="Asigna uno o varios roles al usuario." onClose={() => setModal(false)}><form className="modal-form" onSubmit={saveUser} key={editingUser?.id ?? 'new'}><label>Nombre completo<input name="name" required defaultValue={editingUser?.name ?? ''} placeholder="Ej. Ana María López" /></label><label>Correo institucional<input type="email" name="email" required defaultValue={editingUser?.email ?? ''} placeholder="correo@unitropico.edu.co" /></label><label>Documento de identidad<input name="document" required defaultValue={editingUser?.document ?? ''} placeholder="Ej. 1093432540" /></label><fieldset className="role-options"><legend>Roles de acceso</legend>{(['Administrador', 'Tutor', 'Monitor', 'Estudiante'] as Role[]).map((availableRole) => <label className="role-option" key={availableRole}><input type="checkbox" name="roles" value={availableRole} defaultChecked={editingUser?.roles.includes(availableRole) ?? availableRole === 'Estudiante'} /><span>{availableRole}</span></label>)}</fieldset><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(false)}>Cancelar</button><button className="primary-button" type="submit">{editingUser ? 'Guardar cambios' : 'Crear usuario'}</button></div></form></Modal>}</>
}

function SpacesView({ spaces, onChange }: { spaces: Space[]; onChange: (spaces: Space[]) => void }) {
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(false)
  const [editingSpace, setEditingSpace] = useState<Space | null>(null)
  const filtered = spaces.filter((space) => `${space.name} ${space.code} ${space.location}`.toLowerCase().includes(query.toLowerCase()))
  const openCreate = () => { setEditingSpace(null); setModal(true) }
  const openEdit = (space: Space) => { setEditingSpace(space); setModal(true) }
  const saveSpace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const spaceData = { code: String(form.get('code') ?? '').trim().toUpperCase(), name: String(form.get('name') ?? '').trim(), type: String(form.get('type') ?? 'Aula'), location: String(form.get('location') ?? '').trim(), capacity: Number(form.get('capacity') ?? 0) }
    if (editingSpace) onChange(spaces.map((space) => space.id === editingSpace.id ? { ...space, ...spaceData } : space))
    else onChange([{ id: Date.now(), ...spaceData, status: 'Activo' }, ...spaces])
    setModal(false)
    setEditingSpace(null)
  }
  const deleteSpace = (space: Space) => { if (window.confirm(`¿Eliminar ${space.name}?`)) onChange(spaces.filter((item) => item.id !== space.id)) }
  return <><PageHeader eyebrow="Administración / Espacios" title="Gestión de espacios" description="Organiza los espacios disponibles para las sesiones de acompañamiento." action={<button className="primary-button" onClick={openCreate}><Plus size={18} /> Nuevo espacio</button>} /><section className="panel table-panel"><div className="table-toolbar"><div className="search-input"><Search size={17} /><input placeholder="Buscar por nombre, código o ubicación..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><button className="secondary-button filter-button"><Settings2 size={16} /> Filtros</button></div><div className="table-meta"><span><strong>{filtered.length}</strong> espacios registrados</span><span><span className="legend-dot active-legend" /> Disponibles ahora</span></div><div className="space-grid">{filtered.map((space) => <article className="space-card" key={space.id}><div className="space-card-top"><div className="space-icon"><Building2 size={19} /></div><StatusPill status={space.status} /></div><span className="space-code">{space.code}</span><h3>{space.name}</h3><p>{space.location}</p><div className="space-card-footer"><span><UsersRound size={15} /> Capacidad <b>{space.capacity}</b></span><span>{space.type}</span></div><div className="space-actions"><button className="space-toggle" onClick={() => onChange(spaces.map((item) => item.id === space.id ? { ...item, status: item.status === 'Activo' ? 'Inactivo' : 'Activo' } : item))}>{space.status === 'Activo' ? 'Marcar no disponible' : 'Habilitar espacio'}</button><button className="row-action" onClick={() => openEdit(space)}>Editar</button><button className="row-action danger-action" onClick={() => deleteSpace(space)}>Eliminar</button></div></article>)}</div></section>{modal && <Modal title={editingSpace ? 'Editar espacio' : 'Nuevo espacio'} subtitle="Registra la información del espacio académico." onClose={() => setModal(false)}><form className="modal-form" onSubmit={saveSpace} key={editingSpace?.id ?? 'new'}><div className="form-columns"><label>Código<input name="code" required defaultValue={editingSpace?.code ?? ''} placeholder="Ej. 305A" /></label><label>Capacidad<input name="capacity" type="number" min="1" required defaultValue={editingSpace?.capacity ?? ''} placeholder="30" /></label></div><label>Nombre del espacio<input name="name" required defaultValue={editingSpace?.name ?? ''} placeholder="Ej. Salón 305A" /></label><label>Ubicación<input name="location" required defaultValue={editingSpace?.location ?? ''} placeholder="Bloque A · Piso 3" /></label><label>Tipo<select name="type" defaultValue={editingSpace?.type ?? 'Aula'}><option>Aula</option><option>Laboratorio</option><option>Biblioteca</option><option>Sala</option></select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(false)}>Cancelar</button><button className="primary-button" type="submit">{editingSpace ? 'Guardar cambios' : 'Crear espacio'}</button></div></form></Modal>}</>
}

function RequestsView({ requests, onChange }: { requests: Request[]; onChange: (requests: Request[]) => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todos los estados')
  const filtered = requests.filter((request) => `${request.student} ${request.subject}`.toLowerCase().includes(query.toLowerCase()) && (status === 'Todos los estados' || request.status === status))
  const updateStatus = (id: number, nextStatus: Request['status']) => onChange(requests.map((request) => request.id === id ? { ...request, status: nextStatus } : request))
  return <><PageHeader eyebrow="Administración / Solicitudes" title="Gestión de solicitudes" description="Revisa, prioriza y asigna las solicitudes de acompañamiento académico." action={<button className="secondary-button"><CalendarDays size={17} /> Ver calendario</button>} /><section className="panel table-panel"><div className="table-toolbar"><div className="search-input"><Search size={17} /><input placeholder="Buscar por estudiante o asignatura..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Todos los estados</option><option>Pendiente</option><option>Aprobada</option><option>Asignada</option><option>Rechazada</option></select><button className="secondary-button filter-button"><Settings2 size={16} /> Filtros</button></div><div className="table-meta"><span><strong>{filtered.length}</strong> solicitudes encontradas</span><span><span className="priority-dot" /> Prioridad alta requiere atención</span></div><div className="table-scroll"><table><thead><tr><th>SOLICITUD</th><th>TIPO</th><th>PRIORIDAD</th><th>ESTADO</th><th>FECHA</th><th className="align-right">ACCIONES</th></tr></thead><tbody>{filtered.map((request) => <tr key={request.id}><td><div className="request-cell"><div className="request-id">#{String(request.id).padStart(4, '0')}</div><div><strong>{request.subject}</strong><span>{request.student}</span></div></div></td><td><span className="type-label"><span className={request.type === 'Monitoría' ? 'type-dot blue-dot' : 'type-dot purple-dot'} />{request.type}</span></td><td><span className={`priority ${request.priority.toLowerCase()}`}><span />{request.priority}</span></td><td><RequestStatus status={request.status} /></td><td><span className="muted-cell">{request.date}</span></td><td className="align-right"><div className="actions-inline">{request.status === 'Pendiente' && <><button className="approve-action" onClick={() => updateStatus(request.id, 'Aprobada')} title="Aprobar"><Check size={16} /></button><button className="reject-action" onClick={() => updateStatus(request.id, 'Rechazada')} title="Rechazar"><X size={16} /></button></>} {request.status === 'Aprobada' && <button className="row-action" onClick={() => updateStatus(request.id, 'Asignada')}>Asignar</button>}</div></td></tr>)}</tbody></table></div></section></>
}

function StatusPill({ status }: { status: Status }) { return <span className={`status-pill ${status.toLowerCase()}`}><span />{status}</span> }
function RequestStatus({ status }: { status: Request['status'] }) { return <span className={`request-status ${status.toLowerCase()}`}><span />{status}</span> }
function Modal({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: ReactNode; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal"><div className="modal-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>{children}</div></div> }

export default App
