// @ts-nocheck
import nodemailer from 'nodemailer'
import { config } from './config.js'

export async function sendAdminPasswordResetCode(to: string, name: string, code: string) {
  const mail = config.mail
  if (!mail.host || !mail.port || !mail.user || !mail.password || !mail.from) {
    const error = new Error('El envío de correo no está configurado.')
    error.code = 'EMAIL_NOT_CONFIGURED'
    throw error
  }

  const transporter = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.secure,
    auth: { user: mail.user, pass: mail.password },
  })

  await transporter.sendMail({
    from: { name: 'Acadex | Unitrópico', address: mail.from },
    to,
    subject: 'Tu código de verificación para Acadex',
    text: `Hola ${name},\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta de administrador en Acadex.\n\nTu código de verificación es: ${code}\n\nEste código vence en 10 minutos y solo se puede usar una vez. Si no solicitaste este cambio, ignora este correo; tu contraseña seguirá igual.\n\nAtentamente,\nEquipo Acadex\nGestión de Tutorías y Monitorías\nUnitrópico`,
    html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f6f5;font-family:Arial,Helvetica,sans-serif;color:#23364b"><div style="max-width:600px;margin:32px auto;padding:0 16px"><div style="background:#005b50;color:#fff;padding:22px 28px;border-radius:14px 14px 0 0"><div style="font-size:13px;letter-spacing:2px;font-weight:bold">ACADEX · UNITRÓPICO</div><h1 style="font-size:22px;margin:12px 0 0">Verificación de seguridad</h1></div><div style="background:#fff;padding:28px;border:1px solid #e2e9e6;border-top:0;border-radius:0 0 14px 14px"><p>Hola ${escapeHtml(name)},</p><p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de administrador en Acadex. Usa este código para continuar:</p><div style="margin:24px 0;padding:18px;text-align:center;background:#f2f7f5;border:1px solid #d9e8e2;border-radius:10px;font-size:32px;letter-spacing:8px;font-weight:bold;color:#005b50">${code}</div><p style="font-size:14px;color:#526477">El código vence en <strong>10 minutos</strong> y solo se puede usar una vez. Si no solicitaste este cambio, ignora este correo; tu contraseña seguirá igual.</p><hr style="border:0;border-top:1px solid #e6ece9;margin:24px 0"><p style="margin-bottom:4px">Atentamente,</p><p style="margin-top:0"><strong>Equipo Acadex</strong><br>Gestión de Tutorías y Monitorías<br>Unitrópico</p></div></div></body></html>`,
  })
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }
  return value.replace(/[&<>"']/g, (character) => entities[character])
}
