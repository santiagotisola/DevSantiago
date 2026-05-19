import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Plus, Edit2, Tag, ToggleLeft, ToggleRight, Trash2, X, Check,
  Upload, FileUp, MessageSquare, Clock, CheckCircle, AlertCircle,
} from 'lucide-react';
import { toast } from '../../components/ui/toaster';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

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

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  discount?: number;
  finalPrice: number;
  shippingCost: number;
  imageUrl?: string;
  category: string;
  stock: number;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  partnerId: string;
  createdAt: string;
};

type ProductRequest = {
  id: string;
  productId: string;
  quantity: number;
  status: string;
  quotedPrice?: number;
  notes?: string;
  createdAt: string;
  product?: Product;
  resident?: { id: string; name: string; email: string };
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
  const { selectedCondominiumId, user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [tab, setTab] = useState<'partners' | 'offers' | 'products' | 'requests'>('products');
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [offerForm, setOfferForm] = useState({ partnerId: '', title: '', description: '', discount: '', couponCode: '', validUntil: '' });
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', discount: '', shippingCost: '', category: 'outro', stock: '', imageUrl: '', partnerId: '' });
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Queries
  const { data: partners, isLoading } = useQuery({
    queryKey: ['marketplace-partners-admin', selectedCondominiumId],
    queryFn: async () => {
      const params = isSuperAdmin && selectedCondominiumId ? `?condominiumId=${selectedCondominiumId}` : '';
      return (await api.get(`/marketplace/partners/admin${params}`)).data.data as Partner[];
    },
  });

  const { data: offers } = useQuery({
    queryKey: ['marketplace-offers-admin', selectedCondominiumId],
    queryFn: async () => {
      const params = isSuperAdmin && selectedCondominiumId ? `?condominiumId=${selectedCondominiumId}` : '';
      return (await api.get(`/marketplace/offers${params}`)).data.data as (Offer & { partner: Partner })[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['marketplace-products-admin', selectedCondominiumId],
    queryFn: async () => {
      return (await api.get('/marketplace/products')).data.data as Product[];
    },
  });

  const { data: requests } = useQuery({
    queryKey: ['marketplace-requests-admin', selectedCondominiumId],
    queryFn: async () => {
      return (await api.get('/marketplace/requests')).data.data as ProductRequest[];
    },
  });

  // Mutations
  const createPartner = useMutation({
    mutationFn: () => api.post('/marketplace/partners', {
      ...form,
      ...(selectedCondominiumId ? { condominiumId: selectedCondominiumId } : {}),
    }),
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

  const createProduct = useMutation({
    mutationFn: () => api.post('/marketplace/products', {
      name: productForm.name,
      description: productForm.description,
      price: parseFloat(productForm.price),
      discount: productForm.discount ? parseFloat(productForm.discount) : 0,
      shippingCost: parseFloat(productForm.shippingCost),
      category: productForm.category,
      stock: parseInt(productForm.stock),
      imageUrl: productForm.imageUrl || undefined,
      partnerId: productForm.partnerId,
    }),
    onSuccess: () => { 
      toast('Produto criado!', 'success'); 
      qc.invalidateQueries({ queryKey: ['marketplace-products-admin'] }); 
      setShowProductForm(false); 
      setProductForm({ name: '', description: '', price: '', discount: '', shippingCost: '', category: 'outro', stock: '', imageUrl: '', partnerId: '' });
    },
    onError: (error: any) => toast(`Erro ao criar produto: ${error.response?.data?.message}`, 'error'),
  });

  const updateProduct = useMutation({
    mutationFn: () => api.put(`/marketplace/products/${editProduct!.id}`, {
      name: productForm.name,
      description: productForm.description,
      price: parseFloat(productForm.price),
      discount: productForm.discount ? parseFloat(productForm.discount) : 0,
      shippingCost: parseFloat(productForm.shippingCost),
      category: productForm.category,
      stock: parseInt(productForm.stock),
      imageUrl: productForm.imageUrl || undefined,
    }),
    onSuccess: () => { 
      toast('Produto atualizado!', 'success'); 
      qc.invalidateQueries({ queryKey: ['marketplace-products-admin'] }); 
      setEditProduct(null); 
    },
    onError: (error: any) => toast(`Erro ao atualizar produto: ${error.response?.data?.message}`, 'error'),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/marketplace/products/${id}`),
    onSuccess: () => { toast('Produto removido', 'success'); qc.invalidateQueries({ queryKey: ['marketplace-products-admin'] }); },
    onError: () => toast('Erro ao remover produto', 'error'),
  });

  const updateRequestStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/marketplace/requests/${id}`, { status }),
    onSuccess: () => { toast('Status atualizado!', 'success'); qc.invalidateQueries({ queryKey: ['marketplace-requests-admin'] }); },
    onError: () => toast('Erro ao atualizar status', 'error'),
  });

  const importCSV = useMutation({
    mutationFn: async () => {
      if (!csvFile) throw new Error('Nenhum arquivo selecionado');
      const formData = new FormData();
      formData.append('file', csvFile);
      return api.post('/marketplace/products/import', formData);
    },
    onSuccess: () => { 
      toast('Produtos importados com sucesso!', 'success'); 
      setCsvFile(null);
      qc.invalidateQueries({ queryKey: ['marketplace-products-admin'] }); 
    },
    onError: (error: any) => toast(`Erro na importação: ${error.response?.data?.message}`, 'error'),
  });

  const openEditPartner = (p: Partner) => {
    setEditPartner(p);
    setForm({ name: p.name, category: p.category, description: p.description ?? '', logoUrl: p.logoUrl ?? '', website: p.website ?? '', phone: p.phone ?? '', email: p.email ?? '' });
  };

  const openEditProduct = (p: Product) => {
    setEditProduct(p);
    setProductForm({ 
      name: p.name, 
      description: p.description, 
      price: p.price.toString(),
      discount: (p.discount ?? 0).toString(),
      shippingCost: p.shippingCost.toString(),
      category: p.category,
      stock: p.stock.toString(),
      imageUrl: p.imageUrl ?? '',
      partnerId: p.partnerId,
    });
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'PENDING': return <Clock size={14} className="text-yellow-500" />;
      case 'QUOTED': return <AlertCircle size={14} className="text-blue-500" />;
      case 'ACCEPTED': return <CheckCircle size={14} className="text-green-500" />;
      default: return <AlertCircle size={14} className="text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie parceiros, ofertas, produtos e requisições</p>
        </div>
        <div className="flex gap-2">
          {tab === 'products' && (
            <>
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 cursor-pointer">
                <Upload size={16} /> Importar CSV
                <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
              {csvFile && (
                <button onClick={() => importCSV.mutate()} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700">
                  <FileUp size={16} /> Fazer Upload
                </button>
              )}
            </>
          )}
          {tab === 'products' && (
            <button onClick={() => { setShowProductForm(true); setEditProduct(null); setProductForm({ name: '', description: '', price: '', discount: '', shippingCost: '', category: 'outro', stock: '', imageUrl: '', partnerId: '' }); }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
              <Plus size={16} /> Novo Produto
            </button>
          )}
          {tab === 'offers' && (
            <button onClick={() => setShowOfferForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
              <Tag size={16} /> Nova Oferta
            </button>
          )}
          {tab === 'partners' && (
            <button onClick={() => { setShowPartnerForm(true); setForm(empty); }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
              <Plus size={16} /> Novo Parceiro
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {(['products', 'requests', 'partners', 'offers'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={['px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap', tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'].join(' ')}>
            {t === 'partners' ? 'Parceiros' : t === 'offers' ? 'Ofertas' : t === 'products' ? 'Catálogo' : 'Requisições'}
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
                  <button onClick={() => openEditPartner(p)} aria-label="Editar parceiro" className="p-1.5 text-gray-400 hover:text-gray-600 rounded"><Edit2 size={14} /></button>
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
                    <button onClick={() => { if (confirm('Remover oferta?')) deleteOffer.mutate(o.id); }} aria-label="Remover oferta" className="p-1.5 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Products Tab */}
      {tab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(products ?? []).map((p) => (
            <div key={p.id} className={['bg-white border rounded-xl p-4 shadow-sm overflow-hidden', !p.isActive ? 'opacity-60' : ''].join(' ')}>
              {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-40 object-cover rounded-lg mb-3" />}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500">{CATEGORIES.find((c) => c.value === p.category)?.label}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditProduct(p)} aria-label="Editar" className="p-1.5 text-gray-400 hover:text-gray-600"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm('Remover produto?')) deleteProduct.mutate(p.id); }} aria-label="Remover" className="p-1.5 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div>
                    {p.discount ? (
                      <div>
                        <p className="text-xs text-gray-500 line-through">R$ {p.price.toFixed(2)}</p>
                        <p className="font-semibold text-green-600 text-sm">R$ {p.finalPrice.toFixed(2)}</p>
                      </div>
                    ) : (
                      <p className="font-semibold text-gray-900 text-sm">R$ {p.price.toFixed(2)}</p>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-gray-500">Estoque: {p.stock}</p>
                    <p className="text-gray-500">Frete: R$ {p.shippingCost.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Morador', 'Produto', 'Qtd', 'Status', 'Preço Cotado', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {((requests ?? []) as any[]).map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{r.resident?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.product?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.quantity}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    {getStatusIcon(r.status)}
                    <span className="text-xs">{r.status}</span>
                  </td>
                  <td className="px-4 py-3">{r.quotedPrice ? `R$ ${r.quotedPrice.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3">
                    <select value={r.status} onChange={(e) => updateRequestStatus.mutate({ id: r.id, status: e.target.value })} className="text-xs px-2 py-1 border border-gray-200 rounded">
                      <option value="PENDING">Pendente</option>
                      <option value="QUOTED">Cotado</option>
                      <option value="ACCEPTED">Aceito</option>
                      <option value="REJECTED">Rejeitado</option>
                    </select>
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
              <button onClick={() => { setShowPartnerForm(false); setEditPartner(null); }} aria-label="Fechar"><X size={18} className="text-gray-400" /></button>
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
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} aria-label="Categoria" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
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
              <button onClick={() => setShowOfferForm(false)} aria-label="Fechar"><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Parceiro *</label>
                <select value={offerForm.partnerId} onChange={(e) => setOfferForm((f) => ({ ...f, partnerId: e.target.value }))} aria-label="Parceiro" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
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
                <input type="datetime-local" value={offerForm.validUntil} onChange={(e) => setOfferForm((f) => ({ ...f, validUntil: e.target.value }))} aria-label="Válido até" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <button onClick={() => createOffer.mutate()} disabled={!offerForm.partnerId || !offerForm.title.trim() || !offerForm.description.trim()} className="mt-5 w-full bg-primary-600 text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              <Check size={16} /> Criar Oferta
            </button>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {(showProductForm || editProduct) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{editProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => { setShowProductForm(false); setEditProduct(null); }} aria-label="Fechar"><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {!editProduct && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Parceiro *</label>
                  <select value={productForm.partnerId} onChange={(e) => setProductForm((f) => ({ ...f, partnerId: e.target.value }))} aria-label="Parceiro" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Selecione...</option>
                    {(partners ?? []).filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              {([
                { key: 'name' as const, label: 'Nome *', placeholder: 'Nome do produto', type: 'text' },
                { key: 'description' as const, label: 'Descrição *', placeholder: 'Descrição detalhada', type: 'text' },
                { key: 'price' as const, label: 'Preço (R$) *', placeholder: '0.00', type: 'number' },
                { key: 'discount' as const, label: 'Desconto (%)', placeholder: '0', type: 'number' },
                { key: 'shippingCost' as const, label: 'Frete (R$) *', placeholder: '0.00', type: 'number' },
                { key: 'imageUrl' as const, label: 'URL da Imagem', placeholder: 'https://...', type: 'text' },
                { key: 'stock' as const, label: 'Estoque *', placeholder: '0', type: 'number' },
              ]).map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input 
                    type={type}
                    value={(productForm as any)[key]} 
                    onChange={(e) => setProductForm((f) => ({ ...f, [key]: e.target.value }))} 
                    placeholder={placeholder} 
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
                <select value={productForm.category} onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))} aria-label="Categoria" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <button 
              onClick={() => editProduct ? updateProduct.mutate() : createProduct.mutate()} 
              disabled={!productForm.name.trim() || !productForm.description.trim() || !productForm.price || !productForm.shippingCost || !productForm.stock || (!editProduct && !productForm.partnerId)}
              className="mt-5 w-full bg-primary-600 text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Check size={16} /> {editProduct ? 'Atualizar Produto' : 'Criar Produto'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
