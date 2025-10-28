import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { TestRun } from '../../services/testRunsApi';

interface CloseTestRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  testRun: TestRun | null;
  isSubmitting: boolean;
}

const CloseTestRunModal: React.FC<CloseTestRunModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  testRun,
  isSubmitting
}) => {
  if (!testRun) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Close Test Run"
      size="md"
    >
      <div className="space-y-6">
        {/* Warning Icon and Message */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-orange-500/20 border border-orange-500/50 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Close Test Run: "{testRun.name}"
            </h3>
            <p className="text-gray-300 mb-4">
              You are about to close this test run. Once closed, it cannot be reopened.
            </p>
          </div>
        </div>

        {/* Confirmation Question */}
        <div className="text-center">
          <p className="text-white font-medium">
            Are you sure you want to close this test run?
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant="warning"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Closing...' : 'Close Test Run'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CloseTestRunModal;