# 🏪 Design de Catálogo de Produtos - Interação Morador ↔ Parceiro

**Data:** 19 de maio de 2026  
**Status:** Design & Análise de Cenários

---

## 🎯 Objetivo
Sistema de catálogo de produtos onde moradores **visualizam, filtram e solicitam diretamente ao parceiro** sem intermediação de pagamento do sistema.

---

## 📊 CENÁRIO RECOMENDADO: "Catálogo com Solicitações Diretas"

### Fluxo de Interação

```
┌─────────────────┐
│  Morador Login  │
└────────┬────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  Mobile: Tab "Ofertas" (Marketplace) │
└────────┬─────────────────────────────┘
         │
         ├─→ Visualizar Parceiros por Categoria
         │   - Academia FitLife
         │   - Restaurante Sabor & Arte
         │   - Farmácia Saúde Viva
         │
         ↓
┌──────────────────────────────────────┐
│  Clicar em Parceiro → Ver Catálogo   │
│  - Nome Produto                       │
│  - Descrição                          │
│  - Preço Original: R$ 100             │
│  - Desconto: -10%                     │
│  - Preço Final: R$ 90                 │
│  - Frete: R$ 10                       │
│  - Total: R$ 100                      │
│  - Imagem                             │
└────────┬─────────────────────────────┘
         │
         ├─→ [Ver Mais Detalhes]
         │
         ├─→ [Contactar Parceiro]  ← NOVO
         │   │
         │   ├─→ Chat em Tempo Real
         │   ├─→ Enviar para WhatsApp
         │   └─→ Gerar Link de Compra
         │
         └─→ [Solicitar Produto]  ← NOVO
             │
             ├─→ Cria "Requisição de Produto"
             ├─→ Parceiro recebe notificação
             ├─→ Morador acompanha status
             └─→ Parceiro responde com orçamento/disponibilidade
```

---

## 🗄️ **Tabelas Adicionadas**

### 1. **MarketplaceProduct** (Catálogo)
```sql
CREATE TABLE marketplace_products (
  id UUID PRIMARY KEY,
  partnerId UUID NOT NULL FK → marketplace_partners,
  condominiumId UUID NOT NULL FK → condominiums,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(5,2) DEFAULT 0, -- percentual
  finalPrice DECIMAL(10,2) NOT NULL, -- preço após desconto
  shippingCost DECIMAL(10,2) DEFAULT 0,
  imageUrl VARCHAR(500),
  category VARCHAR(100), -- mesmo do parceiro ou subcategoria
  stock INT DEFAULT 0, -- -1 = ilimitado
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### 2. **MarketplaceProductRequest** (Requisições de Moradores)
```sql
CREATE TABLE marketplace_product_requests (
  id UUID PRIMARY KEY,
  productId UUID FK → marketplace_products,
  partnerId UUID FK → marketplace_partners,
  residentId UUID FK → users,
  condominiumId UUID FK → condominiums,
  quantity INT DEFAULT 1,
  notes TEXT, -- observações do morador
  status ENUM('PENDING', 'QUOTED', 'ACCEPTED', 'REJECTED', 'DELIVERED'),
  requestedAt TIMESTAMP,
  respondedAt TIMESTAMP,
  deliveryDate DATE,
  createdAt TIMESTAMP
);
```

### 3. **MarketplaceProductImage** (Múltiplas Imagens)
```sql
CREATE TABLE marketplace_product_images (
  id UUID PRIMARY KEY,
  productId UUID FK → marketplace_products,
  imageUrl VARCHAR(500),
  displayOrder INT,
  createdAt TIMESTAMP
);
```

### 4. **MarketplaceProductReview** (Avaliações de Moradores)
```sql
CREATE TABLE marketplace_product_reviews (
  id UUID PRIMARY KEY,
  productId UUID FK → marketplace_products,
  residentId UUID FK → users,
  rating INT (1-5),
  comment TEXT,
  createdAt TIMESTAMP
);
```

---

## 🔌 **API Endpoints**

### **Admin (Parceiro)**

```
POST   /marketplace/products           Criar produto
PUT    /marketplace/products/:id       Editar produto
DELETE /marketplace/products/:id       Deletar produto
GET    /marketplace/products/admin     Listar meus produtos (Parceiro)

