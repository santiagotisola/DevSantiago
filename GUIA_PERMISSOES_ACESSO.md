# 🔐 GUIA DE PERMISSÕES & ACESSO - CondoSync
**Data**: 27 de Maio de 2026  
**Versão**: Recomendação para v1.1+  
**Status**: Design Document (implementação futura)

---

## 📋 ÍNDICE

1. Visão Geral de Roles & Permissões
2. Matriz de Controle de Acesso por Módulo
3. Permissões por Role (Detalhado)
4. Casos de Uso e Fluxos
5. Checklist Frontend (O que mostrar)
6. Roadmap de Implementação Granular

---

## 1️⃣ VISÃO GERAL

### Roles Definidos (7)

```
SUPER_ADMIN (Proprietário/CEO)
├── Acesso global (todos os condominios)
├── Gerencia usuários e condominios
└── Relatórios executivos

CONDOMINIUM_ADMIN (Admin de Condominio)
├── Acesso total a 1 condominio
├── Gerencia funcionários e configurações
└── Relatórios e auditoria

SYNDIC (Síndico/Gestor)
├── Acesso a gestão (parcial)
├── Autoriza despesas
└── Acesso a relatórios financeiros

DOORMAN (Porteiro)
├── Registra visitantes, encomendas, veículos
├── Acesso limitado a dados
└── Sem acesso a financeiro

RESIDENT (Morador)
├── Acesso a dados pessoais
├── Pode solicitar serviços
└── Vê financeiro pessoal

SERVICE_PROVIDER (Prestador de Serviço)
├── Acesso a chamados atribuídos
├── Pode enviar relatórios
└── Sem acesso a dados de outros

COUNCIL_MEMBER (Membro Conselho)
├── Leitura: financeiro, assembleia
├── Sem escrita em módulos críticos
└── Acesso a discussões de conselho
```

---

## 2️⃣ MATRIZ DE CONTROLE DE ACESSO POR MÓDULO

### Legenda
```
✅ Acesso total (read + write)
📖 Apenas leitura (read-only)
✏️ Escrita limitada (criar, não editar outros)
❌ Sem acesso
⚠️ Acesso com validação (ex: só seu próprio condominio)
```

### Tabela Resumida

| Módulo | SUPER_ADMIN | COND_ADMIN | SYNDIC | DOORMAN | RESIDENT | SERVICE_PROVIDER | COUNCIL_MEMBER |
|--------|-------------|------------|--------|---------|----------|------------------|----------------|
| **Dashboard** | ✅ | ✅ | ✅ | ❌ | 📖 | ❌ | 📖 |
| **Usuários** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Moradores** | ✅ | ✅ | 📖 | ❌ | 📖 próprio | ❌ | ❌ |
| **Visitantes** | ✅ | ✅ | ✅ | ✅ | ✏️ | ❌ | ❌ |
| **Encomendas** | ✅ | ✅ | 📖 | ✅ | ✏️ | ❌ | ❌ |
| **Veículos** | ✅ | ✅ | 📖 | ✅ | 📖 próprio | ❌ | ❌ |
| **Financeiro** | ✅ | ✅ | ✅ | ❌ | 📖 próprio | ❌ | 📖 |
| **Funcionários** | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| **Marketplace** | ✅ | ✅ | 📖 | ❌ | ✅ | ✅ | ❌ |
| **WhatsApp** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Permissões** | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Assembleia** | ✅ | ✅ | ✅ | ❌ | 📖 | ❌ | ✅ |
| **Auditoria** | ✅ | 📖 próprio | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Panic Alert** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Configurações** | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |

---

## 3️⃣ PERMISSÕES DETALHADAS POR ROLE

### 3.1 SUPER_ADMIN (Proprietário/CEO)

