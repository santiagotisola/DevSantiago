# 🚀 Guia Completo: Configuração de QR Code do WhatsApp

## 📋 Visão Geral

Sistema para conectar um número real de WhatsApp ao CondoSync usando **Baileys** (simulador de WhatsApp Web).

```
┌────────────────────────────────────────────────────────────────┐
│ 1. Admin acessa Web Admin → Configurações → WhatsApp          │
│                                                                │
│ 2. Clica em "Conectar WhatsApp"                               │
│    ↓                                                           │
│ 3. Sistema gera QR Code                                       │
│    ↓                                                           │
│ 4. Admin escaneia com celular (WhatsApp Web)                 │
│    ↓                                                           │
│ 5. Número é vinculado ao sistema                             │
│    ↓                                                           │
│ 6. Pronto para enviar mensagens!                             │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Arquitetura Backend (Já Implementada)

### 1. **Serviço Baileys** (`baileys.service.ts`)
```typescript
// O que ele faz:
- Gera QR Code quando inicializa
- Monitora status da conexão (desconectado → aguardando_qr → conectado)
- Recebe mensagens de entrada
- Envia mensagens via WhatsApp Web
```

### 2. **Endpoints da API**
```bash
# GET - Obter QR Code (sem autenticação)
GET /api/v1/whatsapp/qr
→ Retorna: { qr: "string_base64", status: "aguardando_qr" }

# GET - Status da conexão
GET /api/v1/whatsapp/status
→ Retorna: { status: "conectado" | "desconectado" | "aguardando_qr" }

# POST - Iniciar WhatsApp (requer SUPER_ADMIN)
POST /api/v1/whatsapp/iniciar
→ Inicia o serviço e gera novo QR Code

# POST - Enviar mensagem
POST /api/v1/whatsapp/send
Body: { para: "5562987654321", mensagem: "Olá!" }
→ Envia via WhatsApp

# GET - Listar sessões ativas
GET /api/v1/whatsapp/sessoes
→ Retorna todas as conexões ativas
```

---

## 💻 Implementação no Frontend (Web Admin)

### **Passo 1: Criar a Página de Configuração**

Criar arquivo: `apps/web/src/pages/configuracoes/WhatsAppConfigPage.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MessageCircle, QrCode, Check, AlertCircle, Loader } from 'lucide-react';
import { apiClient } from '@/services/api';

interface QRResponse {
  qr: string | null;
  status: 'conectado' | 'desconectado' | 'aguardando_qr';
}

