# CondoSync - Roadmap de Melhorias

Analise comparativa com concorrente (organizemeucondominio.com.br) - Marco 2026

---

## Curto prazo - Alto impacto, baixo esforco

### [MEL-01] Notificacoes automaticas por email em encomendas e visitantes

**Status:** `[x] Concluido - Marco/2026`  
**Descricao:** Ao registrar uma nova encomenda ou autorizar um visitante, enviar email automatico ao morador da unidade.  
**Solucao:** Adicionado servico **Mailpit** ao `docker-compose.yml` como servidor SMTP local (porta 1025). As notificacoes `['inapp', 'email']` ja estavam implementadas no codigo; faltava apenas a configuracao SMTP no ambiente.  
**Visualizar emails (dev):** `http://localhost:8025`

---

### [MEL-02] Pre-autorizacao de visitantes pelos moradores

**Status:** `[x] Concluido - Marco/2026`  
**Descricao:** Morador cadastra antecipadamente visitantes esperados pelo portal. Ao chegar na portaria, o visitante ja aparece com status `AUTHORIZED`, eliminando espera.  
**Solucao:** Criada pagina `MyVisitorsPage` em `/minha-portaria/visitantes`. Morador ve historico da unidade, pre-autoriza com formulario completo (nome, documento, telefone, motivo, data/hora agendada) e pode cancelar pre-autorizacoes pendentes. Menu lateral "Minha Portaria" visivel apenas para role `RESIDENT`.

---

## Medio prazo - Alto impacto, esforco moderado

### [MEL-03] Calendario de manutencao preventiva com alertas

