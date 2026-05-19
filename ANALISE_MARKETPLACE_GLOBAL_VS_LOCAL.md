# 🌍 Análise Expandida - Marketplace Global vs. Local

**Data:** 19 de maio de 2026  
**Atualização:** Adicionado critério de visibilidade global/local

---

## 📊 **3 Modelos de Visibilidade**

### **Modelo 1: Isolado por Condomínio (ATUAL)**
```
Parceiro "Academia FitLife"
├─ Visível em: Condomínio A apenas
│
Parceiro "Farmácia Saúde Viva"
├─ Visível em: Condomínio B apenas

❌ Problema: Academia com 3 filiais = 3 cadastros duplicados
```

---

### **Modelo 2: Global com Controle (RECOMENDADO) ⭐**
```
Parceiro "Academia FitLife"
├─ Modo: GLOBAL
├─ Filiais:
│  ├─ Academia FitLife - Unidade Zona Sul (Condomínio A)
│  ├─ Academia FitLife - Unidade Zona Norte (Condomínio B)
│  └─ Academia FitLife - Unidade Zona Leste (Condomínio C)
├─ Visível em: [✅] Condomínio A [✅] Condomínio B [✅] Condomínio C
│
Parceiro "Restaurante Local"
├─ Modo: LOCAL
├─ Visível em: [Condomínio A] apenas

✅ Vantagem: Um cadastro, múltiplas localidades
✅ Flexibilidade: Escolher onde aparecer
```

---

### **Modelo 3: Híbrido com Cobertura (MAIS FLEXÍVEL)**
```
Parceiro "Academia FitLife"
├─ Modo: MULTI-CONDOMÍNIO
├─ Cobertura: 
│  ├─ Filial Zona Sul: atende Condomínios A, B, C (raio 5km)
│  ├─ Filial Zona Norte: atende Condomínios D, E (raio 5km)
│
Parceiro "Pizzaria Express"
├─ Modo: DELIVERY ZONE
├─ Cobertura: Entrega em Condomínios A, B, C, D

✅ Mais realista (rações de cobertura geográfica)
✅ Suporta delivery zones
```

---

## 🎯 **RECOMENDAÇÃO: Modelo 2 - Global com Controle**

### Por Que?

| Critério | Modelo 1<br/>Isolado | Modelo 2<br/>Global | Modelo 3<br/>Híbrido |
|----------|:--:|:--:|:--:|
| Implementação | Fácil | Média | Difícil |
| Flexibilidade | Baixa | Alta | Muito Alta |
| Duplicação | Alta ❌ | Nenhuma ✅ | Nenhuma ✅ |
| Caso Real | ❌ | ✅ | ✅ (Versão 2.0) |
| Complexidade DB | Baixa | Média | Alta |

---

## 🗄️ **Schema do Banco - Modelo 2 (Global)**

### Estrutura Atual (v1)
```sql
model MarketplacePartner {
  id           String
  condominiumId String  ← PROBLEMA: só um condomínio
  name         String
  category     String
  ...
}
```

### Estrutura Expandida (v2 - NOVA)
```sql
model MarketplacePartner {
  id                    String @id @default(uuid())
  name                  String
  description           String?
  category              String
  logoUrl               String?
  website               String?
  phone                 String?
  email                 String?
  
  # NOVO: Controle de Visibilidade
  visibilityMode        VisibilityMode @default(LOCAL) 
                        # LOCAL, GLOBAL, SELECTIVE
  
  createdByUserId       String
  createdByCondominiumId String  # Quem criou o parceiro
  
  # Relações
  condominiums          CondominiumMarketplacePartner[]  # NOVO: tabela de junção
  products              MarketplaceProduct[]
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@map("marketplace_partners")
}

# NOVA TABELA: Controla visibilidade em múltiplos condominiums
model CondominiumMarketplacePartner {
  id           String @id @default(uuid())
  partner      MarketplacePartner @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  partnerId    String
  condominium  Condominium @relation(fields: [condominiumId], references: [id], onDelete: Cascade)
  condominiumId String
  
  # Dados específicos por localidade (opcional)
  branchName   String?  # ex: "Academia FitLife - Unidade Zona Sul"
  branchPhone  String?
  branchEmail  String?
  deliveryZone String?  # ex: "Zona Sul, Raio 5km"
  
  isActive     Boolean @default(true)
  createdAt    DateTime @default(now())
  
  @@unique([partnerId, condominiumId])
  @@map("condominium_marketplace_partners")
}

model Condominium {
  # ... campos existentes ...
  
  # NOVO: relações com marketplace
  marketplacePartners CondominiumMarketplacePartner[]
  
  @@map("condominiums")
}
```

