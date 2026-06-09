# 🚀 Guia de Testes - Modelo 4 Marketplace Inteligente

## Status de Deploy

✅ **Todos os containers estão rodando:**
```
- PostgreSQL: porta 5432
- API (Node.js/Express): porta 3333  
- Web (Admin Panel): http://localhost/
- Mobile (PWA): http://localhost/app/
```

---

## Teste 1: Verificar Data Layer

### Verificar que database tem as tabelas novas

```bash
docker exec -i condosync-postgres psql -U condosync -d condosync << 'EOF'
-- Ver todas as tabelas do marketplace
\dt marketplace*

-- Ver um produto (deve estar vazio ou com seeds)
SELECT id, name, price, discount, stock FROM marketplace_products LIMIT 5;

-- Ver ofertas (legacy - devem estar presentes)
SELECT id, title, discount FROM marketplace_offers LIMIT 5;
EOF
```

**Resultado Esperado:**
- ✅ 9 tabelas de marketplace visíveis
- ✅ marketplace_offers com ~6 registros
- ✅ marketplace_products pode estar vazia (sem seed data)

---

## Teste 2: Testar API Endpoints

### 2.1 - GET /marketplace/products (sem autenticação)

```bash
curl -X GET http://localhost:3333/marketplace/products \
  -H "Content-Type: application/json"
```

**Resultado Esperado:**
```json
{
  "success": true,
  "data": [
    // array de produtos (vazio ou com seeds)
  ]
}
```

### 2.2 - Autenticar como Admin Web

```bash
# Obter token JWT
curl -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "atendimentoveredasbosque@gmail.com",
    "password": "Admin@2026"
  }'
```

**Resultado Esperado:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "atendimentoveredasbosque@gmail.com", "role": "CONDOMINIUM_ADMIN" },
    "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "..."
  }
}
```

### 2.3 - Criar um Produto via API

```bash
ADMIN_TOKEN="seu_token_aqui"

curl -X POST http://localhost:3333/marketplace/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Café Premium",
    "description": "Café 100% arábica da região sul",
    "price": 29.90,
    "discount": 10,
    "shippingCost": 5.00,
    "category": "alimentacao",
    "stock": 100,
    "imageUrl": "https://via.placeholder.com/300x200?text=Cafe",
    "partnerId": "demo-partner-alimentacao-resta"
  }'
```

**Resultado Esperado:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-aleatorio",
    "name": "Café Premium",
    "price": 29.90,
    "finalPrice": 26.91,  // com desconto aplicado
    "stock": 100,
    "isActive": true
  }
}
```

### 2.4 - Criar Requisição (morador)

```bash
# Primeiro autenticar como RESIDENT
RESIDENT_TOKEN="token_do_morador"

curl -X POST http://localhost:3333/marketplace/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RESIDENT_TOKEN" \
  -d '{
    "productId": "id-do-produto-criado",
    "quantity": 2,
    "notes": "Entregar até sexta"
  }'
```

