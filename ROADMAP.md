# CondoSync — Roadmap de Melhorias

Análise comparativa com concorrente (organizemeucondominio.com.br) — Março 2026

---

## 🔴 Curto prazo — Alto impacto, baixo esforço

### [MEL-01] Notificações automáticas por email em encomendas e visitantes

**Status:** `[x] Concluído — Março/2026`  
**Descrição:** Ao registrar uma nova encomenda ou autorizar um visitante, enviar e-mail automático ao morador da unidade.  
**Solução:** Adicionado serviço **Mailpit** ao `docker-compose.yml` como servidor SMTP local (porta 1025). As notificações `['inapp', 'email']` já estavam implementadas no código — faltava apenas a configuração SMTP no ambiente.  
**Visualizar emails (dev):** `http://localhost:8025`

---

### [MEL-02] Pré-autorização de visitantes pelos moradores

**Status:** `[x] Concluído — Março/2026`  
**Descrição:** Morador cadastra antecipadamente visitantes esperados pelo portal. Ao chegar na portaria, o visitante já aparece com status `AUTHORIZED`, eliminando espera.  
**Solução:** Criada página `MyVisitorsPage` em `/minha-portaria/visitantes`. Morador vê histórico da unidade, pré-autoriza com formulário completo (nome, documento, telefone, motivo, data/hora agendada) e pode cancelar pré-autorizações pendentes. Menu lateral "Minha Portaria" visível apenas para role `RESIDENT`.

---

## 🟡 Médio prazo — Alto impacto, esforço moderado

### [MEL-03] Calendário de manutenção preventiva com alertas

