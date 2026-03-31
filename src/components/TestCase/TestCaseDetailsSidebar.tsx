import React, { useState, useEffect } from 'react';
import { X, Loader, Calendar, Tag as TagIcon, Clock, CheckCircle, SquarePen, Eye, XCircle, AlertTriangle, Target, Shield, Flame, MessageSquare, Trash2, Save, Pencil, Play } from 'lucide-react';
import { format } from 'date-fns';
import { sharedStepsApiService } from '../../services/sharedStepsApi';
import { testCaseExecutionsApiService, TestCaseExecution } from '../../services/testCaseExecutionsApi';
import { testRunsApiService, type TestRunDetailsExecutionPayload } from '../../services/testRunsApi';
import { testCaseDataService } from '../../services/testCaseDataService';
import { testCasesApiService } from '../../services/testCasesApi';
import { attachmentsApiService } from '../../services/attachmentsApi';
import { TestCase } from '../../types';
import { TEST_RESULTS, TestResultId, coerceTestResultId } from '../../types';
import { getDeviceIcon, getDeviceColor } from '../../utils/deviceIcons';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';
import AddExecutionCommentModal from '../TestRun/AddExecutionCommentModal';

interface TestCaseDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  testCase: TestCase | null;
  context?: 'test-cases' | 'test-run-details' | 'test-runs-overview';
  testRunId?: string;
  /** When provided (e.g. from Test Run Details page), sidebar uses this instead of calling the API */
  executionsFromRun?: TestRunDetailsExecutionPayload[];
  isTestRunClosed?: boolean;
  currentExecutionResult?: TestResultId;
  configurationId?: string;
  isConfigurationAutomated?: boolean;
  configurationLabel?: string;
  /** When set, execution updates are delegated to the parent (single POST). Parent should update `executionsFromRun` or the sidebar refetches when it is omitted. */
  onExecutionResultChange?: (
    testCaseId: string,
    testRunId: string,
    newResultId: TestResultId,
    comment?: string
  ) => void | Promise<void>;
  onAttachmentRemoved?: () => void;
  onRunTest?: (testCase: TestCase) => void;
  availableTags?: Array<{ id: string; label: string }>;
}

