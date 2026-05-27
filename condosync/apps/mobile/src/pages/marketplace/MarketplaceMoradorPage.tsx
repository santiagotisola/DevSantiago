import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Heart, Star, MessageSquare, ChevronDown,
  X, Plus, Minus, Check, AlertCircle, MapPin,
} from 'lucide-react';
import { toast } from '../../components/ui/toaster';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  discount?: number;
  finalPrice: number;
  shippingCost: number;
  imageUrl?: string;
  category: string;
  stock: number;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  partner?: { id: string; name: string; email?: string; phone?: string };
};

type CartItem = {
  productId: string;
  quantity: number;
  product?: Product;
};

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'saude', label: 'Saúde & Bem-estar' },
  { value: 'educacao', label: 'Educação' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'lazer', label: 'Lazer' },
  { value: 'outro', label: 'Outros' },
];

export default function MarketplaceMoradorPage() {
  const qc = useQueryClient();
  const { selectedCondominiumId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [notes, setNotes] = useState('');

  // Queries
  const { data: products, isLoading } = useQuery({
    queryKey: ['marketplace-products-morador', selectedCondominiumId],
    queryFn: async () => {
      return (await api.get('/marketplace/products')).data.data as Product[];
    },
  });

  // Mutations
  const createRequest = useMutation({
    mutationFn: async () => {
      const requests = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes,
      }));
      return Promise.all(requests.map((req) => api.post('/marketplace/requests', req)));
    },
    onSuccess: () => {
      toast('Requisições criadas com sucesso!', 'success');
      setCart([]);
      setNotes('');
      setShowCart(false);
      qc.invalidateQueries({ queryKey: ['marketplace-requests-morador'] });
    },
    onError: (error: any) => toast(`Erro: ${error.response?.data?.message}`, 'error'),
  });

  const toggleFavorite = (productId: string) => {
    if (favorites.includes(productId)) {
      setFavorites(favorites.filter((id) => id !== productId));
    } else {
      setFavorites([...favorites, productId]);
    }
  };

  // Filtered products
  const filtered = (products ?? [])
    .filter((p) => p.isActive)
    .filter((p) => selectedCategory === 'all' || p.category === selectedCategory)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));

  const cartTotal = cart.reduce((sum, item) => {
    const product = products?.find((p) => p.id === item.productId);
    return sum + (product ? product.finalPrice * item.quantity + product.shippingCost : 0);
  }, 0);

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(cart.map((item) => (item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item)));
      }
    } else {
      setCart([...cart, { productId: product.id, quantity: 1, product }]);
    }
    setSelectedProduct(null);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const updateCartQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900">Marketplace</h1>
          <button onClick={() => setShowCart(!showCart)} className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={['px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all', selectedCategory === cat.value ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'].join(' ')}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {!showCart ? (
        <div className="p-4 space-y-4">
          {isLoading && <p className="text-center text-gray-500 text-sm">Carregando produtos...</p>}

          {filtered.length === 0 && !isLoading && <p className="text-center text-gray-500 text-sm">Nenhum produto encontrado</p>}

          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((product) => (
              <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                {/* Image */}
                <div className="relative w-full h-40 bg-gray-100 overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
                      <ShoppingCart size={32} className="text-primary-300" />
                    </div>
                  )}

                  {/* Discount Badge */}
                  {product.discount && product.discount > 0 && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
                      -{Math.round(product.discount)}%
                    </div>
                  )}

                  {/* Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(product.id);
                    }}
                    aria-label="Favoritar produto"
                    className="absolute top-2 left-2 p-1.5 bg-white rounded-lg shadow hover:bg-gray-100"
                  >
                    <Heart size={16} fill={favorites.includes(product.id) ? 'currentColor' : 'none'} className={favorites.includes(product.id) ? 'text-red-500' : 'text-gray-400'} />
                  </button>

                  {/* Stock Status */}
                  {product.stock === 0 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><p className="text-white font-semibold text-sm">Fora de estoque</p></div>}
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <p className="font-semibold text-gray-900 text-sm line-clamp-2">{product.name}</p>

                  {/* Rating */}
                  {product.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} className={i < Math.round(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">({product.reviewCount})</span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="space-y-0.5">
                    {product.discount && product.discount > 0 ? (
                      <>
                        <p className="text-xs text-gray-500 line-through">R$ {product.price.toFixed(2)}</p>
                        <p className="font-bold text-green-600 text-sm">R$ {product.finalPrice.toFixed(2)}</p>
                      </>
                    ) : (
                      <p className="font-bold text-gray-900 text-sm">R$ {product.price.toFixed(2)}</p>
                    )}
                    <p className="text-xs text-gray-500">+ Frete: R$ {product.shippingCost.toFixed(2)}</p>
                  </div>

                  {/* Partner */}
                  {product.partner && <p className="text-xs text-gray-600">{product.partner.name}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Cart View
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Seu Carrinho</h2>
            <button onClick={() => setShowCart(false)} aria-label="Fechar carrinho" className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          {cart.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Carrinho vazio</p>
          ) : (
            <>
              <div className="bg-white rounded-xl p-4 space-y-3">
                {cart.map((item) => {
                  const product = products?.find((p) => p.id === item.productId);
                  if (!product) return null;
                  return (
                    <div key={item.productId} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                      {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 line-clamp-1">{product.name}</p>
                        <p className="text-xs text-gray-500 mb-2">{product.partner?.name}</p>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm text-green-600">R$ {(product.finalPrice * item.quantity).toFixed(2)}</p>
                          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                            <button onClick={() => updateCartQuantity(item.productId, item.quantity - 1)} aria-label="Diminuir quantidade" className="p-0.5 hover:bg-gray-200 rounded">
                              <Minus size={14} className="text-gray-600" />
                            </button>
                            <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item.productId, item.quantity + 1)} aria-label="Aumentar quantidade" className="p-0.5 hover:bg-gray-200 rounded" disabled={item.quantity >= product.stock}>
                              <Plus size={14} className="text-gray-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.productId)} aria-label="Remover do carrinho" className="text-red-400 hover:text-red-600 p-2">
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              <div className="bg-white rounded-xl p-4">
                <label className="block text-xs font-semibold text-gray-600 mb-2">Observações (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Entregar até sexta-feira"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Totals */}
              <div className="bg-white rounded-xl p-4 space-y-2 border-t-2 border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold text-gray-900">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-100">
                  <span>Total:</span>
                  <span className="text-primary-600">R$ {cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => createRequest.mutate()}
                disabled={createRequest.isPending}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {createRequest.isPending ? '⏳ Enviando...' : <><Check size={18} /> Enviar Requisição</>}
              </button>
            </>
          )}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-xl overflow-y-auto max-h-[90vh]">
            {/* Close Button */}
            <button onClick={() => setSelectedProduct(null)} aria-label="Fechar detalhes do produto" className="sticky top-4 left-full p-2 text-gray-400 hover:text-gray-600 -mr-10 sm:mr-0">
              <X size={20} />
            </button>

            {/* Image */}
            <div className="relative w-full h-56 bg-gray-100 -mt-10 sm:mt-0">
              {selectedProduct.imageUrl ? (
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
                  <ShoppingCart size={48} className="text-primary-300" />
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <p className="text-xs text-gray-500 mb-2">{selectedProduct.partner?.name}</p>
                <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h2>
              </div>

              {/* Rating */}
              {selectedProduct.rating > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className={i < Math.round(selectedProduct.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">({selectedProduct.reviewCount} avaliações)</span>
                </div>
              )}

              {/* Description */}
              <p className="text-gray-600 text-sm leading-relaxed">{selectedProduct.description}</p>

              {/* Price */}
              <div className="space-y-1">
                {selectedProduct.discount && selectedProduct.discount > 0 && (
                  <p className="text-sm text-gray-500 line-through">R$ {selectedProduct.price.toFixed(2)}</p>
                )}
                <p className="text-3xl font-bold text-gray-900">R$ {selectedProduct.finalPrice.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Frete: R$ {selectedProduct.shippingCost.toFixed(2)}</p>
              </div>

              {/* Partner Info */}
              {selectedProduct.partner && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                  <p className="font-semibold text-gray-900">{selectedProduct.partner.name}</p>
                  {selectedProduct.partner.phone && <p className="text-gray-600 flex items-center gap-2"><MessageSquare size={14} /> {selectedProduct.partner.phone}</p>}
                  {selectedProduct.partner.email && <p className="text-gray-600">{selectedProduct.partner.email}</p>}
                </div>
              )}

              {/* Stock */}
              <div className={['flex items-center gap-2 px-4 py-3 rounded-lg text-sm', selectedProduct.stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'].join(' ')}>
                <AlertCircle size={16} />
                {selectedProduct.stock > 0 ? `${selectedProduct.stock} em estoque` : 'Fora de estoque'}
              </div>

              {/* Quantity Selector */}
              {selectedProduct.stock > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-600">Quantidade:</span>
                  <div className="flex items-center gap-3 bg-gray-100 p-2 rounded-lg">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Diminuir quantidade" className="p-1 hover:bg-gray-200 rounded">
                      <Minus size={18} className="text-gray-600" />
                    </button>
                    <span className="w-8 text-center font-semibold text-gray-900">{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))} aria-label="Aumentar quantidade" className="p-1 hover:bg-gray-200 rounded">
                      <Plus size={18} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
              <button
                onClick={() => {
                  for (let i = 0; i < quantity; i++) {
                    addToCart(selectedProduct);
                  }
                  setQuantity(1);
                  toast(`${selectedProduct.name} adicionado ao carrinho!`, 'success');
                }}
                disabled={selectedProduct.stock === 0}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShoppingCart size={18} /> Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
