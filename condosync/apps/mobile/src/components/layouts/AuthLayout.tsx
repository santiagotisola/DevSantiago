import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-5 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  );
}
