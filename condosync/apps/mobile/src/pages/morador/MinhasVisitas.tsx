import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Visitor = {
  id: string;
  name: string;
  document?: string;
  reason?: string;
  scheduledAt?: string;
  preAuthorized: boolean;
  entryAt?: string;
  exitAt?: string;
};

export default function MinhasVisitas() {
  const { selectedCondominiumId, user } = useAuthStore();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [nameError, setNameError] = useState('');
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [reason, setReason] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const unitId = user?.condominiumUsers?.find(
    (cu) => cu.condominiumId === selectedCondominiumId
  )?.unitId;

  const { data, isLoading } = useQuery({
    queryKey: ['my-visitors', selectedCondominiumId, unitId],
    queryFn: async () => {
      const res = await api.get(`/visitors/condominium/${selectedCondominiumId}?unitId=${unitId}&limit=50`);
      return res.data.data as Visitor[];
    },
    enabled: !!selectedCondominiumId && !!unitId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/visitors', {
        name,
        document: document || undefined,
        reason: reason || undefined,
        scheduledAt: scheduledAt || undefined,
        condominiumId: selectedCondominiumId,
        unitId,
        preAuthorized: true,
      }),
    onSuccess: () => {
      toast.success('Visitante pré-autorizado!');
      qc.invalidateQueries({ queryKey: ['my-visitors'] });
      setShowForm(false);
      setNameError('');
      setName('');
      setDocument('');
      setReason('');
      setScheduledAt('');
    },
    onError: () => toast.error('Erro ao pré-autorizar visitante'),
  });

  const visitors = data ?? [];

  return (
    <div className="p-4 space-y-4">
      <button
        onClick={() => setShowForm(true)}
        className="btn-press w-full bg-primary-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        Pré-autorizar visitante
      </button>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="bg-white rounded-t-3xl w-full p-6 pb-safe-bottom space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Novo visitante</h3>
              <button onClick={() => { setShowForm(false); setNameError(''); }}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
                placeholder="Nome completo"
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${nameError ? 'border-red-400' : 'border-gray-300'}`}
              />
              {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
            </div>

            {[{ label: 'Documento', value: document, setValue: setDocument, placeholder: 'CPF ou RG' },
              { label: 'Motivo', value: reason, setValue: setReason, placeholder: 'Ex: visita familiar' },
            ].map(({ label, value, setValue, placeholder }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data/hora agendada (opcional)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <button
              onClick={() => {
                if (!name.trim() || name.trim().length < 2) {
                  setNameError('Nome deve ter pelo menos 2 caracteres');
                  return;
                }
                setNameError('');
                createMutation.mutate();
              }}
              disabled={!name.trim() || createMutation.isPending}
              className="btn-press w-full bg-primary-600 text-white rounded-xl py-3 font-semibold disabled:opacity-60"
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && visitors.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Shield size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum visitante pré-autorizado</p>
        </div>
      )}

      <div className="space-y-3">
        {visitors.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{v.name}</p>
                {v.document && <p className="text-xs text-gray-500">{v.document}</p>}
                {v.reason && <p className="text-xs text-gray-500">{v.reason}</p>}
                {v.scheduledAt && (
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar size={12} className="text-primary-500" />
                    <span className="text-xs text-primary-600">
                      {format(new Date(v.scheduledAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
              <span
                className={[
                  'text-xs px-2 py-0.5 rounded-full',
                  v.exitAt
                    ? 'bg-gray-100 text-gray-600'
                    : v.entryAt
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700',
                ].join(' ')}
              >
                {v.exitAt ? 'Saiu' : v.entryAt ? 'Dentro' : 'Aguardando'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
