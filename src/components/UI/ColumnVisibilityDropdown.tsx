import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        portalRef.current &&
        !portalRef.current.contains(target)
      ) {
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

  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };

    updatePosition();

    if (isOpen) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div ref={buttonRef}>
        <Button
          variant="secondary"
          icon={Columns3}
          onClick={handleToggle}
          className="px-4 py-2"
        >
          Columns
        </Button>
      </div>

      {isOpen && createPortal(
        <div
          ref={portalRef}
          className="fixed w-48 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xl"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            zIndex: 99999,
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default ColumnVisibilityDropdown;