**Resultado Esperado:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "productId": "...",
    "quantity": 2,
    "status": "PENDING",
    "notes": "Entregar até sexta"
  }
}
```

---

## Teste 3: Testar Web Admin UI

### 3.1 - Acessar Painel Admin

1. Abra: http://localhost/
2. Faça login:
   - **Email**: atendimentoveredasbosque@gmail.com
   - **Senha**: Admin@2026
3. Clique em "Marketplace" (deveria ir para admin panel)

**Resultado Esperado:**
- ✅ Dashboard carrega sem erros
- ✅ Vê 4 abas: Catálogo | Requisições | Parceiros | Ofertas

### 3.2 - Testar Aba CATÁLOGO

1. Clique na aba "Catálogo"
2. Clique botão "➕ Novo Produto"
3. Preencha:
   - Nome: "Produto Teste Web"
   - Descrição: "Teste de criação via Web"
   - Preço: 50.00
   - Desconto: 20
   - Frete: 10.00
   - Estoque: 100
   - Categoria: "Serviços"
   - Selecione um Parceiro

4. Clique "Criar Produto"

**Resultado Esperado:**
- ✅ Modal fecha
- ✅ Toast com "Produto criado!"
- ✅ Produto aparece no grid da aba Catálogo

### 3.3 - Editar Produto

1. Clique no ícone ✏️ (editar) em um produto
2. Altere o Nome para "Produto Editado"
3. Clique "Atualizar Produto"

**Resultado Esperado:**
- ✅ Nome atualizado no grid
- ✅ Toast com "Produto atualizado!"

### 3.4 - Testar Aba REQUISIÇÕES

1. Clique na aba "Requisições"
2. Se houver requisições, deve mostrar em tabela
3. Selecione um status (ex: "QUOTED")
4. Atualize a página (F5)

**Resultado Esperado:**
- ✅ Tabela mostra requisições
- ✅ Status pode ser alterado
- ✅ Página recarrega com novo status

### 3.5 - Testar Import CSV

1. Clique na aba "Catálogo"
2. Clique "📤 Importar CSV"
3. Crie um arquivo `produtos.csv`:

```csv
name,description,price,discount,shippingCost,category,stock,imageUrl
Maçã Importada,Maçã fresca importada,15.00,5,5.00,alimentacao,50,
Banana Orgânica,Banana 100% orgânica,8.50,0,3.00,alimentacao,100,
Brócolis Fresco,Brócolis verde fresco,12.00,10,4.00,alimentacao,75,
```

4. Selecione o arquivo
5. Clique "📁 Fazer Upload"

**Resultado Esperado:**
- ✅ Arquivo aceito
- ✅ Toast com "Produtos importados com sucesso!"
- ✅ 3 novos produtos aparecem no grid

---

## Teste 4: Testar Mobile UI

### 4.1 - Acessar App Mobile

1. Abra: http://localhost/app/
2. Faça login:
   - **Email**: santiagoti_sola@hotmail.com
   - **Senha**: Teste@2026
3. Se tiver tela de home, clique em "Marketplace"

**Resultado Esperado:**
- ✅ Página carrega com catálogo
- ✅ Vê grid 2 colunas com produtos
- ✅ Vê busca, filtros, e carrinho no topo

### 4.2 - Buscar Produto

1. Clique na caixa de busca no topo
2. Digite "Café"
3. Veja produtos filtrados em tempo real

**Resultado Esperado:**
- ✅ Filtro funciona em tempo real
- ✅ Apenas produtos com "Café" no nome/descrição aparecem

### 4.3 - Filtrar por Categoria

1. Clique na pill "Alimentação"
2. Veja apenas produtos dessa categoria

**Resultado Esperado:**
- ✅ Filtro de categoria funciona
- ✅ Pill fica destacada (bg-primary-500)

### 4.4 - Abrir Detalhe do Produto

1. Clique em qualquer card de produto
2. Modal abre com slide-up animation

**Resultado Esperado:**
- ✅ Modal mostra:
  - Imagem ampliada
  - Descrição completa
  - Rating (stars)
  - Preço com/sem desconto
  - Frete
  - Info do parceiro
  - Stock status
  - Quantity selector

### 4.5 - Adicionar ao Carrinho

1. No modal de produto:
   - Aumente quantidade para 2 (botão +)
   - Clique "Adicionar ao Carrinho"

2. Toast com "Café Premium adicionado ao carrinho!"

3. Veja badge do carrinho no topo mudar de "1" para "2"

**Resultado Esperado:**
- ✅ Toast aparece
- ✅ Badge atualizado
- ✅ Modal fecha

### 4.6 - Visualizar Carrinho

1. Clique no ícone 🛒 (carrinho) no topo
2. Veja lista de itens

**Resultado Esperado:**
- ✅ Carrinho mostra:
  - Imagem do produto
  - Nome e partner
  - Quantity (com +/- para editar)
  - Subtotal + frete por item
  - Botão remover (X)
  - Campo "Observações"
  - Total geral
  - Botão "Enviar Requisição"

### 4.7 - Editar Quantidade no Carrinho

1. Clique o botão "-" de um item
2. Quantidade diminui

**Resultado Esperado:**
- ✅ Subtotal + Total atualizam em tempo real
- ✅ Se quantidade ficar 0, item remove automaticamente

### 4.8 - Enviar Requisição

1. Clique "Enviar Requisição"
2. Toast com "Requisições criadas com sucesso!"
3. Carrinho limpa

**Resultado Esperado:**
- ✅ API cria requisição no backend
- ✅ Carrinho volta vazio
- ✅ Admin web pode ver em "Requisições"

### 4.9 - Testar Favoritos

1. Clique no ❤️ de um produto
2. Coração fica vermelho

**Resultado Esperado:**
- ✅ Coração preenche com cor
- ✅ Produto salvo em favoritos (localStorage)

---

## Teste 5: Verificação de Logs

### API Logs

```bash
docker logs condosync-api | tail -50
```

**Procurar por:**
- ✅ "Listening on port 3333"
- ✅ Sem erros críticos
- ✅ Requests aparecem nos logs

### Web Logs

```bash
docker logs condosync-web | tail -20
```

**Procurar por:**
- ✅ "start worker processes"
- ✅ Sem erros de nginx

### Mobile Logs

```bash
docker logs condosync-mobile | tail -20
```

**Procurar por:**
- ✅ "start worker processes"
- ✅ Sem erros de nginx

---

## Teste 6: Performance & Caching

### 6.1 - Abra DevTools (F12)

1. Network tab
2. Recarregue a página web admin

**Procurar por:**
- ✅ CSS/JS minimizados
- ✅ Status 200 para assets
- ✅ Tempo de load < 3s total

### 6.2 - Verificar React Query Cache

1. No mobile, vá para catálogo
2. Recarregue (F5)
3. Veja que os dados carregam quase instantâneo (do cache)

**Resultado Esperado:**
- ✅ Segunda carga é mais rápida
- ✅ React Query usa cache

---

## Teste 7: Multi-tenant Isolation

### 7.1 - Verificar que Admin vê apenas seu condomínio

1. Login como admin
2. Crie produto A
3. Em outro navegador/sessão, login como admin de outro condomínio
4. Produto A não deve aparecer

**Resultado Esperado:**
- ✅ Dados isolados por condominiumId
- ✅ Admin A não vê produtos de Admin B

---

## Checklist de Sucesso

- [ ] API inicia sem erros
- [ ] Web Admin carrega e loga
- [ ] Criar produto via Web funciona
- [ ] Editar produto via Web funciona
- [ ] Deletar produto via Web funciona
- [ ] CSV import carrega produtos em lote
- [ ] Mobile carrega catálogo
- [ ] Busca em tempo real funciona
- [ ] Filtro por categoria funciona
- [ ] Modal de detalhe abre corretamente
- [ ] Adicionar ao carrinho funciona
- [ ] Visualizar carrinho funciona
- [ ] Enviar requisição funciona
- [ ] Requisição aparece em Web Admin
- [ ] Status de requisição pode ser alterado
- [ ] Favoritos funcionam (coração)
- [ ] Toast notifications aparecem
- [ ] TypeScript não tem erros
- [ ] Docker containers estão healthy
- [ ] Multi-tenant isolation funciona

---

## Solução de Problemas

### Problema: "Cannot find module" no Web App

**Solução:**
```bash
cd apps/web
npm install
npm run build
```

### Problema: Porta 3333 já em uso

**Solução:**
```bash
docker kill $(docker ps -q)
docker compose up -d
```

### Problema: Erro 404 no /marketplace

**Solução:**
```bash
# Verificar rota está registrada
curl http://localhost:3333/marketplace/products

# Se 404, verificar arquivo marketplace.routes.ts
cat apps/api/src/modules/marketplace/marketplace.routes.ts | grep "router.get"
```

### Problema: CORS error

**Solução:**
- API deve ter CORS ativado em `server.ts`
- Web/Mobile devem fazer requests para `/api/*` (via proxy)

---

## Próximas Fases

Uma vez que tudo estiver funcionando:

**Fase 3: Chat em Tempo Real**
- Implementar Socket.IO
- Notificações push
- Presença online

**Fase 4: Loyalty System**
- Pontos por compra
- Tiers (BRONZE/SILVER/GOLD)
- Cupons automáticos

**Fase 5: Pagamentos**
- ASAAS/PJBANK integration
- Checkout online
- Reembolsos

---

## Contato

Para issues durante testes:
1. Verificar logs (`docker logs container-name`)
2. Consultar documentação em `/MODELO_4_MARKETPLACE_INTELIGENTE.md`
3. Verificar banco de dados
4. Re-executar migrations se necessário

**Status Final: ✅ READY FOR UAT**
