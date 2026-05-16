import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Loader2, ImagePlus, X, Upload, Building2, Save } from 'lucide-react';

// ── ImageUploadBox ──────────────────────────────────────────────────────────
function ImageUploadBox({
  label, hint, currentUrl, uploading, onFile, onRemove,
}: {
  label: string; hint: string; currentUrl?: string | null;
  uploading: boolean; onFile: (f: File) => void; onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) onFile(f);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => !currentUrl && inputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed transition-colors overflow-hidden
          ${drag ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}
          ${!currentUrl ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-50/50' : ''}`}
      >
        {currentUrl ? (
          <div className="relative group">
            <img src={currentUrl} alt={label} className="w-full h-36 object-contain p-2" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="bg-white text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 shadow"
              >
                <Upload className="w-3 h-3" /> Trocar
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 shadow"
              >
                <X className="w-3 h-3" /> Remover
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <ImagePlus className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-700">Arraste ou clique para enviar</p>
              <p className="text-xs text-slate-500">{hint}</p>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          hidden
          title={label}
          aria-label={label}
        />
      </div>
      <p className="text-xs text-slate-400">JPG, PNG ou WEBP — máx. 5 MB</p>
    </div>
  );
}

interface CondominiaBrandingFormProps {
  condominium: any;
  onSave?: () => void;
}

export function CondominiaBrandingForm({ condominium, onSave }: CondominiaBrandingFormProps) {
  const queryClient = useQueryClient();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(condominium?.logoUrl);
  const [heroUrl, setHeroUrl] = useState<string | null | undefined>(condominium?.heroImageUrl);
  const [saved, setSaved] = useState(false);

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/condominiums/${condominium.id}/upload/logo`, formData);
      return res.data.data.condominium.logoUrl;
    },
    onSuccess: (url) => {
      setLogoUrl(url);
      queryClient.invalidateQueries({ queryKey: ['condominium', condominium.id] });
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const uploadHeroMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/condominiums/${condominium.id}/upload/hero`, formData);
      return res.data.data.condominium.heroImageUrl;
    },
    onSuccess: (url) => {
      setHeroUrl(url);
      queryClient.invalidateQueries({ queryKey: ['condominium', condominium.id] });
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const removeLogoMutation = useMutation({
    mutationFn: () => api.put(`/condominiums/${condominium.id}`, { logoUrl: null }),
    onSuccess: () => {
      setLogoUrl(null);
      queryClient.invalidateQueries({ queryKey: ['condominium', condominium.id] });
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const removeHeroMutation = useMutation({
    mutationFn: () => api.put(`/condominiums/${condominium.id}`, { heroImageUrl: null }),
    onSuccess: () => {
      setHeroUrl(null);
      queryClient.invalidateQueries({ queryKey: ['condominium', condominium.id] });
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const isUploading = uploadLogoMutation.isPending || uploadHeroMutation.isPending || removeLogoMutation.isPending || removeHeroMutation.isPending;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold">Identidade Visual</h3>
      </div>

      <ImageUploadBox
        label="Logo do Condomínio"
        hint="Aparece no portal e no cabeçalho. Recomendado: 200×200px."
        currentUrl={logoUrl}
        uploading={uploadLogoMutation.isPending || removeLogoMutation.isPending}
        onFile={(f) => uploadLogoMutation.mutate(f)}
        onRemove={() => removeLogoMutation.mutate()}
      />

      <ImageUploadBox
        label="Imagem de Capa (Hero)"
        hint="Foto do condomínio para o banner da página inicial. Recomendado: 1200×600px."
        currentUrl={heroUrl}
        uploading={uploadHeroMutation.isPending || removeHeroMutation.isPending}
        onFile={(f) => uploadHeroMutation.mutate(f)}
        onRemove={() => removeHeroMutation.mutate()}
      />

      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Enviando imagem...
        </div>
      )}

      {saved && !isUploading && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <span>✓ Salvo com sucesso!</span>
        </div>
      )}
    </div>
  );
}
