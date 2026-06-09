# 🔍 Validação Completa - CondoSync Mobile App

**Data:** 11 de maio de 2026  
**Status:** 🔴 EM DIAGNÓSTICO

---

## 1. AMBIENTE

| Componente | Status | URL/Porta | Detalhes |
|------------|--------|-----------|----------|
| **API REST** | ✅ Rodando | http://localhost:3333 | Node.js Express + Prisma |
| **App Mobile** | ✅ Rodando | http://localhost:5175 | Vite React 18 |
| **Banco de Dados** | ✅ Ativo | localhost:5432 | PostgreSQL 16 |

---

## 2. AUTENTICAÇÃO

| Item | Status | Detalhes |
|------|--------|----------|
| **Email** | ✅ Criado | santiagoti_sola@hotmail.com |
| **Senha** | ✅ Definida | Acesso@2026 |
| **Perfil** | ✅ RESIDENT | Morador vinculado ao condomínio |
| **Unidade** | ✅ Associado | Vinculado à unidade do condomínio |

---

## 3. FUNCIONALIDADES IMPLEMENTADAS

### ✅ Backend (API)

```
POST   /api/v1/auth/login              ✅ Funciona
POST   /api/v1/visitors                ✅ Cria visitante
GET    /api/v1/visitors/condominium/:id ✅ Lista visitantes
POST   /api/v1/visitors/:id/entry      ✅ Registra entrada
POST   /api/v1/visitors/:id/exit       ✅ Registra saída
```

### 🔄 Frontend (Mobile App)

#### Arquivo: `MinhasVisitas.tsx`

**Rota:** `/visitantes`  
**Estado:** ⚠️ PROBLEMA - Botão não aparece

**Código Atual:**
```tsx
// ✅ Importações corretas
import { useState, useEffect } from 'react';

// ✅ Estado inicializado
const [showForm, setShowForm] = useState<boolean>(false);

// ✅ useEffect força modal fechado
useEffect(() => {
  setShowForm(false);
}, []);

// ✅ Query corrigida
const { data, isLoading } = useQuery({
  queryKey: ['my-visitors', selectedCondominiumId, unitId],
  queryFn: async () => {
    const res = await api.get(
      `/visitors/condominium/${selectedCondominiumId}?unitId=${unitId}&limit=50`
    );
    return res.data.data.visitors as Visitor[];
  },
  enabled: !!selectedCondominiumId && !!unitId,
});

// ✅ Mutation corrigida
const createMutation = useMutation({
  mutationFn: () =>
    api.post('/visitors', {
      name,
      document: document || undefined,
      reason: reason || undefined,
      scheduledAt: scheduledAt || undefined,
      unitId,
    }),
  // ...
});

// ✅ Botão definido (linha 70-75)
<button
  onClick={() => setShowForm(true)}
  className="btn-press w-full bg-primary-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
>
  <Plus size={18} />
  Pré-autorizar visitante
</button>
```

---

## 4. PROBLEMA IDENTIFICADO

❌ **Botão "Pré-autorizar visitante" não aparece na tela**

### Possíveis Causas:

1. **Componente não renderiza?**
   - [ ] Verificar console para erros de JavaScript
   - [ ] Verificar se MinhasVisitas.tsx está sendo importado corretamente no App.tsx
   - [ ] Verificar se a rota `/visitantes` está configurada corretamente

2. **Dados não carregam?**
   - [ ] Verificar requisição GET em Network (DevTools)
   - [ ] Validar resposta da API em `/visitors/condominium/{id}?unitId={id}`

3. **Usuário não autenticado?**
   - [ ] Verificar token de autenticação
   - [ ] Verificar se `selectedCondominiumId` está preenchido
   - [ ] Verificar se `unitId` está preenchido

4. **Layout ou CSS?**
   - [ ] Verificar se há overflow ou display:none
   - [ ] Verificar classe `btn-press` em Tailwind

---

## 5. CHECKLIST DE DIAGNÓSTICO

Execute estes passos **nesta ordem**:

### Passo 1: Abrir DevTools
```
F12 ou Ctrl+Shift+I
```

### Passo 2: Verificar Console
- [ ] Há erros em **vermelho**?
- [ ] Há warning relacionado a `MinhasVisitas`?
- [ ] Há erro de cors ou network?

### Passo 3: Verificar Network
- [ ] Quando carrega `/visitantes`, faz GET em `/visitors/condominium/...`?
- [ ] Status é 200 ou erro?
- [ ] Response data é: `{ visitors: [...], total, ... }`?

### Passo 4: Verificar Autenticação
No **Console**, execute:
```javascript
// Verificar token
localStorage.getItem('condosync-mobile-auth')

// Deve retornar algo como:
// {"user":{...},"accessToken":"...","refreshToken":"..."}
```

### Passo 5: Inspecionar Elemento
- Pressione `Ctrl+Shift+C` (Inspect)
- Clique no título "Meus Visitantes"
- Verifique se há um `<button>` com "Pré-autorizar visitante"

---

## 6. DADOS DE TESTE

### Crédito de Acesso (Já Criado)
```
Email:  santiagoti_sola@hotmail.com
Senha:  Acesso@2026
Perfil: RESIDENT (Morador)
```

### Visitantes Demo Pré-cadastrados
- ✅ José (CPF: 31144422) - Reunião estratégica às 11:05-15:00
- ✅ Mario (CPF: 112233) - Negócios - Churrasco

---

## 7. PRÓXIMOS PASSOS

### Se o botão **aparecer**:
1. ✅ Clicar em "Pré-autorizar visitante"
2. ✅ Preencher dados (nome obrigatório)
3. ✅ Clicar "Salvar"
4. ✅ Verificar se aparece na lista
5. ✅ Ir para portaria e validar aprovação/entrada/saída

### Se o botão **NÃO aparecer**:
1. 🔍 Executar **Passo 1-5** acima
2. 📸 Compartilhar screenshot do Console
3. 📊 Compartilhar resposta da Network
4. 🐛 Analisar erro específico

---

## 8. COMANDO PARA LIMPAR CACHE

Se continuar com problema, abra o terminal e execute:

```bash
# Limpar cache do navegador
# Pressione Ctrl+Shift+Delete e limpe cookies + cache

# Ou recarregue o mobile app
cd condosync/apps/mobile
npm run dev

# Aguarde a mensagem "ready" e acesse novamente
# http://localhost:5175/visitantes
```

---

## 9. ARQUIVOS MODIFICADOS

| Arquivo | Modificação | Status |
|---------|-------------|--------|
| `MinhasVisitas.tsx` | Corrigir query GET `.visitors` | ✅ |
| `MinhasVisitas.tsx` | Corrigir mutation POST campos | ✅ |
| `VisitantesPortaria.tsx` | Corrigir query GET `.visitors` | ✅ |
| `MinhasVisitas.tsx` | Adicionar `useEffect` força modal fechado | ✅ |

---

## 10. REFERÊNCIA RÁPIDA

**Testar API manualmente:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3333/api/v1/visitors/condominium/ID?unitId=ID
```

**Testar POST:**
```bash
curl -X POST http://localhost:3333/api/v1/visitors \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste",
    "unitId": "UUID",
    "reason": "Visita familiar"
  }'
```

---

**Última atualização:** 11 de maio de 2026 às 18:12  
**Próxima ação:** Compartilhar screenshot do Console/Network
