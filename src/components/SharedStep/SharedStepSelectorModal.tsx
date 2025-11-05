import React, { useState, useEffect } from 'react';
import { Search, Layers, Plus, Loader, User, ArrowLeft, Save } from 'lucide-react';
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
import Card from '../UI/Card';
import DraggableTestStepWithAutoUpload from '../TestCase/DraggableTestStepWithAutoUpload';
import { useSharedSteps } from '../../hooks/useSharedSteps';
import { SharedStep } from '../../services/sharedStepsApi';
import { sharedStepsApiService } from '../../services/sharedStepsApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface TestStep {
  id: string;
  step: string;
  result: string;
}

interface SharedStepSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSharedStep: (sharedStep: SharedStep) => void;
  projectId: string | null;
  disabled?: boolean;
}

const SharedStepSelectorModal: React.FC<SharedStepSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectSharedStep,
  projectId,
  disabled = false
}) => {
  const { state: authState } = useAuth();
  const { 
    sharedSteps, 
    loading, 
    error, 
    pagination, 
    fetchSharedSteps, 
    searchSharedSteps,
    createSharedStep
  } = useSharedSteps(projectId);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreatingSharedStep, setIsCreatingSharedStep] = useState(false);

  // Create form state
  const [createFormData, setCreateFormData] = useState({
    title: ''
  });
  const [createTestSteps, setCreateTestSteps] = useState<TestStep[]>([]);

  // Drag and drop sensors for create form
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load shared steps when modal opens
  useEffect(() => {
    if (isOpen && projectId) {
      fetchSharedSteps(1, projectId);
      setSearchTerm('');
      setCurrentSearchTerm('');
      setShowCreateForm(false);
      setCreateFormData({ title: '' });
      setCreateTestSteps([]);
    }
  }, [isOpen, projectId, fetchSharedSteps]);

  const handleSearch = async (term: string) => {
    setCurrentSearchTerm(term);
    if (term.trim()) {
      await searchSharedSteps(term);
    } else {
      await fetchSharedSteps(1);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchTerm);
    }
  };

  const handleSelectSharedStep = (sharedStep: SharedStep) => {
    onSelectSharedStep(sharedStep);
    onClose();
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentSearchTerm('');
    fetchSharedSteps(1);
  };

  const handleShowCreateForm = () => {
    setShowCreateForm(true);
    setSearchTerm('');
    setCurrentSearchTerm('');
  };

  const handleBackToList = () => {
    setShowCreateForm(false);
    setCreateFormData({ title: '' });
    setCreateTestSteps([]);
  };

  const handleCreateInputChange = (field: string, value: string | number) => {
    setCreateFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCreateTestStep = () => {
    const newStep: TestStep = {
      id: Date.now().toString(),
      step: '',
      result: ''
    };
    setCreateTestSteps(prev => [...prev, newStep]);
  };

  const updateCreateTestStep = (id: string, field: 'step' | 'result', value: string) => {
    setCreateTestSteps(prev => prev.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const removeCreateTestStep = (id: string) => {
    setCreateTestSteps(prev => prev.filter(step => step.id !== id));
  };

  const handleCreateDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCreateTestSteps((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleCreateSharedStep = async () => {
    if (!projectId || !authState.user?.id) {
      return;
    }

    try {
      setIsCreatingSharedStep(true);
      
      // Handle step results - create them first if they exist
      const stepResults: Array<{
        id: string;
        order: number;
      }> = [];
      
      if (createTestSteps && createTestSteps.length > 0) {
        console.log('🔄 Creating step results for new shared step...');
        
        for (let i = 0; i < createTestSteps.length; i++) {
          const step = createTestSteps[i];
          
          try {
            const stepResultResponse = await sharedStepsApiService.createStepResult({
              step: step.step,
              result: step.result,
              userId: authState.user.id
            });
            
            stepResults.push({
              id: stepResultResponse.data.attributes.id.toString(),
              order: i + 1 // Order starts from 1
            });
            
            console.log(`✅ Created step result ${i + 1}:`, stepResultResponse.data.id);
          } catch (stepError) {
            console.error(`❌ Failed to create step result ${i + 1}:`, stepError);
            throw new Error(`Failed to create step result ${i + 1}: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
          }
        }
        
        console.log('✅ All step results created:', stepResults);
      }
      
      // Create the shared step with step results
      await createSharedStep({
        title: createFormData.title,
        projectId: projectId,
        creatorId: authState.user.id,
        stepResults
      });
      
      // Refresh the shared steps list
      await fetchSharedSteps(1, projectId);
      
      // Reset create form and go back to list
      setCreateFormData({ title: '' });
      setCreateTestSteps([]);
      setShowCreateForm(false);
      
      toast.success('Shared step created successfully');
      
    } catch (error) {
      console.error('Failed to create shared step:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create shared step';
      toast.error(errorMessage);
    } finally {
      setIsCreatingSharedStep(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={showCreateForm ? "Create New Shared Step" : "Select Shared Step"}
      size={showCreateForm ? "custom" : "lg"}
    >
      <div className={showCreateForm ? "h-[calc(95vh-8rem)] flex flex-col" : "space-y-6"}>
        {!showCreateForm ? (
          <>
            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Available Shared Steps</h3>
                <p className="text-sm text-gray-400">Select an existing shared step or create a new one</p>
              </div>
              <Button
                variant="secondary"
                icon={Plus}
                onClick={handleShowCreateForm}
                disabled={disabled || !projectId}
                size="sm"
              >
                Create New
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search shared steps by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                disabled={disabled}
              />
              {currentSearchTerm && (
                <div className="mt-2 text-sm text-cyan-400">
                  Searching for: "{currentSearchTerm}"
                  <button
                    onClick={clearSearch}
                    className="ml-2 text-gray-400 hover:text-white underline"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>

            {/* Shared Steps List */}
            <div className="max-h-96 overflow-y-auto">
              {loading && sharedSteps.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading shared steps...</p>
                  </div>
                </div>
              ) : error && sharedSteps.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-red-400 mb-4">
                    <p className="text-lg font-medium">Failed to load shared steps</p>
                    <p className="text-sm text-gray-400 mt-2">{error}</p>
                  </div>
                  <Button onClick={() => fetchSharedSteps(1)}>
                    Try Again
                  </Button>
                </div>
              ) : sharedSteps.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No shared steps found</p>
                    <p className="text-sm">
                      {currentSearchTerm 
                        ? `No shared steps found matching "${currentSearchTerm}".`
                        : 'No shared steps available for this project.'
                      }
                    </p>
                    <Button
                      variant="secondary"
                      icon={Plus}
                      onClick={handleShowCreateForm}
                      disabled={disabled || !projectId}
                      className="mt-4"
                    >
                      Create Your First Shared Step
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedSteps.map((sharedStep) => (
                    <Card key={sharedStep.id} className="p-4 hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => handleSelectSharedStep(sharedStep)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <Layers className="w-4 h-4 text-purple-400 mr-2" />
                            <h3 className="font-semibold text-white">{sharedStep.title}</h3>
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              Shared
                            </span>
                          </div>
                          {sharedStep.description && (
                            <p className="text-sm text-gray-400 mb-2">{sharedStep.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            <span>{sharedStep.stepsCount} step{sharedStep.stepsCount !== 1 ? 's' : ''}</span>
                            <span>Used in {sharedStep.usedInCount} test case{sharedStep.usedInCount !== 1 ? 's' : ''}</span>
                            <div className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              <span>{sharedStep.createdBy.name}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Plus}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSharedStep(sharedStep);
                          }}
                          disabled={disabled}
                        >
                          {/* Always show "Add" since duplicates are allowed */}
                          Add
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="text-sm text-gray-400">
                  Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                  {pagination.totalItems} shared steps
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (currentSearchTerm.trim()) {
                        searchSharedSteps(currentSearchTerm, pagination.currentPage - 1);
                      } else {
                        fetchSharedSteps(pagination.currentPage - 1);
                      }
                    }}
                    disabled={pagination.currentPage === 1 || loading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-400">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (currentSearchTerm.trim()) {
                        searchSharedSteps(currentSearchTerm, pagination.currentPage + 1);
                      } else {
                        fetchSharedSteps(pagination.currentPage + 1);
                      }
                    }}
                    disabled={pagination.currentPage === pagination.totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Create Form Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Button
                  variant="secondary"
                  icon={ArrowLeft}
                  onClick={handleBackToList}
                  size="sm"
                  className="mr-3"
                  disabled={isCreatingSharedStep}
                >
                  Back
                </Button>
                <div>
                  <h3 className="text-lg font-medium text-white">Create New Shared Step</h3>
                  <p className="text-sm text-gray-400">Define reusable steps for your test cases</p>
                </div>
              </div>
            </div>

            {/* Create Form Content */}
            <div className="flex-1 overflow-y-auto px-2">
              <div className="space-y-8">
                {/* Title - Full width */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={createFormData.title}
                    onChange={(e) => handleCreateInputChange('title', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-lg"
                    required
                    disabled={isCreatingSharedStep}
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
                    {createTestSteps.length === 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        icon={Plus}
                        onClick={addCreateTestStep}
                        disabled={isCreatingSharedStep}
                        className="px-6 py-3"
                      >
                        Add Step
                      </Button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {createTestSteps.length > 0 ? (
                      <>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleCreateDragEnd}
                        >
                          <SortableContext
                            items={createTestSteps.map(step => step.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-4">
                              {createTestSteps.map((step, index) => (
                                <DraggableTestStepWithAutoUpload
                                  key={step.id}
                                  step={step}
                                  index={index}
                                  onUpdate={updateCreateTestStep}
                                  onRemove={removeCreateTestStep}
                                  disabled={isCreatingSharedStep}
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
                            onClick={addCreateTestStep}
                            disabled={isCreatingSharedStep}
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
                            onClick={addCreateTestStep}
                            disabled={isCreatingSharedStep}
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
                  {createTestSteps.length > 0 && (
                    <span>
                      {createTestSteps.length} step{createTestSteps.length !== 1 ? 's' : ''} defined
                    </span>
                  )}
                </div>
                <div className="flex space-x-4">
                  <Button 
                    variant="secondary" 
                    onClick={handleBackToList} 
                    disabled={isCreatingSharedStep}
                    size="lg"
                    className="px-8"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateSharedStep}
                    disabled={isCreatingSharedStep || !createFormData.title.trim()}
                    size="lg"
                    className="px-8"
                    icon={Save}
                  >
                    {isCreatingSharedStep ? (
                      <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Shared Step'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      </Modal>
  );
};

export default SharedStepSelectorModal;