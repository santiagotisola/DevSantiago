# Runbook — Sprint 0 Emergencial

> Promoção em produção das correções dos itens críticos C1, C2, C3 +
> hardening QW. Todas as mudanças são compatíveis com rollback via
> revert do commit/branch. Janela de manutenção NÃO é necessária —
> mudanças usam padrão expand-only.

## Pré-requisitos

- [ ] Acesso de admin ao banco de produção (psql).
- [ ] Acesso ao painel Railway (ou VPS) para definir env vars.
- [ ] Backup recente de produção (`pg_dump` < 24h).
- [ ] Confirmação de janela de baixa atividade (sugestão: 21:00-23:00 BRT).
- [ ] Slack/PagerDuty silenciado para a equipe.

## Ordem de execução

A ordem importa: variáveis de env e migrations precisam estar em
produção ANTES do código que as consome.

### 1. Definir `APP_ENCRYPTION_KEY` no ambiente (C3)

Gerar a chave-mestre:

```bash
openssl rand -base64 32
```

Definir no Railway/VPS:

```
APP_ENCRYPTION_KEY=<valor-gerado-acima>
```

**NÃO** definir `APP_ENCRYPTION_KEY_PREVIOUS` agora (só usado em
rotação futura). Se faltar `APP_ENCRYPTION_KEY` em produção, o
`finance.service.configureGateway` vai falhar — manter plaintext
legado lendo continua funcionando.

### 2. Aplicar migrations

```bash
# Em produção (Railway shell ou via job)
cd apps/api
npx prisma migrate deploy
```

Migrations novas neste sprint:

| Arquivo | O que faz | Lock | Rollback |
|---|---|---|---|
| `20260508160000_gateway_encrypt_expand` | `ALTER TABLE financial_accounts ADD gatewayKeyEnc, gatewayConfigEnc` | NENHUM (additive) | `ALTER TABLE financial_accounts DROP COLUMN gatewayKeyEnc, DROP COLUMN gatewayConfigEnc;` |

### 3. Deploy do código

Sequência ideal: rolling update Railway.

Branches/PRs envolvidos (em ordem de merge):

1. `fix(workers): leader lock com Lua atômico` — bug ativo.
2. `fix(security): body limit, redis key, sentry, seeds` — QW.
3. `feat(security): middleware requireResourceMembership` — base.
4. `fix(security): IDOR sweep — fines/polls`.
5. `chore(deps): bcryptjs → bcrypt + multer 2.x`.
6. `feat(security): cifragem gatewayKey EXPAND`.

### 4. Re-encrypt rows existentes (C3 fase 2)

DEPOIS do deploy, com `APP_ENCRYPTION_KEY` ativa:

```bash
# Dry-run primeiro — confere quantas rows e amostra
npm run encrypt:gateway-keys -- --dry-run

# Confirmação visual da contagem; se OK, executar:
npm run encrypt:gateway-keys -- --apply
```

O script é idempotente. Pode ser re-rodado sem efeito colateral.
Após `--apply`, os campos plaintext (`gatewayKey`, `gatewayConfig`)
ficam zerados; o code dual-read nunca cai mais no fallback.

**Pode rodar em horário de baixa atividade ou em horário comercial**
(batches de 50 com 100ms pause, impacto desprezível).

## Validação pós-deploy

### Smoke tests obrigatórios

```bash
# 1. Health check
curl https://api.prod/health
# 200 com NODE_ENV=production

# 2. Login funciona (bcrypt nativo)
curl -X POST https://api.prod/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<test>","password":"<test>"}'
# 200 com tokens
# Verificar logs: senha valida em ~25ms (era ~80ms com bcryptjs)

# 3. Body limit aplicado
curl -X POST https://api.prod/api/v1/auth/login \
  -H "Content-Type: application/json" \
  --data-raw "$(printf '{"email":"x","x":"%0.s_' {1..2000000}}')"
# 413 Payload Too Large (1MB excedido)

# 4. Webhook Asaas continua funcionando
# (rodar o teste do gateway sandbox via dashboard Asaas)

# 5. Leader lock — verificar logs
# Railway logs api: deve aparecer "Eleito líder — registrando schedulers"
# em apenas UMA réplica. Após 60s, log "Leader lock renovada" (não
# implementado — verificamos AUSÊNCIA de "Leader lock perdida").

# 6. IDOR sweep — testes manuais
# Logar como SYNDIC do condo A, tentar:
#   POST /api/v1/fines/<id-de-multa-do-condo-B>/appeal
# Esperado: 403 Forbidden.
```

