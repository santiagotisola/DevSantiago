# ⚡ Quick Start - Modelo 4 Marketplace

## 🚀 5 Minutos para Começar

### 1. Clonar e Instalar
```bash
cd c:\Users\Santiago\DevSantiago\condosync
npm install
cd apps/api && npm install && cd ../..
cd apps/web && npm install && cd ../..
cd apps/mobile && npm install && cd ../..
```

### 2. Iniciar Local Dev
```bash
# Terminal 1: Database + API
docker compose up postgres redis api

# Terminal 2: Web Admin
cd apps/web && npm run dev

# Terminal 3: Mobile PWA  
cd apps/mobile && npm run dev
```

**URLs:**
- Web Admin: http://localhost:5173
- Mobile PWA: http://localhost:5174
- API: http://localhost:3333

---

## 🔐 Login Padrão

### Admin (Condominium Manager)
```
Email: atendimentoveredasbosque@gmail.com
Senha: Admin@2026
```

### Morador (Resident)
```
Email: santiagoti_sola@hotmail.com
Senha: Teste@2026
```

---

## 📁 Estrutura Marketplace

### Backend (API REST)
```
apps/api/src/modules/marketplace/
├── marketplace.routes.ts         ← 15+ endpoints
├── marketplace.controller.ts
├── marketplace.service.ts
└── (schemas Zod)
```

**Endpoints principais:**
```
GET    /marketplace/products
POST   /marketplace/products
PUT    /marketplace/products/:id
DELETE /marketplace/products/:id
POST   /marketplace/products/import    (CSV)

GET    /marketplace/requests
POST   /marketplace/requests
PATCH  /marketplace/requests/:id
```

### Frontend Web Admin
```
apps/web/src/pages/marketplace/
└── MarketplaceAdminPage.tsx     ← 4 abas
    ├── Tab 1: Catálogo (CRUD)
    ├── Tab 2: Requisições (status)
    ├── Tab 3: Parceiros
    └── Tab 4: Ofertas
```

### Mobile Resident
```
apps/mobile/src/pages/marketplace/
└── MarketplaceMoradorPage.tsx   ← Catálogo
    ├── Search + Filters
    ├── Product Grid (2 cols)
    ├── Detail Modal
    ├── Shopping Cart
    └── Checkout

apps/mobile/src/components/ui/
└── toaster.tsx                 ← Toast notifications
```

### Database
```
apps/api/prisma/
├── schema.prisma               ← 9 tabelas marketplace
└── migrations/
    └── 20260519172024_add_marketplace_model4/
```

---

## ✨ Features Disponíveis

### ✅ Implementados (Pronto)
- [x] Catálogo de produtos
- [x] CRUD de produtos (admin)
- [x] Busca + Filtros
- [x] Requisições de compra
- [x] Status workflow (PENDING → QUOTED → ACCEPTED)
- [x] Favorites/Wishlist
- [x] Reviews & Ratings (estrutura)
- [x] CSV Import (admin)
- [x] Multi-tenant isolation
- [x] Mobile PWA offline support

### ⏳ Em Desenvolvimento (Fase 3-4)
- [ ] Socket.IO chat ao vivo
- [ ] Push notifications
- [ ] Loyalty points system
- [ ] Payment integration (ASAAS)
- [ ] Analytics dashboard

---

## 🛠️ Tarefas Comuns

### Adicionar novo Produto

**Via Admin Web:**
1. Abra http://localhost:5173
2. Clique "Marketplace"
3. Aba "Catálogo" → Botão "➕ Novo Produto"
4. Preencha formulário
5. Clique "Criar Produto"

**Via API (curl):**
```bash
TOKEN="seu_jwt_aqui"

curl -X POST http://localhost:3333/marketplace/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Café Premium",
    "description": "Café 100% arábica",
    "price": 29.90,
    "discount": 10,
    "shippingCost": 5.00,
    "category": "alimentacao",
    "stock": 100,
    "imageUrl": "https://...",
    "partnerId": "partner-id"
  }'
```

### Importar Produtos em Lote

1. Criar arquivo CSV:
```csv
name,description,price,discount,shippingCost,category,stock
Produto A,Descrição A,10.00,5,3.00,alimentacao,50
Produto B,Descrição B,20.00,0,5.00,saude,30
```

2. Web Admin → Catálogo → "📤 Importar CSV" → Selecionar arquivo

### Ver Requisições de Moradores

1. Web Admin → Aba "Requisições"
2. Tabela mostra: Morador | Produto | Qty | Status | Preço
3. Clique status para mudar (QUOTED, ACCEPTED, etc)

### Testar Mobile Catalog

