import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import Button from '../UI/Button';
import WysiwygEditor from '../UI/WysiwygEditor';

interface TestStep {
  id: string;
  step: string;
  result: string;
  originalId?: string; // For tracking API step result ID
}

interface DraggableTestStepProps {
  step: TestStep;
  index: number;
  onUpdate: (id: string, field: 'step' | 'result', value: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const DraggableTestStep: React.FC<DraggableTestStepProps> = ({
  step,
  index,
  onUpdate,
  onRemove,
  disabled = false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-all ${
        isDragging ? 'opacity-50 shadow-2xl z-50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-medium text-slate-900 dark:text-white">Step {index + 1}</h4>
        </div>
        <Button
          type="button"
          variant="danger"
          size="sm"
          icon={Trash2}
          onClick={() => onRemove(step.id)}
          disabled={disabled}
          className="p-2"
          title="Remove step"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-2">
            Step
          </label>
          <WysiwygEditor
            value={step.step}
            onChange={(value) => onUpdate(step.id, 'step', value)}
            placeholder="Describe the action to perform"
            disabled={disabled}
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-2">
            Expected Result
          </label>
          <WysiwygEditor
            value={step.result}
            onChange={(value) => onUpdate(step.id, 'result', value)}
            placeholder="Describe the expected result"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

export default DraggableTestStep;