import React, { useState } from 'react';
import { ImageUpload } from './ImageUpload';
import { useUploadUserAvatar, useDeleteUserAvatar, getUserAvatarUrl } from '../hooks/useImageUpload';
import { Loader2, AlertCircle } from 'lucide-react';

interface AvatarUploadModalProps {
  userId: string;
  currentAvatarPath?: string | null;
  onSuccess?: () => void;
  onClose: () => void;
}

export function AvatarUploadModal({
  userId,
  currentAvatarPath,
  onSuccess,
  onClose,
}: AvatarUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const uploadMutation = useUploadUserAvatar(userId);
  const deleteMutation = useDeleteUserAvatar(userId);

  const handleUpload = async () => {
    if (!selectedFile) return;

    uploadMutation.mutate(selectedFile, {
      onSuccess: () => {
        setSelectedFile(null);
        onSuccess?.();
        onClose();
      },
    });
  };

  const handleDelete = async () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        onSuccess?.();
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Foto de Perfil</h2>

        {uploadMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <div className="text-sm text-red-700">
              Erro ao fazer upload. Tente novamente.
            </div>
          </div>
        )}

        <ImageUpload
          onImageSelected={setSelectedFile}
          currentImage={getUserAvatarUrl(currentAvatarPath)}
          label="Escolha uma imagem"
          disabled={uploadMutation.isPending || deleteMutation.isPending}
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cancelar
          </button>

          {currentAvatarPath && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              {deleteMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Remover'
              )}
            </button>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
