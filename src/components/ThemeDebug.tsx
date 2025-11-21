import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeDebug: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [htmlHasDark, setHtmlHasDark] = useState(false);

  useEffect(() => {
    const checkDarkClass = () => {
      const hasDark = document.documentElement.classList.contains('dark');
      setHtmlHasDark(hasDark);
      console.log('ThemeDebug check:', {
        theme,
        htmlClasses: document.documentElement.className,
        hasDarkClass: hasDark
      });
    };

    checkDarkClass();
    const interval = setInterval(checkDarkClass, 500);
    return () => clearInterval(interval);
  }, [theme]);

  const handleToggle = () => {
    console.log('=== TOGGLE CLICKED ===');
    console.log('Before - HTML classes:', document.documentElement.className);
    toggleTheme();
    setTimeout(() => {
      console.log('After - HTML classes:', document.documentElement.className);
    }, 200);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-xl bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-yellow-500">
      <div className="space-y-2">
        <div className="text-sm font-mono text-gray-900 dark:text-white">
          Theme state: <strong>{theme}</strong>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-300">
          HTML 'dark' class: <strong className={htmlHasDark ? 'text-green-600' : 'text-red-600'}>{htmlHasDark ? 'YES ✓' : 'NO ✗'}</strong>
        </div>
        <div
          className="w-20 h-20 bg-red-500 dark:bg-green-500 rounded flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: htmlHasDark ? '#22c55e' : '#ef4444' }}
        >
          {htmlHasDark ? 'DARK' : 'LIGHT'}
        </div>
        <button
          onClick={handleToggle}
          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white rounded"
        >
          Toggle Theme
        </button>
        <div className="text-xs text-gray-600 dark:text-gray-300">
          Box is GREEN if dark class exists
        </div>
      </div>
    </div>
  );
};

export default ThemeDebug;
