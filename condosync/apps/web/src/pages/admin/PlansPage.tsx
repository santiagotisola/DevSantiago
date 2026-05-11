import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  X,
  AlertTriangle,
  Power,
} from 'lucide-react';

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: string | number;
  maxUnits: number;
  features: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  slug: string;
  name: string;
  description: string;
  price: string;
  maxUnits: string;
  features: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  slug: '',
  name: '',
  description: '',
  price: '0',
  maxUnits: '100',
  features: '',
  isActive: true,
};

function planToForm(p: Plan): FormState {
  return {
    slug: p.slug,
    name: p.name,
    description: p.description ?? '',
    price: String(p.price ?? 0),
    maxUnits: String(p.maxUnits ?? 0),
    features: (p.features ?? []).join('\n'),
    isActive: p.isActive,
  };
}

function formatBRL(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PlansPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const r = await api.get<{ data: { plans: Plan[] } }>('/plans');
      return r.data.data.plans;
    },
  });
  const plans = data ?? [];

  function notify(kind: 'success' | 'error', msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), kind === 'success' ? 2500 : 4000);
  }

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Record<string, unknown> }) => {
      if (id) return api.put(`/plans/${id}`, payload);
      return api.post('/plans', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      setErrors({});
      notify('success', 'Plano salvo.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erro ao salvar plano.';
      notify('error', msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setDeleteTarget(null);
      notify('success', 'Plano excluído.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erro ao excluir plano.';
      notify('error', msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (plan: Plan) =>
      api.put(`/plans/${plan.id}`, { isActive: !plan.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      notify('success', 'Status atualizado.');
    },
    onError: () => notify('error', 'Erro ao alterar status.'),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  }

  function openEdit(plan: Plan) {
    setEditing(plan);
    setForm(planToForm(plan));
    setErrors({});
    setShowModal(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    let next: any = value;
    if (key === 'slug') {
      next = String(value)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    setForm((f) => ({ ...f, [key]: next }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSave() {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!editing) {
      if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(form.slug))
        errs.slug = 'Slug inválido (minúsculas, números e hífens)';
    }
    if (!form.name || form.name.trim().length < 2) errs.name = 'Nome obrigatório';
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) errs.price = 'Preço inválido';
    const maxUnits = parseInt(form.maxUnits, 10);
    if (!Number.isFinite(maxUnits) || maxUnits <= 0) errs.maxUnits = 'maxUnits deve ser inteiro > 0';

    if (Object.keys(errs).length) {
      setErrors(errs);
      notify('error', 'Verifique os campos destacados.');
      return;
    }

    const features = form.features
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      maxUnits,
      features,
      isActive: form.isActive,
    };
    if (!editing) payload.slug = form.slug;

    saveMutation.mutate({ id: editing?.id, payload });
  }

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return Number(a.price) - Number(b.price);
      }),
    [plans],
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Planos</h1>
          <p className="text-muted-foreground">
            Gerencie os planos de assinatura disponíveis para os condomínios.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Novo plano
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : sortedPlans.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          Nenhum plano cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPlans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border p-5 flex flex-col gap-3 ${
                plan.isActive ? '' : 'opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    {plan.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{plan.slug}</p>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                    plan.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {plan.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div>
                <p className="text-2xl font-bold">{formatBRL(plan.price)}</p>
                <p className="text-xs text-muted-foreground">por mês</p>
              </div>

              <p className="text-sm text-gray-700">
                Limite de unidades:{' '}
                <span className="font-medium">{plan.maxUnits.toLocaleString('pt-BR')}</span>
              </p>

              {plan.description && (
                <p className="text-sm text-gray-600">{plan.description}</p>
              )}

              {plan.features && plan.features.length > 0 && (
                <ul className="text-sm text-gray-600 space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2 mt-auto pt-3 border-t">
                <button
                  onClick={() => openEdit(plan)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => toggleActiveMutation.mutate(plan)}
                  disabled={toggleActiveMutation.isPending}
                  className="flex items-center justify-center text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50"
                  title={plan.isActive ? 'Inativar' : 'Ativar'}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(plan)}
                  className="flex items-center justify-center text-sm border border-red-200 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal create/edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-lg">
                {editing ? `Editar plano — ${editing.name}` : 'Novo plano'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Slug *</label>
                  <input
                    value={form.slug}
                    onChange={(e) => update('slug', e.target.value)}
                    disabled={!!editing}
                    placeholder="ex: pro"
                    className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.slug ? 'border-red-400' : ''
                    } ${editing ? 'bg-gray-50 text-gray-500' : ''}`}
                  />
                  {errors.slug && <p className="text-xs text-red-500">{errors.slug}</p>}
                  {editing && (
                    <p className="text-xs text-muted-foreground">
                      Slug não pode ser alterado após criação.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nome *</label>
                  <input
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="ex: Profissional"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-400' : ''
                    }`}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Preço mensal (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => update('price', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.price ? 'border-red-400' : ''
                    }`}
                  />
                  {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Limite de unidades *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.maxUnits}
                    onChange={(e) => update('maxUnits', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.maxUnits ? 'border-red-400' : ''
                    }`}
                  />
                  {errors.maxUnits && <p className="text-xs text-red-500">{errors.maxUnits}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Features (uma por linha)
                </label>
                <textarea
                  value={form.features}
                  onChange={(e) => update('features', e.target.value)}
                  rows={4}
                  placeholder={'Até 100 unidades\nSuporte por email\nRelatórios mensais'}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => update('isActive', e.target.checked)}
                />
                Plano ativo
              </label>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="text-sm px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal delete */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="font-semibold text-lg">Excluir plano</h2>
            </div>
            <p className="text-sm text-gray-600">
              Excluir o plano <strong>{deleteTarget.name}</strong> ({deleteTarget.slug})? Esta
              ação não pode ser desfeita. Se algum condomínio ainda usa este plano, a exclusão
              será bloqueada.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-sm px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[80]">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm ${
              toast.kind === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.kind === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlansPage;
