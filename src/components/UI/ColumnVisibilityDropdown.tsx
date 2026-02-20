import React, { useState, useRef, useEffect } from 'react';
import { Columns3, Check } from 'lucide-react';
import Button from './Button';

export interface ColumnVisibility {
  id: boolean;
  title: boolean;
  folder: boolean;
  type: boolean;
  state: boolean;
  priority: boolean;
  tags: boolean;
  autoStatus: boolean;
}

interface ColumnVisibilityDropdownProps {
  visibleColumns: ColumnVisibility;
  onToggleColumn: (column: keyof ColumnVisibility) => void;
}

const COLUMN_LABELS: Record<keyof ColumnVisibility, string> = {
  id: 'ID',
  title: 'Title',
  folder: 'Folder',
  type: 'Type',
  state: 'State',
  priority: 'Priority',
  tags: 'Tags',
  autoStatus: 'Auto Status',
};

const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({
  visibleColumns,
  onToggleColumn,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="secondary"
        icon={Columns3}
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2"
      >
        Columns
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-[9999]">
          <div className="p-2">
            <div className="text-xs font-medium text-slate-600 dark:text-gray-400 px-3 py-2">
              Show/Hide Columns
            </div>
            {(Object.keys(COLUMN_LABELS) as Array<keyof ColumnVisibility>).map((column) => (
              <button
                key={column}
                onClick={() => onToggleColumn(column)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                <span>{COLUMN_LABELS[column]}</span>
                {visibleColumns[column] && (
                  <Check className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnVisibilityDropdown;
