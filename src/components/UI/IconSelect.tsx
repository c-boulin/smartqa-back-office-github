import React, { useState } from 'react';

interface IconSelectProps {
  value: number;
  onChange: (value: number) => void;
  options: Record<number, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }>;
  disabled?: boolean;
  placeholder?: string;
}

const IconSelect: React.FC<IconSelectProps> = ({ 
  value, 
  onChange, 
  options, 
  disabled = false, 
  placeholder 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options[value];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 text-sm text-left flex items-center justify-between"
      >
        <div className="flex items-center">
          {selectedOption && (
            <>
              <selectedOption.icon className={`w-4 h-4 mr-2 ${selectedOption.color}`} />
              <span>{selectedOption.label}</span>
            </>
          )}
          {!selectedOption && placeholder && (
            <span className="text-slate-400 dark:text-gray-400">{placeholder}</span>
          )}
        </div>
        <svg className="w-4 h-4 text-slate-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {Object.entries(options).map(([optionValue, { label, icon: Icon, color }]) => (
              <button
                key={optionValue}
                type="button"
                onClick={() => {
                  onChange(parseInt(optionValue));
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center text-sm"
              >
                <Icon className={`w-4 h-4 mr-2 ${color}`} />
                <span className="text-slate-900 dark:text-white">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default IconSelect;