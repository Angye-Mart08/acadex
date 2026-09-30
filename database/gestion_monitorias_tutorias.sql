-- =====================================================
-- BASE DE DATOS
-- Proyecto:
-- Sistema de Gestión de Monitorías y Tutorías Académicas
-- Universidad Internacional del Trópico Americano
-- =====================================================

DROP DATABASE IF EXISTS gestion_monitorias_tutorias;

CREATE DATABASE gestion_monitorias_tutorias
CHARACTER SET utf8mb4
COLLATE utf8mb4_spanish_ci;

USE gestion_monitorias_tutorias;

-- =====================================================
-- MÓDULO DE SEGURIDAD
-- =====================================================

-- -----------------------------------------------------
-- TABLA: Rol
-- -----------------------------------------------------

CREATE TABLE Rol(

    id_rol INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(50) NOT NULL UNIQUE,

    descripcion VARCHAR(200),

    estado ENUM(
        'Activo',
        'Inactivo'
    ) NOT NULL DEFAULT 'Activo'

) ENGINE=InnoDB;
-- -----------------------------------------------------
-- TABLA: Usuario
-- -----------------------------------------------------

CREATE TABLE Usuario(

    id_usuario INT AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(20) NOT NULL UNIQUE,

    documento VARCHAR(20) NOT NULL UNIQUE,

    nombres VARCHAR(80) NOT NULL,

    apellidos VARCHAR(80) NOT NULL,

    correo VARCHAR(120) NOT NULL UNIQUE,

    telefono VARCHAR(20),

    estado ENUM(
        'Activo',
        'Inactivo'
    ) NOT NULL DEFAULT 'Activo'

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Credencial
-- -----------------------------------------------------

CREATE TABLE Credencial(

    id_credencial INT AUTO_INCREMENT PRIMARY KEY,

    usuario VARCHAR(120) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    ultimo_acceso DATETIME,

    primer_inicio BOOLEAN NOT NULL DEFAULT TRUE,

    estado ENUM(
        'Activo',
        'Inactivo'
    ) NOT NULL DEFAULT 'Activo',

    id_usuario INT NOT NULL UNIQUE,

    CONSTRAINT fk_credencial_usuario

        FOREIGN KEY(id_usuario)

        REFERENCES Usuario(id_usuario)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Configuracion
-- -----------------------------------------------------

CREATE TABLE Configuracion(

    id_configuracion INT AUTO_INCREMENT PRIMARY KEY,

    clave VARCHAR(120) NOT NULL UNIQUE,

    valor TEXT NOT NULL,

    tipo VARCHAR(30) NOT NULL DEFAULT 'string',

    descripcion VARCHAR(255),

    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: UsuarioRol
-- -----------------------------------------------------

CREATE TABLE UsuarioRol(

    id_usuario_rol INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    id_rol INT NOT NULL,

    estado ENUM(
        'Activo',
        'Inactivo'
    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT uq_usuario_rol

        UNIQUE(
            id_usuario,
            id_rol
        ),

    CONSTRAINT fk_usuario_rol_usuario

        FOREIGN KEY(id_usuario)

        REFERENCES Usuario(id_usuario)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_usuario_rol_rol

        FOREIGN KEY(id_rol)

        REFERENCES Rol(id_rol)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- =====================================================
-- USUARIOS ESPECÍFICOS
-- =====================================================

-- -----------------------------------------------------
-- TABLA: Administrador
-- -----------------------------------------------------

CREATE TABLE Administrador(

    id_administrador INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL UNIQUE,

    cargo VARCHAR(120),

    dependencia VARCHAR(120),

    correo_institucional VARCHAR(120),

    observaciones VARCHAR(300),

    estado ENUM(
        'Activo',
        'Inactivo'
    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT fk_administrador_usuario

        FOREIGN KEY(id_usuario)

        REFERENCES Usuario(id_usuario)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Estudiante
-- -----------------------------------------------------

CREATE TABLE Estudiante(

    id_estudiante INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL UNIQUE,

    codigo_estudiantil VARCHAR(30) NOT NULL UNIQUE,

    semestre TINYINT NOT NULL CHECK (semestre >= 1),

    estado ENUM(
        'Activo',
        'Inactivo'
    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT fk_estudiante_usuario

        FOREIGN KEY(id_usuario)

        REFERENCES Usuario(id_usuario)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Tutor
-- -----------------------------------------------------

CREATE TABLE Tutor(

    id_tutor INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL UNIQUE,

    categoria_docente VARCHAR(80),

    tipo_vinculacion VARCHAR(80),

    periodo_actual VARCHAR(20),

    horas_semanales TINYINT,

    observaciones VARCHAR(300),

    estado ENUM(
        'Activo',
        'Inactivo'
    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT fk_tutor_usuario

        FOREIGN KEY(id_usuario)

        REFERENCES Usuario(id_usuario)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Monitor
-- -----------------------------------------------------

CREATE TABLE Monitor(

    id_monitor INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL UNIQUE,

    tipo_monitor VARCHAR(80),

    resolucion VARCHAR(80),

    periodo_actual VARCHAR(20),

    horas_semanales TINYINT,

    observaciones VARCHAR(300),

    estado ENUM(
        'Activo',
        'Inactivo'
    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT fk_monitor_usuario

        FOREIGN KEY(id_usuario)

        REFERENCES Usuario(id_usuario)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- =====================================================
-- MÓDULO ACADÉMICO
-- =====================================================

-- -----------------------------------------------------
-- TABLA: Facultad
-- -----------------------------------------------------

CREATE TABLE Facultad(

    id_facultad INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(120) NOT NULL UNIQUE,

    descripcion VARCHAR(250),

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo'

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Programa
-- -----------------------------------------------------

CREATE TABLE Programa(

    id_programa INT AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(20) NOT NULL UNIQUE,

    nombre VARCHAR(120) NOT NULL UNIQUE,

    registro_snies VARCHAR(30),

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo',

    id_facultad INT NOT NULL,

    CONSTRAINT fk_programa_facultad

        FOREIGN KEY(id_facultad)

        REFERENCES Facultad(id_facultad)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Asignatura
-- -----------------------------------------------------

CREATE TABLE Asignatura(

    id_asignatura INT AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(20) NOT NULL UNIQUE,

    nombre VARCHAR(150) NOT NULL,

    creditos TINYINT,

    descripcion VARCHAR(300),

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo'

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: ProgramaAsignatura
-- -----------------------------------------------------

CREATE TABLE ProgramaAsignatura(

    id_programa_asignatura INT AUTO_INCREMENT PRIMARY KEY,

    id_programa INT NOT NULL,

    id_asignatura INT NOT NULL,

    semestre TINYINT,

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT uq_programa_asignatura

        UNIQUE(

            id_programa,
            id_asignatura

        ),

    CONSTRAINT fk_programa_asignatura_programa

        FOREIGN KEY(id_programa)

        REFERENCES Programa(id_programa)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_programa_asignatura_asignatura

        FOREIGN KEY(id_asignatura)

        REFERENCES Asignatura(id_asignatura)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: HorarioMonitor
-- -----------------------------------------------------

CREATE TABLE HorarioMonitor(

    id_horario_monitor INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    id_periodo INT NOT NULL,

    dia_semana ENUM(
        'Lunes',
        'Martes',
        'Miércoles',
        'Jueves',
        'Viernes',
        'Sábado',
        'Domingo'
    ) NOT NULL,

    hora_inicio TIME NOT NULL,

    hora_fin TIME NOT NULL,

    duracion_minutos INT NOT NULL,

    modalidad ENUM(
        'Presencial',
        'Virtual',
        'Híbrida'
    ) NOT NULL DEFAULT 'Presencial',

    id_espacio INT,

    observaciones VARCHAR(300),

    estado ENUM(
        'Activo',
        'Inactivo'
    ) NOT NULL DEFAULT 'Activo',

    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_horario_monitor_usuario
        FOREIGN KEY(id_usuario)
        REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_horario_monitor_periodo
        FOREIGN KEY(id_periodo)
        REFERENCES PeriodoAcademico(id_periodo)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_horario_monitor_espacio
        FOREIGN KEY(id_espacio)
        REFERENCES Espacio(id_espacio)
        ON UPDATE CASCADE
        ON DELETE SET NULL

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: EstudiantePrograma
-- -----------------------------------------------------

CREATE TABLE EstudiantePrograma(

    id_estudiante_programa INT AUTO_INCREMENT PRIMARY KEY,

    id_estudiante INT NOT NULL,

    id_programa INT NOT NULL,

    principal BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_ingreso DATE,

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT uq_estudiante_programa

        UNIQUE(

            id_estudiante,
            id_programa

        ),

    CONSTRAINT fk_estudiante_programa_estudiante

        FOREIGN KEY(id_estudiante)

        REFERENCES Estudiante(id_estudiante)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_estudiante_programa_programa

        FOREIGN KEY(id_programa)

        REFERENCES Programa(id_programa)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: PeriodoAcademico
-- -----------------------------------------------------

CREATE TABLE PeriodoAcademico(

    id_periodo INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(20) NOT NULL UNIQUE,

    fecha_inicio DATE NOT NULL CHECK (fecha_inicio < fecha_fin),

    fecha_fin DATE NOT NULL,

    estado ENUM(

        'Planeado',
        'Activo',
        'Finalizado'

    ) NOT NULL DEFAULT 'Planeado'

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: AsignacionAcademica
-- -----------------------------------------------------

CREATE TABLE AsignacionAcademica(

    id_asignacion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    id_rol INT NOT NULL,

    id_asignatura INT NOT NULL,

    id_periodo INT NOT NULL,

    horas_semanales TINYINT NOT NULL CHECK (horas_semanales > 0),

    fecha_inicio DATE NOT NULL,

    fecha_fin DATE,

    estado ENUM(

        'Activa',
        'Finalizada',
        'Cancelada'

    ) NOT NULL DEFAULT 'Activa',

    CONSTRAINT fk_asignacion_usuario

        FOREIGN KEY(id_usuario)

        REFERENCES Usuario(id_usuario)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_asignacion_rol

        FOREIGN KEY(id_rol)

        REFERENCES Rol(id_rol)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_asignacion_asignatura

        FOREIGN KEY(id_asignatura)

        REFERENCES Asignatura(id_asignatura)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_asignacion_periodo

        FOREIGN KEY(id_periodo)

        REFERENCES PeriodoAcademico(id_periodo)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- =====================================================
-- MÓDULO OPERATIVO
-- =====================================================

-- -----------------------------------------------------
-- TABLA: Espacio
-- -----------------------------------------------------

CREATE TABLE Espacio(

    id_espacio INT AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(20) NOT NULL UNIQUE,

    nombre VARCHAR(120) NOT NULL,

    edificio VARCHAR(80),

    bloque VARCHAR(20),

    salon VARCHAR(20),

    piso VARCHAR(10),

    ubicacion VARCHAR(200),

    descripcion VARCHAR(300),

    recursos VARCHAR(500),

    observaciones VARCHAR(300),

    capacidad INT NOT NULL CHECK (capacidad > 0),

    tipo ENUM(

        'Aula',
        'Laboratorio',
        'Sala',
        'Sala de informática',
        'Biblioteca',
        'Salón de reuniones',
        'Otro',
        'Virtual'

    ),

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo'

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Disponibilidad
-- -----------------------------------------------------

CREATE TABLE Disponibilidad(

    id_disponibilidad INT AUTO_INCREMENT PRIMARY KEY,

    id_asignacion INT NOT NULL,

    dia_semana ENUM(

        'Lunes',
        'Martes',
        'Miércoles',
        'Jueves',
        'Viernes',
        'Sábado'

    ) NOT NULL,

    hora_inicio TIME NOT NULL check(hora_inicio < hora_fin),

    hora_fin TIME NOT NULL check(hora_fin > hora_inicio),
    
    modalidad ENUM(

        'Presencial',
        'Virtual'

    ) NOT NULL DEFAULT 'Presencial',

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT fk_disponibilidad_asignacion

        FOREIGN KEY(id_asignacion)

        REFERENCES AsignacionAcademica(id_asignacion)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: AsignacionEspacio
-- -----------------------------------------------------

CREATE TABLE AsignacionEspacio(

    id_asignacion_espacio INT AUTO_INCREMENT PRIMARY KEY,

    id_disponibilidad INT NOT NULL,

    id_espacio INT NOT NULL,

    fecha_inicio DATE NOT NULL,

    fecha_fin DATE,

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT fk_asignacion_espacio_disponibilidad

        FOREIGN KEY(id_disponibilidad)

        REFERENCES Disponibilidad(id_disponibilidad)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_asignacion_espacio

        FOREIGN KEY(id_espacio)

        REFERENCES Espacio(id_espacio)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: TipoSolicitud
-- -----------------------------------------------------

CREATE TABLE TipoSolicitud(

    id_tipo_solicitud INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(80) NOT NULL UNIQUE,

    descripcion VARCHAR(250),

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo'

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Solicitud
-- -----------------------------------------------------

CREATE TABLE Solicitud(

    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,

    id_estudiante INT NOT NULL,

    id_programa INT NOT NULL,

    id_asignatura INT NOT NULL,

    id_tipo_solicitud INT NOT NULL,

    id_periodo INT NOT NULL,

    fecha_solicitud DATETIME NOT NULL,

    motivo VARCHAR(500),

    descripcion VARCHAR(500),

    prioridad ENUM(

        'Alta',
        'Media',
        'Baja'

    ) NOT NULL DEFAULT 'Media',

    estado ENUM(

        'Pendiente',
        'Aprobada',
        'Rechazada',
        'Asignada',
        'Atendida',
        'Cancelada',
        'Finalizada'

    ) NOT NULL DEFAULT 'Pendiente',

    CONSTRAINT fk_solicitud_estudiante

        FOREIGN KEY(id_estudiante)

        REFERENCES Estudiante(id_estudiante)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_solicitud_asignatura

        FOREIGN KEY(id_asignatura)

        REFERENCES Asignatura(id_asignatura)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_solicitud_tipo

        FOREIGN KEY(id_tipo_solicitud)

        REFERENCES TipoSolicitud(id_tipo_solicitud)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_solicitud_programa

        FOREIGN KEY(id_programa)

        REFERENCES Programa(id_programa)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_solicitud_periodo

        FOREIGN KEY(id_periodo)

        REFERENCES PeriodoAcademico(id_periodo)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Sesion
-- -----------------------------------------------------

CREATE TABLE Sesion(

    id_sesion INT AUTO_INCREMENT PRIMARY KEY,

    id_solicitud INT NOT NULL,

    id_asignacion INT NOT NULL,

    id_asignacion_espacio INT,

    fecha DATE NOT NULL,

     hora_inicio TIME NOT NULL check(hora_inicio < hora_fin),

     hora_fin TIME NOT NULL check(hora_fin > hora_inicio),

    modalidad ENUM(

        'Presencial',
        'Virtual'

    ) NOT NULL DEFAULT 'Presencial',

    tipo ENUM(

        'Tutoría',
        'Monitoría'

    ) NOT NULL,

    tema VARCHAR(250),

    observaciones VARCHAR(500),

    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    estado ENUM(

        'Programada',
        'Confirmada',
        'Reprogramada',
        'En Proceso',
        'Realizada',
        'No Asistida',
        'Finalizada',
        'Cancelada'

    ) NOT NULL DEFAULT 'Programada',

    CONSTRAINT fk_sesion_solicitud

        FOREIGN KEY(id_solicitud)

        REFERENCES Solicitud(id_solicitud)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_sesion_asignacion

        FOREIGN KEY(id_asignacion)

        REFERENCES AsignacionAcademica(id_asignacion)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_sesion_espacio

        FOREIGN KEY(id_asignacion_espacio)

        REFERENCES AsignacionEspacio(id_asignacion_espacio)

        ON UPDATE CASCADE

        ON DELETE SET NULL

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: CancelacionMonitoria
-- -----------------------------------------------------

CREATE TABLE CancelacionMonitoria(

    id_cancelacion INT AUTO_INCREMENT PRIMARY KEY,

    id_sesion INT NOT NULL,

    id_usuario INT NOT NULL,

    fecha_cancelacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    dias_anticipacion INT NOT NULL,

    motivo VARCHAR(1000) NOT NULL,

    estado ENUM(
        'Activo',
        'Anulada'
    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT fk_cancelacion_sesion
        FOREIGN KEY(id_sesion)
        REFERENCES Sesion(id_sesion)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_cancelacion_usuario
        FOREIGN KEY(id_usuario)
        REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: ReporteMonitoria
-- -----------------------------------------------------

CREATE TABLE ReporteMonitoria(

    id_reporte_monitoria INT AUTO_INCREMENT PRIMARY KEY,

    id_sesion INT NOT NULL,

    id_usuario INT NOT NULL,

    actividad TEXT NOT NULL,

    asistencia ENUM(
        'Si',
        'No'
    ) NOT NULL,

    ruta_listado_asistencia VARCHAR(255),

    ruta_material VARCHAR(255),

    hora_inicio_real TIME NOT NULL,

    hora_fin_real TIME NOT NULL,

    observaciones VARCHAR(1000),

    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    estado ENUM(
        'Activo',
        'Anulado'
    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT uq_reporte_monitoria
        UNIQUE(
            id_sesion,
            id_usuario
        ),

    CONSTRAINT fk_reporte_monitoria_sesion
        FOREIGN KEY(id_sesion)
        REFERENCES Sesion(id_sesion)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_reporte_monitoria_usuario
        FOREIGN KEY(id_usuario)
        REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: RecuperacionMonitoria
-- -----------------------------------------------------

CREATE TABLE RecuperacionMonitoria(

    id_recuperacion INT AUTO_INCREMENT PRIMARY KEY,

    id_sesion_original INT NOT NULL,

    id_cancelacion INT,

    id_usuario INT NOT NULL,

    fecha_recuperacion DATE NOT NULL,

    hora_inicio TIME NOT NULL,

    hora_fin TIME NOT NULL,

    descripcion VARCHAR(1000) NOT NULL,

    ruta_soporte VARCHAR(255),

    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    estado ENUM(
        'Programada',
        'Realizada',
        'Cancelada'
    ) NOT NULL DEFAULT 'Programada',

    CONSTRAINT fk_recuperacion_sesion
        FOREIGN KEY(id_sesion_original)
        REFERENCES Sesion(id_sesion)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_recuperacion_cancelacion
        FOREIGN KEY(id_cancelacion)
        REFERENCES CancelacionMonitoria(id_cancelacion)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_recuperacion_usuario
        FOREIGN KEY(id_usuario)
        REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- =====================================================
-- MÓDULO DE SEGUIMIENTO
-- =====================================================

-- -----------------------------------------------------
-- TABLA: Asistencia
-- -----------------------------------------------------

CREATE TABLE Asistencia(

    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,

    id_sesion INT NOT NULL,

    id_estudiante INT NOT NULL,

    asistencia ENUM(

        'Asistió',
        'No Asistió',
        'Justificada'

    ) NOT NULL,

    observaciones VARCHAR(300),

    fecha_registro DATETIME NOT NULL,

    CONSTRAINT fk_asistencia_sesion

        FOREIGN KEY(id_sesion)

        REFERENCES Sesion(id_sesion)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_asistencia_estudiante

        FOREIGN KEY(id_estudiante)

        REFERENCES Estudiante(id_estudiante)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: HistorialSesion
-- -----------------------------------------------------

CREATE TABLE HistorialSesion(

    id_historial INT AUTO_INCREMENT PRIMARY KEY,

    id_sesion INT NOT NULL,

    actividades_desarrolladas VARCHAR(500),

    observaciones VARCHAR(500),

    recomendaciones VARCHAR(500),

    progreso_academico VARCHAR(500),

    registrado_por INT,

    fecha_registro DATETIME NOT NULL,

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT fk_historial_sesion

        FOREIGN KEY(id_sesion)

        REFERENCES Sesion(id_sesion)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: TipoClasificacion
-- -----------------------------------------------------

CREATE TABLE TipoClasificacion(

    id_tipo_clasificacion INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(80) NOT NULL UNIQUE,

    descripcion VARCHAR(250),

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo'

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Clasificacion
-- -----------------------------------------------------

CREATE TABLE Clasificacion(

    id_clasificacion INT AUTO_INCREMENT PRIMARY KEY,

    id_solicitud INT NOT NULL,

    id_usuario INT NOT NULL,

    id_tipo_clasificacion INT NOT NULL,

    fecha DATETIME NOT NULL,

    observacion VARCHAR(500),

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT fk_clasificacion_solicitud

        FOREIGN KEY(id_solicitud)

        REFERENCES Solicitud(id_solicitud)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_clasificacion_usuario

        FOREIGN KEY(id_usuario)

        REFERENCES Usuario(id_usuario)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_clasificacion_tipo

        FOREIGN KEY(id_tipo_clasificacion)

        REFERENCES TipoClasificacion(id_tipo_clasificacion)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Seguimiento
-- -----------------------------------------------------

CREATE TABLE Seguimiento(

    id_seguimiento INT AUTO_INCREMENT PRIMARY KEY,

    id_estudiante INT NOT NULL,

    id_sesion INT NOT NULL,

    fecha DATETIME NOT NULL,

    observaciones VARCHAR(500),

    estado ENUM(

        'Activo',
        'Finalizado'

    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT fk_seguimiento_estudiante

        FOREIGN KEY(id_estudiante)

        REFERENCES Estudiante(id_estudiante)

        ON UPDATE CASCADE

        ON DELETE RESTRICT,

    CONSTRAINT fk_seguimiento_sesion

        FOREIGN KEY(id_sesion)

        REFERENCES Sesion(id_sesion)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Compromiso
-- -----------------------------------------------------

CREATE TABLE Compromiso(

    id_compromiso INT AUTO_INCREMENT PRIMARY KEY,

    id_seguimiento INT NOT NULL,

    descripcion VARCHAR(500) NOT NULL,

    fecha_compromiso DATE NOT NULL,

    fecha_cumplimiento DATE,

    estado ENUM(

        'Pendiente',
        'Cumplido',
        'Incumplido'

    ) NOT NULL DEFAULT 'Pendiente',

    CONSTRAINT fk_compromiso_seguimiento

        FOREIGN KEY(id_seguimiento)

        REFERENCES Seguimiento(id_seguimiento)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: EntregaActividad
-- -----------------------------------------------------

CREATE TABLE EntregaActividad(

    id_entrega INT AUTO_INCREMENT PRIMARY KEY,

    id_compromiso INT NOT NULL,

    id_estudiante INT NOT NULL,

    comentario_estudiante VARCHAR(1000),

    ruta_archivo VARCHAR(255),

    fecha_entrega DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    retroalimentacion VARCHAR(1000),

    fecha_revision DATETIME,

    revisado_por INT,

    estado ENUM(
        'Entregada',
        'Observada',
        'Revisada'
    ) NOT NULL DEFAULT 'Entregada',

    CONSTRAINT uq_entrega_compromiso_estudiante
        UNIQUE(id_compromiso, id_estudiante),

    CONSTRAINT fk_entrega_compromiso
        FOREIGN KEY(id_compromiso)
        REFERENCES Compromiso(id_compromiso)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_entrega_estudiante
        FOREIGN KEY(id_estudiante)
        REFERENCES Estudiante(id_estudiante)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_entrega_revisor
        FOREIGN KEY(revisado_por)
        REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Evidencia
-- -----------------------------------------------------

CREATE TABLE Evidencia(

    id_evidencia INT AUTO_INCREMENT PRIMARY KEY,

    id_seguimiento INT NOT NULL,

    nombre_archivo VARCHAR(150) NOT NULL,

    tipo_archivo VARCHAR(50),

    ruta_archivo VARCHAR(255),

    tamano_archivo BIGINT,

    extension VARCHAR(10),

    descripcion VARCHAR(300),

    fecha_carga DATETIME NOT NULL,

    estado ENUM(

        'Activo',
        'Inactivo'

    ) NOT NULL DEFAULT 'Activo',

    CONSTRAINT fk_evidencia_seguimiento

        FOREIGN KEY(id_seguimiento)

        REFERENCES Seguimiento(id_seguimiento)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: Informe
-- -----------------------------------------------------

CREATE TABLE Informe(

    id_informe INT AUTO_INCREMENT PRIMARY KEY,

    id_sesion INT NOT NULL UNIQUE,

    id_usuario INT NOT NULL,

    titulo VARCHAR(200) NOT NULL,

    contenido VARCHAR(5000),

    actividades_desarrolladas VARCHAR(2000),

    logros VARCHAR(1000),

    dificultades VARCHAR(1000),

    recomendaciones VARCHAR(1000),

    fecha_envio DATETIME,

    fecha_revision DATETIME,

    revisado_por INT,

    observaciones_revision VARCHAR(2000),

    estado ENUM(
        'Borrador',
        'Enviado',
        'Devuelto',
        'Aprobado',
        'Entregado'
    ) NOT NULL DEFAULT 'Borrador',

    CONSTRAINT fk_informe_sesion
        FOREIGN KEY(id_sesion) REFERENCES Sesion(id_sesion)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_informe_autor
        FOREIGN KEY(id_usuario) REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_informe_revisor
        FOREIGN KEY(revisado_por) REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA: HistorialInforme
-- -----------------------------------------------------

CREATE TABLE HistorialInforme(

    id_historial_informe INT AUTO_INCREMENT PRIMARY KEY,

    id_informe INT NOT NULL,

    id_usuario INT NOT NULL,

    accion ENUM('Creado','Enviado','Devuelto','Aprobado','Entregado','Actualizado') NOT NULL,

    observacion VARCHAR(2000),

    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historial_informe
        FOREIGN KEY(id_informe) REFERENCES Informe(id_informe)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_historial_informe_usuario
        FOREIGN KEY(id_usuario) REFERENCES Usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB;

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_usuario_codigo
ON Usuario(codigo);

CREATE INDEX idx_usuario_documento
ON Usuario(documento);

CREATE INDEX idx_usuario_correo
ON Usuario(correo);

CREATE INDEX idx_credencial_usuario
ON Credencial(usuario);

CREATE INDEX idx_usuario_rol_usuario
ON UsuarioRol(id_usuario);

CREATE INDEX idx_usuario_rol_rol
ON UsuarioRol(id_rol);

CREATE INDEX idx_programa_facultad
ON Programa(id_facultad);

CREATE INDEX idx_programa_asignatura_programa
ON ProgramaAsignatura(id_programa);

CREATE INDEX idx_programa_asignatura_asignatura
ON ProgramaAsignatura(id_asignatura);

CREATE INDEX idx_estudiante_programa
ON EstudiantePrograma(id_estudiante);

CREATE INDEX idx_asignacion_usuario
ON AsignacionAcademica(id_usuario);

CREATE INDEX idx_asignacion_asignatura
ON AsignacionAcademica(id_asignatura);

CREATE INDEX idx_asignacion_periodo
ON AsignacionAcademica(id_periodo);

CREATE INDEX idx_disponibilidad_asignacion
ON Disponibilidad(id_asignacion);

CREATE INDEX idx_asignacion_espacio_disponibilidad
ON AsignacionEspacio(id_disponibilidad);

CREATE INDEX idx_asignacion_espacio
ON AsignacionEspacio(id_espacio);

CREATE INDEX idx_solicitud_estudiante
ON Solicitud(id_estudiante);

CREATE INDEX idx_solicitud_asignatura
ON Solicitud(id_asignatura);

CREATE INDEX idx_sesion_fecha
ON Sesion(fecha);

CREATE INDEX idx_sesion_asignacion
ON Sesion(id_asignacion);

CREATE INDEX idx_sesion_solicitud
ON Sesion(id_solicitud);

CREATE INDEX idx_asistencia_sesion
ON Asistencia(id_sesion);

CREATE INDEX idx_asistencia_estudiante
ON Asistencia(id_estudiante);

CREATE INDEX idx_historial_sesion
ON HistorialSesion(id_sesion);

CREATE INDEX idx_clasificacion_solicitud
ON Clasificacion(id_solicitud);

CREATE INDEX idx_clasificacion_usuario
ON Clasificacion(id_usuario);

CREATE INDEX idx_seguimiento_estudiante
ON Seguimiento(id_estudiante);

CREATE INDEX idx_seguimiento_sesion
ON Seguimiento(id_sesion);

CREATE INDEX idx_compromiso_seguimiento
ON Compromiso(id_seguimiento);

CREATE INDEX idx_evidencia_seguimiento
ON Evidencia(id_seguimiento);

CREATE INDEX idx_periodo_nombre
ON PeriodoAcademico(nombre);

CREATE INDEX idx_tutor_usuario
ON Tutor(id_usuario);

CREATE INDEX idx_monitor_usuario
ON Monitor(id_usuario);

CREATE INDEX idx_administrador_usuario
ON Administrador(id_usuario);

CREATE INDEX idx_espacio_estado
ON Espacio(estado);

CREATE INDEX idx_espacio_ubicacion
ON Espacio(edificio, bloque, salon);

CREATE INDEX idx_solicitud_estado
ON Solicitud(estado);

CREATE INDEX idx_sesion_estado
ON Sesion(estado);

CREATE INDEX idx_disponibilidad_dia
ON Disponibilidad(dia_semana);

CREATE INDEX idx_cancelacion_monitoria_sesion
ON CancelacionMonitoria(id_sesion);

CREATE INDEX idx_cancelacion_monitoria_usuario
ON CancelacionMonitoria(id_usuario);

CREATE INDEX idx_reporte_monitoria_sesion
ON ReporteMonitoria(id_sesion);

CREATE INDEX idx_reporte_monitoria_usuario
ON ReporteMonitoria(id_usuario);

CREATE INDEX idx_recuperacion_monitoria_sesion
ON RecuperacionMonitoria(id_sesion_original);

CREATE INDEX idx_recuperacion_monitoria_usuario
ON RecuperacionMonitoria(id_usuario);

-- =====================================================
-- DATOS DE PRUEBA
-- =====================================================

INSERT INTO Rol(id_rol, nombre, descripcion, estado) VALUES
(1, 'Administrador', 'Gestión general del sistema', 'Activo'),
(2, 'Estudiante', 'Usuario con acceso a agendamiento y actividades', 'Activo'),
(3, 'Tutor', 'Docente tutor de acompañamiento académico', 'Activo'),
(4, 'Monitor', 'Monitor académico institucional', 'Activo');

INSERT INTO Usuario(id_usuario, codigo, documento, nombres, apellidos, correo, telefono, estado) VALUES
(1, 'ADM001', '1000000010', 'Jayson Eric', 'Quintero Reina', 'jaysonquintero@unitropico.edu.co', '3184878993', 'Activo'),
(2, 'MON001', '1093432540', 'Brayham Orlando', 'Lindarte Fuentes', 'brayhamlindarte.es@unitropico.edu.co', '3000000001', 'Activo'),
(3, 'MON002', '1029800072', 'Karen Alejandra', 'Gaitán Diaz', 'karengaitan.es@unitropico.edu.co', '32039217550', 'Activo'),
(4, 'MON003', '1007418844', 'Shirley Dayanna', 'Tumay Cristiano', 'shirleytumay.es@unitropico.edu.co', '3143470487', 'Activo'),
(5, 'TUT001', '1007418843', 'Raúl Fernando', 'Robayo Méndez', 'tutormatematica@unitropico.edu.co', '3112318034', 'Activo'),
(6, 'EST001', '1029663952', 'María Valentina', 'Amezquita Amezquita', 'mariaamezquita.es@unitropico.edu.co', '3125172748', 'Activo'),
(7, 'EST002', '1029660011', 'Sofía Alejandra', 'Cárdenas Preciado', 'sofiacardenas.es@unitropico.edu.co', '3013784123', 'Activo'),
(8, 'EST003', '1028944310', 'María Sthefanía', 'Montañez Alayón', 'mariamontanez.es@unitropico.edu.co', '3212292954', 'Activo'),
(9, 'ADM002', '1000000011', 'Administrador', 'Sistema', 'admin@unitropico.edu.co', '3000000000', 'Activo');

INSERT INTO Credencial(id_credencial, usuario, password_hash, ultimo_acceso, primer_inicio, estado, id_usuario) VALUES
(1, 'jaysonquintero@unitropico.edu.co', '1000000010', NULL, TRUE, 'Activo', 1),
(2, 'brayhamlindarte.es@unitropico.edu.co', '1093432540', NULL, TRUE, 'Activo', 2),
(3, 'karengaitan.es@unitropico.edu.co', '1029800072', NULL, TRUE, 'Activo', 3),
(4, 'shirleytumay.es@unitropico.edu.co', '1007418844', NULL, TRUE, 'Activo', 4),
(5, 'tutormatematica@unitropico.edu.co', '1007418843', NULL, TRUE, 'Activo', 5),
(6, 'mariaamezquita.es@unitropico.edu.co', '1029663952', NULL, TRUE, 'Activo', 6),
(7, 'sofiacardenas.es@unitropico.edu.co', '1029660011', NULL, TRUE, 'Activo', 7),
(8, 'mariamontanez.es@unitropico.edu.co', '1028944310', NULL, TRUE, 'Activo', 8),
(9, 'admin@unitropico.edu.co', '1000000011', NULL, TRUE, 'Activo', 9);

INSERT INTO UsuarioRol(id_usuario_rol, id_usuario, id_rol, estado) VALUES
(1, 1, 1, 'Activo'),
(2, 2, 4, 'Activo'),
(3, 3, 4, 'Activo'),
(4, 4, 4, 'Activo'),
(5, 5, 3, 'Activo'),
(6, 6, 2, 'Activo'),
(7, 7, 2, 'Activo'),
(8, 8, 2, 'Activo'),
(9, 9, 1, 'Activo'),
(10, 2, 2, 'Activo'),
(11, 3, 2, 'Activo'),
(12, 4, 2, 'Activo');

INSERT INTO Administrador(id_administrador, id_usuario, cargo, dependencia, correo_institucional, observaciones, estado) VALUES
(1, 1, 'Coordinación Académica', 'Facultad de Ingenierías', 'jaysonquintero@unitropico.edu.co', 'Usuario de administración principal', 'Activo'),
(2, 9, 'Administrador de plataforma', 'Dirección TIC', 'admin@unitropico.edu.co', 'Usuario de respaldo del sistema', 'Activo');

INSERT INTO Estudiante(id_estudiante, id_usuario, codigo_estudiantil, semestre, estado) VALUES
(1, 6, '20262001', 4, 'Activo'),
(2, 7, '20262002', 5, 'Activo'),
(3, 8, '20262003', 6, 'Activo'),
(4, 2, '20262004', 4, 'Activo'),
(5, 3, '20262005', 4, 'Activo'),
(6, 4, '20262006', 4, 'Activo');

INSERT INTO Tutor(id_tutor, id_usuario, categoria_docente, tipo_vinculacion, periodo_actual, horas_semanales, observaciones, estado) VALUES
(1, 5, 'Tiempo completo', 'Planta', '2026-1', 8, 'Tutor de matemáticas', 'Activo');

INSERT INTO Monitor(id_monitor, id_usuario, tipo_monitor, resolucion, periodo_actual, horas_semanales, observaciones, estado) VALUES
(1, 2, 'Monitor académico', 'Resolución 2026-01', '2026-1', 12, 'Monitor principal para bases de datos', 'Activo'),
(2, 3, 'Monitor académico', 'Resolución 2026-02', '2026-1', 10, 'Monitor principal para programación', 'Activo'),
(3, 4, 'Monitor académico', 'Resolución 2026-03', '2026-1', 10, 'Monitor de apoyo académico', 'Activo');

INSERT INTO Configuracion(id_configuracion, clave, valor, tipo, descripcion) VALUES
(1, 'institucion_nombre', 'Universidad Internacional del Trópico Americano', 'string', 'Nombre institucional visible en la interfaz'),
(2, 'periodo_activo', '2026-1', 'string', 'Periodo académico visible por defecto'),
(3, 'soporte_correo', 'soporte@unitropico.edu.co', 'string', 'Correo de soporte institucional'),
(4, 'tema_ui', 'azul', 'string', 'Tema visual principal');

INSERT INTO Facultad(id_facultad, nombre, descripcion, estado) VALUES
(1, 'Ingenierías', 'Facultad para programas de ingeniería y tecnología', 'Activo'),
(2, 'Ciencias Empresariales', 'Facultad para programas administrativos y contables', 'Activo');

INSERT INTO Programa(id_programa, codigo, nombre, registro_snies, estado, id_facultad) VALUES
(1, 'SIS', 'Ingeniería de Sistemas', '123456', 'Activo', 1),
(2, 'CON', 'Contaduría Pública', '789012', 'Activo', 2);

INSERT INTO Asignatura(id_asignatura, codigo, nombre, creditos, descripcion, estado) VALUES
(1, 'MAT101', 'Matemáticas básicas', 3, 'Fundamentos matemáticos para el desarrollo académico', 'Activo'),
(2, 'MAT102', 'Pensamiento matemático', 3, 'Razonamiento lógico y resolución de problemas', 'Activo'),
(3, 'MAT201', 'Álgebra', 3, 'Estructuras algebraicas y operaciones fundamentales', 'Activo'),
(4, 'MAT202', 'Cálculo', 4, 'Conceptos introductorios de cálculo y sus aplicaciones', 'Activo'),
(5, 'MAT103', 'Precálculo', 3, 'Preparación matemática para cursos de cálculo', 'Activo'),
(6, 'QUI101', 'Química general', 3, 'Principios básicos de química', 'Activo'),
(7, 'QUI201', 'Química organica', 3, 'Estudio de compuestos orgánicos y sus reacciones', 'Activo'),
(8, 'BIO201', 'Biofisica', 3, 'Aplicación de principios físicos a sistemas biológicos', 'Activo'),
(9, 'FIS101', 'Fisica I', 3, 'Mecánica clásica y fundamentos de física', 'Activo'),
(10, 'COM101', 'Comprension y producción de textos I', 2, 'Competencias iniciales de lectura y escritura académica', 'Activo'),
(11, 'COM102', 'Comprension y producción de textos II', 2, 'Profundización en argumentación y producción textual', 'Activo'),
(12, 'ING106', 'Idioma Extranjero VI', 2, 'Competencias comunicativas avanzadas en segunda lengua', 'Activo'),
(13, 'INV101', 'Introduccion a la investigación', 2, 'Fundamentos de metodología de investigación', 'Activo'),
(14, 'ING100', 'Introduccion a la ingenieria', 2, 'Contexto, ética y áreas de la ingeniería', 'Activo'),
(15, 'CON101', 'Fundamentos de contabilidad', 3, 'Bases conceptuales y técnicas contables', 'Activo'),
(16, 'ADM101', 'Proceso administrativo', 3, 'Planeación, organización, dirección y control', 'Activo'),
(17, 'MOR202', 'Morfofisiologia II', 3, 'Integración estructural y funcional del organismo', 'Activo'),
(18, 'BIO202', 'Histología y Embriología', 3, 'Tejidos biológicos y desarrollo embrionario', 'Activo'),
(19, 'SIS101', 'Algoritmos y computación', 3, 'Diseño de algoritmos y bases de computación', 'Activo'),
(20, 'CIV201', 'Estática', 3, 'Análisis de fuerzas y equilibrio en cuerpos rígidos', 'Activo'),
(21, 'CIV301', 'Análisis estructural', 3, 'Comportamiento y modelado de estructuras', 'Activo'),
(22, 'MAT301', 'Cálculo diferencial e integral', 4, 'Estudio de derivadas e integrales aplicadas', 'Activo'),
(23, 'FIS201', 'Fisica II', 3, 'Fenómenos de electricidad, magnetismo y ondas', 'Activo'),
(24, 'TIG401', 'Taller integrador de problemas globales', 3, 'Abordaje interdisciplinar de problemáticas globales', 'Activo');

INSERT INTO ProgramaAsignatura(id_programa_asignatura, id_programa, id_asignatura, semestre, estado) VALUES
(1, 1, 1, 1, 'Activo'),
(2, 1, 2, 2, 'Activo'),
(3, 1, 3, 2, 'Activo'),
(4, 2, 4, 1, 'Activo'),
(5, 2, 5, 2, 'Activo'),
(6, 2, 6, 1, 'Activo');

INSERT INTO EstudiantePrograma(id_estudiante_programa, id_estudiante, id_programa, principal, fecha_ingreso, estado) VALUES
(1, 1, 1, TRUE, '2026-01-15', 'Activo'),
(2, 2, 2, TRUE, '2026-01-15', 'Activo'),
(3, 3, 1, TRUE, '2026-01-15', 'Activo'),
(4, 4, 1, TRUE, '2026-01-15', 'Activo'),
(5, 5, 1, TRUE, '2026-01-15', 'Activo'),
(6, 6, 1, TRUE, '2026-01-15', 'Activo');

INSERT INTO PeriodoAcademico(id_periodo, nombre, fecha_inicio, fecha_fin, estado) VALUES
(1, '2026-1', '2026-01-20', '2026-06-20', 'Activo'),
(2, '2025-2', '2025-08-01', '2025-12-15', 'Finalizado');

INSERT INTO Espacio(id_espacio, codigo, nombre, edificio, bloque, salon, piso, ubicacion, descripcion, recursos, observaciones, capacidad, tipo, estado) VALUES
(1, '107C', 'Salón 107C', 'Bloque C', 'C', '107C', '1', 'Bloque C, salón 107C', 'Aula presencial', 'Video beam, tablero', NULL, 30, 'Aula', 'Activo'),
(2, '108C', 'Salón 108C', 'Bloque C', 'C', '108C', '1', 'Bloque C, salón 108C', 'Aula presencial', 'Video beam, tablero', NULL, 30, 'Aula', 'Activo'),
(3, '107A', 'Salón 107A', 'Bloque A', 'A', '107A', '1', 'Bloque A, salón 107A', 'Aula presencial', 'Video beam, tablero', NULL, 28, 'Aula', 'Activo'),
(4, '202A', 'Salón 202A', 'Bloque A', 'A', '202A', '2', 'Bloque A, salón 202A', 'Aula presencial', 'Video beam, tablero', NULL, 35, 'Aula', 'Activo'),
(5, '110A', 'Salón 110A', 'Bloque A', 'A', '110A', '1', 'Bloque A, salón 110A', 'Aula presencial', 'Video beam, tablero', NULL, 32, 'Aula', 'Activo'),
(6, '115A', 'Salón 115A', 'Bloque A', 'A', '115A', '1', 'Bloque A, salón 115A', 'Aula presencial', 'Video beam, tablero', NULL, 32, 'Aula', 'Activo'),
(7, '102A', 'Salón 102A', 'Bloque A', 'A', '102A', '1', 'Bloque A, salón 102A', 'Aula presencial', 'Video beam, tablero', NULL, 28, 'Aula', 'Activo'),
(8, '206A', 'Salón 206A', 'Bloque A', 'A', '206A', '2', 'Bloque A, salón 206A', 'Aula presencial', 'Video beam, tablero', NULL, 28, 'Aula', 'Activo'),
(9, 'BIB01', 'Biblioteca', 'Biblioteca', 'B', 'Biblioteca', '1', 'Biblioteca central', 'Espacio de estudio', 'Mesas, libros, wifi', NULL, 40, 'Biblioteca', 'Activo'),
(10, '103D', 'Salón 103D', 'Bloque D', 'D', '103D', '1', 'Bloque D, salón 103D', 'Aula presencial', 'Video beam, tablero', NULL, 26, 'Aula', 'Activo'),
(11, '108A', 'Salón 108A', 'Bloque A', 'A', '108A', '1', 'Bloque A, salón 108A', 'Aula presencial', 'Video beam, tablero', NULL, 30, 'Aula', 'Activo'),
(12, '102D', 'Salón 102D', 'Bloque D', 'D', '102D', '1', 'Bloque D, salón 102D', 'Aula presencial', 'Video beam, tablero', NULL, 26, 'Aula', 'Activo'),
(13, '101A', 'Salón 101A', 'Bloque A', 'A', '101A', '1', 'Bloque A, salón 101A', 'Aula para tutorías', 'Tablero, escritorio', NULL, 20, 'Aula', 'Activo'),
(14, '202B', 'Salón 202B', 'Bloque B', 'B', '202B', '2', 'Bloque B, salón 202B', 'Aula para tutorías', 'Tablero, proyector', NULL, 22, 'Aula', 'Activo'),
(15, '108B', 'Salón 108B', 'Bloque B', 'B', '108B', '1', 'Bloque B, salón 108B', 'Aula para tutorías', 'Tablero, proyector', NULL, 24, 'Aula', 'Activo'),
(16, '207A', 'Salón 207A', 'Bloque A', 'A', '207A', '2', 'Bloque A, salón 207A', 'Aula presencial', 'Video beam, tablero', NULL, 32, 'Aula', 'Activo'),
(17, '204A', 'Salón 204A', 'Bloque A', 'A', '204A', '2', 'Bloque A, salón 204A', 'Aula presencial', 'Video beam, tablero', NULL, 32, 'Aula', 'Activo'),
(18, '114A', 'Salón 114A', 'Bloque A', 'A', '114A', '1', 'Bloque A, salón 114A', 'Aula presencial', 'Video beam, tablero', NULL, 30, 'Aula', 'Activo'),
(19, '104C', 'Salón 104C', 'Bloque C', 'C', '104C', '1', 'Bloque C, salón 104C', 'Aula presencial', 'Video beam, tablero', NULL, 30, 'Aula', 'Activo');

INSERT INTO AsignacionAcademica(id_asignacion, id_usuario, id_rol, id_asignatura, id_periodo, horas_semanales, fecha_inicio, fecha_fin, estado) VALUES
(1, 2, 4, 1, 1, 12, '2026-01-20', NULL, 'Activa'),
(2, 3, 4, 1, 1, 10, '2026-01-20', NULL, 'Activa'),
(3, 4, 4, 1, 1, 10, '2026-01-20', NULL, 'Activa'),
(4, 5, 3, 4, 1, 6, '2026-01-20', NULL, 'Activa'),
(5, 5, 3, 5, 1, 6, '2026-01-20', NULL, 'Activa'),
(6, 5, 3, 6, 1, 4, '2026-01-20', NULL, 'Activa');

INSERT INTO Disponibilidad(id_disponibilidad, id_asignacion, dia_semana, hora_inicio, hora_fin, modalidad, estado) VALUES
(1, 4, 'Lunes', '08:00:00', '10:00:00', 'Presencial', 'Activo'),
(2, 4, 'Miércoles', '10:00:00', '12:00:00', 'Presencial', 'Activo'),
(3, 4, 'Viernes', '14:00:00', '16:00:00', 'Virtual', 'Activo'),
(4, 5, 'Martes', '09:00:00', '11:00:00', 'Presencial', 'Activo'),
(5, 5, 'Jueves', '15:00:00', '17:00:00', 'Presencial', 'Activo'),
(6, 6, 'Sábado', '08:00:00', '10:00:00', 'Virtual', 'Activo');

INSERT INTO AsignacionEspacio(id_asignacion_espacio, id_disponibilidad, id_espacio, fecha_inicio, fecha_fin, estado) VALUES
(1, 1, 13, '2026-01-20', NULL, 'Activo'),
(2, 2, 14, '2026-01-20', NULL, 'Activo'),
(3, 4, 15, '2026-01-20', NULL, 'Activo'),
(4, 5, 13, '2026-01-20', NULL, 'Activo');

INSERT INTO HorarioMonitor(id_horario_monitor, id_usuario, id_periodo, dia_semana, hora_inicio, hora_fin, duracion_minutos, modalidad, id_espacio, observaciones, estado) VALUES
(1, 2, 1, 'Lunes', '14:00:00', '16:00:00', 120, 'Presencial', 16, 'Horario del monitor Brayham - Matemáticas básicas', 'Activo'),
(2, 2, 1, 'Martes', '11:00:00', '13:00:00', 120, 'Presencial', 17, 'Horario del monitor Brayham - Matemáticas básicas', 'Activo'),
(3, 2, 1, 'Jueves', '09:00:00', '10:00:00', 60, 'Presencial', 6, 'Horario del monitor Brayham - Matemáticas básicas', 'Activo'),
(4, 2, 1, 'Jueves', '17:00:00', '18:00:00', 60, 'Presencial', 18, 'Horario del monitor Brayham - Matemáticas básicas', 'Activo'),
(5, 2, 1, 'Viernes', '07:00:00', '08:00:00', 60, 'Presencial', 11, 'Horario del monitor Brayham - Matemáticas básicas', 'Activo'),
(6, 2, 1, 'Viernes', '13:00:00', '14:00:00', 60, 'Presencial', 19, 'Horario del monitor Brayham - Matemáticas básicas', 'Activo'),
(7, 3, 1, 'Lunes', '13:00:00', '15:00:00', 120, 'Presencial', 1, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo'),
(8, 3, 1, 'Miércoles', '08:00:00', '09:00:00', 60, 'Presencial', 2, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo'),
(9, 3, 1, 'Miércoles', '17:00:00', '18:00:00', 60, 'Presencial', 3, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo'),
(10, 3, 1, 'Martes', '09:00:00', '10:00:00', 60, 'Presencial', 4, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo'),
(11, 3, 1, 'Jueves', '10:00:00', '11:00:00', 60, 'Presencial', 5, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo'),
(12, 3, 1, 'Sábado', '10:00:00', '11:00:00', 60, 'Presencial', 6, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo'),
(13, 3, 1, 'Sábado', '17:00:00', '18:00:00', 60, 'Presencial', 4, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo'),
(14, 4, 1, 'Lunes', '10:00:00', '11:00:00', 60, 'Presencial', 4, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo'),
(15, 4, 1, 'Lunes', '12:00:00', '13:00:00', 60, 'Presencial', 7, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo'),
(16, 4, 1, 'Viernes', '17:00:00', '18:00:00', 60, 'Presencial', 8, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo'),
(17, 4, 1, 'Martes', '06:00:00', '07:00:00', 60, 'Presencial', 9, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo'),
(18, 4, 1, 'Martes', '07:00:00', '08:00:00', 60, 'Presencial', 10, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo'),
(19, 4, 1, 'Martes', '17:00:00', '18:00:00', 60, 'Presencial', 11, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo'),
(20, 4, 1, 'Sábado', '14:00:00', '16:00:00', 120, 'Presencial', 12, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo');

INSERT INTO TipoSolicitud(id_tipo_solicitud, nombre, descripcion, estado) VALUES
(1, 'Monitoría', 'Acompañamiento entre pares', 'Activo'),
(2, 'Tutoría', 'Acompañamiento docente', 'Activo'),
(3, 'Acompañamiento', 'Apoyo académico general', 'Activo');

INSERT INTO TipoClasificacion(id_tipo_clasificacion, nombre, descripcion, estado) VALUES
(1, 'Académica', 'Clasificación académica de la solicitud', 'Activo'),
(2, 'Seguimiento', 'Seguimiento del proceso', 'Activo'),
(3, 'Conductual', 'Clasificación conductual', 'Activo');

INSERT INTO Solicitud(id_solicitud, id_estudiante, id_programa, id_asignatura, id_tipo_solicitud, id_periodo, fecha_solicitud, motivo, descripcion, prioridad, estado) VALUES
(1, 1, 1, 2, 1, 1, '2026-08-01 08:30:00', 'Necesito reforzar consultas SQL', 'Solicitud de monitoría para bases de datos', 'Alta', 'Aprobada'),
(2, 2, 2, 4, 2, 1, '2026-08-01 09:10:00', 'Quiero apoyo en contabilidad general', 'Solicitud de tutoría para contabilidad', 'Media', 'Asignada'),
(3, 1, 1, 1, 1, 1, '2026-08-02 10:15:00', 'Debo preparar un taller de programación', 'Solicitud para monitoría en programación', 'Media', 'Cancelada'),
(4, 2, 2, 5, 2, 1, '2026-08-02 11:20:00', 'Necesito repasar legislación comercial', 'Solicitud de tutoría en legislación', 'Baja', 'Finalizada');

INSERT INTO Sesion(id_sesion, id_solicitud, id_asignacion, id_asignacion_espacio, fecha, hora_inicio, hora_fin, modalidad, tipo, tema, observaciones, fecha_registro, estado) VALUES
(1, 1, 1, NULL, '2026-08-06', '09:00:00', '10:00:00', 'Presencial', 'Monitoría', 'Consultas SQL básicas', 'Sesión de práctica guiada', '2026-08-05 08:00:00', 'Realizada'),
(2, 3, 2, NULL, '2026-08-07', '10:00:00', '11:00:00', 'Presencial', 'Monitoría', 'Programación I', 'Sesión cancelada y reprogramada', '2026-08-05 08:10:00', 'Cancelada'),
(3, 2, 4, 1, '2026-08-08', '14:00:00', '15:30:00', 'Presencial', 'Tutoría', 'Contabilidad general', 'Tutoría desarrollada en aula 101A', '2026-08-05 08:15:00', 'Finalizada'),
(4, 4, 5, 2, '2026-08-09', '15:00:00', '16:00:00', 'Presencial', 'Tutoría', 'Legislación comercial', 'Tutoría de repaso', '2026-08-05 08:20:00', 'Programada');

INSERT INTO CancelacionMonitoria(id_cancelacion, id_sesion, id_usuario, fecha_cancelacion, dias_anticipacion, motivo, estado) VALUES
(1, 2, 3, '2026-08-05 09:00:00', 2, 'Cruce de agenda con actividad institucional', 'Activo');

INSERT INTO ReporteMonitoria(id_reporte_monitoria, id_sesion, id_usuario, actividad, asistencia, ruta_listado_asistencia, ruta_material, hora_inicio_real, hora_fin_real, observaciones, fecha_registro, estado) VALUES
(1, 1, 2, 'Repaso de SELECT, WHERE y JOIN con ejercicios guiados', 'Si', 'assets/evidencias/monitor/asistencia_sesion_1.xlsx', 'assets/evidencias/monitor/material_sesion_1.pdf', '09:05:00', '10:10:00', 'La sesión se desarrolló sin novedades', '2026-08-06 10:15:00', 'Activo');

INSERT INTO RecuperacionMonitoria(id_recuperacion, id_sesion_original, id_cancelacion, id_usuario, fecha_recuperacion, hora_inicio, hora_fin, descripcion, ruta_soporte, fecha_registro, estado) VALUES
(1, 2, 1, 3, '2026-08-12', '10:00:00', '11:00:00', 'Recuperación de monitoría cancelada por cruce de agenda', 'assets/evidencias/monitor/recuperacion_sesion_2.pdf', '2026-08-05 09:15:00', 'Programada');

INSERT INTO Asistencia(id_asistencia, id_sesion, id_estudiante, asistencia, observaciones, fecha_registro) VALUES
(1, 1, 1, 'Asistió', 'Participó activamente en la práctica', '2026-08-06 09:10:00'),
(2, 3, 2, 'Asistió', 'Asistencia completa a la tutoría', '2026-08-08 14:05:00');

INSERT INTO HistorialSesion(id_historial, id_sesion, actividades_desarrolladas, observaciones, recomendaciones, progreso_academico, registrado_por, fecha_registro, estado) VALUES
(1, 1, 'Explicación de consultas SQL y práctica guiada', 'Buena participación del estudiante', 'Practicar filtros y joins antes de la próxima sesión', 'Avance satisfactorio en consultas básicas', 2, '2026-08-06 10:20:00', 'Activo'),
(2, 3, 'Resolución de ejercicios de contabilidad general', 'La estudiante comprendió los conceptos base', 'Repasar balance general y estados financieros', 'Progreso aceptable con refuerzo conceptual', 5, '2026-08-08 15:40:00', 'Activo');

INSERT INTO Seguimiento(id_seguimiento, id_estudiante, id_sesion, fecha, observaciones, estado) VALUES
(1, 1, 1, '2026-08-06 10:30:00', 'Seguimiento asociado a la monitoría de bases de datos', 'Activo'),
(2, 2, 3, '2026-08-08 15:45:00', 'Seguimiento asociado a la tutoría de contabilidad', 'Activo');

INSERT INTO Compromiso(id_compromiso, id_seguimiento, descripcion, fecha_compromiso, fecha_cumplimiento, estado) VALUES
(1, 1, 'Resolver diez consultas SQL y adjuntar evidencias', '2026-08-10', NULL, 'Pendiente'),
(2, 1, 'Revisar ejercicios de normalización', '2026-08-12', '2026-08-12', 'Cumplido');

INSERT INTO EntregaActividad(id_entrega, id_compromiso, id_estudiante, comentario_estudiante, ruta_archivo, fecha_entrega, retroalimentacion, fecha_revision, revisado_por, estado) VALUES
(1, 1, 1, 'Adjunto el taller resuelto y mis consultas', 'assets/evidencias/estudiante/entregas/taller_sql.pdf', '2026-08-10 18:15:00', 'Buen trabajo, solo ajusta el uso de alias en una consulta', '2026-08-11 08:30:00', 2, 'Revisada');

INSERT INTO Evidencia(id_evidencia, id_seguimiento, nombre_archivo, tipo_archivo, ruta_archivo, tamano_archivo, extension, descripcion, fecha_carga, estado) VALUES
(1, 1, 'taller_sql.pdf', 'application/pdf', 'assets/evidencias/estudiante/entregas/taller_sql.pdf', 245760, 'pdf', 'Soporte de la entrega de actividades', '2026-08-10 18:15:00', 'Activo');

INSERT INTO Clasificacion(id_clasificacion, id_solicitud, id_usuario, id_tipo_clasificacion, fecha, observacion, estado) VALUES
(1, 1, 1, 1, '2026-08-01 10:00:00', 'Solicitud priorizada por el estado académico del estudiante', 'Activo');

INSERT INTO Informe(id_informe, id_sesion, id_usuario, titulo, contenido, actividades_desarrolladas, logros, dificultades, recomendaciones, fecha_envio, fecha_revision, revisado_por, observaciones_revision, estado) VALUES
(1, 3, 5, 'Informe de tutoría - Contabilidad General', 'Resumen de la tutoría realizada con ejercicios prácticos y retroalimentación puntual.', 'Repaso de conceptos base y resolución de ejercicios guiados', 'Comprensión inicial de los estados financieros', 'Dificultad en la interpretación de cuentas puente', 'Repasar ejemplos y consultar el material de clase', '2026-08-08 16:00:00', '2026-08-09 08:00:00', 1, 'Informe aprobado sin observaciones adicionales', 'Aprobado');
