# Prometheus rules — SLOs e alertas

Regras versionadas em código. Aplicar via Prometheus Operator
(CRD `PrometheusRule`) ou em `prometheus.yml: rule_files`.

## Validação local

```bash
# Instalar promtool (vem com Prometheus)
brew install prometheus       # macOS
sudo apt-get install prometheus  # Debian/Ubuntu

# Validar sintaxe
promtool check rules ops/prometheus/slos.yml

# Testar uma expressão
promtool query instant http://prometheus:9090 \
  'sli:api_request_success_ratio:5m'
```

## CI

Adicionar em `.github/workflows/ci.yml`:

```yaml
prometheus-rules-lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: |
        wget -q https://github.com/prometheus/prometheus/releases/download/v2.54.0/prometheus-2.54.0.linux-amd64.tar.gz
        tar xzf prometheus-*.tar.gz
        ./prometheus-*/promtool check rules ops/prometheus/*.yml
```

## SLOs definidos

| SLO | Target | Janela | Burn rate alert |
|---|---|---|---|
| API HTTP availability | 99.9% | 30 dias | Fast (1h × 14.4) + Slow (6h × 6) |
| API latência p95 | < 500ms | 5min sustained | warn 10min |
| Webhook Asaas processed in 60s | 99.5% | 30 dias | backlog > 100 page; errors > 5/min page |

## Error budget arithmetic

99.9% mensal = 43.2min de downtime/mês.

Burn rate = ratio de gasto vs orçamento total.
- 14.4× = consome 2% do budget mensal em 1h.
- 6× = consome 5% em 6h.

Multi-window multi-burn (Google SRE Workbook):
- Page se BOTH 5m AND 1h windows acima do limite (evita alerta
  por blip).
- Warn se 6h window acima por mais tempo (degradação progressiva).

## Cardinality

Cuidados aplicados:
- `route` label vem de `req.route?.path` (template, não path cru).
- `queue` label é fixo (lista de queues conhecidas, não user input).
- `module` em idor_guard_decisions vem de string literal no código.

Risco: rota dinâmica que não casa template Express → cai em
"unknown" (OK) ou em path cru (cardinality explosiva).
Auditar a cada nova rota; alerta se `count by (route)
(http_requests_total) > 200`.

## Próximos SLOs (a adicionar)

- Login latência p95 < 800ms (bcrypt nativo, mas SMTP em forgot
  password pode atrasar).
- Dashboard listagem financeira p95 < 200ms (com cache de
  balance).
- Notification delivery (inapp): p95 < 5s end-to-end (enqueue →
  Socket.IO emit).
- Asaas circuit breaker uptime (% tempo fechado) > 99%.
