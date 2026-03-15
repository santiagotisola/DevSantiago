import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightNode?: React.ReactNode;
  transparent?: boolean;
}

export default function MobileHeader({
  title,
  showBack = false,
  onBack,
  rightNode,
  transparent = false,
}: MobileHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 gap-3 safe-top',
        transparent ? 'bg-transparent' : 'bg-white border-b border-gray-200',
      ].join(' ')}
    >
      {showBack && (
        <button
          onClick={handleBack}
          className="p-1 -ml-1 rounded-full text-gray-600 hover:bg-gray-100 active:scale-95 transition-transform"
        >
          <ArrowLeft size={22} />
        </button>
      )}

      <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">
        {title}
      </h1>

      {rightNode ?? (
        <button className="relative p-1 rounded-full text-gray-600 hover:bg-gray-100 active:scale-95 transition-transform">
          <Bell size={20} />
        </button>
      )}
    </header>
  );
}