export default function WhatsAppConfigPage() {
  const [refreshInterval, setRefreshInterval] = useState(2000);

  // ✅ Buscar QR Code
  const { data: qrData, isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-qr'],
    queryFn: async () => {
      const res = await apiClient.get<QRResponse>('/whatsapp/qr');
      return res.data;
    },
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: false,
  });

  // ✅ Buscar Status
  const { data: statusData } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string }>('/whatsapp/status');
      return res.data;
    },
    refetchInterval: 3000,
    refetchOnWindowFocus: false,
  });

  // ✅ Iniciar WhatsApp
  const { mutate: iniciarWhatsApp, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/whatsapp/iniciar', {});
      return res.data;
    },
    onSuccess: () => {
      setRefreshInterval(2000); // Mais rápido enquanto não conecta
      refetch();
    },
    onError: (error: any) => {
      alert(`Erro: ${error.response?.data?.message || 'Falha ao iniciar'}`);
    },
  });

  // ✅ Para polling quando conectado
  useEffect(() => {
    if (statusData?.status === 'conectado') {
      setRefreshInterval(false as any); // Para de fazer polling
    }
  }, [statusData?.status]);

  const statusColor = {
    conectado: 'text-green-600 bg-green-50 border-green-200',
    desconectado: 'text-red-600 bg-red-50 border-red-200',
    aguardando_qr: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  };

  const statusLabel = {
    conectado: '✅ Conectado',
    desconectado: '❌ Desconectado',
    aguardando_qr: '⏳ Aguardando scan do QR',
  };

  const currentStatus = (statusData?.status || 'desconectado') as keyof typeof statusLabel;

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle size={32} className="text-green-600" />
            <h1 className="text-3xl font-bold">Configuração de WhatsApp</h1>
          </div>
          <p className="text-gray-600">
            Conecte um número de WhatsApp para enviar mensagens automatizadas
          </p>
        </div>

        {/* Status Card */}
        <div className={`p-4 rounded-lg border mb-8 ${statusColor[currentStatus]}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Status da Conexão</h3>
              <p className="text-sm opacity-80">{statusLabel[currentStatus]}</p>
            </div>
            {currentStatus === 'conectado' && <Check size={32} />}
            {currentStatus === 'aguardando_qr' && <Loader size={32} className="animate-spin" />}
            {currentStatus === 'desconectado' && <AlertCircle size={32} />}
          </div>
        </div>

        {/* QR Code Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <QrCode size={24} />
            <h2 className="text-xl font-semibold">Escanear QR Code</h2>
          </div>

          {currentStatus === 'conectado' ? (
            <div className="text-center py-12 bg-green-50 rounded-lg border-2 border-green-200">
              <Check size={48} className="mx-auto text-green-600 mb-4" />
              <h3 className="font-semibold text-green-900 mb-2">WhatsApp Conectado com Sucesso!</h3>
              <p className="text-green-700 text-sm">
                Você pode começar a enviar mensagens agora.
              </p>
            </div>
          ) : currentStatus === 'desconectado' ? (
            <div className="text-center py-12">
              <button
                onClick={() => iniciarWhatsApp()}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
              >
                {isPending ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <QrCode size={20} />
                    Conectar WhatsApp
                  </>
                )}
              </button>
              <p className="text-gray-500 text-sm mt-4">
                Clique para gerar um novo QR Code
              </p>
            </div>
          ) : qrData?.qr ? (
            // Renderizar QR Code como imagem base64
            <div className="text-center">
              <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg mb-6">
                <img
                  src={`data:image/png;base64,${qrData.qr}`}
                  alt="QR Code do WhatsApp"
                  className="w-80 h-80"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Como escanear:</h3>
                <ol className="text-left text-blue-800 text-sm space-y-2">
                  <li>1. Abra o WhatsApp no seu celular</li>
                  <li>2. Vá para a aba de "Conversas"</li>
                  <li>3. Toque em "Vincular um dispositivo"</li>
                  <li>4. Aponte a câmera para o QR Code acima</li>
                  <li>5. Após o scan, a conexão será estabelecida automaticamente</li>
                </ol>
              </div>
              <p className="text-gray-500 text-sm mt-6">
                O QR Code expira em alguns minutos. Se não conseguir, clique em "Conectar WhatsApp" novamente.
              </p>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Loader size={32} className="mx-auto text-gray-400 mb-3 animate-spin" />
              <p className="text-gray-600">Gerando QR Code...</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">ℹ️ Informações Importantes</h3>
          <ul className="text-blue-800 text-sm space-y-2">
            <li>
              ✓ <strong>Segurança:</strong> O número fica vinculado ao servidor. Nenhuma credencial é armazenada.
            </li>
            <li>
              ✓ <strong>Continuidade:</strong> Se desconectar, você pode reconectar escaneando o QR novamente.
            </li>
            <li>
              ✓ <strong>Permissões:</strong> Apenas SUPER_ADMIN e CONDOMINIUM_ADMIN podem conectar números.
            </li>
            <li>
              ✓ <strong>Mensagens:</strong> Qualquer DOORMAN ou acima pode enviar mensagens após conectado.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

### **Passo 2: Adicionar Rota no Router (Web)**

Arquivo: `apps/web/src/App.tsx` ou seu router principal

```typescript
import WhatsAppConfigPage from './pages/configuracoes/WhatsAppConfigPage';

// Dentro das rotas:
<Route path="/configuracoes/whatsapp" element={<WhatsAppConfigPage />} />
```

---

### **Passo 3: Adicionar Link no Menu Lateral**

Arquivo: `apps/web/src/components/Sidebar.tsx` (ou similar)

```typescript
// Dentro da seção de Configurações:
<Link to="/configuracoes/whatsapp" className="flex items-center gap-3 px-4 py-2">
  <MessageCircle size={20} />
  <span>WhatsApp</span>
</Link>
```

---

## 🎯 Como Usar Passo a Passo

### **Setup Inicial (Primeira Vez)**

```bash
# 1. Admin entra em http://localhost/configuracoes/whatsapp

# 2. Clica em "Conectar WhatsApp"
#    → QR Code é gerado

# 3. Admin abre WhatsApp no celular
#    → Menu → Vincular Dispositivo → Aponta câmera

# 4. Sistema detecta scan automaticamente
#    → Status muda para "✅ Conectado"

# 5. Pronto! Agora pode enviar mensagens
```

### **Enviar Mensagem (Depois de Conectado)**

**Opção A: Pelo Mobile App**
```
http://localhost:5174/whatsapp
→ Selecionar destinatário
→ Digitar mensagem
→ Clicar "Enviar"
```

**Opção B: Pela API REST**
```bash
curl -X POST http://localhost:3333/api/v1/whatsapp/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "para": "5562987654321",
    "mensagem": "Olá! Visitante confirmado para 14:00"
  }'
