import React, { useState, useRef } from 'react';
import { X, Upload, FileJson, CheckCircle, AlertCircle, Loader, FolderOpen } from 'lucide-react';
import { apiService } from '../../services/api';

interface ImportProject {
  title: string;
  test_cases?: unknown[];
  configurations?: unknown[];
  [key: string]: unknown;
}

interface ImportPayload {
  mode: string;
  projects: ImportProject[];
}

interface ImportedProject {
  id: number;
  title: string;
  test_cases_count: number;
}

interface ImportResult {
  message: string;
  projects: ImportedProject[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'preview' | 'success' | 'error';

const ImportProjectModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>('upload');
  const [jsonText, setJsonText] = useState('');
  const [parsed, setParsed] = useState<ImportPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setJsonText('');
    setParsed(null);
    setParseError(null);
    setImporting(false);
    setImportResult(null);
    setImportError(null);
    setFileName(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parseAndValidate = (raw: string): ImportPayload | null => {
    let obj: unknown;
    try {
      obj = JSON.parse(raw);
    } catch {
      setParseError('Invalid JSON — please check your file or pasted text.');
      return null;
    }
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      setParseError('JSON must be an object with a "projects" array.');
      return null;
    }
    const data = obj as Record<string, unknown>;
    if (!Array.isArray(data.projects) || data.projects.length === 0) {
      setParseError('JSON must contain a non-empty "projects" array.');
      return null;
    }
    for (const p of data.projects as unknown[]) {
      if (typeof p !== 'object' || p === null || !(p as Record<string, unknown>).title) {
        setParseError('Each project entry must have a "title" field.');
        return null;
      }
    }
    setParseError(null);
    return {
      mode: typeof data.mode === 'string' ? data.mode : 'lite',
      projects: data.projects as ImportProject[],
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setJsonText(text);
      const result = parseAndValidate(text);
      if (result) {
        setParsed(result);
        setStep('preview');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTextParse = () => {
    const result = parseAndValidate(jsonText);
    if (result) {
      setParsed(result);
      setStep('preview');
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setImportError(null);
    try {
      const response = await apiService.authenticatedRequest('/project-imports/from-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(parsed),
      });
      const result: ImportResult = response;
      setImportResult(result);
      setStep('success');
      onSuccess();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
      setStep('error');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!importing ? handleClose : undefined}
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg">
              <FileJson className="w-5 h-5 text-cyan-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white" data-mipqa="import-project-title">
              Import from File
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={importing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            data-mipqa="import-project-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {/* STEP: upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-cyan-400 dark:hover:border-cyan-500 rounded-xl bg-slate-50 dark:bg-slate-700/30 cursor-pointer transition-all"
                data-mipqa="import-project-dropzone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileChange}
                  data-mipqa="import-project-file-input"
                />
                <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20 transition-colors">
                  <FolderOpen className="w-8 h-8 text-cyan-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Click to select a <span className="text-cyan-500">.json</span> file
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Only JSON files are accepted
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400 dark:text-slate-500">or paste JSON</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  value={jsonText}
                  onChange={(e) => { setJsonText(e.target.value); setParseError(null); }}
                  rows={8}
                  placeholder={'{\n  "mode": "lite",\n  "projects": [\n    { "title": "My Project", ... }\n  ]\n}'}
                  className="w-full px-3 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  data-mipqa="import-project-json-textarea"
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl" data-mipqa="import-project-parse-error">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP: preview */}
          {step === 'preview' && parsed && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-500/30 rounded-xl">
                <CheckCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <p className="text-sm text-cyan-700 dark:text-cyan-300">
                  Found <span className="font-semibold">{parsed.projects.length}</span> project{parsed.projects.length !== 1 ? 's' : ''} ready to import
                  {fileName && <span className="text-cyan-600/70 dark:text-cyan-400/70"> from {fileName}</span>}
                </p>
              </div>

              <div className="space-y-2" data-mipqa="import-project-preview-list">
                {parsed.projects.map((p, i) => {
                  const tcCount = Array.isArray(p.test_cases) ? p.test_cases.length : 0;
                  const cfgCount = Array.isArray(p.configurations) ? p.configurations.length : 0;
                  return (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 rounded-xl"
                      data-mipqa={`import-project-preview-item-${i}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {tcCount} test case{tcCount !== 1 ? 's' : ''}
                          {cfgCount > 0 && ` · ${cfgCount} configuration${cfgCount !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-full">
                        {parsed.mode}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP: success */}
          {step === 'success' && importResult && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="p-3 bg-emerald-500/10 rounded-full">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <p className="text-base font-semibold text-slate-900 dark:text-white">Import completed</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center">{importResult.message}</p>
              </div>
              <div className="space-y-2" data-mipqa="import-project-success-list">
                {(importResult.projects ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl"
                    data-mipqa={`import-project-success-item-${p.id}`}
                  >
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.title}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                      {p.test_cases_count} test case{p.test_cases_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP: error */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <p className="text-base font-semibold text-slate-900 dark:text-white">Import failed</p>
              <p className="text-sm text-red-500 dark:text-red-400 text-center" data-mipqa="import-project-error-message">
                {importError}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            {step === 'preview' && (
              <button
                type="button"
                onClick={() => { setStep('upload'); setParseError(null); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                data-mipqa="import-project-back-btn"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {(step === 'success' || step === 'error') ? (
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 rounded-lg transition-all shadow-md shadow-cyan-500/20"
                data-mipqa="import-project-done-btn"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={importing}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                  data-mipqa="import-project-cancel-btn"
                >
                  Cancel
                </button>
                {step === 'upload' && (
                  <button
                    type="button"
                    onClick={handleTextParse}
                    disabled={!jsonText.trim()}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-md shadow-cyan-500/20"
                    data-mipqa="import-project-parse-btn"
                  >
                    <FileJson className="w-4 h-4" />
                    Parse JSON
                  </button>
                )}
                {step === 'preview' && (
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-md shadow-cyan-500/20"
                    data-mipqa="import-project-confirm-btn"
                  >
                    {importing ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import {parsed!.projects.length} project{parsed!.projects.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportProjectModal;