POST   /marketplace/products/import    Importar via CSV
```

**CSV Import Format:**
```csv
name,description,price,discount,shippingCost,stock,imageUrl,category
Whey Protein,Proteína isolada,150.00,10,15.00,50,https://...,alimentacao
Treadmill,Esteira profissional,2500.00,0,100.00,5,https://...,esportes
```

### **Morador (Resident)**

```
GET    /marketplace/products           Listar todos produtos (filtrado por condominium)
GET    /marketplace/products/:id       Detalhe do produto + avaliações
GET    /marketplace/products/partner/:id Listar produtos de 1 parceiro

POST   /marketplace/requests           Solicitar produto
GET    /marketplace/requests           Meus pedidos/requisições
PATCH  /marketplace/requests/:id       Cancelar requisição

POST   /marketplace/products/:id/reviews Avaliar produto
GET    /marketplace/products/:id/reviews Listar avaliações
```

### **Admin (Condominium)**

```
GET    /marketplace/analytics         Dashboard de vendas por parceiro
GET    /marketplace/partners/stats     Estatísticas de cada parceiro
```

---

## 🎨 **UI/UX - Web Admin (Parceiro)**

### Tab "Catálogo de Produtos"
```
┌─────────────────────────────────────────────────────┐
│ Meus Produtos (Academia FitLife)                    │
│ [+ Adicionar Produto] [📥 Importar CSV]             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Imagem] Whey Protein 900g                          │
│          R$ 150.00 → R$ 135 (10% desconto)          │
│          Frete: R$ 15.00 | Total: R$ 150           │
│          Stock: 50 | [📊 2 avaliações] ⭐⭐⭐⭐⭐    │
│          [Editar] [Deletar] [Ver Requisições]      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Tab "Requisições de Moradores"
```
┌────────────────────────────────────────────────────────┐
│ Requisições Recebidas                                 │
│ Filtrar: [Pendente▼] [Esta Semana▼]                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 🔴 PENDENTE | Ana Costa | Whey Protein x2            │
│             | Apto 512 | Veredas do Bosque           │
│             | "Entregar até amanhã" | 15/05 18:30    │
│             [Responder com Orçamento] [Rejeitar]    │
│                                                        │
│ 🟢 RESPONDIDO | Bruno Oliveira | Treadmill x1         │
│             | Apto 621 | Veredas do Bosque           │
│             | Orçado: R$ 2.500 | 14/05 16:00        │
│             [Aguardando Confirmação do Morador]      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 📱 **UI/UX - Mobile (Morador)**

### Gallery de Produtos
```
┌─────────────────┐
│  OFERTAS        │
│ [Academia ▼]    │
│ [Filtrar ▼]     │
├─────────────────┤
│  ┌─────────┐    │
│  │ IMAGEM  │    │
│  │ Whey    │    │
│  │ 900g    │    │
│  │ R$135   │    │
│  │ ⭐⭐⭐⭐│ (2) │
│  │ Frete:  │    │
│  │ R$ 15   │    │
│  │ Total:  │    │
│  │ R$ 150  │    │
│  │[Detalhes]   │
│  │[Solicitar]  │
│  └─────────┘    │
│  ┌─────────┐    │
│  │ IMAGEM  │    │
│  │ ...     │    │
│  └─────────┘    │
└─────────────────┘
```

### Detalhe do Produto
```
┌──────────────────────────┐
│ [◄] Whey Protein 900g    │
├──────────────────────────┤
│ [Grande Imagem]          │
│ R$ 150.00                │
│ ← 10% de desconto        │
│ = R$ 135.00              │
│ + Frete: R$ 15.00        │
│ ─────────────────        │
│ Total: R$ 150.00         │
│                          │
│ Stock: 50 unidades       │
│ ⭐⭐⭐⭐⭐ (2 reviews) │
│                          │
│ Descrição:               │
│ Proteína isolada com     │
│ melhor absorção...       │
│                          │
│ [Avaliações ▼]           │
│ [Contactar Parceiro ▼]   │
│ [SOLICITAR AGORA]        │
│ [Compartilhar]           │
└──────────────────────────┘
```

### Após Clicar "SOLICITAR AGORA"
```
┌──────────────────────────┐
│ Solicitar Whey 900g      │
├──────────────────────────┤
│ Quantidade: [1] [+][-]   │
│ Observações:             │
│ ┌──────────────────────┐ │
│ │ Ex: entregar amanhã  │ │
│ │ até 13h              │ │
│ └──────────────────────┘ │
│                          │
│ Resumo:                  │
│ Preço: R$ 135.00         │
│ Frete: R$ 15.00          │
│ Total: R$ 150.00         │
│                          │
│ [CONTACTAR VIA WHATSAPP] │
│ [ENVIAR REQUISIÇÃO]      │
│ [CANCELAR]               │
└──────────────────────────┘
```

### Acompanhamento de Requisições
```
┌──────────────────────────┐
│ Minhas Requisições       │
├──────────────────────────┤
│ 🔴 PENDENTE              │
│ Academia FitLife         │
│ Whey Protein x2          │
│ Solicitado há 2h         │
│ Total: R$ 300            │
│ [Ver Detalhes] [Chat]    │
│                          │
│ 🟡 RESPONDIDO            │
│ Academia FitLife         │
│ Treadmill x1             │
│ Orçado: R$ 2.500         │
│ [Ver Detalhes] [Chat]    │
│ [ACEITAR] [REJEITAR]     │
│                          │
│ 🟢 ACEITO                │
│ Restaurante Sabor        │
│ Prato x5                 │
│ Entregar: 20/05 às 19h   │
│ Total: R$ 250            │
│ [Chat] [Rastrear]        │
└──────────────────────────┘
```

---

## ⚙️ **Funcionalidades Implementadas**

| Feature | Prioridade | Status |
|---------|-----------|--------|
| Adicionar Tabelas Prisma | 🔴 Alta | ⏳ Pendente |
| Importação CSV de Produtos | 🔴 Alta | ⏳ Pendente |
| CRUD de Produtos (Admin) | 🔴 Alta | ⏳ Pendente |
| Listar Produtos (Morador) | 🔴 Alta | ⏳ Pendente |
| Sistema de Requisições | 🟡 Média | ⏳ Pendente |
| UI Web Admin - Catálogo | 🟡 Média | ⏳ Pendente |
| UI Mobile - Catálogo | 🟡 Média | ⏳ Pendente |
| Avaliações de Produtos | 🟢 Baixa | ⏳ Pendente |
| Integração WhatsApp | 🟢 Baixa | ⏳ Pendente |
| Dashboard de Vendas | 🟢 Baixa | ⏳ Pendente |

---

## 📝 **Roadmap de Implementação**

### **Fase 1 - MVP (4-6 horas)**
- ✅ Tabelas Prisma + Migration
- ✅ API CRUD Produtos
- ✅ Importação CSV
- ✅ UI Web Admin (Parceiro) - upload manual
- ✅ UI Mobile - visualizar catálogo

### **Fase 2 - Interação (6-8 horas)**
- ✅ Sistema de Requisições (requisição → parceiro vê)
- ✅ Chat em Tempo Real
- ✅ Notificações Push
- ✅ Status de Requisição (Pendente → Respondido → Aceito → Entregue)

### **Fase 3 - Polish (2-4 horas)**
- ✅ Avaliações de Produtos
- ✅ Dashboard de Vendas
- ✅ Integração WhatsApp (link de contato)
- ✅ Filtros e Busca avançada

---

## 🔐 **Segurança & Multi-Tenancy**

- ✅ Produtos filtrados por `condominiumId`
- ✅ Morador só vê produtos do seu condomínio
- ✅ Parceiro edita apenas seus produtos
- ✅ Requisições isoladas por condomínio
- ✅ Autenticação JWT obrigatória

---

## 📊 **Analytics para Admin do Condomínio**

```
Dashboard Marketplace:
├── Total de Parceiros: 3
├── Total de Produtos: 45
├── Requisições Este Mês: 127
├── Avaliação Média: 4.7/5
├── Valor Total em Requisições: R$ 15.430
└── Top 3 Produtos:
    1. Whey Protein - 23 requisições
    2. Treadmill - 8 requisições
    3. Antibiótico X - 5 requisições
```

---

**Status:** 🔄 Pronto para implementação  
**Próximo Passo:** Confirmar com usuário e iniciar desenvolvimento
