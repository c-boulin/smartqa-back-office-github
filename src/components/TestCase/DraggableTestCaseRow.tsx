import React, { useState } from 'react';
import { SquarePen, Trash2, GripVertical, Copy } from 'lucide-react';
import StatusBadge from '../UI/StatusBadge';
import TagsWithTooltip from '../UI/TagsWithTooltip';
import { TestCase, TEST_CASE_TYPES } from '../../types';

interface DraggableTestCaseRowProps {
  testCase: TestCase;
  onTestCaseTitleClick: (testCase: TestCase) => void;
  onEditTestCase: (testCase: TestCase) => void;
  onDeleteTestCase: (testCase: TestCase) => void;
  onDuplicateTestCase: (testCase: TestCase) => void;
  isSubmitting: boolean;
  isDragging?: boolean;
}

const DraggableTestCaseRow: React.FC<DraggableTestCaseRowProps> = ({
  testCase,
  onTestCaseTitleClick,
  onEditTestCase,
  onDeleteTestCase,
  onDuplicateTestCase,
  isSubmitting
}) => {
  const [dragStarted, setDragStarted] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setDragStarted(true);
    
    // Set drag data
    e.dataTransfer.setData('application/json', JSON.stringify({
      testCaseId: testCase.id,
      testCaseTitle: testCase.title,
      currentFolderId: testCase.folderId || null
    }));
    
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback
    e.currentTarget.style.opacity = '0.5';
    
    console.log('🎯 Drag started for test case:', testCase.title, 'ID:', testCase.id);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDragStarted(false);
    
    // Reset visual feedback
    e.currentTarget.style.opacity = '1';
    
    console.log('🎯 Drag ended for test case:', testCase.title);
  };

  return (
    <tr 
      className={`border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${
        dragStarted ? 'bg-cyan-500/10 border-cyan-500/30' : ''
      }`}
      draggable={!isSubmitting}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <td className="py-4 px-6 text-sm text-gray-300 font-mono">
        <div className="flex items-center">
          <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-cyan-400 transition-colors mr-2">
            <GripVertical className="w-4 h-4" />
          </div>
          #{testCase.id}
        </div>
      </td>
      <td className="py-4 px-6">
        <button
          onClick={() => onTestCaseTitleClick(testCase)}
          className="text-left w-full group"
        >
          <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors cursor-pointer">
            {testCase.title}
          </h3>
        </button>
      </td>
      <td className="py-4 px-6">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/50">
          {(() => {
            const typeMapping = {
              'other': 1,
              'acceptance': 2,
              'accessibility': 3,
              'compatibility': 4,
              'destructive': 5,
              'functional': 6,
              'performance': 7,
              'regression': 8,
              'security': 9,
              'smoke': 10,
              'usability': 11
            };
            const typeKey = typeMapping[testCase.type as keyof typeof typeMapping] || 6;
            return TEST_CASE_TYPES[typeKey as keyof typeof TEST_CASE_TYPES] || testCase.type;
          })()}
        </span>
      </td>
      <td className="py-4 px-6">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          testCase.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
          testCase.status === 'draft' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
          testCase.status === 'in_review' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
          testCase.status === 'outdated' ? 'bg-gray-500/20 text-gray-400 border-gray-500/50' :
          testCase.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
          testCase.status === 'deprecated' ? 'bg-gray-500/20 text-gray-400 border-gray-500/50' :
          'bg-gray-500/20 text-gray-400 border-gray-500/50'
        }`}>
          {testCase.status === 'active' ? 'Active' :
           testCase.status === 'draft' ? 'Draft' :
           testCase.status === 'in_review' ? 'In Review' :
           testCase.status === 'outdated' ? 'Outdated' :
           testCase.status === 'rejected' ? 'Rejected' :
           testCase.status === 'deprecated' ? 'Deprecated' :
           testCase.status}
        </span>
      </td>
      <td className="py-4 px-6">
        <StatusBadge status={testCase.priority} type="priority" />
      </td>
      <td className="py-4 px-6">
        <TagsWithTooltip 
          tags={Array.isArray(testCase.tags) ? testCase.tags : []}
          maxVisible={2}
        />
      </td>
      <td className="py-4 px-6">
        <StatusBadge status={testCase.automationStatus} type="automation" />
      </td>
      <td className="py-4 px-6">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEditTestCase(testCase)}
            className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"
            title="Edit"
            disabled={isSubmitting}
          >
            <SquarePen className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDuplicateTestCase(testCase)}
            className="p-2 text-gray-400 hover:text-green-400 hover:bg-slate-700 rounded-lg transition-colors"
            title="Duplicate"
            disabled={isSubmitting}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteTestCase(testCase)}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
            title="Delete"
            disabled={isSubmitting}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default DraggableTestCaseRow;