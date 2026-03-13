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

**Status:** `[ ] Pendente`  
**Descricao:** Sistema de chamados/tickets onde o morador abre uma solicitacao e a administracao responde. Diferente dos comunicados em broadcast.  
**Observacao:** `communication/` hoje cobre broadcast; faltaria um modulo de tickets com thread de mensagens.  
**Esforco estimado:** Medio-alto (novo modulo completo)

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

**Status:** `[ ] Pendente`  
**Descricao:** Integracao com gateway financeiro (ex.: Asaas, PJBank, Inter Empresas) para emissao de boleto registrado diretamente pelo sistema.  
**Observacao:** O modulo `finance/` tem as cobrancas. Falta o gateway de pagamento.  
**Esforco estimado:** Alto (integracao com API bancaria + conciliacao)

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

**Status:** `[ ] Pendente`  
**Descricao:** Album de fotos das areas comuns, eventos e obras. Organizado por categoria e visivel para moradores.  
**Esforco estimado:** Baixo-medio (upload + galeria)

---

### [MEL-11] Assistente IA para sindico

**Status:** `[ ] Pendente`  
**Descricao:** Integracao com OpenAI/Claude para ajudar o sindico a rascunhar comunicados, responder duvidas e gerar relatorios financeiros em linguagem natural.  
**Esforco estimado:** Medio (integracao API + UI de chat)

---

### [MEL-12] Controle de acesso por papel (RBAC) no frontend

**Status:** `[~] Em andamento - Marco/2026`  
**Prioridade:** Alta - problema de seguranca identificado.

**O que ja foi feito:**

- Criado `RoleGuard` no `App.tsx` para proteger grupos de rotas por papel
- Portaria, financeiro, manutencao, relatorios, obras, funcionarios, prestadores e area de super admin ja estao protegidos por role
- Ajustes pontuais no menu lateral para ocultar itens incompatveis com o papel logado

**Ainda pendente:**

- Aplicar `roles` explicito a todos os itens do `Sidebar`
- Fechar as rotas ainda abertas sem guard especifico, como documentos, areas comuns e partes da comunicacao
- Separar melhor a experiencia de morador, porteiro e administracao
- Dashboard simplificado para morador

**Esforco estimado:** Medio (refatoracao de rotas + sidebar + dashboard condicional)

---

## Ordem de execucao sugerida

| #  | Item                                             | Prioridade   | Esforco     |
|----|--------------------------------------------------|--------------|-------------|
| 1  | ~~MEL-01 - Notificacoes email encomendas/visitantes~~ | Concluido    | -           |
| 2  | ~~MEL-02 - Pre-autorizacao de visitantes~~       | Concluido    | -           |
| 3  | ~~MEL-09 - PWA~~                                 | Concluido    | -           |
| 4  | ~~MEL-03 - Manutencao preventiva~~               | Concluido    | Medio-alto  |
| 5  | ~~MEL-05 - Documentos para download~~            | Concluido    | Medio       |
| 6  | MEL-04 - Autorizacao de obras                    | Media        | Medio       |
| 7  | MEL-12 - Controle de acesso por papel (RBAC)     | Alta         | Medio       |
| 8  | ~~MEL-07 - Controle de estoque~~                 | Concluido    | Medio       |
| 9  | MEL-06 - Mensagens individuais                   | Media        | Medio-alto  |
| 10 | MEL-10 - Galeria de fotos                        | Baixa        | Baixo       |
| 11 | MEL-08 - Boleto bancario integrado               | Alta (valor) | Alto        |
| 12 | MEL-11 - Assistente IA                           | Diferencial  | Medio       |