**Status:** `[x] Concluido - Marco/2026`  
**Descricao:** Configurar equipamentos do condominio (elevador, bomba, caixa d'agua, AVCB, SPDA) com periodicidade de manutencao. Sistema dispara alertas automaticos antes do vencimento.  
**O que foi feito:**

- Backend: CRUD completo de `MaintenanceSchedule` (POST / GET / PATCH / PATCH `/done` / DELETE soft)
- Calculo automatico de `nextDueDate` ao marcar como feito (diario / semanal / quinzenal / mensal / trimestral / semestral / anual)
- Worker BullMQ diario (cron `0 7 * * *`) que enfileira notificacoes in-app + email para agendamentos vencidos ou com prazo <= 7 dias
- Frontend: aba "Preventiva" na pagina de Manutencao com badges de status (Vencido / Vence em Nd / Em dia), CRUD de schedules e botao "Marcar como Feita"

**Esforco estimado:** Medio-alto (novo modelo + scheduler + UI)

---

### [MEL-04] Autorizacao de obras e prestadores por unidade

**Status:** `[~] Parcial - Marco/2026`  
**Descricao:** Morador registra reforma em andamento na sua unidade e lista os prestadores autorizados a entrar. O nucleo de cadastro e aprovacao esta implementado, mas o fluxo operacional da portaria ainda precisa consultar e usar essa autorizacao na entrada.  
**O que foi feito:**

- Modelos Prisma: `Renovation` (tipo, datas, status PENDING/APPROVED/IN_PROGRESS/COMPLETED/REJECTED, motivo de reprovacao) + `RenovationProvider` (nome, servico, CPF/CNPJ, telefone, empresa)
- Backend: `POST /renovations`, `GET /renovations/unit/:unitId`, `GET /renovations/condominium/:condominiumId`, `PATCH /renovations/:id/approve`, `PATCH /renovations/:id/status`, `DELETE /renovations/:id`, `POST /renovations/:id/providers`, `DELETE /renovations/:id/providers/:providerId`
- Seguranca: acesso por unidade/condominio validado para morador e administracao; morador so pode operar na propria unidade/obra
- Frontend morador: `MinhasObrasPage` em `/minha-portaria/obras` cria solicitacao, adiciona/remove prestadores e atualiza status
- Frontend admin/sindico: `ObrasAdminPage` em `/obras` lista obras com filtros por status, aprovacao/reprovacao com motivo e detalhes dos prestadores
- Menu "Minhas Obras" adicionado em "Minha Portaria" (RESIDENT); menu "Obras" adicionado para CONDOMINIUM_ADMIN/SYNDIC/SUPER_ADMIN

**Pendente para concluir de fato:**

- Fluxo de portaria para cruzar prestadores autorizados da obra no momento da entrada

**Esforco estimado:** Medio (novo modelo `Renovation` + portal morador + fluxo administrativo)

---

### [MEL-05] Documentos para download

**Status:** `[x] Concluido - Marco/2026`  
**Descricao:** Sindico carrega documentos (ata de assembleia, convencao, regulamento interno, boletos) e moradores baixam pelo portal.  
**O que foi feito:**

- Modelo `CondominiumDocument` adicionado ao Prisma schema (title, description, category, fileName, filePath, fileSize, mimeType, uploadedBy)
- Volume Docker `uploads_data` montado em `/app/uploads` para persistencia
- Backend: `POST /documents/:condominiumId` (upload com multer, admin only), `GET /documents/:condominiumId` (listagem com filtro por categoria), `GET /documents/:condominiumId/:id/download` (streaming autenticado), `DELETE /documents/:condominiumId/:id` (delete fisico + registro, admin only)
- Seguranca: tipos permitidos (PDF, Word, Excel, imagens), limite 10 MB, nomes UUID no disco, download exige autenticacao
- Frontend: pagina `DocumentsPage` com filtros por categoria, lista de documentos com botao "Baixar", modal de upload por seletor de arquivo e exclusao com confirmacao

**Esforco estimado:** Medio (CRUD simples + upload de arquivo)

---

### [MEL-06] Mensagens individuais morador <-> administracao

**Status:** `[x] Concluido - Marco/2026`  
**Descricao:** Sistema de chamados/tickets com thread de mensagens entre morador e administracao.  
**O que foi feito:**

- Modelos Prisma: `Ticket` e `TicketMessage` (enums: `TicketStatus`, `TicketPriority`, `TicketCategory`)
- Backend: listar tickets (staff vê todos, morador vê apenas os seus), detalhe com thread, criar ticket, responder, atualizar status/prioridade, excluir
- Seguranca: criacao aberta a qualquer usuario autenticado do condominio; resposta e status restrito ao criador ou staff; atualizacao de status/atribuicao apenas para staff
- Frontend: `TicketsPage` em `/chamados` com filtros por status e categoria, thread de mensagens estilo chat (Enter para enviar), indicadores de status com icones e badges coloridos
- Navegacao: item "Chamados" adicionado ao menu (visivel a todos)

**Esforco estimado:** Medio-alto

---

### [MEL-07] Controle de estoque

**Status:** `[x] Concluido - Marco/2026`  
**Descricao:** Registro de materiais de limpeza, manutencao e outros insumos, com entrada/saida e alerta visual de estoque baixo.
**O que foi feito:**

- Modelos Prisma: `StockItem` e `StockMovement`
- Backend: listagem por condominio, criacao, edicao, exclusao, registro de movimentacao (`IN`, `OUT`, `ADJUSTMENT`) e historico por item
- Seguranca: acesso validado por condominio e por item; operacoes restritas a CONDOMINIUM_ADMIN, SYNDIC e SUPER_ADMIN
- Frontend: `StockPage` em `/estoque` com filtros por categoria, destaque para estoque baixo, modal de criacao/edicao, movimentacao e historico
- Navegacao: item "Estoque" adicionado ao menu e rota protegida por `RoleGuard`

**Esforco estimado:** Medio

---

## Longo prazo - Estrategico

### [MEL-08] Integracao de boleto bancario (sem remessa/retorno)

**Status:** `[x] Concluido - Marco/2026`  
**Descricao:** Integracao com gateway financeiro Asaas para emissao de boleto registrado, PIX e link de pagamento diretamente pelo sistema.  
**Esforco estimado:** Alto (integracao com API bancaria + conciliacao)

**O que foi feito:**

- Gateway Asaas ja existia (`AsaasService`) com suporte a boleto, PIX e link de pagamento; webhook de conciliacao automatica tambem existia
- Adicionado endpoint `GET /finance/charges/:id/detail` para retornar todos os campos de pagamento (boletoUrl, boletoCode, pixQrCode, pixCopyPaste, paymentLink, gatewayId)  
- Adicionado endpoint `POST /finance/charges/:id/sync` para sincronizacao manual de uma cobranca com o gateway (caso falha no sync automatico)
- Adicionado endpoint `PATCH /finance/accounts/:accountId/gateway` para configurar tipo e chave do gateway por conta financeira (MGMT apenas)
- Atualizado `ChargesPage` (admin/sindico): nova coluna "Pagamento" com botoes de link externo, boleto e PIX; botao de re-sync para cobranças sem gateway
- Modal PIX com QR Code (base64) e codigo copia-e-cola com botao de copiar
- Criada `MyChargesPage` para moradores: cards de resumo (total em aberto, pendentes, em atraso), historico filtrado por status, botoes de pagamento (Pagar Online / Ver Boleto / PIX) por cobranca
- Sidebar: item "Minhas Cobranças" dentro do menu "Minha Portaria" (RESIDENT apenas)
- Rota `/minhas-cobranças` protegida por `RoleGuard roles=["RESIDENT"]`

---

### [MEL-09] PWA / App mobile

**Status:** `[x] Concluido - Marco/2026`  
**Descricao:** Frontend transformavel em Progressive Web App (instalavel no celular/desktop).  
**Solucao:**

- `vite-plugin-pwa` ja estava configurado e `registerSW` em `main.tsx`
- Gerados icones `pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png` e `masked-icon.svg`
- Adicionados `start_url` e `scope`; cache runtime da API autenticada foi removido para evitar reaproveitamento indevido de dados privados
- Service worker ativo em `/sw.js`, manifest em `/manifest.webmanifest`
- Para instalar: abrir `http://localhost` no Chrome/Edge e clicar no icone de instalacao na barra de enderecos

---

### [MEL-10] Galeria de fotos do condominio

**Status:** `[x] Concluido - Marco/2026`  
**Descricao:** Album de fotos das areas comuns, eventos e obras. Organizado por categoria e visivel para moradores.  
**Esforco estimado:** Baixo-medio (upload + galeria)

**O que foi feito:**

- Modelo `Photo` no schema Prisma com campos: titulo, descricao, categoria, fileName, fileSize, mimeType, uploadedBy
- Backend com 4 endpoints: listar (com filtro por categoria), upload (multer, imagens ate 10MB), stream do arquivo (autenticado, com Cache-Control), deletar (MGMT apenas)
- Armazenamento no volume Docker `uploads_data` em `/app/uploads/:condoId/gallery/`
- Frontend com grid responsivo (2 a 5 colunas), thumbnails carregados via blob URL autenticado com React Query
- Lightbox com navegacao por teclado (Escape, setas), contador de fotos e botao de delete para gestao
- Modal de upload com drag-and-drop, validacao de tipo/tamanho e preview de nome
- Tabs de filtro por categoria: Todas / Areas Comuns / Eventos / Obras / Outro
- Barra de estatisticas com contagem por categoria
- Sidebar: item "Galeria" com icone Image (visivel para todos os usuarios)
- Rota `/galeria` registrada no App.tsx

---

### [MEL-11] Assistente IA para sindico

**Status:** `[x] Concluido - Marco/2026`  
**Descricao:** Integracao com OpenAI (GPT-4o-mini) para ajudar o sindico a rascunhar comunicados, responder duvidas e interpretar dados financeiros e operacionais em linguagem natural.  
**Esforco estimado:** Medio (integracao API + UI de chat)

**O que foi feito:**

- Backend: `POST /ai/chat` que injeta contexto real do condominio (financeiro do mes, ordens abertas, chamados, manutencoes proximas) no system prompt antes de chamar a OpenAI
- Backend: `GET /ai/status` para verificar se a API Key esta configurada
- Sem dependencia nova: usa axios (ja existia) para chamar a API OpenAI diretamente
- Variaveis de ambiente: `OPENAI_API_KEY` (opcional) e `OPENAI_MODEL` (default: gpt-4o-mini) em `env.ts` e `docker-compose.yml`
- Endpoint protegido: apenas CONDOMINIUM_ADMIN, SYNDIC e SUPER_ADMIN (authorize middleware)
- Frontend: componente `AiAssistantChat` — botao flutuante azul/indigo no canto inferior direito, visivel apenas para roles MGMT
- Chat panel deslizante com historico de conversa, sugestoes de perguntas rapidas, indicador de carregamento e estado de erro
- Botao de limpar conversa, atalho Enter para enviar (Shift+Enter para nova linha)
- Montado no `AppLayout` (global em todas as paginas autenticadas)
- Graceful degradation: se a API Key nao estiver configurada, exibe mensagem informativa em vez de travar

**Para ativar:** Definir `OPENAI_API_KEY` no `docker-compose.yml` e rebuildar o container `api`.

---

### [MEL-12] Controle de acesso por papel (RBAC) no frontend

**Status:** `[x] Concluido - Marco/2026`  
**Prioridade:** Alta - problema de seguranca identificado.

**O que foi feito:**

- `RoleGuard` no `App.tsx` protege todas as rotas sensiveis por papel
- Portaria, financeiro, manutencao, relatorios, obras, funcionarios, prestadores e area de super admin protegidos por `RoleGuard`
- Rotas abertas a todos autenticados (`/areas-comuns`, `/documentos`, `/chamados`, `/galeria`, comunicacao) permitem acesso correto a moradores
- Sidebar filtra itens por `roles` (moradores nao veem Portaria/Financeiro/Obras/etc.; staff nao vee "Minha Portaria")
- `ResidentDashboard` separado: morador ve cards de encomendas aguardando, reservas, ocorrencias abertas e **chamados abertos** (com query dedicada), alem de atalhos rapidos para todas as funcionalidades relevantes (Pre-autorizar Visita, Minhas Obras, Reservar Area, Documentos, Ocorrencias, Achados, Chamados, Galeria)
- DOORMAN ve dashboard operacional completo (visitantes, encomendas, manutencao)
- Imports nao utilizados (`Car`, `Video`) removidos do Sidebar

**Esforco estimado:** Medio (refatoracao de rotas + sidebar + dashboard condicional)

---

## Ordem de execucao sugerida

| #   | Item                                                  | Prioridade   | Esforco    |
| --- | ----------------------------------------------------- | ------------ | ---------- |
| 1   | ~~MEL-01 - Notificacoes email encomendas/visitantes~~ | Concluido    | -          |
| 2   | ~~MEL-02 - Pre-autorizacao de visitantes~~            | Concluido    | -          |
| 3   | ~~MEL-09 - PWA~~                                      | Concluido    | -          |
| 4   | ~~MEL-03 - Manutencao preventiva~~                    | Concluido    | Medio-alto |
| 5   | ~~MEL-05 - Documentos para download~~                 | Concluido    | Medio      |
| 6   | MEL-04 - Autorizacao de obras                         | Media        | Medio      |
| 7   | ~~MEL-12 - Controle de acesso por papel (RBAC)~~      | Concluido    | Medio      |
| 8   | ~~MEL-07 - Controle de estoque~~                      | Concluido    | Medio      |
| 9   | ~~MEL-06 - Mensagens individuais~~                    | Concluido    | Medio-alto |
| 10  | ~~MEL-10 - Galeria de fotos~~                         | Concluido    | Baixo      |
| 11  | ~~MEL-08 - Boleto bancario integrado~~                | Concluido    | Alto       |
| 12  | ~~MEL-11 - Assistente IA~~                            | Concluido    | Medio      |
