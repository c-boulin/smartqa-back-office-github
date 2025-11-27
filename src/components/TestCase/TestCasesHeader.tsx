import React from 'react';
import { Plus } from 'lucide-react';
import Button from '../UI/Button';
import { Project } from '../../types';

interface TestCasesHeaderProps {
  selectedProject: Project | null;
  totalItems: number;
  selectedFolder: { id: string; name: string } | null;
  onCreateTestCase: () => void;
  disabled: boolean;
}

const TestCasesHeader: React.FC<TestCasesHeaderProps> = ({
  selectedProject,
  totalItems,
  selectedFolder,
  onCreateTestCase,
  disabled
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Test Cases</h2>
        <p className="text-slate-600 dark:text-gray-400">
          {selectedProject 
            ? `Manage test cases for ${selectedProject.name} (${totalItems} total)` 
            : `Please select a project to view test cases`
          }
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedProject && (
            <div className="inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-700 dark:text-cyan-400">
              📁 Project: {selectedProject.name}
            </div>
          )}
          {selectedFolder && (
            <div className="inline-flex items-center px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-400">
              📂 Folder: {selectedFolder.name}
            </div>
          )}
        </div>
      </div>
      <Button 
        icon={Plus} 
        onClick={onCreateTestCase}
        disabled={disabled}
        title={!selectedProject ? 'Please select a project first' : !selectedFolder ? 'Please select a folder first' : 'Create new test case'}
      >
        New Test Case
      </Button>
    </div>
  );
};

export default TestCasesHeader;