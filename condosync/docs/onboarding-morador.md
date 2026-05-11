# Onboarding de morador — CondoSync

Este guia é para **síndicos e administradores** que precisam cadastrar moradores no CondoSync. O fluxo descrito aqui foi implementado na Q1 e elimina a necessidade de "passar senha manual" para o morador.

## Como funciona o fluxo

1. **Admin/síndico cadastra o morador** em `/moradores` informando nome, e-mail e unidade.
2. **O sistema cria automaticamente um convite** e envia um e-mail com link único para o morador.
3. **O morador clica no link** (válido por 72h por padrão) e cai em `/aceitar-convite/:token`.
4. Na tela de aceite, o morador define sua própria senha, opcionalmente preenche CPF/telefone e aceita os termos.
5. Após aceitar, o login é feito automaticamente e ele é levado para o dashboard. O e-mail é marcado como verificado.

> **Nada de "senha temporária"**. O CondoSync continua criando um usuário com senha aleatória nos bastidores, mas o morador nunca vê essa senha — ele só passa pelo fluxo do convite.

## Onde acompanhar os convites

Vá em **Configurações → Convites** (`/convites`).

Você vê todos os convites do condomínio com os seguintes status:

| Status | O que significa |
|---|---|
| **Pendente** | Foi enviado, ainda dentro do prazo, mas não foi aceito. |
| **Aceito** | Morador concluiu o cadastro. Aparece com data de aceite. |
| **Expirado** | Passou de 72h sem ser aceito. Você pode reenviar (gera novo token). |
| **Revogado** | Foi cancelado manualmente. O link enviado deixa de funcionar. |

## Ações disponíveis por convite

- **Reenviar** (`RefreshCw` ícone): gera um novo token e envia um novo e-mail. Limite de 3 reenvios por hora para o mesmo destinatário (anti-spam).
- **Revogar** (`Trash2` ícone): invalida imediatamente o link. Útil se o e-mail foi para a pessoa errada.

## Convidando staff (não-moradores)

Para convidar síndico, administrador, conselheiro, porteiro ou prestador:

1. Em `/convites` clique em **Novo convite**.
2. Escolha o papel.
3. Para `RESIDENT`, é obrigatório selecionar a unidade. Para os demais papéis, basta e-mail + nome.

Apenas **SUPER_ADMIN** pode convidar outro SUPER_ADMIN.

## Login do morador

Depois que ele aceitou o convite, no dia-a-dia ele pode entrar de duas formas:

1. **E-mail OU CPF + senha** — a tela de login aceita os dois.
2. **Passkey / biometria** — se ele registrou a passkey em **Meu Perfil → Passkeys**, pode entrar com Face ID, Touch ID ou Windows Hello sem digitar senha.

## Push notifications

Em **Meu Perfil → Notificações push**, o morador habilita receber avisos em tempo real (mesmo com o app fechado):

- Encomenda recebida na portaria
- Visitante autorizado / chegou
- Cobrança próxima do vencimento
- Comunicados, multas, manutenções

> O push só funciona se as chaves VAPID estiverem configuradas no servidor. Sem isso, o card aparece desativado e o sistema cai apenas em e-mail + in-app.

## Boas práticas

- **Cadastre o e-mail correto na primeira vez.** Se errar, revogue o convite anterior antes de criar um novo no e-mail certo.
- **Oriente o morador a procurar na caixa de spam** se não receber. O remetente é `convite@condosync.com.br` (ajuste conforme seu domínio Resend).
- **Convites expiram em 72h.** Se você cadastrou em massa e alguns moradores demoraram, use o filtro "Expirado" e clique em **Reenviar** para gerar novos tokens.
- **CPF é opcional, mas recomendado** — moradores com CPF cadastrado podem entrar com CPF em vez de e-mail (mais fácil de lembrar).

## Solução de problemas

| Sintoma | Causa provável | Como resolver |
|---|---|---|
| Morador clica no link e vê "Convite expirado" | Passou de 72h | Reenvie pela tela de convites |
| Morador clica no link e vê "Convite já utilizado" | Ele já aceitou (ou outra pessoa com acesso ao e-mail) | Pedir reset de senha em `/forgot-password` |
| E-mail não chegou em 5 minutos | Resend não está configurado ou domínio sem DNS | Verifique env `RESEND_API_KEY` e SPF/DKIM do domínio |
| Erro 429 ao reenviar | Rate-limit (3/h por destinatário) | Aguarde alguns minutos |

## Para o time de desenvolvimento

- Endpoints: `apps/api/src/modules/invitations/invitation.routes.ts`
- Lógica: `apps/api/src/modules/invitations/invitation.service.ts`
- Template do email: `apps/api/src/modules/invitations/invitation.email.ts`
- Tela pública: `apps/web/src/pages/auth/AcceptInvitePage.tsx`
- Painel admin: `apps/web/src/pages/admin/InvitationsPage.tsx`
- Tests: `apps/api/src/modules/invitations/invitation.service.test.ts`
- Métricas Prometheus: `invitations_total{status=created|resent|accepted|revoked|email_failed}`
