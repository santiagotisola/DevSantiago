import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Save, Loader2, Building2, MapPin, Phone, CheckCircle2 } from 'lucide-react';
import { maskCNPJ, validateCNPJ, maskPhone, validatePhone, validateEmail } from '../../lib/utils';

function maskCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function validateCep(cep: string): string | null {
  if (!cep) return null;
  const d = cep.replace(/\D/g, '');
  return d.length === 8 ? null : 'CEP deve ter 8 dígitos';
}

type Form = {
  name: string;
  cnpj: string;
  logoUrl: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
};

const empty: Form = {
  name: '', cnpj: '', logoUrl: '', address: '', city: '', state: '',
  zipCode: '', phone: '', email: '',
};

export function SettingsPage() {
  const { selectedCondominiumId } = useAuthStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const { data: condominium, isLoading } = useQuery({
    queryKey: ['condominium', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/condominiums/${selectedCondominiumId}`);
      return res.data.data.condominium;
    },
    enabled: !!selectedCondominiumId,
  });

  // Repopula o form sempre que o condomínio ativo muda ou o backend retorna novos dados
  useEffect(() => {
    if (!condominium) return;
    setForm({
      name: condominium.name ?? '',
      cnpj: maskCNPJ(condominium.cnpj ?? ''),
      logoUrl: condominium.logoUrl ?? '',
      address: condominium.address ?? '',
      city: condominium.city ?? '',
      state: (condominium.state ?? '').toUpperCase(),
      zipCode: maskCep(condominium.zipCode ?? ''),
      phone: maskPhone(condominium.phone ?? ''),
      email: condominium.email ?? '',
    });
    setErrors({});
  }, [condominium]);

  const updateMutation = useMutation({
    mutationFn: (d: Partial<Form>) =>
      api.put(`/condominiums/${selectedCondominiumId}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominium'] });
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setToast({ kind: 'success', msg: 'Configurações salvas.' });
      setTimeout(() => setToast(null), 2500);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erro ao salvar configurações.';
      setToast({ kind: 'error', msg });
      setTimeout(() => setToast(null), 4000);
    },
  });

  function update<K extends keyof Form>(key: K, value: string) {
    let v = value;
    if (key === 'cnpj') v = maskCNPJ(value);
    else if (key === 'phone') v = maskPhone(value);
    else if (key === 'zipCode') v = maskCep(value);
    else if (key === 'state') v = value.toUpperCase().slice(0, 2);
    setForm((f) => ({ ...f, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSave() {
    const errs: Partial<Record<keyof Form, string>> = {};
    if (!form.name || form.name.trim().length < 2) errs.name = 'Nome obrigatório (mín. 2 caracteres)';
    const cnpjErr = validateCNPJ(form.cnpj); if (cnpjErr) errs.cnpj = cnpjErr;
    const cepErr = validateCep(form.zipCode); if (cepErr) errs.zipCode = cepErr;
    const phoneErr = validatePhone(form.phone); if (phoneErr) errs.phone = phoneErr;
    const emailErr = validateEmail(form.email); if (emailErr) errs.email = emailErr;
    if (form.state && form.state.length !== 2) errs.state = 'UF deve ter 2 letras';
    if (form.logoUrl && !/^https?:\/\//i.test(form.logoUrl)) errs.logoUrl = 'URL deve começar com http(s)://';

    if (Object.keys(errs).length) {
      setErrors(errs);
      setToast({ kind: 'error', msg: 'Verifique os campos destacados.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setErrors({});

    // Backend ignora strings vazias mas sanitiza pra deixar a intenção clara
    const payload: Partial<Form> = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? undefined : v]),
    );
    updateMutation.mutate(payload);
  }

  function fieldClass(key: keyof Form) {
    return `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      errors[key] ? 'border-red-400' : ''
    }`;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Dados e configurações do condomínio</p>
        </div>
        {condominium && (
          <div className="text-right text-xs text-muted-foreground">
            <p>Plano: <span className="font-medium text-gray-700">{condominium.plan ?? 'basic'}</span></p>
            <p>Limite: <span className="font-medium text-gray-700">{condominium.maxUnits ?? '—'} unidades</span></p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Identificação */}
          <section className="bg-white rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold">Identificação</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-medium">Nome do condomínio *</label>
                <input
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className={fieldClass('name')}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CNPJ</label>
                <input
                  value={form.cnpj}
                  onChange={(e) => update('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className={fieldClass('cnpj')}
                />
                {errors.cnpj && <p className="text-xs text-red-500">{errors.cnpj}</p>}
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-medium">URL do logo</label>
                <input
                  type="url"
                  value={form.logoUrl}
                  onChange={(e) => update('logoUrl', e.target.value)}
                  placeholder="https://..."
                  className={fieldClass('logoUrl')}
                />
                {errors.logoUrl && <p className="text-xs text-red-500">{errors.logoUrl}</p>}
              </div>
              <div className="flex items-center justify-center bg-gray-50 rounded-lg border h-[68px] overflow-hidden">
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Logo"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Pré-visualização</span>
                )}
              </div>
            </div>
          </section>

          {/* Endereço */}
          <section className="bg-white rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold">Endereço</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-medium">CEP</label>
                <input
                  value={form.zipCode}
                  onChange={(e) => update('zipCode', e.target.value)}
                  placeholder="00000-000"
                  className={fieldClass('zipCode')}
                />
                {errors.zipCode && <p className="text-xs text-red-500">{errors.zipCode}</p>}
              </div>
              <div className="md:col-span-4 space-y-1">
                <label className="text-sm font-medium">Endereço</label>
                <input
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  placeholder="Rua, número, bairro"
                  className={fieldClass('address')}
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <label className="text-sm font-medium">Cidade</label>
                <input
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  className={fieldClass('city')}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-medium">Estado (UF)</label>
                <input
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                  maxLength={2}
                  placeholder="GO"
                  className={fieldClass('state')}
                />
                {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
              </div>
            </div>
          </section>

          {/* Contato */}
          <section className="bg-white rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold">Contato</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Telefone</label>
                <input
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={fieldClass('phone')}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">E-mail de contato</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="contato@condominio.com.br"
                  className={fieldClass('email')}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </button>
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
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">!</span>
            )}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
