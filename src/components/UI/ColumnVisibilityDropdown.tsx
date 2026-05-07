import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Columns3 } from 'lucide-react';

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

// Columns that can be toggled (id and title are always required)
const TOGGLEABLE_COLUMNS: { key: keyof ColumnVisibility; label: string }[] = [
  { key: 'type',       label: 'Type' },
  { key: 'state',      label: 'State' },
  { key: 'priority',   label: 'Priority' },
  { key: 'tags',       label: 'Tags' },
  { key: 'autoStatus', label: 'Auto Status' },
];

const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({
  visibleColumns,
  onToggleColumn,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(t) &&
        panelRef.current && !panelRef.current.contains(t)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const updatePos = () => {
      if (isOpen && buttonRef.current) {
        const r = buttonRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
      }
    };
    updatePos();
    if (isOpen) {
      window.addEventListener('scroll', updatePos, true);
      window.addEventListener('resize', updatePos);
    }
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(o => !o)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
          isOpen
            ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
      >
        <Columns3 className="w-4 h-4" />
        <span>View</span>
      </button>

      {isOpen && createPortal(
        <div
          ref={panelRef}
          className="fixed w-52 rounded-xl shadow-2xl overflow-hidden"
          style={{ top: pos.top, right: pos.right, zIndex: 99999 }}
        >
          {/* Dark panel matching the screenshot */}
          <div className="bg-slate-700 dark:bg-slate-800 border border-slate-600 dark:border-slate-600 rounded-xl">
            {/* Header */}
            <div className="px-4 pt-3 pb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Visible Columns
              </p>
            </div>

            {/* Column rows */}
            <div className="px-2 pb-2 space-y-0.5">
              {TOGGLEABLE_COLUMNS.map(({ key, label }) => {
                const checked = visibleColumns[key];
                return (
                  <button
                    key={key}
                    onClick={() => onToggleColumn(key)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-600/60 dark:hover:bg-slate-700/60 transition-colors group"
                  >
                    {/* Checkbox */}
                    <span
                      className={`w-5 h-5 shrink-0 rounded flex items-center justify-center border-2 transition-colors ${
                        checked
                          ? 'bg-cyan-500 border-cyan-500'
                          : 'bg-transparent border-slate-400 dark:border-slate-500 group-hover:border-slate-300'
                      }`}
                    >
                      {checked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm font-medium text-slate-100 dark:text-slate-200">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ColumnVisibilityDropdown;
