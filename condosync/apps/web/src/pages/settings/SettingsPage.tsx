import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Loader2 } from 'lucide-react';
import { CondominiaBrandingForm } from '../../components/CondominiaBrandingForm';

// ── SettingsPage ────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { selectedCondominiumId } = useAuthStore();

  const { data: condominium, isLoading } = useQuery({
    queryKey: ['condominium', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/condominiums/${selectedCondominiumId}`);
      return res.data.data.condominium;
    },
    enabled: !!selectedCondominiumId,
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Identidade visual do condomínio</p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : condominium ? (
        <section className="bg-white rounded-xl border p-6">
          <CondominiaBrandingForm condominium={condominium} />
        </section>
      ) : null}
    </div>
  );
}
