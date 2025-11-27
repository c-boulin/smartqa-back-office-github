import React from 'react';
import { Download, FileText, Table } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadPDF: () => void;
  onDownloadCSV: () => void;
  reportTitle: string;
}

const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  onDownloadPDF,
  onDownloadCSV,
  reportTitle
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Download Report"
      size="sm"
    >
      <div className="space-y-6">
        {/* Report Info */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Choose Download Format</h3>
          <p className="text-sm text-slate-600 dark:text-gray-400">Select the format for downloading "{reportTitle}"</p>
        </div>

        {/* Download Options */}
        <div className="space-y-3">
          <button
            onClick={() => {
              onDownloadPDF();
              onClose();
            }}
            className="w-full p-4 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg hover:from-red-500/30 hover:to-red-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                <FileText className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-left">
                <h4 className="text-slate-900 dark:text-white font-medium">Download as PDF</h4>
                <p className="text-sm text-slate-600 dark:text-gray-400">Formatted document with charts and tables</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onDownloadCSV();
              onClose();
            }}
            className="w-full p-4 bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg hover:from-green-500/30 hover:to-green-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                <Table className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-left">
                <h4 className="text-slate-900 dark:text-white font-medium">Download as CSV</h4>
                <p className="text-sm text-slate-600 dark:text-gray-400">Raw data for spreadsheet analysis</p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DownloadModal;