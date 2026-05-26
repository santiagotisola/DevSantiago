# 💻 Exemplos de Código: WhatsApp QR Setup

## 📌 Índice
1. [API REST Examples](#1-api-rest-examples)
2. [Frontend React (Web)](#2-frontend-react-web)
3. [Frontend React (Mobile)](#3-frontend-react-mobile)
4. [Automações](#4-automações)
5. [Scripts de Teste](#5-scripts-de-teste)

---

## 1. API REST Examples

### **Exemplo 1: Obter QR Code (cURL)**

```bash
# Sem autenticação (público)
curl http://localhost:3333/api/v1/whatsapp/qr \
  -H "Content-Type: application/json"

# Resposta:
{
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "status": "aguardando_qr"
}
```

### **Exemplo 2: Verificar Status da Conexão**

```bash
curl http://localhost:3333/api/v1/whatsapp/status

# Respostas possíveis:
# {"status": "desconectado"}
# {"status": "aguardando_qr"}
# {"status": "conectado"}
```

### **Exemplo 3: Iniciar WhatsApp (Gerar novo QR)**

```bash
# Requer autenticação + SUPER_ADMIN
curl -X POST http://localhost:3333/api/v1/whatsapp/iniciar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{}'

# Resposta:
{
  "message": "Iniciando WhatsApp...",
  "status": "aguardando_qr"
}
```

### **Exemplo 4: Enviar Mensagem**

```bash
# Requer autenticação + DOORMAN ou admin
curl -X POST http://localhost:3333/api/v1/whatsapp/send \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "para": "5562987654321",
    "mensagem": "Olá! Seu visitante foi confirmado para 14:00"
  }'

# Resposta:
{
  "ok": true,
  "para": "5562987654321",
  "mensagem": "Olá! Seu visitante foi confirmado para 14:00"
}
```

### **Exemplo 5: Listar Sessões Ativas**

```bash
curl http://localhost:3333/api/v1/whatsapp/sessoes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Resposta:
{
  "sessoes": [
    {
      "phone": "5562987654321",
      "sessionName": "portaria-principal",
      "isActive": true,
      "connectedAt": "2026-05-20T19:00:00Z",
      "ultimaMensagem": "2026-05-20T19:15:30Z"
    }
  ],
  "total": 1
}
```

---

## 2. Frontend React (Web)

### **Exemplo 1: Hook de QR Code**

```typescript
// File: apps/web/src/hooks/useWhatsAppQR.ts

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

export function useWhatsAppQR() {
  const qrQuery = useQuery({
    queryKey: ['whatsapp-qr'],
    queryFn: async () => {
      const res = await apiClient.get('/whatsapp/qr');
      return res.data as { qr: string | null; status: string };
    },
    refetchInterval: 2000,
    refetchOnWindowFocus: false,
  });

  const statusQuery = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const res = await apiClient.get('/whatsapp/status');
      return res.data as { status: string };
    },
    refetchInterval: 3000,
    refetchOnWindowFocus: false,
  });

  const iniciarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/whatsapp/iniciar', {});
      return res.data;
    },
    onSuccess: () => {
      qrQuery.refetch();
    },
  });

  const enviarMutation = useMutation({
    mutationFn: async (params: { para: string; mensagem: string }) => {
      const res = await apiClient.post('/whatsapp/send', params);
      return res.data;
    },
  });

  return {
    qr: qrQuery.data?.qr,
    status: statusQuery.data?.status ?? 'desconectado',
    isLoadingQR: qrQuery.isLoading,
    iniciar: iniciarMutation.mutate,
    isIniciando: iniciarMutation.isPending,
    enviar: enviarMutation.mutate,
    isEnviando: enviarMutation.isPending,
  };
}
```

### **Exemplo 2: Componente de QR Code Simples**

```typescript
// File: apps/web/src/components/whatsapp/QRCodeViewer.tsx

import { useWhatsAppQR } from '@/hooks/useWhatsAppQR';
import { MessageCircle, Loader, Check } from 'lucide-react';

export function QRCodeViewer() {
  const { qr, status, isLoadingQR, iniciar } = useWhatsAppQR();

  if (status === 'conectado') {
    return (
      <div className="text-center p-8 bg-green-50 rounded-lg">
        <Check size={48} className="mx-auto text-green-600 mb-4" />
        <h3 className="font-semibold text-green-900">Conectado com sucesso!</h3>
        <p className="text-sm text-green-700">Número vinculado ao sistema</p>
      </div>
    );
  }

  if (!qr) {
    return (
      <button
        onClick={() => iniciar()}
        className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
      >
        <MessageCircle size={20} />
        Conectar WhatsApp
      </button>
    );
  }

  return (
    <div className="text-center">
      <div className="inline-block p-4 bg-white rounded-lg border-2 border-gray-200">
        <img src={`data:image/png;base64,${qr}`} alt="QR Code" className="w-80 h-80" />
      </div>
      <p className="mt-4 text-gray-600">Escanear com WhatsApp Web</p>
    </div>
  );
}
```

### **Exemplo 3: Formulário de Envio**

```typescript
// File: apps/web/src/components/whatsapp/SendMessageForm.tsx

import { useState } from 'react';
import { useWhatsAppQR } from '@/hooks/useWhatsAppQR';
import { Send, AlertCircle } from 'lucide-react';

export function SendMessageForm() {
  const { status, enviar, isEnviando } = useWhatsAppQR();
  const [para, setPara] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [sucesso, setSucesso] = useState(false);

  if (status !== 'conectado') {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
        <AlertCircle className="text-yellow-600" />
        <div>
          <p className="font-semibold text-yellow-900">WhatsApp não conectado</p>
          <p className="text-sm text-yellow-800">Conecte um número antes de enviar mensagens</p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!para || !mensagem) return;

    enviar(
      { para, mensagem },
      {
        onSuccess: () => {
          setSucesso(true);
          setPara('');
          setMensagem('');
          setTimeout(() => setSucesso(false), 3000);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Destinatário (com +55)
        </label>
        <input
          type="text"
          placeholder="5562987654321"
          value={para}
          onChange={(e) => setPara(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mensagem
        </label>
        <textarea
          placeholder="Digite a mensagem..."
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
        />
      </div>

      <button
        type="submit"
        disabled={isEnviando || !para || !mensagem}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
      >
        <Send size={18} />
        {isEnviando ? 'Enviando...' : 'Enviar Mensagem'}
      </button>

      {sucesso && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          ✓ Mensagem enviada com sucesso!
        </div>
      )}
    </form>
  );
}
```

---

## 3. Frontend React (Mobile)

### **Exemplo 1: Atualizar WhatsAppMessaging.tsx (Mobile)**

```typescript
// File: apps/mobile/src/pages/messaging/WhatsAppMessaging.tsx

import { useState, useEffect } from 'react';
import { Send, MessageCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface Message {
  id: string;
  recipient: string;
  message: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export default function WhatsAppMessaging() {
  const { user } = useAuthStore();
  const [whatsappStatus, setWhatsappStatus] = useState<'conectado' | 'desconectado' | 'aguardando_qr'>('desconectado');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Verificar status do WhatsApp
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/v1/whatsapp/status');
        const data = await res.json();
        setWhatsappStatus(data.status);
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    };

    const interval = setInterval(checkStatus, 3000);
    checkStatus();
    return () => clearInterval(interval);
  }, []);

  // ✅ Enviar mensagem
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRecipient) return;

    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          para: selectedRecipient,
          mensagem: newMessage,
        }),
      });

      if (res.ok) {
        const message: Message = {
          id: String(messages.length + 1),
          recipient: selectedRecipient,
          message: newMessage,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
        };

        setMessages([...messages, message]);
        setNewMessage('');
      } else {
        alert('Erro ao enviar mensagem');
      }
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao enviar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center gap-3">
        <div className="bg-green-500 p-2 rounded-lg">
          <MessageCircle size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-white font-semibold">WhatsApp Messaging</h1>
          <p className={`text-xs ${whatsappStatus === 'conectado' ? 'text-green-400' : 'text-yellow-400'}`}>
            {whatsappStatus === 'conectado' && '✓ Conectado'}
            {whatsappStatus === 'aguardando_qr' && '⏳ Aguardando QR'}
            {whatsappStatus === 'desconectado' && '❌ Desconectado'}
          </p>
        </div>
      </div>

      {/* Status Alert */}
      {whatsappStatus !== 'conectado' && (
        <div className="bg-yellow-900/20 border-b border-yellow-600 p-3 flex gap-2 text-yellow-400 text-sm">
          <AlertCircle size={18} />
          <span>WhatsApp não está conectado. Configure em Configurações → WhatsApp.</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageCircle size={48} className="opacity-30 mb-3" />
            <p>Nenhuma mensagem ainda</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <div className="flex justify-between items-start mb-1">
                <p className="font-medium text-white text-sm">{msg.recipient}</p>
                <span className={`text-xs px-2 py-1 rounded ${
                  msg.status === 'read' ? 'bg-blue-900 text-blue-200' :
                  msg.status === 'delivered' ? 'bg-gray-900 text-gray-300' :
                  'bg-yellow-900 text-yellow-200'
                }`}>
                  {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓' : '↻'}
                </span>
              </div>
              <p className="text-slate-300 text-sm mb-2">{msg.message}</p>
              <p className="text-xs text-slate-500">{msg.timestamp}</p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      {whatsappStatus === 'conectado' && (
        <div className="bg-slate-800 border-t border-slate-700 p-4 space-y-2">
          <input
            type="tel"
            placeholder="Destinatário (ex: 5562987654321)"
            value={selectedRecipient}
            onChange={(e) => setSelectedRecipient(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Digite a mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !newMessage.trim() || !selectedRecipient}
              className="bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <Send size={16} />
              {isLoading ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 4. Automações

### **Exemplo 1: Notificação de Visitante Confirmado**

```typescript
// File: apps/api/src/modules/visitors/services/visitor.service.ts

import { BaileysService } from '@/modules/whatsapp/services/baileys.service';

export async function confirmarVisitante(visitorId: string) {
  const visitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
    include: {
      resident: true,
      condominium: true,
    },
  });

  if (!visitor) throw new Error('Visitante não encontrado');

  // ✅ Enviar SMS via WhatsApp
  const phoneFormatado = `55${visitor.resident.phone}`;
  const mensagem = `
Olá ${visitor.resident.name}! 

✓ Visitante confirmado!

👤 ${visitor.name}
⏰ ${new Date(visitor.scheduledDate).toLocaleString('pt-BR')}
🏠 Unidade ${visitor.resident.unitNumber}

Até logo!
${visitor.condominium.name}
  `.trim();

  try {
    await BaileysService.enviarMensagem(phoneFormatado, mensagem);
    console.log(`✓ Notificação enviada para ${phoneFormatado}`);
  } catch (err) {
    console.error('Erro ao enviar notificação:', err);
  }

  return visitor;
}
```

### **Exemplo 2: Notificação de Encomenda**

```typescript
export async function notificarEncomenda(parcelId: string) {
  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    include: {
      resident: true,
      condominium: true,
    },
  });

  const mensagem = `
📦 Encomenda chegou!

Seu pacote foi recebido na portaria.

Dados:
- Remetente: ${parcel.sender}
- Entregue por: Portaria
- Hora: ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}

Retire em horário comercial!
${parcel.condominium.name}
  `.trim();

  const phoneFormatado = `55${parcel.resident.phone}`;
  await BaileysService.enviarMensagem(phoneFormatado, mensagem);
}
```

---

## 5. Scripts de Teste

### **Teste 1: Verificar Configuração (cURL)**

```bash
#!/bin/bash
# File: test-whatsapp.sh

BASE_URL="http://localhost:3333/api/v1"
TOKEN="seu_token_aqui"

echo "🧪 Teste 1: Status da Conexão"
curl -s $BASE_URL/whatsapp/status | jq .

echo "\n🧪 Teste 2: Obter QR Code"
curl -s $BASE_URL/whatsapp/qr | jq '.status'

echo "\n🧪 Teste 3: Listar Sessões"
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/whatsapp/sessoes | jq .

echo "\n✓ Testes concluídos!"
```

### **Teste 2: Script Node.js**

```javascript
// File: test-whatsapp.js

const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3333/api/v1',
  headers: {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  },
});

