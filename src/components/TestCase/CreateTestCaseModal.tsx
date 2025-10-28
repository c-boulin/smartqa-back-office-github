import React, { useState, useEffect } from 'react';
import { Plus, Loader, CheckCircle, SquarePen, Eye, Clock, XCircle, AlertTriangle, Target, Shield, Flame, Layers } from 'lucide-react';
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
import TagSelector from '../UI/TagSelector';
import FileUpload from '../UI/FileUpload';
import WysiwygEditorWithAutoUpload from '../UI/WysiwygEditorWithAutoUpload';
import DraggableTestStepWithAutoUpload from './DraggableTestStepWithAutoUpload';
import DraggableSharedStep from './DraggableSharedStep';
import SharedStepSelectorModal from '../SharedStep/SharedStepSelectorModal';
import SharedStepViewModal from '../SharedStep/SharedStepViewModal';
import { useUsers } from '../../context/UsersContext';
import { useAuth } from '../../context/AuthContext';
import { Tag } from '../../services/tagsApi';
import { SharedStep } from '../../services/sharedStepsApi';
import { attachmentsApiService } from '../../services/attachmentsApi';

// Mappings constants
const TEMPLATES = {
  1: 'Test Case Steps',
  2: 'Test Case Bdd'
} as const;

const STATES = {
  1: { label: 'Active', icon: CheckCircle, color: 'text-green-400' },
  2: { label: 'Draft', icon: SquarePen, color: 'text-orange-400' },
  3: { label: 'In Review', icon: Eye, color: 'text-blue-400' },
  4: { label: 'Outdated', icon: Clock, color: 'text-gray-400' },
  5: { label: 'Rejected', icon: XCircle, color: 'text-red-400' }
} as const;

const PRIORITIES = {
  1: { label: 'Low', icon: Shield, color: 'text-green-400' },
  2: { label: 'Medium', icon: Target, color: 'text-yellow-400' },
  3: { label: 'High', icon: Flame, color: 'text-orange-500' },
  4: { label: 'Critical', icon: AlertTriangle, color: 'text-red-500' }
} as const;

const TEST_CASE_TYPES = {
  1: 'Other',
  2: 'Acceptance',
  3: 'Accessibility',
  4: 'Compatibility',
  5: 'Destructive',
  6: 'Functional',
  7: 'Performance',
  8: 'Regression',
  9: 'Security',
  10: 'Smoke & Sanity',
  11: 'Usability'
} as const;

const AUTOMATION_STATUS = {
  1: 'Not automated',
  2: 'Automated',
  3: 'Automation not required',
  4: 'Cannot be automated',
  5: 'Obsolete'
} as const;

interface TestStep {
  id: string;
  step: string;
  result: string;
}

interface TestStepOrSharedStep {
  type: 'step' | 'shared';
  id: string;
  step?: string;
  result?: string;
  sharedStep?: SharedStep;
}

interface CreateTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  availableTags: Tag[];
  onCreateTag: (label: string) => Promise<Tag>;
  tagsLoading: boolean;
  selectedProject: { id: string; name: string } | null;
}

