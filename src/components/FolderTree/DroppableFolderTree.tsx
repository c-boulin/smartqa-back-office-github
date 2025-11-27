import React, { useState } from 'react';
import { Loader } from 'lucide-react';
import DroppableFolderNode from './DroppableFolderNode';
import { Folder as FolderType } from '../../services/foldersApi';

interface DroppableFolderTreeProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  loading: boolean;
  onEditFolder?: (folder: FolderType) => void;
  onDeleteFolder?: (folder: FolderType) => void;
  onTestCaseDropped: (testCaseId: string, targetFolderId: string) => void;
}

const DroppableFolderTree: React.FC<DroppableFolderTreeProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  loading,
  onEditFolder,
  onDeleteFolder,
  onTestCaseDropped
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isDragInProgress, setIsDragInProgress] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const handleToggleExpanded = React.useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId);
      } else {
        newExpanded.add(folderId);
      }
      return newExpanded;
    });
  }, []);

  const handleSelectFolder = React.useCallback((folderId: string) => {

    if (selectedFolderId === folderId) {

      onSelectFolder(null);
    } else {

      onSelectFolder(folderId);
    }
  }, [selectedFolderId, onSelectFolder]);

  // Auto-expand folders that contain the selected folder
  React.useEffect(() => {
    if (selectedFolderId) {
      setExpandedFolders(prev => {
        const newExpanded = new Set(prev);
        
        const findAndExpandParents = (folderList: FolderType[], targetId: string): boolean => {
          for (const folder of folderList) {
            if (folder.id === targetId) {
              return true;
            }
            
            if (folder.children.length > 0) {
              const found = findAndExpandParents(folder.children, targetId);
              if (found) {
                newExpanded.add(folder.id);
                return true;
              }
            }
          }
          return false;
        };
        
        findAndExpandParents(folders, selectedFolderId);
        return newExpanded;
      });
    }
  }, [selectedFolderId, folders]);

  // Listen for drag events on the document to track drag state
  React.useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      // Check if it's a test case being dragged
      if (e.dataTransfer?.types.includes('application/json')) {
        setIsDragInProgress(true);

      }
    };

    const handleDragEnd = () => {
      setIsDragInProgress(false);
      setDragOverFolderId(null);

    };

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="flex items-center justify-center text-slate-500 dark:text-gray-400 text-sm">
          <Loader className="w-4 h-4 mr-2 animate-spin" />
          Loading folders...
        </div>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-slate-500 dark:text-gray-400 text-sm">No folders found</div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {isDragInProgress && (
        <div className="text-xs text-cyan-700 dark:text-cyan-400 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg mb-2">
          💡 Drop test case on any folder to move it
        </div>
      )}

      {folders.map((folder) => (
        <DroppableFolderNode
          key={folder.id}
          folder={folder}
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
          level={0}
          expandedFolders={expandedFolders}
          onToggleExpanded={handleToggleExpanded}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
          onTestCaseDropped={onTestCaseDropped}
          isDragInProgress={isDragInProgress}
          dragOverFolderId={dragOverFolderId}
          onDragOverFolder={setDragOverFolderId}
        />
      ))}
    </div>
  );
};

export default DroppableFolderTree;