---

## 📊 **Comparação de Dados**

### Exemplo Prático: Academia FitLife com 3 Filiais

#### ❌ Modelo 1 (Isolado) - ANTES
```sql
-- 3 registros duplicados
INSERT INTO marketplace_partners 
(id, name, category, condominiumId) VALUES
('id-1', 'Academia FitLife', 'esportes', 'cond-a'),  ← Zona Sul
('id-2', 'Academia FitLife', 'esportes', 'cond-b'),  ← Zona Norte
('id-3', 'Academia FitLife', 'esportes', 'cond-c');  ← Zona Leste

-- Problema: Editar nome/logo afeta só um condomínio
-- Parceiro ve 3 entradas diferentes no dashboard
```

#### ✅ Modelo 2 (Global) - DEPOIS
```sql
-- 1 registro global
INSERT INTO marketplace_partners 
(id, name, category, visibilityMode, createdByCondominiumId) VALUES
('id-1', 'Academia FitLife', 'esportes', 'GLOBAL', 'cond-a');

-- Disponibilidade nos condominiums
INSERT INTO condominium_marketplace_partners 
(id, partnerId, condominiumId, branchName) VALUES
('link-1', 'id-1', 'cond-a', 'Academia FitLife - Zona Sul'),
('link-2', 'id-1', 'cond-b', 'Academia FitLife - Zona Norte'),
('link-3', 'id-1', 'cond-c', 'Academia FitLife - Zona Leste');

-- Vantagem: 1 edição = atualiza tudo
-- Parceiro ve 1 entrada com 3 localidades
```

---

## 🔌 **Impacto na API**

### Endpoints Novos
```
# Admin (Parceiro)
POST   /marketplace/partners/global          # Criar global
PUT    /marketplace/partners/:id/visibilidade # Mudar modo
POST   /marketplace/partners/:id/add-condominium   # Adicionar condomínio
DELETE /marketplace/partners/:id/remove-condominium  # Remover condomínio

# Admin (Condomínio)
GET    /marketplace/partners/global         # Ver parceiros globais do sistema
PATCH  /marketplace/partners/:id/approve    # Aprovar parceiro global
```

### Endpoints Modificados
```
# Listar parceiros (morador)
GET    /marketplace/partners?condominiumId=X

ANTES: Retorna só parceiros.condominiumId = X
DEPOIS: Retorna parceiros locais + globais visíveis em X
       (via CondominiumMarketplacePartner join)

QUERY:
SELECT mp.* FROM marketplace_partners mp
LEFT JOIN condominium_marketplace_partners cmp 
  ON mp.id = cmp.partnerId
WHERE 
  (mp.visibilityMode = 'LOCAL' AND mp.createdByCondominiumId = ?)
  OR (mp.visibilityMode = 'GLOBAL' AND cmp.condominiumId = ?)
  OR (mp.visibilityMode = 'SELECTIVE' AND cmp.condominiumId = ?)
```

---

## 🎨 **Impacto na UI**

### Web Admin (Parceiro) - NOVO FLUXO

