import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, MapPin } from 'lucide-react';

export interface Suggestion {
  label: string;
  type: 'name' | 'country';
  /** secondary text shown on the right (e.g. full country name) */
  meta?: string;
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  suggestions: Suggestion[];
  placeholder?: string;
  inputClassName?: string;
  'data-mipqa'?: string;
}

const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  value,
  onChange,
  onSearch,
  suggestions,
  placeholder = 'Search...',
  inputClassName,
  'data-mipqa': dataMipqa,
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered: Suggestion[] = value.trim().length > 0
    ? suggestions
        .filter(s => s.label.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8)
    : [];

  const showDropdown = open && filtered.length > 0;

  const commit = useCallback((term: string) => {
    onChange(term);
    onSearch(term);
    setOpen(false);
    setActiveIndex(-1);
  }, [onChange, onSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSearch(value);
        setOpen(false);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) {
        commit(filtered[activeIndex].label);
      } else {
        onSearch(value);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleClear = () => {
    onChange('');
    onSearch('');
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseInputCls = inputClassName
    ?? 'w-full pl-10 pr-8 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all';

  const highlightMatch = (text: string) => {
    const lc = value.toLowerCase();
    const matchStart = text.toLowerCase().indexOf(lc);
    if (matchStart === -1) return <span>{text}</span>;
    const matchEnd = matchStart + lc.length;
    return (
      <>
        {text.slice(0, matchStart)}
        <span className="font-semibold text-cyan-600 dark:text-cyan-400">{text.slice(matchStart, matchEnd)}</span>
        {text.slice(matchEnd)}
      </>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-4 h-4 pointer-events-none z-10" />
      <input
        ref={inputRef}
        data-mipqa={dataMipqa}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        className={baseInputCls}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
          tabIndex={-1}
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {showDropdown && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden"
        >
          {filtered.map((suggestion, idx) => {
            const isActive = idx === activeIndex;
            const isCountry = suggestion.type === 'country';
            return (
              <li
                key={`${suggestion.type}-${suggestion.label}`}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => { e.preventDefault(); commit(suggestion.label); }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                  isActive
                    ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                    : 'text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                }`}
              >
                {isCountry
                  ? <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 shrink-0" />
                  : <Search className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 shrink-0" />
                }
                <span className="flex-1 min-w-0 truncate">
                  {highlightMatch(suggestion.label)}
                </span>
                {suggestion.meta && (
                  <span className="text-xs text-slate-400 dark:text-gray-500 shrink-0 truncate max-w-[120px]">
                    {suggestion.meta}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SearchAutocomplete;