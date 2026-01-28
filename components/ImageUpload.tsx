
import React, { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageUploadProps {
  value?: string;
  onChange: (base64: string) => void;
  label: string;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, label, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = (file: File) => {
    if (!file) return;
    setIsProcessing(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Create canvas to resize image (prevent localStorage overflow)
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Limit width for performance
        const scaleSize = MAX_WIDTH / img.width;
        
        canvas.width = scaleSize < 1 ? MAX_WIDTH : img.width;
        canvas.height = scaleSize < 1 ? img.height * scaleSize : img.height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Compress to JPEG 70% quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        onChange(compressedBase64);
        setIsProcessing(false);
      };
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-black uppercase text-slate-500 ml-1">{label}</label>
      
      <div 
        className={`relative group w-full min-h-[160px] rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-500/10' 
            : 'border-slate-800 bg-slate-950 hover:border-slate-600 hover:bg-slate-900'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />

        <AnimatePresence mode="wait">
          {value ? (
            <motion.div 
              key="preview"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="relative w-full h-full min-h-[160px] bg-slate-900 flex items-center justify-center"
            >
              <img src={value} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center gap-4 backdrop-blur-sm">
                 <p className="text-white text-xs font-bold uppercase tracking-widest">Alterar Imagem</p>
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation(); // Stop input click
                  onChange('');
                }}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg z-30 hover:bg-red-600 transition-colors shadow-lg"
                title="Remover imagem"
              >
                <X size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="placeholder"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none"
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <span className="text-xs font-bold uppercase">Otimizando...</span>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-slate-800 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-6 h-6 text-indigo-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-400">Clique ou arraste aqui</p>
                  <p className="text-[10px] uppercase tracking-wide opacity-50 mt-1">JPG, PNG (Max 800px)</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
