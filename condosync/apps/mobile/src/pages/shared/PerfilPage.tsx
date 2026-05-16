import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { LogOut, User, Building2, Mail, Shield, Pencil, Check, X, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CONDOMINIUM_ADMIN: 'Administrador',
  SYNDIC: 'Síndico',
  DOORMAN: 'Porteiro',
  RESIDENT: 'Morador',
  SERVICE_PROVIDER: 'Prestador de Serviço',
  STAFF: 'Funcionário',
};

export default function PerfilPage() {
  const navigate = useNavigate();
  const { user, selectedCondominiumId, logout, setUser } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editPhone, setEditPhone] = useState('');

  const condoUser = user?.condominiumUsers?.find(
    (cu) => cu.condominiumId === selectedCondominiumId
  );

  const updateMutation = useMutation({
    mutationFn: (d: { name: string; phone: string }) =>
      api.patch(`/users/${user?.id}`, d),
    onSuccess: (res) => {
      const updated = res.data?.data?.user ?? res.data?.data;
      if (updated && user) {
        setUser({ ...user, name: updated.name ?? editName });
      }
      toast.success('Perfil atualizado!');
      setEditing(false);
    },
    onError: () => toast.error('Erro ao atualizar perfil'),
  });

  const handleSave = () => {
    if (!editName.trim()) { toast.error('Nome não pode ser vazio'); return; }
    updateMutation.mutate({ name: editName.trim(), phone: editPhone.trim() });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    toast.success('Sessão encerrada');
  };

  return (
    <div className="p-4 space-y-6">
      {/* Avatar + nome */}
      <div className="flex flex-col items-center py-4">
        <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center mb-3 overflow-hidden">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <User size={36} className="text-white" />
          )}
        </div>
        {editing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            aria-label="Nome"
            className="text-center text-lg font-bold text-gray-900 border-b-2 border-primary-500 focus:outline-none bg-transparent w-full max-w-xs"
            autoFocus
          />
        ) : (
          <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
        )}
        <span className="text-xs px-3 py-1 bg-primary-50 text-primary-700 rounded-full mt-1">
          {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
        </span>
      </div>

      {/* Info / Edição */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
        {[
          { icon: Mail, label: 'E-mail', value: user?.email },
          {
            icon: Building2,
            label: 'Condomínio',
            value: condoUser?.condominium?.name ?? '—',
          },
          condoUser?.unit && {
            icon: Shield,
            label: 'Unidade',
            value: `${condoUser.unit.identifier}${condoUser.unit.block ? ` • Bloco ${condoUser.unit.block}` : ''}`,
          },
        ]
          .filter(Boolean)
          .map((item) => {
            const { icon: Icon, label, value } = item as any;
            return (
              <div key={label} className="flex items-center gap-3 px-4 py-3.5">
                <Icon size={18} className="text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-medium text-gray-900">{value}</p>
                </div>
              </div>
            );
          })}

        {/* Telefone — editável */}
        {editing && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Phone size={18} className="text-gray-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Telefone</p>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="text-sm font-medium text-gray-900 w-full focus:outline-none border-b border-gray-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Botões edição */}
      {editing ? (
        <div className="flex gap-2">
          <button
            onClick={() => { setEditing(false); setEditName(user?.name ?? ''); setEditPhone(''); }}
            className="btn-press flex-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
          >
            <X size={16} />
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="btn-press flex-1 bg-primary-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
          >
            {updateMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Salvar
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setEditing(true); setEditName(user?.name ?? ''); }}
          className="btn-press w-full bg-primary-50 text-primary-700 border border-primary-100 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
        >
          <Pencil size={16} />
          Editar perfil
        </button>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="btn-press w-full bg-red-50 text-red-600 border border-red-100 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
      >
        <LogOut size={18} />
        Sair da conta
      </button>

      <p className="text-center text-xs text-gray-400">CondoSync Mobile v1.0</p>
    </div>
  );
}
