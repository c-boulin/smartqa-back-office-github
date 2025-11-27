import React from 'react';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  error?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  required = false,
  min,
  max,
  error,
  className = ''
}) => {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-3">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pl-10 bg-slate-100 dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent transition-all ${
            error 
              ? 'border-red-500 focus:ring-red-400'
              : 'border-slate-300 dark:border-slate-600'
          } ${
            disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          }`}
        />
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-400 pointer-events-none" />
      </div>
      {error && (
        <div className="mt-1 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
};

export default DatePicker;