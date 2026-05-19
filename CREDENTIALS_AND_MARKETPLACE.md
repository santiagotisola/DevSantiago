# 🔐 Credenciais de Acesso e Marketplace - CondoSync

Data: 19 de maio de 2026

---

## 📋 Usuários e Senhas de Acesso

### **Administradores Web (CONDOMINIUM_ADMIN / SYNDIC / SUPER_ADMIN)**

| Email | Senha | Nome | Função | Status |
|-------|-------|------|--------|--------|
| `atendimentoveredasbosque@gmail.com` | `Admin@2026` | Atendimento Veredas do Bosque | SUPER_ADMIN | ✅ Ativo |
| `sindico@parqueverde.com.br` | `Sindico@2026` | Carlos Silva | SYNDIC | ✅ Ativo |
| `sindico@veredasdobosque.com.br` | `Sindico@2026` | Carlos Silva | SYNDIC | ✅ Ativo |

### **Porteiros (DOORMAN)**

| Email | Senha | Nome | Função | Status |
|-------|-------|------|--------|--------|
| `porteiro@parqueverde.com.br` | `Porteiro@2026` | João Porteiro | DOORMAN | ✅ Ativo |
| `porteiro@veredasdobosque.com.br` | `Porteiro@2026` | João Porteiro | DOORMAN | ✅ Ativo |

### **Moradores (RESIDENT)**

| Email | Senha | Nome | Função | Status |
|-------|-------|------|--------|--------|
| `morador1@parqueverde.com.br` | `Morador@2026` | Ana Costa | RESIDENT | ✅ Ativo |
| `morador2@parqueverde.com.br` | `Morador@2026` | Bruno Oliveira | RESIDENT | ✅ Ativo |
| `morador3@parqueverde.com.br` | `Morador@2026` | Carla Santos | RESIDENT | ✅ Ativo |
| `morador4@parqueverde.com.br` | `Morador@2026` | Diego Fernandes | RESIDENT | ✅ Ativo |
| `morador5@parqueverde.com.br` | `Morador@2026` | Elena Martins | RESIDENT | ✅ Ativo |

---

## 🏪 Marketplace - Parceiros Cadastrados

### **Residencial Veredas do Bosque**

#### Parceiros (4 cadastrados)

| Nome | Categoria | ID | Status |
|------|-----------|-----|--------|
| **Academia FitLife** | Saúde | `demo-partner-saude-acade` | Ativo |
| **Restaurante Sabor & Arte** | Alimentação | `demo-partner-alimentacao-resta` | Ativo |
| **Farmácia Saúde Viva** | Saúde | `demo-partner-saude-farmá` | Ativo |

#### Ofertas (6 cadastradas)

| Título | Desconto | Parceiro | Condomínio | ID |
|--------|----------|----------|-----------|-----|
| 10% de desconto para moradores | **10%** | Academia FitLife | Residencial Veredas do Bosque | `b4e61892...` |
| 10% de desconto para moradores | **10%** | Restaurante Sabor & Arte | Residencial Veredas do Bosque | `853477a5...` |
| 10% de desconto para moradores | **10%** | Farmácia Saúde Viva | Residencial Veredas do Bosque | `1b8dace0...` |
| 10% de desconto para moradores | **10%** | Academia FitLife | Residencial Veredas do Bosque | `399c4361...` |
| 10% de desconto para moradores | **10%** | Restaurante Sabor & Arte | Residencial Veredas do Bosque | `4dbe73cd...` |
| 10% de desconto para moradores | **10%** | Farmácia Saúde Viva | Residencial Veredas do Bosque | `9b8a63a2...` |

---

## 🌐 URLs de Acesso

### **Web Admin**
```
URL: http://homologacao/
Acesso: Menu lateral → Marketplace
Usuário: atendimentoveredasbosque@gmail.com
Senha: Admin@2026
```

### **Mobile PWA - Resident**
```
URL: http://homologacao:5174/
Acesso: Navegação inferior → "Ofertas" (ShoppingBag icon)
Usuário: morador1@parqueverde.com.br
Senha: Morador@2026
```

---

## 📊 Estatísticas Marketplace

- **Condomínios com Marketplace**: 1 (Residencial Veredas do Bosque)
- **Parceiros Ativos**: 4
- **Ofertas Ativas**: 6
- **Categorias**: Saúde, Alimentação
- **Desconto Médio**: 10%

---

## ✅ Funcionalidades Implementadas

### **Web Admin (CONDOMINIUM_ADMIN / SYNDIC)**
- ✅ Visualizar parceiros e ofertas do condomínio
- ✅ Criar novo parceiro
- ✅ Criar nova oferta
- ✅ Editar parceiros
- ✅ Desativar/ativar ofertas
- ✅ Filtros por categoria
- ✅ Isolamento de dados por condomínio

### **Mobile PWA (RESIDENT)**
- ✅ Visualizar ofertas do condomínio
- ✅ Filtrar por categoria
- ✅ Visualizar desconto/parceiro
- ✅ Design responsivo mobile-first
- ✅ Isolamento de dados por condomínio

---

## 🔒 Segurança & Multi-Tenancy

- **Isolamento de Dados**: Cada condomínio vê apenas seus parceiros/ofertas
- **Autorização por Função**:
  - SUPER_ADMIN: Acesso a todos condominiums
  - CONDOMINIUM_ADMIN/SYNDIC: Acesso apenas ao seu condomínio
  - RESIDENT: Visualização apenas (sem admin)
- **JWT Authentication**: Tokens com 1h de validade
- **Endpoints Protegidos**: Todos requerem bearer token

---

## 🚀 Teste Rápido

### **Para Testar Web Admin:**
1. Acesse http://homologacao/
2. Faça login com: `atendimentoveredasbosque@gmail.com` / `Admin@2026`
3. Clique em "Marketplace" (menu lateral)
4. Visualize 4 parceiros e 6 ofertas

### **Para Testar Mobile:**
1. Acesse http://homologacao:5174/
2. Faça login com: `morador1@parqueverde.com.br` / `Morador@2026`
3. Clique na tab "Ofertas" (navegação inferior)
4. Visualize 6 ofertas com filtros por categoria

---

**Última Atualização**: 19/05/2026 - 15:30 UTC  
**Status**: ✅ Marketplace Multi-Tenant Operacional
