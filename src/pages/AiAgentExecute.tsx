import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Play, X } from 'lucide-react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useAiExecuteRun } from '../hooks/useAiExecuteRun';
import { AiExecuteInput, createAiExecuteApi } from '../services/aiExecuteApi';
import { apiService } from '../services/api';
import { useApp } from '../context/AppContext';

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
  if (image.isError || imageFailed) return <span role="alert" className="block p-4 text-sm text-red-700 dark:text-red-300">Screenshot unavailable.</span>;
  return <img data-mipqa={full ? 'ai-execute-full-img' : 'ai-execute-thumbnail-img'} src={image.data} alt={full ? 'Full test execution screenshot' : 'Test execution screenshot preview'} referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className={full ? 'max-h-[75vh] w-full object-contain' : 'h-32 w-full rounded-lg object-contain'} />;
}

function ScreenshotPreview({ projectId, runId, screenshotKey, index }: { projectId: string; runId: string; screenshotKey: string; index: number }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) dialogRef.current?.showModal();
  }, [open]);
  return <>
    <button ref={buttonRef} data-mipqa={`ai-execute-screenshot-${index}-button`} type="button" aria-label={`Open screenshot ${index}`} onClick={() => setOpen(true)} className="rounded-lg border border-slate-300 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-600">
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
  const { state, dispatch } = useApp();
  const selectedProject = state.projects.find(project => project.id === state.selectedProjectId);
  const execution = useAiExecuteRun(selectedProject?.id);
  const [device, setDevice] = useState<AiExecuteInput['device']>('Desktop Chrome');
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const report = execution.run?.status === 'ready' ? execution.run.executionReport : null;
  let validUrl = false;
  try {
    validUrl = url.startsWith('https://') && new URL(url).protocol === 'https:' && Boolean(new URL(url).hostname);
  } catch {
    validUrl = false;
  }
  const canRun = Boolean(selectedProject) && validUrl && prompt.trim().length > 0 && prompt.length <= 500;

  return (
  <div data-mipqa="ai-execute-page" className="space-y-6">
    <h1 data-mipqa="ai-execute-title" className="text-3xl font-bold text-slate-900 dark:text-white">
      AI Agent Execute
    </h1>
    <p data-mipqa="ai-execute-project-name" className="text-sm text-slate-600 dark:text-slate-300">
      Project: {selectedProject?.name ?? 'None selected'}
    </p>
    <div data-mipqa="ai-execute-grid" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section
        data-mipqa="ai-execute-run-card"
        aria-labelledby="ai-execute-run-title"
        className="min-h-64 min-w-0 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-600 dark:bg-slate-800/90"
      >
        <h2
          id="ai-execute-run-title"
          data-mipqa="ai-execute-run-title"
          className="border-b border-slate-200 pb-4 text-lg font-semibold text-cyan-700 dark:border-slate-600 dark:text-cyan-400"
        >
          Run a test
        </h2>
        <form data-mipqa="ai-execute-form" className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); if (canRun) execution.start({ url, device, prompt }); }}>
          <fieldset disabled={execution.isRunning} className="space-y-4">
          <label className={labelClass}>
            <span>Project</span>
            <select
              data-mipqa="ai-execute-project-select"
              className={inputClass}
              required
              value={selectedProject?.id ?? ''}
              onChange={event => dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: event.target.value || null })}
            >
              <option value="">Select a project</option>
              {state.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
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
          <label className={labelClass}>
            <span>Prompt</span>
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
                  className="rounded-full border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-cyan-600 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
          <button
            data-mipqa="ai-execute-run-button"
            type="submit"
            disabled={!canRun || execution.isRunning}
            className="flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {execution.isRunning ? 'Running…' : 'Run'}
          </button>
          </fieldset>
          {execution.error && <p data-mipqa="ai-execute-error" role="alert" className="text-sm text-red-700 dark:text-red-300">{execution.error}</p>}
          {execution.timedOut && <p data-mipqa="ai-execute-timeout" role="status" className="text-sm text-slate-700 dark:text-slate-300">The status check timed out. The test may still be running.</p>}
          {!execution.isRunning && (execution.timedOut || (execution.error && execution.run?.status !== 'failed' && execution.run)) && (
            <button data-mipqa="ai-execute-retry-poll-button" type="button" onClick={execution.retryPoll} className="rounded-lg border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-700 dark:border-cyan-400 dark:text-cyan-400">Retry status check</button>
          )}
        </form>
        {report && <div data-mipqa="ai-execute-results" className="mt-6 space-y-6 border-t border-slate-200 pt-6 dark:border-slate-600">
          <div className="space-y-4">
            <span data-mipqa="ai-execute-status-badge" className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${report.status === 'passed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>{report.status.toUpperCase()}</span>
            <p data-mipqa="ai-execute-summary" className="whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-300">{report.summary}</p>
            <p data-mipqa="ai-execute-duration" className="text-sm text-slate-600 dark:text-slate-300">Duration: {(report.duration_ms / 1000).toFixed(2)}s · {report.steps.length} steps</p>
          </div>
          <section aria-labelledby="ai-execute-logs-title">
            <h3 id="ai-execute-logs-title" data-mipqa="ai-execute-logs-title" className="mb-4 font-semibold text-slate-900 dark:text-white">Live logs</h3>
            <div data-mipqa="ai-execute-logs" className="max-h-64 space-y-2 overflow-auto rounded-lg bg-slate-100 p-4 font-mono text-sm dark:bg-slate-900">
              {report.steps.length ? report.steps.map((step, index) => <p key={index} className={`whitespace-pre-wrap break-words ${step.status === 'fail' || step.kind === 'error' ? resultColors.fail : resultColors.info}`}>[{step.kind}] {step.message}</p>) : <p className={resultColors.info}>No log entries were returned.</p>}
            </div>
          </section>
          {selectedProject && execution.run && report.screenshot_keys.length > 0 && <section aria-labelledby="ai-execute-screenshots-title">
            <h3 id="ai-execute-screenshots-title" className="mb-4 font-semibold text-slate-900 dark:text-white">Screenshots</h3>
            <div data-mipqa="ai-execute-screenshots" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {report.screenshot_keys.map((key, index) => <ScreenshotPreview key={`${execution.run!.id}-${key}-${index}`} projectId={selectedProject.id} runId={execution.run!.id} screenshotKey={key} index={index + 1} />)}
            </div>
          </section>}
        </div>}
      </section>
      <section
        data-mipqa="ai-execute-steps-card"
        aria-labelledby="ai-execute-steps-title"
        className="min-h-64 min-w-0 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-600 dark:bg-slate-800/90"
      >
        <h2
          id="ai-execute-steps-title"
          data-mipqa="ai-execute-steps-title"
          className="border-b border-slate-200 pb-4 text-lg font-semibold text-cyan-700 dark:border-slate-600 dark:text-cyan-400"
        >
          Planned / executed steps
        </h2>
        {execution.isRunning ? (
          <div data-mipqa="ai-execute-progress" role="status" className="flex items-center justify-center gap-3 py-16 text-sm text-slate-600 dark:text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
            Running…
          </div>
        ) : execution.run?.status === 'ready' ? (
          report ? <ol data-mipqa="ai-execute-steps-list" className="mt-4 space-y-4">
            {report.steps.length ? report.steps.map((step, index) => <li key={index} data-mipqa={`ai-execute-step-${index + 1}`} className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-600">
              <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-slate-900 dark:text-white">{step.n}. {step.message}</p>
              <span className={`text-xs font-semibold uppercase ${resultColors[step.status]}`}>{step.status}</span>
            </li>) : <li className="text-sm text-slate-600 dark:text-slate-300">No steps were returned.</li>}
          </ol> : <p data-mipqa="ai-execute-missing-report" role="status" className="mt-4 text-sm text-slate-700 dark:text-slate-300">Test execution completed, but no execution report was returned.</p>
        ) : !execution.run && !execution.error ? (
          <p className="py-16 text-center text-sm text-slate-600 dark:text-slate-300">Run a test to see its progress.</p>
        ) : null}
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
