import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, ChevronRight, Link2, Plus, X } from 'lucide-react';
import {
  deleteOverviewTestDefect,
  fetchOverviewDefectTypes,
  fetchOverviewTestDefect,
  putOverviewTestDefect,
  type OverviewDefectType,
  type OverviewTestDefect,
} from '../../services/overviewWidgetsApi';

type ModalTab = 'manual' | 'analyzer' | 'history';

interface DefectSelectionModalProps {
  overviewTestId: number;
  testName: string;
  /** All known defect types — passed from the parent to avoid re-fetching each open. */
  defectTypes: OverviewDefectType[];
  onClose: () => void;
  /** Called after a successful PUT so the parent can update the row in-place. */
  onApplied: (defect: OverviewTestDefect | null) => void;
}

export function DefectSelectionModal({
  overviewTestId,
  testName,
  defectTypes,
  onClose,
  onApplied,
}: DefectSelectionModalProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<ModalTab>('manual');
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [ignoreInAutoAnalysis, setIgnoreInAutoAnalysis] = useState(false);
  const [applying, setApplying] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Pre-fill from the current defect assignment on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingCurrent(true);
    fetchOverviewTestDefect(overviewTestId)
      .then(existing => {
        if (cancelled) return;
        if (existing !== null) {
          setSelectedTypeId(existing.defectType.id);
          setComment(existing.comment ?? '');
          setIgnoreInAutoAnalysis(existing.ignoreInAutoAnalysis);
        } else {
          // Pre-select the default defect type
          const def = defectTypes.find(d => d.isDefault);
          if (def !== undefined) setSelectedTypeId(def.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const def = defectTypes.find(d => d.isDefault);
          if (def !== undefined) setSelectedTypeId(def.id);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCurrent(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overviewTestId]);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  }, [onClose]);

  const handleApply = useCallback(async () => {
    if (selectedTypeId === null) return;
    setApplying(true);
    try {
      const result = await putOverviewTestDefect(overviewTestId, {
        defect_type_id: selectedTypeId,
        comment,
        ignore_in_auto_analysis: ignoreInAutoAnalysis,
      });
      toast.success('Defect decision saved.');
      onApplied(result);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save decision.');
    } finally {
      setApplying(false);
    }
  }, [selectedTypeId, comment, ignoreInAutoAnalysis, overviewTestId, onApplied, onClose]);

  const handleRemove = useCallback(async () => {
    setApplying(true);
    try {
      await deleteOverviewTestDefect(overviewTestId);
      toast.success('Defect decision removed.');
      onApplied(null);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove decision.');
    } finally {
      setApplying(false);
    }
  }, [overviewTestId, onApplied, onClose]);

  const tabClass = (tab: ModalTab) =>
    `px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors border-b-2 ${
      activeTab === tab
        ? 'border-cyan-400 text-cyan-400'
        : 'border-transparent text-slate-400 hover:text-slate-200'
    }`;

  return (
    <div
      ref={backdropRef}
      data-mipqa="defect-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        data-mipqa="defect-modal"
        className="relative w-full max-w-2xl rounded-xl bg-slate-900 shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-700">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-100" data-mipqa="defect-modal-title">
              Select defect
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-400" title={testName}>{testName}</p>
          </div>
          <button
            type="button"
            data-mipqa="defect-modal-close-btn"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 px-5">
          <button type="button" className={tabClass('manual')} onClick={() => setActiveTab('manual')}
            data-mipqa="defect-tab-manual">Manual</button>
          <button type="button" className={tabClass('analyzer')} onClick={() => setActiveTab('analyzer')}
            data-mipqa="defect-tab-analyzer">Analyzer suggestion</button>
          <button type="button" className={tabClass('history')} onClick={() => setActiveTab('history')}
            data-mipqa="defect-tab-history">History</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'manual' && (
            <ManualTab
              defectTypes={defectTypes}
              loading={loadingCurrent}
              selectedTypeId={selectedTypeId}
              comment={comment}
              ignoreInAutoAnalysis={ignoreInAutoAnalysis}
              onSelectType={setSelectedTypeId}
              onCommentChange={setComment}
              onIgnoreChange={setIgnoreInAutoAnalysis}
            />
          )}
          {activeTab === 'analyzer' && (
            <AnalyzerTab />
          )}
          {activeTab === 'history' && (
            <HistoryTab />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-700 px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-500 cursor-not-allowed"
              data-mipqa="defect-post-issue-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              Post issue
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-500 cursor-not-allowed"
              data-mipqa="defect-link-issue-btn"
            >
              <Link2 className="h-3.5 w-3.5" />
              Link issue
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-1.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              data-mipqa="defect-modal-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={applying || loadingCurrent}
              className="rounded-md border border-slate-600 px-4 py-1.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-mipqa="defect-modal-remove-btn"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || loadingCurrent || selectedTypeId === null}
              className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-mipqa="defect-modal-apply-btn"
            >
              {applying ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner tab components
// ---------------------------------------------------------------------------

interface ManualTabProps {
  defectTypes: OverviewDefectType[];
  loading: boolean;
  selectedTypeId: number | null;
  comment: string;
  ignoreInAutoAnalysis: boolean;
  onSelectType: (id: number) => void;
  onCommentChange: (v: string) => void;
  onIgnoreChange: (v: boolean) => void;
}

function ManualTab({
  defectTypes,
  loading,
  selectedTypeId,
  comment,
  ignoreInAutoAnalysis,
  onSelectType,
  onCommentChange,
  onIgnoreChange,
}: ManualTabProps): React.ReactElement {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Defect type grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {defectTypes.map(dt => {
          const isSelected = selectedTypeId === dt.id;
          return (
            <button
              key={dt.id}
              type="button"
              data-mipqa={`defect-type-btn-${dt.slug}`}
              onClick={() => onSelectType(dt.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all ${
                isSelected
                  ? 'border-cyan-400 bg-slate-700 text-slate-100 shadow-[0_0_0_1px_theme(colors.cyan.400)]'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-750 hover:text-slate-100'
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: dt.color }}
              />
              <span className="truncate leading-snug">{dt.name}</span>
            </button>
          );
        })}
      </div>

      {/* Ignore in auto-analysis */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300"
        data-mipqa="defect-ignore-label">
        <input
          type="checkbox"
          data-mipqa="defect-ignore-checkbox"
          checked={ignoreInAutoAnalysis}
          onChange={e => onIgnoreChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-cyan-500"
        />
        Ignore in Auto Analysis
      </label>

      {/* Comment */}
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400"
          htmlFor="defect-comment">
          Comment
        </label>
        <textarea
          id="defect-comment"
          data-mipqa="defect-comment-input"
          value={comment}
          onChange={e => onCommentChange(e.target.value)}
          rows={3}
          placeholder="Add a comment..."
          className="w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>
    </div>
  );
}

function AnalyzerTab(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <span className="inline-flex items-center gap-2 rounded-full bg-green-900/40 border border-green-700 px-3 py-1 text-sm font-semibold text-green-400">
        100% confidence
      </span>
      <p className="text-sm text-slate-400">Analyzer suggestion feature is coming soon.</p>
      <p className="text-xs text-slate-500 flex items-center gap-1">
        <ChevronRight className="h-3.5 w-3.5" />
        Switch to <span className="font-semibold text-slate-400 ml-1">Manual</span> to assign a decision.
      </p>
    </div>
  );
}

function HistoryTab(): React.ReactElement {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-sm text-slate-400">No history available.</p>
    </div>
  );
}
