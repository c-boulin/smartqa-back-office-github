import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Layers, Eye } from 'lucide-react';
import Button from '../UI/Button';
import { SharedStep } from '../../services/sharedStepsApi';

interface DraggableSharedStepProps {
  sharedStep: SharedStep;
  uniqueId?: string;
  index: number;
  onRemove: (sharedStepId: string) => void;
  onView?: (sharedStep: SharedStep) => void;
  disabled?: boolean;
}

const DraggableSharedStep: React.FC<DraggableSharedStepProps> = ({
  sharedStep,
  uniqueId,
  index,
  onRemove,
  onView,
  disabled = false
}) => {
  // Use uniqueId for drag and drop if provided, otherwise fall back to sharedStep.id
  const dragId = uniqueId || sharedStep.id;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dragId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };


  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-800/50 dark:to-purple-900/50 border-2 border-purple-300 dark:border-purple-500/50 rounded-lg transition-all ${
        isDragging ? 'opacity-50 shadow-2xl z-50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h4 className="text-sm font-medium text-slate-900 dark:text-white">Step {index + 1}</h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-200 dark:bg-purple-500/30 text-purple-800 dark:text-purple-300 border border-purple-400 dark:border-purple-400/50">
              Shared Step
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {onView && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Eye}
              onClick={() => onView(sharedStep)}
              disabled={disabled}
              className="p-2"
              title="View shared step details"
            />
          )}
          <Button
            type="button"
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => onRemove(dragId)}
            disabled={disabled}
            className="p-2"
            title="Remove shared step"
          />
        </div>
      </div>
      
      <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-500/30 rounded-lg p-3">
        <div className="mb-2">
          <h5 className="font-medium text-purple-900 dark:text-purple-200 mb-1">
            {sharedStep.title}
          </h5>
          {sharedStep.description && (
            <p className="text-sm text-purple-700 dark:text-purple-300/80">{sharedStep.description}</p>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300/60">
          <span>{sharedStep.stepsCount} step{sharedStep.stepsCount !== 1 ? 's' : ''} and result{sharedStep.stepsCount !== 1 ? 's' : ''}</span>
          <span>Used in {sharedStep.usedInCount} test case{sharedStep.usedInCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};

export default DraggableSharedStep;