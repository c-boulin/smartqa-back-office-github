import React from 'react';
import { User, Hexagon, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../UI/ThemeToggle';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-gradient-to-r from-slate-200 via-purple-100 to-slate-200 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 border-b border-purple-300/30 dark:border-purple-500/20 shadow-2xl">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/projects"
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity group"
              title="Aller aux projets"
            >
              <div className="relative">
                <Hexagon className="w-8 h-8 text-cyan-600 dark:text-cyan-400 fill-cyan-600/20 dark:fill-cyan-400/20 group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition-colors" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-500 opacity-20 rounded-lg blur-sm group-hover:opacity-30 transition-opacity"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400 bg-clip-text text-transparent group-hover:from-cyan-500 group-hover:to-purple-500 dark:group-hover:from-cyan-300 dark:group-hover:to-purple-300 transition-all">
                SMARTQA
              </span>
            </Link>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-purple-400 dark:via-purple-500 to-transparent"></div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-900 dark:text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {state.user?.name || 'User'}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-gray-400">
                    {state.user?.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;