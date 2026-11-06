import { Resend } from 'resend';

const FROM_EMAIL = 'EstadísticAI <software@escueladeinvestigacion.com>';
const REPLY_TO = 'formacion@escueladeinvestigacion.com';

interface CredentialsEmailParams {
  to: string;
  name: string | null;
  password: string | null;
  plan: string;
  creditos: number;
  appUrl: string;
}

const PLAN_LABELS: Record<string, string> = {
  basico: 'Investigador',
  pro: 'Investigador Pro',
  recarga: 'Recarga de créditos',
};

export async function sendCredentialsEmail(params: CredentialsEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY no configurada, no se envía email de credenciales.');
    return;
  }

  const resend = new Resend(apiKey);
  const greeting = params.name ? params.name.split(' ')[0] : 'Investigador/a';
  const planLabel = PLAN_LABELS[params.plan] ?? params.plan;

  const isNewUser = !!params.password;
  const subject = isNewUser
    ? 'Bienvenido/a a EstadísticAI — Tus datos de acceso'
    : `EstadísticAI — ${params.creditos} análisis acreditados a tu cuenta`;

  const introText = isNewUser
    ? `Tu compra del plan <strong>${planLabel}</strong> ha sido procesada exitosamente.
                A continuaci&oacute;n encontrar&aacute;s tus datos de acceso a la plataforma de
                an&aacute;lisis estad&iacute;stico asistido por inteligencia artificial.`
    : `Se han acreditado <strong>${params.creditos} an&aacute;lisis</strong> a tu cuenta
                con el plan <strong>${planLabel}</strong>. Ya puedes usarlos desde la plataforma.`;

  const passwordRow = isNewUser
    ? `<tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                          <p style="margin: 0 0 2px; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Contrase&ntilde;a</p>
                          <p style="margin: 0; font-size: 18px; color: #1e293b; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px; background: #eef2ff; display: inline-block; padding: 6px 14px; border-radius: 6px;">${params.password}</p>
                        </td>
                      </tr>`
    : '';

  const ctaSubtext = isNewUser
    ? 'Copia tu correo y contrase&ntilde;a, luego haz clic en el bot&oacute;n'
    : 'Ingresa con tu correo y contrase&ntilde;a habitual';

  const stepsHtml = isNewUser
    ? `<tr>
            <td style="background: #ffffff; padding: 0 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fefce8; border: 1px solid #fde68a; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #92400e;">Primeros pasos</p>
                    <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: #78350f; line-height: 1.8;">
                      <li>Haz clic en <em>&ldquo;Ingresar a la plataforma&rdquo;</em></li>
                      <li>Ingresa tu correo y contrase&ntilde;a</li>
                      <li>Sube tu archivo de datos (Excel o CSV)</li>
                      <li>Selecciona el tipo de an&aacute;lisis y obt&eacute;n tu informe APA 7</li>
                    </ol>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : '';

  const footerText = isNewUser
    ? 'Tu contrase&ntilde;a es permanente. Si deseas cambiarla, puedes hacerlo desde la plataforma.'
    : 'Tus cr&eacute;ditos se han sumado a los que ya ten&iacute;as.';

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    replyTo: REPLY_TO,
    to: params.to,
    subject,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f0f0f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f0f5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header con gradiente -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">EstadísticAI</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 400;">Escuela de Investigaci&oacute;n Cient&iacute;fica</p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="background: #ffffff; padding: 36px 32px 20px;">
              <p style="margin: 0 0 20px; font-size: 17px; color: #1e293b; line-height: 1.5;">
                Hola <strong>${greeting}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #475569; line-height: 1.7;">
                ${introText}
              </p>

              <!-- Tarjeta de credenciales -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px 24px 8px;">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">${isNewUser ? 'Datos de acceso' : 'Tu cuenta'}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                          <p style="margin: 0 0 2px; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Correo electr&oacute;nico</p>
                          <p style="margin: 0; font-size: 15px; color: #1e293b; font-weight: 600;">${params.to}</p>
                        </td>
                      </tr>
                      ${passwordRow}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 24px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%">
                          <p style="margin: 0 0 2px; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Plan</p>
                          <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 600;">${planLabel}</p>
                        </td>
                        <td width="50%">
                          <p style="margin: 0 0 2px; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">An&aacute;lisis disponibles</p>
                          <p style="margin: 0; font-size: 22px; color: #4f46e5; font-weight: 700;">${params.creditos}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bot&oacute;n CTA -->
          <tr>
            <td style="background: #ffffff; padding: 8px 32px 36px; text-align: center;">
              <a href="${params.appUrl}/iniciar-sesion" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-size: 16px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(79,70,229,0.35);">
                Ingresar a la plataforma &rarr;
              </a>
              <p style="margin: 16px 0 0; font-size: 13px; color: #94a3b8;">
                ${ctaSubtext}
              </p>
            </td>
          </tr>

          <!-- Instrucciones (solo nuevos usuarios) -->
          ${stepsHtml}

          <!-- Separador + footer -->
          <tr>
            <td style="background: #ffffff; border-radius: 0 0 16px 16px; padding: 0 32px 32px;">
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 20px;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6; text-align: center;">
                ${footerText}<br>
                Si tienes alguna pregunta, responde directamente a este correo.
              </p>
            </td>
          </tr>

          <!-- Branding -->
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #64748b; font-weight: 600;">Escuela de Investigaci&oacute;n Cient&iacute;fica</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} EstadísticAI &mdash; An&aacute;lisis estad&iacute;stico asistido por IA
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    console.error('[email] Error al enviar credenciales:', JSON.stringify(error));
  } else {
    console.log('[email] Credenciales enviadas a', params.to);
  }
}
