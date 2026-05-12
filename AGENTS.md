# Agentes Especializados — CondoSync

Agentes customizados para automatizar tarefas comuns e enforçar convenções neste monorepo.

## CondoSync Dev

**Propósito**: Agente especialista em desenvolvimento full-stack do CondoSync. Use para implementar features, corrigir bugs, adicionar rotas, criar páginas, modificar schema do banco.

**Quando usar**:
- Implementar nova funcionalidade (feature)
- Corrigir bugs na API, Web ou Mobile
- Adicionar novo módulo/rota na API
- Criar nova página/componente no Web ou Mobile
- Adicionar/modificar migrations Prisma
- Trabalhar com microsserviço C# (encomendas)
- Configurar variáveis de ambiente ou deploy

**Expertise**:
- Full-stack Node.js/Express/TypeScript (API)
- React + Vite + Tailwind (Web e Mobile)
- Prisma ORM + PostgreSQL
- Docker + Railway deploy
- ASP.NET Core 10 (microsserviço)
- Socket.IO real-time
- BullMQ queue jobs
- Autenticação JWT + papéis

**Exemplo de invocação**:
```
/agents CondoSync Dev
Implementar novo endpoint POST /api/residents/:id/vehicle para registrar veículo do morador
```

---

## Explore

**Propósito**: Subagente rápido para exploração read-only do codebase. Use quando precisar investigar código, entender padrões, ou coletar contexto antes de implementar mudanças.

**Quando usar**:
- Entender como um módulo é estruturado
- Encontrar exemplos de padrões (como autenticação, validação, etc.)
- Investigar dependências ou fluxo de dados
- Fazer uma análise rápida antes de começar desenvolvimento
- Coletar contexto sobre parte específica do codebase

**Parâmetros**:
- `thoroughness`: `quick` (2 min) | `medium` (5 min) | `thorough` (10+ min)

**Exemplo de invocação**:
```
/agents Explore
Mostrar como o módulo de residents está estruturado e como é validado (quick)
```

---

## Workflow Recomendado

1. **Usar Explore** (quick) para entender a estrutura do código relevante
2. **Usar CondoSync Dev** para implementar a feature/fix
3. **Usar Explore** (quick) para validar se a implementação segue padrões

---

## Skills

Veja [`.github/skills/`](.github/skills/) para skills reutilizáveis (ex: `condosync-test-env`, setup de ambiente, etc.).
