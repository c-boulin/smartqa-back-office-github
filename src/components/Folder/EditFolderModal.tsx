import React, { useState, useEffect } from 'react';
import { Loader, Save, X } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { Folder } from '../../services/foldersApi';

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    parentId?: string;
    childrenIds: string[];
  }) => Promise<void>;
  isSubmitting: boolean;
  folder: Folder | null;
  availableFolders: Folder[];
}

const EditFolderModal: React.FC<EditFolderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  folder,
  availableFolders
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
    childrenIds: [] as string[]
  });

  // Populate form when folder changes or modal opens
  useEffect(() => {
    if (isOpen && folder) {
      setFormData({
        name: folder.name,
        description: folder.description || '',
        parentId: folder.parentId || '',
        childrenIds: folder.children?.map(child => child.id) || []
      });
    } else if (isOpen && !folder) {
      setFormData({
        name: '',
        description: '',
        parentId: '',
        childrenIds: []
      });
    }
  }, [isOpen, folder]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleChildrenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);

    setFormData(prev => ({
      ...prev,
      childrenIds: selectedOptions
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      name: formData.name,
      description: formData.description,
      parentId: formData.parentId || undefined,
      childrenIds: formData.childrenIds
    };

    await onSubmit(submitData);
  };

  // Get available folders for parent selection (exclude current folder and its children)
  const getAvailableParentFolders = () => {
    if (!folder) return availableFolders;

    return availableFolders.filter(f =>
      f.id !== folder.id && !formData.childrenIds.includes(f.id)
    );
  };

  // Get available folders for children selection (exclude current folder and selected parent)
  const getAvailableChildrenFolders = () => {
    if (!folder) return [];

    if (!formData.parentId) {
      return availableFolders.filter(f => f.id !== folder.id);
    }

    const selectedParent = availableFolders.find(f => f.id === formData.parentId);
    if (!selectedParent) return [];

    return selectedParent.children || [];
  };

  // Flatten folder tree for dropdown display
  const flattenFolders = (folders: Folder[], level = 0): Array<{ folder: Folder; level: number }> => {
    const result: Array<{ folder: Folder; level: number }> = [];

    folders.forEach(folder => {
      result.push({ folder, level });
      if (folder.children.length > 0) {
        result.push(...flattenFolders(folder.children, level + 1));
      }
    });

    return result;
  };

  const availableParentFolders = getAvailableParentFolders();
  const availableChildrenFolders = getAvailableChildrenFolders();
  const flatParentFolders = flattenFolders(availableParentFolders);
  const flatChildrenFolders = availableChildrenFolders.map(folder => ({ folder, level: 0 }));

  const handleRemoveParent = () => {
    setFormData(prev => ({ ...prev, parentId: '' }));
  };

  const handleRemoveChild = (childId: string) => {
    setFormData(prev => ({
      ...prev,
      childrenIds: prev.childrenIds.filter(id => id !== childId)
    }));
  };

  const selectedParentFolder = formData.parentId
    ? flatParentFolders.find(({ folder: f }) => f.id === formData.parentId)?.folder
    : null;

  // Helper to find any folder by ID in the entire tree
  const findFolderById = (folders: Folder[], targetId: string): Folder | null => {
    for (const folder of folders) {
      if (folder.id === targetId) return folder;
      if (folder.children.length > 0) {
        const found = findFolderById(folder.children, targetId);
        if (found) return found;
      }
    }
    return null;
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
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            required
            disabled={isSubmitting}
            placeholder="Enter folder name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            disabled={isSubmitting}
            placeholder="Enter folder description"
          />
        </div>

        {/* Parent Folder */}
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Parent Folder
          </label>

          {selectedParentFolder && (
            <div className="mb-2">
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-sm text-cyan-700 dark:text-cyan-400">
                <span>📁 {selectedParentFolder.name}</span>
                <button
                  type="button"
                  onClick={handleRemoveParent}
                  className="text-cyan-400 hover:text-red-400 transition-colors"
                  title="Remove parent"
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <select
            value={formData.parentId}
            onChange={(e) => handleInputChange('parentId', e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            disabled={isSubmitting}
          >
            <option value="">No parent (root folder)</option>
            {flatParentFolders.map(({ folder, level }) => (
              <option key={folder.id} value={folder.id}>
                {'  '.repeat(level)}📁 {folder.name}
              </option>
            ))}
          </select>
          {availableParentFolders.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">No folders available as parent</p>
          )}
        </div>

        {/* Children Folders - Multi-select */}
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Children Folders
          </label>
          <select
            value={formData.childrenIds}
            onChange={handleChildrenChange}
            disabled={isSubmitting}
            multiple
            size={Math.min(6, flatChildrenFolders.length || 1)}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
          >
            {flatChildrenFolders.map(({ folder, level }) => (
              <option
                key={folder.id}
                value={folder.id}
                className={formData.childrenIds.includes(folder.id) ? 'bg-cyan-600' : ''}
              >
                {'  '.repeat(level)}📁 {folder.name}
              </option>
            ))}
          </select>
          {availableChildrenFolders.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">No folders available as children</p>
          )}
          <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
            Click on folders to select/deselect them as children. Hold Ctrl/Cmd for multiple selections.
          </p>
        </div>

        {/* Selected Children Display */}
        {formData.childrenIds.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
              Selected Children ({formData.childrenIds.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {formData.childrenIds.map(childId => {
                const folder = findFolderById(availableFolders, childId);
                return folder ? (
                  <div
                    key={childId}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-400"
                  >
                    <span>📁 {folder.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChild(childId)}
                      className="text-purple-400 hover:text-red-400 transition-colors"
                      title="Remove child"
                      disabled={isSubmitting}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

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