```
┌─────────────────────────────────────────────┐
│ SUPER_ADMIN - Acesso Global                 │
└─────────────────────────────────────────────┘

Dashboard:
├── ✅ View: Todos os condominios (global)
├── ✅ Analytics: Rentabilidade, usuários ativos
└── ✅ Comparativo: Performance entre condominios

Usuários:
├── ✅ Create: Novo usuário (global ou condominio)
├── ✅ Read: Listar todos os usuários
├── ✅ Update: Editar role e permissões
├── ✅ Delete: Remover usuários
└── ✅ Reset: Password reset para qualquer usuário

Condominios:
├── ✅ Create: Novo condominio
├── ✅ Read: Listar todos
├── ✅ Update: Editar config
├── ✅ Delete: Remover (com cascata)
└── ✅ Clone: Copiar config para novo condominio

Financeiro:
├── ✅ Todos os acessos (global)
├── ✅ Ver cobrança de todos os condominios
├── ✅ Aprovar despesas em qualquer condominio
└── ✅ Exportar relatórios globais

Permissões:
├── ✅ Definir roles e permissões
├── ✅ Criar roles customizadas
├── ✅ Auditoria de acessos
└── ✅ Logs de quem fez o quê

Marketplace:
├── ✅ Gerenciar parceiros globais
├── ✅ Aprovar/rejeitar parceiros
├── ✅ Definir comissões
└── ✅ Ver analytics de vendas global

WhatsApp:
├── ✅ Gerenciar múltiplas sessões WhatsApp
├── ✅ Converter sess
ão pessoal em conta de empresa
└── ✅ Ver logs de todas as mensagens
```

### 3.2 CONDOMINIUM_ADMIN (Admin de Condominio)

```
┌─────────────────────────────────────────────┐
│ CONDOMINIUM_ADMIN - Admin do Condominio     │
└─────────────────────────────────────────────┘

Dashboard:
├── ✅ View: Seu condominio (completo)
├── ✅ KPIs: Visitantes, encomendas, financeiro
└── ✅ Alertas: Eventos críticos

Usuários:
├── ✅ Create: Novo usuário no seu condominio
├── ✅ Read: Listar usuários do seu condominio
├── ✅ Update: Editar role (dentro do seu condominio)
├── ✅ Delete: Remover (com validação)
└── ❌ SUPER_ADMIN: Não pode criar/editar SUPER_ADMIN

Moradores:
├── ✅ Create: Registrar novo morador
├── ✅ Read: Listar todos os moradores
├── ✅ Update: Editar dados do morador
├── ✅ Delete: Remover morador
└── ✅ Export: Lista em PDF/Excel

Visitantes:
├── ✅ Create: Registrar visitante
├── ✅ Read: Listar visitantes
├── ✅ Update: Mudar status, notas
├── ✅ Delete: Remover registro
└── ✅ Filtros: Avançados (data, morador, etc.)

Encomendas:
├── ✅ Create: Registrar encomenda
├── ✅ Read: Listar encomendas
├── ✅ Update: Marcar retirada, mudar status
├── ✅ Delete: Remover (com log)
└── ✅ Notificações: Email + WhatsApp

Veículos:
├── ✅ Create: Registrar acesso (entrada/saída)
├── ✅ Read: Histórico de acessos
├── ✅ Update: Editar dados do veículo
└── ✅ Delete: Remover registro

Financeiro:
├── ✅ Cobrança: Criar, modificar, deletar
├── ✅ Despesas: Registrar e aprovar
├── ✅ Relatórios: Gerar relatórios financeiros
├── ✅ Integração: ASAAS/PJBANK
└── ✅ Histórico: Ver transações

Funcionários:
├── ✅ Create: Contratar funcionário
├── ✅ Read: Listar funcionários
├── ✅ Update: Editar dados/role
├── ✅ Delete: Desligamento (com log)
└── ✅ Folha: Exportar folha de pagamento

Permissões:
├── ✅ Configurar permissões do seu condominio
├── ⚠️ Restringido: Não pode alterar SUPER_ADMIN
└── ⚠️ Restringido: Não pode deletar CONDOMINIUM_ADMIN

Configurações:
├── ✅ Logo: Upload de logo do condominio
├── ✅ Tema: Escolher cores
├── ✅ Notificações: Configurar canais
├── ✅ Integrações: WhatsApp, Email, API
└── ✅ Backup: Fazer backup dos dados

Assembleia:
├── ✅ Create: Criar pauta
├── ✅ Read: Ver discussões
├── ✅ Update: Atualizar status
└── ✅ Delete: Arquivar

Auditoria:
└── 📖 Logs: Ver auditoria do seu condominio (read-only)
```

### 3.3 SYNDIC (Síndico/Gestor)

