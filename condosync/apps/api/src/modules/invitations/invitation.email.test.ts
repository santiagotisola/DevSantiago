import { describe, expect, it, vi } from 'vitest';

// Mock env — o link de aceite é montado a partir de env.FRONTEND_URL.
// Simulamos a URL pública de produção para garantir que o e-mail nunca
// embute localhost quando a variável está corretamente configurada.
vi.mock('../../config/env', () => ({
  env: {
    FRONTEND_URL: 'https://condosync.app',
  },
}));

import { buildInvitationEmail } from './invitation.email';

const baseContext = {
  inviteeName: 'Mario',
  condominiumName: 'Residencial Veredas do Bosque',
  inviterName: 'Super Admin',
  role: 'RESIDENT',
  token: 'MeS2vVkP9xksoX7Kal413IHamrJ8TqfhTDZ1noBss6w',
  expiresAt: new Date('2026-06-16T17:49:00Z'),
};

describe('buildInvitationEmail', () => {
  it('monta o link de aceite a partir da FRONTEND_URL pública (não localhost)', () => {
    const { html } = buildInvitationEmail(baseContext);

    const expectedUrl = `https://condosync.app/aceitar-convite/${baseContext.token}`;
    expect(html).toContain(`href="${expectedUrl}"`);
    expect(html).not.toContain('localhost');
  });

  it('coloca o token no path no formato que a rota /aceitar-convite/:token espera', () => {
    const { html } = buildInvitationEmail(baseContext);
    expect(html).toContain(`/aceitar-convite/${baseContext.token}`);
  });

  it('inclui o nome do condomínio e o papel traduzido no assunto/corpo', () => {
    const { subject, html } = buildInvitationEmail(baseContext);
    expect(subject).toContain('Residencial Veredas do Bosque');
    expect(html).toContain('Morador');
  });
});
