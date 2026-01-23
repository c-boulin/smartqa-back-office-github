import React, { useState, useEffect } from 'react';
import { Copy, Loader, FolderPlus } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import ProjectSelector from '../UI/ProjectSelector';
import { Project, TestCase } from '../../types';
import { foldersApiService, Folder } from '../../services/foldersApi';
import FolderTree from '../FolderTree/FolderTree';
import CreateFolderModal from '../Folder/CreateFolderModal';
import EditFolderModal from '../Folder/EditFolderModal';
import ConfirmDialog from '../UI/ConfirmDialog';
import toast from 'react-hot-toast';
import { useLoading } from '../../context/LoadingContext';

interface DuplicateTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDuplicate: (testCase: TestCase, targetProjectId: string, targetFolderId: string) => Promise<void>;
  testCase: TestCase | null;
  projects: Project[];
  currentProjectId: string;
}

const DuplicateTestCaseModal: React.FC<DuplicateTestCaseModalProps> = ({
  isOpen,
  onClose,
  onDuplicate,
  testCase,
  projects: _projects,
  currentProjectId
}) => {
  const { withLoading } = useLoading();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProjectId);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderTree, setFolderTree] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isFolderSubmitting, setIsFolderSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && testCase) {
      setSelectedProjectId(currentProjectId);
      setSelectedFolderId(testCase.folderId || '');
    }
  }, [isOpen, testCase, currentProjectId]);

  useEffect(() => {
    const loadFolders = async () => {
      if (!selectedProjectId) {
        setFolders([]);
        setFolderTree([]);
        return;
      }

      try {
        setFoldersLoading(true);
        const foldersResponse = await foldersApiService.getFolders(selectedProjectId);

        const transformedFolders: Folder[] = foldersResponse.data.map(apiFolder =>
          foldersApiService.transformApiFolder(apiFolder, selectedProjectId)
        );

        const tree = foldersApiService.buildFolderTree(transformedFolders);

        setFolders(transformedFolders);
        setFolderTree(tree);
      } catch (error) {
        console.error('Failed to load folders:', error);
        setFolders([]);
        setFolderTree([]);
      } finally {
        setFoldersLoading(false);
      }
    };

    if (isOpen) {
      loadFolders();
    }
  }, [selectedProjectId, isOpen]);

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedFolderId('');
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId || '');
  };

  const refreshFolders = async () => {
    try {
      setFoldersLoading(true);
      const foldersResponse = await foldersApiService.getFolders(selectedProjectId);

      const transformedFolders: Folder[] = foldersResponse.data.map(apiFolder =>
        foldersApiService.transformApiFolder(apiFolder, selectedProjectId)
      );

      const tree = foldersApiService.buildFolderTree(transformedFolders);
      setFolders(transformedFolders);
      setFolderTree(tree);
    } catch (error) {
      console.error('Failed to refresh folders:', error);
    } finally {
      setFoldersLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!testCase || !selectedProjectId) {
      return;
    }

    try {
      setIsSubmitting(true);
      await withLoading(
        onDuplicate(testCase, selectedProjectId, selectedFolderId || ''),
        'Duplicating test case...'
      );
      onClose();
    } catch (error) {
      console.error('Error duplicating test case:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFolder = async (folderData: { name: string; description: string; parentId?: string; childrenIds: string[] }) => {
    try {
      setIsFolderSubmitting(true);
      await foldersApiService.createFolder({
        name: folderData.name,
        description: folderData.description,
        parentId: folderData.parentId || null,
        projectId: selectedProjectId,
        childrenIds: folderData.childrenIds,
        userId: '1'
      });

      toast.success('Folder created successfully');
      setIsCreateFolderModalOpen(false);
      await refreshFolders();
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Failed to create folder');
    } finally {
      setIsFolderSubmitting(false);
    }
  };

  const handleEditFolder = (folder: Folder) => {
    setFolderToEdit(folder);
    setIsEditFolderModalOpen(true);
  };

  const handleUpdateFolder = async (folderData: { name: string; description: string; parentId?: string; childrenIds: string[] }) => {
    if (!folderToEdit) return;

    try {
      setIsFolderSubmitting(true);
      await foldersApiService.updateFolder(folderToEdit.id, {
        name: folderData.name,
        description: folderData.description,
        projectId: selectedProjectId,
        parentId: folderData.parentId || null,
        childrenIds: folderData.childrenIds,
        testCaseIds: [],
        creatorId: '1',
        editorId: '1'
      });

      toast.success('Folder updated successfully');
      setIsEditFolderModalOpen(false);
      setFolderToEdit(null);
      await refreshFolders();
    } catch (error) {
      console.error('Failed to update folder:', error);
      toast.error('Failed to update folder');
    } finally {
      setIsFolderSubmitting(false);
    }
  };

  const handleDeleteFolder = (folder: Folder) => {
    setFolderToDelete(folder);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!folderToDelete) return;

    try {
      await foldersApiService.deleteFolder(folderToDelete.id);

      toast.success('Folder deleted successfully');
      setIsDeleteDialogOpen(false);
      setFolderToDelete(null);

      if (selectedFolderId === folderToDelete.id) {
        setSelectedFolderId('');
      }

      await refreshFolders();
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Duplicate Test Case" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Test Case
          </label>
          <div className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-3">
            <p className="text-slate-900 dark:text-white font-medium">{testCase?.title}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">TC{testCase?.id}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Target Project *
          </label>
          <ProjectSelector
            selectedProjectId={selectedProjectId}
            onProjectChange={handleProjectChange}
            placeholder="Select target project"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-600 dark:text-gray-300">
              Target Folder
            </label>
            <button
              type="button"
              onClick={() => setIsCreateFolderModalOpen(true)}
              disabled={!selectedProjectId}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 disabled:text-slate-500 dark:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              New Folder
            </button>
          </div>
          {foldersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <>
              {selectedFolderId && selectedFolder ? (
                <div className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-3 mb-3 flex items-center justify-between">
                  <p className="text-sm text-slate-600 dark:text-gray-300">
                    Selected: <span className="text-slate-900 dark:text-white font-medium">{selectedFolder.name}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId('')}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-3 mb-3">
                  <p className="text-sm text-slate-600 dark:text-gray-300">
                    Selected: <span className="text-slate-900 dark:text-white font-medium">Project Root</span>
                  </p>
                </div>
              )}
              {folderTree.length > 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <FolderTree
                    folders={folderTree}
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={handleFolderSelect}
                    loading={false}
                    onEditFolder={handleEditFolder}
                    onDeleteFolder={handleDeleteFolder}
                  />
                </div>
              ) : (
                <div className="text-center py-4 text-slate-500 dark:text-gray-400 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  No folders available in this project.
                </div>
              )}
            </>
          )}
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">
            Select a folder or leave unselected to place at project root.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !selectedProjectId}
            icon={isSubmitting ? Loader : Copy}
          >
            {isSubmitting ? 'Duplicating...' : 'Duplicate Test Case'}
          </Button>
        </div>
      </form>

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onSubmit={handleCreateFolder}
        isSubmitting={isFolderSubmitting}
        availableFolders={folderTree}
      />

      <EditFolderModal
        isOpen={isEditFolderModalOpen}
        onClose={() => {
          setIsEditFolderModalOpen(false);
          setFolderToEdit(null);
        }}
        onSubmit={handleUpdateFolder}
        isSubmitting={isFolderSubmitting}
        folder={folderToEdit}
        availableFolders={folderTree}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setFolderToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Folder"
        message={`Are you sure you want to delete the folder "${folderToDelete?.name}"? Test cases in this folder will not be deleted and will remain in the project.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </Modal>
  );
};

export default DuplicateTestCaseModal;
