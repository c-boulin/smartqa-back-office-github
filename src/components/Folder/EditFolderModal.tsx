import React, { useState, useEffect } from 'react';
import { Loader, Save } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { Folder } from '../../services/foldersApi';

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  folder: Folder | null;
}

const EditFolderModal: React.FC<EditFolderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  folder
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Populate form when folder changes or modal opens
  useEffect(() => {
    if (isOpen && folder) {
      setFormData({
        name: folder.name,
        description: folder.description || ''
      });
    } else if (isOpen && !folder) {
      setFormData({
        name: '',
        description: ''
      });
    }
  }, [isOpen, folder]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Edit Folder"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            required
            disabled={isSubmitting}
            placeholder="Enter folder name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            disabled={isSubmitting}
            placeholder="Enter folder description"
          />
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
            type="submit" 
            disabled={isSubmitting}
            icon={Save}
          >
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Folder'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditFolderModal;