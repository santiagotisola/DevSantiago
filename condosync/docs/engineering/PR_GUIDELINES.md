# PR Guidelines

> Princípios para PRs sustentáveis. Aplicar em todos os
> repositórios da plataforma.

## Tamanho

**Alvo: ≤ 400 LOC modificadas (excluindo lock files, snapshots).**

PRs grandes têm:
- Review superficial (cansaço cognitivo do reviewer).
- Conflitos de merge mais difíceis.
- Rollback caro.
- Chance maior de regressão silenciosa.

Se sua mudança naturalmente é >400 LOC, divida por:
- Refactor primeiro (sem mudança comportamental).
- Schema/migration second.
- Code de feature por último.

Cada PR sozinho não quebra produção.

## Atomicidade

**1 PR = 1 mudança lógica.**

❌ "Refactor X + add feature Y": 2 PRs.
❌ "Bump dep + fix bug": 2 PRs.
❌ "Split file + change behavior": 2 PRs (split sem mudar
   comportamento, depois mudar comportamento).

## Título

Formato: `tipo(scope): descrição imperativa em minúsculas`.

Tipos:
- `feat` — feature nova.
- `fix` — bug fix.
- `refactor` — sem mudança de comportamento.
- `perf` — performance.
- `test` — apenas testes.
- `docs` — apenas docs.
- `chore` — manutenção (deps, ci, build).
- `ops` — observability, alertas, runbooks.

Scope: módulo afetado (`finance`, `webhook/asaas`, `ui/parcels`).

## Description (template)

```markdown
## Por quê
[Problema ou oportunidade. Link para issue/RFC/ADR se aplicável.]

## O quê
[Mudança em 2-3 frases. Não é o changelog.]

## Como testar
[Steps reprodutíveis. Para refactor, justifica a equivalência.]

## Riscos
- [Risco 1] → [Mitigação]
- [Risco 2] → [Mitigação]

## Rollback
[Como reverter. Para code-only: git revert. Para migration:
comando SQL.]

## Checklist
- [ ] Testes adicionados/atualizados
- [ ] CI verde
- [ ] Documentação atualizada (se aplicável)
- [ ] Migration tem `down.sql` (se destrutiva)
- [ ] Adiciona/atualiza ADR (se mudança arquitetural)
- [ ] Métricas/logs adicionados (se feature operacionalmente
      visível)
```

## Review

### Para o autor
- **Auto-review primeiro.** Antes de pedir review, leia o seu
  próprio diff. 80% dos comentários são preventíveis.
- **Comente o que não é óbvio.** TODO links pra context. Se
  algo parece estranho, explique.
- **Responda comentários** mesmo que apenas com "fixed" + commit
  hash. Não deixe comentário em aberto.

### Para o reviewer
- **Approve quando ≥80% confiante.** "OK mas" significa NÃO ok.
  Pedir mudança.
- **Foque em design + correção, não em estilo.** ESLint resolve
  estilo.
- **Nit > Suggestion > Blocking.** Use prefixo:
  - `nit:` — sugestão; aprovação não depende.
  - `suggestion:` — considere; aprovação depende de discussão.
  - `blocking:` — não merge sem resolver.
- **Sugira código.** GitHub permite suggested changes — usar.
- **Approve em ≤ 24h** ou diga que não consegue (transfere para
  outro reviewer). PR parado é debt.

### Reviewer load balancing
CODEOWNERS designa reviewers. Para distribuir:
- Round-robin via `gh pr review --request <user>`.
- Em times >3 devs: rotacionar weekly assignee.
- Reviewer atual em férias: pull-request bot reassigna
  automaticamente.

## Branch protection (configurado no GitHub)

Ver `condosync/apps/api/docs/BRANCH_PROTECTION.md`.

Required:
- ≥1 approval (≥2 em paths críticos definidos em CODEOWNERS).
- CI verde (test, lint, typecheck, IT, docker-build,
  dependency-review).
- Review from Code Owners.
- Resolved conversations.
- Linear history (squash/rebase).

## Hotfix

PR direto em `hotfix/<issue>` com:
- 2 reviewers (mesmo em incidente — 4 olhos sempre).
- Comentário `[hotfix-bypass: <motivo>]` se algum check
  precisar ser pulado.
- Issue de pós-mortem aberta automaticamente.

Sem cowboying. Mesmo em fogo, 30min de review valem mais que
1h de incidente novo.

## Commits

- Mensagem ≤ 72 chars na linha 1.
- Body opcional explicando "por quê" (não "o quê" — o diff já
  conta).
- Não amend após push (a menos que apenas você esteja na branch).
- Squash no merge para `main`. Mensagem final = título do PR.
