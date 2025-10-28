import React from 'react';
import { Search, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import DraggableTestCaseRow from './DraggableTestCaseRow';
import { TestCase } from '../../types';

interface TestCasesTableProps {
  testCases: TestCase[];
  loading: boolean;
  isApplyingNavigationFilter: boolean;
  currentSearchTerm: string;
  selectedFolder: { id: string; name: string } | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  onTestCaseTitleClick: (testCase: TestCase) => void;
  onEditTestCase: (testCase: TestCase) => void;
  onDeleteTestCase: (testCase: TestCase) => void;
  onDuplicateTestCase: (testCase: TestCase) => void;
  onPageChange: (page: number) => void;
  isSubmitting: boolean;
}

const TestCasesTable: React.FC<TestCasesTableProps> = ({
  testCases,
  loading,
  isApplyingNavigationFilter,
  currentSearchTerm,
  selectedFolder,
  pagination,
  onTestCaseTitleClick,
  onEditTestCase,
  onDeleteTestCase,
  onDuplicateTestCase,
  onPageChange,
  isSubmitting
}) => {
  return (
    <Card className="overflow-hidden">
      {/* Loader overlay - positioned at top of card for visibility */}
      {(loading || isApplyingNavigationFilter) && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-start justify-center z-20 pt-8">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-xl">
            <div className="flex items-center space-x-3">
              <Loader className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-white font-medium">
                {isApplyingNavigationFilter ? 'Applying filters...' : 
                 testCases.length === 0 ? 'Loading test cases...' : 'Applying filters...'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">ID</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Title</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Type</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">State</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Priority</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Tags</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Automation Status</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {testCases.map((testCase) => (
              <DraggableTestCaseRow
                key={testCase.id}
                testCase={testCase}
                onTestCaseTitleClick={onTestCaseTitleClick}
                onEditTestCase={onEditTestCase}
                onDeleteTestCase={onDeleteTestCase}
                onDuplicateTestCase={onDuplicateTestCase}
                isSubmitting={isSubmitting}
              />
            ))}
          </tbody>
        </table>
        
        {testCases.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No test cases found</p>
              <p className="text-sm">
                {currentSearchTerm
                  ? `No test cases found matching "${currentSearchTerm}" across all folders in this project.`
                  : `No test cases found matching your filters${selectedFolder ? ` in ${selectedFolder.name}` : ' in this project'}.`
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="border-t border-slate-700 px-6 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="text-sm text-gray-400">
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
              {pagination.totalItems} test cases
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || loading}
                icon={ChevronLeft}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-400">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages || loading}
                icon={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default TestCasesTable;