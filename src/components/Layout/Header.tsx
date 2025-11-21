import React from 'react';
import { User, Hexagon, LogOut, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { state, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 border-b border-gray-200 dark:border-purple-500/20 shadow-2xl">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/projects"
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity group"
              title="Aller aux projets"
            >
              <div className="relative">
                <Hexagon className="w-8 h-8 text-cyan-400 fill-cyan-400/20 group-hover:text-cyan-300 transition-colors" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-20 rounded-lg blur-sm group-hover:opacity-30 transition-opacity"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:to-purple-300 transition-all">
                SMARTQA
              </span>
            </Link>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-purple-500"></div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={toggleTheme}
              className="relative w-14 h-7 bg-gray-300 dark:bg-slate-800 rounded-full p-1 transition-colors duration-300 hover:bg-gray-400 dark:hover:bg-slate-700"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-slate-900 dark:bg-white shadow-lg transform transition-transform duration-300 flex items-center justify-center ${
                theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
              }`}>
                {theme === 'dark' ? (
                  <Moon className="w-3 h-3 text-cyan-400" />
                ) : (
                  <Sun className="w-3 h-3 text-amber-500" />
                )}
              </div>
            </button>

            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {state.user?.name || 'User'}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {state.user?.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;