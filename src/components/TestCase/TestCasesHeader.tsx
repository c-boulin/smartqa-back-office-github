import React from 'react';
import { Plus } from 'lucide-react';
import Button from '../UI/Button';
import { Project } from '../../types';
import PermissionGuard from '../PermissionGuard';
import { PERMISSIONS } from '../../utils/permissions';
import EntityBreadcrumb from '../Layout/EntityBreadcrumb';

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
        <EntityBreadcrumb section="Test Cases" hideWhenNoSelection />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Test Cases</h2>
        <p className="text-slate-600 dark:text-gray-400">
          {selectedProject
            ? `Manage test cases for ${selectedProject.name} (${totalItems} total)`
            : `Please select a project to view test cases`}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedFolder && (
            <div className="inline-flex items-center px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-400">
              📂 Folder: {selectedFolder.name}
            </div>
          )}
        </div>
      </div>
      <PermissionGuard permission={PERMISSIONS.TEST_CASE.CREATE}>
        <Button
          icon={Plus}
          onClick={onCreateTestCase}
          disabled={disabled}
          title={!selectedProject ? 'Please select a project first' : 'Create new test case'}
        >
          New Test Case
        </Button>
      </PermissionGuard>
    </div>
  );
};

export default TestCasesHeader;
