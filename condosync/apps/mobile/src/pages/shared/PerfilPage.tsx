import { useNavigate } from 'react-router-dom';
import { LogOut, User, Building2, Mail, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CONDOMINIUM_ADMIN: 'Administrador',
  SYNDIC: 'Síndico',
  DOORMAN: 'Porteiro',
  RESIDENT: 'Morador',
  STAFF: 'Funcionário',
};

export default function PerfilPage() {
  const navigate = useNavigate();
  const { user, selectedCondominiumId, logout } = useAuthStore();

  const condoUser = user?.condominiumUsers?.find(
    (cu) => cu.condominiumId === selectedCondominiumId
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    toast.success('Sessão encerrada');
  };

  return (
    <div className="p-4 space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center py-4">
        <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center mb-3 overflow-hidden">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <User size={36} className="text-white" />
          )}
        </div>
        <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
        <span className="text-xs px-3 py-1 bg-primary-50 text-primary-700 rounded-full mt-1">
          {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
        </span>
      </div>

      {/* Info */}
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
      </div>

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
