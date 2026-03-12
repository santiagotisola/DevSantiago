import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { User, Save, Loader2, Lock } from 'lucide-react';

export function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: user?.name || '', phone: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (d: typeof form) => api.put(`/users/${user?.id}`, d),
    onSuccess: (res) => {
      setUser(res.data.data.user);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (d: { currentPassword: string; newPassword: string }) => api.put('/auth/change-password', d),
    onSuccess: () => { setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPwError(''); },
    onError: (err: any) => setPwError(err.response?.data?.message || 'Erro ao alterar senha'),
  });

  const handlePasswordSubmit = () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('As senhas não conferem'); return; }
    if (pwForm.newPassword.length < 8) { setPwError('A senha deve ter ao menos 8 caracteres'); return; }
    passwordMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  };

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: 'Super Administrador', CONDOMINIUM_ADMIN: 'Administrador', SYNDIC: 'Síndico',
    SUB_SYNDIC: 'Subsíndico', DOORMAN: 'Porteiro', RESIDENT: 'Morador', EMPLOYEE: 'Funcionário',
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mt-1 inline-block">{roleLabels[user?.role || ''] || user?.role}</span>
          </div>
        </div>

        <hr />

        <div className="space-y-4">
          <h2 className="font-semibold text-sm">Informações Pessoais</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome completo</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">E-mail</label>
              <input value={user?.email || ''} disabled className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 text-muted-foreground cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Telefone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <button
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Salvo!' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-sm">Alterar Senha</h2>
        </div>
        <div className="space-y-3">
          {[['Senha atual', 'currentPassword'], ['Nova senha', 'newPassword'], ['Confirmar nova senha', 'confirmPassword']].map(([label, key]) => (
            <div key={key} className="space-y-1">
              <label className="text-sm font-medium">{label}</label>
              <input type="password" value={(pwForm as any)[key]} onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          {passwordMutation.isSuccess && <p className="text-sm text-green-600">Senha alterada com sucesso!</p>}
        </div>
        <button
          onClick={handlePasswordSubmit}
          disabled={!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword || passwordMutation.isPending}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {passwordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Alterar Senha
        </button>
      </div>
    </div>
  );
}