**Status:** `[x] Concluído`  
**Descrição:** Configurar equipamentos do condomínio (elevador, bomba, caixa d'água, AVCB, SPDA) com periodicidade de manutenção. Sistema dispara alertas automáticos antes do vencimento.  
**O que foi feito:**

- Backend: CRUD completo de `MaintenanceSchedule` (POST / GET / PATCH / PATCH `/done` / DELETE soft)
- Cálculo automático de `nextDueDate` ao marcar como feito (diário / semanal / quinzenal / mensal / trimestral / semestral / anual)
- Worker BullMQ diário (cron `0 7 * * *`) que enfileira notificações in-app + email para agendamentos vencidos ou com prazo ≤ 7 dias
- Frontend: aba "Preventiva" na página de Manutenção com badges de status (Vencido / Vence em Nd / Em dia), CRUD de schedules e botão "Marcar como Feita"

**Esforço estimado:** Médio-alto (novo modelo + scheduler + UI)

---

### [MEL-04] Autorização de obras e prestadores por unidade

**Status:** `[x] Concluído — Março/2026`  
**Descrição:** Morador registra reforma em andamento na sua unidade e lista os prestadores autorizados a entrar. Porteiro só libera acesso aos prestadores previamente registrados.  
**O que foi feito:**

- Modelos Prisma: `Renovation` (tipo, datas, status PENDING/APPROVED/IN_PROGRESS/COMPLETED/REJECTED, motivo reprovação) + `RenovationProvider` (nome, serviço, CPF/CNPJ, telefone, empresa)
- Backend: `POST /renovations`, `GET /renovations/unit/:unitId`, `GET /renovations/condominium/:condominiumId`, `PATCH /renovations/:id/approve`, `PATCH /renovations/:id/status`, `DELETE /renovations/:id`, `POST /renovations/:id/providers`, `DELETE /renovations/:id/providers/:providerId`
- Frontend morador: `MinhasObrasPage` em `/minha-portaria/obras` — cria solicitação, adiciona/remove prestadores, atualiza status (Iniciar/Concluir)
- Frontend admin/síndico: `ObrasAdminPage` em `/obras` — lista todas obras com filtros por status, aprovação/reprovação com motivo, accordion com detalhes e prestadores
- Menu "Minhas Obras" adicionado em "Minha Portaria" (RESIDENT); menu "Obras" adicionado para CONDOMINIUM_ADMIN/SYNDIC/SUPER_ADMIN

**Esforço estimado:** Médio (novo modelo `Renovation` + tela portaria + portal morador)

---

### [MEL-05] Documentos para download

**Status:** `[x] Concluído — Março/2026`  
**Descrição:** Síndico carrega documentos (ata de assembleia, convenção, regulamento interno, boletos) e moradores baixam pelo portal.  
**O que foi feito:**

- Modelo `CondominiumDocument` adicionado ao Prisma schema (title, description, category, fileName, filePath, fileSize, mimeType, uploadedBy)
- Volume Docker `uploads_data` montado em `/app/uploads` para persistência
- Backend: `POST /documents/:condominiumId` (upload com multer, admin only), `GET /documents/:condominiumId` (listagem com filtro por categoria), `GET /documents/:condominiumId/:id/download` (streaming autenticado), `DELETE /documents/:condominiumId/:id` (delete físico + registro, admin only)
- Segurança: tipos permitidos (PDF, Word, Excel, imagens), limite 10 MB, nomes UUID no disco, download exige autenticação
- Frontend: página `DocumentsPage` com filtros por categoria (ata, convenção, regulamento, boleto, comunicado, outro), lista de documentos com botão "Baixar", modal de upload com drag-drop, exclusão com confirmação

**Esforço estimado:** Médio (CRUD simples + upload de arquivo)

---

### [MEL-06] Mensagens individuais morador ↔ administração

**Status:** `[ ] Pendente`  
**Descrição:** Sistema de chamados/tickets onde o morador abre uma solicitação e a administração responde. Diferente dos comunicados em broadcast.  
**Observação:** `communication/` é só broadcast. Precisaria de um módulo de tickets com thread de mensagens.  
**Esforço estimado:** Médio-alto (novo módulo completo)

---

### [MEL-07] Controle de estoque

**Status:** `[ ] Pendente`  
**Descrição:** Registro de materiais de limpeza, manutenção e outros insumos. Entrada/saída e alertas de estoque baixo.  
**Esforço estimado:** Médio (CRUD + relatório de consumo)

---

## 🟢 Longo prazo — Estratégico

### [MEL-08] Integração de boleto bancário (sem remessa/retorno)

**Status:** `[ ] Pendente`  
**Descrição:** Integração com gateway financeiro (ex.: Asaas, PJBank, Inter Empresas) para emissão de boleto registrado diretamente pelo sistema.  
**Observação:** O módulo `finance/` tem as cobranças. Falta o gateway de pagamento.  
**Esforço estimado:** Alto (integração com API bancária + conciliação)

---

### [MEL-09] PWA / App mobile

**Status:** `[x] Concluído — Março/2026`  
**Descrição:** Frontend transformável em Progressive Web App (instalável no celular/desktop).  
**Solução:**

- `vite-plugin-pwa` já estava configurado e `registerSW` em `main.tsx`
- Gerados ícones `pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png` e `masked-icon.svg` a partir do logo existente
- Adicionados `start_url`, `scope` e `runtimeCaching` (NetworkFirst para `/api/v1/*`)
- Service worker ativo em `/sw.js`, manifest em `/manifest.webmanifest`
- Para instalar: abrir `http://localhost` no Chrome/Edge e clicar no ícone de instalação na barra de endereços

---

### [MEL-10] Galeria de fotos do condomínio

**Status:** `[ ] Pendente`  
**Descrição:** Álbum de fotos das áreas comuns, eventos e obras. Organizado por categoria e visível para moradores.  
**Esforço estimado:** Baixo-médio (upload + galeria)

---

### [MEL-11] Assistente IA para síndico

**Status:** `[ ] Pendente`  
**Descrição:** Integração com OpenAI/Claude para ajudar o síndico a rascunhar comunicados, responder dúvidas e gerar relatórios financeiros em linguagem natural.  
**Esforço estimado:** Médio (integração API + UI de chat)

---

## Ordem de execução sugerida

| #     | Item                                                  | Prioridade   | Esforço        |
| ----- | ----------------------------------------------------- | ------------ | -------------- |
| 1     | ~~MEL-01 — Notificações email encomendas/visitantes~~ | ✅ Concluído | —              |
| 2     | ~~MEL-02 — Pré-autorização de visitantes~~            | ✅ Concluído | —              |
| 3     | ~~MEL-09 — PWA (push notifications)~~                 | ✅ Concluído | —              |
| ~~4~~ | ~~MEL-03 — Manutenção preventiva~~                    | ~~Alta~~     | ~~Médio-alto~~ |
| ~~5~~ | ~~MEL-05 — Documentos para download~~                 | ~~Média~~    | ~~Médio~~      |
| 6     | MEL-04 — Autorização de obras                         | Média        | Médio          |
| 7     | MEL-07 — Controle de estoque                          | Média        | Médio          |
| 8     | MEL-06 — Mensagens individuais                        | Média        | Médio-alto     |
| 9     | MEL-10 — Galeria de fotos                             | Baixa        | Baixo          |
| 10    | MEL-08 — Boleto bancário integrado                    | Alta (valor) | Alto           |
| 11    | MEL-11 — Assistente IA                                | Diferencial  | Médio          |
