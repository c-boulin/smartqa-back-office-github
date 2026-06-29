import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Link2, Plus, X } from 'lucide-react';
import {
  deleteOverviewTestDefect,
  fetchOverviewTestDefect,
  putOverviewTestDefect,
  type OverviewDefectType,
  type OverviewTestDefect,
} from '../../services/overviewWidgetsApi';

export interface DefectModalTarget {
  overviewTestId: number;
  testName: string;
}

export interface DefectAppliedResult {
  overviewTestId: number;
  defect: OverviewTestDefect | null;
}

interface DefectSelectionModalProps {
  targets: DefectModalTarget[];
  /** All known defect types — passed from the parent to avoid re-fetching each open. */
  defectTypes: OverviewDefectType[];
  onClose: () => void;
  /** Called after a successful apply/remove so the parent can update rows in-place. */
  onApplied: (results: DefectAppliedResult[]) => void;
}

export function DefectSelectionModal({
  targets,
  defectTypes,
  onClose,
  onApplied,
}: DefectSelectionModalProps): React.ReactElement {
  const isSingle = targets.length === 1;
  const [loadingCurrent, setLoadingCurrent] = useState(isSingle);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [ignoreInAutoAnalysis, setIgnoreInAutoAnalysis] = useState(false);
  const [applying, setApplying] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Pre-fill from existing defect when there is exactly one target
  useEffect(() => {
    if (!isSingle) {
      const def = defectTypes.find(d => d.isDefault);
      if (def !== undefined) setSelectedTypeId(def.id);
      return;
    }
    let cancelled = false;
    setLoadingCurrent(true);
    fetchOverviewTestDefect(targets[0].overviewTestId)
      .then(existing => {
        if (cancelled) return;
        if (existing !== null) {
          setSelectedTypeId(existing.defectType.id);
          setComment(existing.comment ?? '');
          setIgnoreInAutoAnalysis(existing.ignoreInAutoAnalysis);
        } else {
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
  }, [targets[0]?.overviewTestId, isSingle]);

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
      const results = await Promise.all(
        targets.map(async t => {
          const defect = await putOverviewTestDefect(t.overviewTestId, {
            defect_type_id: selectedTypeId,
            comment,
            ignore_in_auto_analysis: ignoreInAutoAnalysis,
          });
          return { overviewTestId: t.overviewTestId, defect };
        }),
      );
      toast.success(isSingle ? 'Defect decision saved.' : `Defect decision saved for ${targets.length} test cases.`);
      onApplied(results);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save decision.');
    } finally {
      setApplying(false);
    }
  }, [selectedTypeId, comment, ignoreInAutoAnalysis, targets, isSingle, onApplied, onClose]);

  const handleRemove = useCallback(async () => {
    setApplying(true);
    try {
      await Promise.all(targets.map(t => deleteOverviewTestDefect(t.overviewTestId)));
      toast.success(isSingle ? 'Defect decision removed.' : `Defect decision removed for ${targets.length} test cases.`);
      onApplied(targets.map(t => ({ overviewTestId: t.overviewTestId, defect: null })));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove decision.');
    } finally {
      setApplying(false);
    }
  }, [targets, isSingle, onApplied, onClose]);

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
            {isSingle ? (
              <p className="mt-0.5 truncate text-xs text-slate-400" title={targets[0].testName}>
                {targets[0].testName}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-400">
                Applying to <span className="font-semibold text-slate-300">{targets.length}</span> test cases
              </p>
            )}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loadingCurrent ? (
            <div className="flex items-center justify-center py-10">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            </div>
          ) : (
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
                      onClick={() => setSelectedTypeId(dt.id)}
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
                  onChange={e => setIgnoreInAutoAnalysis(e.target.checked)}
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
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  placeholder="Add a comment..."
                  className="w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
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
