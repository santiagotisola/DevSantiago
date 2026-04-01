import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Bot, X, Send, Loader2, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MGMT = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'];

const QUICK_PROMPTS = [
  'Como está a situação financeira do mês?',
  'Rascunhe um comunicado sobre silêncio noturno.',
  'Quais manutenções estão vencendo?',
  'Status dos chamados de moradores.',
];

export function AiAssistantChat() {
  const { user, selectedCondominiumId } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isMgmt = MGMT.includes(user?.role ?? '');

  const { data: statusData } = useQuery({
    queryKey: ['ai-status'],
    queryFn: async () => {
      const res = await api.get('/ai/status');
      return res.data.data as { enabled: boolean };
    },
    enabled: isMgmt,
    staleTime: Infinity,
  });

  const aiEnabled = statusData?.enabled ?? false;

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
      setMessages(newMessages);
      const res = await api.post('/ai/chat', {
        condominiumId: selectedCondominiumId,
        messages: newMessages,
      });
      return res.data.data.reply as string;
    },
    onSuccess: (reply) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Erro ao consultar a IA. Tente novamente.';
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;
    if (!aiEnabled) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '⚠️ O assistente de IA não está configurado neste ambiente. Peça ao administrador para definir a chave de API.',
        },
      ]);
      setInput('');
      return;
    }
    setInput('');
    chatMutation.mutate(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isMgmt || !selectedCondominiumId) return null;

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border flex flex-col" style={{ height: '520px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
            <div className="flex items-center gap-2 text-white">
              <Bot className="w-5 h-5" />
              <div>
                <p className="font-semibold text-sm">Assistente IA</p>
                <p className="text-xs text-blue-200">
                  {aiEnabled ? 'Contexto do condomínio ativo' : 'Sem chave de API — não funcionará'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  title="Limpar conversa"
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700 max-w-[85%]">
                    {aiEnabled
                      ? 'Olá! Sou o assistente IA do CondoSync. Tenho acesso ao contexto atual do seu condomínio. Como posso ajudar?'
                      : 'O assistente de IA ainda não está configurado neste ambiente. Entre em contato com o suporte ou administrador para habilitar.'}
                  </div>
                </div>
                {aiEnabled && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground pl-10">Sugestões:</p>
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setInput(p);
                          inputRef.current?.focus();
                        }}
                        className="block w-full pl-10 text-left"
                      >
                        <span className="inline-block text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors">
                          {p}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn('flex items-start gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm max-w-[85%] whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm',
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2 items-end bg-gray-50 rounded-xl border px-3 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  aiEnabled
                    ? 'Digite sua pergunta… (Enter para enviar)'
                    : 'Assistente IA desativado. Configure a chave de API para usar.'
                }
                rows={1}
                className="flex-1 bg-transparent text-sm resize-none focus:outline-none max-h-28"
                style={{ minHeight: '1.5rem' }}
                disabled={chatMutation.isPending || !aiEnabled}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending || !aiEnabled}
                className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1.5">
              Shift+Enter para nova linha
            </p>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200',
          open
            ? 'bg-gray-700 hover:bg-gray-800'
            : 'bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
        )}
        title="Assistente IA"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
      </button>
    </>
  );
}
