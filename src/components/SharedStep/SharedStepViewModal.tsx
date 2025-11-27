import React, { useState, useEffect } from 'react';
import { Layers, User, Calendar } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { SharedStep } from '../../services/sharedStepsApi';
import { format } from 'date-fns';

interface SharedStepViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharedStep: SharedStep | null;
}

interface StepResult {
  id: string;
  step: string;
  result: string;
  order: number;
}

const SharedStepViewModal: React.FC<SharedStepViewModalProps> = ({
  isOpen,
  onClose,
  sharedStep
}) => {
  const [stepResults, setStepResults] = useState<StepResult[]>([]);

  useEffect(() => {
    if (isOpen && sharedStep && sharedStep.stepResults && sharedStep.stepResults.length > 0) {

      // Step results are now already in the included data from the API
      const processedStepResults = sharedStep.stepResults
        .filter((stepResult): stepResult is { id: string; step: string; result: string; order: number } =>
          typeof stepResult === 'object' && stepResult !== null
        )
        .sort((a, b) => a.order - b.order);

      setStepResults(processedStepResults);

    } else {
      setStepResults([]);
    }
  }, [isOpen, sharedStep]);

  if (!sharedStep) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Shared Step Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <Layers className="w-5 h-5 text-purple-400 mr-2" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{sharedStep.title}</h3>
                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Shared Step
                </span>
              </div>
              {sharedStep.description && (
                <p className="text-slate-700 dark:text-gray-300 mb-3">{sharedStep.description}</p>
              )}
              <div className="flex items-center space-x-6 text-sm text-slate-600 dark:text-gray-400">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  <span>{sharedStep.createdBy.name}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Created {format(sharedStep.createdAt, 'MMM dd, yyyy')}</span>
                </div>
                <span>{sharedStep.stepsCount} step{sharedStep.stepsCount !== 1 ? 's' : ''}</span>
                <span>Used in {sharedStep.usedInCount} test case{sharedStep.usedInCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Steps and Results */}
        <div>
          <h4 className="text-lg font-medium text-slate-700 dark:text-gray-300 mb-4">Steps and Results</h4>
          
          {stepResults.length > 0 ? (
            <div className="space-y-4">
              {stepResults.map((stepResult, index) => (
                <div key={stepResult.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <h5 className="text-sm font-medium text-slate-900 dark:text-white">Step {index + 1}</h5>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-2">
                        Step
                      </label>
                      <div
                        className="html-content text-sm text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded p-3 min-h-[80px]"
                        dangerouslySetInnerHTML={{ __html: stepResult.step }}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-2">
                        Expected Result
                      </label>
                      <div
                        className="html-content text-sm text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded p-3 min-h-[80px]"
                        dangerouslySetInnerHTML={{ __html: stepResult.result }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-600 dark:text-gray-400 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
              <p>No steps defined for this shared step.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SharedStepViewModal;