import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Plus, Edit2, Tag, ToggleLeft, ToggleRight, Trash2, X, Check,
} from 'lucide-react';
import { toast } from '../../components/ui/toaster';
import api from '../../services/api';

type Partner = {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  logoUrl?: string;
  website?: string;
  phone?: string;
  email?: string;
  description?: string;
  offers: Offer[];
};

type Offer = {
  id: string;
  title: string;
  description: string;
  discount?: string;
  couponCode?: string;
  status: string;
  validUntil?: string;
};

const CATEGORIES = [
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'saude', label: 'Saúde & Bem-estar' },
  { value: 'educacao', label: 'Educação' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'lazer', label: 'Lazer & Entretenimento' },
  { value: 'outro', label: 'Outros' },
];

const empty = { name: '', category: 'servicos', description: '', logoUrl: '', website: '', phone: '', email: '' };

export default function MarketplaceAdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'partners' | 'offers'>('partners');
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [form, setForm] = useState(empty);
  const [offerForm, setOfferForm] = useState({ partnerId: '', title: '', description: '', discount: '', couponCode: '', validUntil: '' });

  // Queries
  const { data: partners, isLoading } = useQuery({
    queryKey: ['marketplace-partners-admin'],
    queryFn: async () => (await api.get('/marketplace/partners/admin')).data.data as Partner[],
  });

  const { data: offers } = useQuery({
    queryKey: ['marketplace-offers-admin'],
    queryFn: async () => (await api.get('/marketplace/offers')).data.data as (Offer & { partner: Partner })[],
  });

  // Mutations
  const createPartner = useMutation({
    mutationFn: () => api.post('/marketplace/partners', { ...form }),
    onSuccess: () => { toast('Parceiro criado!', 'success'); qc.invalidateQueries({ queryKey: ['marketplace-partners-admin'] }); setShowPartnerForm(false); setForm(empty); },
    onError: () => toast('Erro ao criar parceiro', 'error'),
  });

  const updatePartner = useMutation({
    mutationFn: () => api.put(`/marketplace/partners/${editPartner!.id}`, form),
    onSuccess: () => { toast('Parceiro atualizado!', 'success'); qc.invalidateQueries({ queryKey: ['marketplace-partners-admin'] }); setEditPartner(null); },
    onError: () => toast('Erro ao atualizar parceiro', 'error'),
  });

  const togglePartner = useMutation({
    mutationFn: (id: string) => api.patch(`/marketplace/partners/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketplace-partners-admin'] }),
    onError: () => toast('Erro ao alterar status', 'error'),
  });

  const createOffer = useMutation({
    mutationFn: () => api.post('/marketplace/offers', offerForm),
    onSuccess: () => { toast('Oferta criada!', 'success'); qc.invalidateQueries({ queryKey: ['marketplace-offers-admin'] }); setShowOfferForm(false); setOfferForm({ partnerId: '', title: '', description: '', discount: '', couponCode: '', validUntil: '' }); },
    onError: () => toast('Erro ao criar oferta', 'error'),
  });

  const deleteOffer = useMutation({
    mutationFn: (id: string) => api.delete(`/marketplace/offers/${id}`),
    onSuccess: () => { toast('Oferta removida', 'success'); qc.invalidateQueries({ queryKey: ['marketplace-offers-admin'] }); },
    onError: () => toast('Erro ao remover oferta', 'error'),
  });

  const openEditPartner = (p: Partner) => {
    setEditPartner(p);
    setForm({ name: p.name, category: p.category, description: p.description ?? '', logoUrl: p.logoUrl ?? '', website: p.website ?? '', phone: p.phone ?? '', email: p.email ?? '' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-500 mt-0.5">Parceiros e ofertas exclusivas para condôminos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowOfferForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
            <Tag size={16} /> Nova Oferta
          </button>
          <button onClick={() => { setShowPartnerForm(true); setForm(empty); }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
            <Plus size={16} /> Novo Parceiro
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['partners', 'offers'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={['px-4 py-2 text-sm font-medium border-b-2 transition-colors', tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'].join(' ')}>
            {t === 'partners' ? 'Parceiros' : 'Ofertas'}
          </button>
        ))}
      </div>

      {/* Partners Tab */}
      {tab === 'partners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading && <p className="text-gray-500 text-sm">Carregando...</p>}
          {(partners ?? []).map((p) => (
            <div key={p.id} className={['bg-white border rounded-xl p-4 shadow-sm', !p.isActive ? 'opacity-60' : ''].join(' ')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center overflow-hidden">
                    {p.logoUrl ? <img src={p.logoUrl} alt={p.name} className="w-full h-full object-cover" /> : <ShoppingBag size={18} className="text-primary-600" />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500">{CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditPartner(p)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded"><Edit2 size={14} /></button>
                  <button onClick={() => togglePartner.mutate(p.id)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                    {p.isActive ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                  </button>
                </div>
              </div>
              {p.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{p.description}</p>}
              <p className="text-xs text-gray-400 mt-2">{p.offers.length} oferta{p.offers.length !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      )}

      {/* Offers Tab */}
      {tab === 'offers' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Parceiro', 'Oferta', 'Desconto', 'Cupom', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {((offers ?? []) as any[]).map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{o.partner?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{o.title}</td>
                  <td className="px-4 py-3 text-gray-600">{o.discount ?? '—'}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{o.couponCode ?? '—'}</span></td>
                  <td className="px-4 py-3"><span className={['text-xs px-2 py-0.5 rounded-full', o.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'].join(' ')}>{o.status}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm('Remover oferta?')) deleteOffer.mutate(o.id); }} className="p-1.5 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Partner Form Modal */}
      {(showPartnerForm || editPartner) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{editPartner ? 'Editar Parceiro' : 'Novo Parceiro'}</h3>
              <button onClick={() => { setShowPartnerForm(false); setEditPartner(null); }}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              {([
                { key: 'name', label: 'Nome *', placeholder: 'Nome do parceiro' },
                { key: 'description', label: 'Descrição', placeholder: 'Descrição' },
                { key: 'logoUrl', label: 'URL do Logo', placeholder: 'https://...' },
                { key: 'website', label: 'Website', placeholder: 'https://...' },
                { key: 'phone', label: 'Telefone', placeholder: '(11) 9999-9999' },
                { key: 'email', label: 'E-mail', placeholder: 'contato@...' },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => editPartner ? updatePartner.mutate() : createPartner.mutate()} disabled={!form.name.trim()} className="mt-5 w-full bg-primary-600 text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              <Check size={16} /> {editPartner ? 'Atualizar' : 'Criar Parceiro'}
            </button>
          </div>
        </div>
      )}

      {/* Offer Form Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Nova Oferta</h3>
              <button onClick={() => setShowOfferForm(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Parceiro *</label>
                <select value={offerForm.partnerId} onChange={(e) => setOfferForm((f) => ({ ...f, partnerId: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Selecione...</option>
                  {(partners ?? []).filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {([
                { key: 'title', label: 'Título *', placeholder: 'Ex: 15% OFF em todos os produtos' },
                { key: 'description', label: 'Descrição *', placeholder: 'Descreva a oferta' },
                { key: 'discount', label: 'Desconto', placeholder: 'Ex: 15% OFF' },
                { key: 'couponCode', label: 'Código de cupom', placeholder: 'CONDO15' },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input value={(offerForm as any)[key]} onChange={(e) => setOfferForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Válido até</label>
                <input type="datetime-local" value={offerForm.validUntil} onChange={(e) => setOfferForm((f) => ({ ...f, validUntil: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <button onClick={() => createOffer.mutate()} disabled={!offerForm.partnerId || !offerForm.title.trim() || !offerForm.description.trim()} className="mt-5 w-full bg-primary-600 text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              <Check size={16} /> Criar Oferta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
