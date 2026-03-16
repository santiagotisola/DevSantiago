import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Tag, ExternalLink, Copy, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../../services/api';

type Partner = { id: string; name: string; logoUrl?: string; category: string; website?: string };
type Offer = {
  id: string;
  title: string;
  description: string;
  discount?: string;
  couponCode?: string;
  validUntil?: string;
  partner: Partner;
};

const CATEGORY_LABELS: Record<string, string> = {
  alimentacao: '🍔 Alimentação',
  saude: '💊 Saúde',
  educacao: '📚 Educação',
  servicos: '🔧 Serviços',
  lazer: '🎉 Lazer',
  outro: '🛍️ Outros',
};

export default function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const { data: offersData, isLoading } = useQuery({
    queryKey: ['marketplace-offers', selectedCategory],
    queryFn: async () => {
      const params = selectedCategory ? `?category=${selectedCategory}` : '';
      const res = await api.get(`/marketplace/offers${params}`);
      return res.data.data as Offer[];
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['marketplace-categories'],
    queryFn: async () => {
      const res = await api.get('/marketplace/categories');
      return res.data.data as Array<{ value: string; label: string }>;
    },
  });

  const offers = offersData ?? [];
  const categories = categoriesData ?? [];

  if (selectedOffer) {
    return (
      <div className="p-4 space-y-4">
        <button onClick={() => setSelectedOffer(null)} className="text-sm text-primary-600 font-medium">
          ← Voltar
        </button>

        {/* Offer detail */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-center">
            {selectedOffer.partner.logoUrl ? (
              <img src={selectedOffer.partner.logoUrl} alt={selectedOffer.partner.name} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 bg-white p-1" />
            ) : (
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShoppingBag size={28} className="text-white" />
              </div>
            )}
            <p className="text-white/80 text-sm">{selectedOffer.partner.name}</p>
            <h2 className="text-white text-xl font-bold mt-1">{selectedOffer.title}</h2>
            {selectedOffer.discount && (
              <div className="mt-3 inline-block bg-yellow-400 text-yellow-900 text-sm font-bold px-4 py-1 rounded-full">
                {selectedOffer.discount}
              </div>
            )}
          </div>

          <div className="p-4 space-y-4">
            <p className="text-gray-700 text-sm leading-relaxed">{selectedOffer.description}</p>

            {selectedOffer.validUntil && (
              <p className="text-xs text-gray-400">
                Válido até {format(new Date(selectedOffer.validUntil), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}

            {selectedOffer.couponCode && (
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Código de desconto</p>
                  <p className="font-mono font-bold text-xl text-gray-900 tracking-wider">
                    {selectedOffer.couponCode}
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedOffer.couponCode!);
                    toast.success('Código copiado!');
                  }}
                  className="btn-press p-3 bg-primary-600 text-white rounded-xl"
                >
                  <Copy size={18} />
                </button>
              </div>
            )}

            {selectedOffer.partner.website && (
              <a
                href={selectedOffer.partner.website}
                target="_blank"
                rel="noreferrer"
                className="btn-press w-full bg-primary-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
              >
                <ExternalLink size={16} />
                Visitar site
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={[
            'flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
            !selectedCategory ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200',
          ].join(' ')}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={[
              'flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors whitespace-nowrap',
              selectedCategory === cat.value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200',
            ].join(' ')}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && offers.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma oferta disponível</p>
        </div>
      )}

      <div className="space-y-3">
        {offers.map((offer) => (
          <button
            key={offer.id}
            onClick={() => setSelectedOffer(offer)}
            className="btn-press w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left flex items-center gap-3"
          >
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              {offer.partner.logoUrl ? (
                <img src={offer.partner.logoUrl} alt={offer.partner.name} className="w-full h-full object-cover" />
              ) : (
                <ShoppingBag size={20} className="text-primary-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{offer.partner.name}</p>
              <p className="font-semibold text-gray-900 line-clamp-1">{offer.title}</p>
              {offer.discount && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium">
                  {offer.discount}
                </span>
              )}
            </div>
            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
