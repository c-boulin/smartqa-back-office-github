import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2, Play, X, XCircle } from 'lucide-react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useAiExecuteRun } from '../hooks/useAiExecuteRun';
import { AiExecuteInput, createAiExecuteApi } from '../services/aiExecuteApi';
import { apiService } from '../services/api';
import { useApp } from '../context/AppContext';
import ProjectTitle from '../components/Project/ProjectTitle';

const devices = ['Desktop Chrome', 'iPhone 12', 'iPad', 'Samsung Galaxy S21'];
const templates = [
  { label: 'Login flow', text: 'Open the sign-in page. Enter the test credentials and submit. Verify the account area is visible.' },
  { label: 'Checkout flow', text: 'Add a product to the cart. Open checkout. Verify the order summary and total are visible.' },
  { label: 'Search + filter', text: 'Search for a keyword. Apply a filter. Verify the result list updates.' },
  { label: 'Language switch', text: 'Switch the site language. Verify the main navigation labels change.' },
  { label: 'Basic performance', text: 'Load the homepage. Verify the main heading is visible and no blocking modal covers the page.' },
];
const inputClass = 'w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400';
const labelClass = 'block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300';

const resultColors = {
  pass: 'text-green-700 dark:text-green-400',
  fail: 'text-red-700 dark:text-red-300',
  info: 'text-slate-600 dark:text-slate-300',
};
const stepBorders = {
  pass: 'border-l-green-500 dark:border-l-green-400',
  fail: 'border-l-red-500 dark:border-l-red-400',
  info: 'border-l-slate-400 dark:border-l-slate-500',
};
const statusLabels = { pass: 'Passed', fail: 'Failed', info: 'Info' };
const cardClass = 'min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-600/50 dark:bg-slate-800/90 dark:shadow-black/20';
const cardTitleClass = 'border-b border-slate-200 pb-4 text-lg font-semibold text-cyan-700 dark:border-slate-600/50 dark:text-cyan-400';

function ScreenshotImage({ projectId, runId, screenshotKey, full = false }: { projectId: string; runId: string; screenshotKey: string; full?: boolean }) {
  const [api] = useState(() => createAiExecuteApi((path, options) => apiService.authenticatedRequest(path, options)));
  const [imageFailed, setImageFailed] = useState(false);
  const image = useQuery({
    queryKey: ['ai-execute-image', projectId, runId, screenshotKey, full],
    queryFn: ({ signal }) => api.getScreenshotUrl(projectId, runId, screenshotKey, signal),
    gcTime: 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: false,
  });
  if (image.isPending || image.isFetching) return <span role="status" className="block p-4 text-sm text-slate-600 dark:text-slate-300">Loading screenshot…</span>;
  if (image.isError || imageFailed) return <span data-mipqa="ai-execute-screenshot-placeholder" className="flex h-40 items-center justify-center rounded-lg bg-slate-100 p-4 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">Screenshot could not be loaded</span>;
  return <img data-mipqa={full ? 'ai-execute-full-img' : 'ai-execute-thumbnail-img'} src={image.data} alt={full ? 'Full test execution screenshot' : 'Test execution screenshot preview'} referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className={full ? 'max-h-[75vh] w-full object-contain' : 'h-40 w-full rounded-lg object-cover'} />;
}

function ScreenshotPreview({ projectId, runId, screenshotKey, index }: { projectId: string; runId: string; screenshotKey: string; index: number }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) dialogRef.current?.showModal();
  }, [open]);
  return <>
    <button ref={buttonRef} data-mipqa={`ai-execute-screenshot-${index}-button`} type="button" aria-label={`Open screenshot ${index}`} onClick={() => setOpen(true)} className="w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 sm:w-56">
      <ScreenshotImage projectId={projectId} runId={runId} screenshotKey={screenshotKey} />
    </button>
    <dialog ref={dialogRef} data-mipqa="ai-execute-lightbox" aria-label={`Screenshot ${index}`} onClose={() => { setOpen(false); buttonRef.current?.focus(); }} className="w-[calc(100%-32px)] max-w-5xl rounded-lg border border-slate-300 bg-white p-4 text-slate-900 backdrop:bg-slate-950/80 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="font-semibold">Screenshot {index}</h3>
        <button data-mipqa="ai-execute-lightbox-close-button" type="button" aria-label="Close screenshot" onClick={() => dialogRef.current?.close()} className="rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"><X className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      {open && <ScreenshotImage projectId={projectId} runId={runId} screenshotKey={screenshotKey} full />}
    </dialog>
  </>;
}

const AiAgentExecuteContent: React.FC = () => {
  const { state } = useApp();
  const selectedProject = state.projects.find(project => project.id === state.selectedProjectId);
  const execution = useAiExecuteRun(selectedProject?.id);
  const [device, setDevice] = useState<AiExecuteInput['device']>('Desktop Chrome');
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const report = execution.run?.status === 'ready' ? execution.run.executionReport : null;
  const countedSteps = report?.steps.filter(step => step.kind === 'step' || step.kind === 'assertion') ?? [];
  const passCount = countedSteps.filter(step => step.status === 'pass').length;
  const failCount = countedSteps.filter(step => step.status === 'fail').length;
  const visibleSteps = report?.steps.filter(step => step.kind !== 'start' && step.kind !== 'end' && step.kind !== 'screenshot') ?? [];
  let validUrl = false;
  try {
    validUrl = url.startsWith('https://') && new URL(url).protocol === 'https:' && Boolean(new URL(url).hostname);
  } catch {
    validUrl = false;
  }
  const canRun = Boolean(selectedProject) && validUrl && prompt.trim().length > 0 && prompt.length <= 500;
  const plannedSteps = prompt.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 20);
  const runFailed = execution.run?.status === 'failed';
  const status = execution.isRunning
    ? { label: 'Running', pill: 'border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300', dot: 'bg-cyan-500 animate-pulse' }
    : report
      ? report.status === 'passed'
        ? { label: 'PASSED', pill: 'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-500' }
        : { label: 'FAILED', pill: 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300', dot: 'bg-red-500' }
      : runFailed
        ? { label: 'Failed', pill: 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300', dot: 'bg-red-500' }
        : { label: 'Idle', pill: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' };
  const logText = report?.log_excerpt
    || (execution.isRunning ? 'Waiting for agent output…' : visibleSteps.length ? visibleSteps.map(step => step.message).join('\n') : 'Logs will appear here after you run a test.');

  return (
  <div data-mipqa="ai-execute-page" className="space-y-6">
    <header data-mipqa="ai-execute-header" className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 data-mipqa="ai-execute-title" className="text-3xl font-bold text-slate-900 dark:text-white">
            AI Agent Execute
          </h1>
          <p data-mipqa="ai-execute-subtitle" className="mt-1 text-sm text-slate-500 dark:text-slate-400">Visual interface</p>
        </div>
        <div data-mipqa="ai-execute-pills" className="flex flex-wrap gap-2">
          <span data-mipqa="ai-execute-status-pill" role="status" className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${status.pill}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span data-mipqa="ai-execute-project-pill" title={selectedProject?.name} className="inline-block max-w-xs truncate rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Project: {selectedProject?.name ?? 'None'}
          </span>
          <span data-mipqa="ai-execute-mode-pill" className="inline-flex items-center rounded-full border border-purple-300 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-800 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            Mode: Prompt → Steps
          </span>
        </div>
      </div>
      <div data-mipqa="ai-execute-project-name" className="space-y-1 text-sm">
        {selectedProject ? <>
          <span data-mipqa="ai-execute-running-in-label" className="block text-slate-600 dark:text-slate-300">Running in:</span>
          <ProjectTitle project={selectedProject} truncate />
        </> : <p data-mipqa="ai-execute-no-project-text" className="text-slate-600 dark:text-slate-300">
          No project selected. Select a project from the Projects page to run a test.{' '}
          <Link data-mipqa="ai-execute-go-to-projects-link" to="/projects" className="font-semibold text-cyan-600 hover:underline dark:text-cyan-400">Go to Projects</Link>
        </p>}
      </div>
    </header>
    <div data-mipqa="ai-execute-grid" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section data-mipqa="ai-execute-run-card" aria-labelledby="ai-execute-run-title" className={cardClass}>
        <h2 id="ai-execute-run-title" data-mipqa="ai-execute-run-title" className={cardTitleClass}>
          Run a test
        </h2>
        <form data-mipqa="ai-execute-form" className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); if (canRun) execution.start({ url, device, prompt }); }}>
          <fieldset disabled={execution.isRunning} className="space-y-4">
          <label className={labelClass}>
            <span>Device</span>
            <select data-mipqa="ai-execute-device-select" className={inputClass} value={device} onChange={event => setDevice(event.target.value as AiExecuteInput['device'])}>
              {devices.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            <span>Base URL</span>
            <input
              data-mipqa="ai-execute-url-input"
              className={inputClass}
              type="url"
              required
              pattern="https://.*"
              value={url}
              onChange={event => setUrl(event.target.value)}
              aria-describedby="ai-execute-url-help"
            />
          </label>
          <p id="ai-execute-url-help" data-mipqa="ai-execute-url-help" className="text-sm text-slate-600 dark:text-slate-300">
            Required. Enter a valid address starting with https://.
          </p>
          <button
            data-mipqa="ai-execute-run-button"
            type="submit"
            disabled={!canRun || execution.isRunning}
            className="flex w-full min-w-[140px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:from-cyan-500 hover:to-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-none disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none dark:focus-visible:ring-offset-slate-800 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 sm:w-auto"
          >
            {execution.isRunning ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
            {execution.isRunning ? 'Running…' : 'Run'}
          </button>
          <label className={`${labelClass} border-t border-slate-200 pt-4 dark:border-slate-600/50`}>
            <span>Natural-language prompt</span>
            <textarea
              data-mipqa="ai-execute-prompt-input"
              className={inputClass}
              required
              rows={5}
              maxLength={500}
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              placeholder="Describe your test, one step per line"
              aria-describedby="ai-execute-prompt-counter"
            />
          </label>
          <p id="ai-execute-prompt-counter" data-mipqa="ai-execute-prompt-counter" className="text-right text-sm text-slate-600 dark:text-slate-300">
            {prompt.length}/500
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Quick templates</p>
            <div className="flex flex-wrap gap-2">
              {templates.map(template => (
                <button
                  key={template.label}
                  data-mipqa={`ai-execute-${template.label.toLowerCase().replace(/[^a-z]+/g, '-')}-button`}
                  type="button"
                  onClick={() => setPrompt(`Go to ${url}. ${template.text}`.slice(0, 500))}
                  className="rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-cyan-600 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
          </fieldset>
          {execution.error && !runFailed && <p data-mipqa="ai-execute-error" role="alert" className="text-sm text-red-700 dark:text-red-300">{execution.error}</p>}
          {execution.timedOut && <p data-mipqa="ai-execute-timeout" role="status" className="text-sm text-slate-700 dark:text-slate-300">The status check timed out. The test may still be running.</p>}
          {!execution.isRunning && (execution.timedOut || (execution.error && !runFailed && execution.run)) && (
            <button data-mipqa="ai-execute-retry-poll-button" type="button" onClick={execution.retryPoll} className="rounded-lg border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-700 dark:border-cyan-400 dark:text-cyan-400">Retry status check</button>
          )}
        </form>
        {runFailed && <div data-mipqa="ai-execute-error" role="alert" className="mt-6 rounded-lg border border-red-300 p-4 text-sm text-red-700 dark:border-red-700 dark:text-red-300">{execution.run?.errorMessage || 'Test execution failed.'}</div>}
      </section>
      <section data-mipqa="ai-execute-steps-card" aria-labelledby="ai-execute-steps-title" className={cardClass}>
        <div className="border-b border-slate-200 pb-4 dark:border-slate-600/50">
          <h2 id="ai-execute-steps-title" data-mipqa="ai-execute-steps-title" className="text-lg font-semibold text-cyan-700 dark:text-cyan-400">
            Planned / Executed steps
          </h2>
          <p data-mipqa="ai-execute-steps-device" className="mt-1 text-sm text-slate-500 dark:text-slate-400">Device: {report?.device ?? device}</p>
        </div>
        {execution.isRunning ? (
          <div data-mipqa="ai-execute-progress" role="status" className="flex items-center justify-center gap-3 py-16 text-sm text-slate-600 dark:text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
            Running on {device}…
          </div>
        ) : execution.run?.status === 'ready' ? (
          report ? <div className="mt-4 space-y-6">
            {selectedProject && execution.run && report.screenshot_keys.length > 0 && <div data-mipqa="ai-execute-screenshots" className="flex flex-wrap gap-3">
              {report.screenshot_keys.map((key, index) => <ScreenshotPreview key={`${execution.run!.id}-${key}-${index}`} projectId={selectedProject.id} runId={execution.run!.id} screenshotKey={key} index={index + 1} />)}
            </div>}
            <ol data-mipqa="ai-execute-steps-list" className="space-y-3">
              {visibleSteps.length ? visibleSteps.map((step, index) => {
                const Icon = step.status === 'pass' ? CheckCircle2 : step.status === 'fail' ? XCircle : Circle;
                return <li key={index} data-mipqa={`ai-execute-step-${index + 1}`} className={`flex gap-3 rounded-lg border border-l-4 border-slate-300 bg-slate-100/80 p-4 dark:border-slate-600 dark:bg-slate-700/50 ${stepBorders[step.status]}`}>
                  <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${resultColors[step.status]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-slate-900 dark:text-white">{step.message}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{step.kind === 'assertion' ? 'Assertion' : 'Execution step'}</p>
                  </div>
                  <span data-mipqa={`ai-execute-step-${index + 1}-status-badge`} className={`h-fit shrink-0 text-xs font-semibold ${resultColors[step.status]}`}>{statusLabels[step.status]}</span>
                </li>;
              }) : <li className="text-sm text-slate-600 dark:text-slate-300">No steps were executed.</li>}
            </ol>
          </div> : <p data-mipqa="ai-execute-missing-report" role="status" className="mt-4 text-sm text-slate-700 dark:text-slate-300">Test execution completed, but no execution report was returned.</p>
        ) : runFailed ? (
          <p data-mipqa="ai-execute-no-steps" className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">No steps were executed.</p>
        ) : plannedSteps.length ? (
          <ol data-mipqa="ai-execute-planned-list" className="mt-4 space-y-3">
            {plannedSteps.map((line, index) => (
              <li key={index} data-mipqa={`ai-execute-planned-step-${index + 1}`} className="rounded-lg border border-slate-300 bg-slate-100/80 p-4 dark:border-slate-600 dark:bg-slate-700/50">
                <p className="break-words text-sm font-semibold text-slate-900 dark:text-white">{line}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Planned from your prompt</p>
              </li>
            ))}
          </ol>
        ) : (
          <p data-mipqa="ai-execute-empty-steps" className="py-16 text-center text-sm text-slate-600 dark:text-slate-300">Add a prompt to see planned steps.</p>
        )}
      </section>
    </div>
    <div data-mipqa="ai-execute-bottom-grid" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section data-mipqa="ai-execute-live-logs" aria-labelledby="ai-execute-live-logs-title" className={cardClass}>
        <h2 id="ai-execute-live-logs-title" data-mipqa="ai-execute-live-logs-title" className={cardTitleClass}>Live logs</h2>
        <div data-mipqa="ai-execute-raw-output" className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-4 dark:bg-black/40">
          <pre data-mipqa="ai-execute-raw-output-pre" className="whitespace-pre-wrap break-words font-mono text-xs text-slate-200">{logText}</pre>
        </div>
      </section>
      <section data-mipqa="ai-execute-result-summary" aria-labelledby="ai-execute-result-summary-title" className={cardClass}>
        <h2 id="ai-execute-result-summary-title" data-mipqa="ai-execute-result-summary-title" className={cardTitleClass}>Result summary</h2>
        <dl data-mipqa="ai-execute-results" className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 text-sm">
          <dt className="text-slate-500 dark:text-slate-400">Status</dt>
          <dd>
            <span data-mipqa="ai-execute-status-badge" className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-semibold ${status.pill}`}>{status.label}</span>
          </dd>
          <dt className="text-slate-500 dark:text-slate-400">Steps</dt>
          <dd data-mipqa="ai-execute-steps-count" className="font-medium text-slate-900 dark:text-white">{report ? countedSteps.length : '—'}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Duration</dt>
          <dd data-mipqa="ai-execute-duration" className="font-medium text-slate-900 dark:text-white">{report ? `${(report.duration_ms / 1000).toFixed(1)}s` : '—'}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Results</dt>
          <dd data-mipqa="ai-execute-counts" className="text-slate-700 dark:text-slate-300">{report ? `${passCount} passed · ${failCount} failed` : '—'}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Summary</dt>
          <dd data-mipqa="ai-execute-summary" title={report?.summary} className="truncate text-slate-700 dark:text-slate-300">{report?.summary || '—'}</dd>
          <dt className="text-slate-500 dark:text-slate-400">URL</dt>
          <dd data-mipqa="ai-execute-url" title={report?.url} className="truncate text-slate-700 dark:text-slate-300">{report?.url || '—'}</dd>
        </dl>
      </section>
    </div>
  </div>
);
};

const AiAgentExecute: React.FC = () => {
  const [queryClient] = useState(() => new QueryClient());
  const { state } = useApp();
  return (
    <QueryClientProvider client={queryClient}>
      <AiAgentExecuteContent key={state.selectedProjectId ?? 'none'} />
    </QueryClientProvider>
  );
};

export default AiAgentExecute;
