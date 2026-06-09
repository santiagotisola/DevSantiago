# Roadmap Técnico - Mobile CondoSync

**Data:** 8 de maio de 2026

---

## Sprint 1 (Semanas 1-4) - Prioritário

### 1. MinhasCobrancas com API Real

Implementar com GET `/charges/unit/{unitId}`:

```typescript
type Charge = {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
};
```

Telas:

- Grid com cards por cobrança
- Status com cores (verde pago, amarelo próximo, vermelho atrasado)
- Botão "Pagar" para redirecionamento
- Filtros por período/status

### 2. Chamados com Backend Real

Implementar com GET/POST `/tickets/unit/{unitId}`:

```typescript
type Ticket = {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  createdAt: string;
  assignedTo?: { name: string };
};
```

Telas:

- Lista com filtros (status, prioridade)
- Card por ticket
- Modal de detalhe
- Upload de anexos

### 3. Socket.IO para Tempo Real

Eventos implementados:

- Visitante chegou
- Encomenda recebida
- Novo aviso
- Ticket atualizado
- Alerta de pânico

Benefícios:

- Dashboard atualiza sem polling (30-60s)
- Notificações instant push
- Reduz latência e banda

### 4. Testes com Leitores de Tela

Validar com:

- NVDA (Windows)
- Narrator (Windows)
- VoiceOver (iOS)
- TalkBack (Android)

Checklist:

- [ ] Navegação por teclado (Tab)
- [ ] Ordem de leitura lógica
- [ ] aria-labels corretos
- [ ] Contraste de cores

---

## Sprint 2 (Semanas 5-8) - Importante

### 1. Página de Veículos

Para portaria, registrar entrada/saída:

```typescript
type Vehicle = {
  id: string;
  plate: string;
  model: string;
  owner: { name: string; unit: string };
  entryAt: string;
  exitAt?: string;
};
```

Funcionalidades:

- Scanner OCR de placa
- Entrada manual
- Lista do dia
- Histórico

### 2. Página de Reservas

Para moradores, agendar áreas comuns:

```typescript
type Reservation = {
  id: string;
  commonArea: { name: string; capacity: number };
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};
```

Funcionalidades:

- Calendário com disponibilidade
- Seleção de data/hora
- Confirmação
- Histórico

### 3. Página de Documentos

Para todos, consultar arquivos:

```typescript
type Document = {
  id: string;
  title: string;
  type: 'PDF' | 'DOC' | 'IMAGE' | 'VIDEO';
  size: number;
  uploadedAt: string;
  url: string;
};
```

Funcionalidades:

- Grid com pré-visualização
- Download com progresso
- Visualização inline
- Filtros por tipo

### 4. Skeleton Loaders

Substituir spinners por:

```tsx
<div className="animate-pulse space-y-4">
  <div className="h-12 bg-gray-200 rounded-xl" />
  <div className="h-48 bg-gray-200 rounded-xl" />
</div>
```

Benefício: melhor percepção de velocidade

### 5. Testes Automatizados

Setup com Vitest + Testing Library:

- Unit tests: 70% cobertura
- Integration tests: 40% cobertura
- E2E tests com Playwright: 10% cobertura

---

## Melhorias Transversais

### Web Push Notifications

```typescript
// Pedir permissão
const permission = await Notification.requestPermission();

// Enviar notificação
new Notification('Título', { body: 'Mensagem' });
```

### Otimização de Imagens

- WebP com fallback
- Lazy loading
- Responsive images

### Dark Mode

- Zustand para persistir preferência
- Tailwind `dark:` utilities
- Respeitar `prefers-color-scheme`

### Multi-idioma (i18n)

- i18next + react-i18next
- pt-BR, pt-PT, en-US
- Persistência de preferência

---

## Métricas de Qualidade

### Testes

- Unit: >= 70%
- Integration: >= 40%
- E2E: >= 10%

### Performance

- Lighthouse: >= 90/100
- FCP: < 1.5s
- LCP: < 2.5s
- TTI: < 3s

### Acessibilidade

- WCAG 2.1 AA (100%)
- Keyboard nav (100%)
- Screen reader (100%)

---

## Timeline

```text
Maio 2026:
├─ 08/05: Análise completa
├─ 09/05: Revisão com stakeholders
└─ 10/05: Início Sprint 1

Junho 2026:
├─ Sprint 1 (4 semanas)
│  └─ Cobranças, Chamados, Socket.IO, Testes
└─ Sprint 2 (4 semanas)
   └─ Veículos, Reservas, Documentos, Deploy
```

---

## Checklist Pre-Deploy

- [ ] Todos testes passando
- [ ] Lighthouse >= 85
- [ ] Zero console errors
- [ ] Acessibilidade validada
- [ ] Testar em 4G
- [ ] Testar offline
- [ ] URLs de API corretas
- [ ] Build size OK
- [ ] PWA funcional

---

## Recomendações

### Arquitetura

- Manter Zustand (simples)
- Expandir React Query
- Adicionar Socket.IO
- TanStack Form se necessário

### DevOps

### Outras Recomendações

- Bundle analyzer
- Image optimization
- Profiling com React DevTools

### Testing

- MSW para mock API
- Faker para fixtures
- Chromatic para UI tests

---

**Gerado em:** 8 de maio de 2026