1. Abra http://localhost:5174/app/
2. Faça login como morador
3. Clique em "Marketplace" (ou vá para /marketplace/catalogo)
4. Teste: busca, filtros, adicionar ao carrinho, checkout

---

## 🐛 Troubleshooting

### Erro: "ECONNREFUSED 3333"
```bash
# API não está rodando
docker compose ps
docker compose up api  # ou ps1: npm run dev:api
```

### Erro: "Cannot find module @/"
```bash
# Reconstruir node_modules
rm -r apps/api/node_modules
cd apps/api && npm install
```

### Porta 5173 já em uso
```bash
# Matar processo
npx kill-port 5173
npm run dev  # no web
```

### Database migration failed
```bash
# Reset database (cuidado - deleta dados!)
npm run db:reset

# Ou aplicar migrations manualmente
npx prisma migrate deploy
```

---

## 📊 Verificar Status

### Docker Containers
```bash
docker compose ps
# Esperado: api, web, mobile, postgres, redis todos "Up"
```

### Database Connection
```bash
npm run db:client
# Ou: psql -h localhost -U condosync -d condosync
# Senha: condosync123
```

### API Endpoints
```bash
curl http://localhost:3333/marketplace/products
# Esperado: JSON com array de produtos
```

---

## 📚 Documentação Completa

Veja mais detalhes em:
- `SUMARIO_EXECUTIVO_MODELO4.md` - Overview executivo
- `GUIA_TESTES_MODELO4.md` - Testes completos
- `MODELO_4_MARKETPLACE_INTELIGENTE.md` - Especificação
- `MARKETPLACE_PRODUCT_CATALOG_DESIGN.md` - UI/UX Design

---

## 🔧 Scripts Úteis

```bash
# Dev - todos os serviços
npm run dev

# Build production
npm run build

# Testes TypeScript
npm run type-check

# Deploy Docker
docker compose build
docker compose up -d

# Database
npm run db:seed          # Popular dados demo
npm run db:migrate       # Aplicar migrations
npm run db:client        # Conectar ao banco

# Git
git log --oneline -10    # Ver últimos commits
git status               # Ver mudanças
git commit -m "msg"      # Commitar mudanças
```

---

## 🚀 Deploy para Produção

### Production Build
```bash
npm run build

# Build Docker
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml push
```

### Deploy via Railway
```bash
# Automático via railway.json
# Ou manual:
git push origin main
# → GitHub Actions → Railway deploy
```

### Deploy via VPS
```bash
# SSH para servidor
ssh root@2.24.211.167

# Atualizar código
cd /opt/condosync
git pull origin main

# Rebuild containers
docker compose build
docker compose up -d
```

---

## 💡 Tips & Tricks

### Testar com dados realistas
```bash
npm run db:seed
# Popula 50+ produtos, 10+ parceiros, etc
```

### Habilitar debug
```bash
DEBUG=app:* npm run dev:api
```

### Limpar cache web
```bash
# Browser DevTools → Application → Clear all
# Ou: localStorage.clear() no console
```

### Check TypeScript sem build
```bash
npx tsc --noEmit
```

### Resetar senha admin (SQL)
```bash
npm run db:client << EOF
UPDATE "User" 
SET password = '\$2b\$12\$...' 
WHERE email = 'admin@example.com';
EOF
```

---

## 📞 Suporte

**Se encontrar problema:**

1. Verifique logs: `docker logs container-name`
2. Leia a documentação em `/docs/`
3. Procure no arquivo `GUIA_TESTES_MODELO4.md`
4. Verifique banco de dados: `npm run db:client`
5. Tente resetar: `npm run db:reset && npm run db:seed`

**Contato:**
- Code: Santiago
- Docs: SUMARIO_EXECUTIVO_MODELO4.md

---

## ✅ Checklist de Setup

- [ ] Git clonado
- [ ] `npm install` em 3 apps
- [ ] Docker running (postgres, redis)
- [ ] API na porta 3333
- [ ] Web na porta 5173
- [ ] Mobile na porta 5174
- [ ] Login como admin funciona
- [ ] Login como morador funciona
- [ ] Criar produto funciona
- [ ] Adicionar ao carrinho funciona
- [ ] Requisição criada no banco

---

**Pronto para começar? ✨**

```bash
cd c:\Users\Santiago\DevSantiago\condosync
docker compose up
# Em outro terminal:
cd apps/web && npm run dev
# Em outro terminal:
cd apps/mobile && npm run dev
```

Acesse:
- Admin: http://localhost:5173 (login admin@example.com)
- Morador: http://localhost:5174/app/ (login resident@example.com)

**Divirta-se! 🎉**
