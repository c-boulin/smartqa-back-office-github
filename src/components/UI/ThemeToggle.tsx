import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 bg-slate-300 dark:bg-slate-600"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span
        className={`inline-flex items-center justify-center h-5 w-5 rounded-full bg-white dark:bg-slate-100 shadow-lg transition-transform duration-200 ${
          theme === 'dark' ? 'translate-x-[1.5px]' : 'translate-x-[22.5px]'
        }`}
      >
        {theme === 'dark' ? (
          <Moon className="w-3 h-3 text-slate-700 dark:text-slate-800" />
        ) : (
          <Sun className="w-3 h-3 text-amber-500" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
