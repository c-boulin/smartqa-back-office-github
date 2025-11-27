import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  details?: string;
  warningCount?: number;
  warningType?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details,
  warningCount,
  warningType,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'warning'
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getIcon = () => {
    return <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="text-slate-700 dark:text-gray-300 mb-6">{message}</p>
          
          {/* Warning count display */}
          {warningCount !== undefined && warningType && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">Warning</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                This folder contains <strong className="text-red-800 dark:text-red-200">{warningCount} {warningType}{warningCount !== 1 ? 's' : ''}</strong> that will also be deleted.
              </p>
              {details && (
                <p className="text-xs text-red-600 dark:text-red-300/80 mt-2">
                  {details}
                </p>
              )}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose}>
              {cancelText}
            </Button>
            <Button 
              variant={variant === 'danger' ? 'danger' : 'warning'} 
              onClick={handleConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;