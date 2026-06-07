import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Calendar, Clock, CheckCircle2, XCircle, Plus, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type CommonArea = {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  rules?: string;
  imageUrl?: string;
};

type Reservation = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  commonArea?: { name: string };
  createdAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'text-yellow-700 bg-yellow-50' },
  APPROVED: { label: 'Aprovada', color: 'text-green-700 bg-green-50' },
  REJECTED: { label: 'Rejeitada', color: 'text-red-700 bg-red-50' },
  CANCELLED: { label: 'Cancelada', color: 'text-gray-500 bg-gray-100' },
};

export default function ReservasMobilePage() {
  const { selectedCondominiumId } = useAuthStore();
  const qc = useQueryClient();
  const [view, setView] = useState<'areas' | 'minhas'>('areas');
  const [showForm, setShowForm] = useState(false);
  const [selectedArea, setSelectedArea] = useState<CommonArea | null>(null);
  const [formDate, setFormDate] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');

  const { data: areas, isLoading: loadingAreas } = useQuery({
    queryKey: ['common-areas', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/common-areas/condominium/${selectedCondominiumId}`);
      return (res.data.data?.commonAreas ?? res.data.data ?? []) as CommonArea[];
    },
    enabled: !!selectedCondominiumId,
  });

  const { data: myReservations, isLoading: loadingReservations } = useQuery({
    queryKey: ['my-reservations', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/common-areas/reservations/my?condominiumId=${selectedCondominiumId}`);
      return (res.data.data?.reservations ?? res.data.data ?? []) as Reservation[];
    },
    enabled: !!selectedCondominiumId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { date: string; startTime: string; endTime: string }) =>
      api.post(`/common-areas/${selectedArea!.id}/reservations`, data),
    onSuccess: () => {
      toast.success('Reserva solicitada!');
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
      setShowForm(false);
      resetForm();
    },
    onError: () => toast.error('Erro ao criar reserva'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/common-areas/reservations/${id}/cancel`),
    onSuccess: () => {
      toast.success('Reserva cancelada');
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
    },
    onError: () => toast.error('Erro ao cancelar reserva'),
  });

  function resetForm() {
    setSelectedArea(null);
    setFormDate('');
    setFormStart('');
    setFormEnd('');
  }

  function handleSubmit() {
    if (!formDate || !formStart || !formEnd) {
      toast.error('Preencha todos os campos');
      return;
    }
    createMutation.mutate({ date: formDate, startTime: formStart, endTime: formEnd });
  }

  const reservations = myReservations ?? [];

  return (
    <div className="p-4 space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('areas')}
          className={['flex-1 py-2 rounded-xl text-sm font-medium',
            view === 'areas' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 border border-slate-600'
          ].join(' ')}
        >
          Áreas Disponíveis
        </button>
        <button
          onClick={() => setView('minhas')}
          className={['flex-1 py-2 rounded-xl text-sm font-medium',
            view === 'minhas' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 border border-slate-600'
          ].join(' ')}
        >
          Minhas Reservas
        </button>
      </div>

      {/* ── Áreas ── */}
      {view === 'areas' && (
        <>
          {loadingAreas && (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loadingAreas && (areas ?? []).length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <Building2 size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma área comum cadastrada</p>
            </div>
          )}

          <div className="space-y-3">
            {(areas ?? []).map((area) => (
              <div key={area.id} className="bg-slate-700/60 rounded-2xl border border-slate-600 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{area.name}</p>
                    {area.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{area.description}</p>
                    )}
                    {area.capacity && (
                      <p className="text-xs text-slate-400 mt-1">Capacidade: {area.capacity} pessoas</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedArea(area); setShowForm(true); }}
                    className="btn-press px-3 py-2 bg-blue-600 text-white text-xs rounded-lg font-medium flex items-center gap-1"
                  >
                    <Plus size={14} /> Reservar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Minhas Reservas ── */}
      {view === 'minhas' && (
        <>
          {loadingReservations && (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loadingReservations && reservations.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma reserva encontrada</p>
            </div>
          )}

          <div className="space-y-3">
            {reservations.map((r) => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
              return (
                <div key={r.id} className="bg-slate-700/60 rounded-2xl border border-slate-600 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{r.commonArea?.name ?? 'Área Comum'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(r.date), 'dd/MM/yyyy', { locale: ptBR })} · {r.startTime} - {r.endTime}
                      </p>
                    </div>
                    <span className={['text-xs px-2 py-0.5 rounded-full font-medium', cfg.color].join(' ')}>
                      {cfg.label}
                    </span>
                  </div>
                  {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                    <button
                      onClick={() => cancelMutation.mutate(r.id)}
                      disabled={cancelMutation.isPending}
                      className="btn-press mt-3 w-full py-2 bg-red-600/20 text-red-300 border border-red-600/50 rounded-xl text-xs font-medium"
                    >
                      Cancelar Reserva
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Modal Reserva ── */}
      {showForm && selectedArea && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 border border-slate-600">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Reservar {selectedArea.name}</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400" title="Fechar">
                <X size={20} />
              </button>
            </div>

            {selectedArea.rules && (
              <p className="text-xs text-slate-400 bg-slate-700/60 rounded-lg p-3">{selectedArea.rules}</p>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="reservation-date" className="text-xs text-slate-400 mb-1 block">Data</label>
                <input
                  id="reservation-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reservation-start" className="text-xs text-slate-400 mb-1 block">Início</label>
                  <input
                    id="reservation-start"
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="reservation-end" className="text-xs text-slate-400 mb-1 block">Término</label>
                  <input
                    id="reservation-end"
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="btn-press w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Confirmar Reserva
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
