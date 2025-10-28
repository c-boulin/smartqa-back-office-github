import React from 'react';
import { Plus, Layers } from 'lucide-react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Button from '../UI/Button';
import DraggableTestStepWithAutoUpload from './DraggableTestStepWithAutoUpload';
import DraggableSharedStep from './DraggableSharedStep';
import { ProcessedSharedStep } from '../../services/testCaseDataService';

interface TestStep {
  id: string;
  step: string;
  result: string;
  originalId?: string;
}

interface TestStepOrSharedStepInstance {
  type: 'step' | 'shared';
  id: string;
  step?: string;
  result?: string;
  originalId?: string;
  sharedStep?: ProcessedSharedStep;
}

interface UpdateTestCaseStepsProps {
  testSteps: TestStep[];
  sharedSteps: ProcessedSharedStep[];
  stepOrder: Array<{ type: 'step' | 'shared'; id: string }>;
  onAddTestStep: () => void;
  onUpdateTestStep: (id: string, field: 'step' | 'result', value: string) => void;
  onRemoveTestStep: (id: string) => void;
  onRemoveSharedStep: (sharedStepId: string) => void;
  onViewSharedStep: (sharedStep: ProcessedSharedStep) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onOpenSharedStepSelector: () => void;
  isSubmitting: boolean;
}

const UpdateTestCaseSteps: React.FC<UpdateTestCaseStepsProps> = ({
  testSteps,
  sharedSteps,
  stepOrder,
  onAddTestStep,
  onUpdateTestStep,
  onRemoveTestStep,
  onRemoveSharedStep,
  onViewSharedStep,
  onDragEnd,
  onOpenSharedStepSelector,
  isSubmitting
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoize the combined steps to prevent infinite re-renders
  const allSteps: TestStepOrSharedStepInstance[] = React.useMemo(() => {
    return stepOrder.map(orderItem => {
      if (orderItem.type === 'step') {
        const step = testSteps.find(s => s.id === orderItem.id);
        return step ? { type: 'step' as const, id: step.id, step: step.step, result: step.result, originalId: step.originalId } : null;
      } else {
        // Handle both new instance IDs (shared-{id}-{timestamp}) and existing pivot IDs (shared-{id}-{pivotId})
        const idParts = orderItem.id.split('-');
        if (idParts.length >= 3 && idParts[0] === 'shared') {
          const sharedStepId = idParts[1];
          const thirdPart = idParts[2];
          
          // Check if it's a pivot ID (from existing data) or timestamp (from new instances)
          const isPivotId = !isNaN(parseInt(thirdPart)) && parseInt(thirdPart) < 1000000000000; // Pivot IDs are smaller than timestamps
          
          if (isPivotId) {
            // Existing shared step with pivot ID
            const pivotId = parseInt(thirdPart);
            const sharedStep = sharedSteps.find(s => s.id === sharedStepId && s.pivotId === pivotId);
            return sharedStep ? { type: 'shared' as const, id: orderItem.id, sharedStep } : null;
          } else {
            // New shared step instance with timestamp
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
        }
        return null;
      }
    }).filter(Boolean) as TestStepOrSharedStepInstance[];
  }, [stepOrder, testSteps, sharedSteps]);

  return (
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
              onClick={onOpenSharedStepSelector}
              disabled={isSubmitting}
            >
              Add Shared Step
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={onAddTestStep}
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
              onDragEnd={onDragEnd}
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
                        result: item.result!,
                        originalId: item.originalId
                      }}
                      index={index}
                      onUpdate={onUpdateTestStep}
                      onRemove={onRemoveTestStep}
                      disabled={isSubmitting}
                    />
                  ) : (
                    <DraggableSharedStep
                      key={item.id}
                     sharedStep={item.sharedStep!}
                     uniqueId={item.id}
                      index={index}
                      onRemove={(sharedStepId) => {
                        // Extract pivot ID from the combined ID and call removal with pivot ID
                        const idParts = item.id.split('-');
                        if (idParts.length >= 3 && idParts[0] === 'shared') {
                          const pivotId = parseInt(idParts[2]);
                          console.log('🗑️ Removing shared step instance with pivot_id:', pivotId);
                          onRemoveSharedStep(`pivot-${pivotId}`); // Pass pivot ID for deletion
                        } else {
                          onRemoveSharedStep(sharedStepId);
                        }
                      }}
                      onView={onViewSharedStep}
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
                onClick={onOpenSharedStepSelector}
                disabled={isSubmitting}
              >
                Add Shared Step
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={onAddTestStep}
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
  );
};

export default UpdateTestCaseSteps;