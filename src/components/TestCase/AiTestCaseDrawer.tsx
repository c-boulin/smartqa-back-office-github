import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Paperclip, Plus, X } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAiTestGeneration } from '../../hooks/useAiTestGeneration';
import { AI_DEVICES, AI_PROMPT_CHIPS, buildAiDraftText, validateAiDraft, validateAiFiles } from './aiTestCaseDraft';

interface AiTestCaseDrawerProps {
  onClose: () => void;
  isOpen: boolean;
  projectId?: string;
}

const AiTestCaseDrawerContent: React.FC<AiTestCaseDrawerProps> = ({ onClose, isOpen, projectId }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [device, setDevice] = useState<string>(AI_DEVICES[0]);
  const [baseUrl, setBaseUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ text: string; files: string[] }>>([]);
  const generation = useAiTestGeneration(projectId, isOpen);
  const { isRunning } = generation;

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

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = [...files, ...Array.from(event.target.files ?? [])];
    const validationError = validateAiFiles(nextFiles);
    setError(validationError);
    if (!validationError) setFiles(nextFiles);
    event.target.value = '';
    setMenuOpen(false);
  };

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (isRunning || generation.needsPollRetry) return;
    if (!projectId) { setError('Select a project first.'); return; }
    const validationError = validateAiDraft(prompt, baseUrl, files.length);
    setError(validationError);
    if (validationError) return;
    const content = buildAiDraftText(prompt, device, baseUrl);
    if (!generation.send(content, files)) return;
    setMessages(previous => [...previous, { text: content, files: files.map(file => file.name) }]);
    setPrompt('');
    setFiles([]);
    setMenuOpen(false);
    textareaRef.current?.focus();
  };

  const fieldClass = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500';

  return (
    <dialog ref={dialogRef} aria-labelledby="ai-testcase-title" data-mipqa="ai-testcase-drawer" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none bg-transparent p-0 text-slate-900 dark:text-white backdrop:bg-slate-950/65">
      <section className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-slate-300 bg-slate-50 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:w-[488px]">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 id="ai-testcase-title" data-mipqa="ai-testcase-title" className="text-xl font-semibold">Create Test Case with AI</h2>
          <button type="button" data-mipqa="ai-testcase-close-button" aria-label="Close AI drawer" onClick={onClose} className="rounded-lg bg-slate-100 p-2 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-500 dark:bg-slate-700 dark:hover:bg-slate-600"><X className="h-5 w-5" /></button>
        </header>
        <div role="log" aria-label="Test case conversation" aria-live="polite" data-mipqa="ai-testcase-chat" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message, index) => (
            <div key={index} className="space-y-2">
              <div className="rounded-xl border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                {message.files.map((name, fileIndex) => <p key={fileIndex} className="mt-2 flex items-center gap-2 break-all text-sm text-slate-600 dark:text-slate-300"><Paperclip className="h-4 w-4 shrink-0" />{name}</p>)}
              </div>

            </div>
          ))}
          {generation.notice && <div data-mipqa="ai-assistant-message" className="rounded-xl border border-slate-300 bg-white p-4 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-800">
            <p className="whitespace-pre-wrap break-words">{generation.notice}</p>
            {generation.sessionId && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Session {generation.sessionId}</p>}
            {generation.needsPollRetry && <button type="button" data-mipqa="ai-retry-poll-button" onClick={generation.retryPoll} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">Retry status check</button>}
          </div>}
        </div>
        <form onSubmit={handleSend} data-mipqa="ai-testcase-composer" className="shrink-0 space-y-4 border-t border-slate-200 p-4 dark:border-slate-700">
          <div className="flex flex-wrap gap-2">
            {AI_PROMPT_CHIPS.map(chip => <button key={chip} type="button" data-mipqa={`ai-${chip.toLowerCase().replace(/ /g, '-')}-button`} onClick={() => { setPrompt(previous => `${previous}${previous && !previous.endsWith(' ') ? ' ' : ''}${chip}`); textareaRef.current?.focus(); }} className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-500 dark:border-slate-600 dark:hover:bg-slate-700">{chip}</button>)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">Device<select data-mipqa="ai-device-select" value={device} onChange={event => setDevice(event.target.value)} className={fieldClass}>{AI_DEVICES.map(name => <option key={name}>{name}</option>)}</select></label>
            <label className="space-y-2 text-sm">Base URL{files.length === 0 ? ' *' : ''}<input data-mipqa="ai-base-url-input" type="text" inputMode="url" value={baseUrl} onChange={event => setBaseUrl(event.target.value)} aria-required={files.length === 0} aria-describedby="ai-url-help" className={fieldClass} /></label>
          </div>
          <p id="ai-url-help" className="text-xs text-slate-600 dark:text-slate-400">Use an HTTPS URL, or attach an image. Up to 5 images, 10 MB each.</p>
          <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">Images can be uploaded, but AI does not read them yet. Image-only runs may fail; use a URL and prompt for now.</p>
          {files.length > 0 && <ul className="max-h-28 space-y-2 overflow-y-auto">{files.map((file, index) => <li key={index} className="flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-2 text-xs dark:bg-slate-800"><Paperclip className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{file.name}</span><button type="button" data-mipqa="ai-attachment-remove-button" aria-label={`Remove ${file.name}`} onClick={() => { setFiles(previous => previous.filter((_, fileIndex) => fileIndex !== index)); setError(null); }} className="rounded p-1 hover:bg-slate-300 dark:hover:bg-slate-700"><X className="h-4 w-4" /></button></li>)}</ul>}
          <div className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
            <textarea ref={textareaRef} data-mipqa="ai-prompt-input" aria-label="Describe test cases" placeholder="create test cases for" value={prompt} onChange={event => setPrompt(event.target.value)} rows={3} className="max-h-40 min-h-20 w-full resize-y bg-transparent text-sm placeholder:text-slate-500 focus:outline-none dark:placeholder:text-slate-400" />
            <div className="flex items-center justify-between">
              <div className="relative">
                <button type="button" data-mipqa="ai-attachment-menu-button" aria-label="Add attachments" aria-expanded={menuOpen} onClick={() => setMenuOpen(previous => !previous)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700"><Plus className="h-5 w-5" /></button>
                {menuOpen && <div className="absolute bottom-full left-0 mb-2 w-60 rounded-lg border border-slate-300 bg-white p-1 shadow-xl dark:border-slate-600 dark:bg-slate-700"><button type="button" data-mipqa="ai-upload-files-button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-2 rounded p-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-600"><Paperclip className="h-4 w-4" />Upload photos &amp; files</button></div>}
                <input ref={fileInputRef} data-mipqa="ai-attachment-input" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFiles} className="hidden" />
              </div>
              <button type="submit" data-mipqa="ai-send-button" aria-label="Send request" disabled={isRunning || generation.needsPollRetry || !projectId || (!prompt.trim() && files.length === 0)} className="rounded-full bg-slate-900 p-2 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"><ArrowUp className="h-5 w-5" /></button>
            </div>
          </div>
          {error && <p role="alert" data-mipqa="ai-validation-error" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        </form>
      </section>
    </dialog>
  );
};

const AiTestCaseDrawer: React.FC<AiTestCaseDrawerProps> = (props) => {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}><AiTestCaseDrawerContent {...props} /></QueryClientProvider>;
};

export default AiTestCaseDrawer;
