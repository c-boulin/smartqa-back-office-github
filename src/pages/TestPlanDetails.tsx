import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Play, CheckCircle, Clock, Loader } from 'lucide-react';
import { format } from 'date-fns';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { testPlansApiService } from '../services/testPlansApi';
import { testRunsApiService, TestRun } from '../services/testRunsApi';
import { useApp } from '../context/AppContext';

interface TestPlanWithTestRuns {
  id: string;
  title: string;
  projectId: string;
  assignedTo?: string;
  dateStart?: Date;
  dateEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
  testRuns: TestRun[];
}

const TestPlanDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: appState } = useApp();
  
  const [testPlan, setTestPlan] = useState<TestPlanWithTestRuns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTestPlanDetails(id);
    }
  }, [id]);

  const fetchTestPlanDetails = async (testPlanId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📋 Fetching test plan details with test runs for ID:', testPlanId);

      // Fetch test plan with included test runs
      const response = await testPlansApiService.getTestPlanWithTestRuns(testPlanId);
      
      console.log('📋 Test plan API response:', response);

      // Transform the main test plan data
      const transformedTestPlan = testPlansApiService.transformApiTestPlan(response.data);
      
      // Extract and transform test runs from included data
      const testRuns: TestRun[] = [];
      
      if (response.data.relationships?.testRuns?.data && response.included) {
        console.log('📋 Found test runs relationships:', response.data.relationships.testRuns.data);
        console.log('📋 Included data:', response.included);
        
        for (const testRunRef of response.data.relationships.testRuns.data) {
          const testRunId = testRunRef.id.split('/').pop();
          
          // Find the test run in included data
          const includedTestRun = response.included.find(item => 
            item.type === 'TestRun' && item.attributes.id.toString() === testRunId
          );
          
          if (includedTestRun) {
            console.log('📋 Found included test run:', includedTestRun);
            
            // Find the assigned user for this test run in included data
            let assignedUser = null;
            if (includedTestRun.relationships?.user?.data) {
              const userId = includedTestRun.relationships.user.data.id.split('/').pop();
              assignedUser = response.included.find(item => 
                item.type === 'User' && item.attributes.id.toString() === userId
              );
            }
            
            // Transform the included test run data
            const transformedTestRun = testRunsApiService.transformApiTestRun(
              includedTestRun, 
              response.included,
              assignedUser
            );
            
            testRuns.push(transformedTestRun);
            console.log('📋 Transformed test run:', transformedTestRun.name);
          } else {
            console.warn('📋 Test run not found in included data for ID:', testRunId);
          }
        }
      }

      // Sort test runs by creation date (newest first)
      testRuns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const testPlanWithTestRuns: TestPlanWithTestRuns = {
        ...transformedTestPlan,
        testRuns
      };

      setTestPlan(testPlanWithTestRuns);
      console.log('✅ Successfully loaded test plan with', testRuns.length, 'test runs');

    } catch (err) {
      console.error('❌ Failed to fetch test plan details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load test plan details');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!testPlan?.dateStart || !testPlan?.dateEnd) {
      return { percentage: 0, status: 'no-dates' };
    }
    
    const today = new Date();
    const startDate = testPlan.dateStart;
    const endDate = testPlan.dateEnd;
    
    // Reset time to start of day for accurate comparison
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startDateStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateStart = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    const totalDays = Math.ceil((endDateStart.getTime() - startDateStart.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((todayStart.getTime() - startDateStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (totalDays <= 0) {
      return { percentage: 100, status: 'same-day' };
    }
    
    if (elapsedDays < 0) {
      return { percentage: 0, status: 'not-started' };
    }
    
    if (elapsedDays > totalDays) {
      return { percentage: 100, status: 'overdue' };
    }
    
    const percentage = Math.round((elapsedDays / totalDays) * 100);
    return { percentage, status: 'in-progress' };
  };

  const getStateIcon = (state: number) => {
    switch (state) {
      case 1: // New
      case 2: // In progress
        return <Play className="w-4 h-4" />;
      case 5: // Done
      case 6: // Closed
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStateColor = (state: number) => {
    switch (state) {
      case 1: // New
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
      case 2: // In progress
        return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      case 3: // Under review
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 4: // Rejected
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 5: // Done
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 6: // Closed
        return 'text-purple-400 bg-purple-500/20 border-purple-500/50';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getStateLabel = (state: number) => {
    const stateLabels = {
      1: 'New',
      2: 'In progress',
      3: 'Under review',
      4: 'Rejected',
      5: 'Done',
      6: 'Closed'
    };
    return stateLabels[state as keyof typeof stateLabels] || 'Unknown';
  };

  const handleTestRunClick = (testRun: TestRun) => {
    navigate(`/test-runs/${testRun.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading test plan details...</p>
        </div>
      </div>
    );
  }

  if (error || !testPlan) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load test plan details</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={() => navigate('/test-plans')}>
            Back to Test Plans
          </Button>
        </Card>
      </div>
    );
  }

  const progress = calculateProgress();
  const project = appState.projects.find(p => p.id === testPlan.projectId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => navigate('/test-plans')}
          >
            Back to Test Plans
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{testPlan.title}</h1>
            <p className="text-gray-400">Test Plan TP{testPlan.id}</p>
          </div>
        </div>
      </div>

      {/* Test Plan Overview */}
      <Card gradient className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Project</h3>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/50">
                {project?.name || `Project ${testPlan.projectId}`}
              </span>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Timeline Progress</h3>
            {progress.status === 'no-dates' ? (
              <span className="text-gray-500 text-sm">No dates set</span>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    progress.status === 'not-started' ? 'text-gray-400' :
                    progress.status === 'overdue' ? 'text-red-400' :
                    progress.status === 'same-day' ? 'text-green-400' :
                    'text-cyan-400'
                  }`}>
                    {progress.percentage}%
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    progress.status === 'not-started' ? 'bg-gray-500/20 text-gray-400' :
                    progress.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                    progress.status === 'same-day' ? 'bg-green-500/20 text-green-400' :
                    'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {progress.status === 'not-started' ? 'Not Started' :
                     progress.status === 'overdue' ? 'Overdue' :
                     progress.status === 'same-day' ? 'Today' :
                     'In Progress'}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      progress.status === 'not-started' ? 'bg-gray-500' :
                      progress.status === 'overdue' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                      progress.status === 'same-day' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                      'bg-gradient-to-r from-cyan-400 to-purple-500'
                    }`}
                    style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Timeline</h3>
            <div className="space-y-1 text-sm">
              {testPlan.dateStart ? (
                <div className="flex items-center text-gray-300">
                  <Calendar className="w-3 h-3 mr-2 text-green-400" />
                  <span>Start: {format(testPlan.dateStart, 'MMM dd, yyyy')}</span>
                </div>
              ) : (
                <div className="text-gray-500">No start date</div>
              )}
              {testPlan.dateEnd ? (
                <div className="flex items-center text-gray-300">
                  <Calendar className="w-3 h-3 mr-2 text-red-400" />
                  <span>End: {format(testPlan.dateEnd, 'MMM dd, yyyy')}</span>
                </div>
              ) : (
                <div className="text-gray-500">No end date</div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Test Runs</h3>
            <div className="text-2xl font-bold text-white">{testPlan.testRuns.length}</div>
            <div className="text-sm text-gray-400">
              {testPlan.testRuns.filter(tr => tr.state !== 6).length} active, {testPlan.testRuns.filter(tr => tr.state === 6).length} closed
            </div>
          </div>
        </div>
      </Card>

      {/* Test Runs Table */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            Linked Test Runs ({testPlan.testRuns.length})
          </h3>
          <p className="text-sm text-gray-400">
            Test runs associated with this test plan
          </p>
        </div>
        
        {testPlan.testRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">ID</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Name</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">State</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Progress</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Test Cases</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Assignee</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Dates</th>
                </tr>
              </thead>
              <tbody>
                {testPlan.testRuns.map((testRun) => (
                  <tr 
                    key={testRun.id} 
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors cursor-pointer"
                    onClick={() => handleTestRunClick(testRun)}
                  >
                    <td className="py-4 px-6 text-sm text-gray-300 font-mono">
                      TR{testRun.id}
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                          {testRun.name}
                        </h3>
                        {testRun.description && (
                          <p className="text-sm text-gray-400 truncate max-w-xs">{testRun.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStateColor(testRun.state)}`}>
                        {getStateIcon(testRun.state)}
                        <span className="ml-1">{getStateLabel(testRun.state)}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white font-medium">{testRun.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-cyan-400 to-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${testRun.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>Pass Rate: {testRun.passRate}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1 text-sm">
                        <div className="text-white font-medium">{testRun.testCasesCount} total</div>
                        <div className="flex space-x-2 text-xs">
                          <span className="text-green-400">{testRun.passedCount} passed</span>
                          <span className="text-red-400">{testRun.failedCount} failed</span>
                          {testRun.blockedCount > 0 && (
                            <span className="text-purple-400">{testRun.blockedCount} blocked</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mr-3">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{testRun.assignedTo.name}</p>
                          <p className="text-xs text-gray-400">{testRun.assignedTo.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1 text-xs text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>Started: {format(testRun.startDate, 'MMM dd, yyyy')}</span>
                        </div>
                        {testRun.endDate && (
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>Ended: {format(testRun.endDate, 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                        {testRun.closedDate && (
                          <div className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span>Closed: {format(testRun.closedDate, 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No test runs linked</p>
              <p className="text-sm">
                No test runs are currently associated with this test plan.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TestPlanDetails;