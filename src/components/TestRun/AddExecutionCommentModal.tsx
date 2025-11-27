import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../UI/Button';
import WysiwygEditorWithAutoUpload from '../UI/WysiwygEditorWithAutoUpload';
import { TEST_RESULTS, TestResultId } from '../../types';

interface AddExecutionCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resultId: TestResultId, comment?: string) => void;
  currentResult: TestResultId;
  testCaseTitle: string;
  disabled?: boolean;
}

const AddExecutionCommentModal: React.FC<AddExecutionCommentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentResult,
  testCaseTitle,
  disabled = false
}) => {
  const [selectedResult, setSelectedResult] = useState<TestResultId>(currentResult || 8);
  const [comment, setComment] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setSelectedResult(currentResult || 8);
      setComment('');
    }
  }, [isOpen, currentResult]);

  const getResultColor = (resultId: TestResultId): string => {
    switch (resultId) {
      case 1: return 'bg-green-400';
      case 2: return 'bg-red-400';
      case 3: return 'bg-yellow-400';
      case 4: return 'bg-orange-400';
      case 5: return 'bg-purple-400';
      case 6: return 'bg-gray-400';
      case 7: return 'bg-blue-400';
      case 8: return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const handleSubmit = () => {
    const cleanComment = comment.trim();
    onSubmit(selectedResult, cleanComment || undefined);
    onClose();
  };

  const handleCancel = () => {
    setComment('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel}></div>
      <div className="absolute inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl flex items-center justify-center">
        <div className="relative w-full bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Result</h3>
              <p className="text-sm text-slate-600 dark:text-gray-400 mt-1 truncate">{testCaseTitle}</p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">
                Status <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(TEST_RESULTS).map(([resultId, label]) => {
                  const id = parseInt(resultId) as TestResultId;
                  const isSelected = selectedResult === id;

                  return (
                    <button
                      key={resultId}
                      type="button"
                      onClick={() => setSelectedResult(id)}
                      className={`px-4 py-3 text-left rounded-lg border transition-all flex items-center ${
                        isSelected
                          ? 'bg-cyan-600/30 border-cyan-400 ring-2 ring-cyan-400'
                          : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:border-slate-500 hover:bg-slate-600'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${getResultColor(id)}`}></div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-cyan-900 dark:text-cyan-300' : 'text-slate-900 dark:text-white'}`}>
                        {label}
                      </span>
                      {isSelected && (
                        <span className="ml-auto text-cyan-700 dark:text-cyan-400 text-lg">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">
                Add Notes
              </label>
              <WysiwygEditorWithAutoUpload
                value={comment}
                onChange={setComment}
                fieldName="execution-comments"
                placeholder="Add notes about this execution result..."
                disabled={disabled}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <Button
              variant="secondary"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={disabled}
            >
              Add Result
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExecutionCommentModal;