```
┌─────────────────────────────────────────────┐
│ SYNDIC - Gestor/Síndico                     │
└─────────────────────────────────────────────┘

Dashboard:
├── ✅ View: Relatório executivo
├── ✅ KPIs: Financeiro (em destaque)
└── ✅ Alertas: Cobranças vencidas, eventos críticos

Usuários:
├── ❌ Não pode criar/editar

Moradores:
├── 📖 Read: Listar (read-only)
└── ❌ Não pode editar

Visitantes:
├── ✅ Create: Registrar visitante (por si mesmo)
├── ✅ Read: Listar com filtros
├── ✅ Update: Mudar status
└── ⚠️ Delete: Não pode deletar

Encomendas:
├── 📖 Read: Ver todas as encomendas
├── ✅ Notificações: Configurar alertas
└── ❌ Não pode criar/editar

Veículos:
├── 📖 Read: Histórico de acessos (read-only)
└── ❌ Não pode registrar entrada/saída

Financeiro:
├── ✅ Cobrança: Ver, autorizar despesas
├── ✅ Relatórios: Gerar relatórios financeiros
├── ✅ Dashboards: Análise de receitas/despesas
└── ❌ Delete: Não pode deletar cobranças

Funcionários:
├── 📖 Read: Listar funcionários (read-only)
└── ❌ Não pode gerenciar

Assembleia:
├── ✅ Create: Criar pauta para assembleia
├── ✅ Read: Ver discussões
├── ✅ Update: Atualizar status de votação
└── ✅ Moderar: Comentários

WhatsApp:
├── ✅ Send: Enviar mensagens
└── 📖 Logs: Ver histórico

Configurações:
├── 🔒 Restringido: Ver (read-only)
└── ❌ Não pode editar
```

### 3.4 DOORMAN (Porteiro)

```
┌─────────────────────────────────────────────┐
│ DOORMAN - Porteiro/Segurança               │
└─────────────────────────────────────────────┘

Dashboard:
├── ✅ Quick View: Visitantes hoje, encomendas
└── ⚠️ Limitado: Sem relatórios financeiros

Moradores:
├── 📖 Read: Listar (para validação de visitantes)
└── ❌ Não pode editar

Visitantes:
├── ✅ Create: Registrar entrada
├── ✅ Update: Registrar saída, mudar status
├── ✅ Read: Ver visitantes do dia
└── ⚠️ Filtros: Apenas por data/morador/status

Encomendas:
├── ✅ Create: Registrar encomenda recebida
├── ✅ Read: Listar encomendas
├── ✅ Update: Marcar retirada, mudar status
└── ✅ Notificações: Notificar morador

Veículos:
├── ✅ Create: Registrar entrada/saída
├── ✅ Read: Histórico de hoje
└── ⚠️ Histórico: Últimos 7 dias apenas

WhatsApp:
├── ✅ Send: Enviar mensagens para moradores
├── ✅ Receive: Ver mensagens recebidas
└── 📖 Templates: Usar templates pré-definidos

Panic Button:
├── ✅ Trigger: Ativar botão de pânico
└── ✅ Contato: Ligar para segurança/polícia

Configurações:
├── ❌ Sem acesso
└── 📖 WhatsApp: Ver templates (read-only)
```

### 3.5 RESIDENT (Morador)

```
┌─────────────────────────────────────────────┐
│ RESIDENT - Morador/Habitante                │
└─────────────────────────────────────────────┘

Dashboard:
├── 📖 Seu resumo: Encomendas, financeiro pessoal
├── ✅ Notificações: Alertas pessoais
└── ✅ Acessos Rápidos: Encomendas, Marketplace

Moradores:
├── 📖 Own: Ver apenas dados próprios
├── ✅ Edit: Editar email, telefone, dependentes
└── ❌ Other: Não ver dados de outros moradores

Visitantes:
├── ✅ Create: Registrar visitante (para si)
├── ✅ Read: Ver visitantes que registrou
├── ✅ Update: Cancelar visitante
└── ❌ Other: Não ver visitantes de outros

Encomendas:
├── ✅ Create: Solicitar encomenda
├── ✅ Read: Ver minhas encomendas
├── ✅ Update: Mudar endereço de entrega
└── ✅ Notificações: Receber alertas

Veículos:
├── 📖 Own: Ver registro de seu veículo
├── ✅ Edit: Editar dados
└── ❌ Other: Não ver veículos de outros

Financeiro:
├── 📖 Own: Ver sua cobrança pessoal
├── ✅ Pagar: Link de pagamento
└── ❌ Other: Não ver finanças de outros

Marketplace:
├── ✅ Create: Fazer pedido em marketplace
├── ✅ Read: Ver histórico de pedidos
├── ✅ Update: Cancelar pedido (com restrição)
└── ✅ Rating: Avaliar parceiro/produto

Panic Button:
├── ✅ Trigger: Ativar botão de pânico
└── ✅ Location: Compartilhar localização com segurança

Assembleia:
├── 📖 Read: Ver discussões da assembleia
├── ✅ Votar: Participar de votação
└── ✅ Comentar: Participar de discussão

Configurações:
├── ✅ Perfil: Editar dados pessoais
├── ✅ Privacidade: Configurar notificações
└── ✅ Segurança: Mudar senha, 2FA
```

