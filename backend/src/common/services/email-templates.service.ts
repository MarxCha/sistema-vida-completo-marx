// src/common/services/email-templates.service.ts
/**
 * Plantillas de Email para Sistema VIDA
 *
 * Plantillas HTML responsive para:
 * - Verificación de email
 * - Recuperación de contraseña
 * - Notificaciones de suscripción
 * - Alertas de seguridad
 */

import config from '../../config';

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS BASE
// ═══════════════════════════════════════════════════════════════════════════

const BASE_STYLES = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .header {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    color: white;
    padding: 30px 20px;
    text-align: center;
  }
  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
  }
  .header .subtitle {
    margin-top: 5px;
    opacity: 0.9;
    font-size: 14px;
  }
  .content {
    padding: 30px 25px;
  }
  .content h2 {
    color: #1a1a1a;
    margin-top: 0;
    font-size: 22px;
  }
  .content p {
    margin: 15px 0;
    color: #4a4a4a;
  }
  .button {
    display: inline-block;
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    color: white !important;
    text-decoration: none;
    padding: 14px 30px;
    border-radius: 6px;
    font-weight: 600;
    margin: 20px 0;
    text-align: center;
  }
  .button:hover {
    background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  }
  .button-container {
    text-align: center;
    margin: 25px 0;
  }
  .code-box {
    background-color: #f8f9fa;
    border: 2px dashed #dc2626;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    margin: 20px 0;
  }
  .code {
    font-family: 'Courier New', monospace;
    font-size: 32px;
    font-weight: bold;
    color: #dc2626;
    letter-spacing: 4px;
  }
  .info-box {
    background-color: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 15px;
    margin: 20px 0;
    border-radius: 0 4px 4px 0;
  }
  .warning-box {
    background-color: #fee2e2;
    border-left: 4px solid #dc2626;
    padding: 15px;
    margin: 20px 0;
    border-radius: 0 4px 4px 0;
  }
  .success-box {
    background-color: #d1fae5;
    border-left: 4px solid #10b981;
    padding: 15px;
    margin: 20px 0;
    border-radius: 0 4px 4px 0;
  }
  .footer {
    background-color: #f8f9fa;
    padding: 20px;
    text-align: center;
    font-size: 12px;
    color: #6b7280;
    border-top: 1px solid #e5e7eb;
  }
  .footer a {
    color: #dc2626;
    text-decoration: none;
  }
  .divider {
    border: 0;
    height: 1px;
    background-color: #e5e7eb;
    margin: 25px 0;
  }
  .small-text {
    font-size: 13px;
    color: #6b7280;
  }
