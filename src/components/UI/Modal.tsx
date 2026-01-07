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
    md: 'w-[512px] max-w-[512px]',
    lg: 'max-w-2xl',
    xl: 'w-[900px] max-w-[900px]',
    full: 'max-w-[90vw] w-[90vw]',
    custom: 'max-w-[75vw] w-[75vw]',
    small: 'w-[450px] max-w-[450px]'
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-6 text-center">
        <div className="fixed inset-0 transition-opacity bg-black/60 dark:bg-black/75 backdrop-blur-sm" onClick={onClose}></div>

        <div className={`inline-block ${sizeClasses[size]} max-h-[90vh] flex flex-col p-6 text-left align-middle transition-all transform bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-2xl rounded-xl border border-slate-300 dark:border-purple-500/30 my-4`}>
          {title && (
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            </div>
          )}

          <div className="text-slate-700 dark:text-gray-300 overflow-y-auto flex-1 px-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;