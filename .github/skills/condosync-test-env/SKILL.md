---
name: condosync-test-env
description: "Sobe o ambiente CondoSync para teste, popula o banco com dados demo e valida o sistema. Use quando quiser testar o sistema localmente, validar funcionalidades, gerar dados de demonstração ou diagnosticar problemas de dados no dashboard. Palavras-chave: subir sistema, testar, dados demo, seed, popular banco, validar, ambiente local, docker."
argument-hint: "O que deseja fazer? (subir sistema / popular dados / limpar cache / reiniciar)"
---

# CondoSync — Ambiente de Teste Local

## O que esta skill faz

Guia o processo completo de subir o CondoSync localmente via Docker, popular o banco com dados realistas de demonstração e resolver problemas comuns como cache desatualizado e falhas de inicialização.

## Pré-requisitos

- Docker Desktop rodando
- Workspace: `condosync/` (monorepo com `apps/api` e `apps/web`)

---

## 1. Subir o sistema

```powershell
cd condosync
docker compose up -d --build
```

Aguardar todos os containers ficarem saudáveis:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Containers esperados:**

| Container            | Porta | Healthcheck |
| -------------------- | ----- | ----------- |
| `condosync-postgres` | 5432  | healthy     |
| `condosync-redis`    | 6379  | running     |
| `condosync-api`      | 3333  | healthy     |
| `condosync-web`      | 80    | running     |

**Sistema disponível em:** http://localhost

---

## 2. Diagnóstico de falhas comuns

### API não inicia — `exec ./entrypoint.sh: no such file or directory`

**Causa:** quebra de linha CRLF (Windows) no `entrypoint.sh`.  
**Correção:** No `apps/api/Dockerfile`, substituir:

```dockerfile
RUN chmod +x ./entrypoint.sh
```

por:

```dockerfile
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh
```

Depois rebuildar: `docker compose up -d --build`

### Ver logs da API

```powershell
docker logs condosync-api --tail 50
```

---

## 3. Popular banco com dados demo

O script `prisma/seed-demo.js` já existe no projeto. Copiar para o container e executar:

```powershell
docker cp apps/api/prisma/seed-demo.js condosync-api:/app/prisma/seed-demo.js
docker exec condosync-api node prisma/seed-demo.js
```

**Dados inseridos pelo seed demo:**

| Módulo                 | Qtd | Detalhes                                      |
| ---------------------- | --- | --------------------------------------------- |
| Visitantes             | 6   | Estados: INSIDE, LEFT, AUTHORIZED, PENDING    |
| Encomendas             | 6   | RECEIVED, NOTIFIED, PICKED_UP                 |
| Veículos               | 6   | Carros e motos                                |
| Ordens de serviço      | 7   | OPEN, IN_PROGRESS, COMPLETED                  |
| Ocorrências            | 5   | Barulho, segurança, vandalismo                |
| Cobranças              | 15  | 3 meses × 5 unidades (PAID, OVERDUE, PENDING) |
| Transações financeiras | 9   | Receitas e despesas históricas                |
| Reservas de área comum | 6   | Passadas e futuras                            |
| Comunicados            | 5   | Fixados e oficiais                            |
| Enquete                | 1   | Ativa por 7 dias                              |

---

## 4. Dashboard mostrando zeros após seed

**Causa:** cache Redis de 10 minutos gerado antes da inserção dos dados.

**Correção — limpar cache do dashboard:**

```powershell
docker exec condosync-redis redis-cli KEYS "dashboard:*"
# copiar a chave retornada e deletar:
docker exec condosync-redis redis-cli DEL "dashboard:<ID>"
```

**Ou limpar todo o cache de uma vez:**

```powershell
docker exec condosync-redis redis-cli FLUSHDB
```

Depois recarregar a página (F5).

---

## 5. Credenciais de acesso

| Perfil      | Email                         | Senha           |
| ----------- | ----------------------------- | --------------- |
| Super Admin | `admin@condosync.com.br`      | `Admin@2026`    |
| Síndico     | `sindico@parqueverde.com.br`  | `Sindico@2026`  |
| Porteiro    | `porteiro@parqueverde.com.br` | `Porteiro@2026` |
| Morador     | `morador1@parqueverde.com.br` | `Morador@2026`  |

---

## 6. Reiniciar do zero (apagar todos os dados)

```powershell
docker compose down -v   # remove volumes (banco + redis)
docker compose up -d --build
# aguardar api ficar healthy, depois rodar o seed demo novamente
```

---

## 7. Após alterar código do frontend

Rebuildar e subir o web + limpar cache em sequência:

```powershell
docker compose build web
docker compose up -d web
docker exec condosync-redis redis-cli FLUSHDB
```

Depois recarregar a página (F5).

## 8. Parar o sistema

```powershell
docker compose down
```

---

## 9. Visualizar emails enviados pelo sistema (Mailpit)

O ambiente inclui o **Mailpit** — um capturador de emails para desenvolvimento. Todos os emails enviados pelo sistema (notificações de encomendas, visitantes, etc.) ficam disponíveis na interface web:

**URL:** `http://localhost:8025`

O container `condosync-mailpit` sobe automaticamente com o `docker compose up -d`.

**Teste rápido via API:**

```powershell
# 1. Login como porteiro
$resp = Invoke-RestMethod -Method Post -Uri "http://localhost:3333/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"porteiro@parqueverde.com.br","password":"Porteiro@2026"}'
$TOKEN = $resp.data.accessToken

# 2. Registrar encomenda (dispara email para o morador da unidade)
Invoke-RestMethod -Method Post -Uri "http://localhost:3333/api/v1/parcels" `
  -Headers @{Authorization="Bearer $TOKEN"} `
  -ContentType "application/json" `
  -Body '{"unitId":"61c947f1-c458-48a9-abe5-0cf3dc1d92fa","carrier":"Correios","description":"Teste email"}'

# 3. Ver emails recebidos
Invoke-RestMethod -Uri "http://localhost:8025/api/v1/messages" | ConvertTo-Json -Depth 2
```
