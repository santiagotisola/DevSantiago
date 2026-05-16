import { useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      recipient: 'Portaria - Casa 12',
      message: 'Visitante confirmado para 14:00',
      timestamp: '14:30',
      status: 'read',
    },
    {
      id: '2',
      recipient: 'Morador - Casa 05',
      message: 'Encomenda entregue com sucesso',
      timestamp: '15:45',
      status: 'delivered',
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedRecipient) return;

    const message: Message = {
      id: String(messages.length + 1),
      recipient: selectedRecipient,
      message: newMessage,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center gap-3">
        <div className="bg-green-500 p-2 rounded-lg">
          <MessageCircle size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-white font-semibold">WhatsApp Messaging</h1>
          <p className="text-xs text-slate-400">Integração com WhatsApp</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageCircle size={48} className="opacity-30 mb-3" />
            <p>Nenhuma mensagem ainda</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-slate-800 rounded-lg p-3 border border-slate-700 hover:border-slate-600 transition"
            >
              <div className="flex justify-between items-start mb-1">
                <p className="font-medium text-white text-sm">{msg.recipient}</p>
                <span
                  className={[
                    'text-xs px-2 py-1 rounded',
                    msg.status === 'read' ? 'bg-blue-900 text-blue-200' : msg.status === 'delivered'
                      ? 'bg-gray-900 text-gray-300'
                      : 'bg-yellow-900 text-yellow-200',
                  ].join(' ')}
                >
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
      <div className="bg-slate-800 border-t border-slate-700 p-4 space-y-2">
        <input
          type="text"
          placeholder="Selecione um destinatário..."
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
            disabled={!newMessage.trim() || !selectedRecipient}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <Send size={16} />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
