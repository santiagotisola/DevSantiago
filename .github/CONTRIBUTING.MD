# CondoSync — Diretrizes do Workspace (v2)

SaaS multi-tenant para gestão de condomínios.

Este documento define padrões obrigatórios para garantir:

- integridade dos dados
- escalabilidade
- prevenção de regressões
- consistência de código

---

# 🧠 PRINCÍPIO FUNDAMENTAL

> O backend é a única fonte da verdade.

- Nenhuma regra crítica pode existir apenas no frontend
- Toda validação deve estar no service
- O banco deve reforçar regras críticas

---

# 🔴 REGRAS DE NEGÓCIO CRÍTICAS (INVIOLÁVEIS)

## 1. Morador ↔ Unidade

- Um `Resident` DEVE sempre estar vinculado a uma `Unit`
- `unitId` é obrigatório e deve existir no banco
- Não permitir:
  - criação sem `unitId`
  - vínculo com unidade inexistente

### Obrigatório:

- validação no service
- foreign key no banco
- campo NOT NULL

---

## 2. Isolamento multi-tenant

- Todas as queries devem filtrar por `condominiumId`
- Nenhum usuário pode acessar dados de outro condomínio

### Obrigatório:

- validação no service
- nunca confiar apenas no frontend

---

## 3. Integridade de relacionamentos

Nunca permitir:

- Visitor sem Unit válida
- Charge sem Resident válido
- Reservation sem vínculo com Unit
- Maintenance sem Condominium

---

## 4. Backend valida tudo

- Frontend é apenas UX
- Toda validação deve existir no backend
- Erros devem ser explícitos (400/422)

---

# 🧱 CAMADAS DA APLICAÇÃO

## Controller

- Responsável apenas por HTTP
- Não contém regra de negócio
- Apenas valida input básico (DTO)

## Service

- Contém TODA regra de negócio
- Responsável por:
  - validações
  - consistência
  - integridade

## Database (Prisma)

- Deve reforçar regras críticas:
  - foreign keys
  - NOT NULL
  - unique constraints

---

# ⚠️ PADRÃO OBRIGATÓRIO DE VALIDAÇÃO

Sempre validar no service:

```ts
if (!unitId) {
  throw new BadRequestError("Unit is required");
}

const unit = await prisma.unit.findUnique({ where: { id: unitId } });

if (!unit) {
  throw new NotFoundError("Unit not found");
}
```
