import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import Button from './Button';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

export default function ImageUpload({ currentImageUrl, onUpload, onRemove }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Apenas imagens JPG, PNG ou WEBP são permitidas.');
      return;
    }

    try {
      setIsCompressing(true);
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      
      const previewUrl = URL.createObjectURL(compressedFile);
      setPreview(previewUrl);
      onUpload(compressedFile);
    } catch (error) {
      console.error('Erro ao comprimir imagem:', error);
      alert('Erro ao processar a imagem.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove();
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Imagem do Produto
      </label>
      
      <div className="flex items-center gap-4">
        <div 
          className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          onClick={() => fileInputRef.current?.click()}
        >
          {isCompressing ? (
            <span className="text-sm text-gray-500">Comprimindo...</span>
          ) : preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm text-gray-500 text-center px-2">Clique ou arraste</span>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
          />
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Trocar
          </Button>
          {(preview || currentImageUrl) && (
            <Button type="button" variant="danger" onClick={handleRemove}>
              Remover
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">Formatos aceitos: JPG, PNG, WEBP (Comprimido a ~500KB no frontend).</p>
    </div>
  );
}
