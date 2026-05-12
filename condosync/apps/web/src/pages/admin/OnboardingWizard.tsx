import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Building2,
  UserCog,
  Home,
  Wrench,
  Mail,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api';
import { maskCNPJ, validateCNPJ, maskPhone, validatePhone, validateEmail } from '../../lib/utils';

interface CondoForm {
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
}
interface AdminForm {
  name: string;
  email: string;
  password: string;
}
interface UnitRow {
  identifier: string;
  block: string;
  type: string;
}
interface AreaRow {
  name: string;
  capacity: string;
}
interface InviteRow {
  email: string;
  role: 'SYNDIC' | 'DOORMAN' | 'CONDOMINIUM_ADMIN' | 'COUNCIL_MEMBER';
}

const STEPS = [
  { id: 1, label: 'Condomínio', icon: Building2 },
  { id: 2, label: 'Administrador', icon: UserCog },
  { id: 3, label: 'Unidades', icon: Home },
  { id: 4, label: 'Áreas comuns', icon: Wrench },
  { id: 5, label: 'Convites', icon: Mail },
];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const [condo, setCondo] = useState<CondoForm>({
    name: '',
    cnpj: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
  });
  const [condoId, setCondoId] = useState<string | null>(null);

  const [admin, setAdmin] = useState<AdminForm>({ name: '', email: '', password: '' });
  const [units, setUnits] = useState<UnitRow[]>([
    { identifier: '', block: '', type: 'apartamento' },
  ]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);

  const createCondo = useMutation({
    mutationFn: () => {
      const payload: any = { name: condo.name };
      if (condo.address) payload.address = condo.address;
      if (condo.city) payload.city = condo.city;
      if (condo.state) payload.state = condo.state;
      if (condo.zipCode) payload.zipCode = condo.zipCode;
      if (condo.cnpj.replace(/\D/g, ''))
        payload.cnpj = condo.cnpj.replace(/\D/g, '');
      if (condo.phone) payload.phone = condo.phone;
      if (condo.email) payload.email = condo.email;
      return api.post('/condominiums', payload);
    },
    onSuccess: (r) => {
      setCondoId(r.data.data.condominium.id);
      setError('');
      setStep(2);
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erro ao criar condomínio'),
  });

  const setupAdmin = useMutation({
    mutationFn: () => api.post(`/condominiums/${condoId}/setup-admin`, admin),
    onSuccess: () => {
      setError('');
      setStep(3);
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erro ao criar admin'),
  });

  const createUnits = useMutation({
    mutationFn: async () => {
      const valid = units.filter((u) => u.identifier.trim());
      if (valid.length === 0) return;
      // Sequencial pra não ter race condition no upsert do schema
      for (const u of valid) {
        await api.post('/units', {
          condominiumId: condoId,
          identifier: u.identifier.trim(),
          block: u.block.trim() || undefined,
          type: u.type || undefined,
        });
      }
    },
    onSuccess: () => {
      setError('');
      setStep(4);
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erro ao criar unidades'),
  });

  const createAreas = useMutation({
    mutationFn: async () => {
      for (const a of areas.filter((x) => x.name.trim())) {
        await api.post('/common-areas', {
          condominiumId: condoId,
          name: a.name.trim(),
          capacity: a.capacity ? Number(a.capacity) : undefined,
        });
      }
    },
    onSuccess: () => {
      setError('');
      setStep(5);
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erro ao criar áreas'),
  });

  const sendInvites = useMutation({
    mutationFn: async () => {
      for (const inv of invites.filter((x) => x.email.trim())) {
        await api.post('/invitations', {
          email: inv.email.trim().toLowerCase(),
          role: inv.role,
          condominiumId: condoId,
        });
      }
    },
    onSuccess: () => {
      navigate('/admin/condominios');
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erro ao enviar convites'),
  });

  function next() {
    setError('');
    if (step === 1) {
      if (!condo.name || condo.name.length < 3) return setError('Nome obrigatório (mín. 3)');
      if (condo.cnpj) {
        const err = validateCNPJ(condo.cnpj);
        if (err) return setError(err);
      }
      if (condo.email) {
        const err = validateEmail(condo.email);
        if (err) return setError(err);
      }
      if (condo.phone) {
        const err = validatePhone(condo.phone);
        if (err) return setError(err);
      }
      createCondo.mutate();
      return;
    }
    if (step === 2) {
      if (!admin.name || admin.name.length < 2) return setError('Nome obrigatório');
      const emailErr = validateEmail(admin.email);
      if (emailErr) return setError(emailErr);
      if (admin.password.length < 8) return setError('Senha mínima de 8 caracteres');
      setupAdmin.mutate();
      return;
    }
    if (step === 3) {
      createUnits.mutate();
      return;
    }
    if (step === 4) {
      createAreas.mutate();
      return;
    }
    if (step === 5) {
      sendInvites.mutate();
      return;
    }
  }

  function back() {
    setError('');
    if (step > 1) setStep((s) => s - 1);
  }

  // Rollback: enquanto o condomínio existe mas o wizard ainda não acabou
  // (passou pelo passo 5 com sucesso), oferece desfazer. Apaga o condo;
  // o backend recusa se já houver vínculos significativos, então caímos
  // numa mensagem informando que precisa inativar manualmente.
  const abortMut = useMutation({
    mutationFn: async () => {
      if (!condoId) return;
      await api.delete(`/condominiums/${condoId}`);
    },
    onSuccess: () => {
      setCondoId(null);
      navigate('/admin/condominios');
    },
    onError: (e: any) => {
      setError(
        e?.response?.data?.message ??
          'Não foi possível desfazer; abra Condomínios e finalize manualmente.',
      );
    },
  });

  function abort() {
    if (!condoId) {
      navigate('/admin/condominios');
      return;
    }
    if (
      !window.confirm(
        'Cancelar o assistente apagará o condomínio recém-criado e todos os dados inseridos. Continuar?',
      )
    )
      return;
    abortMut.mutate();
  }

  // Avisa antes do reload/fechar aba enquanto há rascunho pendente.
  useEffect(() => {
    if (!condoId) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [condoId]);

  const loading =
    createCondo.isPending ||
    setupAdmin.isPending ||
    createUnits.isPending ||
    createAreas.isPending ||
    sendInvites.isPending;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Onboarding de Condomínio</h1>
        <p className="text-muted-foreground">
          Em 5 passos seu condomínio fica pronto para uso (1º admin + unidades + áreas + convites).
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                  active
                    ? 'bg-blue-600 text-white font-medium'
                    : done
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300" />}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        {/* Step 1 — Condo */}
        {step === 1 && (
          <>
            <h2 className="font-semibold">Passo 1 — Dados do Condomínio</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                className="md:col-span-2 px-3 py-2 border rounded-lg text-sm"
                placeholder="Nome *"
                value={condo.name}
                onChange={(e) => setCondo({ ...condo, name: e.target.value })}
              />
              <input
                className="px-3 py-2 border rounded-lg text-sm"
                placeholder="CNPJ"
                value={condo.cnpj}
                onChange={(e) => setCondo({ ...condo, cnpj: maskCNPJ(e.target.value) })}
              />
              <input
                className="md:col-span-2 px-3 py-2 border rounded-lg text-sm"
                placeholder="Endereço"
                value={condo.address}
                onChange={(e) => setCondo({ ...condo, address: e.target.value })}
              />
              <input
                className="px-3 py-2 border rounded-lg text-sm"
                placeholder="CEP"
                value={condo.zipCode}
                onChange={(e) => setCondo({ ...condo, zipCode: e.target.value })}
              />
              <input
                className="md:col-span-2 px-3 py-2 border rounded-lg text-sm"
                placeholder="Cidade"
                value={condo.city}
                onChange={(e) => setCondo({ ...condo, city: e.target.value })}
              />
              <input
                className="px-3 py-2 border rounded-lg text-sm"
                placeholder="UF"
                maxLength={2}
                value={condo.state}
                onChange={(e) => setCondo({ ...condo, state: e.target.value.toUpperCase() })}
              />
              <input
                className="px-3 py-2 border rounded-lg text-sm"
                placeholder="Telefone"
                value={condo.phone}
                onChange={(e) => setCondo({ ...condo, phone: maskPhone(e.target.value) })}
              />
              <input
                className="md:col-span-2 px-3 py-2 border rounded-lg text-sm"
                placeholder="E-mail"
                value={condo.email}
                onChange={(e) => setCondo({ ...condo, email: e.target.value })}
              />
            </div>
          </>
        )}

        {/* Step 2 — Admin */}
        {step === 2 && (
          <>
            <h2 className="font-semibold">Passo 2 — Primeiro Administrador</h2>
            <p className="text-xs text-muted-foreground">
              Será criado um usuário CONDOMINIUM_ADMIN com a senha que você definir aqui.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <input
                className="px-3 py-2 border rounded-lg text-sm"
                placeholder="Nome completo"
                value={admin.name}
                onChange={(e) => setAdmin({ ...admin, name: e.target.value })}
              />
              <input
                className="px-3 py-2 border rounded-lg text-sm"
                placeholder="E-mail"
                type="email"
                value={admin.email}
                onChange={(e) => setAdmin({ ...admin, email: e.target.value })}
              />
              <input
                className="px-3 py-2 border rounded-lg text-sm"
                placeholder="Senha (mín. 8 caracteres)"
                type="password"
                value={admin.password}
                onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
              />
            </div>
          </>
        )}

        {/* Step 3 — Units */}
        {step === 3 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Passo 3 — Unidades</h2>
              <button
                onClick={() =>
                  setUnits([...units, { identifier: '', block: '', type: 'apartamento' }])
                }
                className="text-xs flex items-center gap-1 border px-2 py-1 rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cadastre algumas unidades agora — você pode adicionar o resto depois.
            </p>
            <div className="space-y-2">
              {units.map((u, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input
                    className="col-span-4 px-3 py-2 border rounded-lg text-sm"
                    placeholder="Identificador (ex: 101, Casa 03)"
                    value={u.identifier}
                    onChange={(e) => {
                      const arr = [...units];
                      arr[idx].identifier = e.target.value;
                      setUnits(arr);
                    }}
                  />
                  <input
                    className="col-span-3 px-3 py-2 border rounded-lg text-sm"
                    placeholder="Bloco/Torre"
                    value={u.block}
                    onChange={(e) => {
                      const arr = [...units];
                      arr[idx].block = e.target.value;
                      setUnits(arr);
                    }}
                  />
                  <select
                    className="col-span-4 px-3 py-2 border rounded-lg text-sm"
                    value={u.type}
                    onChange={(e) => {
                      const arr = [...units];
                      arr[idx].type = e.target.value;
                      setUnits(arr);
                    }}
                  >
                    <option value="apartamento">Apartamento</option>
                    <option value="casa">Casa</option>
                    <option value="loja">Loja</option>
                    <option value="vaga">Vaga</option>
                  </select>
                  <button
                    onClick={() => setUnits(units.filter((_, i) => i !== idx))}
                    disabled={units.length === 1}
                    className="col-span-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 4 — Areas */}
        {step === 4 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Passo 4 — Áreas Comuns (opcional)</h2>
              <button
                onClick={() => setAreas([...areas, { name: '', capacity: '' }])}
                className="text-xs flex items-center gap-1 border px-2 py-1 rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-3 h-3" /> Adicionar área
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ex: Piscina, Salão de Festas, Churrasqueira, Academia. Pule e cadastre depois se preferir.
            </p>
            {areas.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4">
                Nenhuma área cadastrada. Você pode pular este passo.
              </p>
            ) : (
              <div className="space-y-2">
                {areas.map((a, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      className="col-span-7 px-3 py-2 border rounded-lg text-sm"
                      placeholder="Nome (ex: Salão de Festas)"
                      value={a.name}
                      onChange={(e) => {
                        const arr = [...areas];
                        arr[idx].name = e.target.value;
                        setAreas(arr);
                      }}
                    />
                    <input
                      className="col-span-4 px-3 py-2 border rounded-lg text-sm"
                      placeholder="Capacidade"
                      type="number"
                      value={a.capacity}
                      onChange={(e) => {
                        const arr = [...areas];
                        arr[idx].capacity = e.target.value;
                        setAreas(arr);
                      }}
                    />
                    <button
                      onClick={() => setAreas(areas.filter((_, i) => i !== idx))}
                      className="col-span-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Step 5 — Invites */}
        {step === 5 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Passo 5 — Primeiros Convites (opcional)</h2>
              <button
                onClick={() => setInvites([...invites, { email: '', role: 'SYNDIC' }])}
                className="text-xs flex items-center gap-1 border px-2 py-1 rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-3 h-3" /> Adicionar convite
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Convide síndico, porteiro, conselheiros. O e-mail será disparado automaticamente.
              Moradores são convidados a partir da página de moradores depois.
            </p>
            {invites.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4">
                Nenhum convite. Pule este passo se quiser convidar depois.
              </p>
            ) : (
              <div className="space-y-2">
                {invites.map((inv, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      className="col-span-7 px-3 py-2 border rounded-lg text-sm"
                      placeholder="E-mail"
                      type="email"
                      value={inv.email}
                      onChange={(e) => {
                        const arr = [...invites];
                        arr[idx].email = e.target.value;
                        setInvites(arr);
                      }}
                    />
                    <select
                      className="col-span-4 px-3 py-2 border rounded-lg text-sm"
                      value={inv.role}
                      onChange={(e) => {
                        const arr = [...invites];
                        arr[idx].role = e.target.value as InviteRow['role'];
                        setInvites(arr);
                      }}
                    >
                      <option value="SYNDIC">Síndico</option>
                      <option value="CONDOMINIUM_ADMIN">Administrador</option>
                      <option value="COUNCIL_MEMBER">Conselheiro</option>
                      <option value="DOORMAN">Porteiro</option>
                    </select>
                    <button
                      onClick={() => setInvites(invites.filter((_, i) => i !== idx))}
                      className="col-span-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <button
              onClick={back}
              disabled={step === 1 || loading}
              className="flex items-center gap-1 text-sm px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            {condoId && (
              <button
                onClick={abort}
                disabled={loading || abortMut.isPending}
                className="text-xs px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
                title="Apaga o condomínio criado e cancela o wizard"
              >
                {abortMut.isPending ? 'Desfazendo…' : 'Cancelar e desfazer'}
              </button>
            )}
          </div>
          <button
            onClick={next}
            disabled={loading}
            className="flex items-center gap-1 text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {step === 5 ? 'Finalizar' : 'Continuar'}
            {!loading && step < 5 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingWizard;