// Custom Select Component with Icons
const IconSelect: React.FC<{
  value: number;
  onChange: (value: number) => void;
  options: Record<number, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }>;
  disabled?: boolean;
  placeholder?: string;
}> = ({ value, onChange, options, disabled = false, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options[value];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm text-left flex items-center justify-between"
      >
        <div className="flex items-center">
          {selectedOption && (
            <>
              <selectedOption.icon className={`w-4 h-4 mr-2 ${selectedOption.color}`} />
              <span>{selectedOption.label}</span>
            </>
          )}
          {!selectedOption && placeholder && (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {Object.entries(options).map(([optionValue, { label, icon: Icon, color }]) => (
              <button
                key={optionValue}
                type="button"
                onClick={() => {
                  onChange(parseInt(optionValue));
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors flex items-center text-sm"
              >
                <Icon className={`w-4 h-4 mr-2 ${color}`} />
                <span className="text-white">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const CreateTestCaseModal: React.FC<CreateTestCaseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  availableTags,
  onCreateTag,
  // tagsLoading,
  selectedProject
}) => {
  const { state: authState } = useAuth();
  const { users, loading: usersLoading } = useUsers();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    template: 1,
    description: '',
    preconditions: '',
    owner: '',
    state: 2, // Draft by default
    priority: 2, // Medium by default
    testCaseType: 6, // Functional by default
    automationStatus: 1 // Not automated by default
  });

  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [sharedSteps, setSharedSteps] = useState<SharedStep[]>([]);
  const [stepOrder, setStepOrder] = useState<Array<{ type: 'step' | 'shared'; id: string }>>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Array<{
    file: File;
    key: string;
    cloudFrontUrl: string;
    attachmentId?: string;
  }>>([]);

  // Modal states for shared step selection
  const [isSharedStepSelectorOpen, setIsSharedStepSelectorOpen] = useState(false);
  const [isSharedStepViewOpen, setIsSharedStepViewOpen] = useState(false);
  const [selectedSharedStepForView, setSelectedSharedStepForView] = useState<SharedStep | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Set current user as default owner when users are loaded
  useEffect(() => {
    if (users.length > 0 && authState.user) {
      const currentUser = users.find(user => user.email === authState.user?.email);
      if (currentUser) {
        setFormData(prev => ({ ...prev, owner: currentUser.id }));
      }
    }
  }, [users, authState.user]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset form
      setFormData({
        title: '',
        template: 1,
        description: '',
        preconditions: '',
        owner: '', // Will be set by the user effect above
        state: 2,
        priority: 2,
        testCaseType: 6,
        automationStatus: 1
      });
      setTestSteps([]);
      setSharedSteps([]);
      setStepOrder([]);
      setSelectedTags([]);
      setAttachments([]);
      setUploadedAttachments([]);
      
      // Set current user as default owner when modal opens
      if (users.length > 0 && authState.user) {
        const currentUser = users.find(user => user.email === authState.user?.email);
        if (currentUser) {
          setFormData(prev => ({ ...prev, owner: currentUser.id }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- authState.user and users are complex objects
  }, [isOpen]);

  const handleInputChange = (field: string, value: string | number | Date | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTestStep = () => {
    const newStep: TestStep = {
      id: Date.now().toString(),
      step: '',
      result: ''
    };
    setTestSteps(prev => [...prev, newStep]);
    setStepOrder(prev => [...prev, { type: 'step', id: newStep.id }]);
  };

  const updateTestStep = (id: string, field: 'step' | 'result', value: string) => {
    setTestSteps(prev => prev.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const removeTestStep = (id: string) => {
    setTestSteps(prev => prev.filter(step => step.id !== id));
    setStepOrder(prev => prev.filter(item => !(item.type === 'step' && item.id === id)));
  };

  const addSharedStep = (sharedStep: SharedStep) => {
    // Allow adding the same shared step multiple times
    // Create a unique instance ID using timestamp to differentiate duplicates
    const instanceId = `shared-${sharedStep.id}-${Date.now()}`;
    
    setSharedSteps(prev => [...prev, sharedStep]);
    setStepOrder(prev => [...prev, { type: 'shared', id: instanceId }]);
  };

  const removeSharedStep = (sharedStepId: string) => {
    // Find the index of the shared step instance to remove
    const orderIndex = stepOrder.findIndex(item => item.type === 'shared' && item.id === sharedStepId);
    
    if (orderIndex !== -1) {
      // Remove from sharedSteps array at the same index
      setSharedSteps(prev => prev.filter((_, index) => {
        // Count shared step instances before this order index
        let sharedStepIndex = 0;
        for (let i = 0; i < orderIndex; i++) {
          if (stepOrder[i].type === 'shared') {
            sharedStepIndex++;
          }
        }
        return index !== sharedStepIndex;
      }));
      
      // Remove from stepOrder
      setStepOrder(prev => prev.filter(item => item.id !== sharedStepId));
    }
  };

  const viewSharedStep = (sharedStep: SharedStep) => {
    setSelectedSharedStepForView(sharedStep);
    setIsSharedStepViewOpen(true);
  };

  // Combine test steps and shared steps for drag and drop
  const allSteps: TestStepOrSharedStep[] = stepOrder.map(orderItem => {
    if (orderItem.type === 'step') {
      const step = testSteps.find(s => s.id === orderItem.id);
      return step ? { type: 'step' as const, id: step.id, step: step.step, result: step.result } : null;
    } else {
      // Extract shared step ID from instance ID (format: shared-{id}-{timestamp})
      const idParts = orderItem.id.split('-');
      if (idParts.length >= 3 && idParts[0] === 'shared') {
        // const sharedStepId = idParts[1]; // Extracted but unused
        
        // Find the shared step instance at the correct position
        let sharedStepIndex = 0;
        const currentOrderIndex = stepOrder.findIndex(item => item.id === orderItem.id);
        
        // Count shared step instances before this position
        for (let i = 0; i < currentOrderIndex; i++) {
          if (stepOrder[i].type === 'shared') {
            sharedStepIndex++;
          }
        }
        
        const sharedStep = sharedSteps[sharedStepIndex];
        return sharedStep ? { type: 'shared' as const, id: orderItem.id, sharedStep } : null;
      }
      return null;
    }
  }).filter(Boolean) as TestStepOrSharedStep[];

  const handleAttachmentUploaded = (uploadData: { id: string; filename: string; url: string }) => {
    console.log('📎 Attachment uploaded successfully:', uploadData);
    
    setUploadedAttachments(prev => [...prev, {
      file: uploadData.file,
      key: uploadData.key,
      cloudFrontUrl: uploadData.cloudFrontUrl,
      attachmentId: undefined // Will be set when attachment is created via API
    }]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stepOrder.findIndex(item => item.id === active.id);
      const newIndex = stepOrder.findIndex(item => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedOrder = arrayMove(stepOrder, oldIndex, newIndex);
        setStepOrder(reorderedOrder);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // STEP 1: Create attachments via API first
    const createdAttachments: Array<{
      type: "Attachment";
      id: string;
    }> = [];
    
    if (uploadedAttachments.length > 0 && authState.user?.id) {
      console.log('📎 Step 1: Creating', uploadedAttachments.length, 'attachments via API...');
      
      for (const uploadedAttachment of uploadedAttachments) {
        try {
          console.log('📎 Creating attachment for:', uploadedAttachment.file.name);
          
          const attachmentResponse = await attachmentsApiService.createAttachment({
            url: uploadedAttachment.cloudFrontUrl,
            userId: authState.user.id
          });
          
          createdAttachments.push({
            type: "Attachment",
            id: `/api/attachments/${attachmentResponse.data.attributes.id}`
          });
          
          console.log('✅ Created attachment with ID:', attachmentResponse.data.attributes.id);
        } catch (error) {
          console.error('❌ Failed to create attachment:', error);
          throw new Error(`Failed to create attachment for ${uploadedAttachment.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      console.log('📎 Step 1 & 2 Complete: All attachments created and transformed:', createdAttachments);
    }
    
    // Process stepOrder array - order is simply position in list (1, 2, 3, etc.)
    const stepResultsRelationships: Array<{ type: string; id: string }> = [];
    const sharedStepsRelationships: Array<{ type: string; id: string }> = [];
    
    for (let position = 0; position < stepOrder.length; position++) {
      const orderItem = stepOrder[position];
      const order = position + 1; // Position 0 = order 1, position 1 = order 2, etc.

      if (orderItem.type === 'step') {
        const step = testSteps.find(s => s.id === orderItem.id);
        if (step) {
          stepResultsRelationships.push({
            type: "StepResult",
            id: step.id, // Will be replaced with actual step result ID after creation
            meta: {
              order: order
            }
          });
        }
      } else if (orderItem.type === 'shared') {
        // Extract shared step ID from instance ID (format: shared-{id}-{timestamp})
        const idParts = orderItem.id.split('-');
        if (idParts.length >= 3 && idParts[0] === 'shared') {
          // const sharedStepId = idParts[1]; // Extracted but unused
          
          // Find the shared step instance at the correct position
          let sharedStepIndex = 0;
          for (let i = 0; i < position; i++) {
            if (stepOrder[i].type === 'shared') {
              sharedStepIndex++;
            }
          }
          
          const sharedStep = sharedSteps[sharedStepIndex];
          if (sharedStep) {
            sharedStepsRelationships.push({
              type: "SharedStep",
              id: `/api/shared_steps/${sharedStep.id}`,
              meta: {
                order: order
              }
            });
          }
        }
      }
    }
    
    const submitData = {
      title: formData.title,
      template: formData.template,
      description: formData.description,
      preconditions: formData.preconditions,
      priority: formData.priority, // Send the numeric value directly
      testCaseType: formData.testCaseType, // Send the numeric value directly  
      state: formData.state, // Send the numeric value directly
      automationStatus: formData.automationStatus,
      tags: selectedTags,
      testSteps: testSteps,
      stepResultsRelationships,
      sharedStepsRelationships,
      creatorId: authState.user?.id,
      createdAttachments
    };

    console.log('📎 MODAL: Passing createdAttachments to hook:', createdAttachments);

    await onSubmit(submitData);
  };

  const handleCreateTag = async (label: string): Promise<Tag> => {
    return await onCreateTag(label);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create New Test Case"
      size="full"
    >
      <div className="h-[calc(95vh-8rem)] flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 flex overflow-hidden">
          {/* Main Content - 3/4 width */}
          <div className="flex-1 pr-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Title and Template on same line */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-1">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-0 min-w-0"
                    required
                    disabled={isSubmitting}
                    placeholder="Enter test case title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Template
                  </label>
                  <select
                    value={formData.template}
                    onChange={(e) => handleInputChange('template', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    disabled={isSubmitting}
                  >
                    {Object.entries(TEMPLATES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="px-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <WysiwygEditorWithAutoUpload
                  value={formData.description}
                  onChange={(value) => handleInputChange('description', value)}
                  fieldName="description"
                  placeholder="Enter test case description"
                  disabled={isSubmitting}
                  autoProcessImages={true}
                />
              </div>

              {/* Preconditions */}
              <div className="px-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Preconditions
                </label>
                <WysiwygEditorWithAutoUpload
                  value={formData.preconditions}
                  onChange={(value) => handleInputChange('preconditions', value)}
                  fieldName="precondition"
                  placeholder="Enter preconditions for this test case"
                  disabled={isSubmitting}
                  autoProcessImages={true}
                />
              </div>

              {/* Steps and Results with Drag & Drop */}
              <div>
                {/* Header - only show buttons here when list is empty */}
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-300">
                    Steps and Results
                  </label>
                  {allSteps.length === 0 && (
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={Layers}
                        onClick={() => setIsSharedStepSelectorOpen(true)}
                        disabled={isSubmitting}
                      >
                        Add Shared Step
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={Plus}
                        onClick={addTestStep}
                        disabled={isSubmitting}
                      >
                        Add Step
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {allSteps.length > 0 ? (
                    <>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={allSteps.map(step => step.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {allSteps.map((item, index) => (
                            item.type === 'step' ? (
                              <DraggableTestStepWithAutoUpload
                                key={item.id}
                                step={{
                                  id: item.id,
                                  step: item.step!,
                                  result: item.result!
                                }}
                                index={index}
                                onUpdate={updateTestStep}
                                onRemove={removeTestStep}
                                disabled={isSubmitting}
                              />
                            ) : (
                              <DraggableSharedStep
                                key={item.id}
                                sharedStep={item.sharedStep!}
                                uniqueId={item.id}
                                index={index}
                                onRemove={removeSharedStep}
                                onView={viewSharedStep}
                                disabled={isSubmitting}
                              />
                            )
                          ))}
                        </SortableContext>
                      </DndContext>
                      
                      {/* Buttons below the list when there are entries */}
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          icon={Layers}
                          onClick={() => setIsSharedStepSelectorOpen(true)}
                          disabled={isSubmitting}
                        >
                          Add Shared Step
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          icon={Plus}
                          onClick={addTestStep}
                          disabled={isSubmitting}
                        >
                          Add Step
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-slate-600 rounded-lg">
                      <p>No steps added yet.</p>
                      <p className="text-sm">Add test steps or shared steps to define the test case workflow.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Attachments
                </label>
                <FileUpload
                  files={attachments}
                  onFilesChange={setAttachments}
                  onFileUploaded={handleAttachmentUploaded}
                  disabled={isSubmitting}
                  accept="*/*"
                  multiple={true}
                  maxSize={10}
                />
              </div>
            </div>
          </div>

          {/* Sidebar - 1/4 width */}
          <div className="w-80 border-l border-slate-700 pl-6 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 pl-2 pr-2">
                {/* Owner */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Owner
                  </label>
                  {usersLoading ? (
                    <div className="flex items-center text-gray-400 text-sm">
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Loading users...
                    </div>
                  ) : (
                    <select
                      value={formData.owner}
                      onChange={(e) => handleInputChange('owner', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm max-w-full"
                      disabled={isSubmitting}
                      required
                    >
                      <option value="">Select owner</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    State
                  </label>
                  <IconSelect
                    value={formData.state}
                    onChange={(value) => handleInputChange('state', value)}
                    options={STATES}
                    disabled={isSubmitting}
                    placeholder="Select state"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Priority
                  </label>
                  <IconSelect
                    value={formData.priority}
                    onChange={(value) => handleInputChange('priority', value)}
                    options={PRIORITIES}
                    disabled={isSubmitting}
                    placeholder="Select priority"
                  />
                </div>

                {/* Type of Test Case */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type of Test Case
                  </label>
                  <select
                    value={formData.testCaseType}
                    onChange={(e) => handleInputChange('testCaseType', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm max-w-full"
                    disabled={isSubmitting}
                  >
                    {Object.entries(TEST_CASE_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Automation Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Automation Status
                  </label>
                  <select
                    value={formData.automationStatus}
                    onChange={(e) => handleInputChange('automationStatus', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm max-w-full"
                    disabled={isSubmitting}
                  >
                    {Object.entries(AUTOMATION_STATUS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tags
                  </label>
                  <div className="max-w-full">
                    <TagSelector
                      availableTags={availableTags}
                      selectedTags={selectedTags}
                      onTagsChange={setSelectedTags}
                      onCreateTag={handleCreateTag}
                      disabled={isSubmitting}
                      placeholder="Search or create tags..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Moved inside sidebar */}
            <div className="border-t border-slate-700 pt-4 mt-4 flex-shrink-0">
              <div className="flex flex-col space-y-3">
                <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="w-full">
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Test Case'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Shared Step Selector Modal */}
      <SharedStepSelectorModal
        isOpen={isSharedStepSelectorOpen}
        onClose={() => setIsSharedStepSelectorOpen(false)}
        onSelectSharedStep={addSharedStep}
        projectId={selectedProject?.id || null}
        disabled={isSubmitting}
      />

      {/* Shared Step View Modal */}
      <SharedStepViewModal
        isOpen={isSharedStepViewOpen}
        onClose={() => setIsSharedStepViewOpen(false)}
        sharedStep={selectedSharedStepForView}
      />
    </Modal>
  );
};

export default CreateTestCaseModal;