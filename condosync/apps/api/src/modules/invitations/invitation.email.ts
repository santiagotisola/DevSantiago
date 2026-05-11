import { env } from '../../config/env';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  CONDOMINIUM_ADMIN: 'Administrador',
  SYNDIC: 'Síndico',
  SUB_SYNDIC: 'Subsíndico',
  DOORMAN: 'Porteiro',
  RESIDENT: 'Morador',
  SERVICE_PROVIDER: 'Prestador',
  COUNCIL_MEMBER: 'Conselheiro',
  EMPLOYEE: 'Funcionário',
};

export interface InvitationEmailContext {
  inviteeName: string | null;
  condominiumName: string;
  inviterName: string;
  role: string;
  token: string;
  expiresAt: Date;
}

export function buildInvitationEmail({
  inviteeName,
  condominiumName,
  inviterName,
  role,
  token,
  expiresAt,
}: InvitationEmailContext): { subject: string; html: string } {
  const acceptUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/aceitar-convite/${token}`;
  const roleLabel = ROLE_LABELS[role] ?? role;
  const greetingName = inviteeName?.trim() || 'olá';
  const expiresLabel = expiresAt.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const subject = `Convite para acessar ${condominiumName} — CondoSync`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:28px;">🔑</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:700;">CondoSync</h1>
            <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Você foi convidado</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#475569;font-size:14px;">Olá, <strong>${escapeHtml(greetingName)}</strong>!</p>
            <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Acesso ao condomínio ${escapeHtml(condominiumName)}</h2>
            <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.6;">
              <strong>${escapeHtml(inviterName)}</strong> convidou você para acessar o CondoSync como
              <strong>${escapeHtml(roleLabel)}</strong>.
            </p>
            <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
              Clique no botão abaixo para confirmar seu cadastro e definir sua senha.
              O link é pessoal, intransferível e expira em <strong>${expiresLabel}</strong>.
            </p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${acceptUrl}" style="background:#3b82f6;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
                Aceitar convite
              </a>
            </div>
            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
              Se o botão não funcionar, copie e cole o endereço abaixo no seu navegador:<br>
              <a href="${acceptUrl}" style="color:#3b82f6;word-break:break-all;">${acceptUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">
              Se você não esperava este convite, ignore este e-mail.<br>
              CondoSync &mdash; gestão inteligente de condomínios.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
