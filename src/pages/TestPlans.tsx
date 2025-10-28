import React, { useState, useCallback } from 'react';
import { Plus, Search, SquarePen, Trash2, ChevronLeft, ChevronRight, Loader, Calendar, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import CreateTestPlanModal from '../components/TestPlan/CreateTestPlanModal';
import EditTestPlanModal from '../components/TestPlan/EditTestPlanModal';
import { useApp } from '../context/AppContext';
import { useUsers } from '../context/UsersContext';
import { useTestPlans } from '../hooks/useTestPlans';
import { TestPlan } from '../services/testPlansApi';
import toast from 'react-hot-toast';

const TestPlans: React.FC = () => {
  const { getSelectedProject } = useApp();
  // const { state: authState } = useAuth();
  const navigate = useNavigate();
  const { users } = useUsers();
  const selectedProject = getSelectedProject();
  
  const {
    testPlans,
    loading,
    error,
    pagination,
    fetchTestPlans,
    searchTestPlans,
    createTestPlan,
    updateTestPlan,
    updateTestPlanStatus,
    deleteTestPlan
  } = useTestPlans(selectedProject?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTestPlan, setSelectedTestPlan] = useState<TestPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [appliedOwnerFilter, setAppliedOwnerFilter] = useState('all');

  const searchTestPlansWithOwner = async (_term: string, _ownerId: string) => {
    // Implementation needed
  };

  const filterTestPlansByOwner = async (_ownerId: string) => {
    // Implementation needed
  };

  const applyOwnerFilter = () => {
    setAppliedOwnerFilter(ownerFilter);
    const userId = ownerFilter !== 'all' ? ownerFilter : undefined;
    
    if (currentSearchTerm.trim()) {
      searchTestPlans(currentSearchTerm, 1, userId);
    } else {
      fetchTestPlans(1, undefined, userId);
    }
  };

  const clearOwnerFilter = () => {
    setOwnerFilter('all');
    setAppliedOwnerFilter('all');
    setSearchTerm('');
    setCurrentSearchTerm('');
    fetchTestPlans(1);
  };

  const getOwnerName = (ownerId: string) => {
    const user = users.find(u => u.id === ownerId);
    return user?.name || 'Unknown';
  };

  const handleTestPlanClick = useCallback((testPlan: TestPlan) => {
    console.log('📋 Test plan clicked:', testPlan.title, 'ID:', testPlan.id);
    navigate(`/test-plans/${testPlan.id}`);
  }, [navigate]);

  const filteredTestPlans = testPlans;

  const handleSearch = useCallback(async (term: string) => {
    setCurrentSearchTerm(term);
    if (term.trim()) {
      if (appliedOwnerFilter !== 'all') {
        await searchTestPlansWithOwner(term, appliedOwnerFilter);
      } else {
        await searchTestPlans(term);
      }
    } else {
      if (appliedOwnerFilter !== 'all') {
        await filterTestPlansByOwner(appliedOwnerFilter);
      } else {
        await fetchTestPlans(1);
      }
    }
  }, [searchTestPlans, fetchTestPlans, appliedOwnerFilter]);

  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchTerm);
    }
  }, [searchTerm, handleSearch]);

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleCreateTestPlan = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedProject || !data.assignedTo) {
      toast.error('Please select an owner');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await createTestPlan({
        title: data.title,
        projectId: selectedProject.id,
        assignedTo: data.assignedTo,
        dateStart: data.dateStart,
        dateEnd: data.dateEnd
      });
      
      setIsCreateModalOpen(false);
      
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedProject is stable
  }, [createTestPlan]);

  const handleEditTestPlan = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedTestPlan) {
      toast.error('No test plan selected');
      return;
    }

    if (!selectedProject) {
      toast.error('No project selected');
      return;
    }
    try {
      setIsSubmitting(true);
      
      await updateTestPlan(selectedTestPlan.id, {
        title: data.title,
        projectId: selectedProject.id,
        assignedTo: data.assignedTo,
        dateStart: data.dateStart,
        dateEnd: data.dateEnd
      });
      
      setIsEditModalOpen(false);
      setSelectedTestPlan(null);
      
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedProject is stable
  }, [updateTestPlan, selectedTestPlan]);

  const handleDeleteTestPlan = useCallback(async () => {
    if (!selectedTestPlan) return;
    
    try {
      setIsSubmitting(true);
      await deleteTestPlan(selectedTestPlan.id);
      setSelectedTestPlan(null);
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  }, [deleteTestPlan, selectedTestPlan]);

  const openEditModal = useCallback((testPlan: TestPlan) => {
    setSelectedTestPlan(testPlan);
    setIsEditModalOpen(true);
  }, []);

  const openDeleteDialog = useCallback((testPlan: TestPlan) => {
    setSelectedTestPlan(testPlan);
    setIsDeleteDialogOpen(true);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    if (currentSearchTerm.trim()) {
      searchTestPlans(currentSearchTerm, page);
    } else {
      fetchTestPlans(page);
    }
  }, [currentSearchTerm, searchTestPlans, fetchTestPlans]);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedTestPlan(null);
  }, []);

  if (loading && testPlans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading test plans...</p>
        </div>
      </div>
    );
  }

  if (error && testPlans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load test plans</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={() => fetchTestPlans(1)}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Test Plans</h2>
          <p className="text-gray-400">
            {selectedProject 
              ? `Manage test plans for ${selectedProject.name} (${pagination.totalItems} total)` 
              : `Manage test plans across all projects (${pagination.totalItems} total)`
            }
          </p>
          {selectedProject && (
            <div className="mt-2">
              <div className="inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-400">
                📁 Project: {selectedProject.name}
              </div>
            </div>
          )}
        </div>
        <Button 
          icon={Plus} 
          onClick={() => setIsCreateModalOpen(true)}
          disabled={!selectedProject}
          title={!selectedProject ? 'Please select a project first' : 'Create new test plan'}
        >
          New Test Plan
        </Button>
      </div>

      {/* Show message if no project selected */}
      {/* Search */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search test plans by title..."
                value={searchTerm}
                onChange={handleSearchInputChange}
                onKeyPress={handleSearchKeyPress}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="all">All Owners</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              onClick={applyOwnerFilter}
              disabled={ownerFilter === appliedOwnerFilter}
            >
              Apply Filter
            </Button>
          </div>
        </div>

        {/* Active filters display */}
        {(currentSearchTerm || appliedOwnerFilter !== 'all') && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-400">Active filters:</span>
            {currentSearchTerm && (
              <span className="inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-400">
                Search: "{currentSearchTerm}"
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentSearchTerm('');
                    if (appliedOwnerFilter !== 'all') {
                      filterTestPlansByOwner(appliedOwnerFilter);
                    } else {
                      fetchTestPlans(1);
                    }
                  }}
                  className="ml-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {appliedOwnerFilter !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-400">
                Owner: {getOwnerName(appliedOwnerFilter)}
                <button
                  onClick={clearOwnerFilter}
                  className="ml-2 text-purple-400 hover:text-purple-300 transition-colors"
                  title="Clear owner filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearOwnerFilter}
              className="text-sm text-gray-400 hover:text-white underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </Card>

      {/* Test Plans Table */}
      <Card className="overflow-hidden">
        <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10">
            <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">ID</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Title</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Progress</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Duration</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTestPlans.map((testPlan) => {
                // Calculate progress based on closed test runs
                const progress = testPlan.totalTestRuns > 0
                  ? Math.round((testPlan.closedTestRuns / testPlan.totalTestRuns) * 100)
                  : 0;
                
                const getProgressColor = (progress: number) => {
                  if (progress === 0) return 'from-gray-500 to-gray-600';
                  if (progress < 50) return 'from-red-500 to-orange-500';
                  if (progress < 100) return 'from-yellow-500 to-orange-500';
                  return 'from-green-500 to-emerald-500';
                };
                
                return (
                  <tr key={testPlan.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6 text-sm text-gray-300 font-mono">
                      #{testPlan.id}
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <button
                          onClick={() => handleTestPlanClick(testPlan)}
                          className="text-left w-full group"
                        >
                          <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors cursor-pointer mb-1">
                            {testPlan.title}
                          </h3>
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">
                            {testPlan.totalTestRuns === 0 ? 'No test runs' : 
                             progress === 0 ? 'Not started' :
                             progress === 100 ? 'Completed' : 'In progress'}
                          </span>
                          <span className="text-white font-medium">{progress}%</span>
                        </div>
                        {testPlan.totalTestRuns > 0 && (
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div 
                              className={`bg-gradient-to-r ${getProgressColor(progress)} h-2 rounded-full transition-all duration-300`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          {testPlan.closedTestRuns} of {testPlan.totalTestRuns} test runs closed
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {testPlan.dateStart && testPlan.dateEnd ? (
                        <div className="space-y-1">
                          <div className="text-sm text-gray-300">
                            {format(testPlan.dateStart, 'MMM dd, yyyy')} - {format(testPlan.dateEnd, 'MMM dd, yyyy')}
                          </div>
                          {(() => {
                            const today = new Date();
                            const endDate = testPlan.dateEnd;
                            
                            // Reset time to start of day for accurate comparison
                            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            const endDateStart = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                            
                            if (todayStart > endDateStart) {
                              const diffTime = todayStart.getTime() - endDateStart.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/50">
                                  {diffDays} day{diffDays !== 1 ? 's' : ''} overdue
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : testPlan.dateStart ? (
                        <div className="text-sm text-gray-300">
                          {format(testPlan.dateStart, 'MMM dd, yyyy')} - No end date
                        </div>
                      ) : testPlan.dateEnd ? (
                        <div className="text-sm text-gray-300">
                          No start date - {format(testPlan.dateEnd, 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No dates set</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <select
                          value={testPlan.status}
                          onChange={async (e) => {
                            try {
                              await updateTestPlanStatus(testPlan.id, e.target.value);
                            } catch {
                              // Error already handled in hook
                            }
                          }}
                          className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                          disabled={isSubmitting}
                        >
                          <option value="1">New</option>
                          <option value="2">In Progress</option>
                          <option value="3">Done</option>
                          <option value="4">Closed</option>
                        </select>
                        <button
                          onClick={() => openEditModal(testPlan)}
                          className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                          disabled={isSubmitting}
                        >
                          <SquarePen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(testPlan)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Delete"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {testPlans.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No test plans found</p>
                <p className="text-sm">
                  {currentSearchTerm 
                    ? `No test plans found matching "${currentSearchTerm}". Try a different search term or create a new test plan.`
                    : 'No test plans found. Create your first test plan to get started.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="border-t border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                {pagination.totalItems} test plans
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1 || loading}
                  icon={ChevronLeft}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-400">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages || loading}
                  icon={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <CreateTestPlanModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSubmit={handleCreateTestPlan}
        isSubmitting={isSubmitting}
      />

      <EditTestPlanModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSubmit={handleEditTestPlan}
        testPlan={selectedTestPlan}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteTestPlan}
        title="Delete Test Plan"
        message={`Are you sure you want to delete the test plan "${selectedTestPlan?.title}"? This action is irreversible.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default TestPlans;