#### Criar Parceiro
```
Formulário:
├─ Nome: "Academia FitLife"
├─ Categoria: "Esportes"
├─ Logo/Descrição
│
├─ Modo de Visibilidade: [LOCAL ▼]
│  ├─ LOCAL: Apenas neste condomínio
│  ├─ GLOBAL: Visível em múltiplos condominiums
│  └─ SELECTIVE: Escolher quais condominiums
│
└─ [Se GLOBAL/SELECTIVE]
   ├─ ☐ Condomínio A (Veredas do Bosque)
   ├─ ☐ Condomínio B (Parque Verde)
   ├─ ☐ Condomínio C (Vila Nova)
   └─ [SALVAR]
```

#### Gerenciar Parceiro Global
```
Parceiro: Academia FitLife (GLOBAL)

┌─────────────────────────────────────┐
│ Modo: GLOBAL                        │
│ Criado por: Condomínio A            │
│                                     │
│ Visível em:                         │
│ ✅ Condomínio A (Veredas do Bosque) │
│    └─ Filial: "Zona Sul"            │
│ ✅ Condomínio B (Parque Verde)      │
│    └─ Filial: "Zona Norte"          │
│ ❌ Condomínio C (Vila Nova)         │
│    [+ Adicionar] [- Remover]        │
│                                     │
│ [Editar] [Deletar]                  │
└─────────────────────────────────────┘
```

### Web Admin (Condomínio) - NOVO

#### Aprovar/Rejeitar Parceiros Globais
```
Dashboard Admin Condomínio:

Parceiros Globais Disponíveis no Sistema:
┌─────────────────────────────────────┐
│ Academia FitLife (GLOBAL)           │
│ Criado por: Condomínio A            │
│ Cobertura: 3 condomíniums           │
│ Status: ✅ Já cadastrado             │
│                                     │
│ Pizzaria Express (GLOBAL)           │
│ Criado por: Condomínio C            │
│ Cobertura: 2 condomíniums           │
│ Status: ⏳ Aguardando aprovação     │
│ [Aprovar] [Rejeitar]                │
└─────────────────────────────────────┘
```

---

## 📱 **Impacto no Mobile (Morador)**

### ANTES (Isolado)
```
Ofertas - Condomínio A
├─ Academia FitLife (Zona Sul)
├─ Restaurante Sabor & Arte
├─ Farmácia Saúde Viva

Ofertas - Condomínio B
├─ Academia FitLife (Zona Norte)  ← DUPLICADA
├─ Pizza Express
└─ Farmácia Saúde Viva            ← DUPLICADA
```

### DEPOIS (Global)
```
Ofertas - Condomínio A
├─ Academia FitLife
│  └─ (3 localidades: Zona Sul, Zona Norte, Zona Leste)
├─ Restaurante Sabor & Arte (Local)
├─ Farmácia Saúde Viva (Global)
└─ Pizza Express (Global)

Ofertas - Condomínio B
├─ Academia FitLife
│  └─ (3 localidades: Zona Sul, Zona Norte, Zona Leste)
├─ Farmácia Saúde Viva (Global)
└─ Pizza Express (Global)
```

### UI Ajustada
```
[Parceiro]
├─ Nome: Academia FitLife
├─ Modo: 🌍 Global (3 filiais)
│  ou
├─ Modo: 📍 Local (Este condomínio)
│
├─ [Ver Todas as Filiais]
│  ├─ Zona Sul (5km de distância)
│  ├─ Zona Norte (8km de distância)
│  └─ Zona Leste (12km de distância)
│
└─ [Ver Catálogo]
```

---

## 🔄 **Casos de Uso Reais**

### Caso 1: Cadeia de Farmácias
```
Farmácia Saúde Viva
├─ 15 filiais em São Paulo
├─ Quer aparecer em: 50 condomínios
└─ SOLUÇÃO: Criar 1 parceiro GLOBAL + adicionar 50 condominiums
           Edita uma vez = atualiza em todos os 50
```

### Caso 2: Academia com Franquia
```
Academia FitLife
├─ Filial Zona Sul: atende Condomínios A, B, C
├─ Filial Zona Norte: atende Condomínios D, E, F
├─ Filial Zona Leste: atende Condomínios G, H, I
└─ SOLUÇÃO: 1 parceiro GLOBAL + 9 condominiums
            Morador vê qual filial o atende
```

