import React, { useState, useEffect } from 'react';
import { Plus, Loader, Save } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import DraggableTestStepWithAutoUpload from '../TestCase/DraggableTestStepWithAutoUpload';
import { SharedStep } from '../../services/sharedStepsApi';
import { sharedStepsApiService } from '../../services/sharedStepsApi';

interface TestStep {
  id: string;
  step: string;
  result: string;
}

interface EditSharedStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  sharedStep: SharedStep | null;
}

const EditSharedStepModal: React.FC<EditSharedStepModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  sharedStep
}) => {
  // Form state
  const [formData, setFormData] = useState({
    title: ''
  });

  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [isLoadingStepResults, setIsLoadingStepResults] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Populate form when sharedStep changes or modal opens
  useEffect(() => {
    if (isOpen && sharedStep) {
      const fetchStepResults = async () => {
        setIsLoadingStepResults(true);
        let existingSteps: TestStep[] = [];
        
        if (sharedStep.stepResults && sharedStep.stepResults.length > 0) {
          try {
            console.log('🔄 Fetching step results for shared step:', sharedStep.id);
            
            // Fetch all step results in parallel
            const stepResultPromises = sharedStep.stepResults.map(stepResultId => 
              sharedStepsApiService.getStepResult(stepResultId)
            );
            
            const stepResultResponses = await Promise.all(stepResultPromises);
            
            // Transform and sort by order
            existingSteps = stepResultResponses
              .map(response => ({
                id: response.data.attributes.id.toString(),
                step: response.data.attributes.step,
                result: response.data.attributes.result,
                order: response.data.attributes.order,
                originalId: response.data.attributes.id.toString()
              }))
              .sort((a, b) => a.order - b.order) // Sort by order: 1, 2, 3, etc.
              .map(step => ({
                id: step.id,
                step: step.step,
                result: step.result,
                originalId: step.originalId
              }));
            
            console.log('✅ Fetched and sorted step results:', existingSteps);
            
          } catch (error) {
            console.error('❌ Failed to fetch step results:', error);
            // Fallback to empty steps if fetch fails
            existingSteps = [];
          }
        }
        
        setTestSteps(existingSteps);
        setIsLoadingStepResults(false);
      };

      // Pre-fill form with existing shared step data
      setFormData({
        title: sharedStep.title
      });

      fetchStepResults();
    } else if (isOpen && !sharedStep) {
      // Reset form for new shared step
      setFormData({
        title: ''
      });
      setTestSteps([]);
      setIsLoadingStepResults(false);
    }
  }, [isOpen, sharedStep]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTestStep = () => {
    const newStep: TestStep = {
      id: Date.now().toString(),
      step: '',
      result: ''
    };
    setTestSteps(prev => [...prev, newStep]);
  };

  const updateTestStep = (id: string, field: 'step' | 'result', value: string) => {
    setTestSteps(prev => prev.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const removeTestStep = (id: string) => {
    setTestSteps(prev => prev.filter(step => step.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTestSteps((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      description: '', // Description empty by default for consistency with create modal
      testSteps
    };

    await onSubmit(submitData);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Edit Shared Step"
      size="custom"
    >
      <div className="h-[calc(95vh-8rem)] flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Main Content with balanced padding */}
          {isLoadingStepResults && (
            <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 shadow-xl">
                <div className="flex items-center space-x-3">
                  <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
                  <span className="text-white font-medium">Loading step results...</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto px-2">
            <div className="space-y-8">
              {/* Title - Full width */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-lg"
                  required
                  disabled={isSubmitting}
                  placeholder="Enter shared step title"
                />
              </div>

              {/* Steps and Results with Drag & Drop - Full width */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <label className="block text-lg font-medium text-gray-300 mb-1">
                      Steps and Results
                    </label>
                    <p className="text-sm text-gray-400">
                      Define the reusable steps that can be shared across multiple test cases
                    </p>
                  </div>
                  {testSteps.length === 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      icon={Plus}
                      onClick={addTestStep}
                      disabled={isSubmitting}
                      className="px-6 py-3"
                    >
                      Add Step
                    </Button>
                  )}
                </div>

                <div className="space-y-6">
                  {testSteps.length > 0 ? (
                    <>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={testSteps.map(step => step.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-4">
                            {testSteps.map((step, index) => (
                              <DraggableTestStepWithAutoUpload
                                key={step.id}
                                step={step}
                                index={index}
                                onUpdate={updateTestStep}
                                onRemove={removeTestStep}
                                disabled={isSubmitting}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                      <div className="flex justify-end mt-4">
                        <Button
                          type="button"
                          variant="secondary"
                          size="md"
                          icon={Plus}
                          onClick={addTestStep}
                          disabled={isSubmitting}
                          className="px-6 py-3"
                        >
                          Add Step
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16 text-gray-400 border-2 border-dashed border-slate-600 rounded-xl">
                      <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Plus className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-300 mb-2">No steps added yet</h3>
                        <p className="text-sm text-gray-400 mb-4">
                          Create reusable test steps that can be shared across multiple test cases.
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          icon={Plus}
                          onClick={addTestStep}
                          disabled={isSubmitting}
                        >
                          Add Your First Step
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Fixed at bottom with better spacing */}
          <div className="border-t border-slate-700 pt-6 mt-8 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                {testSteps.length > 0 && (
                  <span>
                    {testSteps.length} step{testSteps.length !== 1 ? 's' : ''} defined
                  </span>
                )}
              </div>
              <div className="flex space-x-4">
                <Button 
                  variant="secondary" 
                  onClick={onClose} 
                  disabled={isSubmitting}
                  size="lg"
                  className="px-8"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  size="lg"
                  className="px-8"
                  icon={Save}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Shared Step'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditSharedStepModal;