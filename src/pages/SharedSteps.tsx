import React, { useState, useCallback } from 'react';
import { Plus, Search, SquarePen, Trash2, ChevronLeft, ChevronRight, Loader, Layers, User } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import CreateSharedStepModal from '../components/SharedStep/CreateSharedStepModal';
import EditSharedStepModal from '../components/SharedStep/EditSharedStepModal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useSharedSteps } from '../hooks/useSharedSteps';
import { SharedStep, sharedStepsApiService } from '../services/sharedStepsApi';
import toast from 'react-hot-toast';

const SharedSteps: React.FC = () => {
  const { getSelectedProject } = useApp();
  const { state: authState } = useAuth();
  const selectedProject = getSelectedProject();
  
  const { 
    sharedSteps, 
    loading, 
    error, 
    pagination, 
    fetchSharedSteps, 
    searchSharedSteps,
    createSharedStep, 
    updateSharedStep, 
    deleteSharedStep 
  } = useSharedSteps(selectedProject?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSharedStep, setSelectedSharedStep] = useState<SharedStep | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = useCallback(async (term: string) => {
    setCurrentSearchTerm(term);
    if (term.trim()) {
      await searchSharedSteps(term);
    } else {
      await fetchSharedSteps(1);
    }
  }, [searchSharedSteps, fetchSharedSteps]);

  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchTerm);
    }
  }, [searchTerm, handleSearch]);

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleCreateSharedStep = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    if (!authState.user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Handle step results - create them first if they exist
      const stepResults: Array<{
        id: string;
        order: number;
      }> = [];
      
      if (data.testSteps && data.testSteps.length > 0) {
        console.log('🔄 Creating step results for new shared step...');
        
        for (let i = 0; i < data.testSteps.length; i++) {
          const step = data.testSteps[i];
          
          try {
            const stepResultResponse = await sharedStepsApiService.createStepResult({
              step: step.step,
              result: step.result,
              userId: authState.user.id
            });
            
            stepResults.push({
              id: stepResultResponse.data.attributes.id.toString(),
              order: i + 1 // Order starts from 1
            });
            
            console.log(`Created step result ${i + 1}:`, stepResultResponse.data.id);
          } catch (stepError) {
            console.error(`Failed to create step result ${i + 1}:`, stepError);
            throw new Error(`Failed to create step result ${i + 1}: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
          }
        }
        
        console.log('All step results created:', stepResults);
      }
      
      // Create the shared step with step results
      await createSharedStep({
        title: data.title,
        projectId: selectedProject.id,
        creatorId: authState.user.id,
        stepResults
      });
      
      setIsCreateModalOpen(false);
      
    } catch {
      console.error('Failed to create shared step:', error);
      toast.error('Failed to create shared step');
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- authState.user.id and error are stable
  }, [createSharedStep, selectedProject]);

  const handleEditSharedStep = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedSharedStep || !selectedProject) {
      toast.error('Missing required data for update');
      return;
    }

    if (!authState.user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Handle step results - update existing ones and create new ones
      const stepResults: Array<{
        id: string;
        order: number;
      }> = [];
      
      if (data.testSteps && data.testSteps.length > 0) {
        console.log('🔄 Processing step results for shared step update...');
        
        for (let i = 0; i < data.testSteps.length; i++) {
          const step = data.testSteps[i];
          const order = i + 1; // Order starts from 1
          
          if (step.originalId) {
            // Existing step result - update it first, then include in relationships
            console.log(`🔄 PATCH: Updating existing step result ${step.originalId} with order ${order}`);
            
            try {
              await sharedStepsApiService.updateStepResult(step.originalId, {
                step: step.step,
                result: step.result,
                userId: authState.user.id
              });
              
              console.log(`✅ PATCH: Updated step result ${step.originalId}`);
            } catch (stepError) {
              console.error(`❌ PATCH: Failed to update step result ${step.originalId}:`, stepError);
              throw new Error(`Failed to update step result ${order}: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
            }
            
            // Include in relationships
            stepResults.push({
              id: step.originalId,
              order: order
            });
            
            console.log(`✅ Including updated step result ${step.originalId} with order ${order}`);
          } else {
            // New step result - use POST to create it
            console.log(`🔄 POST: Creating new step result ${order}`);
            
            try {
              const stepResultResponse = await sharedStepsApiService.createStepResult({
                step: step.step,
                result: step.result,
                userId: authState.user.id
              });
              
              stepResults.push({
                id: stepResultResponse.data.attributes.id.toString(),
                order: order
              });
              
              console.log(`✅ POST: Created new step result ${order}:`, stepResultResponse.data.id);
            } catch (stepError) {
              console.error(`❌ POST: Failed to create step result ${order}:`, stepError);
              throw new Error(`Failed to create step result ${order}: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
            }
          }
        }
        
        console.log('✅ All step results PATCH/POST processed:', stepResults);
      }
      
      // Update the shared step with step results relationships
      await updateSharedStep(selectedSharedStep.id, {
        title: data.title,
        description: data.description || '',
        stepResults
      });
      
      setIsEditModalOpen(false);
      setSelectedSharedStep(null);
      
    } catch {
      console.error('Failed to update shared step:', error);
      toast.error('Failed to update shared step');
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- error is stable
  }, [updateSharedStep, selectedSharedStep, selectedProject, authState.user?.id]);

  const handleDeleteSharedStep = useCallback(async () => {
    if (!selectedSharedStep) return;
    
    try {
      setIsSubmitting(true);
      await deleteSharedStep(selectedSharedStep.id);
      setSelectedSharedStep(null);
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  }, [deleteSharedStep, selectedSharedStep]);

  const openEditModal = useCallback((sharedStep: SharedStep) => {
    setSelectedSharedStep(sharedStep);
    setIsEditModalOpen(true);
  }, []);

  const openDeleteDialog = useCallback((sharedStep: SharedStep) => {
    setSelectedSharedStep(sharedStep);
    setIsDeleteDialogOpen(true);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    if (currentSearchTerm.trim()) {
      searchSharedSteps(currentSearchTerm, page);
    } else {
      fetchSharedSteps(page);
    }
  }, [currentSearchTerm, searchSharedSteps, fetchSharedSteps]);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedSharedStep(null);
  }, []);

  if (loading && sharedSteps.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading shared steps...</p>
        </div>
      </div>
    );
  }

  if (error && sharedSteps.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load shared steps</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={() => fetchSharedSteps(1)}>
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
          <h2 className="text-2xl font-bold text-white">Shared Steps</h2>
          <p className="text-gray-400">
            {selectedProject 
              ? `Manage reusable test steps for ${selectedProject.name} (${pagination.totalItems} total)` 
              : `Please select a project to view shared steps`
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
          title={!selectedProject ? 'Please select a project first' : 'Create new shared step'}
        >
          New Shared Step
        </Button>
      </div>

      {/* Show message if no project selected */}
      {!selectedProject && (
        <Card className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No project selected</p>
            <p className="text-sm">Please select a project from the sidebar to view and manage shared steps.</p>
          </div>
        </Card>
      )}

      {/* Only show content if project is selected */}
      {selectedProject && (
        <>
          {/* Search */}
          <Card className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search shared steps by title..."
                value={searchTerm}
                onChange={handleSearchInputChange}
                onKeyPress={handleSearchKeyPress}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              {currentSearchTerm && (
                <div className="mt-2 text-sm text-cyan-400">
                  Searching for: "{currentSearchTerm}"
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentSearchTerm('');
                      fetchSharedSteps(1);
                    }}
                    className="ml-2 text-gray-400 hover:text-white underline"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Shared Steps Table */}
          <Card className="overflow-hidden">
            {(loading || isSubmitting) && (
              <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10">
                <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            )}
            
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
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Used in</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Created By</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sharedSteps.map((sharedStep) => (
                    <tr key={sharedStep.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 text-sm text-gray-300 font-mono">
                        #{sharedStep.id}
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <h3 className="font-semibold text-white mb-1">{sharedStep.title}</h3>
                          <p className="text-sm text-gray-400">
                            {sharedStep.stepsCount} step{sharedStep.stepsCount !== 1 ? 's' : ''} and result{sharedStep.stepsCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/50">
                          {sharedStep.usedInCount} test case{sharedStep.usedInCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{sharedStep.createdBy.name}</p>
                            <p className="text-xs text-gray-400">{sharedStep.createdBy.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditModal(sharedStep)}
                            className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit"
                            disabled={isSubmitting}
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(sharedStep)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Delete"
                            disabled={isSubmitting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {sharedSteps.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No shared steps found</p>
                    <p className="text-sm">
                      {currentSearchTerm 
                        ? `No shared steps found matching "${currentSearchTerm}". Try a different search term or create a new shared step.`
                        : 'No shared steps found for this project. Create your first shared step to get started.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="border-t border-slate-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                    {pagination.totalItems} shared steps
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
        </>
      )}

      {/* Modals */}
      <CreateSharedStepModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSubmit={handleCreateSharedStep}
        isSubmitting={isSubmitting}
      />

      <EditSharedStepModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSubmit={handleEditSharedStep}
        isSubmitting={isSubmitting}
        sharedStep={selectedSharedStep}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteSharedStep}
        title="Delete Shared Step"
        message={`Are you sure you want to delete the shared step "${selectedSharedStep?.title}"? This action is irreversible and may affect test cases that use this shared step.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default SharedSteps;