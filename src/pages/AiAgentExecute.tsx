import React, { useState } from 'react';
import { Play } from 'lucide-react';
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

const AiAgentExecute: React.FC = () => {
  const { state, dispatch } = useApp();
  const selectedProject = state.projects.find(project => project.id === state.selectedProjectId);
  const [device, setDevice] = useState(devices[0]);
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
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
        <form data-mipqa="ai-execute-form" className="mt-6 space-y-4" onSubmit={event => event.preventDefault()}>
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
            <select data-mipqa="ai-execute-device-select" className={inputClass} value={device} onChange={event => setDevice(event.target.value)}>
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
            disabled={!canRun}
            className="flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Run
          </button>
          <p data-mipqa="ai-execute-form-notice" className="text-sm text-slate-600 dark:text-slate-300">Test execution is not connected yet.</p>
        </form>
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
      </section>
    </div>
  </div>
);
};

export default AiAgentExecute;
