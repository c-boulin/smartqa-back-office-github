import React, { useState, useEffect } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { DragEndEvent } from '@dnd-kit/core';
import Modal from '../UI/Modal';
import UpdateTestCaseForm from './UpdateTestCaseForm';
import UpdateTestCaseSteps from './UpdateTestCaseSteps';
import UpdateTestCaseAttachments from './UpdateTestCaseAttachments';
import UpdateTestCaseSidebar from './UpdateTestCaseSidebar';
import SharedStepSelectorModal from '../SharedStep/SharedStepSelectorModal';
import SharedStepViewModal from '../SharedStep/SharedStepViewModal';
import { useUsers } from '../../context/UsersContext';
import { useAuth } from '../../context/AuthContext';
import { useUpdateTestCaseData } from '../../hooks/useUpdateTestCaseData';
import { Tag } from '../../services/tagsApi';
import { SharedStep } from '../../services/sharedStepsApi';
import { TestCase } from '../../types';
import { attachmentsApiService } from '../../services/attachmentsApi';
import { getStateNumber, getPriorityNumber, getTestTypeNumber, buildStepResultsRelationships, buildSharedStepsRelationships } from '../../utils/updateTestCaseHelpers';

interface TestStep {
  id: string;
  step: string;
  result: string;
  originalId?: string;
}

interface UpdateTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  testCase: TestCase | null;
  isSubmitting: boolean;
  availableTags: Tag[];
  onCreateTag: (label: string) => Promise<Tag>;
  tagsLoading: boolean;
  selectedProject: { id: string; name: string } | null;
}

