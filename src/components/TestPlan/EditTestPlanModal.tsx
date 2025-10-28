import React, { useState, useEffect } from 'react';
import { Loader, Save, User, SquarePen, Calendar, X } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import DatePicker from '../UI/DatePicker';
import { useUsers } from '../../context/UsersContext';
import { TestPlan } from '../../services/testPlansApi';
import { formatDateForAPI, parseDateFromInput, formatDateForInput, validateDateRange } from '../../utils/dateHelpers';

interface EditTestPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    assignedTo: string;
    dateStart?: string;
    dateEnd?: string;
  }) => Promise<void>;
  testPlan: TestPlan | null;
  isSubmitting: boolean;
}

const EditTestPlanModal: React.FC<EditTestPlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  testPlan,
  isSubmitting
}) => {
  const { users, loading: usersLoading } = useUsers();
  const [formData, setFormData] = useState({
    title: '',
    assignedTo: '',
    dateStart: '',
    dateEnd: ''
  });
  const [dateError, setDateError] = useState<string | null>(null);

  // Populate form when testPlan changes
  useEffect(() => {
    if (isOpen && testPlan) {
      setFormData({
        title: testPlan.title,
        assignedTo: testPlan.assignedTo || '',
        dateStart: testPlan.dateStart ? formatDateForInput(testPlan.dateStart) : '',
        dateEnd: testPlan.dateEnd ? formatDateForInput(testPlan.dateEnd) : ''
      });
      setDateError(null);
    } else if (isOpen && !testPlan) {
      setFormData({
        title: '',
        assignedTo: '',
        dateStart: '',
        dateEnd: ''
      });
      setDateError(null);
    }
  }, [isOpen, testPlan]);

  const handleInputChange = (field: string, value: string | number | Date) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear date error when dates change
    if (field === 'dateStart' || field === 'dateEnd') {
      setDateError(null);
    }
  };

  const validateForm = (): boolean => {
    // Validate date range if both dates are provided
    if (formData.dateStart && formData.dateEnd) {
      const startDate = parseDateFromInput(formData.dateStart);
      const endDate = parseDateFromInput(formData.dateEnd);
      const error = validateDateRange(startDate, endDate);
      
      if (error) {
        setDateError(error);
        return false;
      }
    }
    
    setDateError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Convert dates to API format
    const submitData = {
      title: formData.title,
      assignedTo: formData.assignedTo,
      dateStart: formData.dateStart ? formatDateForAPI(parseDateFromInput(formData.dateStart)!) : undefined,
      dateEnd: formData.dateEnd ? formatDateForAPI(parseDateFromInput(formData.dateEnd)!) : undefined
    };
    
    await onSubmit(submitData);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={null}
      size="md"
    >
      <div className="relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors z-10"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Beautiful Header */}
        <div className="text-center mb-4 pr-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-500/30 mb-4">
            <SquarePen className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Edit Test Plan</h2>
          <p className="text-sm text-gray-400">Update your testing strategy and timeline</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Test Plan Details Card */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-slate-600/50 rounded-xl p-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all text-lg font-medium"
                required
                disabled={isSubmitting}
                placeholder="Enter test plan title..."
              />
            </div>
          </div>
          
          {/* Owner Selection Card */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-slate-600/50 rounded-xl p-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Owner
            </label>
            {usersLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="text-center">
                  <Loader className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Loading team members...</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={formData.assignedTo}
                  onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Choose plan owner...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {/* Timeline Card */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-slate-600/50 rounded-xl p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DatePicker
                value={formData.dateStart}
                onChange={(value) => handleInputChange('dateStart', value)}
                label="Starting Date"
                disabled={isSubmitting}
                className="relative"
              />
              
              <DatePicker
                value={formData.dateEnd}
                onChange={(value) => handleInputChange('dateEnd', value)}
                label="Ending Date"
                disabled={isSubmitting}
                min={formData.dateStart}
                error={dateError || undefined}
                className="relative"
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700/50">
            <Button 
              variant="secondary" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="px-3"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              icon={Save}
              className="px-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 shadow-lg hover:shadow-cyan-500/25"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Update Test Plan
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditTestPlanModal;