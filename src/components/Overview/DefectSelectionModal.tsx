import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, ChevronDown, X } from 'lucide-react';
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

interface RowState {
  defectTypeId: number | null;
  comment: string;
  ignoreInAutoAnalysis: boolean;
}

interface DefectSelectionModalProps {
  targets: DefectModalTarget[];
  defectTypes: OverviewDefectType[];
  onClose: () => void;
  onApplied: (results: DefectAppliedResult[]) => void;
}

// ─── Per-row defect type dropdown ────────────────────────────────────────────

interface DefectTypeDropdownProps {
  value: number | null;
  defectTypes: OverviewDefectType[];
  onChange: (id: number) => void;
}

function DefectTypeDropdown({ value, defectTypes, onChange }: DefectTypeDropdownProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value !== null ? defectTypes.find(d => d.id === value) : undefined;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`inline-flex w-full items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
          selected
            ? 'border-slate-600 bg-slate-700 text-slate-200 hover:border-slate-500'
            : 'border-dashed border-slate-600 bg-transparent text-slate-400 hover:border-slate-400 hover:text-slate-200'
        }`}
      >
        {selected ? (
          <>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />
            <span className="min-w-0 flex-1 truncate text-left">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left">Select type…</span>
        )}
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-xl">
          {defectTypes.map(dt => (
            <button
              key={dt.id}
              type="button"
              onClick={() => { onChange(dt.id); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-700 transition-colors ${
                value === dt.id ? 'text-cyan-400' : 'text-slate-300'
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dt.color }} />
              <span className="truncate">{dt.name}</span>
              {value === dt.id && <Check className="ml-auto h-3 w-3 shrink-0 text-cyan-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single-target grid layout (unchanged look) ───────────────────────────────

interface SingleTargetBodyProps {
  target: DefectModalTarget;
  defectTypes: OverviewDefectType[];
  state: RowState;
  onStateChange: (patch: Partial<RowState>) => void;
}

function SingleTargetBody({ defectTypes, state, onStateChange }: SingleTargetBodyProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {defectTypes.map(dt => {
          const isSelected = state.defectTypeId === dt.id;
          return (
            <button
              key={dt.id}
              type="button"
              data-mipqa={`defect-type-btn-${dt.slug}`}
              onClick={() => onStateChange({ defectTypeId: dt.id })}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all ${
                isSelected
                  ? 'border-cyan-400 bg-slate-700 text-slate-100 shadow-[0_0_0_1px_theme(colors.cyan.400)]'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-slate-100'
              }`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dt.color }} />
              <span className="truncate leading-snug">{dt.name}</span>
            </button>
          );
        })}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300" data-mipqa="defect-ignore-label">
        <input
          type="checkbox"
          data-mipqa="defect-ignore-checkbox"
          checked={state.ignoreInAutoAnalysis}
          onChange={e => onStateChange({ ignoreInAutoAnalysis: e.target.checked })}
          className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-cyan-500"
        />
        Ignore in Auto Analysis
      </label>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400" htmlFor="defect-comment">
          Comment
        </label>
        <textarea
          id="defect-comment"
          data-mipqa="defect-comment-input"
          value={state.comment}
          onChange={e => onStateChange({ comment: e.target.value })}
          rows={3}
          placeholder="Add a comment…"
          className="w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>
    </div>
  );
}

// ─── Multi-target table layout ────────────────────────────────────────────────

interface MultiTargetBodyProps {
  targets: DefectModalTarget[];
  defectTypes: OverviewDefectType[];
  rowStates: Map<number, RowState>;
  onRowChange: (overviewTestId: number, patch: Partial<RowState>) => void;
}

function MultiTargetBody({ targets, defectTypes, rowStates, onRowChange }: MultiTargetBodyProps): React.ReactElement {
  return (
    <div className="flex flex-col divide-y divide-slate-700/60">
      {targets.map(target => {
        const state = rowStates.get(target.overviewTestId) ?? { defectTypeId: null, comment: '', ignoreInAutoAnalysis: false };
        return (
          <div key={target.overviewTestId} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
            {/* Test name */}
            <p
              className="truncate text-sm font-semibold text-slate-200"
              title={target.testName}
              data-mipqa={`defect-row-name-${target.overviewTestId}`}
            >
              {target.testName}
            </p>
            {/* Controls row */}
            <div className="flex items-start gap-2">
              {/* Defect type (takes ~40% width) */}
              <div className="w-40 shrink-0">
                <DefectTypeDropdown
                  value={state.defectTypeId}
                  defectTypes={defectTypes}
                  onChange={id => onRowChange(target.overviewTestId, { defectTypeId: id })}
                />
              </div>
              {/* Comment */}
              <input
                type="text"
                value={state.comment}
                onChange={e => onRowChange(target.overviewTestId, { comment: e.target.value })}
                placeholder="Add a comment…"
                data-mipqa={`defect-comment-input-${target.overviewTestId}`}
                className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              {/* Ignore in Auto Analysis */}
              <label
                className="flex shrink-0 cursor-pointer items-center gap-1.5 pt-1 text-xs text-slate-400"
                title="Ignore in Auto Analysis"
                data-mipqa={`defect-ignore-label-${target.overviewTestId}`}
              >
                <input
                  type="checkbox"
                  checked={state.ignoreInAutoAnalysis}
                  onChange={e => onRowChange(target.overviewTestId, { ignoreInAutoAnalysis: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 accent-cyan-500"
                />
                Ignore
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function DefectSelectionModal({
  targets,
  defectTypes,
  onClose,
  onApplied,
}: DefectSelectionModalProps): React.ReactElement {
  const isSingle = targets.length === 1;
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [rowStates, setRowStates] = useState<Map<number, RowState>>(new Map());
  const [applying, setApplying] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Pre-fetch existing defect for every target
  useEffect(() => {
    let cancelled = false;
    setLoadingCurrent(true);

    const defaultDt = defectTypes.find(d => d.isDefault);

    Promise.all(
      targets.map(async t => {
        const existing = await fetchOverviewTestDefect(t.overviewTestId).catch(() => null);
        return { id: t.overviewTestId, existing };
      }),
    ).then(results => {
      if (cancelled) return;
      const map = new Map<number, RowState>();
      results.forEach(({ id, existing }) => {
        if (existing !== null && existing !== undefined) {
          map.set(id, {
            defectTypeId: existing.defectType.id,
            comment: existing.comment ?? '',
            ignoreInAutoAnalysis: existing.ignoreInAutoAnalysis,
          });
        } else {
          map.set(id, { defectTypeId: defaultDt?.id ?? null, comment: '', ignoreInAutoAnalysis: false });
        }
      });
      setRowStates(map);
    }).finally(() => {
      if (!cancelled) setLoadingCurrent(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  }, [onClose]);

  const handleRowChange = useCallback((overviewTestId: number, patch: Partial<RowState>) => {
    setRowStates(prev => {
      const next = new Map(prev);
      next.set(overviewTestId, { ...(prev.get(overviewTestId) ?? { defectTypeId: null, comment: '', ignoreInAutoAnalysis: false }), ...patch });
      return next;
    });
  }, []);

  const handleSingleStateChange = useCallback((patch: Partial<RowState>) => {
    if (targets.length === 0) return;
    handleRowChange(targets[0].overviewTestId, patch);
  }, [targets, handleRowChange]);

  const handleApply = useCallback(async () => {
    setApplying(true);
    try {
      const results = await Promise.all(
        targets.map(async t => {
          const state = rowStates.get(t.overviewTestId);
          if (!state?.defectTypeId) return null;
          const defect = await putOverviewTestDefect(t.overviewTestId, {
            defect_type_id: state.defectTypeId,
            comment: state.comment,
            ignore_in_auto_analysis: state.ignoreInAutoAnalysis,
          });
          return { overviewTestId: t.overviewTestId, defect };
        }),
      );
      const valid = results.filter((r): r is DefectAppliedResult => r !== null);
      toast.success(isSingle ? 'Defect decision saved.' : `Defect decision saved for ${valid.length} test case${valid.length !== 1 ? 's' : ''}.`);
      onApplied(valid);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save decision.');
    } finally {
      setApplying(false);
    }
  }, [targets, rowStates, isSingle, onApplied, onClose]);

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

  const singleState = isSingle ? (rowStates.get(targets[0].overviewTestId) ?? { defectTypeId: null, comment: '', ignoreInAutoAnalysis: false }) : null;
  const canApply = targets.some(t => (rowStates.get(t.overviewTestId)?.defectTypeId ?? null) !== null);

  return (
    <div
      ref={backdropRef}
      data-mipqa="defect-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        data-mipqa="defect-modal"
        className={`relative w-full rounded-xl bg-slate-900 shadow-2xl border border-slate-700 flex flex-col max-h-[90vh] ${isSingle ? 'max-w-2xl' : 'max-w-3xl'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-700">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-100" data-mipqa="defect-modal-title">
              {isSingle ? 'Select defect' : `Select defects — ${targets.length} test cases`}
            </h2>
            {isSingle && (
              <p className="mt-0.5 truncate text-xs text-slate-400" title={targets[0].testName}>
                {targets[0].testName}
              </p>
            )}
            {!isSingle && (
              <p className="mt-0.5 text-xs text-slate-400">
                Set a defect type and comment for each test case individually.
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
          ) : isSingle && singleState !== null ? (
            <SingleTargetBody
              target={targets[0]}
              defectTypes={defectTypes}
              state={singleState}
              onStateChange={handleSingleStateChange}
            />
          ) : (
            <MultiTargetBody
              targets={targets}
              defectTypes={defectTypes}
              rowStates={rowStates}
              onRowChange={handleRowChange}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-700 px-5 py-3">
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
            disabled={applying || loadingCurrent || !canApply}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-mipqa="defect-modal-apply-btn"
          >
            {applying ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSingle ? 'Apply' : 'Apply all'}
          </button>
        </div>
      </div>
    </div>
  );
}
