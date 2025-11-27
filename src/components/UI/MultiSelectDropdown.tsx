import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface MultiSelectDropdownProps {
  label: string;
  options: Array<{ id: string; label: string }>;
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selectedIds,
  onChange,
  placeholder = 'Search for options',
  disabled = false,
  searchPlaceholder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 250; // max-h-60 is roughly 240px + padding

      // Open upward if there's not enough space below but more space above
      setOpenUpward(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
    }
  }, [isOpen]);

  const availableOptions = options.filter(
    option => option && option.id && !selectedIds.includes(option.id)
  );

  const filteredOptions = availableOptions.filter(option =>
    option && option.label && option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOptionClick = (optionId: string) => {
    onChange([...selectedIds, optionId]);
    setSearchTerm('');
  };

  const handleRemoveOption = (optionId: string) => {
    onChange(selectedIds.filter(id => id !== optionId));
  };

  const getSelectedOptions = () => {
    return options.filter(option => option && option.id && selectedIds.includes(option.id));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-600 dark:text-gray-300">
        {label}
      </label>

      {getSelectedOptions().length > 0 && (
        <div className="flex flex-wrap gap-2">
          {getSelectedOptions().map(option => (
            <div
              key={option.id}
              className="inline-flex items-center bg-blue-500/20 border border-blue-500/30 rounded px-2 py-1 text-sm text-blue-700 dark:text-blue-300"
            >
              <span>{option.label}</span>
              <button
                type="button"
                onClick={() => handleRemoveOption(option.id)}
                className="ml-1.5 hover:text-blue-600 dark:hover:text-blue-100 transition-colors"
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative" ref={dropdownRef}>
        <div
          className={`w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-500 dark:focus-within:ring-cyan-400 flex items-center justify-between ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => !disabled && setIsOpen(true)}
            onClick={() => !disabled && setIsOpen(true)}
            placeholder={searchPlaceholder || placeholder}
            disabled={disabled}
            className="bg-transparent border-none outline-none flex-1 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 cursor-pointer"
          />
          <ChevronDown
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={`w-4 h-4 text-slate-400 dark:text-gray-400 transition-transform cursor-pointer ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>

        {isOpen && !disabled && (
          <div className={`absolute z-50 w-full ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto`}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.id}
                  onClick={() => handleOptionClick(option.id)}
                  className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer text-slate-900 dark:text-white transition-colors border-b border-slate-200 dark:border-slate-600 last:border-b-0"
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-slate-500 dark:text-gray-400">
                {searchTerm ? 'No options found' : 'All options selected'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelectDropdown;