async function testarWhatsApp() {
  try {
    console.log('🧪 Teste 1: Verificar status...');
    const status = await api.get('/whatsapp/status');
    console.log('Status:', status.data.status);

    if (status.data.status === 'conectado') {
      console.log('\n✓ WhatsApp está conectado!');
      
      console.log('\n🧪 Teste 2: Enviar mensagem de teste...');
      const resultado = await api.post('/whatsapp/send', {
        para: '5562987654321',
        mensagem: 'Teste de conexão CondoSync - ' + new Date().toLocaleTimeString(),
      });
      
      console.log('✓ Mensagem enviada:', resultado.data);
    } else {
      console.log('❌ WhatsApp não está conectado');
      console.log('Status atual:', status.data.status);
    }
  } catch (err) {
    console.error('❌ Erro:', err.response?.data || err.message);
  }
}

testarWhatsApp();
```

---

## 🎬 Checklist de Implementação

- [ ] Criar página `WhatsAppConfigPage.tsx` no Web Admin
- [ ] Adicionar rota `/configuracoes/whatsapp`
- [ ] Adicionar link no menu Configurações
- [ ] Importar `useWhatsAppQR` hook
- [ ] Testar QR Code generation
- [ ] Testar envio de mensagem
- [ ] Adicionar automações de notificação
- [ ] Testar no Mobile App
- [ ] Configurar permissões de roles
- [ ] Documentar para usuários finais

---

**Criado em**: 20 de maio de 2026  
**Última atualização**: 20 de maio de 2026
