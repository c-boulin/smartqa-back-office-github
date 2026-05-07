import React from 'react';
import { Plus, FolderOpen, MoreHorizontal } from 'lucide-react';
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
  onClearIndividualFilter?: (filterType: string) => void;
  unfolderedCount?: number;
}

const TestCasesFolderSidebar: React.FC<TestCasesFolderSidebarProps> = ({
  folderTree,
  selectedFolderId,
  onSelectFolder,
  foldersLoading,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onTestCaseDropped,
  unfolderedCount = 0,
}) => {
  const isUnfolderedSelected = selectedFolderId === '__none__';

  const handleUnfolderedClick = () => {
    onSelectFolder(isUnfolderedSelected ? null : '__none__');
  };

  React.useEffect(() => {
    if (isUnfolderedSelected && unfolderedCount === 0) {
      onSelectFolder(null);
    }
  }, [unfolderedCount, isUnfolderedSelected, onSelectFolder]);

  return (
    <div className="w-64 flex-shrink-0">
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl h-fit">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path d="M3 11h18" />
            </svg>
            <span className="text-sm font-bold text-slate-900 dark:text-white">Folders</span>
          </div>
          <button
            onClick={onCreateFolder}
            className="w-7 h-7 flex items-center justify-center text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Create new folder"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Folder list */}
        <div className="p-3 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-280px)]">
          {/* Unfoldered virtual entry — only shown when test cases exist without a folder */}
          {unfolderedCount > 0 && <div
            className="grid items-center gap-1 mb-0.5"
            style={{ gridTemplateColumns: 'minmax(0,1fr) auto 28px' }}
            data-mipqa="unfoldered-folder-btn"
          >
            <div
              onClick={handleUnfolderedClick}
              className={`flex items-center py-2 px-2 cursor-pointer transition-colors rounded-lg overflow-hidden ${
                isUnfolderedSelected
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="w-4 h-4 mr-2" />
              <FolderOpen className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-medium truncate">Unfolder</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium whitespace-nowrap ${
              unfolderedCount > 0
                ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/20 border border-cyan-500/30'
                : 'text-slate-500 dark:text-gray-500 bg-slate-200 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600'
            }`}>
              {unfolderedCount}
            </span>
            <div className="flex items-center justify-center">
              <button
                className="p-1 text-transparent cursor-default rounded"
                tabIndex={-1}
                aria-hidden="true"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>}

          <DroppableFolderTree
            folders={folderTree}
            selectedFolderId={isUnfolderedSelected ? null : selectedFolderId}
            onSelectFolder={(folderId) => onSelectFolder(folderId)}
            loading={foldersLoading}
            onEditFolder={onEditFolder}
            onDeleteFolder={onDeleteFolder}
            onTestCaseDropped={onTestCaseDropped}
            showTestCaseCount={true}
          />
        </div>
      </div>
    </div>
  );
};

export default TestCasesFolderSidebar;