```

---

## 🗂️ Estrutura de Arquivos do Backend (Já Existente)

```
apps/api/src/modules/whatsapp/
├── services/
│   ├── baileys.service.ts          ← Gerencia conexão + QR
│   └── visitante.service.ts        ← Cria visitantes via WhatsApp
├── models/
│   ├── session.model.ts            ← MongoDB: sessões ativas
│   ├── message.model.ts            ← MongoDB: histórico mensagens
│   └── flow.model.ts               ← MongoDB: fluxos de automação
├── flows/
│   └── flow.processor.ts           ← Processa mensagens recebidas
├── whatsapp.routes.ts              ← Endpoints da API
├── whatsapp.controller.ts          ← Handlers HTTP
└── types/
    └── whatsapp.types.ts           ← Tipos TypeScript
```

---

## 🔐 Segurança

### **Permissões por Role**

| Endpoint | SUPER_ADMIN | ADMIN | DOORMAN | RESIDENT |
|----------|-------------|-------|---------|----------|
| POST /iniciar | ✅ | ✅ | ❌ | ❌ |
| GET /qr | ✅ | ✅ | ✅ | ✅ |
| GET /status | ✅ | ✅ | ✅ | ✅ |
| POST /send | ✅ | ✅ | ✅ | ❌ |
| GET /sessoes | ✅ | ✅ | ✅ | ❌ |

### **Proteções**

```typescript
// No middleware auth:
router.use(authenticate);

// Em cada rota:
router.post("/iniciar", authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC"), controller);
router.post("/send", authorize("DOORMAN", "CONDOMINIUM_ADMIN"), controller);
```

---

## 🐛 Troubleshooting

### **Problema: QR Code não aparece**
```
❌ Solução 1: Verifique se Baileys está inicializado
   → GET /api/v1/whatsapp/status
   → Se retornar "desconectado", clique "Conectar WhatsApp"

❌ Solução 2: Verifique pasta de auth
   → /whatsapp-auth deve existir e ter permissões
   → rm -rf whatsapp-auth && reinicie o servidor
```

### **Problema: Número desconecta**
```
❌ Solução 1: WhatsApp Web desligou no seu celular
   → Abra WhatsApp Web novamente

❌ Solução 2: Sessão expirou
   → Clique "Conectar WhatsApp" novamente
   → Escaneie novo QR Code
```

### **Problema: Mensagens não enviam**
```
❌ Solução 1: Status não é "conectado"
   → Verifique GET /api/v1/whatsapp/status

❌ Solução 2: Número inválido
   → Deve incluir código país: 5562987654321 (não 62987654321)

❌ Solução 3: Destinatário bloqueou
   → WhatsApp bloqueia usuários não-contato
   → Solução: Adicionar contato no WhatsApp Web manualmente
```

---

## 📊 Fluxo de Mensagem

```
┌─────────────────────────────────────────────────┐
│ Usuário clica "Enviar" no Mobile App           │
│                 ↓                               │
│ POST /api/v1/whatsapp/send                    │
│ { para: "5562987654321", mensagem: "..." }    │
│                 ↓                               │
│ Middleware verifica autenticação               │
│                 ↓                               │
│ Controller valida com Zod                      │
│                 ↓                               │
│ BaileysService.enviarMensagem()               │
│                 ↓                               │
│ Socket.IO conecta e envia                      │
│                 ↓                               │
│ Mensagem chega no celular do destinatário     │
│                 ↓                               │
│ Response: { ok: true, para, mensagem }       │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Próximos Passos

1. **Automações**: Criar templates de mensagens automáticas
   - ✅ Visitante confirmado
   - ✅ Encomenda entregue
   - ✅ Aviso importante

2. **Analytics**: Dashboard com estatísticas
   - Mensagens enviadas/recebidas
   - Taxa de entrega
   - Horários de pico

3. **Integrações**: Conectar com outros sistemas
   - Atendimento automático
   - Chatbot inteligente
   - Reserva de áreas

---

## 📚 Referências

- **Baileys**: https://github.com/WhiskeySockets/Baileys
- **WhatsApp Web API**: Documentação interna do servidor Baileys
- **Express Auth Middleware**: `apps/api/src/middleware/auth.ts`

---

**Criado em**: 20 de maio de 2026  
**Versão**: 1.0  
**Status**: ✅ Pronto para implementação
