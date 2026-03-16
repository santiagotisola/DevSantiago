import { useQuery } from '@tanstack/react-query';
import { PawPrint } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Pet = {
  id: string;
  name: string;
  type: string;
  breed?: string;
  size?: string;
  color?: string;
  photoUrl?: string;
};

const TYPE_EMOJI: Record<string, string> = {
  Cachorro: '🐶',
  Gato: '🐱',
  Pássaro: '🦜',
  Peixe: '🐟',
  Outro: '🐾',
};

export default function Pets() {
  const { selectedCondominiumId, user } = useAuthStore();

  const unitId = user?.condominiumUsers?.find(
    (cu) => cu.condominiumId === selectedCondominiumId
  )?.unitId;

  const { data, isLoading } = useQuery({
    queryKey: ['pets', selectedCondominiumId, unitId],
    queryFn: async () => {
      const res = await api.get(`/pets/unit/${unitId}`);
      return res.data.data as Pet[];
    },
    enabled: !!selectedCondominiumId && !!unitId,
  });

  const pets = data ?? [];

  return (
    <div className="p-4 space-y-4">
      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && pets.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <PawPrint size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum pet cadastrado na sua unidade</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {pets.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {p.photoUrl ? (
              <img src={p.photoUrl} alt={p.name} className="w-full h-32 object-cover" />
            ) : (
              <div className="w-full h-32 bg-pink-50 flex items-center justify-center text-4xl">
                {TYPE_EMOJI[p.type] ?? '🐾'}
              </div>
            )}
            <div className="p-3">
              <p className="font-semibold text-gray-900">{p.name}</p>
              <p className="text-xs text-gray-500">
                {p.type}{p.breed ? ` • ${p.breed}` : ''}
              </p>
              {p.size && <p className="text-xs text-gray-400">{p.size}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
