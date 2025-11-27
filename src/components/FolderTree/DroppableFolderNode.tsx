import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Folder, ChevronRight, ChevronDown, FolderOpen, SquarePen, Trash2, MoreHorizontal } from 'lucide-react';
import { Folder as FolderType } from '../../services/foldersApi';
import Tooltip from '../UI/Tooltip';

interface DroppableFolderNodeProps {
  folder: FolderType;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  level: number;
  expandedFolders: Set<string>;
  onToggleExpanded: (folderId: string) => void;
  onEditFolder?: (folder: FolderType) => void;
  onDeleteFolder?: (folder: FolderType) => void;
  onTestCaseDropped: (testCaseId: string, targetFolderId: string) => void;
  isDragInProgress: boolean;
  dragOverFolderId: string | null;
  onDragOverFolder: (folderId: string | null) => void;
}

const DroppableFolderNode: React.FC<DroppableFolderNodeProps> = ({
  folder,
  selectedFolderId,
  onSelectFolder,
  level,
  expandedFolders,
  onToggleExpanded,
  onEditFolder,
  onDeleteFolder,
  onTestCaseDropped,
  isDragInProgress,
  dragOverFolderId,
  onDragOverFolder
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; alignTop: boolean } | null>(null);
  const dropdownButtonRef = React.useRef<HTMLButtonElement>(null);
  const isSelected = selectedFolderId === folder.id;
  const isExpanded = expandedFolders.has(folder.id);
  const hasChildren = folder.children.length > 0;
  const isDragOver = dragOverFolderId === folder.id;

  const handleToggle = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {

      onToggleExpanded(folder.id);
    }
  }, [hasChildren, folder.id, onToggleExpanded]);

  const handleSelect = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    onSelectFolder(folder.id);
  }, [folder.id, onSelectFolder]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if the dragged item is a test case
    const dragData = e.dataTransfer.types.includes('application/json');
    if (dragData) {
      e.dataTransfer.dropEffect = 'move';
      onDragOverFolder(folder.id);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only hide drag over state if we're actually leaving this element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      onDragOverFolder(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOverFolder(null);

    try {
      const dragDataString = e.dataTransfer.getData('application/json');
      if (!dragDataString) {
        console.warn('No drag data found');
        return;
      }

      const dragData = JSON.parse(dragDataString);
      const { testCaseId, testCaseTitle: _testCaseTitle, currentFolderId } = dragData;

      // Don't allow dropping into the same folder
      if (currentFolderId === folder.id) {

        return;
      }

      // Call the drop handler
      onTestCaseDropped(testCaseId, folder.id);

    } catch (error) {
      console.error('Failed to parse drag data:', error);
    }
  };

  const testCasesCount = folder.testCasesCount || 0;

  const handleThreeDotsClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isDropdownOpen && dropdownButtonRef.current) {
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const dropdownHeight = 100;

      const alignTop = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setDropdownPosition({
        top: alignTop ? rect.top : rect.bottom,
        left: rect.right,
        alignTop
      });
    } else {
      setDropdownPosition(null);
    }

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
      const handleClickOutside = () => {
        setIsDropdownOpen(false);
        setDropdownPosition(null);
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isDropdownOpen]);

  return (
    <div className="relative">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_28px] gap-2 items-center" style={{ paddingLeft: `${level * 12}px` }}>
        <Tooltip content={folder.description ? `${folder.name}\n─────\n${folder.description}` : folder.name}>
          <div
            className={`flex items-center py-2 px-2 cursor-pointer transition-colors rounded-lg overflow-hidden ${
              isSelected
                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30'
                : isDragOver && isDragInProgress
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/50 border-dashed'
                : 'text-slate-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
            onClick={handleSelect}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
          {hasChildren ? (
            <button
              onClick={handleToggle}
              className="flex items-center justify-center w-4 h-4 mr-2 text-slate-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
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
              <span className="truncate text-sm font-medium min-w-0 block">{folder.name}</span>
              {isSelected && folder.description && (
                <div className="text-xs text-slate-600 dark:text-gray-400 mt-1 truncate overflow-hidden">
                  {folder.description}
                </div>
              )}
              {isDragOver && isDragInProgress && (
                <div className="text-xs text-green-400 mt-1 truncate overflow-hidden">
                  Drop test case here
                </div>
              )}
            </div>
          </div>
          </div>
        </Tooltip>

        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium whitespace-nowrap ${
          testCasesCount > 0
            ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/20 border border-cyan-500/30'
            : 'text-slate-500 dark:text-gray-500 bg-slate-200 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600'
        }`}>
          {testCasesCount}
        </span>

        {/* Three-dots button - fixed column */}
        {(onEditFolder || onDeleteFolder) ? (
          <div className="flex items-center justify-center">
            <button
              ref={dropdownButtonRef}
              onClick={handleThreeDotsClick}
              className="p-1 text-slate-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
              title="Folder actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Dropdown menu using portal */}
            {isDropdownOpen && dropdownPosition && createPortal(
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setDropdownPosition(null);
                  }}
                />
                <div
                  className="fixed bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xl z-50 min-w-[120px]"
                  style={{
                    top: dropdownPosition.alignTop ? 'auto' : `${dropdownPosition.top}px`,
                    bottom: dropdownPosition.alignTop ? `${window.innerHeight - dropdownPosition.top}px` : 'auto',
                    left: `${dropdownPosition.left - 120}px`,
                  }}
                >
                  {onEditFolder && (
                    <button
                      onClick={handleEdit}
                      className="w-full px-3 py-2 text-left text-slate-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center text-sm rounded-t-lg"
                    >
                      <SquarePen className="w-3 h-3 mr-2" />
                      Edit
                    </button>
                  )}
                  {onDeleteFolder && (
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-left text-slate-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center text-sm rounded-b-lg"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              </>,
              document.body
            )}
          </div>
        ) : (
          <div className="w-7" />
        )}
      </div>

      {hasChildren && isExpanded && (
        <>
          {folder.children.map((child) => (
            <DroppableFolderNode
              key={child.id}
              folder={child}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              level={level + 1}
              expandedFolders={expandedFolders}
              onToggleExpanded={onToggleExpanded}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
              onTestCaseDropped={onTestCaseDropped}
              isDragInProgress={isDragInProgress}
              dragOverFolderId={dragOverFolderId}
              onDragOverFolder={onDragOverFolder}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default DroppableFolderNode;