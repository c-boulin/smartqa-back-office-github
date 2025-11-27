import React, { useState, useEffect } from 'react';
import { Copy, Loader, FolderPlus } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import ProjectSelector from '../UI/ProjectSelector';
import { Project, TestCase } from '../../types';
import { foldersApiService, Folder } from '../../services/foldersApi';
import { testCasesApiService } from '../../services/testCasesApi';
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
        const testCasesResponse = await testCasesApiService.getTestCases(1, 10000, selectedProjectId);

        // Transform test cases to get folder data
        const transformedTestCases = testCasesResponse.data.map(apiTestCase =>
          testCasesApiService.transformApiTestCase(apiTestCase, testCasesResponse.included)
        );

        // Extract folders from included data
        const extractedFolders: Folder[] = [];
        if (testCasesResponse.included && Array.isArray(testCasesResponse.included)) {
          const folderCountMap = new Map<string, number>();

          // Count test cases per folder
          transformedTestCases.forEach(testCase => {
            if (testCase.folderId) {
              folderCountMap.set(testCase.folderId, (folderCountMap.get(testCase.folderId) || 0) + 1);
            }
          });

          // Filter and transform folder data from included array
          testCasesResponse.included
            .filter((item: unknown) => {
              const itemData = item as Record<string, unknown>;
              return itemData.type === 'Folder';
            })
            .forEach((folder: unknown) => {
              const folderData = folder as Record<string, unknown>;
              const folderIdPath = String(folderData.id || '');
              const folderId = folderIdPath.split('/').pop() || '';
              const folderAttributes = folderData.attributes as Record<string, unknown> || {};
              const folderRelationships = folderData.relationships as Record<string, unknown> || {};

              // Extract parent folder ID from relationships
              let parentFolderId: string | null = null;
              if (folderRelationships.parent) {
                const parentData = folderRelationships.parent as Record<string, unknown>;
                const parentDataArray = parentData.data as Record<string, unknown> | Array<unknown>;
                if (parentDataArray && !Array.isArray(parentDataArray)) {
                  const parentId = String(parentDataArray.id || '');
                  parentFolderId = parentId.split('/').pop() || null;
                }
              }

              extractedFolders.push({
                id: folderId,
                name: String(folderAttributes.name || `Folder ${folderId}`),
                description: String(folderAttributes.description || ''),
                parentId: parentFolderId || undefined,
                projectId: selectedProjectId,
                children: [],
                testCasesCount: 0,
                directTestCasesCount: folderCountMap.get(folderId) || 0,
                createdAt: new Date(String(folderAttributes.createdAt || '')),
                updatedAt: new Date(String(folderAttributes.updatedAt || ''))
              });
            });
        }

        const tree = foldersApiService.buildFolderTree(extractedFolders);

        setFolders(extractedFolders);
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
      const testCasesResponse = await testCasesApiService.getTestCases(1, 10000, selectedProjectId);

      // Transform test cases
      const transformedTestCases = testCasesResponse.data.map(apiTestCase =>
        testCasesApiService.transformApiTestCase(apiTestCase, testCasesResponse.included)
      );

      // Count test cases per folder
      const folderCountMap = new Map<string, number>();
      transformedTestCases.forEach(testCase => {
        if (testCase.folderId) {
          folderCountMap.set(testCase.folderId, (folderCountMap.get(testCase.folderId) || 0) + 1);
        }
      });

      // Extract folders from test cases included data
      const extractedFolders: Folder[] = [];
      if (testCasesResponse.included && Array.isArray(testCasesResponse.included)) {
        testCasesResponse.included
          .filter((item: unknown) => {
            const itemData = item as Record<string, unknown>;
            return itemData.type === 'Folder';
          })
          .forEach((folder: unknown) => {
            const folderData = folder as Record<string, unknown>;
            const folderIdPath = String(folderData.id || '');
            const folderId = folderIdPath.split('/').pop() || '';
            const folderAttributes = folderData.attributes as Record<string, unknown> || {};
            const folderRelationships = folderData.relationships as Record<string, unknown> || {};

            let parentFolderId: string | null = null;
            if (folderRelationships.parent) {
              const parentData = folderRelationships.parent as Record<string, unknown>;
              const parentDataArray = parentData.data as Record<string, unknown> | Array<unknown>;
              if (parentDataArray && !Array.isArray(parentDataArray)) {
                const parentId = String(parentDataArray.id || '');
                parentFolderId = parentId.split('/').pop() || null;
              }
            }

            extractedFolders.push({
              id: folderId,
              name: String(folderAttributes.name || `Folder ${folderId}`),
              parentFolderId: parentFolderId,
              projectId: selectedProjectId,
              testCasesCount: 0,
              directTestCasesCount: folderCountMap.get(folderId) || 0,
              children: []
            });
          });
      }

      const tree = foldersApiService.buildFolderTree(extractedFolders);
      setFolders(extractedFolders);
      setFolderTree(tree);
    } catch (error) {
      console.error('Failed to refresh folders:', error);
    } finally {
      setFoldersLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!testCase || !selectedProjectId || !selectedFolderId) {
      return;
    }

    try {
      setIsSubmitting(true);
      await withLoading(
        onDuplicate(testCase, selectedProjectId, selectedFolderId),
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
              Target Folder <span className="text-red-400">*</span>
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
              {selectedFolderId && selectedFolder && (
                <div className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-3 mb-3">
                  <p className="text-sm text-slate-600 dark:text-gray-300">
                    Selected: <span className="text-slate-900 dark:text-white font-medium">{selectedFolder.name}</span>
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
                  No folders available in this project. Please create a folder first.
                </div>
              )}
            </>
          )}
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">
            A folder must be selected to duplicate the test case.
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
            disabled={isSubmitting || !selectedProjectId || !selectedFolderId}
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
        message={`Are you sure you want to delete "${folderToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </Modal>
  );
};

export default DuplicateTestCaseModal;
