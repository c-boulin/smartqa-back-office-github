import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'custom';
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md' 
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw] w-[90vw] max-h-[95vh]',
    custom: 'max-w-[75vw] w-[75vw] max-h-[95vh]', // Nouvelle taille personnalisée à 75%
    small: 'w-[400px] h-[500px] max-w-[400px] max-h-[500px]' // Square-ish modal for projects
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-4 text-center">
        <div className="fixed inset-0 transition-opacity bg-black/75 backdrop-blur-sm" onClick={onClose}></div>
        
        <div className={`inline-block ${sizeClasses[size]} p-6 overflow-hidden text-left align-middle transition-all transform bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl rounded-xl border border-purple-500/30 my-4`}>
          {title && (
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            </div>
          )}
          
          <div className="text-gray-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;