function parseExecutionTimestamp(value: string | null | undefined): Date {
  if (value == null || value === '') {
    return new Date();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function mapRunExecutionsForSidebar(
  allExecutions: TestRunDetailsExecutionPayload[],
  testCaseId: string,
  configurationId: string | undefined
): TestCaseExecution[] {
  const filtered = allExecutions.filter(exec => {
    const matchesTestCase = exec.test_case_id.toString() === testCaseId;
    const matchesConfig = configurationId
      ? exec.configuration_id != null && exec.configuration_id.toString() === configurationId
      : exec.configuration_id == null;
    return matchesTestCase && matchesConfig;
  });
  return filtered
    .map(exec => {
      const resultId = coerceTestResultId(exec.result);
      return {
        id: exec.id.toString(),
        testCaseId: exec.test_case_id.toString(),
        testRunId: exec.test_run_id.toString(),
        result: resultId,
        resultLabel: TEST_RESULTS[resultId] || 'System Issue',
        comment: exec.comment ?? undefined,
        createdAt: parseExecutionTimestamp(exec.created_at),
        updatedAt: parseExecutionTimestamp(exec.updated_at)
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

interface StepResult {
  id: string;
  step: string;
  result: string;
  order: number;
}

interface SharedStepWithDetails {
  id: string;
  title: string;
  description?: string;
  order: number;
  stepResults: StepResult[];
}

interface TestCaseDetails {
  id: string;
  title: string;
  description: string;
  preconditions?: string;
  priority: string;
  type: string;
  status: string;
  automationStatus: number;
  tags: string[];
  stepResults: StepResult[];
  sharedSteps: SharedStepWithDetails[];
  attachments: Array<{
    id: string;
    url: string;
    fileName: string;
    name?: string;
  }>;
  executions: TestCaseExecution[];
  createdAt: Date;
  updatedAt: Date;
}

const STATES = {
  1: { label: 'Active', icon: CheckCircle, color: 'text-green-400' },
  2: { label: 'Draft', icon: SquarePen, color: 'text-orange-400' },
  3: { label: 'In Review', icon: Eye, color: 'text-blue-400' },
  4: { label: 'Outdated', icon: Clock, color: 'text-slate-600 dark:text-gray-400' },
  5: { label: 'Rejected', icon: XCircle, color: 'text-red-400' }
} as const;

// Image Modal Component
const ImageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt: string;
}> = ({ isOpen, onClose, imageSrc, imageAlt }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="absolute inset-4 flex items-center justify-center">
        <div className="relative max-w-[90vw] max-h-[90vh] bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Image Viewer</h3>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced HTML Content Component with clickable images
const ClickableHtmlContent: React.FC<{
  content: string;
  className?: string;
  onImageClick: (src: string, alt: string) => void;
}> = ({ content, className = '', onImageClick }) => {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (contentRef.current) {
      // Find all images in the content and make them clickable
      const images = contentRef.current.querySelectorAll('img');
      
      images.forEach((img) => {
        // Add click handler
        const handleClick = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          onImageClick(img.src, img.alt || 'Image');
        };
        
        // Style the image to indicate it's clickable with standardized dimensions
        img.style.cursor = 'pointer';
        img.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
        img.style.maxWidth = '200px';
        img.style.maxHeight = '120px';
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '6px';
        img.style.border = '1px solid #475569';
        img.title = 'Click to view larger';
        
        // Add hover effects
        const handleMouseEnter = () => {
          img.style.transform = 'scale(1.05)';
          img.style.boxShadow = '0 8px 25px rgba(6, 182, 212, 0.4)';
        };
        
        const handleMouseLeave = () => {
          img.style.transform = 'scale(1)';
          img.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.3)';
        };
        
        img.addEventListener('click', handleClick);
        img.addEventListener('mouseenter', handleMouseEnter);
        img.addEventListener('mouseleave', handleMouseLeave);
        
        // Cleanup function
        return () => {
          img.removeEventListener('click', handleClick);
          img.removeEventListener('mouseenter', handleMouseEnter);
          img.removeEventListener('mouseleave', handleMouseLeave);
        };
      });
    }
  }, [content, onImageClick]);

  return (
    <div
      ref={contentRef}
      className={`html-content ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

const PRIORITIES = {
  1: { label: 'Medium', icon: Target, color: 'text-yellow-400' },
  2: { label: 'Critical', icon: AlertTriangle, color: 'text-red-500' },
  3: { label: 'High', icon: Flame, color: 'text-orange-500' },
  4: { label: 'Low', icon: Shield, color: 'text-green-400' }
} as const;

// Test Result Dropdown Component
const TestResultDropdown: React.FC<{
  value: TestResultId;
  onChange: (value: TestResultId, comment?: string) => void;
  disabled?: boolean;
  isUpdating?: boolean;
  testCaseTitle?: string;
  onOpenCommentModal: (selectedResultId: TestResultId) => void;
}> = ({
  value,
  onChange,
  disabled = false,
  isUpdating = false,
  testCaseTitle: _testCaseTitle = '',
  onOpenCommentModal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResultId>(value);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const getResultColor = (resultId: TestResultId): string => {
    switch (resultId) {
      case 1: return 'bg-green-400';
      case 2: return 'bg-red-400';
      case 3: return 'bg-yellow-400';
      case 4: return 'bg-orange-400';
      case 5: return 'bg-purple-400';
      case 6: return 'bg-gray-400';
      case 7: return 'bg-blue-400';
      case 8: return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const handleResultSelect = (newResultId: TestResultId) => {
    setSelectedResult(newResultId);
  };

  const handleQuickUpdate = () => {
    onChange(selectedResult, undefined);
    setIsOpen(false);
  };

  const handleOpenCommentModal = () => {
    setIsOpen(false);
    onOpenCommentModal(selectedResult);
  };

  // Update selectedResult when value prop changes
  React.useEffect(() => {
    setSelectedResult(value);
  }, [value]);

  // Calculate position when opening and handle toggle
  const handleToggle = () => {
    if (!disabled && !isUpdating) {
      const newIsOpen = !isOpen;
      setIsOpen(newIsOpen);

      // Calculate position when opening
      if (newIsOpen && buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const modalHeight = 400; // Approximate height of the modal

        // If there's not enough space below, show above
        if (spaceBelow < modalHeight && buttonRect.top > modalHeight) {
          setDropdownPosition('top');
        } else {
          setDropdownPosition('bottom');
        }
      }
    }
  };

  // Recalculate position on scroll
  React.useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      if (buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const modalHeight = 400;

        if (spaceBelow < modalHeight && buttonRect.top > modalHeight) {
          setDropdownPosition('top');
        } else {
          setDropdownPosition('bottom');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled || isUpdating}
        className={`w-full px-3 py-2 text-sm font-medium rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-400 text-left flex items-center justify-between bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white ${
          disabled || isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
        }`}
      >
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${getResultColor(value)}`}></div>
          <span>{TEST_RESULTS[value]}</span>
        </div>
        {isUpdating ? (
          <Loader className="w-4 h-4 animate-spin text-slate-600 dark:text-gray-400" />
        ) : (
          <svg className="w-4 h-4 text-slate-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && !disabled && !isUpdating && (
        <>
          <div
            className="fixed inset-0 z-[70]"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={dropdownRef}
            className={`absolute left-0 right-0 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xl z-[71] w-80 max-h-96 ${
              dropdownPosition === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
            }`}
          >
            <div className="p-3 border-b border-slate-300 dark:border-slate-600">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Select Result</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {Object.entries(TEST_RESULTS).map(([resultId, label]) => (
                  <button
                    key={resultId}
                    type="button"
                    onClick={() => handleResultSelect(parseInt(resultId) as TestResultId)}
                   className={`w-full px-4 py-2 text-left hover:bg-slate-100 dark:bg-slate-700 transition-colors flex items-center text-sm ${
                     selectedResult === parseInt(resultId) 
                       ? 'bg-cyan-600/30 border-l-4 border-cyan-400' 
                       : ''
                   }`}
                  >
                    <div className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${getResultColor(parseInt(resultId) as TestResultId)}`}></div>
                   <span className={`${selectedResult === parseInt(resultId) ? 'text-cyan-300 font-medium' : 'text-slate-900 dark:text-white'}`}>
                     {label}
                   </span>
                   {selectedResult === parseInt(resultId) && (
                     <span className="ml-auto text-cyan-400">✓</span>
                   )}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-slate-300 dark:border-slate-600 p-3">
              <div className="flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={handleOpenCommentModal}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded transition-colors flex items-center justify-center"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add Comment
                </button>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickUpdate}
                    disabled={disabled || isUpdating}
                    className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-slate-900 dark:text-white rounded transition-colors disabled:opacity-50 font-medium"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const TestCaseDetailsSidebar: React.FC<TestCaseDetailsSidebarProps> = ({
  isOpen,
  onClose,
  testCase,
  context = 'test-cases',
  testRunId,
  executionsFromRun,
  isTestRunClosed = false,
  currentExecutionResult,
  configurationId,
  isConfigurationAutomated = false,
  configurationLabel,
  onExecutionResultChange,
  onAttachmentRemoved,
  onRunTest,
  availableTags = []
}) => {
  const { hasPermission } = usePermissions();
  const [testCaseDetails, setTestCaseDetails] = useState<TestCaseDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingResult, setIsUpdatingResult] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedResultForModal, setSelectedResultForModal] = useState<TestResultId | undefined>(undefined);

  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    src: string;
    alt: string;
  }>({
    isOpen: false,
    src: '',
    alt: ''
  });

  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [savingAttachmentId, setSavingAttachmentId] = useState<string | null>(null);

  const handleImageClick = (src: string, alt: string) => {
    setImageModal({
      isOpen: true,
      src,
      alt
    });
  };

  const closeImageModal = () => {
    setImageModal({
      isOpen: false,
      src: '',
      alt: ''
    });
  };

  useEffect(() => {
    if (isOpen && testCase) {
      fetchTestCaseDetails(testCase.id);
    } else {
      setTestCaseDetails(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTestCaseDetails is stable
  }, [isOpen, testCase]);

  useEffect(() => {
    if (!isOpen || !testCase?.id || !testRunId || executionsFromRun === undefined) return;
    setTestCaseDetails(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        executions: mapRunExecutionsForSidebar(executionsFromRun, testCase.id, configurationId)
      };
    });
  }, [executionsFromRun, isOpen, testCase?.id, testRunId, configurationId]);

  const fetchTestCaseDetails = async (testCaseId: string, opts?: { quiet?: boolean }) => {
    try {
      if (!opts?.quiet) {
        setLoading(true);
      }
      setError(null);

      // Use the new service to fetch data from all three endpoints
      const result = await testCaseDataService.fetchTestCaseDataForDetails(testCaseId, availableTags);
      
      if (!result.success) {
        console.error('❌ Failed to fetch complete test case details:', result.error);
        throw new Error(result.error || 'Failed to fetch test case details');
      }
      
      const { stepResults, sharedSteps: fetchedSharedSteps, attachments, tags } = result.data!;

      // Transform step results to StepResult format for sidebar
      const transformedStepResults: StepResult[] = stepResults.map(sr => ({
        id: sr.id,
        step: sr.step,
        result: sr.result,
        order: sr.order
      }));
      
      // Transform shared steps to SharedStepWithDetails format for sidebar
      const transformedSharedSteps: SharedStepWithDetails[] = [];

      for (const sharedStep of fetchedSharedSteps) {
        try {
          // Check if stepResults are already full objects (from included data) or just IDs
          const stepResults = sharedStep.stepResults || [];
          const internalStepResults: StepResult[] = [];

          for (const stepResult of stepResults) {
            // Check if it's already a full object with step details
            if (typeof stepResult === 'object' && 'step' in stepResult) {
              internalStepResults.push({
                id: stepResult.id,
                step: stepResult.step,
                result: stepResult.result,
                order: stepResult.order
              });
            } else if (typeof stepResult === 'string') {
              // It's just an ID - need to fetch details

              try {
                const response = await sharedStepsApiService.getStepResult(stepResult);
                internalStepResults.push({
                  id: response.data.attributes.id.toString(),
                  step: response.data.attributes.step,
                  result: response.data.attributes.result,
                  order: response.data.attributes.order
                });
              } catch (error) {
                console.error('❌ Failed to fetch step result:', stepResult, error);
              }
            }
          }

          // Sort by order
          internalStepResults.sort((a, b) => a.order - b.order);

          transformedSharedSteps.push({
            id: sharedStep.id,
            title: sharedStep.title,
            description: sharedStep.description,
            order: sharedStep.order,
            stepResults: internalStepResults
          });
        } catch (error) {
          console.error('❌ Failed to process shared step:', sharedStep.id, error);
          // Add shared step without internal details
          transformedSharedSteps.push({
            id: sharedStep.id,
            title: sharedStep.title,
            description: sharedStep.description,
            order: sharedStep.order,
            stepResults: []
          });
        }
      }
      
      // Process executions if this is from a test run context
      let executions: TestCaseExecution[] = [];
      if (testRunId) {
        if (executionsFromRun !== undefined) {
          executions = mapRunExecutionsForSidebar(executionsFromRun, testCase.id, configurationId);
        } else {
          try {
            const { executions: allExecutions } = await testRunsApiService.getTestRunDetails(testRunId);
            executions = mapRunExecutionsForSidebar(allExecutions, testCase.id, configurationId);
          } catch (error) {
            console.error('❌ Failed to load executions:', error);
          }
        }
      }
      
      // Transform attachments to the expected format
      const transformedAttachments = attachments.map(att => ({
        id: att.id,
        url: att.url,
        fileName: att.fileName,
        name: att.name
      }));
      
      const details: TestCaseDetails = {
        id: testCase.id,
        title: testCase.title,
        description: testCase.description,
        preconditions: testCase.preconditions || '',
        priority: testCase.priority,
        type: testCase.type,
        status: testCase.status,
        automationStatus: testCase.automationStatus,
        tags: tags || [],
        stepResults: transformedStepResults,
        sharedSteps: transformedSharedSteps,
        attachments: transformedAttachments,
        executions,
        createdAt: new Date(testCase.createdAt),
        updatedAt: new Date(testCase.updatedAt)
      };
      
      setTestCaseDetails(details);
      
    } catch (err) {
      console.error('❌ Failed to fetch test case details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load test case details');
    } finally {
      if (!opts?.quiet) {
        setLoading(false);
      }
    }
  };

  const getPriorityNumber = (priority: string): number => {
    const priorityMap = { 'low': 4, 'medium': 1, 'high': 3, 'critical': 2 };
    return priorityMap[priority as keyof typeof priorityMap] || 1;
  };

  const getStateNumber = (status: string): number => {
    const stateMap = { 'active': 1, 'draft': 2, 'in_review': 3, 'outdated': 4, 'rejected': 5, 'deprecated': 4 };
    return stateMap[status as keyof typeof stateMap] || 2;
  };

  const isImageUrl = (url: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.includes(ext));
  };

  const getFileNameFromUrl = (url: string): string => {
    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      // Remove query parameters if any
      return fileName.split('?')[0] || 'Unknown file';
    } catch {
      return 'Unknown file';
    }
  };

  const handleEditAttachmentClick = (attachment: { id: string; name?: string; fileName: string }) => {
    setEditingAttachmentId(attachment.id);
    setEditingName(attachment.name || '');
  };

  const handleCancelAttachmentEdit = () => {
    setEditingAttachmentId(null);
    setEditingName('');
  };

  const handleSaveAttachmentEdit = async (attachmentId: string) => {
    if (!editingName.trim()) {
      toast.error('Attachment name cannot be empty');
      return;
    }

    setSavingAttachmentId(attachmentId);
    try {
      await attachmentsApiService.updateAttachment(attachmentId, editingName.trim());
      toast.success('Attachment name updated successfully');

      setEditingAttachmentId(null);
      setEditingName('');

      if (testCaseDetails) {
        setTestCaseDetails({
          ...testCaseDetails,
          attachments: testCaseDetails.attachments.map(att =>
            att.id === attachmentId
              ? { ...att, name: editingName.trim() }
              : att
          )
        });
      }
    } catch (error) {
      console.error('Failed to update attachment name:', error);
      toast.error('Failed to update attachment name');
    } finally {
      setSavingAttachmentId(null);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!testCase || !testCaseDetails) return;

    try {
      const updatedAttachments = testCaseDetails.attachments
        .filter(att => att.id !== attachmentId)
        .map(att => ({
          type: "Attachment" as const,
          id: `/api/attachments/${att.id}`
        }));

      const testCaseTags = testCase.tags.map(tagLabel => {
        const foundTag = availableTags.find(t => t.label === tagLabel);
        return foundTag || { id: tagLabel, label: tagLabel };
      });

      await testCasesApiService.updateTestCase(testCase.id, {
        title: testCase.title,
        description: testCase.description,
        priority: testCase.priority,
        testType: testCase.type as 'functional' | 'regression' | 'smoke' | 'integration' | 'performance',
        status: testCase.status as 'draft' | 'active' | 'deprecated',
        automationStatus: testCase.automationStatus,
        template: 1,
        preconditions: testCase.preconditions || '',
        tags: testCaseTags,
        createdAttachments: updatedAttachments
      });

      setTestCaseDetails(prev => prev ? {
        ...prev,
        attachments: prev.attachments.filter(att => att.id !== attachmentId)
      } : prev);

      if (onAttachmentRemoved) {
        onAttachmentRemoved();
      }

      toast.success('Attachment removed successfully');
    } catch (error) {
      console.error('Failed to remove attachment:', error);
      toast.error('Failed to remove attachment');
    }
  };

  const handleExecutionResultChange = async (newResultId: TestResultId, comment?: string) => {
    if (!testCase || !testRunId || isTestRunClosed) {
      if (isTestRunClosed) {
        toast.error('Cannot update execution results for closed test runs');
      }
      return;
    }

    const newResultLabel = TEST_RESULTS[newResultId];

    try {
      setIsUpdatingResult(true);

      if (onExecutionResultChange) {
        await onExecutionResultChange(testCase.id, testRunId, newResultId, comment);
        if (executionsFromRun === undefined) {
          await fetchTestCaseDetails(testCase.id, { quiet: true });
        }
      } else {
        const response = await testCaseExecutionsApiService.createTestCaseExecution({
          testCaseId: testCase.id,
          testRunId: testRunId,
          result: newResultId,
          comment: comment,
          configurationId: configurationId
        });

        if (testCaseDetails) {
          const newExecution = {
            id: response.data.attributes.id.toString(),
            testCaseId: testCase.id,
            testRunId: testRunId,
            result: newResultId,
            resultLabel: newResultLabel,
            comment: comment,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          setTestCaseDetails(prev => prev ? {
            ...prev,
            executions: [newExecution, ...prev.executions]
          } : prev);
        }

        toast.success(`Execution result updated to ${newResultLabel}`);
      }
    } catch (error) {
      console.error('❌ Failed to update execution result:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update execution result';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingResult(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
        <div className="fixed top-0 right-0 bottom-0 w-[33vw] bg-gradient-to-b from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border-l border-slate-300 dark:border-purple-500/30 shadow-2xl">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">TEST CASE DETAILS</h3>
              <button
                onClick={onClose}
                className="p-2 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-gray-400">Loading test case details...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-red-400 mb-4">
                    <p className="text-lg font-medium">Failed to load details</p>
                    <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">{error}</p>
                  </div>
                </div>
              ) : testCaseDetails ? (
                <div className="space-y-6">
                  {/* Test Case ID and Title */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-cyan-400">TC-{testCase?.projectRelativeId ?? testCaseDetails.id}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{testCaseDetails.title}</h2>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-2">Priority</h4>
                      <div className="flex items-center">
                        {(() => {
                          const priorityNum = getPriorityNumber(testCaseDetails.priority);
                          const priorityConfig = PRIORITIES[priorityNum as keyof typeof PRIORITIES];
                          return (
                            <>
                              <priorityConfig.icon className={`w-4 h-4 mr-2 ${priorityConfig.color}`} />
                              <span className="text-sm text-slate-900 dark:text-white">{priorityConfig.label}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-2">Status</h4>
                      <div className="flex items-center">
                        {(() => {
                          const stateNum = getStateNumber(testCaseDetails.status);
                          const stateConfig = STATES[stateNum as keyof typeof STATES];
                          return (
                            <>
                              <stateConfig.icon className={`w-4 h-4 mr-2 ${stateConfig.color}`} />
                              <span className="text-sm text-slate-900 dark:text-white">{stateConfig.label}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Type and Automation */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <h4 className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-2">Type</h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/50">
                        {testCaseDetails.type.charAt(0).toUpperCase() + testCaseDetails.type.slice(1).replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-2">Automation Status</h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/50">
                        {testCaseDetails.automationStatus === 1 ? 'Not automated' :
                         testCaseDetails.automationStatus === 2 ? 'Automated' :
                         testCaseDetails.automationStatus === 3 ? 'Not required' :
                         testCaseDetails.automationStatus === 4 ? 'Cannot automate' :
                         testCaseDetails.automationStatus === 5 ? 'Obsolete' : 'Unknown'}
                      </span>
                    </div>
                    {configurationLabel && (context === 'test-run-details' || context === 'test-runs-overview') && (
                      <div>
                        <h4 className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-2">Configuration</h4>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-gray-200 border border-slate-300 dark:border-slate-600">
                          <span className={getDeviceColor(configurationLabel)}>
                            {getDeviceIcon(configurationLabel)}
                          </span>
                          {configurationLabel}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {testCaseDetails.tags && testCaseDetails.tags.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {testCaseDetails.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30"
                          >
                            <TagIcon className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {testCaseDetails.description && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Description</h4>
                      <ClickableHtmlContent
                        content={testCaseDetails.description}
                        className="text-sm text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg p-3"
                        onImageClick={handleImageClick}
                      />
                    </div>
                  )}

                  {/* Preconditions */}
                  {testCaseDetails.preconditions && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Preconditions</h4>
                      <ClickableHtmlContent
                        content={testCaseDetails.preconditions}
                        className="text-sm text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg p-3"
                        onImageClick={handleImageClick}
                      />
                    </div>
                  )}

                  {/* All Steps & Results */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-gray-300">All Steps & Results:</h4>
                    </div>

                    <div className="space-y-4">
                      {/* Render step results and shared steps in order */}
                      {[...testCaseDetails.stepResults, ...testCaseDetails.sharedSteps]
                        .sort((a, b) => a.order - b.order)
                        .map((item, index) => {
                          const isSharedStep = 'stepResults' in item;
                          
                          return (
                            <div key={`${isSharedStep ? 'shared' : 'step'}-${item.id}`} className="border border-slate-300 dark:border-slate-600 rounded-lg">
                              <div className="bg-slate-100 dark:bg-slate-700/50 px-4 py-2 border-b border-slate-300 dark:border-slate-600">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-sm font-medium text-slate-900 dark:text-white flex items-center">
                                    <span className="w-6 h-6 bg-cyan-500 text-slate-900 dark:text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">
                                      {String(index + 1).padStart(2, '0')}
                                    </span>
                                    Step {String(index + 1).padStart(2, '0')}
                                    {isSharedStep && (
                                      <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">- Shared Step</span>
                                    )}
                                  </h5>
                                </div>
                              </div>
                              
                              <div className="p-4">
                                {isSharedStep ? (
                                  <div>
                                    <h6 className="font-medium text-purple-900 dark:text-purple-200 mb-2">{(item as SharedStepWithDetails).title}</h6>
                                    {(item as SharedStepWithDetails).description && (
                                      <p className="text-sm text-purple-700 dark:text-purple-300/80 mb-3">{(item as SharedStepWithDetails).description}</p>
                                    )}
                                    
                                    {/* Display shared step's step results */}
                                    {(item as SharedStepWithDetails).stepResults.length > 0 ? (
                                      <div className="space-y-3 mt-3">
                                        {(item as SharedStepWithDetails).stepResults.map((stepResult, stepIndex) => (
                                          <div key={stepResult.id} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-500/30 rounded p-3">
                                            <div className="text-xs text-purple-800 dark:text-purple-300 font-medium mb-2">
                                              Shared Step {stepIndex + 1}
                                            </div>
                                            <div className="space-y-2">
                                              <div>
                                                <div className="text-xs text-purple-700 dark:text-purple-400 mb-1">Step</div>
                                                <ClickableHtmlContent
                                                  content={stepResult.step}
                                                  className="text-sm text-purple-900 dark:text-purple-200"
                                                  onImageClick={handleImageClick}
                                                />
                                              </div>
                                              <div>
                                                <div className="text-xs text-purple-700 dark:text-purple-400 mb-1">Result</div>
                                                <ClickableHtmlContent
                                                  content={stepResult.result}
                                                  className="text-sm text-purple-900 dark:text-purple-200"
                                                  onImageClick={handleImageClick}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-purple-600 dark:text-purple-300/60 mt-3">
                                        No step details available for this shared step
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div>
                                      <h6 className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Step</h6>
                                      <ClickableHtmlContent
                                        content={(item as StepResult).step}
                                        className="text-sm text-slate-700 dark:text-gray-300"
                                        onImageClick={handleImageClick}
                                      />
                                    </div>
                                    <div>
                                      <h6 className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Result</h6>
                                      <ClickableHtmlContent
                                        content={(item as StepResult).result}
                                        className="text-sm text-slate-700 dark:text-gray-300"
                                        onImageClick={handleImageClick}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {testCaseDetails.stepResults.length === 0 && testCaseDetails.sharedSteps.length === 0 && (
                      <div className="text-center py-8 text-slate-600 dark:text-gray-400 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                        <p>No steps defined for this test case.</p>
                      </div>
                    )}
                  </div>

                  {/* Show message for closed test runs */}
                  {context !== 'test-cases' && testRunId && isTestRunClosed && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-orange-400 mr-2" />
                          <span className="text-sm text-orange-400 font-medium">Test Run Closed</span>
                        </div>
                        <p className="text-xs text-orange-300 mt-1">
                          This test run is closed. Execution results cannot be modified.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Test Execution Result - Only show for test run contexts */}
                  {context !== 'test-cases' && testRunId && currentExecutionResult && !isTestRunClosed && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">Test Execution Result</h4>
                      <TestResultDropdown
                        value={currentExecutionResult}
                        onChange={handleExecutionResultChange}
                        disabled={!hasPermission(PERMISSIONS.TEST_CASE_EXECUTION.UPDATE) || isUpdatingResult || (testCaseDetails?.automationStatus === 2 && isConfigurationAutomated)}
                        isUpdating={isUpdatingResult}
                        testCaseTitle={testCase?.title || ''}
                        onOpenCommentModal={(selectedResultId) => {
                          setSelectedResultForModal(selectedResultId);
                          setIsCommentModalOpen(true);
                        }}
                      />
                      <p className="text-xs text-slate-600 dark:text-gray-400 mt-2">
                        {testCaseDetails?.automationStatus === 2 && isConfigurationAutomated
                          ? 'Execution results for automated test cases with automated configurations cannot be manually edited'
                          : hasPermission(PERMISSIONS.TEST_CASE_EXECUTION.UPDATE)
                          ? 'Update the execution result for this test case in the current test run'
                          : 'You do not have permission to update test execution results'}
                      </p>
                      
                      {/* Execution History */}
                      {testCaseDetails.executions && testCaseDetails.executions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">Execution History</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {testCaseDetails.executions.map((execution, index) => {
                              const resultNum = coerceTestResultId(execution.result);
                              return (
                              <div key={execution.id} className="bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg p-3" title={resultNum === 8 ? 'Retry the run' : undefined}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center">
                                    <div
                                      className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                                      style={{
                                        backgroundColor:
                                          resultNum === 1 ? '#10B981' : // Passed - Green
                                          resultNum === 2 ? '#EF4444' : // Failed - Red
                                          resultNum === 3 ? '#F59E0B' : // Blocked - Yellow
                                          resultNum === 4 ? '#F97316' : // Retest - Orange
                                          resultNum === 5 ? '#8B5CF6' : // Skipped - Purple
                                          resultNum === 6 ? '#6B7280' : // Untested - Gray
                                          resultNum === 7 ? '#3B82F6' : // In Progress - Blue
                                          resultNum === 8 ? '#4B5563' : // System Issue - Dark Gray
                                          '#6B7280' // Default - Gray
                                      }}
                                      data-result={resultNum}
                                      data-label={execution.resultLabel}
                                    ></div>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">{execution.resultLabel}</span>
                                    {index === 0 && (
                                      <span className="ml-2 text-xs text-cyan-700 dark:text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full">
                                        Latest
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {execution.comment && (
                                  <div className="mb-2 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded">
                                    <div className="text-xs text-slate-600 dark:text-gray-400 mb-1">Comment:</div>
                                    <ClickableHtmlContent
                                      content={execution.comment}
                                      className="text-sm text-slate-700 dark:text-gray-300 prose prose-invert prose-sm max-w-none"
                                      onImageClick={handleImageClick}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Attachments */}
                  {testCaseDetails.attachments && testCaseDetails.attachments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Attachments ({testCaseDetails.attachments.length})</h4>
                      <div className="space-y-2">
                        {testCaseDetails.attachments.map((attachment) => (
                          <div key={attachment.id} className="bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg p-3 space-y-2">
                            {isImageUrl(attachment.url) ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-slate-600 dark:text-gray-400 truncate flex-1 min-w-0">
                                    {attachment.name || getFileNameFromUrl(attachment.url)}
                                  </div>
                                  {context === 'test-cases' && hasPermission(PERMISSIONS.ATTACHMENT.DELETE) && (
                                    <button
                                      onClick={() => handleRemoveAttachment(attachment.id)}
                                      disabled={savingAttachmentId === attachment.id}
                                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                                      title="Remove attachment"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <img
                                  src={attachment.url}
                                  alt={attachment.fileName}
                                  className="max-w-full h-auto max-h-32 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => handleImageClick(attachment.url, attachment.fileName)}
                                  title="Click to view larger"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  <div className="text-sm text-slate-700 dark:text-gray-300 truncate">
                                    {attachment.name || getFileNameFromUrl(attachment.url)}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <a
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-xs text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                                  >
                                    Download
                                  </a>
                                  {context === 'test-cases' && hasPermission(PERMISSIONS.ATTACHMENT.DELETE) && (
                                    <button
                                      onClick={() => handleRemoveAttachment(attachment.id)}
                                      disabled={savingAttachmentId === attachment.id}
                                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                                      title="Remove attachment"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {context === 'test-cases' && hasPermission(PERMISSIONS.ATTACHMENT.UPDATE) && (
                              editingAttachmentId === attachment.id ? (
                                <div className="flex items-center space-x-2 pt-2 border-t border-slate-300 dark:border-slate-600">
                                  <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    placeholder="Enter attachment name"
                                    className="flex-1 px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    disabled={savingAttachmentId === attachment.id}
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveAttachmentEdit(attachment.id)}
                                    disabled={savingAttachmentId === attachment.id}
                                    className="px-2 py-1.5 bg-cyan-500 text-white rounded text-xs hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                  >
                                    {savingAttachmentId === attachment.id ? (
                                      <Loader className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Save className="w-3 h-3" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelAttachmentEdit}
                                    disabled={savingAttachmentId === attachment.id}
                                    className="px-2 py-1.5 bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white rounded text-xs hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleEditAttachmentClick(attachment)}
                                  disabled={savingAttachmentId !== null}
                                  className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300 underline disabled:opacity-50 pt-2 border-t border-slate-300 dark:border-slate-600"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Edit name</span>
                                </button>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata Footer */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center text-xs text-slate-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Created: {format(testCaseDetails.createdAt, 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    {context === 'test-cases' ? (
                      <div className="flex items-center text-xs text-slate-600 dark:text-gray-400">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Updated: {format(testCaseDetails.updatedAt, 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    ) : (
                      testCaseDetails.executions && testCaseDetails.executions.length > 0 && (
                        <div className="flex items-center text-xs text-slate-600 dark:text-gray-400">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>Last Execution: {format(testCaseDetails.executions[0].createdAt, 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                      )
                    )}

                    {/* Run Test Button - Only show in test-cases context */}
                    {context === 'test-cases' && onRunTest && testCase && hasPermission(PERMISSIONS.TEST_CASE_EXECUTION.CREATE) && (
                      <div className="pt-3 flex justify-end">
                        <button
                          onClick={() => onRunTest(testCase)}
                          className="
                            group
                            relative
                            inline-flex
                            items-center
                            px-4 py-2
                            font-medium
                            text-slate-700 dark:text-gray-300
                            bg-slate-50 dark:bg-slate-800
                            border-2 border-slate-300 dark:border-slate-600
                            rounded-full
                            transition-all
                            duration-200
                            hover:text-cyan-600 dark:hover:text-cyan-400
                            hover:border-cyan-400
                            hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]
                          "
                        >
                          <span className="mr-2">Run Test</span>
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModal.isOpen}
        onClose={closeImageModal}
        imageSrc={imageModal.src}
        imageAlt={imageModal.alt}
      />

      {/* Add Comment Modal */}
      {testCase && context !== 'test-cases' && testRunId && selectedResultForModal && (
        <AddExecutionCommentModal
          isOpen={isCommentModalOpen}
          onClose={() => {
            setIsCommentModalOpen(false);
            setSelectedResultForModal(undefined);
          }}
          onSubmit={(resultId, comment) => {
            handleExecutionResultChange(resultId, comment);
            setIsCommentModalOpen(false);
            setSelectedResultForModal(undefined);
          }}
          currentResult={selectedResultForModal}
          testCaseTitle={testCase.title}
        />
      )}
    </>
  );
};

export default TestCaseDetailsSidebar;