import React from 'react';
import { Link, Unlink } from 'lucide-react';
import StatusBadge from '../UI/StatusBadge';
import TagsWithTooltip from '../UI/TagsWithTooltip';
import TestResultDropdown from './TestResultDropdown';
import { TestResultId, TestCase } from '../../types';
import { getDeviceIcon, getDeviceColor } from '../../utils/deviceIcons';
import { Configuration } from '../../services/configurationsApi';
import { ConfigTab } from './ConfigurationTabs';

export interface TestCaseWithExecution {
  id: string;
  title: string;
  priority: string;
  type: string;
  executionStatus: TestResultId;
  executionResult: string;
  fullTestCase: TestCase | null;
  configurationId?: string;
  configurationLabel?: string;
  execution?: Record<string, unknown>;
  /** Latest automated run’s `test_run_executions.id` when linked to overview XML. */
  testRunExecutionId?: number | null;
}

interface TestRunDetailsTableProps {
  testCases: TestCaseWithExecution[];
  configurations: Configuration[];
  showCheckboxColumn: boolean;
  showConfigurationColumn: boolean;
  selectedTestCases: Set<string>;
  onTestCaseCheckboxToggle: (testCaseId: string, configurationId: string | undefined) => void;
  onSelectAllToggle: () => void;
  selectableCount: number;
  isTestRunClosed: boolean;
  isBulkRunning: boolean;
  updatingResults: Set<string>;
  testRunId: string | undefined;
  gitlabLinksByTestCaseId: Record<string, string | null>;
  gitlabLinksFetched: boolean;
  isTestCaseAutomated: (testCase: TestCaseWithExecution) => boolean;
  hasAutomatedConfiguration: (configurationId: string | undefined) => boolean;
  hasPermission: (permission: string) => boolean;
  executionUpdatePermission: string;
  onTestCaseTitleClick: (testCase: TestCaseWithExecution) => void;
  onExecutionResultChange: (testCaseId: string, newResultId: TestResultId, comment?: string, configurationId?: string) => void;
  onOpenCommentModal: (testCase: TestCaseWithExecution, selectedResultId: TestResultId) => void;
  activeConfigTab: ConfigTab;
  hasAutomatedConfigs: boolean;
}

