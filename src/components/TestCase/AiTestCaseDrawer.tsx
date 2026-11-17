import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Sparkles, TestTube2, Upload, X } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AiTestProposalReview from './AiTestProposalReview';
import { AiCommitCounts } from '../../services/aiTestProposal';
import { useAiTestGeneration } from '../../hooks/useAiTestGeneration';
import { AI_DEVICES, buildAiDraftText, validateAiDraft, validateAiFiles } from './aiTestCaseDraft';

interface AiTestCaseDrawerProps {
  onClose: () => void;
  isOpen: boolean;
  projectId?: string;
  projectUrl?: string;
  onCommitted: (counts: AiCommitCounts) => void;
}

const AiTestCaseDrawerContent: React.FC<AiTestCaseDrawerProps> = ({ onClose, isOpen, projectId, projectUrl, onCommitted }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [sentPrompt, setSentPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useAiTestGeneration(projectId, isOpen);
  const ready = generation.session?.status === 'ready';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen) { dialog?.close(); return; }
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    textareaRef.current?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen]);

  const addFiles = (incoming: File[]) => {
    const next = [...files, ...incoming];
    const validationError = validateAiFiles(next);
    setError(validationError);
    if (!validationError) setFiles(next);
  };

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (generation.isRunning || generation.needsPollRetry) return;
    const validationError = !projectId ? 'Select a project first.' : validateAiFiles(files) || validateAiDraft(prompt, files.length, projectUrl);
    setError(validationError);
    if (validationError) return;
    if (!generation.send(buildAiDraftText(prompt, AI_DEVICES[0], files.length ? '' : projectUrl ?? ''), files)) return;
    setSentPrompt(prompt.trim() || 'create test cases from these images');
  };

  const startOver = () => {
    generation.reset();
    setPrompt('');
    setSentPrompt('');
    setFiles([]);
    setError(null);
    setDragging(false);
  };

  return (
    <dialog ref={dialogRef} aria-labelledby="ai-testcase-title" data-mipqa="ai-testcase-drawer" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none bg-transparent p-0 text-slate-900 dark:text-slate-100 backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm">
      <section className={`absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden border border-pink-400/40 bg-slate-50 shadow-2xl dark:bg-slate-900 sm:inset-y-4 sm:right-4 sm:rounded-lg ${ready ? 'sm:w-[min(1100px,calc(100vw-32px))]' : 'sm:w-[min(760px,calc(100vw-32px))]'}`}>
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-slate-100 px-6 py-3 dark:border-slate-700 dark:bg-slate-800">
          <h2 id="ai-testcase-title" data-mipqa="ai-testcase-title" className="flex items-center gap-3 text-sm font-semibold"><Sparkles className="h-4 w-4 text-pink-600 dark:text-pink-400" />Generate Test Cases</h2>
          <button type="button" data-mipqa="ai-testcase-close-button" aria-label="Close Generate Test Cases" onClick={onClose} className="rounded p-1 text-slate-600 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-400 dark:text-slate-300 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
        </header>
        {ready && generation.session?.proposal ? (
          <AiTestProposalReview key={generation.session.id} proposal={generation.session.proposal} sentPrompt={sentPrompt} commit={generation.commit} onCommitted={onCommitted} onStartOver={startOver} />
        ) : (
          <form onSubmit={handleSend} data-mipqa="ai-testcase-composer" className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8">
            <div className="flex flex-1 flex-col items-center justify-start pb-8 pt-8 text-center sm:pt-16">
              <TestTube2 className="mb-6 h-10 w-10 text-pink-600 dark:text-pink-400" aria-hidden="true" />
              <h3 data-mipqa="ai-requirements-title" className="text-lg font-semibold leading-tight">Generate test case with your requirements</h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">Build automation faster with AI support. Provide context, review the output and refine with confidence.</p>
              <button type="button" data-mipqa="ai-upload-dropzone-button" disabled={generation.isRunning} onClick={() => fileInputRef.current?.click()} onDragOver={event => { event.preventDefault(); if (!generation.isRunning) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!generation.isRunning) addFiles(Array.from(event.dataTransfer.files)); }} className={`mt-8 flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-6 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 disabled:opacity-50 ${dragging ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950' : 'border-slate-300 bg-slate-100 hover:border-cyan-500 dark:border-slate-600 dark:bg-slate-800'}`}>
                <Upload className="h-5 w-5 text-cyan-700 dark:text-cyan-400" />
                <span>Drag &amp; Drop or Choose file to upload</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">PNG, JPEG, WebP · Max 5 files · 10 MB each</span>
              </button>
              <input ref={fileInputRef} data-mipqa="ai-attachment-input" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} className="hidden" />
              {files.length > 0 && <ul className="mt-4 w-full max-w-md space-y-2 text-left">{files.map((file, index) => <li key={index} className="flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-2 text-xs dark:bg-slate-800"><Paperclip className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{file.name}</span><button type="button" disabled={generation.isRunning} data-mipqa="ai-attachment-remove-button" aria-label={`Remove ${file.name}`} onClick={() => { setFiles(previous => previous.filter((_, fileIndex) => fileIndex !== index)); setError(null); }} className="rounded p-1 hover:bg-slate-300 dark:hover:bg-slate-700"><X className="h-4 w-4" /></button></li>)}</ul>}
            </div>
            {generation.notice && <div role="status" data-mipqa="ai-assistant-message" className="mb-4 rounded-lg border border-slate-300 p-4 text-sm leading-relaxed dark:border-slate-600">
              <p className="flex items-center gap-2">{generation.isRunning && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}{generation.notice}</p>
              {generation.needsPollRetry && <button type="button" data-mipqa="ai-retry-poll-button" onClick={generation.retryPoll} className="mt-3 rounded border border-cyan-600 px-3 py-2 text-cyan-800 dark:text-cyan-300">Retry status check</button>}
            </div>}
            {ready && !generation.session?.proposal && <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">The completed session has no proposal to review.</p>}
            <textarea ref={textareaRef} data-mipqa="ai-prompt-input" aria-label="Requirements prompt" placeholder="Enter your prompt to generate test cases." value={prompt} disabled={generation.isRunning} onChange={event => { setPrompt(event.target.value); setError(null); }} rows={3} className="min-h-24 w-full shrink-0 resize-y rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-70" />
            {error && <p role="alert" data-mipqa="ai-validation-error" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
            <div className="mt-4 flex justify-end">
              <button type="submit" data-mipqa="ai-send-button" disabled={generation.isRunning || generation.needsPollRetry || !projectId || (!prompt.trim() && !files.length)} className="flex items-center gap-2 rounded-lg border border-pink-500 bg-pink-700 px-5 py-3 text-sm font-medium text-white hover:bg-pink-800 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-4 w-4" />{generation.isRunning ? 'Generating…' : 'Generate Test Cases'}</button>
            </div>
          </form>
        )}
      </section>
    </dialog>
  );
};

const AiTestCaseDrawer: React.FC<AiTestCaseDrawerProps> = props => {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}><AiTestCaseDrawerContent {...props} /></QueryClientProvider>;
};

export default AiTestCaseDrawer;
