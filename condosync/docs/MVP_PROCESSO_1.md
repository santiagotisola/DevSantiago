# CondoSync - Processo 1 (MVP sem prazo)

## Objetivo
Executar o **Processo 1** como um plano de MVP orientado a valor, **sem cronograma fixo**, usando gates de qualidade para avançar de fase.

## Analise do caso
Estado atual observado do projeto:
- Ja existe base funcional em monorepo com `apps/api`, `apps/web`, `apps/mobile` e microsservico de encomendas.
- Existem modulos importantes ja iniciados (moradores, unidades, visitantes, veiculos, financeiro, comunicacao, manutencao).
- O projeto tem potencial para Smart Access completo, mas o escopo enterprise (IA facial, OCR/LPR, edge AI, k8s full, observabilidade completa) e grande para entrar todo no MVP.

Leitura estrategica:
- O **MVP deve priorizar operacao condominial e portaria digital confiavel**.
- IA pesada (facial/LPR em producao) entra como **Fase 2+**, com feature flag e ambiente piloto.
- Sem prazo fixo: o avancar de cada etapa depende de evidencias tecnicas e de negocio.

## Principios de execucao (sem prazo)
1. Avancar por **gates de prontidao**, nao por datas.
2. Entregar verticalmente: backend + frontend + validacao por modulo.
3. Cada entrega precisa de:
- criterio de aceite funcional
- teste minimo automatizado
- monitoramento basico
- rollback simples
4. Nao abrir novos modulos enquanto houver bloqueio critico no core.

## Escopo do MVP (corte realista)
Incluido no MVP:
1. Auth com JWT + refresh, RBAC por perfil.
2. Multi-tenant basico (tenant resolver + isolamento por tenant).
3. Unidades e moradores (CRUD + vinculacao).
4. Visitantes (pre-autorizacao + fluxo de entrada manual/QR).
5. Veiculos (cadastro + whitelist simples sem OCR obrigatorio).
6. Encomendas (fluxo operacional principal).
7. Reservas de areas comuns (basico).
8. Comunicados e notificacoes in-app/realtime.
9. Dashboard operacional (admin + portaria).
10. Auditoria basica de eventos criticos.

Fora do MVP (post-MVP):
1. Reconhecimento facial em producao.
2. OCR/LPR com decisao automatica.
3. Edge AI offline-first completo.
4. Kubernetes full com autoscaling avancado.
5. Analytics avancado com modelos preditivos.

## Backlog priorizado por ondas (sem data)

### Onda 0 - Estabilizacao tecnica
**Status: ✅ COMPLETO**

Objetivo: garantir base compilando e deployavel.
Itens:
1. Build verde API/Web/Mobile. ✅
2. Padrao unico de erros e logs na API. ✅
3. Revisao de `.env.example` e variaveis obrigatorias. ✅
4. Healthcheck e smoke test por app. ✅

Gate de saida:
- build sem erro ✅
- smoke tests passando ✅
- sem bug P0 aberto ✅

### Onda 1 - Fundacao de acesso e tenancy
**Status: ✅ COMPLETO**

Objetivo: seguranca e isolamento.
Itens:
1. Login/refresh/logout com revogacao de sessao. ✅
2. Middleware de tenant e enforcement no service layer. ✅
3. Guardas RBAC por rota. ✅
4. Auditoria dos eventos de autenticacao. ✅
5. Padronizacao de tenant guard em 22 rotas (Lotes 1-3). ✅

Gate de saida:
- teste de acesso cruzado entre tenants bloqueado ✅
- perfis respeitados em rotas criticas ✅
- 19/19 testes de seguranca passando ✅

### Onda 2 - Operacao condominial core
Objetivo: operacao diaria funcionando ponta a ponta.
Itens:
1. Unidades + moradores (cadastro, edicao, vinculacao).
2. Visitantes (pre-autorizacao + lista ativa + check-in/check-out).
3. Veiculos (cadastro + whitelist).
4. Encomendas (recebimento, status, retirada).
Gate de saida:
- fluxo completo de portaria executavel no web
- rastreabilidade minima por auditoria

### Onda 3 - Experiencia e realtime
Objetivo: melhorar operacao em tempo real.
Itens:
1. Feed realtime de eventos de portaria.
2. Comunicados com publicacao e leitura.
3. Dashboard admin e dashboard portaria.
4. Ajustes de UX de formularios criticos.
Gate de saida:
- latencia aceitavel no feed operacional
- operadores validam usabilidade minima

### Onda 4 - Financeiro e reservas essenciais
Objetivo: fechar pacote de valor para sindicatura.
Itens:
1. Lancamentos de receitas/despesas.
2. Visao de inadimplencia basica.
3. Reserva de area comum com aprovacao.
Gate de saida:
- relatorio simples por periodo funcionando
- reserva com conflito tratado corretamente

### Onda 5 - Hardening pre-producao
Objetivo: confiabilidade e seguranca para entrada real.
Itens:
1. Rate limit, helmet, revisao CORS.
2. Backup e restore testado.
3. Logs estruturados + metricas minimas.
4. Checklist LGPD operacional (consentimento, retencao, exclusao).
Gate de saida:
- checklist de go-live aprovado
- incidente simulado com runbook validado

## Criterios de priorizacao (sempre)
Ordem de decisao para puxar proximo item:
1. Impacto no fluxo diario da portaria
2. Risco de seguranca/compliance
3. Dependencias bloqueantes
4. Custo de implementacao
5. Visibilidade de valor para cliente final

## Definicao de pronto (DoD)
Todo item so fecha quando:
1. Funciona no ambiente local com dados de seed.
2. Tem teste minimo (unitario ou integracao).
3. Tem validacao manual documentada.
4. Nao quebra build.
5. Tem log util para suporte.

## Riscos principais e mitigacao
1. Escopo inflado por features de IA cedo demais.
- Mitigacao: manter IA sob feature flag no post-MVP.
2. Falha de isolamento multi-tenant.
- Mitigacao: testes de seguranca por tenant em cada release.
3. Regressao em fluxos de portaria.
- Mitigacao: suite de teste e2e dos 5 fluxos criticos.
4. Baixa adocao por UX complexa.
- Mitigacao: revisao com operador real antes de fechar onda.

## KPIs de sucesso do MVP (sem data)
1. Taxa de sucesso de check-in de visitante.
2. Tempo medio de atendimento na portaria.
3. Erros de autorizacao por perfil.
4. Disponibilidade do painel web.
5. Percentual de eventos auditados.

## Proxima execucao recomendada
Iniciar pela **Onda 0** e **Onda 1** imediatamente, com checkpoints por gate.

Checklist inicial de execucao:
1. Confirmar build verde dos 3 apps.
2. Auditar fluxo de auth + refresh + RBAC.
3. Validar tenant resolver nas rotas mais sensiveis.
4. Abrir issues do backlog por onda no GitHub Projects.
