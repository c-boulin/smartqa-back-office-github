import React from 'react';
import { Folder, ChevronRight, ChevronDown, FolderOpen, Loader, MoreHorizontal, SquarePen, Trash2 } from 'lucide-react';
import { Folder as FolderType } from '../../services/foldersApi';
import Tooltip from '../UI/Tooltip';

interface FolderNodeProps {
  folder: FolderType;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  level: number;
  expandedFolders: Set<string>;
  onToggleExpanded: (folderId: string) => void;
  onEditFolder?: (folder: FolderType) => void;
  onDeleteFolder?: (folder: FolderType) => void;
}

const FolderNode: React.FC<FolderNodeProps> = React.memo(({
  folder,
  selectedFolderId,
  onSelectFolder,
  level,
  expandedFolders,
  onToggleExpanded,
  onEditFolder,
  onDeleteFolder
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const isSelected = selectedFolderId === folder.id;
  const isExpanded = expandedFolders.has(folder.id);
  const hasChildren = folder.children.length > 0;

  const handleToggle = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      console.log('🔄 Toggling folder expansion:', folder.name);
      onToggleExpanded(folder.id);
    }
  }, [hasChildren, folder.id, folder.name, onToggleExpanded]);

  const handleSelect = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('👆 Folder clicked:', folder.name, 'ID:', folder.id, 'Test cases:', folder.testCasesCount);
    onSelectFolder(folder.id);
  }, [folder.id, folder.name, folder.testCasesCount, onSelectFolder]);

  // Utiliser directement le compteur calculé du dossier
  const testCasesCount = folder.testCasesCount || 0;

  const handleThreeDotsClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  }, [isDropdownOpen]);

  const handleEdit = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownOpen(false);
    if (onEditFolder) {
      onEditFolder(folder);
    }
  }, [folder, onEditFolder]);

  const handleDelete = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownOpen(false);
    if (onDeleteFolder) {
      onDeleteFolder(folder);
    }
  }, [folder, onDeleteFolder]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (isDropdownOpen) {
      const handleClickOutside = () => setIsDropdownOpen(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isDropdownOpen]);

  return (
    <div className="relative">
      <div className="flex items-center min-w-0 gap-1">
        <Tooltip content={folder.description ? `${folder.name}\n─────\n${folder.description}` : folder.name}>
          <div
            className={`flex items-center py-2 px-3 cursor-pointer transition-colors rounded-lg flex-1 min-w-0 max-w-[calc(100%-32px)] ${
              isSelected
                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-300 hover:text-cyan-400 hover:bg-slate-800/50'
            }`}
            style={{ paddingLeft: `${12 + level * 16}px` }}
            onClick={handleSelect}
          >
          {hasChildren ? (
            <button
              onClick={handleToggle}
              className="flex items-center justify-center w-4 h-4 mr-2 text-gray-400 hover:text-cyan-400 transition-colors"
              type="button"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4 mr-2" />
          )}
          
          <div className="flex items-center flex-1 min-w-0 overflow-hidden">
            {hasChildren ? (
              <FolderOpen className="w-4 h-4 mr-2 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 mr-2 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium max-w-[140px]">{folder.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                  testCasesCount > 0
                    ? 'text-cyan-400 bg-cyan-500/20 border border-cyan-500/30'
                    : 'text-gray-500 bg-slate-700/50 border border-slate-600'
                }`}>
                  {testCasesCount}
                </span>
              </div>
              {/* Show description only for the selected folder */}
              {isSelected && folder.description && (
                <div className="text-xs text-gray-400 mt-1 truncate overflow-hidden">
                  {folder.description}
                </div>
              )}
            </div>
          </div>
          </div>
        </Tooltip>

        {/* Three-dots button - outside the folder box */}
        {(onEditFolder || onDeleteFolder) && (
          <div className="relative flex-shrink-0">
            <button
              onClick={handleThreeDotsClick}
              className="p-1 text-gray-400 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
              title="Folder actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {/* Dropdown menu */}
            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 min-w-[120px]">
                  {onEditFolder && (
                    <button
                      onClick={handleEdit}
                      className="w-full px-3 py-2 text-left text-gray-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors flex items-center text-sm"
                    >
                      <SquarePen className="w-3 h-3 mr-2" />
                      Edit
                    </button>
                  )}
                  {onDeleteFolder && (
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-left text-gray-300 hover:text-red-400 hover:bg-slate-700 transition-colors flex items-center text-sm"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              level={level + 1}
              expandedFolders={expandedFolders}
              onToggleExpanded={onToggleExpanded}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
});

FolderNode.displayName = 'FolderNode';

interface FolderTreeProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  loading: boolean;
  onEditFolder?: (folder: FolderType) => void;
  onDeleteFolder?: (folder: FolderType) => void;
}

const FolderTree: React.FC<FolderTreeProps> = React.memo(({
  folders,
  selectedFolderId,
  onSelectFolder,
  loading,
  onEditFolder,
  onDeleteFolder
}) => {
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());

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
    console.log('🎯 FolderTree: selecting folder', folderId);
    // If clicking on the already selected folder, deselect it (pass null)
    if (selectedFolderId === folderId) {
      console.log('🚫 FolderTree: deselecting folder', folderId);
      onSelectFolder(null);
    } else {
      console.log('✅ FolderTree: selecting folder', folderId);
      onSelectFolder(folderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedFolderId is derived from props
  }, [onSelectFolder]);

  // Auto-expand folders that contain the selected folder
  React.useEffect(() => {
    if (selectedFolderId) {
      setExpandedFolders(prev => {
        const newExpanded = new Set(prev);
        
        // Find the path to the selected folder and expand all parents
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

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="flex items-center justify-center text-gray-400 text-sm">
          <Loader className="w-4 h-4 mr-2 animate-spin" />
          Loading folders...
        </div>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-400 text-sm">No folders found</div>
      </div>
    );
  }

  return (
    <div className="space-y-1 overflow-hidden">
      {folders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
          level={0}
          expandedFolders={expandedFolders}
          onToggleExpanded={handleToggleExpanded}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
        />
      ))}
    </div>
  );
});

FolderTree.displayName = 'FolderTree';

export default FolderTree;