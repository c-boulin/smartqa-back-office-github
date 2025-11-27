import React from 'react';
import WysiwygEditorWithAutoUpload from '../UI/WysiwygEditorWithAutoUpload';

interface UpdateTestCaseFormProps {
  formData: {
    title: string;
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
      {/* Title */}
      <div className="px-1">
        <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onInputChange('title', e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:ring-offset-0"
          required
          disabled={isSubmitting}
          placeholder="Enter test case title"
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="px-1">
        <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
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
        <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
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