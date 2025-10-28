import React from 'react';
import { Loader } from 'lucide-react';
import Button from '../UI/Button';
import IconSelect from '../UI/IconSelect';
import TagSelector from '../UI/TagSelector';
import { STATES, PRIORITIES, TEST_CASE_TYPES, AUTOMATION_STATUS } from '../../constants/testCaseConstants';
import { Tag } from '../../services/tagsApi';

interface UpdateTestCaseSidebarProps {
  formData: {
    owner: string;
    state: number;
    priority: number;
    testCaseType: number;
    automationStatus: number;
  };
  onInputChange: (field: string, value: string | number | Date | string[]) => void;
  users: Array<{ id: string; name: string }>;
  usersLoading: boolean;
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  availableTags: Tag[];
  onCreateTag: (label: string) => Promise<Tag>;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

const UpdateTestCaseSidebar: React.FC<UpdateTestCaseSidebarProps> = ({
  formData,
  onInputChange,
  users,
  usersLoading,
  selectedTags,
  onTagsChange,
  availableTags,
  onCreateTag,
  isSubmitting,
  onClose,
  onSubmit
}) => {
  return (
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
                onChange={(e) => onInputChange('owner', e.target.value)}
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
              onChange={(value) => {
                console.log('State IconSelect onChange called with value:', value);
                onInputChange('state', value);
              }}
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
              onChange={(value) => onInputChange('priority', value)}
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
              onChange={(e) => onInputChange('testCaseType', parseInt(e.target.value))}
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
              onChange={(e) => onInputChange('automationStatus', parseInt(e.target.value))}
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
                onTagsChange={onTagsChange}
                onCreateTag={onCreateTag}
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
            onClick={onSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Test Case'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpdateTestCaseSidebar;