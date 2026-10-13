import React, { useEffect, useState, useCallback } from 'react';
import { Loader, Check, ArrowRight, ArrowLeft, Link2 } from 'lucide-react';
import { apiService } from '../../services/api';
import { projectsApiService } from '../../services/projectsApi';
import { Project } from '../../types';
import { COUNTRY_CODES_ALPHA2 } from '../../constants/countryCodes';
import Button from '../UI/Button';
import AutomatedConfigurationsStep from './AutomatedConfigurationsStep';
import toast from 'react-hot-toast';

type GitlabRepositoryOption = {
  id: string;
  name: string;
  url: string;
};

type AutomatedTestCaseLink = {
  id: string;
  title: string;
  gitlab_test_name: string | null | undefined;
};

type AutomationEditForm = {
  country: string;
  url: string;
  gitlabProject: string;
  testSuite: string;
};

interface AutomationEditWizardProps {
  project: Project;
  gitlabRepositories: GitlabRepositoryOption[];
  gitlabRepositoriesLoading: boolean;
  onSaved: (updated: Project) => void;
  onClose: () => void;
}

const STEP_CONFIG = 'config';
const STEP_LINKS = 'links';
const STEP_CONFIGURATIONS = 'configurations';
type WizardStep = typeof STEP_CONFIG | typeof STEP_LINKS | typeof STEP_CONFIGURATIONS;

const STEP_ORDER: WizardStep[] = [STEP_CONFIG, STEP_LINKS, STEP_CONFIGURATIONS];

