import React, { useState, useRef, useEffect } from 'react';
import { Search, FolderOpen, X, Loader, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Project } from '../../types';

interface ProjectSelectorProps {
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProjectId,
  onProjectChange,
  disabled = false,
  placeholder = 'Select project...',
  required = false,
  error,
  className = ''
}) => {
  const { state } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter projects based on search term
  const filteredProjects = state.projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find selected project
  const selectedProject = state.projects.find(p => p.id === selectedProjectId);

  const handleProjectSelect = (project: Project) => {
    onProjectChange(project.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    onProjectChange('');
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProjects.length > 0) {
        handleProjectSelect(filteredProjects[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Close dropdown when clicking outside
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

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-3">
        Project {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative" ref={dropdownRef}>
        {/* Main Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-3 pl-10 bg-slate-100 dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent transition-all text-left flex items-center justify-between ${
            error 
              ? 'border-red-500 focus:ring-red-400' 
              : 'border-slate-300 dark:border-slate-600'
          } ${
            disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          }`}
        >
          <div className="flex items-center flex-1 min-w-0">
            <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-400 pointer-events-none" />
            <span className="truncate ml-7">
              {selectedProject ? (
                <span className="font-medium">{selectedProject.name}</span>
              ) : (
                <span className="text-slate-400 dark:text-gray-400">{placeholder}</span>
              )}
            </span>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {selectedProject && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSelection();
                }}
                className="text-slate-400 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </span>
            )}
            {state.isLoadingProjects ? (
              <Loader className="w-4 h-4 text-slate-400 dark:text-gray-400 animate-spin" />
            ) : (
              <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            )}
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl shadow-2xl z-[9999] max-h-80 overflow-hidden backdrop-blur-sm">
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-400 w-4 h-4" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-8 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent transition-all text-sm"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="max-h-60 overflow-y-auto bg-white dark:bg-slate-800">
              {state.isLoadingProjects ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Loader className="w-6 h-6 text-cyan-600 dark:text-cyan-400 animate-spin mx-auto mb-2" />
                    <span className="text-slate-500 dark:text-gray-400 text-sm">Loading projects...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Clear selection option */}
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-slate-700/50 flex items-center"
                  >
                    <X className="w-4 h-4 mr-3 text-slate-400 dark:text-gray-500" />
                    <span className="text-slate-500 dark:text-gray-400">No project selected</span>
                  </button>

                  {/* Project options */}
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => handleProjectSelect(project)}
                        className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all duration-200 ${
                          selectedProjectId === project.id
                            ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-600 dark:text-cyan-400 border-l-4 border-cyan-600 dark:border-cyan-400'
                            : 'text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-300'
                        }`}
                      >
                        <div className="flex items-center">
                          <FolderOpen className={`w-4 h-4 mr-3 ${
                            selectedProjectId === project.id ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-gray-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium truncate ${
                              selectedProjectId === project.id ? 'text-cyan-600 dark:text-cyan-300' : 'text-slate-900 dark:text-white'
                            }`}>
                              {project.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-gray-400 truncate mt-1">{project.description}</div>
                          </div>
                          {selectedProjectId === project.id && (
                            <div className="text-cyan-600 dark:text-cyan-400 ml-2">✓</div>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-slate-500 dark:text-gray-400 text-sm">
                      {searchTerm ? `No projects found matching "${searchTerm}"` : 'No projects available'}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm flex items-center">
            <FolderOpen className="w-4 h-4 mr-2" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;