### Caso 3: Restaurante Delivery
```
Pizzaria Express
├─ Quer entregar em: Condomínios A, B, C, D, E
├─ Entrega: Em até 30 min (5km raio)
└─ SOLUÇÃO: Criar 1 parceiro GLOBAL
            Definir "delivery zone" por condomínio
```

### Caso 4: Loja Local (Sem Expansão)
```
Loja de Doces Caseiros
├─ Só opera em: Condomínio A
├─ Sem planos de expandir
└─ SOLUÇÃO: Criar parceiro LOCAL
            Ativa only em Condomínio A
```

---

## 📊 **Impacto no Banco de Dados**

### Migration SQL
```sql
-- Passo 1: Adicionar coluna de modo de visibilidade
ALTER TABLE marketplace_partners 
ADD COLUMN visibility_mode VARCHAR(20) DEFAULT 'LOCAL';
ADD COLUMN created_by_condominium_id UUID;

-- Passo 2: Criar tabela de junção
CREATE TABLE condominium_marketplace_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES marketplace_partners(id) ON DELETE CASCADE,
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  branch_name VARCHAR(200),
  branch_phone VARCHAR(20),
  branch_email VARCHAR(100),
  delivery_zone VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(partner_id, condominium_id)
);

-- Passo 3: Migrar dados existentes
INSERT INTO condominium_marketplace_partners 
(partner_id, condominium_id, branch_name)
SELECT id, condominium_id, name
FROM marketplace_partners;

-- Passo 4: Remover coluna antiga (optional)
ALTER TABLE marketplace_partners 
DROP COLUMN condominium_id;
```

---

## 🎯 **Roadmap Atualizado**

### **Fase 1 - MVP (Sem Mudança)**
- Usar Modelo 1 (Isolado) - implementar logo

### **Fase 2 - Expansão Global (Opcional)**
- Migrar para Modelo 2 (Global)
- Adicionar UI de múltiplos condominiums
- Teste com Academia FitLife (3 filiais)

### **Fase 3 - Premium**
- Modelo 3 (Híbrido com delivery zones)
- Aprovações e compliance

---

## 💡 **Recomendação Final**

### **Opção A: Começar com Modelo 1 (Rápido) ⚡**
```
HOJE (3 dias):
├─ Implementar Catálogo Isolado por Condomínio
├─ Teste com Academia FitLife (1 cadastro)
└─ Deploy produção

DEPOIS (Fase 2 - 2 dias):
└─ Migrar para Global (sem perder dados)
```

### **Opção B: Implementar Modelo 2 Agora (Correto) ✅ RECOMENDADO**
```
HOJE (4-5 dias):
├─ Implementar Catálogo com suporte a GLOBAL
├─ Tabela de junção CondominiumMarketplacePartner
├─ UI para gerenciar múltiplos condominiums
└─ Deploy produção (pronto para escalar)

VANTAGEM: Não precisa refatorar depois
```

---

## 📋 **Tabela Comparativa Final**

| Aspecto | Modelo 1<br/>Isolado | Modelo 2<br/>Global ⭐ |
|---------|:--:|:--:|
| **Dev Time** | 2-3 dias | 4-5 dias |
| **Flexibilidade** | Baixa | Alta |
| **Escalabilidade** | Precisa refatorar | Pronta |
| **Duplicação de Dados** | Alta | Nenhuma |
| **Caso Real** | Não | Sim |
| **Refactor Futuro** | ⚠️ Sim | ❌ Não |
| **Recomendação** | MVP rápido | Solução correta |

---

## ✅ **Próximas Ações**

**Qual você prefere?**

1. **Opção A: MVP Rápido** (Modelo 1 + 3 dias)
   - Catálogo isolado por condomínio
   - Migrar para global depois

2. **Opção B: Correto Agora** (Modelo 2 + 4-5 dias) ⭐ RECOMENDADO
   - Catálogo global desde o início
   - Escalável para múltiplos condominiums
   - Sem necessidade de refatoração

**Qual escolher?**
