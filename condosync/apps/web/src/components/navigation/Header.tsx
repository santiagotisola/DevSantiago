import { Menu, Bell, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '../../lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, selectedCondominiumId, setSelectedCondominium } = useAuthStore();
  const navigate = useNavigate();
  const [showCondominiumMenu, setShowCondominiumMenu] = useState(false);

  const condominiums = user?.condominiumUsers?.map((cu) => cu.condominium) || [];
  const selectedCondominium = condominiums.find((c) => c.id === selectedCondominiumId);

  return (
    <header className="h-16 border-b bg-white flex items-center px-4 gap-4 shrink-0">
      {/* Menu toggle */}
      <button
        onClick={onMenuClick}
        className="text-gray-500 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Seletor de condomínio */}
      {condominiums.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setShowCondominiumMenu(!showCondominiumMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm transition-colors"
          >
            <span className="font-medium truncate max-w-48">
              {selectedCondominium?.name || 'Selecionar condomínio'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showCondominiumMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-lg z-50 py-1 min-w-64">
              {condominiums.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCondominium(c.id);
                    setShowCondominiumMenu(false);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors',
                    c.id === selectedCondominiumId && 'text-blue-600 font-medium'
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notificações */}
      <button
        className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        onClick={() => navigate('/comunicacao/avisos')}
      >
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      {/* Avatar */}
      <button
        onClick={() => navigate('/perfil')}
        className="flex items-center gap-2 ml-1"
      >
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
          {user?.name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium leading-none">{user?.name.split(' ')[0]}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role.toLowerCase().replace('_', ' ')}</p>
        </div>
      </button>
    </header>
  );
}
