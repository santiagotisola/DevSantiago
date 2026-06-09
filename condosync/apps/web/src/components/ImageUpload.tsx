import React, { useCallback, useId, useState } from 'react';
import { Upload, X, Loader } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (file: File | null) => void;
  currentImage?: string;
  label?: string;
  maxSize?: number; // MB
  disabled?: boolean;
}

export function ImageUpload({
  onImageSelected,
  currentImage,
  label = 'Upload de Imagem',
  maxSize = 5,
  disabled = false,
}: ImageUploadProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const maxSizeBytes = maxSize * 1024 * 1024;

  const validateFile = useCallback((file: File): boolean => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedMimes.includes(file.type)) {
      setError('Apenas imagens JPG, PNG e WebP são permitidas');
      return false;
    }

    if (file.size > maxSizeBytes) {
      setError(`Imagem deve ter no máximo ${maxSize}MB`);
      return false;
    }

    return true;
  }, [maxSize, maxSizeBytes]);

  const handleFile = useCallback((file: File) => {
    setError('');

    if (!validateFile(file)) {
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    onImageSelected(file);
  }, [validateFile, onImageSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError('');
    onImageSelected(null);
  };

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}

      {preview ? (
        // Preview state
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-auto max-w-xs rounded-lg border border-gray-300 object-cover"
          />
          <button
            onClick={handleRemoveImage}
            disabled={disabled}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
            title="Remover imagem"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        // Upload area
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input
            type="file"
            id={inputId}
            onChange={handleFileSelect}
            disabled={disabled}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          <label
            htmlFor={inputId}
            className="flex flex-col items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <Loader size={32} className="text-gray-400 animate-spin" />
            ) : (
              <Upload size={32} className="text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-700">
                Arraste uma imagem ou clique para selecionar
              </p>
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG ou WebP até {maxSize}MB
              </p>
            </div>
          </label>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
