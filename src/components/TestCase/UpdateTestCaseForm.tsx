import React from 'react';
import WysiwygEditorWithAutoUpload from '../UI/WysiwygEditorWithAutoUpload';
import { TEMPLATES } from '../../constants/testCaseConstants';

interface UpdateTestCaseFormProps {
  formData: {
    title: string;
    template: number;
    description: string;
    preconditions: string;
  };
  onInputChange: (field: string, value: string | number | Date | string[]) => void;
  isSubmitting: boolean;
}

const UpdateTestCaseForm: React.FC<UpdateTestCaseFormProps> = ({
  formData,
  onInputChange,
  isSubmitting
}) => {
  return (
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
            onChange={(e) => onInputChange('title', e.target.value)}
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
            onChange={(e) => onInputChange('template', parseInt(e.target.value))}
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
          onChange={(value) => onInputChange('description', value)}
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
          onChange={(value) => onInputChange('preconditions', value)}
          fieldName="precondition"
          placeholder="Enter preconditions for this test case"
          disabled={isSubmitting}
          autoProcessImages={true}
        />
      </div>
    </div>
  );
};

export default UpdateTestCaseForm;