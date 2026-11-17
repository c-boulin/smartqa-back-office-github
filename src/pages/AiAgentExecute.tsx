import React, { useEffect, useRef, useState } from 'react';
import { Download, Play, Square, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

type Outcome = 'PASSED' | 'FAILED' | 'ERROR';
type Status = Outcome | 'STOPPED';
type Log = { kind: 'start' | 'step' | 'assertion' | 'screenshot' | 'error' | 'end'; text: string; failed?: boolean };
type Run = { id: string; url: string; device: string; prompt: string; steps: string[]; completed: number; logs: Log[]; status: Status | null; duration: number; summary: string; thumbnail: boolean };

const devices = ['Desktop Chrome', 'iPhone 12', 'iPad', 'Samsung Galaxy S21'];
const suggestions: Record<string, string> = {
  'Login flow': 'Accept cookies if shown. Open the sign-in page. Enter the test credentials and submit. Verify the account area is visible. Take a screenshot.',
  'Checkout flow': 'Accept cookies if shown. Add one product to the cart. Open checkout. Verify the order summary and total are visible. Take a screenshot.',
  'Search + filter': 'Search for a keyword. Apply one filter. Verify the result list updates. Take a screenshot.',
  'Language switch': 'Switch the site language. Verify the main navigation labels change. Take a screenshot.',
  'Basic performance': 'Load the homepage. Verify the main heading is visible and no blocking modal covers the page. Take a screenshot.',
};
const cardClass = 'min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800/90';
const textClass = 'text-sm text-slate-500 dark:text-slate-400';
const inputClass = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-sm text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-60';
const buttonClass = 'flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed';
const statusClass: Record<Status, string> = { PASSED: 'text-green-600 dark:text-green-400', FAILED: 'text-red-800 dark:text-red-300', ERROR: 'text-red-800 dark:text-red-300', STOPPED: 'text-amber-700 dark:text-amber-300' };

function Screenshot({ run }: { run: Run }) {
  return <svg data-mipqa="ai-execute-screenshot-img" viewBox="0 0 640 360" role="img" aria-label="Simulated test screenshot, not a capture of the target website" className="w-full text-slate-900 dark:text-white">
    <rect x="1" y="1" width="638" height="358" rx="8" fill="none" stroke="currentColor" />
    <path d="M1 48H639" stroke="currentColor" />
    <text x="24" y="30" fill="currentColor" fontSize="14">{run.device} — simulated screenshot</text>
    <text x="24" y="100" fill="currentColor" fontSize="18">AI Agent Execute</text>
    <text x="24" y="136" fill="currentColor" fontSize="14">{run.url.length > 65 ? `${run.url.slice(0, 65)}…` : run.url}</text>
    <text x="24" y="196" fill="currentColor" fontSize="24">{run.status}</text>
    <text x="24" y="232" fill="currentColor" fontSize="14">{run.completed} steps executed</text>
    <text x="24" y="320" fill="currentColor" fontSize="14">Demo only. No website was visited.</text>
  </svg>;
}

const AiAgentExecute: React.FC = () => {
  const { state: appState, dispatch } = useApp();
  const selectedProject = appState.projects.find(project => project.id === appState.selectedProjectId) ?? null;
  const [device, setDevice] = useState(devices[0]);
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [outcome, setOutcome] = useState<Outcome>('PASSED');
  const [run, setRun] = useState<Run | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const started = useRef(0);
  const active = useRef(false);
  const lightbox = useRef<HTMLDialogElement>(null);
  const thumbnailButton = useRef<HTMLButtonElement>(null);
  const running = run !== null && run.status === null;
  let validUrl = false;
  try { validUrl = url.startsWith('https://') && new URL(url).protocol === 'https:' && Boolean(new URL(url).hostname); } catch { validUrl = false; }
  const valid = selectedProject !== null && validUrl && prompt.trim().length > 0 && prompt.length <= 500;

  useEffect(() => () => {
    active.current = false;
    timers.current.forEach(clearTimeout);
  }, []);

  const startRun = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || active.current) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const lines = prompt.split(/\n+/).map(line => line.trim()).filter(Boolean);
    const steps = lines.length >= 3 ? lines.slice(0, 6) : ['Open the target page', ...lines, 'Verify the expected result'].slice(0, 6);
    active.current = true;
    started.current = performance.now();
    setRun({ id: crypto.randomUUID(), url, device, prompt, steps, completed: 0, logs: [{ kind: 'start', text: `Simulation started on ${device}` }], status: null, duration: 0, summary: '', thumbnail: false });
    steps.forEach((step, index) => {
      timers.current.push(setTimeout(() => {
        if (!active.current) return;
        setRun(previous => previous && ({ ...previous, completed: index + 1, logs: [...previous.logs, { kind: 'step', text: `${index + 1}. ${step}` }] }));
      }, ((index + 1) / (steps.length + 1)) * 3000));
    });
    timers.current.push(setTimeout(() => {
      if (!active.current) return;
      active.current = false;
      const summary = outcome === 'PASSED' ? 'All simulated assertions passed.' : outcome === 'FAILED' ? 'One simulated assertion failed.' : 'Navigation error: target page closed';
      setRun(previous => {
        if (!previous) return previous;
        const finalLogs: Log[] = outcome === 'ERROR' ? [{ kind: 'error', text: summary }] : [
          { kind: 'assertion', text: outcome === 'FAILED' ? 'FAILED: expected result did not match.' : 'PASSED: expected result verified.', failed: outcome === 'FAILED' },
          { kind: 'screenshot', text: 'Simulated screenshot generated.' },
        ];
        return { ...previous, status: outcome, duration: Math.round(performance.now() - started.current), summary, thumbnail: outcome !== 'ERROR', logs: [...previous.logs, ...finalLogs, { kind: 'end', text: `Simulation finished: ${outcome}` }] };
      });
    }, 4000));
  };

  const stopRun = () => {
    if (!active.current) return;
    active.current = false;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const duration = Math.round(performance.now() - started.current);
    setRun(previous => previous && ({ ...previous, status: 'STOPPED', duration, summary: 'Simulation stopped by user.', logs: [...previous.logs, { kind: 'end', text: 'Simulation finished: STOPPED' }] }));
  };

  const downloadReport = () => {
    if (!run?.status) return;
    const escape = (value: string | number) => {
      const text = String(value);
      const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csv = 'run_id,status,url,device,prompt,summary,duration_ms\r\n' + [run.id, run.status, run.url, run.device, run.prompt, run.summary, run.duration].map(escape).join(',');
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `ai-execute-${run.id}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  };

  return <div data-mipqa="ai-execute-page" className="space-y-6">
    <div>
      <h1 data-mipqa="ai-execute-title" className="text-3xl font-bold text-slate-900 dark:text-white">AI Agent Execute</h1>
      <p data-mipqa="ai-execute-project-name" className={`mt-1 ${textClass}`}>Project: {selectedProject?.name ?? 'None selected'}</p>
      <p className={`mt-1 ${textClass}`}>Simulated test execution — no browser opens and no website is visited.</p>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <section data-mipqa="ai-execute-run-card" className={cardClass}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Run a test</h2>
        <form onSubmit={startRun} className="mt-4 space-y-4">
          <label className={`block space-y-2 ${textClass}`}>Project
            <select data-mipqa="ai-execute-project-select" className={inputClass} value={selectedProject?.id ?? ''} disabled={running} onChange={event => dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: event.target.value || null })}>
              <option value="">Select a project</option>
              {appState.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          {!selectedProject && <p data-mipqa="ai-execute-project-required" role="status" className={textClass}>Select a project to run a test.</p>}
          <label className={`block space-y-2 ${textClass}`}>Device
            <select data-mipqa="ai-execute-device-select" className={inputClass} value={device} disabled={running} onChange={event => setDevice(event.target.value)}>{devices.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          <label className={`block space-y-2 ${textClass}`}>Base URL
            <input data-mipqa="ai-execute-url-input" className={inputClass} type="url" required placeholder="https://your-site.com" value={url} disabled={running} onChange={event => setUrl(event.target.value)} aria-describedby="ai-url-help" />
          </label>
          <p id="ai-url-help" className={textClass}>Required. Must start with https://.</p>
          <label className={`block space-y-2 ${textClass}`}>Prompt
            <textarea data-mipqa="ai-execute-prompt-input" className={inputClass} rows={5} required maxLength={500} value={prompt} disabled={running} onChange={event => setPrompt(event.target.value)} placeholder="Describe your test, one step per line" />
          </label>
          <p data-mipqa="ai-execute-prompt-counter" className={`text-right ${textClass}`}>{prompt.length}/500</p>
          <div className="flex flex-wrap gap-2">{Object.entries(suggestions).map(([label, value]) => <button data-mipqa={`ai-execute-${label.toLowerCase().replace(/[^a-z]+/g, '-')}-button`} type="button" key={label} disabled={running} onClick={() => setPrompt(`Go to ${(url.trim() || 'https://www.example.com').slice(0, 499 - value.length - 8)}. ${value}`)} className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300 disabled:opacity-60">{label}</button>)}</div>
          <div className="flex flex-wrap items-end gap-4">
            <button data-mipqa="ai-execute-run-button" type="submit" disabled={!valid || running} className={buttonClass}><Play className="h-4 w-4" />{running ? 'Running...' : 'Run'}</button>
            <label className={`space-y-2 ${textClass}`}>Demo outcome
              <select data-mipqa="ai-execute-outcome-select" className={inputClass} value={outcome} disabled={running} onChange={event => setOutcome(event.target.value as Outcome)}>{(['PASSED', 'FAILED', 'ERROR'] as const).map(value => <option key={value}>{value}</option>)}</select>
            </label>
            {running && <button data-mipqa="ai-execute-stop-button" type="button" onClick={stopRun} className={buttonClass}><Square className="h-4 w-4" />Stop</button>}
          </div>
        </form>
        <div className="mt-6 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Live logs</h3>
          <div data-mipqa="ai-execute-logs" role="log" aria-live="polite" aria-relevant="additions" className={`max-h-64 overflow-auto space-y-2 ${textClass}`}>
            {!run && <p>Logs appear after you run a test.</p>}
            {run?.logs.map((log, index) => <p key={`${run.id}-${index}`} className={log.failed || log.kind === 'error' ? statusClass.ERROR : undefined}><span className="font-medium">[{log.kind}]</span> {log.text}</p>)}
          </div>
          {run?.status && <div data-mipqa="ai-execute-result-summary" role="status" className="space-y-2">
            <p className={`font-semibold ${statusClass[run.status]}`}>{run.status}</p>
            <p className={textClass}>{run.summary} Duration: {(run.duration / 1000).toFixed(2)}s · {run.completed} steps executed</p>
            {run.thumbnail && <button ref={thumbnailButton} type="button" data-mipqa="ai-execute-thumbnail-button" aria-label="Open simulated screenshot" className="block w-full max-w-xs rounded-lg border border-slate-200 dark:border-slate-700 p-2" onClick={() => lightbox.current?.showModal()}><Screenshot run={run} /></button>}
            <button data-mipqa="ai-execute-download-report-button" type="button" className={buttonClass} onClick={downloadReport}><Download className="h-4 w-4" />Download report</button>
          </div>}
        </div>
      </section>
      <section data-mipqa="ai-execute-steps-card" className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Planned / executed steps</h2><span className={textClass}>{run?.device ?? device}</span></div>
        {!run ? <p className={`py-24 text-center ${textClass}`}>Steps appear after you run a test.</p> : <ol className="mt-4 space-y-4">{run.steps.map((step, index) => <li data-mipqa={`ai-execute-step-${index + 1}`} key={`${run.id}-${index}`} className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-4 text-sm text-slate-900 dark:text-white"><span className="font-semibold">{index + 1}.</span><div className="min-w-0 break-words"><p>{step}</p><p className={textClass}>{index < run.completed ? 'Executed (simulated)' : run.status ? 'Not executed' : 'Planned'}</p></div></li>)}</ol>}
      </section>
    </div>
    <dialog ref={lightbox} data-mipqa="ai-execute-lightbox" aria-labelledby="ai-screenshot-title" className={`${cardClass} w-full max-w-3xl`} onClick={event => { if (event.target === event.currentTarget) lightbox.current?.close(); }} onClose={() => thumbnailButton.current?.focus()}>
      <div className="mb-4 flex items-center justify-between gap-4"><h2 id="ai-screenshot-title" className="text-lg font-semibold text-slate-900 dark:text-white">Simulated screenshot</h2><button data-mipqa="ai-execute-lightbox-close-button" type="button" aria-label="Close screenshot" className={buttonClass} onClick={() => lightbox.current?.close()}><X className="h-4 w-4" /></button></div>
      {run?.thumbnail && <Screenshot run={run} />}
    </dialog>
  </div>;
};

export default AiAgentExecute;
