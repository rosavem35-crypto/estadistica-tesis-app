import { Resend } from 'resend';

const FROM_EMAIL = 'EstadísticAI <software@escueladeinvestigacion.com>';

interface CredentialsEmailParams {
  to: string;
  name: string | null;
  password: string;
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
  const greeting = params.name ? `Hola ${params.name}` : 'Hola';
  const planLabel = PLAN_LABELS[params.plan] ?? params.plan;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `Tus credenciales de acceso — EstadísticAI (${planLabel})`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; background: #f8fafc;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #4f46e5; font-size: 24px; margin: 0;">EstadísticAI</h1>
      <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">Análisis estadístico asistido por IA</p>
    </div>

    <p style="font-size: 16px;">${greeting},</p>
    <p style="font-size: 15px; line-height: 1.6;">
      Tu compra ha sido procesada exitosamente. Ya puedes acceder a la plataforma
      con las siguientes credenciales:
    </p>

    <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">CORREO ELECTRÓNICO</td>
          <td style="padding: 8px 0; font-size: 15px; font-weight: 600;">${params.to}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">CONTRASEÑA</td>
          <td style="padding: 8px 0; font-size: 15px; font-weight: 600; font-family: monospace; letter-spacing: 1px;">${params.password}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">PLAN</td>
          <td style="padding: 8px 0; font-size: 15px;">${planLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">ANÁLISIS DISPONIBLES</td>
          <td style="padding: 8px 0; font-size: 15px; font-weight: 600; color: #4f46e5;">${params.creditos}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${params.appUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
        Acceder a EstadísticAI
      </a>
    </div>

    <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
      Te recomendamos cambiar tu contraseña después de tu primer inicio de sesión.
      Si tienes alguna duda, responde a este correo.
    </p>
  </div>

  <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">
    Escuela de Investigación Científica<br>
    Este correo fue enviado porque realizaste una compra en nuestra plataforma.
  </p>
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