### Métricas pós-deploy a observar nas primeiras 2h

- **5xx rate** em `/api/v1/finance/*` — deve permanecer ≤0.1%.
  Se subir, investigar `decrypt failures` nos logs.
- **Latência p95 de /auth/login** — deve cair de ~150ms para ~80ms.
- **Sentry events** — qualquer novo `Error: APP_ENCRYPTION_KEY ausente`
  ou `Falha ao decifrar gatewayKeyEnc` indica config faltando.
- **Logs Redis** (`MONITOR`) — chaves `rl:forgot:*` agora começam com
  hex de 16 chars, não mais com email plaintext.

## Rollback

### Se aparecer falha relacionada a bcrypt nativo (build/runtime)

Causa provável: imagem Docker antiga sem python+make+g++. Rebuild
com Dockerfile atualizado, OU rollback temporário:

```bash
# Reverter o commit ccdb5fb9 (bcrypt + multer)
git revert ccdb5fb9
# Redeploy
```

Comportamento volta ao bcryptjs/multer 1.x — não há mudança de
schema, rollback limpo.

### Se appearer "decrypt failures" em /finance/*

Indica `APP_ENCRYPTION_KEY` errada/ausente. Sequência:

1. Confirmar env var no painel: `printenv APP_ENCRYPTION_KEY` no
   container.
2. Se errada, resetar para o valor original gerado no passo 1.
3. Restartar a réplica (Railway restart).
4. Se a chave foi perdida (não há registro), restaurar do backup
   criptografado do segredo (1Password/Vault). Sem chave, apenas
   plaintext legado é lido (ainda funcional durante EXPAND).

### Se cron disparar 2× (leader lock)

**Não deveria acontecer** com o fix b0fe19c4 → d984559f. Se acontecer:

1. Verificar TTL da chave: `redis-cli TTL leader:schedulers` — deve
   estar entre 1-240s.
2. Verificar que apenas 1 réplica imprime "Eleito líder" em logs.
3. Se 2 imprimirem, investigar conexões Redis dedicadas (BullMQ vs
   app — devem ser separadas via `bullConnection()`).
4. Mitigação imediata: escalar para 1 réplica até diagnosticar.

### Se IDOR sweep criar falsos 403

Caso algum cliente legítimo perca acesso:

1. Identificar a rota e o usuário/condomínio via Sentry.
2. Verificar se o usuário tem `condominiumUser` ativo (`isActive:
   true`) no condomínio do recurso.
3. Se sim, possível bug em `assertActorBelongsToCondominium` ou
   `ensureCondominiumMembership` — abrir hotfix.
4. Mitigação imediata: temporariamente mudar a rota afetada para
   commit anterior ao fix (revert do PR específico daquele módulo).

## Comunicação aos clientes

Não é necessária — todas as mudanças são internas, sem alteração
de comportamento visível.

**Exceção:** se algum admin tinha senha < 8 chars cadastrada
historicamente (improvável após o fix anterior), o próximo `change-
password` agora exige 8+ + 1 maiúscula + 1 número (já em vigor há
sprints).

## Pós-Sprint 0

Sprint 1 deve incluir:

- [ ] Validação 7 dias depois: rodar query `SELECT COUNT(*) FROM
  financial_accounts WHERE "gatewayKey" IS NOT NULL OR
  "gatewayConfig" IS NOT NULL` — deve retornar 0 (todas migradas).
- [ ] Migration CONTRACT: `DROP COLUMN gatewayKey, DROP COLUMN
  gatewayConfig` em `financial_accounts`.
- [ ] Code: remover `readGatewayKey`/`readGatewayConfig` fallback
  para plaintext, ler direto de Enc.
- [ ] Rotacionar `APP_ENCRYPTION_KEY` (definir nova, mover atual
  para `APP_ENCRYPTION_KEY_PREVIOUS`, rodar
  `encrypt:gateway-keys --apply` que re-cifra com a nova).