### 3.6 SERVICE_PROVIDER (Prestador de Serviço)

```
┌──────────────────────────────────────────────┐
│ SERVICE_PROVIDER - Prestador de Serviço     │
└──────────────────────────────────────────────┘

Dashboard:
├── ✅ Meus Chamados: Tickets atribuídos
├── ✅ KPIs: Taxa de conclusão, rating
└── ✅ Faturamento: Quanto ganhei este mês

Chamados (Tickets):
├── ✅ Create: Propor serviço (novo chamado)
├── ✅ Read: Ver chamados atribuídos
├── ✅ Update: Enviar relatório, marcar concluído
└── ❌ Delete: Não pode deletar

Marketplace:
├── ✅ Create: Publicar produto/serviço
├── ✅ Read: Ver meus produtos
├── ✅ Update: Editar preço, descrição
├── ✅ Pedidos: Ver pedidos recebidos
└── ✅ Responder: Responder consultados de cliente

Financeiro:
├── 📖 Faturamento: Ver quanto foi pago (read-only)
├── ✅ Invoice: Gerar nota fiscal
└── ❌ Editável: Não pode editar valores

Rating:
├── 📖 Read: Ver avaliações que recebeu
└── ❌ Edit: Não pode editar

Configurações:
├── ✅ Perfil: Editar dados da empresa
├── ✅ Descrição: Sobre meu negócio
├── ✅ Foto: Logo da empresa
└── ✅ Integração: Conectar WhatsApp, Link de Pagamento

Comunicação:
├── ✅ Chat: Conversar com clientes (moradores)
├── ✅ WhatsApp: Integrado
└── ❌ Email: Não envio direto de email
```

### 3.7 COUNCIL_MEMBER (Membro Conselho)

```
┌─────────────────────────────────────────────┐
│ COUNCIL_MEMBER - Membro do Conselho        │
└─────────────────────────────────────────────┘

Dashboard:
├── 📖 Relatório: Financeiro (read-only)
└── 📖 Assembleia: Discussões (read-only)

Financeiro:
├── 📖 Cobrança: Ver (read-only)
├── 📖 Despesas: Ver (read-only)
└── 📖 Relatórios: Acessar (read-only)

Assembleia:
├── ✅ Read: Ver pautas e discussões
├── ✅ Votar: Participar de votação
└── ✅ Comentar: Discussão (com moderação)

Ocorrências:
├── 📖 Read: Ver ocorrências (read-only)
└── ❌ Create: Não pode registrar

Permissões:
├── ❌ Nenhum acesso

Configurações:
├── ❌ Sem acesso
└── 📖 Perfil: Ver apenas dados pessoais
```

---

## 4️⃣ CASOS DE USO E FLUXOS

### Caso 1: Morador Registra Visitante

```
RESIDENT cria visitante → Sistema envia notificação:
├── ✅ Email para morador (confirmação)
├── ✅ WhatsApp para porteiro (alerta)
├── ✅ Push notification (real-time)

DOORMAN registra entrada:
├── ✅ Atualiza status para "ENTERED"
├── ✅ Notifica morador via push

DOORMAN registra saída:
├── ✅ Atualiza status para "EXITED"
├── ✅ Arquivo na auditoria
```

### Caso 2: Admin Cria Novo Funcionário

```
CONDOMINIUM_ADMIN → POST /employees
├── ✅ Cria usuário
├── ✅ Define role (DOORMAN, SERVICE_PROVIDER, etc.)
├── ✅ Email de boas-vindas
└── ✅ Log na auditoria

Funcionário faz login:
├── ✅ Ve apenas módulos permitidos para seu role
└── ✅ Acesso restrito por condominio
```

### Caso 3: Marketplace - Compra com Ratings