`;

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE BASE
// ═══════════════════════════════════════════════════════════════════════════

function wrapTemplate(content: string, preheader: string = ''): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sistema VIDA</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <!-- Preheader text (shown in email preview) -->
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>

  <div style="padding: 20px; background-color: #f5f5f5;">
    <div class="container">
      <div class="header">
        <h1>Sistema VIDA</h1>
        <div class="subtitle">Voluntad de Información para Decisiones Anticipadas</div>
      </div>

      ${content}

      <div class="footer">
        <p>Este es un correo automático, por favor no responda directamente.</p>
        <p>&copy; ${new Date().getFullYear()} Sistema VIDA. Todos los derechos reservados.</p>
        <p>
          <a href="${config.frontendUrl}/privacy">Privacidad</a> |
          <a href="${config.frontendUrl}/terms">Términos</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANTILLAS DE EMAIL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Email de verificación de cuenta
 */
export function emailVerificationTemplate(params: {
  name: string;
  verificationUrl: string;
  expiresIn: string;
}): { subject: string; html: string } {
  const { name, verificationUrl, expiresIn } = params;

  const content = `
    <div class="content">
      <h2>¡Bienvenido a Sistema VIDA, ${name}!</h2>

      <p>Gracias por registrarte. Para completar tu registro y activar tu cuenta,
         por favor verifica tu dirección de correo electrónico.</p>

      <div class="button-container">
        <a href="${verificationUrl}" class="button">Verificar mi correo</a>
      </div>

      <div class="info-box">
        <strong>⏱️ Este enlace expira en ${expiresIn}</strong>
        <p style="margin: 5px 0 0 0; font-size: 13px;">
          Si no solicitaste esta verificación, puedes ignorar este correo.
        </p>
      </div>

      <hr class="divider">

      <p class="small-text">
        Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:
      </p>
      <p class="small-text" style="word-break: break-all;">
        <a href="${verificationUrl}">${verificationUrl}</a>
      </p>
    </div>
  `;

  return {
    subject: 'Verifica tu cuenta - Sistema VIDA',
    html: wrapTemplate(content, `${name}, verifica tu correo para activar tu cuenta de Sistema VIDA`),
  };
}

/**
 * Email de recuperación de contraseña
 */
export function passwordResetTemplate(params: {
  name: string;
  resetUrl: string;
  expiresIn: string;
  ipAddress?: string;
}): { subject: string; html: string } {
  const { name, resetUrl, expiresIn, ipAddress } = params;

  const content = `
    <div class="content">
      <h2>Recuperación de contraseña</h2>

      <p>Hola ${name},</p>

      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Sistema VIDA.</p>

      <div class="button-container">
        <a href="${resetUrl}" class="button">Restablecer contraseña</a>
      </div>

      <div class="warning-box">
        <strong>⚠️ Importante:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Este enlace expira en ${expiresIn}</li>
          <li>Solo puede usarse una vez</li>
          <li>Si no solicitaste esto, ignora este correo</li>
        </ul>
      </div>

      ${ipAddress ? `
      <p class="small-text">
        Esta solicitud fue realizada desde la IP: ${ipAddress}
      </p>
      ` : ''}

      <hr class="divider">

      <p class="small-text">
        Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:
      </p>
      <p class="small-text" style="word-break: break-all;">
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
    </div>
  `;

  return {
    subject: 'Recupera tu contraseña - Sistema VIDA',
    html: wrapTemplate(content, 'Solicitud para restablecer tu contraseña de Sistema VIDA'),
  };
}

/**
 * Email de confirmación de cambio de contraseña
 */
export function passwordChangedTemplate(params: {
  name: string;
  changedAt: Date;
  ipAddress?: string;
}): { subject: string; html: string } {
  const { name, changedAt, ipAddress } = params;

  const formattedDate = changedAt.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const content = `
    <div class="content">
      <h2>Tu contraseña ha sido cambiada</h2>

      <p>Hola ${name},</p>

      <div class="success-box">
        <strong>✅ Contraseña actualizada exitosamente</strong>
        <p style="margin: 10px 0 0 0;">
          Fecha: ${formattedDate}
          ${ipAddress ? `<br>IP: ${ipAddress}` : ''}
        </p>
      </div>

      <p>Si tú realizaste este cambio, no necesitas hacer nada más.</p>

      <div class="warning-box">
        <strong>¿No reconoces esta actividad?</strong>
        <p style="margin: 10px 0 0 0;">
          Si no realizaste este cambio, tu cuenta puede estar comprometida.
          Por favor contacta a soporte inmediatamente.
        </p>
      </div>
    </div>
  `;

  return {
    subject: '⚠️ Tu contraseña fue cambiada - Sistema VIDA',
    html: wrapTemplate(content, 'Tu contraseña de Sistema VIDA ha sido cambiada'),
  };
}

/**
 * Email de bienvenida después de verificación
 */
export function welcomeTemplate(params: {
  name: string;
}): { subject: string; html: string } {
  const { name } = params;

  const content = `
    <div class="content">
      <h2>¡Tu cuenta está verificada!</h2>

      <p>Hola ${name},</p>

      <div class="success-box">
        <strong>✅ Tu cuenta de Sistema VIDA está lista</strong>
      </div>

      <p>Ahora puedes acceder a todas las funcionalidades:</p>

      <ul style="color: #4a4a4a;">
        <li>📋 Crear y gestionar tus directivas anticipadas</li>
        <li>📱 Generar tu código QR de emergencia</li>
        <li>👥 Designar representantes de confianza</li>
        <li>📄 Subir documentos médicos importantes</li>
      </ul>

      <div class="button-container">
        <a href="${config.frontendUrl}/dashboard" class="button">Ir a mi perfil</a>
      </div>

      <hr class="divider">

      <div class="info-box">
        <strong>💡 Tip de seguridad</strong>
        <p style="margin: 10px 0 0 0;">
          Recuerda mantener actualizada tu información médica y revisar
          periódicamente tus directivas anticipadas.
        </p>
      </div>
    </div>
  `;

  return {
    subject: '¡Bienvenido a Sistema VIDA! Tu cuenta está lista',
    html: wrapTemplate(content, `${name}, tu cuenta de Sistema VIDA está verificada y lista para usar`),
  };
}

/**
 * Email de notificación de nueva suscripción
 */
export function subscriptionCreatedTemplate(params: {
  name: string;
  planName: string;
  price: string;
  features: string[];
  nextBillingDate?: Date;
}): { subject: string; html: string } {
  const { name, planName, price, features, nextBillingDate } = params;

  const featuresHtml = features
    .map(f => `<li style="margin: 5px 0;">✓ ${f}</li>`)
    .join('');

  const content = `
    <div class="content">
      <h2>¡Suscripción activada!</h2>

      <p>Hola ${name},</p>

      <div class="success-box">
        <strong>🎉 Tu plan ${planName} está activo</strong>
        <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold;">
          ${price}/mes
        </p>
      </div>

      <p>Ahora tienes acceso a:</p>
      <ul style="color: #4a4a4a; padding-left: 20px;">
        ${featuresHtml}
      </ul>

      ${nextBillingDate ? `
      <div class="info-box">
        <strong>📅 Próxima facturación:</strong>
        <p style="margin: 5px 0 0 0;">
          ${nextBillingDate.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>
      ` : ''}

      <div class="button-container">
        <a href="${config.frontendUrl}/subscription" class="button">Ver mi suscripción</a>
      </div>
    </div>
  `;

  return {
    subject: `¡Tu plan ${planName} está activo! - Sistema VIDA`,
    html: wrapTemplate(content, `${name}, tu suscripción ${planName} ha sido activada`),
  };
}

/**
 * Email de cancelación de suscripción
 */
export function subscriptionCancelledTemplate(params: {
  name: string;
  planName: string;
  endDate: Date;
}): { subject: string; html: string } {
  const { name, planName, endDate } = params;

  const formattedEndDate = endDate.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const content = `
    <div class="content">
      <h2>Suscripción cancelada</h2>

      <p>Hola ${name},</p>

      <p>Tu suscripción al plan <strong>${planName}</strong> ha sido cancelada.</p>

      <div class="info-box">
        <strong>📅 Tu acceso Premium continúa hasta:</strong>
        <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">
          ${formattedEndDate}
        </p>
      </div>

      <p>Después de esta fecha, tu cuenta volverá al plan gratuito y algunas
         funcionalidades pueden no estar disponibles.</p>

      <hr class="divider">

      <p>¿Cambiaste de opinión? Siempre puedes reactivar tu suscripción.</p>

      <div class="button-container">
        <a href="${config.frontendUrl}/subscription/plans" class="button">Ver planes disponibles</a>
      </div>
    </div>
  `;

  return {
    subject: 'Tu suscripción ha sido cancelada - Sistema VIDA',
    html: wrapTemplate(content, `${name}, tu suscripción ${planName} ha sido cancelada`),
  };
}

/**
 * Email de alerta de seguridad (login desde nuevo dispositivo)
 */
export function securityAlertTemplate(params: {
  name: string;
  alertType: 'new_device' | 'password_attempt' | 'suspicious_activity';
  details: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    time: Date;
  };
}): { subject: string; html: string } {
  const { name, alertType, details } = params;

  const alertMessages = {
    new_device: {
      title: 'Nuevo inicio de sesión detectado',
      icon: '🔐',
      description: 'Se detectó un inicio de sesión desde un dispositivo o ubicación nueva.',
    },
    password_attempt: {
      title: 'Intentos de acceso fallidos',
      icon: '⚠️',
      description: 'Se detectaron múltiples intentos fallidos de acceso a tu cuenta.',
    },
    suspicious_activity: {
      title: 'Actividad sospechosa detectada',
      icon: '🚨',
      description: 'Se detectó actividad inusual en tu cuenta.',
    },
  };

  const alert = alertMessages[alertType];
  const formattedTime = details.time.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const content = `
    <div class="content">
      <h2>${alert.icon} ${alert.title}</h2>

      <p>Hola ${name},</p>

      <p>${alert.description}</p>

      <div class="warning-box">
        <strong>Detalles del evento:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; list-style: none;">
          <li>📅 Fecha: ${formattedTime}</li>
          ${details.ipAddress ? `<li>🌐 IP: ${details.ipAddress}</li>` : ''}
          ${details.location ? `<li>📍 Ubicación: ${details.location}</li>` : ''}
          ${details.userAgent ? `<li>💻 Dispositivo: ${details.userAgent}</li>` : ''}
        </ul>
      </div>

      <p><strong>Si fuiste tú:</strong> No necesitas hacer nada.</p>

      <p><strong>Si no reconoces esta actividad:</strong></p>
      <ul style="color: #4a4a4a;">
        <li>Cambia tu contraseña inmediatamente</li>
        <li>Revisa tus sesiones activas</li>
        <li>Habilita la autenticación de dos factores</li>
      </ul>

      <div class="button-container">
        <a href="${config.frontendUrl}/settings/security" class="button">Revisar seguridad de mi cuenta</a>
      </div>
    </div>
  `;

  return {
    subject: `${alert.icon} Alerta de seguridad - Sistema VIDA`,
    html: wrapTemplate(content, `${name}, ${alert.description.toLowerCase()}`),
  };
}

// Export all templates
/**
 * Email de notificación de pago fallido
 */
export function paymentFailedTemplate(params: {
  name: string;
  planName: string;
  amount: string;
  failureReason?: string;
  retryUrl: string;
}): { subject: string; html: string } {
  const { name, planName, amount, failureReason, retryUrl } = params;

  const content = `
    <div class="content">
      <h2>⚠️ Problema con tu pago</h2>

      <p>Hola ${name},</p>

      <p>No pudimos procesar el pago de tu suscripción <strong>${planName}</strong>.</p>

      <div class="warning-box">
        <strong>Detalles del pago:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Plan: ${planName}</li>
          <li>Monto: ${amount}</li>
          ${failureReason ? `<li>Motivo: ${failureReason}</li>` : ''}
        </ul>
      </div>

      <p>Para mantener tu acceso a las funciones Premium, por favor actualiza tu método de pago:</p>

      <div class="button-container">
        <a href="${retryUrl}" class="button">Actualizar método de pago</a>
      </div>

      <div class="info-box">
        <strong>💡 ¿Qué puede haber pasado?</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Tu tarjeta puede haber expirado</li>
          <li>Fondos insuficientes</li>
          <li>El banco rechazó la transacción</li>
        </ul>
      </div>

      <p class="small-text">
        Si no actualizas tu método de pago, tu suscripción se cancelará automáticamente
        y perderás acceso a las funciones Premium.
      </p>
    </div>
  `;

  return {
    subject: '⚠️ Problema con tu pago - Sistema VIDA',
    html: wrapTemplate(content, `${name}, hubo un problema procesando tu pago de Sistema VIDA`),
  };
}

/**
 * Email de notificación de acceso de emergencia
 */
export function emergencyAccessNotificationTemplate(params: {
  name: string;
  accessTime: Date;
  accessorInfo: {
    ip?: string;
    location?: string;
    userAgent?: string;
  };
  documentsAccessed: number;
  viewHistoryUrl: string;
}): { subject: string; html: string } {
  const { name, accessTime, accessorInfo, documentsAccessed, viewHistoryUrl } = params;

  const formattedTime = accessTime.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const content = `
    <div class="content">
      <h2>🚨 Acceso de Emergencia a tu Información</h2>

      <p>Hola ${name},</p>

      <p>Se ha realizado un <strong>acceso de emergencia</strong> a tu información médica
         en Sistema VIDA.</p>

      <div class="warning-box">
        <strong>Detalles del acceso:</strong>
        <table style="width: 100%; margin-top: 10px;">
          <tr>
            <td style="padding: 5px 0;"><strong>Fecha y hora:</strong></td>
            <td>${formattedTime}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Documentos vistos:</strong></td>
            <td>${documentsAccessed} documento(s)</td>
          </tr>
          ${accessorInfo.ip ? `
          <tr>
            <td style="padding: 5px 0;"><strong>IP del acceso:</strong></td>
            <td>${accessorInfo.ip}</td>
          </tr>
          ` : ''}
          ${accessorInfo.location ? `
          <tr>
            <td style="padding: 5px 0;"><strong>Ubicación:</strong></td>
            <td>${accessorInfo.location}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div class="info-box">
        <strong>ℹ️ ¿Qué es un acceso de emergencia?</strong>
        <p style="margin: 10px 0 0 0;">
          El acceso de emergencia permite que personal médico o de emergencias
          pueda ver tu información vital cuando escanean tu código QR de emergencia.
          Esto puede salvar tu vida en situaciones críticas.
        </p>
      </div>

      <p>Puedes revisar el historial completo de accesos a tu información:</p>

      <div class="button-container">
        <a href="${viewHistoryUrl}" class="button">Ver historial de accesos</a>
      </div>

      <hr class="divider">

      <p class="small-text">
        Si crees que este acceso no fue legítimo, por favor contacta a soporte inmediatamente.
        Guardamos un registro detallado de todos los accesos para tu seguridad.
      </p>
    </div>
  `;

  return {
    subject: '🚨 Acceso de emergencia a tu información - Sistema VIDA',
    html: wrapTemplate(content, `${name}, alguien accedió a tu información médica de emergencia`),
  };
}

export const emailTemplates = {
  emailVerification: emailVerificationTemplate,
  passwordReset: passwordResetTemplate,
  passwordChanged: passwordChangedTemplate,
  welcome: welcomeTemplate,
  subscriptionCreated: subscriptionCreatedTemplate,
  subscriptionCancelled: subscriptionCancelledTemplate,
  securityAlert: securityAlertTemplate,
  paymentFailed: paymentFailedTemplate,
  emergencyAccessNotification: emergencyAccessNotificationTemplate,
};

export default emailTemplates;