const AutomationEditWizard: React.FC<AutomationEditWizardProps> = ({
  project,
  gitlabRepositories,
  gitlabRepositoriesLoading,
  onSaved,
  onClose,
}) => {
  const projectHasSavedConfig = !!(project.gitlab_project_name && project.test_suite_name);
  const [step, setStep] = useState<WizardStep>(projectHasSavedConfig ? STEP_LINKS : STEP_CONFIG);

  const [automationForm, setAutomationForm] = useState<AutomationEditForm>({
    country: project.country ?? '',
    url: project.url ?? '',
    gitlabProject: project.gitlab_project_name ?? '',
    testSuite: project.test_suite_name ?? '',
  });

  const [testSuiteOptions, setTestSuiteOptions] = useState<string[]>([]);
  const [testSuiteLoading, setTestSuiteLoading] = useState(false);
  const [automationSaving, setAutomationSaving] = useState(false);

  const [savedProject, setSavedProject] = useState<Project>(project);

  const [testCaseLinksData, setTestCaseLinksData] = useState<{
    automatedTestCases: AutomatedTestCaseLink[];
    gitlabTestNames: string[];
  } | null>(null);
  const [testCaseLinksLoading, setTestCaseLinksLoading] = useState(false);
  const [testCaseLinksSaving, setTestCaseLinksSaving] = useState(false);
  const [testCaseLinkSelections, setTestCaseLinkSelections] = useState<Record<string, string>>({});

  const hasGitlabConfig = !!(automationForm.gitlabProject && automationForm.testSuite);

  const configChanged =
    automationForm.country !== (savedProject.country ?? '') ||
    automationForm.url !== (savedProject.url ?? '') ||
    automationForm.gitlabProject !== (savedProject.gitlab_project_name ?? '') ||
    automationForm.testSuite !== (savedProject.test_suite_name ?? '');

  useEffect(() => {
    const gitlabProject = automationForm.gitlabProject;
    if (!gitlabProject) {
      setTestSuiteOptions([]);
      setAutomationForm((f) => (f.testSuite ? { ...f, testSuite: '' } : f));
      return;
    }
    let cancelled = false;
    setTestSuiteLoading(true);
    setTestSuiteOptions([]);
    setAutomationForm((f) => (f.testSuite ? { ...f, testSuite: '' } : f));
    apiService
      .authenticatedRequest(
        `/gitlab/suits-list?repository_url=${encodeURIComponent(gitlabProject)}`
      )
      .then((response: { success?: boolean; data?: string[] }) => {
        if (cancelled) return;
        if (response?.success && Array.isArray(response.data)) {
          setTestSuiteOptions(response.data);
          const savedSuite = savedProject.test_suite_name ?? '';
          if (savedSuite && response.data.includes(savedSuite) && gitlabProject === (savedProject.gitlab_project_name ?? '')) {
            setAutomationForm((f) => ({ ...f, testSuite: savedSuite }));
          }
        } else {
          setTestSuiteOptions([]);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : 'Failed to load test suites');
        setTestSuiteOptions([]);
      })
      .finally(() => {
        if (!cancelled) setTestSuiteLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when gitlab project changes
  }, [automationForm.gitlabProject]);

  const fetchTestCaseLinks = useCallback(async (proj: Project) => {
    if (!proj.gitlab_project_name || !proj.test_suite_name) {
      setTestCaseLinksData(null);
      return;
    }
    setTestCaseLinksLoading(true);
    setTestCaseLinksData(null);
    try {
      const response: { data?: { automatedTestCases?: AutomatedTestCaseLink[]; gitlabTestNames?: string[] } } =
        await apiService.authenticatedRequest(`/projects/${proj.id}/test-case-gitlab-links`);
      const data = response?.data;
      if (data?.automatedTestCases && Array.isArray(data.automatedTestCases) && Array.isArray(data.gitlabTestNames)) {
        setTestCaseLinksData({
          automatedTestCases: data.automatedTestCases,
          gitlabTestNames: data.gitlabTestNames,
        });
        const initial: Record<string, string> = {};
        data.automatedTestCases.forEach((tc) => {
          initial[tc.id] = tc.gitlab_test_name ?? '';
        });
        setTestCaseLinkSelections(initial);
      } else {
        setTestCaseLinksData({ automatedTestCases: [], gitlabTestNames: data?.gitlabTestNames ?? [] });
        setTestCaseLinkSelections({});
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load test case links');
      setTestCaseLinksData(null);
    } finally {
      setTestCaseLinksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectHasSavedConfig) {
      fetchTestCaseLinks(project);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);

  const alreadySavedAndUnchanged = hasGitlabConfig && !configChanged && savedProject.gitlab_project_name && savedProject.test_suite_name;

  const handleSaveConfigAndProceed = async () => {
    if (!hasGitlabConfig) return;

    if (alreadySavedAndUnchanged) {
      setStep(STEP_LINKS);
      fetchTestCaseLinks(savedProject);
      return;
    }

    try {
      setAutomationSaving(true);
      const response = await projectsApiService.updateProject(project.id, {
        title: project.name,
        description: project.description,
        country: automationForm.country,
        url: automationForm.url,
        gitlab_project_name: automationForm.gitlabProject || undefined,
        test_suite_name: automationForm.testSuite,
      });
      const updated = projectsApiService.transformApiProject(response.data);
      setSavedProject(updated);
      onSaved(updated);
      toast.success('Configuration saved');
      setStep(STEP_LINKS);
      fetchTestCaseLinks(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save automation settings');
    } finally {
      setAutomationSaving(false);
    }
  };

  const handleSaveOnlyConfig = async () => {
    try {
      setAutomationSaving(true);
      const response = await projectsApiService.updateProject(project.id, {
        title: project.name,
        description: project.description,
        country: automationForm.country,
        url: automationForm.url,
        gitlab_project_name: automationForm.gitlabProject || undefined,
        test_suite_name: automationForm.testSuite,
      });
      const updated = projectsApiService.transformApiProject(response.data);
      setSavedProject(updated);
      onSaved(updated);
      toast.success('Configuration saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save automation settings');
    } finally {
      setAutomationSaving(false);
    }
  };

  const handleSaveLinksAndProceed = async () => {
    if (!savedProject.id || !testCaseLinksData) return;
    try {
      setTestCaseLinksSaving(true);
      const links = testCaseLinksData.automatedTestCases.map((tc) => ({
        test_case_id: Number(tc.id),
        gitlab_test_name: (testCaseLinkSelections[tc.id] ?? '').trim() || null,
      }));
      await apiService.authenticatedRequest(
        `/projects/${savedProject.id}/test-case-gitlab-links`,
        {
          method: 'PATCH',
          body: JSON.stringify({ links }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      toast.success('Test case links saved');
      setTestCaseLinksData((prev) =>
        prev
          ? {
              ...prev,
              automatedTestCases: prev.automatedTestCases.map((tc) => ({
                ...tc,
                gitlab_test_name: testCaseLinkSelections[tc.id] || null,
              })),
            }
          : null
      );
      setStep(STEP_CONFIGURATIONS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save test case links');
    } finally {
      setTestCaseLinksSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <StepIndicator currentStep={step} hasGitlabConfig={hasGitlabConfig} />

      {step === STEP_CONFIG && (
        <ConfigStep
          form={automationForm}
          setForm={setAutomationForm}
          gitlabRepositories={gitlabRepositories}
          gitlabRepositoriesLoading={gitlabRepositoriesLoading}
          testSuiteOptions={testSuiteOptions}
          testSuiteLoading={testSuiteLoading}
        />
      )}

      {step === STEP_LINKS && (
        <LinksStep
          testCaseLinksData={testCaseLinksData}
          testCaseLinksLoading={testCaseLinksLoading}
          testCaseLinkSelections={testCaseLinkSelections}
          setTestCaseLinkSelections={setTestCaseLinkSelections}
        />
      )}

      {step === STEP_CONFIGURATIONS && (
        <AutomatedConfigurationsStep
          projectId={savedProject.id}
          gitlabProjectName={savedProject.gitlab_project_name}
        />
      )}

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        {step === STEP_CONFIG && (
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {!hasGitlabConfig && configChanged && (
                <Button
                  type="button"
                  disabled={automationSaving || !configChanged}
                  onClick={handleSaveOnlyConfig}
                >
                  {automationSaving ? 'Saving...' : 'Save'}
                </Button>
              )}
              {hasGitlabConfig && (
                <Button
                  type="button"
                  disabled={automationSaving || testSuiteLoading}
                  onClick={handleSaveConfigAndProceed}
                  icon={automationSaving ? undefined : ArrowRight}
                >
                  {automationSaving ? 'Saving...' : alreadySavedAndUnchanged ? 'Next: Map test cases' : 'Save & map test cases'}
                </Button>
              )}
            </div>
          </>
        )}

        {step === STEP_LINKS && (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(STEP_CONFIG)}
              icon={ArrowLeft}
            >
              Back
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(STEP_CONFIGURATIONS)}>
                Skip
              </Button>
              <Button
                type="button"
                disabled={testCaseLinksSaving || testCaseLinksLoading || !testCaseLinksData?.automatedTestCases.length}
                onClick={handleSaveLinksAndProceed}
                icon={testCaseLinksSaving ? undefined : ArrowRight}
              >
                {testCaseLinksSaving ? 'Saving...' : 'Save & next'}
              </Button>
            </div>
          </>
        )}

        {step === STEP_CONFIGURATIONS && (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(STEP_LINKS)}
              icon={ArrowLeft}
            >
              Back
            </Button>
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const StepIndicator: React.FC<{ currentStep: WizardStep; hasGitlabConfig: boolean }> = ({ currentStep, hasGitlabConfig }) => {
  const steps = [
    { key: STEP_CONFIG, label: 'Configuration' },
    { key: STEP_LINKS, label: 'Test case mapping' },
    { key: STEP_CONFIGURATIONS, label: 'Automated config' },
  ];

  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const stepIndex = STEP_ORDER.indexOf(s.key as WizardStep);
        const isActive = s.key === currentStep;
        const isCompleted = stepIndex < currentIndex;
        const isDisabled = s.key === STEP_LINKS && !hasGitlabConfig && currentStep === STEP_CONFIG;

        return (
          <React.Fragment key={s.key}>
            {i > 0 && (
              <div
                className={`flex-1 h-0.5 rounded ${
                  isCompleted || isActive ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-cyan-500 text-white'
                    : isActive
                    ? 'bg-cyan-500 text-white ring-2 ring-cyan-500/30'
                    : isDisabled
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : isCompleted
                    ? 'text-slate-700 dark:text-gray-300'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {s.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

const ConfigStep: React.FC<{
  form: AutomationEditForm;
  setForm: React.Dispatch<React.SetStateAction<AutomationEditForm>>;
  gitlabRepositories: GitlabRepositoryOption[];
  gitlabRepositoriesLoading: boolean;
  testSuiteOptions: string[];
  testSuiteLoading: boolean;
}> = ({ form, setForm, gitlabRepositories, gitlabRepositoriesLoading, testSuiteOptions, testSuiteLoading }) => (
  <div className="space-y-4">
    <div>
      <label htmlFor="automation-edit-country" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
        Country
      </label>
      <select
        id="automation-edit-country"
        value={form.country}
        onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
      >
        <option value="">Select country</option>
        <option value="WW">WW -- Worldwide</option>
        {COUNTRY_CODES_ALPHA2.map(({ code, name }) => (
          <option key={code} value={code}>
            {code} -- {name}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label htmlFor="automation-edit-url" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
        URL
      </label>
      <input
        id="automation-edit-url"
        type="url"
        value={form.url}
        onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
        placeholder="https://"
        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
      />
    </div>
    <div>
      <label htmlFor="automation-edit-gitlab-project" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
        Gitlab project
      </label>
      <select
        id="automation-edit-gitlab-project"
        value={form.gitlabProject}
        onChange={(e) => setForm((f) => ({ ...f, gitlabProject: e.target.value }))}
        disabled={gitlabRepositoriesLoading}
        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <option value="">
          {gitlabRepositoriesLoading ? 'Loading...' : 'Select GitLab repository'}
        </option>
        {gitlabRepositories.map((repo) => (
          <option key={repo.id} value={repo.url}>
            {repo.name}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label htmlFor="automation-edit-test-suite" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
        Test suite
      </label>
      <select
        id="automation-edit-test-suite"
        value={form.testSuite}
        onChange={(e) => setForm((f) => ({ ...f, testSuite: e.target.value }))}
        disabled={testSuiteLoading || !form.gitlabProject}
        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <option value="">
          {(() => {
            if (testSuiteLoading) return 'Loading...';
            if (!form.gitlabProject) return 'Select a GitLab project first';
            return 'Select test suite';
          })()}
        </option>
        {testSuiteOptions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  </div>
);

const LinksStep: React.FC<{
  testCaseLinksData: { automatedTestCases: AutomatedTestCaseLink[]; gitlabTestNames: string[] } | null;
  testCaseLinksLoading: boolean;
  testCaseLinkSelections: Record<string, string>;
  setTestCaseLinkSelections: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}> = ({ testCaseLinksData, testCaseLinksLoading, testCaseLinkSelections, setTestCaseLinkSelections }) => {
  if (testCaseLinksLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Loader className="w-6 h-6 text-cyan-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-gray-400">Loading test cases...</p>
      </div>
    );
  }

  if (!testCaseLinksData || testCaseLinksData.automatedTestCases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Link2 className="w-8 h-8 text-slate-400 dark:text-gray-600" />
        <p className="text-sm text-slate-500 dark:text-gray-400 text-center">
          No automated test cases in this project.<br />
          Mark test cases as &quot;Automated&quot; to link them to GitLab tests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-gray-400">
        Link each automated test case to the corresponding test in the GitLab suite.
      </p>
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {testCaseLinksData.automatedTestCases.map((tc) => (
          <div
            key={tc.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
          >
            <span className="text-sm text-slate-700 dark:text-gray-300 min-w-0 truncate flex-1" title={tc.title}>
              {tc.title}
            </span>
            <select
              value={testCaseLinkSelections[tc.id] ?? ''}
              onChange={(e) =>
                setTestCaseLinkSelections((prev) => ({
                  ...prev,
                  [tc.id]: e.target.value,
                }))
              }
              className="flex-shrink-0 w-[45%] px-2 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            >
              <option value="">-- Not linked --</option>
              {testCaseLinksData.gitlabTestNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AutomationEditWizard;
