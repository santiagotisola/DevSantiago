import { Outlet } from 'react-router-dom';
import MobileHeader from '../navigation/MobileHeader';
import BottomNav from '../navigation/BottomNav';

interface MobileLayoutProps {
  title: string;
  showBack?: boolean;
  headerRight?: React.ReactNode;
}

export default function MobileLayout({ title, showBack, headerRight }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileHeader title={title} showBack={showBack} rightNode={headerRight} />
      {/* offset for fixed header (56px) */}
      <main className="flex-1 overflow-y-auto pt-14 pb-20 scroll-area">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
