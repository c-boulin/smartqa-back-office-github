import React, { useState } from 'react';
import { Share, Mail, Send, Loader, FileText, Download } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import MultiSelectDropdown from '../UI/MultiSelectDropdown';
import { useUsers } from '../../context/UsersContext';

type ReportFormat = 'pdf' | 'csv';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendEmail: (emails: string[], message: string, format: ReportFormat) => Promise<void>;
  reportTitle: string;
  reportType: string;
  projectName: string;
  isSubmitting?: boolean;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  onSendEmail,
  reportTitle,
  isSubmitting = false
}) => {
  const { users } = useUsers();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('pdf');
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedUserIds.length === 0) {
      setEmailError('Please select at least one recipient');
      return;
    }

    try {
      // Get emails from selected user IDs
      const selectedEmails = selectedUserIds
        .map(userId => users.find(u => u.id === userId)?.email)
        .filter((email): email is string => email !== undefined);

      await onSendEmail(selectedEmails, message, selectedFormat);
      // Reset form on success
      setSelectedUserIds([]);
      setMessage('');
      setSelectedFormat('pdf');
      setEmailError(null);
      onClose();
    } catch {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    setSelectedUserIds([]);
    setMessage('');
    setSelectedFormat('pdf');
    setEmailError(null);
    onClose();
  };

  const handleUserSelectionChange = (ids: string[]) => {
    setSelectedUserIds(ids);
    if (emailError) {
      setEmailError(null);
    }
  };

  // Transform users to dropdown options
  const userOptions = users.map(user => ({
    id: user.id,
    label: user.name
  }));

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Share Report"
      size="md"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Share className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Share Report via Email</h3>
          <p className="text-sm text-gray-400">Send "{reportTitle}" to a colleague</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipients Selection */}
          <div>
            <MultiSelectDropdown
              label="Recipients *"
              options={userOptions}
              selectedIds={selectedUserIds}
              onChange={handleUserSelectionChange}
              placeholder="Select recipients"
              searchPlaceholder="Search users by name..."
              disabled={isSubmitting}
            />
            {emailError && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {emailError}
                </p>
              </div>
            )}
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Report Format *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedFormat('pdf')}
                disabled={isSubmitting}
                className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedFormat === 'pdf'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                    : 'border-slate-600 bg-slate-700 text-gray-300 hover:border-slate-500'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <FileText className="w-5 h-5 mr-2" />
                <span className="font-medium">PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                disabled={isSubmitting}
                className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedFormat === 'csv'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                    : 'border-slate-600 bg-slate-700 text-gray-300 hover:border-slate-500'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Download className="w-5 h-5 mr-2" />
                <span className="font-medium">CSV</span>
              </button>
            </div>
          </div>

          {/* Optional Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-gray-400 resize-none"
              placeholder="Add a personal message (optional)"
              disabled={isSubmitting}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <Button 
              variant="secondary" 
              onClick={handleClose} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || selectedUserIds.length === 0}
              icon={Send}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Email'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ShareModal;