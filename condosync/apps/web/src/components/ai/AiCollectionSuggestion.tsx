import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles,
  Loader2,
  X,
  AlertTriangle,
  Send,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  chargeId: string;
  /** Trigger button rendered by parent if provided. Otherwise renders default. */
  trigger?: (open: () => void) => React.ReactNode;
}

interface Suggestion {
  riskLevel: 'low' | 'medium' | 'high';
  rationale: string;
  recommendedActions: Array<{
    label: string;
    description: string;
    urgency: 'now' | 'this_week' | 'this_month';
  }>;
  negotiationOptions: Array<{
    type: 'discount' | 'installments' | 'extension' | 'amnesty';
    description: string;
    estimatedRecoveryRate: number;
  }>;
  messageDraft: string;
}

const RISK_COLOR = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
};

const URGENCY_LABEL: Record<string, string> = {
  now: 'Agora',
  this_week: 'Esta semana',
  this_month: 'Este mês',
};

export function AiCollectionSuggestion({ chargeId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState('');
  const [copied, setCopied] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftTone, setDraftTone] = useState<'cordial' | 'firm' | 'urgent'>('cordial');
  const [draftChannel, setDraftChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');

  const suggestion = useMutation({
    mutationFn: async () =>
      (
        await api.post('/ai/charge-suggestion', {
          chargeId,
          context: context || undefined,
        })
      ).data.data.suggestion as Suggestion,
  });

  const draft = useMutation({
    mutationFn: async () =>
      (
        await api.post('/ai/draft-message', {
          chargeId,
          tone: draftTone,
          channel: draftChannel,
        })
      ).data.data.message as string,
    onSuccess: (msg) => setDraftMessage(msg),
  });

  function copyMessage(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function close() {
    setOpen(false);
    setContext('');
    setDraftMessage('');
    suggestion.reset();
    draft.reset();
  }

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-xs flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg"
        >
          <Sparkles className="w-3.5 h-3.5" /> IA cobrança
        </button>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                IA de cobrança
              </h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!suggestion.data && (
                <>
                  <p className="text-sm text-muted-foreground">
                    A IA analisa o histórico do morador e sugere estratégia de negociação +
                    rascunho de mensagem. Use o campo abaixo para dar contexto (opcional).
                  </p>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={2}
                    placeholder="Ex: morador alegou desemprego; ou tentamos contato 2x e não respondeu"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => suggestion.mutate()}
                    disabled={suggestion.isPending}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {suggestion.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Gerar análise
                  </button>
                </>
              )}

              {suggestion.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {(suggestion.error as any)?.response?.data?.message ?? 'Erro ao gerar análise.'}
                </div>
              )}

              {suggestion.data && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${RISK_COLOR[suggestion.data.riskLevel]}`}
                    >
                      Risco: {suggestion.data.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{suggestion.data.rationale}</p>

                  <div>
                    <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                      Ações recomendadas
                    </h3>
                    <ul className="space-y-2">
                      {suggestion.data.recommendedActions.map((a, i) => (
                        <li key={i} className="border rounded-lg p-3 text-sm">
                          <div className="flex justify-between items-start">
                            <strong>{a.label}</strong>
                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">
                              {URGENCY_LABEL[a.urgency] ?? a.urgency}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{a.description}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                      Opções de negociação
                    </h3>
                    <ul className="space-y-2">
                      {suggestion.data.negotiationOptions.map((o, i) => (
                        <li key={i} className="border rounded-lg p-3 text-sm flex justify-between">
                          <div>
                            <strong className="capitalize">{o.type}</strong>
                            <p className="text-xs text-gray-600">{o.description}</p>
                          </div>
                          <span className="text-xs font-mono text-green-700 self-center">
                            {o.estimatedRecoveryRate}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                      Rascunho de mensagem
                    </h3>
                    <div className="bg-gray-50 border rounded-lg p-3 text-sm whitespace-pre-wrap">
                      {suggestion.data.messageDraft}
                    </div>
                    <button
                      onClick={() => copyMessage(suggestion.data!.messageDraft)}
                      className="text-xs mt-2 flex items-center gap-1 border px-2.5 py-1 rounded hover:bg-gray-50"
                    >
                      {copied ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase text-gray-500">
                      Gerar mensagem alternativa
                    </h3>
                    <div className="flex gap-2">
                      <select
                        value={draftTone}
                        onChange={(e) => setDraftTone(e.target.value as any)}
                        className="px-2 py-1.5 border rounded text-sm"
                      >
                        <option value="cordial">Cordial</option>
                        <option value="firm">Firme</option>
                        <option value="urgent">Urgente</option>
                      </select>
                      <select
                        value={draftChannel}
                        onChange={(e) => setDraftChannel(e.target.value as any)}
                        className="px-2 py-1.5 border rounded text-sm"
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">E-mail</option>
                        <option value="sms">SMS</option>
                      </select>
                      <button
                        onClick={() => draft.mutate()}
                        disabled={draft.isPending}
                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded flex items-center gap-1 disabled:opacity-50"
                      >
                        {draft.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Gerar
                      </button>
                    </div>
                    {draftMessage && (
                      <div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm whitespace-pre-wrap">
                          {draftMessage}
                        </div>
                        <button
                          onClick={() => copyMessage(draftMessage)}
                          className="text-xs mt-2 flex items-center gap-1 border px-2.5 py-1 rounded hover:bg-gray-50"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AiCollectionSuggestion;