```
RESIDENT → Vê produtos no marketplace
├── ✅ Vê rating ⭐⭐⭐⭐⭐ de outros moradores
├── ✅ Vê fotos de avaliações
└── ✅ Clica "Pedir"

SERVICE_PROVIDER recebe requisição:
├── ✅ Chat integrado com morador
├── ✅ Pode enviar link de pagamento
└── ✅ Atualiza status até entrega

RESIDENT avalia após recebimento:
├── ✅ Deixa rating (1-5 estrelas)
├── ✅ Escreve comentário
└── ✅ Sobe foto do produto/serviço
```

---

## 5️⃣ CHECKLIST FRONTEND - O QUE MOSTRAR

### Implementação: `rolePermissions.ts`

```typescript
// apps/web/src/config/rolePermissions.ts

export const MODULE_VISIBILITY: Record<UserRole, string[]> = {
  SUPER_ADMIN: [
    'dashboard-global',
    'usuarios',
    'condominios',
    'moradores',
    'visitantes',
    'encomendas',
    'veiculos',
    'financeiro',
    'funcionarios',
    'marketplace',
    'whatsapp',
    'permissoes',
    'assembleia',
    'auditoria',
    'panic-center',
    'configuracoes-global'
  ],
  
  CONDOMINIUM_ADMIN: [
    'dashboard',
    'moradores',
    'visitantes',
    'encomendas',
    'veiculos',
    'financeiro',
    'funcionarios',
    'marketplace',
    'whatsapp',
    'permissoes-local',
    'assembleia',
    'auditoria-local',
    'panic-alert',
    'configuracoes-condominio'
  ],
  
  SYNDIC: [
    'dashboard-syndic',
    'visitantes-read',
    'financeiro-read',
    'marketplace-read',
    'whatsapp-send',
    'assembleia'
  ],
  
  DOORMAN: [
    'dashboard-quick',
    'visitantes',
    'encomendas',
    'veiculos',
    'whatsapp-send',
    'panic-alert'
  ],
  
  RESIDENT: [
    'dashboard-personal',
    'meu-perfil',
    'visitantes-own',
    'encomendas-own',
    'veiculos-own',
    'financeiro-own',
    'marketplace',
    'panic-alert'
  ],
  
  SERVICE_PROVIDER: [
    'dashboard-provider',
    'chamados-atribuidos',
    'marketplace-own',
    'financeiro-personal',
    'perfil'
  ],
  
  COUNCIL_MEMBER: [
    'dashboard-council',
    'financeiro-read',
    'assembleia',
    'perfil'
  ]
};

// Usar no navegação
export function Navigation() {
  const { user } = useAuth();
  const visibleModules = MODULE_VISIBILITY[user?.role];
  
  return (
    <nav>
      {visibleModules.map(module => (
        <NavLink key={module} to={`/${module}`}>
          {MODULE_LABELS[module]}
        </NavLink>
      ))}
    </nav>
  );
}
```

### Validação em Tempo Real

```typescript
// Antes de renderizar botão de editar
if (!hasPermission(user.role, 'moradores:edit')) {
  return null; // Não mostra botão
}

// Mostrar tooltip ao hover
<Tooltip text="Você não tem permissão para editar moradores">
  <button disabled>Editar</button>
</Tooltip>
```

---

## 6️⃣ ROADMAP DE IMPLEMENTAÇÃO GRANULAR

### Fase 1: MVP (Hoje) - RBAC Simples
```
✅ 7 roles definidos
✅ Middleware authenticate + authorize
⚠️ Controle por role (sem granularidade por ação)
```

### Fase 2: v1.1 (Próx 4 semanas) - RBAC Refinado
```
🔄 Implementar Permission + RolePermission tables
🔄 Controle granular por módulo/ação
🔄 Frontend mostra apenas opções permitidas
🔄 Audit trail de acessos
```

### Fase 3: v1.2 (8+ semanas) - Avançado
```
- Time-based access (acesso 9-17h)
- Location-based access (acesso apenas na rede do condominio)
- Delegação de permissões (admin delega pra syndic temporariamente)
- Role customizado por condominio
```

---

## ✅ CONCLUSÃO

Este documento define:
- ✅ Permissões claras por role
- ✅ O que cada usuário pode/não pode fazer
- ✅ Checklist para implementação frontend
- ✅ Roadmap de escalabilidade

**Para v1.0**: Use o padrão RBAC simples (authenticate + authorize).
**Para v1.1+**: Expanda para permissões granulares (Permission model).

---

**Próximo Passo**: Implementar no código conforme este documento.
**Revisor Recomendado**: Sua Security/QA team.
