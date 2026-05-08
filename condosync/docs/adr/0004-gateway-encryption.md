# ADR-0004: Encryption at rest para gateway keys (envelope encryption)

- **Status:** Accepted
- **Date:** 2026-05-08
- **Authors:** @lucas-axion

## Contexto

`FinancialAccount.gatewayKey` armazena API key Asaas — credencial
portadora que dá controle total da carteira (PIX, boleto, refund).
Originalmente em plaintext. Backup leak ou DB-dump (interno ou
externo) expõe a chave.

## Decisão

Implementar envelope encryption AES-256-GCM:

1. Chave-mestre `APP_ENCRYPTION_KEY` em env (32 bytes base64).
2. Cada valor cifrado tem IV próprio (96 bits aleatórios) + auth
   tag (128 bits).
3. Formato versionado: `v1.<base64(iv)>.<base64(tag)>.<base64(ct)>`.
4. Suporte a rotação online: `APP_ENCRYPTION_KEY_PREVIOUS` permite
   decrypt de dados cifrados com a chave antiga durante a janela
   de rotação.
5. Migração EXPAND-only: novas colunas `gatewayKeyEnc`,
   `gatewayConfigEnc` adicionadas ao lado das plaintext. Dual-read
   prefere Enc; fallback para plaintext durante transição. Job
   `encrypt:gateway-keys` cifra rows existentes. CONTRACT em
   sprint posterior dropa colunas plaintext.

## Alternativas consideradas

### A. Field-level encryption via Prisma extension

Bibliotecas como `prisma-field-encryption` cifram automaticamente
campos marcados.

**Contras:** Sem suporte a rotação online; difícil debug; lock-in
em lib externa.

### B. Cloud KMS (AWS, GCP)

KMS gerencia chave-mestre; aplicação só faz envelope encrypt
chamando KMS API.

**Prós:** Não precisa armazenar chave no app; auditoria de uso.
**Contras:** Dependência adicional; latência por encrypt/decrypt
(~10ms/call); custo recorrente; não disponível no Railway.

### C. Envelope encryption local (escolhida)

AES-256-GCM em Node.js crypto módulo com chave em env.

**Prós:** Sem dependências; performance ~µs por operação;
testável; rotação documentada.
**Contras:** Chave-mestre fica em env; rotação manual.

Adequado para o estágio do produto. Em crescimento (>1000
condomínios), considerar KMS (ADR futuro).

## Consequências

- **Positivas:**
  - Backup leak não expõe credenciais Asaas.
  - Rotação trimestral viável sem downtime.
  - Pattern `cryptoVault` extensível para outros campos sensíveis
    (CPF, vehiclePlate?) se LGPD exigir.
- **Negativas:**
  - Overhead constante: cada leitura de FinancialAccount chama
    `decrypt` (mitigado por cache LRU em P5 futuro).
  - Operador precisa guardar chave em vault e não perdê-la (sem
    a chave, dados são irrecuperáveis).
- **Riscos:**
  - Perda de chave = perda total dos campos cifrados (sem
    backdoor). Mitigação: chave em 1Password + offsite backup.
  - Decrypt failure silencioso → fallback para plaintext legado
    durante transição. Mitigação: métrica
    `gateway_decrypt_failures_total`.

## Implementação

- `apps/api/src/utils/cryptoVault.ts` — encrypt/decrypt + rotação.
- `apps/api/src/modules/finance/finance.service.ts` —
  `readGatewayKey`/`readGatewayConfig` com fallback.
- `apps/api/prisma/migrations/20260508160000_gateway_encrypt_expand/`.
- `apps/api/prisma/encrypt-gateway-keys.ts` — backfill.
- Test: `apps/api/src/test/cryptoVault.test.ts` (roundtrip + rotação).

## Referências

- NIST SP 800-38D — GCM mode.
- OWASP Cryptographic Storage Cheat Sheet.