const TestRunDetailsTable: React.FC<TestRunDetailsTableProps> = ({
  testCases,
  configurations,
  showCheckboxColumn,
  showConfigurationColumn,
  selectedTestCases,
  onTestCaseCheckboxToggle,
  onSelectAllToggle,
  selectableCount,
  isTestRunClosed,
  isBulkRunning,
  updatingResults,
  testRunId,
  gitlabLinksByTestCaseId,
  gitlabLinksFetched,
  isTestCaseAutomated,
  hasAutomatedConfiguration,
  hasPermission,
  executionUpdatePermission,
  onTestCaseTitleClick,
  onExecutionResultChange,
  onOpenCommentModal,
  activeConfigTab,
  hasAutomatedConfigs,
}) => {
  const showLinkedToColumn = hasAutomatedConfigs && activeConfigTab === 'automated';
  if (testCases.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-gray-400">
        No test cases found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
      <table className="w-full">
        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">ID</th>
            {showCheckboxColumn && (
              <th className="text-center py-4 px-4 text-sm font-medium text-slate-600 dark:text-gray-400 w-16">
                <input
                  type="checkbox"
                  checked={selectedTestCases.size === selectableCount && selectableCount > 0}
                  onChange={onSelectAllToggle}
                  disabled={isBulkRunning}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-cyan-500 focus:ring-cyan-500 disabled:opacity-50"
                  title="Select/Unselect All"
                />
              </th>
            )}
            <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Title</th>
            <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Priority</th>
            <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Type</th>
            <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Tags</th>
            {showConfigurationColumn && (
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Configuration</th>
            )}
            {showLinkedToColumn && (
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Linked To</th>
            )}
            <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Execution Result</th>
          </tr>
        </thead>
        <tbody style={{ position: 'relative', overflow: 'visible' }}>
          {testCases.map((testCase, index) => {
            const isAutomated = isTestCaseAutomated(testCase);
            const hasGitlabLink = gitlabLinksFetched && Boolean(gitlabLinksByTestCaseId[String(testCase.id)]);
            const hasAutomatedConfig = hasAutomatedConfiguration(testCase.configurationId);
            const isSelectable = isAutomated && hasGitlabLink && hasAutomatedConfig;
            const checkboxKey = `${testCase.id}|${testCase.configurationId || 'default'}`;

            return (
              <tr key={`${testCase.id}-${testCase.configurationId || 'default'}-${index}`} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-800/30 transition-colors" style={{ position: 'relative', overflow: 'visible' }}>
                <td className="py-4 px-6 text-sm text-slate-700 dark:text-gray-300 font-mono">
                  TC-{testCase.fullTestCase?.projectRelativeId ?? testCase.id}
                </td>
                {showCheckboxColumn && (
                  <td className="py-4 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelectable && selectedTestCases.has(checkboxKey)}
                      onChange={() => isSelectable && onTestCaseCheckboxToggle(testCase.id, testCase.configurationId)}
                      disabled={!isSelectable || isBulkRunning}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-cyan-500 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        isAutomated && !hasGitlabLink
                          ? 'Link to GitLab required to run'
                          : isAutomated && !hasAutomatedConfig
                            ? 'Automated configuration required to run'
                            : undefined
                      }
                    />
                  </td>
                )}
                <td className="py-4 px-6">
                  <button
                    onClick={() => onTestCaseTitleClick(testCase)}
                    className="text-left w-full group"
                    disabled={!testCase.fullTestCase}
                  >
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">
                      {testCase.title}
                    </h3>
                  </button>
                </td>
                <td className="py-4 px-6">
                  <StatusBadge status={testCase.priority} type="priority" />
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/50">
                    {testCase.type}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <TagsWithTooltip
                    tags={Array.isArray(testCase.fullTestCase?.tags) ? testCase.fullTestCase.tags : []}
                    maxVisible={2}
                  />
                </td>
                {showConfigurationColumn && (
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-gray-200 border border-slate-300 dark:border-slate-600">
                      <span className={getDeviceColor(testCase.configurationLabel || '')}>
                        {getDeviceIcon(testCase.configurationLabel || '')}
                      </span>
                      {testCase.configurationLabel || 'N/A'}
                    </span>
                  </td>
                )}
                {showLinkedToColumn && (
                  <td className="py-4 px-6">
                    {(() => {
                      const tcId = String(testCase.id);
                      const gitlabName = gitlabLinksByTestCaseId[tcId];
                      const isLinked = gitlabLinksFetched && Boolean(gitlabName);
                      return (
                        <div className="flex items-center gap-1.5">
                          {isLinked ? (
                            <>
                              <Link className="w-3.5 h-3.5 text-green-500 dark:text-green-400 shrink-0" aria-hidden />
                              <span className="text-sm text-slate-700 dark:text-gray-300 truncate max-w-[200px]" title={gitlabName || ''}>
                                {gitlabName}
                              </span>
                            </>
                          ) : (
                            <>
                              <Unlink className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 shrink-0" aria-hidden />
                              <span className="text-sm text-slate-400 dark:text-gray-500 italic">Not linked</span>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                )}
                <td className="py-4 px-6" style={{ position: 'relative', overflow: 'visible' }}>
                  <div className="space-y-2">
                    <TestResultDropdown
                      value={testCase.executionStatus}
                      onChange={(newResultId, comment) => onExecutionResultChange(testCase.id, newResultId, comment, testCase.configurationId)}
                      disabled={
                        !hasPermission(executionUpdatePermission) ||
                        isTestRunClosed ||
                        (isTestCaseAutomated(testCase) && hasAutomatedConfiguration(testCase.configurationId)) ||
                        updatingResults.has(`${testCase.id}-${testCase.configurationId || 'default'}-${testRunId}`)
                      }
                      isUpdating={updatingResults.has(`${testCase.id}-${testCase.configurationId || 'default'}-${testRunId}`)}
                      testCaseTitle={testCase.title}
                      onOpenCommentModal={(selectedResultId) => {
                        onOpenCommentModal(testCase, selectedResultId);
                      }}
                      overviewLogTo={(() => {
                        /** Overview log link: automated tab only (not Manual). */
                        if (
                          activeConfigTab !== 'automated' ||
                          !isTestCaseAutomated(testCase) ||
                          !showLinkedToColumn ||
                          !gitlabLinksFetched
                        ) {
                          return null;
                        }
                        const tre = testCase.testRunExecutionId;
                        const gitlabName = gitlabLinksByTestCaseId[String(testCase.id)] ?? null;
                        if (tre == null || tre <= 0 || gitlabName == null || gitlabName === '') {
                          return null;
                        }
                        const q = new URLSearchParams();
                        q.set('tab', 'launches');
                        q.set('tre', String(tre));
                        q.set('testName', gitlabName);
                        return `/overview?${q.toString()}`;
                      })()}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TestRunDetailsTable;
