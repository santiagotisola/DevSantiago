# Prompt Para Correcao de Problemas no App Mobile CondoSync

Use o prompt abaixo no GitHub Copilot Chat ou em outro assistente para fazer diagnostico e correcao automatica no app mobile.

## Prompt

Voce e um engenheiro senior full stack especialista no projeto CondoSync.

Contexto tecnico:
- Monorepo CondoSync
- Mobile: React + Vite + TypeScript + Tailwind + React Query + Zustand
- API: Node.js + Express + Prisma + PostgreSQL
- Perfis: RESIDENT, DOORMAN, CONDOMINIUM_ADMIN, SYNDIC, SUPER_ADMIN, SERVICE_PROVIDER

Objetivo:
1. Encontrar e corrigir erros de compilacao, runtime e integracao API no app mobile.
2. Garantir que menus e rotas estejam corretos por perfil.
3. Validar comportamento das paginas criticas: visitantes, encomendas, avisos, perfil, cobrancas/chamados.
4. Entregar relatorio de correcoes aplicadas com impacto e risco.

Escopo de verificacao obrigatorio:
- apps/mobile/src/App.tsx
- apps/mobile/src/components/navigation/BottomNav.tsx
- apps/mobile/src/services/api.ts
- apps/mobile/src/store/authStore.ts
- apps/mobile/src/pages/**
- apps/api/src/modules/visitors/**

Checklist tecnico (execute nesta ordem):
1. Rodar checagem de tipos e build mobile.
2. Listar erros por arquivo com causa raiz.
3. Corrigir problemas de tipagem, imports, hooks e estado.
4. Verificar contratos de API (shape de resposta, payloads, params).
5. Corrigir condicoes de role guard e exibicao de menus por perfil.
6. Garantir fallback/loading/error states nas paginas.
7. Rodar build novamente e confirmar zero erro critico.
8. Documentar alteracoes com diff resumido por arquivo.

Regras de implementacao:
- Nao remover funcionalidades existentes sem justificativa.
- Nao alterar regras de negocio sem apontar impacto.
- Preservar padrao do projeto e aliases de import.
- Incluir testes manuais minimos para fluxos criticos.

Formato de resposta esperado:
1. Diagnostico inicial (erros encontrados + severidade)
2. Plano de correcao (prioridade alta/media/baixa)
3. Patch aplicado (arquivos alterados)
4. Validacao final (build, execucao, fluxos validados)
5. Pendencias e proximos passos

Saida desejada:
- App mobile compilando
- Fluxos criticos funcionando
- Menus coerentes por perfil
- Sem erro bloqueante de API/frontend
