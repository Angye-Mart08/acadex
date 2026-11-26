-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         12.3.3-MariaDB - MariaDB Server
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.20.0.7320
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Volcando estructura de base de datos para gestion_monitorias_tutorias
CREATE DATABASE IF NOT EXISTS `gestion_monitorias_tutorias` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci */;
USE `gestion_monitorias_tutorias`;

-- Volcando estructura para tabla gestion_monitorias_tutorias.adjuntoinformetutor
CREATE TABLE IF NOT EXISTS `AdjuntoInformeTutor` (
  `id_adjunto` int(11) NOT NULL AUTO_INCREMENT,
  `id_informe` int(11) NOT NULL,
  `categoria` enum('Asistencia','Actividades','EvidenciaInicio','EvidenciaFin') NOT NULL,
  `nombre_archivo` varchar(150) NOT NULL,
  `tipo_archivo` varchar(100) NOT NULL,
  `ruta_archivo` varchar(500) NOT NULL,
  `tamano_archivo` bigint(20) unsigned NOT NULL,
  `fecha_carga` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_adjunto`),
  KEY `fk_adjunto_informe_tutor` (`id_informe`),
  CONSTRAINT `fk_adjunto_informe_tutor` FOREIGN KEY (`id_informe`) REFERENCES `Informe` (`id_informe`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.adjuntoinformetutor: ~0 rows (aproximadamente)

-- Volcando estructura para tabla gestion_monitorias_tutorias.administrador
CREATE TABLE IF NOT EXISTS `Administrador` (
  `id_administrador` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `cargo` varchar(120) DEFAULT NULL,
  `dependencia` varchar(120) DEFAULT NULL,
  `correo_institucional` varchar(120) DEFAULT NULL,
  `observaciones` varchar(300) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_administrador`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  KEY `idx_administrador_usuario` (`id_usuario`),
  CONSTRAINT `fk_administrador_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.administrador: ~2 rows (aproximadamente)
REPLACE INTO `Administrador` (`id_administrador`, `id_usuario`, `cargo`, `dependencia`, `correo_institucional`, `observaciones`, `estado`) VALUES
	(1, 1, 'Coordinacion Academica', 'Facultad de Ingenierias', 'jaysonquintero@unitropico.edu.co', 'Usuario de administracion principal', 'Activo'),
	(2, 9, 'Administrador de plataforma', 'Direccion TIC', 'admin@unitropico.edu.co', 'Usuario de respaldo del sistema', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.asignacionacademica
CREATE TABLE IF NOT EXISTS `AsignacionAcademica` (
  `id_asignacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_rol` int(11) NOT NULL,
  `id_asignatura` int(11) NOT NULL,
  `id_periodo` int(11) NOT NULL,
  `horas_semanales` tinyint(4) NOT NULL CHECK (`horas_semanales` > 0),
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `estado` enum('Activa','Finalizada','Cancelada') NOT NULL DEFAULT 'Activa',
  PRIMARY KEY (`id_asignacion`),
  KEY `fk_asignacion_rol` (`id_rol`),
  KEY `idx_asignacion_usuario` (`id_usuario`),
  KEY `idx_asignacion_asignatura` (`id_asignatura`),
  KEY `idx_asignacion_periodo` (`id_periodo`),
  CONSTRAINT `fk_asignacion_asignatura` FOREIGN KEY (`id_asignatura`) REFERENCES `Asignatura` (`id_asignatura`) ON UPDATE CASCADE,
  CONSTRAINT `fk_asignacion_periodo` FOREIGN KEY (`id_periodo`) REFERENCES `PeriodoAcademico` (`id_periodo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_asignacion_rol` FOREIGN KEY (`id_rol`) REFERENCES `Rol` (`id_rol`) ON UPDATE CASCADE,
  CONSTRAINT `fk_asignacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.asignacionacademica: ~14 rows (aproximadamente)
REPLACE INTO `AsignacionAcademica` (`id_asignacion`, `id_usuario`, `id_rol`, `id_asignatura`, `id_periodo`, `horas_semanales`, `fecha_inicio`, `fecha_fin`, `estado`) VALUES
	(1, 2, 4, 1, 1, 12, '2026-01-20', NULL, 'Activa'),
	(2, 3, 4, 1, 1, 10, '2026-01-20', NULL, 'Cancelada'),
	(3, 4, 4, 1, 1, 14, '2026-01-20', NULL, 'Activa'),
	(4, 5, 3, 4, 1, 8, '2026-01-20', NULL, 'Cancelada'),
	(5, 5, 3, 5, 1, 8, '2026-01-20', NULL, 'Cancelada'),
	(6, 5, 3, 6, 1, 4, '2026-01-20', NULL, 'Cancelada'),
	(8, 6, 4, 3, 1, 14, '2026-10-15', NULL, 'Cancelada'),
	(9, 9, 4, 17, 1, 14, '2026-10-15', NULL, 'Cancelada'),
	(10, 5, 3, 1, 1, 14, '2026-11-03', NULL, 'Activa'),
	(11, 2, 4, 1, 3, 12, '2026-11-03', NULL, 'Cancelada'),
	(12, 3, 4, 1, 3, 10, '2026-11-03', NULL, 'Activa'),
	(13, 5, 3, 1, 3, 14, '2026-11-03', NULL, 'Cancelada'),
	(14, 4, 4, 1, 3, 14, '2026-11-03', NULL, 'Cancelada'),
	(15, 5, 3, 3, 3, 14, '2026-11-03', NULL, 'Cancelada');

-- Volcando estructura para tabla gestion_monitorias_tutorias.asignacionespacio
CREATE TABLE IF NOT EXISTS `AsignacionEspacio` (
  `id_asignacion_espacio` int(11) NOT NULL AUTO_INCREMENT,
  `id_disponibilidad` int(11) NOT NULL,
  `id_espacio` int(11) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_asignacion_espacio`),
  KEY `idx_asignacion_espacio_disponibilidad` (`id_disponibilidad`),
  KEY `idx_asignacion_espacio` (`id_espacio`),
  CONSTRAINT `fk_asignacion_espacio` FOREIGN KEY (`id_espacio`) REFERENCES `Espacio` (`id_espacio`) ON UPDATE CASCADE,
  CONSTRAINT `fk_asignacion_espacio_disponibilidad` FOREIGN KEY (`id_disponibilidad`) REFERENCES `Disponibilidad` (`id_disponibilidad`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.asignacionespacio: ~4 rows (aproximadamente)
REPLACE INTO `AsignacionEspacio` (`id_asignacion_espacio`, `id_disponibilidad`, `id_espacio`, `fecha_inicio`, `fecha_fin`, `estado`) VALUES
	(1, 1, 13, '2026-01-20', NULL, 'Activo'),
	(2, 2, 14, '2026-01-20', NULL, 'Activo'),
	(3, 4, 15, '2026-01-20', NULL, 'Activo'),
	(4, 5, 13, '2026-01-20', NULL, 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.asignatura
CREATE TABLE IF NOT EXISTS `Asignatura` (
  `id_asignatura` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `creditos` tinyint(4) DEFAULT NULL,
  `descripcion` varchar(300) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_asignatura`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.asignatura: ~25 rows (aproximadamente)
REPLACE INTO `Asignatura` (`id_asignatura`, `codigo`, `nombre`, `creditos`, `descripcion`, `estado`) VALUES
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

-- Volcando estructura para tabla gestion_monitorias_tutorias.asistencia
CREATE TABLE IF NOT EXISTS `Asistencia` (
  `id_asistencia` int(11) NOT NULL AUTO_INCREMENT,
  `id_sesion` int(11) NOT NULL,
  `id_estudiante` int(11) NOT NULL,
  `asistencia` enum('Asistió','No Asistió','Justificada') NOT NULL,
  `observaciones` varchar(300) DEFAULT NULL,
  `fecha_registro` datetime NOT NULL,
  PRIMARY KEY (`id_asistencia`),
  KEY `idx_asistencia_sesion` (`id_sesion`),
  KEY `idx_asistencia_estudiante` (`id_estudiante`),
  CONSTRAINT `fk_asistencia_estudiante` FOREIGN KEY (`id_estudiante`) REFERENCES `Estudiante` (`id_estudiante`) ON UPDATE CASCADE,
  CONSTRAINT `fk_asistencia_sesion` FOREIGN KEY (`id_sesion`) REFERENCES `Sesion` (`id_sesion`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.asistencia: ~2 rows (aproximadamente)
REPLACE INTO `Asistencia` (`id_asistencia`, `id_sesion`, `id_estudiante`, `asistencia`, `observaciones`, `fecha_registro`) VALUES
	(1, 1, 1, 'Asistió', 'Participó activamente en la práctica', '2026-08-06 09:10:00'),
	(2, 3, 2, 'Asistió', 'Asistencia completa a la tutoría', '2026-08-08 14:05:00');

-- Volcando estructura para tabla gestion_monitorias_tutorias.cancelacionmonitoria
CREATE TABLE IF NOT EXISTS `CancelacionMonitoria` (
  `id_cancelacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_sesion` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_cancelacion` datetime NOT NULL DEFAULT current_timestamp(),
  `dias_anticipacion` int(11) NOT NULL,
  `motivo` varchar(1000) NOT NULL,
  `estado` enum('Activo','Anulada') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_cancelacion`),
  KEY `idx_cancelacion_monitoria_sesion` (`id_sesion`),
  KEY `idx_cancelacion_monitoria_usuario` (`id_usuario`),
  CONSTRAINT `fk_cancelacion_sesion` FOREIGN KEY (`id_sesion`) REFERENCES `Sesion` (`id_sesion`) ON UPDATE CASCADE,
  CONSTRAINT `fk_cancelacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.cancelacionmonitoria: ~1 rows (aproximadamente)
REPLACE INTO `CancelacionMonitoria` (`id_cancelacion`, `id_sesion`, `id_usuario`, `fecha_cancelacion`, `dias_anticipacion`, `motivo`, `estado`) VALUES
	(1, 2, 3, '2026-08-05 09:00:00', 2, 'Cruce de agenda con actividad institucional', 'Activo'),
	(2, 7, 5, '2026-11-03 11:44:07', 0, 'La información enviada no cumple las reglas de validación.', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.clasificacion
CREATE TABLE IF NOT EXISTS `Clasificacion` (
  `id_clasificacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_solicitud` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_tipo_clasificacion` int(11) NOT NULL,
  `fecha` datetime NOT NULL,
  `observacion` varchar(500) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_clasificacion`),
  KEY `fk_clasificacion_tipo` (`id_tipo_clasificacion`),
  KEY `idx_clasificacion_solicitud` (`id_solicitud`),
  KEY `idx_clasificacion_usuario` (`id_usuario`),
  CONSTRAINT `fk_clasificacion_solicitud` FOREIGN KEY (`id_solicitud`) REFERENCES `Solicitud` (`id_solicitud`) ON UPDATE CASCADE,
  CONSTRAINT `fk_clasificacion_tipo` FOREIGN KEY (`id_tipo_clasificacion`) REFERENCES `TipoClasificacion` (`id_tipo_clasificacion`) ON UPDATE CASCADE,
  CONSTRAINT `fk_clasificacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.clasificacion: ~0 rows (aproximadamente)
REPLACE INTO `Clasificacion` (`id_clasificacion`, `id_solicitud`, `id_usuario`, `id_tipo_clasificacion`, `fecha`, `observacion`, `estado`) VALUES
	(1, 1, 1, 1, '2026-08-01 10:00:00', 'Solicitud priorizada por el estado académico del estudiante', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.codigorestablecimientoadmin
CREATE TABLE IF NOT EXISTS `CodigoRestablecimientoAdmin` (
  `id_solicitud` char(36) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `codigo_hash` char(64) NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `expira_en` datetime NOT NULL,
  `intentos` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `consumido_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id_solicitud`),
  KEY `idx_codigo_restablecimiento_admin_activo` (`id_usuario`,`consumido_en`,`expira_en`),
  CONSTRAINT `fk_codigo_restablecimiento_admin_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.codigorestablecimientoadmin: ~0 rows (aproximadamente)

-- Volcando estructura para tabla gestion_monitorias_tutorias.codigoverificacionclave
CREATE TABLE IF NOT EXISTS `CodigoVerificacionClave` (
  `id_codigo` char(36) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `proposito` enum('bloqueo','cuenta') NOT NULL,
  `codigo_hash` char(64) NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `expira_en` timestamp NOT NULL,
  `intentos` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `verificado_en` timestamp NULL DEFAULT NULL,
  `consumido_en` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_codigo`),
  KEY `idx_codigo_verificacion_usuario` (`id_usuario`,`proposito`,`creado_en`),
  CONSTRAINT `fk_codigo_verificacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.codigoverificacionclave: ~0 rows (aproximadamente)

-- Volcando estructura para tabla gestion_monitorias_tutorias.compromiso
CREATE TABLE IF NOT EXISTS `Compromiso` (
  `id_compromiso` int(11) NOT NULL AUTO_INCREMENT,
  `id_seguimiento` int(11) NOT NULL,
  `descripcion` varchar(500) NOT NULL,
  `fecha_compromiso` date NOT NULL,
  `fecha_cumplimiento` date DEFAULT NULL,
  `estado` enum('Pendiente','Cumplido','Incumplido') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`id_compromiso`),
  KEY `idx_compromiso_seguimiento` (`id_seguimiento`),
  CONSTRAINT `fk_compromiso_seguimiento` FOREIGN KEY (`id_seguimiento`) REFERENCES `Seguimiento` (`id_seguimiento`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.compromiso: ~2 rows (aproximadamente)
REPLACE INTO `Compromiso` (`id_compromiso`, `id_seguimiento`, `descripcion`, `fecha_compromiso`, `fecha_cumplimiento`, `estado`) VALUES
	(1, 1, 'Resolver diez consultas SQL y adjuntar evidencias', '2026-08-10', NULL, 'Pendiente'),
	(2, 1, 'Revisar ejercicios de normalización', '2026-08-12', '2026-08-12', 'Cumplido');

-- Volcando estructura para tabla gestion_monitorias_tutorias.configuracion
CREATE TABLE IF NOT EXISTS `Configuracion` (
  `id_configuracion` int(11) NOT NULL AUTO_INCREMENT,
  `clave` varchar(120) NOT NULL,
  `valor` text NOT NULL,
  `tipo` varchar(30) NOT NULL DEFAULT 'string',
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_configuracion`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.configuracion: ~4 rows (aproximadamente)
REPLACE INTO `Configuracion` (`id_configuracion`, `clave`, `valor`, `tipo`, `descripcion`, `fecha_actualizacion`) VALUES
	(1, 'institucion_nombre', 'Universidad Internacional del Trópico Americano', 'string', 'Nombre institucional visible en la interfaz', '2026-08-05 17:07:12'),
	(2, 'periodo_activo', '2026-1', 'string', 'Periodo académico visible por defecto', '2026-08-05 17:07:12'),
	(3, 'soporte_correo', 'soporte@unitropico.edu.co', 'string', 'Correo de soporte institucional', '2026-08-05 17:07:12'),
	(4, 'tema_ui', 'azul', 'string', 'Tema visual principal', '2026-08-05 17:07:12');

-- Volcando estructura para tabla gestion_monitorias_tutorias.controlacceso
CREATE TABLE IF NOT EXISTS `ControlAcceso` (
  `id_usuario` int(11) NOT NULL,
  `intentos_fallidos` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `bloqueada_hasta` datetime DEFAULT NULL,
  `tipo_bloqueo` enum('espera','suspension24h') DEFAULT NULL,
  `cambio_clave_solicitado_en` datetime DEFAULT NULL,
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_usuario`),
  KEY `idx_control_acceso_bloqueo` (`tipo_bloqueo`,`bloqueada_hasta`),
  CONSTRAINT `fk_control_acceso_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.controlacceso: ~2 rows (aproximadamente)
REPLACE INTO `ControlAcceso` (`id_usuario`, `intentos_fallidos`, `bloqueada_hasta`, `tipo_bloqueo`, `cambio_clave_solicitado_en`, `actualizado_en`) VALUES
	(1, 0, NULL, NULL, NULL, '2026-11-11 19:20:40'),
	(2, 0, NULL, NULL, NULL, '2026-11-11 19:20:12'),
	(5, 0, NULL, NULL, NULL, '2026-11-24 17:41:02');

-- Volcando estructura para tabla gestion_monitorias_tutorias.credencial
CREATE TABLE IF NOT EXISTS `Credencial` (
  `id_credencial` int(11) NOT NULL AUTO_INCREMENT,
  `usuario` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `ultimo_acceso` datetime DEFAULT NULL,
  `primer_inicio` tinyint(1) NOT NULL DEFAULT 1,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  `id_usuario` int(11) NOT NULL,
  PRIMARY KEY (`id_credencial`),
  UNIQUE KEY `usuario` (`usuario`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  KEY `idx_credencial_usuario` (`usuario`),
  CONSTRAINT `fk_credencial_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.credencial: ~11 rows (aproximadamente)
REPLACE INTO `Credencial` (`id_credencial`, `usuario`, `password_hash`, `ultimo_acceso`, `primer_inicio`, `estado`, `id_usuario`) VALUES
	(1, 'jaysonquintero@unitropico.edu.co', '$2b$12$Av/BMJEULI6r78xtt9k/suGI2/m/1B9WzsJ3FY8fqePAUZjZmiXG.', '2026-11-24 17:39:46', 0, 'Activo', 1),
	(2, 'brayhamlindarte.es@unitropico.edu.co', '$2b$12$TrA//4A1GpQuiQXHv.a.Xuxh5lkewHzGmzZl0vw9mjag9CHyRrfu.', '2026-11-11 19:20:12', 0, 'Activo', 2),
	(3, 'karengaitan.es@unitropico.edu.co', '$2b$12$189aouaRvkO17stvxuhMsO2Sy2RGUBCaxpl/nR4c4iDZz3fEqpHnK', NULL, 0, 'Activo', 3),
	(4, 'shirleytumay.es@unitropico.edu.co', '1007418844', NULL, 1, 'Activo', 4),
	(5, 'tutormatematica@unitropico.edu.co', '$2b$12$MyZE7eI26ortcfEroie8Fe0E5SqRRig7rb.TdRszFCUfAUqq0O2KC', '2026-11-24 17:48:29', 0, 'Activo', 5),
	(6, 'mariaamezquita.es@unitropico.edu.co', '$2b$12$XxK7RhJEjQBHKsYxBScO.OMao68hXtTJpM.gYO8jjkInmIsYFDrrq', NULL, 1, 'Activo', 6),
	(7, 'sofiacardenas.es@unitropico.edu.co', '1029660011', NULL, 1, 'Activo', 7),
	(8, 'mariamontanez.es@unitropico.edu.co', '1028944310', NULL, 1, 'Activo', 8),
	(9, 'admin@unitropico.edu.co', '$2b$12$vf7efUhO76/vYu9yZG47t.ZHYtfrcwps93HXAaVRjTEU1F6lmX4se', NULL, 1, 'Activo', 9),
	(31, 'analopez.es@unitropico.edu.co', '$2b$12$QfKeEgggIYwN1DxMFd0j/.9EYi.5ZSAYwWQrSnUMAqGJx046uimYu', NULL, 1, 'Activo', 13),
	(32, 'juannino.es@unitropico.edu.co', '$2b$12$6smtmlSlKdX1OT23QvokAO/z9LjjpguO5o8CnnlkLYKI1RCv72qpO', NULL, 1, 'Activo', 14),
	(36, 'juancardenas.es@unitropico.edu.co', '$2b$12$0y.K1141ZgEHslBXMKZeK.cCKCW3hqTnsfDdAdaxWeJENXKy.KcDC', NULL, 1, 'Activo', 18),
	(37, 'juanfonseca@unitropico.edu.co', '$2b$12$Zhf1RohBe.jIzP5xS/8JWu8xVFfmKIlXOh9/eu94RV9/9HiOqZ40m', NULL, 1, 'Activo', 20);

-- Volcando estructura para tabla gestion_monitorias_tutorias.disponibilidad
CREATE TABLE IF NOT EXISTS `Disponibilidad` (
  `id_disponibilidad` int(11) NOT NULL AUTO_INCREMENT,
  `id_asignacion` int(11) NOT NULL,
  `dia_semana` enum('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado') NOT NULL,
  `hora_inicio` time NOT NULL CHECK (`hora_inicio` < `hora_fin`),
  `hora_fin` time NOT NULL CHECK (`hora_fin` > `hora_inicio`),
  `modalidad` enum('Presencial','Virtual') NOT NULL DEFAULT 'Presencial',
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_disponibilidad`),
  KEY `idx_disponibilidad_asignacion` (`id_asignacion`),
  KEY `idx_disponibilidad_dia` (`dia_semana`),
  CONSTRAINT `fk_disponibilidad_asignacion` FOREIGN KEY (`id_asignacion`) REFERENCES `AsignacionAcademica` (`id_asignacion`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.disponibilidad: ~18 rows (aproximadamente)
REPLACE INTO `Disponibilidad` (`id_disponibilidad`, `id_asignacion`, `dia_semana`, `hora_inicio`, `hora_fin`, `modalidad`, `estado`) VALUES
	(1, 4, 'Lunes', '08:00:00', '10:00:00', 'Presencial', 'Inactivo'),
	(2, 4, 'Miércoles', '10:00:00', '12:00:00', 'Presencial', 'Inactivo'),
	(3, 4, 'Viernes', '14:00:00', '16:00:00', 'Virtual', 'Inactivo'),
	(4, 5, 'Martes', '09:00:00', '11:00:00', 'Presencial', 'Inactivo'),
	(5, 5, 'Jueves', '15:00:00', '17:00:00', 'Presencial', 'Inactivo'),
	(6, 6, 'Sábado', '08:00:00', '10:00:00', 'Virtual', 'Activo'),
	(9, 5, 'Lunes', '08:00:00', '10:00:00', 'Presencial', 'Inactivo'),
	(10, 5, 'Miércoles', '10:00:00', '12:00:00', 'Presencial', 'Inactivo'),
	(11, 5, 'Viernes', '14:00:00', '16:00:00', 'Virtual', 'Inactivo'),
	(12, 4, 'Martes', '09:00:00', '11:00:00', 'Presencial', 'Inactivo'),
	(13, 4, 'Jueves', '15:00:00', '17:00:00', 'Presencial', 'Inactivo'),
	(14, 10, 'Lunes', '08:00:00', '10:00:00', 'Presencial', 'Inactivo'),
	(15, 10, 'Miércoles', '10:00:00', '12:00:00', 'Presencial', 'Inactivo'),
	(16, 10, 'Viernes', '14:00:00', '16:00:00', 'Virtual', 'Inactivo'),
	(17, 10, 'Martes', '09:00:00', '11:00:00', 'Presencial', 'Inactivo'),
	(18, 10, 'Jueves', '15:00:00', '17:00:00', 'Presencial', 'Inactivo'),
	(19, 10, 'Lunes', '15:00:00', '18:00:00', 'Presencial', 'Activo'),
	(20, 10, 'Martes', '15:00:00', '18:00:00', 'Presencial', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.entregaactividad
CREATE TABLE IF NOT EXISTS `EntregaActividad` (
  `id_entrega` int(11) NOT NULL AUTO_INCREMENT,
  `id_compromiso` int(11) NOT NULL,
  `id_estudiante` int(11) NOT NULL,
  `comentario_estudiante` varchar(1000) DEFAULT NULL,
  `ruta_archivo` varchar(255) DEFAULT NULL,
  `fecha_entrega` datetime NOT NULL DEFAULT current_timestamp(),
  `retroalimentacion` varchar(1000) DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `revisado_por` int(11) DEFAULT NULL,
  `estado` enum('Entregada','Observada','Revisada') NOT NULL DEFAULT 'Entregada',
  PRIMARY KEY (`id_entrega`),
  UNIQUE KEY `uq_entrega_compromiso_estudiante` (`id_compromiso`,`id_estudiante`),
  KEY `fk_entrega_estudiante` (`id_estudiante`),
  KEY `fk_entrega_revisor` (`revisado_por`),
  CONSTRAINT `fk_entrega_compromiso` FOREIGN KEY (`id_compromiso`) REFERENCES `Compromiso` (`id_compromiso`) ON UPDATE CASCADE,
  CONSTRAINT `fk_entrega_estudiante` FOREIGN KEY (`id_estudiante`) REFERENCES `Estudiante` (`id_estudiante`) ON UPDATE CASCADE,
  CONSTRAINT `fk_entrega_revisor` FOREIGN KEY (`revisado_por`) REFERENCES `Usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.entregaactividad: ~1 rows (aproximadamente)
REPLACE INTO `EntregaActividad` (`id_entrega`, `id_compromiso`, `id_estudiante`, `comentario_estudiante`, `ruta_archivo`, `fecha_entrega`, `retroalimentacion`, `fecha_revision`, `revisado_por`, `estado`) VALUES
	(1, 1, 1, 'Adjunto el taller resuelto y mis consultas', 'assets/evidencias/estudiante/entregas/taller_sql.pdf', '2026-08-10 18:15:00', 'Buen trabajo, solo ajusta el uso de alias en una consulta', '2026-08-11 08:30:00', 2, 'Revisada');

-- Volcando estructura para tabla gestion_monitorias_tutorias.espacio
CREATE TABLE IF NOT EXISTS `Espacio` (
  `id_espacio` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `edificio` varchar(80) DEFAULT NULL,
  `bloque` varchar(20) DEFAULT NULL,
  `salon` varchar(20) DEFAULT NULL,
  `piso` varchar(10) DEFAULT NULL,
  `ubicacion` varchar(200) DEFAULT NULL,
  `descripcion` varchar(300) DEFAULT NULL,
  `recursos` varchar(500) DEFAULT NULL,
  `observaciones` varchar(300) DEFAULT NULL,
  `capacidad` int(11) NOT NULL CHECK (`capacidad` > 0),
  `tipo` enum('Aula','Laboratorio','Sala','Sala de informática','Biblioteca','Salón de reuniones','Otro','Virtual') DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_espacio`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `idx_espacio_estado` (`estado`),
  KEY `idx_espacio_ubicacion` (`edificio`,`bloque`,`salon`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.espacio: ~20 rows (aproximadamente)
REPLACE INTO `Espacio` (`id_espacio`, `codigo`, `nombre`, `edificio`, `bloque`, `salon`, `piso`, `ubicacion`, `descripcion`, `recursos`, `observaciones`, `capacidad`, `tipo`, `estado`) VALUES
	(1, '107C', 'Salón 107C', 'Bloque C', 'C', '107C', '1', 'Bloque C, salón 107C', 'Aula presencial', 'Video beam, tablero', NULL, 30, 'Aula', 'Activo'),
	(2, '108C', 'Salón 108C', 'Bloque C', 'C', '108C', '1', 'Bloque C, salón 108C', 'Aula presencial', 'Video beam, tablero', NULL, 30, 'Aula', 'Activo'),
	(3, '107A', 'Salón 107A', 'Bloque A', 'A', '107A', '1', 'Bloque A, salón 107A', 'Aula presencial', 'Video beam, tablero', NULL, 28, 'Aula', 'Activo'),
	(4, '202A', 'Salón 202A', 'Bloque A', 'A', '202A', '2', 'Bloque A, salón 202A', 'Aula presencial', 'Video beam, tablero', NULL, 35, 'Aula', 'Activo'),
	(5, '110A', 'Salón 110A', 'Bloque A', 'A', '110A', '1', 'Bloque A, salón 110A', 'Aula presencial', 'Video beam, tablero', NULL, 32, 'Aula', 'Activo'),
	(6, '115A', 'Salón 115A', 'Bloque A', 'A', '115A', '1', 'Bloque A, salón 115A', 'Aula presencial', 'Video beam, tablero', NULL, 32, 'Aula', 'Activo'),
	(7, '102A', 'Salón 102A', 'Bloque A', 'A', '102A', '1', 'Bloque A, salón 102A', 'Aula presencial', 'Video beam, tablero', NULL, 28, 'Aula', 'Activo'),
	(8, '206A', 'Salón 206A', 'Bloque A', 'A', '206A', '2', 'Bloque A, salón 206A', 'Aula presencial', 'Video beam, tablero', NULL, 28, 'Aula', 'Activo'),
	(9, 'BIB01', 'Biblioteca', 'Biblioteca', 'B', 'Biblioteca', '1', 'Biblioteca · Bloque B · Salón Biblioteca · Piso 1', 'Espacio de estudio', 'Mesas, libros, wifi', '', 40, 'Biblioteca', 'Activo'),
	(10, '103D', 'Salón 103D', 'Bloque D', 'D', '103D', '1', 'Bloque D, salón 103D', 'Aula presencial', 'Video beam, tablero', NULL, 26, 'Aula', 'Activo'),
	(11, '108A', 'Salón 108A', 'Bloque A', 'A', '108A', '1', 'Bloque A, salón 108A', 'Aula presencial', 'Video beam, tablero', NULL, 30, 'Aula', 'Activo'),
	(12, '102D', 'Salón 102D', 'Bloque D', 'D', '102D', '1', 'Bloque D, salón 102D', 'Aula presencial', 'Video beam, tablero', NULL, 26, 'Aula', 'Activo'),
	(13, '101A', 'Salón 101A', 'Bloque A', 'A', '101A', '1', 'Bloque A, salón 101A', 'Aula para tutorías', 'Tablero, escritorio', NULL, 20, 'Aula', 'Activo'),
	(14, '202B', 'Salón 202B', 'Bloque B', 'B', '202B', '2', 'Bloque B, salón 202B', 'Aula para tutorías', 'Tablero, proyector', NULL, 22, 'Aula', 'Activo'),
	(15, '108B', 'Salón 108B', 'Bloque B', 'B', '108B', '1', 'Bloque B, salón 108B', 'Aula para tutorías', 'Tablero, proyector', NULL, 24, 'Aula', 'Activo'),
	(16, '207A', 'Salón 207A', 'Bloque A', 'A', '207A', '2', 'Bloque A, salón 207A', 'Aula presencial', 'Video beam, tablero', NULL, 32, 'Aula', 'Activo'),
	(17, '204A', 'Salón 204A', 'Bloque A', 'A', '204A', '2', 'Bloque A, salón 204A', 'Aula presencial', 'Video beam, tablero', NULL, 32, 'Aula', 'Activo'),
	(18, '114A', 'Salón 114A', 'Bloque A', 'A', '114A', '1', 'Bloque A, salón 114A', 'Aula presencial', 'Video beam, tablero', NULL, 30, 'Aula', 'Activo'),
	(19, '104C', 'Salón 104C', 'Bloque C', 'C', '104C', '1', 'Bloque C, salón 104C', 'Aula presencial', 'Video beam, tablero', NULL, 30, 'Aula', 'Activo'),
	(21, 'LAB-755', 'Laboratorio de Energías', 'Edificio B', 'B', 'Laboratorio Energías', '1', 'Edificio B · Bloque B · Salón Laboratorio Energías · Piso 1', '', '', '', 15, 'Laboratorio', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.estudiante
CREATE TABLE IF NOT EXISTS `Estudiante` (
  `id_estudiante` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `codigo_estudiantil` varchar(30) NOT NULL,
  `semestre` tinyint(4) NOT NULL CHECK (`semestre` >= 1),
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_estudiante`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  UNIQUE KEY `codigo_estudiantil` (`codigo_estudiantil`),
  CONSTRAINT `fk_estudiante_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.estudiante: ~10 rows (aproximadamente)
REPLACE INTO `Estudiante` (`id_estudiante`, `id_usuario`, `codigo_estudiantil`, `semestre`, `estado`) VALUES
	(1, 6, 'EST001', 4, 'Activo'),
	(2, 7, '20262002', 5, 'Activo'),
	(3, 8, '20262003', 6, 'Activo'),
	(4, 2, 'MON001', 4, 'Activo'),
	(5, 3, 'MON002', 4, 'Activo'),
	(6, 4, 'MON003', 4, 'Activo'),
	(14, 13, 'EST206', 3, 'Activo'),
	(15, 14, 'EST725', 2, 'Activo'),
	(28, 18, 'EST601', 10, 'Activo'),
	(31, 20, 'EST425', 1, 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.estudianteprograma
CREATE TABLE IF NOT EXISTS `EstudiantePrograma` (
  `id_estudiante_programa` int(11) NOT NULL AUTO_INCREMENT,
  `id_estudiante` int(11) NOT NULL,
  `id_programa` int(11) NOT NULL,
  `principal` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_ingreso` date DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_estudiante_programa`),
  UNIQUE KEY `uq_estudiante_programa` (`id_estudiante`,`id_programa`),
  KEY `fk_estudiante_programa_programa` (`id_programa`),
  KEY `idx_estudiante_programa` (`id_estudiante`),
  CONSTRAINT `fk_estudiante_programa_estudiante` FOREIGN KEY (`id_estudiante`) REFERENCES `Estudiante` (`id_estudiante`) ON UPDATE CASCADE,
  CONSTRAINT `fk_estudiante_programa_programa` FOREIGN KEY (`id_programa`) REFERENCES `Programa` (`id_programa`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.estudianteprograma: ~10 rows (aproximadamente)
REPLACE INTO `EstudiantePrograma` (`id_estudiante_programa`, `id_estudiante`, `id_programa`, `principal`, `fecha_ingreso`, `estado`) VALUES
	(1, 1, 1, 1, '2026-01-15', 'Activo'),
	(2, 2, 2, 1, '2026-01-15', 'Activo'),
	(3, 3, 1, 1, '2026-01-15', 'Activo'),
	(11, 4, 1, 1, '2026-01-15', 'Activo'),
	(12, 5, 1, 1, '2026-01-15', 'Activo'),
	(13, 6, 1, 1, '2026-01-15', 'Activo'),
	(17, 14, 2, 1, '2026-10-13', 'Activo'),
	(18, 15, 1, 1, '2026-10-14', 'Activo'),
	(31, 28, 1, 1, '2026-10-29', 'Activo'),
	(34, 31, 2, 1, '2026-10-29', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.evidencia
CREATE TABLE IF NOT EXISTS `Evidencia` (
  `id_evidencia` int(11) NOT NULL AUTO_INCREMENT,
  `id_seguimiento` int(11) NOT NULL,
  `nombre_archivo` varchar(150) NOT NULL,
  `tipo_archivo` varchar(50) DEFAULT NULL,
  `ruta_archivo` varchar(255) DEFAULT NULL,
  `tamano_archivo` bigint(20) DEFAULT NULL,
  `extension` varchar(10) DEFAULT NULL,
  `descripcion` varchar(300) DEFAULT NULL,
  `fecha_carga` datetime NOT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_evidencia`),
  KEY `idx_evidencia_seguimiento` (`id_seguimiento`),
  CONSTRAINT `fk_evidencia_seguimiento` FOREIGN KEY (`id_seguimiento`) REFERENCES `Seguimiento` (`id_seguimiento`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.evidencia: ~0 rows (aproximadamente)
REPLACE INTO `Evidencia` (`id_evidencia`, `id_seguimiento`, `nombre_archivo`, `tipo_archivo`, `ruta_archivo`, `tamano_archivo`, `extension`, `descripcion`, `fecha_carga`, `estado`) VALUES
	(1, 1, 'taller_sql.pdf', 'application/pdf', 'assets/evidencias/estudiante/entregas/taller_sql.pdf', 245760, 'pdf', 'Soporte de la entrega de actividades', '2026-08-10 18:15:00', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.facultad
CREATE TABLE IF NOT EXISTS `Facultad` (
  `id_facultad` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) NOT NULL,
  `descripcion` varchar(250) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_facultad`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.facultad: ~6 rows (aproximadamente)
REPLACE INTO `Facultad` (`id_facultad`, `nombre`, `descripcion`, `estado`) VALUES
	(1, 'Ingenierías', 'Facultad para programas de ingeniería y tecnología', 'Activo'),
	(3, 'Ciencias', NULL, 'Activo'),
	(4, 'Artes', NULL, 'Activo'),
	(5, 'Ciencias Económicas y Administrativas', NULL, 'Activo'),
	(6, 'Derecho y Ciencias Políticas', NULL, 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.historialinforme
CREATE TABLE IF NOT EXISTS `HistorialInforme` (
  `id_historial_informe` int(11) NOT NULL AUTO_INCREMENT,
  `id_informe` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `accion` enum('Creado','Enviado','Devuelto','Aprobado','Entregado','Actualizado') NOT NULL,
  `observacion` varchar(2000) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_historial_informe`),
  KEY `fk_historial_informe` (`id_informe`),
  KEY `fk_historial_informe_usuario` (`id_usuario`),
  CONSTRAINT `fk_historial_informe` FOREIGN KEY (`id_informe`) REFERENCES `Informe` (`id_informe`) ON UPDATE CASCADE,
  CONSTRAINT `fk_historial_informe_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.historialinforme: ~0 rows (aproximadamente)
REPLACE INTO `HistorialInforme` (`id_historial_informe`, `id_informe`, `id_usuario`, `accion`, `observacion`, `fecha`) VALUES
	(1, 2, 5, 'Actualizado', 'Reporte de tutoría guardado como borrador.', '2026-11-24 17:43:53');

-- Volcando estructura para tabla gestion_monitorias_tutorias.historialsesion
CREATE TABLE IF NOT EXISTS `HistorialSesion` (
  `id_historial` int(11) NOT NULL AUTO_INCREMENT,
  `id_sesion` int(11) NOT NULL,
  `actividades_desarrolladas` varchar(500) DEFAULT NULL,
  `observaciones` varchar(500) DEFAULT NULL,
  `recomendaciones` varchar(500) DEFAULT NULL,
  `progreso_academico` varchar(500) DEFAULT NULL,
  `registrado_por` int(11) DEFAULT NULL,
  `fecha_registro` datetime NOT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_historial`),
  KEY `idx_historial_sesion` (`id_sesion`),
  CONSTRAINT `fk_historial_sesion` FOREIGN KEY (`id_sesion`) REFERENCES `Sesion` (`id_sesion`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.historialsesion: ~2 rows (aproximadamente)
REPLACE INTO `HistorialSesion` (`id_historial`, `id_sesion`, `actividades_desarrolladas`, `observaciones`, `recomendaciones`, `progreso_academico`, `registrado_por`, `fecha_registro`, `estado`) VALUES
	(1, 1, 'Explicación de consultas SQL y práctica guiada', 'Buena participación del estudiante', 'Practicar filtros y joins antes de la próxima sesión', 'Avance satisfactorio en consultas básicas', 2, '2026-08-06 10:20:00', 'Activo'),
	(2, 3, 'Resolución de ejercicios de contabilidad general', 'La estudiante comprendió los conceptos base', 'Repasar balance general y estados financieros', 'Progreso aceptable con refuerzo conceptual', 5, '2026-08-08 15:40:00', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.horariomonitor
CREATE TABLE IF NOT EXISTS `HorarioMonitor` (
  `id_horario_monitor` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_periodo` int(11) NOT NULL,
  `dia_semana` enum('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo') NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `duracion_minutos` int(11) NOT NULL,
  `modalidad` enum('Presencial','Virtual','Híbrida') NOT NULL DEFAULT 'Presencial',
  `id_espacio` int(11) DEFAULT NULL,
  `observaciones` varchar(300) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_horario_monitor`),
  KEY `fk_horario_monitor_usuario` (`id_usuario`),
  KEY `fk_horario_monitor_periodo` (`id_periodo`),
  KEY `fk_horario_monitor_espacio` (`id_espacio`),
  CONSTRAINT `fk_horario_monitor_espacio` FOREIGN KEY (`id_espacio`) REFERENCES `Espacio` (`id_espacio`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_horario_monitor_periodo` FOREIGN KEY (`id_periodo`) REFERENCES `PeriodoAcademico` (`id_periodo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_horario_monitor_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.horariomonitor: ~20 rows (aproximadamente)
REPLACE INTO `HorarioMonitor` (`id_horario_monitor`, `id_usuario`, `id_periodo`, `dia_semana`, `hora_inicio`, `hora_fin`, `duracion_minutos`, `modalidad`, `id_espacio`, `observaciones`, `estado`, `fecha_actualizacion`) VALUES
	(58, 2, 1, 'Lunes', '14:00:00', '16:00:00', 120, 'Presencial', 16, 'Horario del monitor Brayham - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(59, 2, 1, 'Martes', '11:00:00', '13:00:00', 120, 'Presencial', 17, 'Horario del monitor Brayham - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(60, 2, 1, 'Jueves', '09:00:00', '10:00:00', 60, 'Presencial', 6, 'Horario del monitor Brayham - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(61, 2, 1, 'Jueves', '17:00:00', '18:00:00', 60, 'Presencial', 18, 'Horario del monitor Brayham - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(62, 2, 1, 'Viernes', '07:00:00', '08:00:00', 60, 'Presencial', 11, 'Horario del monitor Brayham - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(63, 2, 1, 'Viernes', '13:00:00', '14:00:00', 60, 'Presencial', 19, 'Horario del monitor Brayham - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(64, 3, 1, 'Lunes', '13:00:00', '15:00:00', 120, 'Presencial', 1, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(65, 3, 1, 'Miércoles', '08:00:00', '09:00:00', 60, 'Presencial', 2, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(66, 3, 1, 'Miércoles', '17:00:00', '18:00:00', 60, 'Presencial', 3, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(67, 3, 1, 'Martes', '09:00:00', '10:00:00', 60, 'Presencial', 4, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(68, 3, 1, 'Jueves', '10:00:00', '11:00:00', 60, 'Presencial', 5, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(69, 3, 1, 'Sábado', '10:00:00', '11:00:00', 60, 'Presencial', 6, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(70, 3, 1, 'Sábado', '17:00:00', '18:00:00', 60, 'Presencial', 4, 'Horario de la monitora Karen - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(71, 4, 1, 'Lunes', '10:00:00', '11:00:00', 60, 'Presencial', 4, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(72, 4, 1, 'Lunes', '12:00:00', '13:00:00', 60, 'Presencial', 7, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(73, 4, 1, 'Viernes', '17:00:00', '18:00:00', 60, 'Presencial', 8, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(74, 4, 1, 'Martes', '06:00:00', '07:00:00', 60, 'Presencial', 9, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(75, 4, 1, 'Martes', '07:00:00', '08:00:00', 60, 'Presencial', 10, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(76, 4, 1, 'Martes', '17:00:00', '18:00:00', 60, 'Presencial', 11, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29'),
	(77, 4, 1, 'Sábado', '14:00:00', '16:00:00', 120, 'Presencial', 12, 'Horario de la monitora Shirley - Matemáticas básicas', 'Activo', '2026-08-06 00:28:29');

-- Volcando estructura para tabla gestion_monitorias_tutorias.informe
CREATE TABLE IF NOT EXISTS `Informe` (
  `id_informe` int(11) NOT NULL AUTO_INCREMENT,
  `id_sesion` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `contenido` varchar(5000) DEFAULT NULL,
  `actividades_desarrolladas` varchar(2000) DEFAULT NULL,
  `logros` varchar(1000) DEFAULT NULL,
  `dificultades` varchar(1000) DEFAULT NULL,
  `recomendaciones` varchar(1000) DEFAULT NULL,
  `fecha_envio` datetime DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `revisado_por` int(11) DEFAULT NULL,
  `observaciones_revision` varchar(2000) DEFAULT NULL,
  `estado` enum('Borrador','Enviado','Devuelto','Aprobado','Entregado') NOT NULL DEFAULT 'Borrador',
  PRIMARY KEY (`id_informe`),
  UNIQUE KEY `id_sesion` (`id_sesion`),
  KEY `fk_informe_autor` (`id_usuario`),
  KEY `fk_informe_revisor` (`revisado_por`),
  CONSTRAINT `fk_informe_autor` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `fk_informe_revisor` FOREIGN KEY (`revisado_por`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `fk_informe_sesion` FOREIGN KEY (`id_sesion`) REFERENCES `Sesion` (`id_sesion`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.informe: ~1 rows (aproximadamente)
REPLACE INTO `Informe` (`id_informe`, `id_sesion`, `id_usuario`, `titulo`, `contenido`, `actividades_desarrolladas`, `logros`, `dificultades`, `recomendaciones`, `fecha_envio`, `fecha_revision`, `revisado_por`, `observaciones_revision`, `estado`) VALUES
	(1, 3, 5, 'Informe de tutoría - Contabilidad General', 'Resumen de la tutoría realizada con ejercicios prácticos y retroalimentación puntual.', 'Repaso de conceptos base y resolución de ejercicios guiados', 'Comprensión inicial de los estados financieros', 'Dificultad en la interpretación de cuentas puente', 'Repasar ejemplos y consultar el material de clase', '2026-08-08 16:00:00', '2026-08-09 08:00:00', 1, 'Informe aprobado sin observaciones adicionales', 'Aprobado'),
	(2, 8, 5, 'Tutoría de Matemáticas básicas · 2026-11-09', '{"date":"2026-11-09","startTime":"15:00","endTime":"18:00","place":"Salon 101A","description":"Se realizaron soluciones de un taller asignado","attendanceCount":1,"satCount":0,"attendees":[5],"satDetails":[],"recovered":false}', '', '', '', '', NULL, NULL, NULL, NULL, 'Borrador');

-- Volcando estructura para tabla gestion_monitorias_tutorias.informemensualtutor
CREATE TABLE IF NOT EXISTS `InformeMensualTutor` (
  `id_informe_mensual` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `periodo_mes` char(7) NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `contenido` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`contenido`)),
  `estado` enum('Borrador','Enviado') NOT NULL DEFAULT 'Borrador',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `enviado_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id_informe_mensual`),
  UNIQUE KEY `uq_informe_mensual_tutor` (`id_usuario`,`periodo_mes`),
  CONSTRAINT `fk_informe_mensual_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.informemensualtutor: ~0 rows (aproximadamente)

-- Volcando estructura para tabla gestion_monitorias_tutorias.informetutordetalle
CREATE TABLE IF NOT EXISTS `InformeTutorDetalle` (
  `id_informe` int(11) NOT NULL,
  `fecha_monitoria` date NOT NULL,
  `hora_inicio_real` time NOT NULL,
  `hora_fin_real` time NOT NULL,
  `lugar` varchar(255) NOT NULL,
  `descripcion` text NOT NULL,
  `cantidad_asistentes` smallint(5) unsigned NOT NULL DEFAULT 0,
  `cantidad_sat` smallint(5) unsigned NOT NULL DEFAULT 0,
  `estudiantes_asistieron` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`estudiantes_asistieron`)),
  `detalle_sat` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`detalle_sat`)),
  `recuperada` tinyint(1) NOT NULL DEFAULT 0,
  `id_recuperacion` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_informe`),
  UNIQUE KEY `id_recuperacion` (`id_recuperacion`),
  CONSTRAINT `fk_informe_tutor_detalle` FOREIGN KEY (`id_informe`) REFERENCES `Informe` (`id_informe`) ON DELETE CASCADE,
  CONSTRAINT `chk_informe_tutor_horas` CHECK (`hora_fin_real` > `hora_inicio_real`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.informetutordetalle: ~0 rows (aproximadamente)
REPLACE INTO `InformeTutorDetalle` (`id_informe`, `fecha_monitoria`, `hora_inicio_real`, `hora_fin_real`, `lugar`, `descripcion`, `cantidad_asistentes`, `cantidad_sat`, `estudiantes_asistieron`, `detalle_sat`, `recuperada`, `id_recuperacion`) VALUES
	(2, '2026-11-09', '15:00:00', '18:00:00', 'Salon 101A', 'Se realizaron soluciones de un taller asignado', 1, 0, '[5]', '[]', 0, NULL);

-- Volcando estructura para tabla gestion_monitorias_tutorias.monitor
CREATE TABLE IF NOT EXISTS `Monitor` (
  `id_monitor` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `tipo_monitor` varchar(80) DEFAULT NULL,
  `resolucion` varchar(80) DEFAULT NULL,
  `periodo_actual` varchar(20) DEFAULT NULL,
  `horas_semanales` tinyint(4) DEFAULT NULL,
  `observaciones` varchar(300) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_monitor`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  KEY `idx_monitor_usuario` (`id_usuario`),
  CONSTRAINT `fk_monitor_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.monitor: ~5 rows (aproximadamente)
REPLACE INTO `Monitor` (`id_monitor`, `id_usuario`, `tipo_monitor`, `resolucion`, `periodo_actual`, `horas_semanales`, `observaciones`, `estado`) VALUES
	(1, 2, 'Monitor académico', 'Resolucion 2026-01', '2026-1', 12, '', 'Activo'),
	(2, 3, 'Monitor académico', 'Resolucion 2026-02', '2026-2', 10, '', 'Activo'),
	(3, 4, 'Monitor académico', 'Resolucion 2026-03', '2026-1', 14, '', 'Activo'),
	(13, 6, 'Monitor académico', 'Resolución 002 - 26', '2026-1', 14, '', 'Inactivo'),
	(15, 9, 'Monitor académico', '', '2026-1', 14, '', 'Inactivo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.notificacion
CREATE TABLE IF NOT EXISTS `Notificacion` (
  `id_notificacion` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `categoria` enum('Solicitud','Sesion','Informe','Sistema') NOT NULL DEFAULT 'Sistema',
  `titulo` varchar(160) NOT NULL,
  `mensaje` varchar(600) NOT NULL,
  `entidad_tipo` varchar(40) DEFAULT NULL,
  `entidad_id` int(11) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `leida` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_notificacion`),
  KEY `idx_notificacion_usuario_fecha` (`id_usuario`,`fecha`),
  KEY `idx_notificacion_usuario_leida` (`id_usuario`,`leida`,`fecha`),
  CONSTRAINT `fk_notificacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.notificacion: ~36 rows (aproximadamente)
REPLACE INTO `Notificacion` (`id_notificacion`, `id_usuario`, `categoria`, `titulo`, `mensaje`, `entidad_tipo`, `entidad_id`, `fecha`, `leida`) VALUES
	(1, 14, 'Solicitud', 'Solicitud de acompañamiento', 'Administración registró una solicitud inicial para ti. Consulta los detalles en Mis solicitudes.', 'solicitud', 10, '2026-11-03 08:44:26', 0),
	(2, 18, 'Solicitud', 'Solicitud de acompañamiento', 'Administración registró una solicitud inicial para ti. Consulta los detalles en Mis solicitudes.', 'solicitud', 11, '2026-11-03 08:46:45', 0),
	(3, 18, 'Solicitud', 'Actualización de solicitud', 'Administración actualizó el estado de tu solicitud a Aprobada.', 'solicitud', 11, '2026-11-03 08:52:17', 0),
	(4, 14, 'Solicitud', 'Actualización de solicitud', 'Administración actualizó el estado de tu solicitud a Aprobada.', 'solicitud', 10, '2026-11-03 08:52:21', 0),
	(5, 14, 'Solicitud', 'Actualización de solicitud', 'Administración actualizó el estado de tu solicitud a Finalizada.', 'solicitud', 9, '2026-11-03 10:22:43', 0),
	(6, 2, 'Solicitud', 'Actualización de solicitud', 'Administración actualizó el estado de tu solicitud a Finalizada.', 'solicitud', 9, '2026-11-03 10:22:43', 1),
	(7, 7, 'Solicitud', 'Actualización de solicitud', 'Administración actualizó el estado de tu solicitud a Finalizada.', 'solicitud', 8, '2026-11-03 10:22:46', 0),
	(8, 2, 'Solicitud', 'Actualización de solicitud', 'Administración actualizó el estado de tu solicitud a Finalizada.', 'solicitud', 8, '2026-11-03 10:22:46', 1),
	(9, 18, 'Solicitud', 'Solicitud de acompañamiento', 'Administración registró una solicitud inicial para ti. Consulta los detalles en Mis solicitudes.', 'solicitud', 12, '2026-11-03 11:43:22', 0),
	(10, 18, 'Solicitud', 'Acompañamiento asignado', 'Tu solicitud tiene una sesión programada. Revisa la fecha y el horario en Mis sesiones.', 'solicitud', 12, '2026-11-03 11:43:22', 0),
	(11, 5, 'Solicitud', 'Acompañamiento asignado', 'Tu solicitud tiene una sesión programada. Revisa la fecha y el horario en Mis sesiones.', 'solicitud', 12, '2026-11-03 11:43:22', 1),
	(12, 18, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 12, '2026-11-03 11:43:53', 0),
	(13, 5, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 12, '2026-11-03 11:43:53', 1),
	(14, 18, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 12, '2026-11-03 11:43:55', 0),
	(15, 5, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 12, '2026-11-03 11:43:55', 1),
	(16, 18, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 12, '2026-11-03 11:43:55', 0),
	(17, 5, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 12, '2026-11-03 11:43:55', 1),
	(18, 18, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 12, '2026-11-03 11:43:55', 0),
	(19, 5, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 12, '2026-11-03 11:43:55', 1),
	(20, 18, 'Solicitud', 'tutoría cancelada por el responsable', 'El tutor canceló la sesión. Justificación: La información enviada no cumple las reglas de validación.', 'solicitud', 12, '2026-11-03 11:44:07', 0),
	(21, 5, 'Solicitud', 'tutoría cancelada por el responsable', 'El tutor canceló la sesión. Justificación: La información enviada no cumple las reglas de validación.', 'solicitud', 12, '2026-11-03 11:44:07', 1),
	(22, 1, 'Solicitud', 'tutoría cancelada por el responsable', 'La solicitud #12 fue cancelada. Justificación: La información enviada no cumple las reglas de validación.', 'solicitud', 12, '2026-11-03 11:44:07', 1),
	(23, 9, 'Solicitud', 'tutoría cancelada por el responsable', 'La solicitud #12 fue cancelada. Justificación: La información enviada no cumple las reglas de validación.', 'solicitud', 12, '2026-11-03 11:44:07', 0),
	(24, 3, 'Solicitud', 'Solicitud de acompañamiento', 'Administración registró una solicitud inicial para ti. Consulta los detalles en Mis solicitudes.', 'solicitud', 13, '2026-11-03 11:47:54', 0),
	(25, 3, 'Solicitud', 'Acompañamiento asignado', 'Tu solicitud tiene una sesión programada. Revisa la fecha y el horario en Mis sesiones.', 'solicitud', 13, '2026-11-03 11:47:54', 0),
	(26, 5, 'Solicitud', 'Acompañamiento asignado', 'Tu solicitud tiene una sesión programada. Revisa la fecha y el horario en Mis sesiones.', 'solicitud', 13, '2026-11-03 11:47:54', 1),
	(27, 3, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 13, '2026-11-03 11:48:13', 0),
	(28, 5, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 13, '2026-11-03 11:48:13', 1),
	(29, 3, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 13, '2026-11-03 11:48:14', 0),
	(30, 5, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 13, '2026-11-03 11:48:14', 1),
	(31, 3, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 13, '2026-11-03 11:48:14', 0),
	(32, 5, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 13, '2026-11-03 11:48:14', 1),
	(33, 3, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 13, '2026-11-03 11:48:14', 0),
	(34, 5, 'Solicitud', 'tutoría confirmada', 'El tutor confirmó la sesión asignada.', 'solicitud', 13, '2026-11-03 11:48:14', 1),
	(35, 3, 'Sesion', 'Acompañamiento marcado como realizado', 'La solicitud fue marcada como atendida por Tutor.', 'solicitud', 13, '2026-11-03 11:50:41', 0),
	(36, 5, 'Sesion', 'Acompañamiento marcado como realizado', 'La solicitud fue marcada como atendida por Tutor.', 'solicitud', 13, '2026-11-03 11:50:41', 1);

-- Volcando estructura para tabla gestion_monitorias_tutorias.periodoacademico
CREATE TABLE IF NOT EXISTS `PeriodoAcademico` (
  `id_periodo` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) NOT NULL,
  `fecha_inicio` date NOT NULL CHECK (`fecha_inicio` < `fecha_fin`),
  `fecha_fin` date NOT NULL,
  `estado` enum('Planeado','Activo','Finalizado') NOT NULL DEFAULT 'Planeado',
  PRIMARY KEY (`id_periodo`),
  UNIQUE KEY `nombre` (`nombre`),
  KEY `idx_periodo_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.periodoacademico: ~3 rows (aproximadamente)
REPLACE INTO `PeriodoAcademico` (`id_periodo`, `nombre`, `fecha_inicio`, `fecha_fin`, `estado`) VALUES
	(1, '2026-1', '2026-08-31', '2026-12-19', 'Activo'),
	(2, '2025-2', '2025-08-01', '2025-12-15', 'Finalizado'),
	(3, '2026-2', '2026-08-31', '2026-12-19', 'Planeado');

-- Volcando estructura para tabla gestion_monitorias_tutorias.programa
CREATE TABLE IF NOT EXISTS `Programa` (
  `id_programa` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `registro_snies` varchar(30) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  `id_facultad` int(11) NOT NULL,
  PRIMARY KEY (`id_programa`),
  UNIQUE KEY `codigo` (`codigo`),
  UNIQUE KEY `nombre` (`nombre`),
  KEY `idx_programa_facultad` (`id_facultad`),
  CONSTRAINT `fk_programa_facultad` FOREIGN KEY (`id_facultad`) REFERENCES `Facultad` (`id_facultad`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.programa: ~14 rows (aproximadamente)
REPLACE INTO `Programa` (`id_programa`, `codigo`, `nombre`, `registro_snies`, `estado`, `id_facultad`) VALUES
	(1, 'ING-SIS', 'Ingeniería de Sistemas', '117425', 'Activo', 1),
	(2, 'CON', 'Contaduría Pública', '52569', 'Activo', 5),
	(5, 'MVZ', 'Medicina Veterinaria y Zootecnia', '105237', 'Activo', 3),
	(6, 'BIO', 'Biología', '116113', 'Activo', 3),
	(7, 'ING-AGROIND', 'Ingeniería Agroindustrial', '105573', 'Activo', 1),
	(8, 'ING-ENER', 'Ingeniería en Energías', '116653', 'Activo', 1),
	(9, 'ING-AGROFO', 'Ingeniería Agroforestal', '105589', 'Activo', 1),
	(10, 'ING-CIVIL', 'Ingeniería Civil', '52549', 'Activo', 1),
	(11, 'ING-IA', 'Ingeniería en Inteligencia Artificial', '119288', 'Activo', 1),
	(12, 'ARQ', 'Arquitectura', '52551', 'Activo', 4),
	(13, 'FNI', 'Finanzas y Negocios Internacionales', '117175', 'Activo', 5),
	(14, 'ECO', 'Economía', '116128', 'Activo', 5),
	(15, 'ADM', 'Administración de Empresas', '116114', 'Activo', 5),
	(16, 'DER', 'Derecho', '53331', 'Activo', 6);

-- Volcando estructura para tabla gestion_monitorias_tutorias.programaasignatura
CREATE TABLE IF NOT EXISTS `ProgramaAsignatura` (
  `id_programa_asignatura` int(11) NOT NULL AUTO_INCREMENT,
  `id_programa` int(11) NOT NULL,
  `id_asignatura` int(11) NOT NULL,
  `semestre` tinyint(4) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_programa_asignatura`),
  UNIQUE KEY `uq_programa_asignatura` (`id_programa`,`id_asignatura`),
  KEY `idx_programa_asignatura_programa` (`id_programa`),
  KEY `idx_programa_asignatura_asignatura` (`id_asignatura`),
  CONSTRAINT `fk_programa_asignatura_asignatura` FOREIGN KEY (`id_asignatura`) REFERENCES `Asignatura` (`id_asignatura`) ON UPDATE CASCADE,
  CONSTRAINT `fk_programa_asignatura_programa` FOREIGN KEY (`id_programa`) REFERENCES `Programa` (`id_programa`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.programaasignatura: ~6 rows (aproximadamente)
REPLACE INTO `ProgramaAsignatura` (`id_programa_asignatura`, `id_programa`, `id_asignatura`, `semestre`, `estado`) VALUES
	(1, 1, 1, 1, 'Activo'),
	(2, 1, 2, 2, 'Activo'),
	(3, 1, 3, 2, 'Activo'),
	(4, 2, 4, 1, 'Activo'),
	(5, 2, 5, 2, 'Activo'),
	(6, 2, 6, 1, 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.recuperacionmonitoria
CREATE TABLE IF NOT EXISTS `RecuperacionMonitoria` (
  `id_recuperacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_sesion_original` int(11) NOT NULL,
  `id_cancelacion` int(11) DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_recuperacion` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `descripcion` varchar(1000) NOT NULL,
  `ruta_soporte` varchar(255) DEFAULT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp(),
  `estado` enum('Programada','Realizada','Cancelada') NOT NULL DEFAULT 'Programada',
  PRIMARY KEY (`id_recuperacion`),
  KEY `fk_recuperacion_cancelacion` (`id_cancelacion`),
  KEY `idx_recuperacion_monitoria_sesion` (`id_sesion_original`),
  KEY `idx_recuperacion_monitoria_usuario` (`id_usuario`),
  CONSTRAINT `fk_recuperacion_cancelacion` FOREIGN KEY (`id_cancelacion`) REFERENCES `CancelacionMonitoria` (`id_cancelacion`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_recuperacion_sesion` FOREIGN KEY (`id_sesion_original`) REFERENCES `Sesion` (`id_sesion`) ON UPDATE CASCADE,
  CONSTRAINT `fk_recuperacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.recuperacionmonitoria: ~0 rows (aproximadamente)
REPLACE INTO `RecuperacionMonitoria` (`id_recuperacion`, `id_sesion_original`, `id_cancelacion`, `id_usuario`, `fecha_recuperacion`, `hora_inicio`, `hora_fin`, `descripcion`, `ruta_soporte`, `fecha_registro`, `estado`) VALUES
	(1, 2, 1, 3, '2026-08-12', '10:00:00', '11:00:00', 'Recuperación de monitoría cancelada por cruce de agenda', 'assets/evidencias/monitor/recuperacion_sesion_2.pdf', '2026-08-05 09:15:00', 'Programada'),
	(2, 7, NULL, 5, '2026-11-07', '08:00:00', '11:00:00', 'Se recupera la monitoria que se cancelo por los motivos mencionados.', NULL, '2026-11-03 11:44:54', 'Programada');

-- Volcando estructura para tabla gestion_monitorias_tutorias.reportemonitoria
CREATE TABLE IF NOT EXISTS `ReporteMonitoria` (
  `id_reporte_monitoria` int(11) NOT NULL AUTO_INCREMENT,
  `id_sesion` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `actividad` text NOT NULL,
  `asistencia` enum('Si','No') NOT NULL,
  `ruta_listado_asistencia` varchar(255) DEFAULT NULL,
  `ruta_material` varchar(255) DEFAULT NULL,
  `hora_inicio_real` time NOT NULL,
  `hora_fin_real` time NOT NULL,
  `observaciones` varchar(1000) DEFAULT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp(),
  `estado` enum('Activo','Anulado') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_reporte_monitoria`),
  UNIQUE KEY `uq_reporte_monitoria` (`id_sesion`,`id_usuario`),
  KEY `idx_reporte_monitoria_sesion` (`id_sesion`),
  KEY `idx_reporte_monitoria_usuario` (`id_usuario`),
  CONSTRAINT `fk_reporte_monitoria_sesion` FOREIGN KEY (`id_sesion`) REFERENCES `Sesion` (`id_sesion`) ON UPDATE CASCADE,
  CONSTRAINT `fk_reporte_monitoria_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.reportemonitoria: ~1 rows (aproximadamente)
REPLACE INTO `ReporteMonitoria` (`id_reporte_monitoria`, `id_sesion`, `id_usuario`, `actividad`, `asistencia`, `ruta_listado_asistencia`, `ruta_material`, `hora_inicio_real`, `hora_fin_real`, `observaciones`, `fecha_registro`, `estado`) VALUES
	(1, 1, 2, 'Repaso de SELECT, WHERE y JOIN con ejercicios guiados', 'Si', 'assets/evidencias/monitor/asistencia_sesion_1.xlsx', 'assets/evidencias/monitor/material_sesion_1.pdf', '09:05:00', '10:10:00', 'La sesión se desarrolló sin novedades', '2026-08-06 10:15:00', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.rol
CREATE TABLE IF NOT EXISTS `Rol` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.rol: ~4 rows (aproximadamente)
REPLACE INTO `Rol` (`id_rol`, `nombre`, `descripcion`, `estado`) VALUES
	(1, 'Administrador', 'Gestión general del sistema', 'Activo'),
	(2, 'Estudiante', 'Usuario con acceso a agendamiento y actividades', 'Activo'),
	(3, 'Tutor', 'Docente tutor de acompañamiento académico', 'Activo'),
	(4, 'Monitor', 'Monitor académico institucional', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.seguimiento
CREATE TABLE IF NOT EXISTS `Seguimiento` (
  `id_seguimiento` int(11) NOT NULL AUTO_INCREMENT,
  `id_estudiante` int(11) NOT NULL,
  `id_sesion` int(11) NOT NULL,
  `fecha` datetime NOT NULL,
  `observaciones` varchar(500) DEFAULT NULL,
  `estado` enum('Activo','Finalizado') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_seguimiento`),
  KEY `idx_seguimiento_estudiante` (`id_estudiante`),
  KEY `idx_seguimiento_sesion` (`id_sesion`),
  CONSTRAINT `fk_seguimiento_estudiante` FOREIGN KEY (`id_estudiante`) REFERENCES `Estudiante` (`id_estudiante`) ON UPDATE CASCADE,
  CONSTRAINT `fk_seguimiento_sesion` FOREIGN KEY (`id_sesion`) REFERENCES `Sesion` (`id_sesion`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.seguimiento: ~2 rows (aproximadamente)
REPLACE INTO `Seguimiento` (`id_seguimiento`, `id_estudiante`, `id_sesion`, `fecha`, `observaciones`, `estado`) VALUES
	(1, 1, 1, '2026-08-06 10:30:00', 'Seguimiento asociado a la monitoría de bases de datos', 'Activo'),
	(2, 2, 3, '2026-08-08 15:45:00', 'Seguimiento asociado a la tutoría de contabilidad', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.sesion
CREATE TABLE IF NOT EXISTS `Sesion` (
  `id_sesion` int(11) NOT NULL AUTO_INCREMENT,
  `id_solicitud` int(11) NOT NULL,
  `id_asignacion` int(11) NOT NULL,
  `id_asignacion_espacio` int(11) DEFAULT NULL,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL CHECK (`hora_inicio` < `hora_fin`),
  `hora_fin` time NOT NULL CHECK (`hora_fin` > `hora_inicio`),
  `modalidad` enum('Presencial','Virtual') NOT NULL DEFAULT 'Presencial',
  `tipo` enum('Tutoría','Monitoría') NOT NULL,
  `tema` varchar(250) DEFAULT NULL,
  `observaciones` varchar(500) DEFAULT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp(),
  `estado` enum('Programada','Confirmada','Reprogramada','En Proceso','Realizada','No Asistida','Finalizada','Cancelada') NOT NULL DEFAULT 'Programada',
  PRIMARY KEY (`id_sesion`),
  KEY `fk_sesion_espacio` (`id_asignacion_espacio`),
  KEY `idx_sesion_fecha` (`fecha`),
  KEY `idx_sesion_asignacion` (`id_asignacion`),
  KEY `idx_sesion_solicitud` (`id_solicitud`),
  KEY `idx_sesion_estado` (`estado`),
  CONSTRAINT `fk_sesion_asignacion` FOREIGN KEY (`id_asignacion`) REFERENCES `AsignacionAcademica` (`id_asignacion`) ON UPDATE CASCADE,
  CONSTRAINT `fk_sesion_espacio` FOREIGN KEY (`id_asignacion_espacio`) REFERENCES `AsignacionEspacio` (`id_asignacion_espacio`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sesion_solicitud` FOREIGN KEY (`id_solicitud`) REFERENCES `Solicitud` (`id_solicitud`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.sesion: ~8 rows (aproximadamente)
REPLACE INTO `Sesion` (`id_sesion`, `id_solicitud`, `id_asignacion`, `id_asignacion_espacio`, `fecha`, `hora_inicio`, `hora_fin`, `modalidad`, `tipo`, `tema`, `observaciones`, `fecha_registro`, `estado`) VALUES
	(1, 1, 1, NULL, '2026-08-06', '09:00:00', '10:00:00', 'Presencial', 'Monitoría', 'Consultas SQL básicas', 'Sesión de práctica guiada', '2026-08-05 08:00:00', 'Realizada'),
	(2, 3, 2, NULL, '2026-08-07', '10:00:00', '11:00:00', 'Presencial', 'Monitoría', 'Programación I', 'Sesión cancelada y reprogramada', '2026-08-05 08:10:00', 'Cancelada'),
	(3, 2, 4, 1, '2026-08-08', '14:00:00', '15:30:00', 'Presencial', 'Tutoría', 'Contabilidad general', 'Tutoría desarrollada en aula 101A', '2026-08-05 08:15:00', 'Finalizada'),
	(4, 4, 5, 2, '2026-08-09', '15:00:00', '16:00:00', 'Presencial', 'Tutoría', 'Legislación comercial', 'Tutoría de repaso', '2026-08-05 08:20:00', 'Programada'),
	(5, 8, 1, NULL, '2026-10-15', '09:00:00', '10:00:00', 'Presencial', 'Monitoría', 'Primera sesión de acompañamiento', NULL, '2026-10-14 16:33:08', 'Realizada'),
	(6, 9, 1, NULL, '2026-10-16', '09:00:00', '10:00:00', 'Presencial', 'Monitoría', 'Primera sesión de acompañamiento', NULL, '2026-10-15 09:04:28', 'Realizada'),
	(7, 12, 10, NULL, '2026-11-03', '15:00:00', '18:00:00', 'Presencial', 'Tutoría', 'Primera sesión de acompañamiento', 'Cancelación del tutor: La información enviada no cumple las reglas de validación.', '2026-11-03 11:43:22', 'Cancelada'),
	(8, 13, 10, NULL, '2026-11-09', '15:00:00', '18:00:00', 'Presencial', 'Tutoría', 'Primera sesión de acompañamiento', NULL, '2026-11-03 11:47:54', 'Realizada');

-- Volcando estructura para tabla gestion_monitorias_tutorias.sesioningreso
CREATE TABLE IF NOT EXISTS `SesionIngreso` (
  `id_sesion` char(36) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `rol_activo` enum('Administrador','Tutor','Monitor','Estudiante') NOT NULL,
  `creada_en` datetime NOT NULL DEFAULT current_timestamp(),
  `expira_en` datetime NOT NULL,
  `revocada_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id_sesion`),
  KEY `idx_sesion_ingreso_usuario_activa` (`id_usuario`,`revocada_en`,`expira_en`),
  CONSTRAINT `fk_sesion_ingreso_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.sesioningreso: ~28 rows (aproximadamente)
REPLACE INTO `SesionIngreso` (`id_sesion`, `id_usuario`, `rol_activo`, `creada_en`, `expira_en`, `revocada_en`) VALUES
	('18204d39-eb2d-4e32-9e1a-de99b70513fa', 2, 'Monitor', '2026-11-10 19:51:46', '2026-11-11 03:51:46', '2026-11-10 19:51:50'),
	('32de491d-ef01-42dd-ab31-f05fd7d99da3', 5, 'Tutor', '2026-11-05 08:33:27', '2026-11-05 16:33:27', '2026-11-05 08:33:27'),
	('336da0aa-87fd-4abe-9c21-b5db070a83e5', 5, 'Tutor', '2026-11-24 17:41:02', '2026-11-25 01:41:02', NULL),
	('38c12475-a075-41d6-9a7c-b40b195601e0', 1, 'Administrador', '2026-11-24 17:39:46', '2026-11-25 01:39:46', '2026-11-24 17:40:52'),
	('39cf32cb-3140-444c-82bb-0be4c60560f5', 1, 'Administrador', '2026-11-09 10:21:45', '2026-11-09 18:21:45', NULL),
	('42c05810-cc9e-495f-8191-875a9aaeccb5', 2, 'Estudiante', '2026-11-11 19:20:13', '2026-11-12 03:20:13', '2026-11-11 19:20:33'),
	('4acbd506-7af7-484d-b78a-e3f15c0cbf05', 2, 'Estudiante', '2026-11-05 08:44:01', '2026-11-05 16:44:01', '2026-11-05 08:44:01'),
	('536cd5cd-86c2-47f0-a2d1-d1b071dfd0b4', 1, 'Administrador', '2026-11-05 09:18:54', '2026-11-05 17:18:54', '2026-11-05 09:25:21'),
	('5d597d40-a22d-430f-9a4c-4d8a680b5029', 5, 'Tutor', '2026-11-05 09:07:59', '2026-11-05 17:07:59', '2026-11-05 09:08:41'),
	('665a4a1d-a8f2-49fe-8ebb-e993a8fc5c7d', 5, 'Tutor', '2026-11-05 08:26:49', '2026-11-05 16:26:49', '2026-11-05 08:26:49'),
	('6a963eec-31ce-4128-8135-207355e37064', 1, 'Administrador', '2026-11-05 08:59:11', '2026-11-05 16:59:11', '2026-11-05 08:59:55'),
	('791d7256-f84a-41f5-86c1-aaa01c675272', 2, 'Monitor', '2026-11-05 08:44:01', '2026-11-05 16:44:01', '2026-11-05 08:44:01'),
	('79ffb497-47b6-4086-9782-b7d2f6d7af85', 5, 'Tutor', '2026-11-24 17:48:29', '2026-11-25 01:48:29', NULL),
	('8cda2c98-5c8e-409b-9900-9f65659181c3', 2, 'Estudiante', '2026-11-05 08:38:56', '2026-11-05 16:38:56', '2026-11-05 08:38:56'),
	('926e53f0-6945-4120-b6b3-84564d7eb78a', 1, 'Administrador', '2026-11-05 09:03:59', '2026-11-05 17:03:59', '2026-11-05 09:04:33'),
	('9cacf256-3732-4e7c-84eb-38a53a141c1c', 2, 'Monitor', '2026-11-05 09:25:50', '2026-11-05 17:25:50', '2026-11-05 09:27:32'),
	('9ea51f4a-e78a-4c1c-aea4-2d443bfcf963', 1, 'Administrador', '2026-11-05 09:00:54', '2026-11-05 17:00:54', '2026-11-05 09:03:28'),
	('a33767e0-bcc9-478b-8c32-04b73e5fb75d', 5, 'Tutor', '2026-11-05 09:17:26', '2026-11-05 17:17:26', '2026-11-05 09:18:15'),
	('a619cad1-4452-4c94-9e0a-b97c0a5bc2c0', 5, 'Tutor', '2026-11-05 09:11:09', '2026-11-05 17:11:09', '2026-11-05 09:15:34'),
	('b318796a-35d6-4c56-921f-af483aa6b7e3', 5, 'Tutor', '2026-11-05 09:18:34', '2026-11-05 17:18:34', '2026-11-05 09:18:38'),
	('c29f9927-0fb2-4c26-a4da-9d631a6303a7', 2, 'Monitor', '2026-11-05 09:00:19', '2026-11-05 17:00:19', '2026-11-05 09:00:33'),
	('c6ff48fe-78dc-48ed-9198-961988afb365', 1, 'Administrador', '2026-11-05 09:09:11', '2026-11-05 17:09:11', '2026-11-05 09:10:29'),
	('cf6158fa-06d7-41f0-8653-2030cd384dab', 2, 'Monitor', '2026-11-05 08:38:56', '2026-11-05 16:38:56', '2026-11-05 08:38:56'),
	('cff9a2c6-a374-42dd-9171-2ce0b722aa1c', 2, 'Estudiante', '2026-11-10 19:51:50', '2026-11-11 03:51:50', '2026-11-10 19:51:53'),
	('dc908f7b-f132-4d0b-8aad-c860911792df', 2, 'Estudiante', '2026-11-05 09:00:33', '2026-11-05 17:00:33', '2026-11-05 09:00:39'),
	('e325e08c-5b66-4720-b4aa-7698eb68fff8', 2, 'Estudiante', '2026-11-05 09:27:32', '2026-11-05 17:27:32', NULL),
	('f7d70733-0081-476f-8f80-13e49a865991', 1, 'Administrador', '2026-11-05 09:06:08', '2026-11-05 17:06:08', '2026-11-05 09:07:19'),
	('fff87b4e-4292-4dd6-85c4-101671355b27', 1, 'Administrador', '2026-11-11 19:20:40', '2026-11-12 03:20:40', NULL);

-- Volcando estructura para tabla gestion_monitorias_tutorias.sesionpreautenticacion
CREATE TABLE IF NOT EXISTS `SesionPreAutenticacion` (
  `id_sesion` char(36) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `creada_en` datetime NOT NULL DEFAULT current_timestamp(),
  `expira_en` datetime NOT NULL,
  `revocada_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id_sesion`),
  KEY `idx_preautenticacion_usuario` (`id_usuario`,`revocada_en`,`expira_en`),
  CONSTRAINT `fk_sesion_preautenticacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.sesionpreautenticacion: ~9 rows (aproximadamente)
REPLACE INTO `SesionPreAutenticacion` (`id_sesion`, `id_usuario`, `creada_en`, `expira_en`, `revocada_en`) VALUES
	('136f6430-3f78-44d4-9a57-0e4593a32f0c', 2, '2026-11-05 08:44:02', '2026-11-05 08:49:02', '2026-11-05 08:44:02'),
	('36324468-983d-4ef3-a2cf-41b423724339', 2, '2026-11-10 19:51:32', '2026-11-10 19:56:32', NULL),
	('416c7540-041d-4253-a62c-34bfbdaed876', 2, '2026-11-10 19:51:45', '2026-11-10 19:56:45', '2026-11-10 19:51:46'),
	('5b0740e4-cdfe-4d7d-ab15-605bf58d95ba', 2, '2026-11-05 08:38:56', '2026-11-05 08:43:56', '2026-11-05 08:38:56'),
	('6a8d39b3-2051-4362-9e22-08193e376feb', 2, '2026-11-05 09:00:11', '2026-11-05 09:05:11', '2026-11-05 09:00:19'),
	('9de40637-0ab6-46ee-b844-e5db51f60b14', 2, '2026-11-05 08:44:01', '2026-11-05 08:49:01', '2026-11-05 08:44:01'),
	('c84bd2ba-f4bc-4d82-83e5-dccc2a6275db', 2, '2026-11-05 08:38:56', '2026-11-05 08:43:56', '2026-11-05 08:38:56'),
	('d2fd94e2-7d2d-401b-bcbb-2c54dc5b6c3a', 2, '2026-11-11 19:20:12', '2026-11-11 19:25:12', '2026-11-11 19:20:13'),
	('f642ad20-116f-4c06-8e92-3dc95a2f5287', 2, '2026-11-05 09:25:39', '2026-11-05 09:30:39', '2026-11-05 09:25:50');

-- Volcando estructura para tabla gestion_monitorias_tutorias.solicitud
CREATE TABLE IF NOT EXISTS `Solicitud` (
  `id_solicitud` int(11) NOT NULL AUTO_INCREMENT,
  `id_estudiante` int(11) NOT NULL,
  `id_programa` int(11) NOT NULL,
  `id_asignatura` int(11) NOT NULL,
  `id_tipo_solicitud` int(11) NOT NULL,
  `id_periodo` int(11) NOT NULL,
  `fecha_solicitud` datetime NOT NULL,
  `motivo` varchar(500) DEFAULT NULL,
  `descripcion` varchar(500) DEFAULT NULL,
  `prioridad` enum('Alta','Media','Baja') NOT NULL DEFAULT 'Media',
  `estado` enum('Pendiente','Aprobada','Rechazada','Asignada','Atendida','Cancelada','Finalizada') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`id_solicitud`),
  KEY `fk_solicitud_tipo` (`id_tipo_solicitud`),
  KEY `fk_solicitud_programa` (`id_programa`),
  KEY `fk_solicitud_periodo` (`id_periodo`),
  KEY `idx_solicitud_estudiante` (`id_estudiante`),
  KEY `idx_solicitud_asignatura` (`id_asignatura`),
  KEY `idx_solicitud_estado` (`estado`),
  CONSTRAINT `fk_solicitud_asignatura` FOREIGN KEY (`id_asignatura`) REFERENCES `Asignatura` (`id_asignatura`) ON UPDATE CASCADE,
  CONSTRAINT `fk_solicitud_estudiante` FOREIGN KEY (`id_estudiante`) REFERENCES `Estudiante` (`id_estudiante`) ON UPDATE CASCADE,
  CONSTRAINT `fk_solicitud_periodo` FOREIGN KEY (`id_periodo`) REFERENCES `PeriodoAcademico` (`id_periodo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_solicitud_programa` FOREIGN KEY (`id_programa`) REFERENCES `Programa` (`id_programa`) ON UPDATE CASCADE,
  CONSTRAINT `fk_solicitud_tipo` FOREIGN KEY (`id_tipo_solicitud`) REFERENCES `TipoSolicitud` (`id_tipo_solicitud`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.solicitud: ~11 rows (aproximadamente)
REPLACE INTO `Solicitud` (`id_solicitud`, `id_estudiante`, `id_programa`, `id_asignatura`, `id_tipo_solicitud`, `id_periodo`, `fecha_solicitud`, `motivo`, `descripcion`, `prioridad`, `estado`) VALUES
	(1, 1, 1, 2, 1, 1, '2026-08-01 08:30:00', 'Necesito reforzar consultas SQL', 'Solicitud de monitoría para bases de datos', 'Alta', 'Rechazada'),
	(2, 2, 2, 4, 2, 1, '2026-08-01 09:10:00', 'Quiero apoyo en contabilidad general', 'Solicitud de tutoría para contabilidad', 'Media', 'Asignada'),
	(3, 1, 1, 1, 1, 1, '2026-08-02 10:15:00', 'Debo preparar un taller de programación', 'Solicitud para monitoría en programación', 'Media', 'Cancelada'),
	(4, 2, 2, 5, 2, 1, '2026-08-02 11:20:00', 'Necesito repasar legislación comercial', 'Solicitud de tutoría en legislación', 'Baja', 'Finalizada'),
	(5, 5, 1, 1, 1, 1, '2026-08-06 09:31:55', 'Se solicita acompañamiento por bajo rendimiento academico', 'Monitoria', 'Media', 'Cancelada'),
	(6, 5, 1, 3, 1, 1, '2026-08-06 09:34:46', 'Se colicita acompañamiento', 'Monitoria', 'Media', 'Rechazada'),
	(7, 5, 1, 1, 1, 1, '2026-08-06 09:44:36', 'Se solicita acompañamiento', 'Tengo bajo rendimiento en la materia', 'Alta', 'Cancelada'),
	(8, 2, 2, 1, 1, 1, '2026-10-13 12:05:46', 'Bajo Rendimiento Academico en la asignatura', 'Necesito refuerzo en los temas de la unidad 1 de la asignatura', 'Media', 'Finalizada'),
	(9, 15, 1, 1, 1, 1, '2026-10-15 09:04:28', 'Retroalimentacion de los temas de la unidad 1 del silabo', 'Apoyo con talleres y ejercicios', 'Media', 'Finalizada'),
	(12, 28, 1, 1, 2, 1, '2026-11-03 11:43:22', 'Bajo Rendimiento Académico en la asignatura - Pertenece a la categoría SAT', 'Presenta dificultades en el aprendizaje de lo temas de las asignaturas, se le debe presentar un seguimiento prioritario y asignar material de apoyo para los temas de mas dificultad.', 'Alta', 'Cancelada'),
	(13, 5, 1, 1, 2, 1, '2026-11-03 11:47:54', 'Retroalimentacion de los temas de la unidad 1 del silabo', 'Necesito acompañamiento de refuerzo de temas que presento dudas', 'Media', 'Atendida');

-- Volcando estructura para tabla gestion_monitorias_tutorias.solicitudcambioclave
CREATE TABLE IF NOT EXISTS `SolicitudCambioClave` (
  `id_solicitud` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) DEFAULT NULL,
  `correo_solicitante` varchar(120) NOT NULL,
  `nombre_solicitante` varchar(160) NOT NULL,
  `tipo_solicitud` enum('AyudaAdministrador','CodigoCorreo') NOT NULL,
  `estado` enum('Pendiente','Completada') NOT NULL DEFAULT 'Pendiente',
  `solicitada_en` datetime NOT NULL DEFAULT current_timestamp(),
  `completada_en` datetime DEFAULT NULL,
  `gestionada_por` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_solicitud`),
  KEY `fk_solicitud_cambio_clave_gestor` (`gestionada_por`),
  KEY `idx_solicitud_cambio_clave_estado_fecha` (`estado`,`solicitada_en`),
  KEY `idx_solicitud_cambio_clave_usuario` (`id_usuario`,`estado`),
  CONSTRAINT `fk_solicitud_cambio_clave_gestor` FOREIGN KEY (`gestionada_por`) REFERENCES `Usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_solicitud_cambio_clave_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.solicitudcambioclave: ~0 rows (aproximadamente)

-- Volcando estructura para tabla gestion_monitorias_tutorias.tipoclasificacion
CREATE TABLE IF NOT EXISTS `TipoClasificacion` (
  `id_tipo_clasificacion` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `descripcion` varchar(250) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_tipo_clasificacion`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.tipoclasificacion: ~3 rows (aproximadamente)
REPLACE INTO `TipoClasificacion` (`id_tipo_clasificacion`, `nombre`, `descripcion`, `estado`) VALUES
	(1, 'Académica', 'Clasificación académica de la solicitud', 'Activo'),
	(2, 'Seguimiento', 'Seguimiento del proceso', 'Activo'),
	(3, 'Conductual', 'Clasificación conductual', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.tiposolicitud
CREATE TABLE IF NOT EXISTS `TipoSolicitud` (
  `id_tipo_solicitud` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `descripcion` varchar(250) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_tipo_solicitud`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.tiposolicitud: ~3 rows (aproximadamente)
REPLACE INTO `TipoSolicitud` (`id_tipo_solicitud`, `nombre`, `descripcion`, `estado`) VALUES
	(1, 'Monitoría', 'Acompañamiento entre pares', 'Activo'),
	(2, 'Tutoría', 'Acompañamiento docente', 'Activo'),
	(3, 'Acompañamiento', 'Apoyo académico general', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.tutor
CREATE TABLE IF NOT EXISTS `Tutor` (
  `id_tutor` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `categoria_docente` varchar(80) DEFAULT NULL,
  `tipo_vinculacion` varchar(80) DEFAULT NULL,
  `periodo_actual` varchar(20) DEFAULT NULL,
  `horas_semanales` tinyint(4) DEFAULT NULL,
  `observaciones` varchar(300) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_tutor`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  KEY `idx_tutor_usuario` (`id_usuario`),
  CONSTRAINT `fk_tutor_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.tutor: ~1 rows (aproximadamente)
REPLACE INTO `Tutor` (`id_tutor`, `id_usuario`, `categoria_docente`, `tipo_vinculacion`, `periodo_actual`, `horas_semanales`, `observaciones`, `estado`) VALUES
	(1, 5, 'Profesor Titular', 'Medio tiempo', '2026-1', 14, '', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.usuario
CREATE TABLE IF NOT EXISTS `Usuario` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) NOT NULL,
  `documento` varchar(20) NOT NULL,
  `nombres` varchar(80) NOT NULL,
  `apellidos` varchar(80) NOT NULL,
  `correo` varchar(120) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `codigo` (`codigo`),
  UNIQUE KEY `documento` (`documento`),
  UNIQUE KEY `correo` (`correo`),
  KEY `idx_usuario_codigo` (`codigo`),
  KEY `idx_usuario_documento` (`documento`),
  KEY `idx_usuario_correo` (`correo`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.usuario: ~12 rows (aproximadamente)
REPLACE INTO `Usuario` (`id_usuario`, `codigo`, `documento`, `nombres`, `apellidos`, `correo`, `telefono`, `estado`) VALUES
	(1, 'ADM001', '1000000010', 'Jayson Eric', 'Quintero Reina', 'jaysonquintero@unitropico.edu.co', '3184878993', 'Activo'),
	(2, 'MON001', '1093432540', 'Brayham Orlando Lindarte', 'Fuentes', 'brayhamlindarte.es@unitropico.edu.co', '3000000001', 'Activo'),
	(3, 'MON002', '1029800072', 'Karen Alejandra Gaitan', 'Diaz', 'karengaitan.es@unitropico.edu.co', '32039217550', 'Activo'),
	(4, 'MON003', '1007418844', 'Shirley Dayanna Tumay', 'Cristiano', 'shirleytumay.es@unitropico.edu.co', '3143470487', 'Activo'),
	(5, 'TUT001', '1007418843', 'Raul Fernando Robayo', 'Mendez', 'tutormatematica@unitropico.edu.co', '3112318034', 'Activo'),
	(6, 'EST001', '1029663952', 'Maria Valentina Amezquita', 'Amezquita', 'mariaamezquita.es@unitropico.edu.co', '3125172748', 'Activo'),
	(7, 'EST002', '1029660011', 'Sofia Alejandra', 'Cardenas Preciado', 'sofiacardenas.es@unitropico.edu.co', '3013784123', 'Activo'),
	(8, 'EST003', '1028944310', 'Maria Sthefania', 'Montanez Alayon', 'mariamontanez.es@unitropico.edu.co', '3212292954', 'Activo'),
	(9, 'ADM002', '1000000011', 'Administrador', 'Sistema', 'admin@unitropico.edu.co', '3000000000', 'Activo'),
	(13, 'EST206', '1012134556', 'Ana María Lopez', 'Niño', 'analopez.es@unitropico.edu.co', NULL, 'Activo'),
	(14, 'EST725', '1415161718', 'Juan Felipe Niño', 'Cardenas', 'juannino.es@unitropico.edu.co', NULL, 'Activo'),
	(18, 'EST601', '102345', 'Juan Felipe', 'Cardenas', 'juancardenas.es@unitropico.edu.co', NULL, 'Activo'),
	(20, 'EST425', '10234875', 'Juan Carlos', 'Fonseca', 'juanfonseca@unitropico.edu.co', '3104257896', 'Activo');

-- Volcando estructura para tabla gestion_monitorias_tutorias.usuariorol
CREATE TABLE IF NOT EXISTS `UsuarioRol` (
  `id_usuario_rol` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_rol` int(11) NOT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id_usuario_rol`),
  UNIQUE KEY `uq_usuario_rol` (`id_usuario`,`id_rol`),
  KEY `idx_usuario_rol_usuario` (`id_usuario`),
  KEY `idx_usuario_rol_rol` (`id_rol`),
  CONSTRAINT `fk_usuario_rol_rol` FOREIGN KEY (`id_rol`) REFERENCES `Rol` (`id_rol`) ON UPDATE CASCADE,
  CONSTRAINT `fk_usuario_rol_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Volcando datos para la tabla gestion_monitorias_tutorias.usuariorol: ~18 rows (aproximadamente)
REPLACE INTO `UsuarioRol` (`id_usuario_rol`, `id_usuario`, `id_rol`, `estado`) VALUES
	(1, 1, 1, 'Activo'),
	(2, 2, 4, 'Activo'),
	(3, 3, 4, 'Activo'),
	(4, 4, 4, 'Activo'),
	(5, 5, 3, 'Activo'),
	(6, 6, 2, 'Activo'),
	(7, 7, 2, 'Activo'),
	(8, 9, 1, 'Activo'),
	(9, 8, 2, 'Activo'),
	(18, 2, 2, 'Activo'),
	(19, 3, 2, 'Activo'),
	(20, 4, 2, 'Activo'),
	(34, 13, 2, 'Activo'),
	(35, 14, 2, 'Activo'),
	(41, 6, 4, 'Inactivo'),
	(54, 9, 4, 'Inactivo'),
	(56, 18, 2, 'Activo'),
	(59, 20, 2, 'Activo');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