const UpdateTestCaseModal: React.FC<UpdateTestCaseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  testCase,
  isSubmitting,
  availableTags,
  onCreateTag,
  // tagsLoading,
  selectedProject // eslint-disable-line @typescript-eslint/no-unused-vars -- Project context needed
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
    state: 2,
    priority: 1,
    testCaseType: 6,
    automationStatus: 1
  });

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

  // Use the custom hook for data management
  const {
    testSteps,
    setTestSteps,
    sharedSteps,
    setSharedSteps,
    stepOrder,
    setStepOrder,
    selectedTags,
    setSelectedTags,
    existingAttachments,
    setExistingAttachments,
    loadingAttachments,
    isLoadingData, // eslint-disable-line @typescript-eslint/no-unused-vars -- Loading state needed
    loadTestCaseData,
    resetData,
    deleteSharedStepInstance
  } = useUpdateTestCaseData();

  // Populate form when testCase changes
  useEffect(() => {
    if (isOpen && testCase) {
      // Populate form with existing test case data
      setFormData({
        title: testCase.title,
        template: 1,
        description: testCase.description,
        preconditions: testCase.preconditions || '',
        owner: testCase.ownerId || '', // Use existing owner from test case
        state: getStateNumber(testCase.status),
        priority: getPriorityNumber(testCase.priority),
        testCaseType: getTestTypeNumber(testCase.type),
        automationStatus: testCase.automationStatus
      });

      setAttachments([]);
      loadTestCaseData(testCase, availableTags);
    } else if (isOpen && !testCase) {
      // Reset form for new test case - set current user as default
      const currentUser = users.find(user => user.email === authState.user?.email);
      setFormData({
        title: '',
        template: 1,
        description: '',
        preconditions: '',
        owner: currentUser?.id || '',
        state: 2,
        priority: 1,
        testCaseType: 6,
        automationStatus: 1
      });
      setAttachments([]);
      resetData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadTestCaseData and resetData are stable
  }, [isOpen, testCase, availableTags, users, authState.user]);

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
    // Handle both regular shared step removal and pivot-based removal
    if (sharedStepId.startsWith('pivot-')) {
      const pivotId = parseInt(sharedStepId.replace('pivot-', ''));
      console.log('🗑️ Removing shared step instance with pivot_id:', pivotId);
      
      // Call the deletion function with pivot ID
      deleteSharedStepInstance(pivotId).catch(error => {
        console.error('❌ Failed to delete shared step instance:', error);
        toast.error('Failed to delete shared step instance');
      });
    } else {
      // Legacy removal by shared step ID
      setSharedSteps(prev => prev.filter(step => step.id !== sharedStepId));
      setStepOrder(prev => prev.filter(item => !(item.type === 'shared' && item.id === `shared-${sharedStepId}`)));
    }
  };

  const viewSharedStep = (sharedStep: SharedStep) => {
    setSelectedSharedStepForView(sharedStep);
    setIsSharedStepViewOpen(true);
  };

  const handleAttachmentUploaded = (uploadData: { id: string; filename: string; url: string }) => {
    setUploadedAttachments(prev => [...prev, {
      file: uploadData.file,
      key: uploadData.key,
      cloudFrontUrl: uploadData.cloudFrontUrl,
      attachmentId: undefined
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
    
    // Create NEW attachments via API
    const newlyCreatedAttachments: Array<{
      type: "Attachment";
      id: string;
    }> = [];
    
    const attachmentsToCreate = uploadedAttachments.filter(uploaded => {
      const alreadyExists = existingAttachments.some(existing => 
        existing.url === uploaded.cloudFrontUrl
      );
      return !alreadyExists;
    });
    
    if (attachmentsToCreate.length > 0 && authState.user?.id) {
      for (const uploadedAttachment of attachmentsToCreate) {
        try {
          const attachmentResponse = await attachmentsApiService.createAttachment({
            url: uploadedAttachment.cloudFrontUrl,
            userId: authState.user.id
          });
          
          newlyCreatedAttachments.push({
            type: "Attachment",
            id: `/api/attachments/${attachmentResponse.data.attributes.id}`
          });
        } catch (error) {
          console.error('📎 Failed to create attachment:', error);
          throw error;
        }
      }
    }
    
    // Combine existing attachments with newly created ones
    const allAttachmentsForPayload: Array<{
      type: "Attachment";
      id: string;
    }> = [
      ...existingAttachments.map(existing => ({
        type: "Attachment" as const,
        id: `/api/attachments/${existing.id}`
      })),
      ...newlyCreatedAttachments
    ];
    
    const stepResultsRelationships = buildStepResultsRelationships(stepOrder, testSteps);
    const sharedStepsRelationships = buildSharedStepsRelationships(stepOrder, sharedSteps);
    
    // CRITICAL: Always send relationships arrays (empty if no items) to ensure API removes links
    const finalStepResultsRelationships = stepResultsRelationships.length > 0 ? stepResultsRelationships : [];
    const finalSharedStepsRelationships = sharedStepsRelationships.length > 0 ? sharedStepsRelationships : [];
    
    const submitData = {
      title: formData.title,
      description: formData.description,
      testSteps: testSteps,
      preconditions: formData.preconditions || '',
      owner: formData.owner,
      state: formData.state,
      priority: formData.priority,
      testCaseType: formData.testCaseType,
      automationStatus: formData.automationStatus,
      template: formData.template || 1,
      tags: selectedTags,
      stepResultsRelationships: finalStepResultsRelationships,
      sharedStepsRelationships: finalSharedStepsRelationships,
      createdAttachments: allAttachmentsForPayload
    };
    
    await onSubmit(submitData);
  };

  const handleCreateTag = async (label: string): Promise<Tag> => {
    return await onCreateTag(label);
  };

  const handleRemoveExistingAttachment = (attachmentId: string) => {
    setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Update Test Case"
      size="full"
    >
      <div className="h-[calc(95vh-8rem)] flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 flex overflow-hidden">
          {/* Main Content - 3/4 width */}
          <div className="flex-1 pr-6 overflow-y-auto">
            <UpdateTestCaseForm
              formData={formData}
              onInputChange={handleInputChange}
              isSubmitting={isSubmitting}
            />

            <div className="mt-6">
              <UpdateTestCaseSteps
                testSteps={testSteps}
                sharedSteps={sharedSteps}
                stepOrder={stepOrder}
                onAddTestStep={addTestStep}
                onUpdateTestStep={updateTestStep}
                onRemoveTestStep={removeTestStep}
                onRemoveSharedStep={removeSharedStep}
                onViewSharedStep={viewSharedStep}
                onDragEnd={handleDragEnd}
                onOpenSharedStepSelector={() => setIsSharedStepSelectorOpen(true)}
                isSubmitting={isSubmitting}
              />
            </div>

            <div className="mt-6">
              <UpdateTestCaseAttachments
                existingAttachments={existingAttachments}
                attachments={attachments}
                onFilesChange={setAttachments}
                onFileUploaded={handleAttachmentUploaded}
                onRemoveExistingAttachment={handleRemoveExistingAttachment}
                loadingAttachments={loadingAttachments}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>

          {/* Sidebar - 1/4 width */}
          <UpdateTestCaseSidebar
            formData={formData}
            onInputChange={handleInputChange}
            users={users}
            usersLoading={usersLoading}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            availableTags={availableTags}
            onCreateTag={handleCreateTag}
            isSubmitting={isSubmitting}
            onClose={onClose}
            onSubmit={handleSubmit}
          />
        </form>
      </div>

      {/* Shared Step Selector Modal */}
      <SharedStepSelectorModal
        isOpen={isSharedStepSelectorOpen}
        onClose={() => setIsSharedStepSelectorOpen(false)}
        onSelectSharedStep={addSharedStep}
        projectId={testCase?.projectId || null}
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

export default UpdateTestCaseModal;