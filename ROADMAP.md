# CondoSync — Roadmap de Melhorias

Análise comparativa com concorrente (organizemeucondominio.com.br) — Março 2026

---

## 🔴 Curto prazo — Alto impacto, baixo esforço

### [MEL-01] Notificações automáticas por email em encomendas e visitantes
**Status:** `[ ] Pendente`  
**Descrição:** Ao registrar uma nova encomenda ou autorizar um visitante, enviar e-mail automático ao morador da unidade.  
**Observação:** A infraestrutura de notificações já existe (`apps/api/src/notifications/`). Verificar se os eventos de parcel/visitor já disparam notificação e ativar.  
**Esforço estimado:** Pequeno (verificar e ligar eventos)

---

### [MEL-02] Pré-autorização de visitantes pelos moradores
**Status:** `[ ] Pendente`  
**Descrição:** Morador deve poder cadastrar antecipadamente um visitante esperado (parentes, convidados para festa) diretamente pelo portal. O visitante chega à portaria já com status `AUTHORIZED`, reduzindo tempo de espera.  
**Observação:** O backend `visitors/` já tem os status necessários. Falta uma tela no portal do morador para criar pré-autorizações.  
**Esforço estimado:** Médio (nova tela no portal + ajuste de permissão para role RESIDENT)

---

## 🟡 Médio prazo — Alto impacto, esforço moderado

### [MEL-03] Calendário de manutenção preventiva com alertas
**Status:** `[ ] Pendente`  
**Descrição:** Configurar equipamentos do condomínio (elevador, bomba, caixa d'água, AVCB, SPDA) com periodicidade de manutenção. Sistema dispara alertas automáticos antes do vencimento.  
**Observação:** O módulo `maintenance/` atual é corretivo (OS avulsa). Precisa adicionar modelo `MaintenanceSchedule` com recorrência e serviço agendado (BullMQ já está na stack).  
**Esforço estimado:** Médio-alto (novo modelo + scheduler + UI)

---

### [MEL-04] Autorização de obras e prestadores por unidade
**Status:** `[ ] Pendente`  
**Descrição:** Morador registra reforma em andamento na sua unidade e lista os prestadores autorizados a entrar. Porteiro só libera acesso aos prestadores previamente registrados.  
**Observação:** `service-providers/` existe mas não tem esse fluxo de vínculo com unidade/obra.  
**Esforço estimado:** Médio (novo modelo `Renovation` + tela portaria + portal morador)

---

### [MEL-05] Documentos para download
**Status:** `[ ] Pendente`  
**Descrição:** Síndico carrega documentos (ata de assembleia, convenção, regulamento interno, boletos) e moradores baixam pelo portal.  
**Observação:** Nenhum módulo equivalente existe. Precisaria de upload de arquivo (S3/local) e listagem por categoria.  
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
**Status:** `[ ] Pendente`  
**Descrição:** Transformar o frontend web em Progressive Web App (instalável) com push notifications nativas.  
**Observação:** O frontend React/Vite tem suporte a PWA via `vite-plugin-pwa`. Base já existe (`pwa.d.ts`).  
**Esforço estimado:** Médio (configurar manifest, service worker, push)

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

| # | Item | Prioridade | Esforço |
|---|------|-----------|---------|
| 1 | MEL-01 — Notificações email encomendas/visitantes | Alta | Pequeno |
| 2 | MEL-02 — Pré-autorização de visitantes | Alta | Médio |
| 3 | MEL-09 — PWA (push notifications) | Alta | Médio |
| 4 | MEL-03 — Manutenção preventiva | Alta | Médio-alto |
| 5 | MEL-05 — Documentos para download | Média | Médio |
| 6 | MEL-04 — Autorização de obras | Média | Médio |
| 7 | MEL-07 — Controle de estoque | Média | Médio |
| 8 | MEL-06 — Mensagens individuais | Média | Médio-alto |
| 9 | MEL-10 — Galeria de fotos | Baixa | Baixo |
| 10 | MEL-08 — Boleto bancário integrado | Alta (valor) | Alto |
| 11 | MEL-11 — Assistente IA | Diferencial | Médio |
