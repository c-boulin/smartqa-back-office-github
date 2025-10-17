import React from 'react';
import { FolderPlus } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import DroppableFolderTree from '../FolderTree/DroppableFolderTree';
import { Folder } from '../../services/foldersApi';

interface TestCasesFolderSidebarProps {
  folderTree: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  foldersLoading: boolean;
  onCreateFolder: () => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onTestCaseDropped: (testCaseId: string, targetFolderId: string) => void;
}

const TestCasesFolderSidebar: React.FC<TestCasesFolderSidebarProps> = ({
  folderTree,
  selectedFolderId,
  onSelectFolder,
  foldersLoading,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onTestCaseDropped
}) => {
  return (
    <div className="w-80 flex-shrink-0">
      <Card className="h-fit">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">Folders</h3>
            <Button
              size="sm"
              variant="secondary"
              icon={FolderPlus}
              onClick={onCreateFolder}
              className="p-2"
              title="Create new folder"
            >
            </Button>
          </div>
          <p className="text-sm text-gray-400">Select a folder to view test cases</p>
        </div>
        <div className="p-4 overflow-hidden">
          <DroppableFolderTree
            folders={folderTree}
            selectedFolderId={selectedFolderId}
            onSelectFolder={(folderId) => {
              if (folderId === null) {
                // Deselect folder - show all test cases
                console.log('🚫 Deselecting folder, showing all test cases');
                onSelectFolder(null);
              } else {
                // Select folder - filter test cases
                console.log('✅ Selecting folder:', folderId);
                onSelectFolder(folderId);
              }
            }}
            loading={foldersLoading}
            onEditFolder={onEditFolder}
            onDeleteFolder={onDeleteFolder}
            onTestCaseDropped={onTestCaseDropped}
          />
        </div>
      </Card>
    </div>
  );
};

export default TestCasesFolderSidebar;