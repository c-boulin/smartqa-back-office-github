import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Search, X } from 'lucide-react';
import {
  deleteOverviewTestDefect,
  fetchOverviewTestDefect,
  putOverviewTestDefect,
  type OverviewDefectType,
  type OverviewTestDefect,
} from '../../services/overviewWidgetsApi';
import type { DefectGroupData } from '../../services/defectGroupsApi';

export interface DefectModalTarget {
  overviewTestId: number;
  testName: string;
}

export interface DefectAppliedResult {
  overviewTestId: number;
  defect: OverviewTestDefect | null;
}

interface SharedState {
  defectTypeId: number | null;
  comment: string;
}

interface DefectSelectionModalProps {
  targets: DefectModalTarget[];
  defectTypes: OverviewDefectType[];
  defectGroups?: DefectGroupData[];
  onClose: () => void;
  onApplied: (results: DefectAppliedResult[]) => void;
}

interface DefectPickerBodyProps {
  defectTypes: OverviewDefectType[];
  defectGroups?: DefectGroupData[];
  state: SharedState;
  onStateChange: (patch: Partial<SharedState>) => void;
}

function DefectPickerBody({ defectTypes, defectGroups, state, onStateChange }: DefectPickerBodyProps): React.ReactElement {
  const [search, setSearch] = useState('');

  const defectTypeById = useMemo(
    () => new Map(defectTypes.map(d => [d.id, d])),
    [defectTypes],
  );

  const filteredIds = useMemo(() => {
    if (!search) return null;
    const q = search.toLowerCase();
    return new Set(defectTypes.filter(dt => dt.name.toLowerCase().includes(q)).map(dt => dt.id));
  }, [defectTypes, search]);

  const columns: Array<{ name: string; items: OverviewDefectType[] }> = useMemo(() => {
    if (defectGroups && defectGroups.length > 0) {
      return defectGroups.map(g => ({
        name: g.name,
        items: g.defectTypes
          .map(dt => defectTypeById.get(dt.id))
          .filter((dt): dt is OverviewDefectType => dt !== undefined)
          .filter(dt => filteredIds === null || filteredIds.has(dt.id)),
      })).filter(col => col.items.length > 0);
    }
    const items = defectTypes.filter(dt => filteredIds === null || filteredIds.has(dt.id));
    return items.length > 0 ? [{ name: '', items }] : [];
  }, [defectGroups, defectTypes, defectTypeById, filteredIds]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search defect types…"
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} className="text-slate-500 hover:text-slate-300">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {columns.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">No defect types match.</p>
      ) : (
        <div className="flex gap-3">
          {columns.map(col => (
            <div key={col.name} className="flex min-w-[160px] flex-1 flex-col gap-1.5">
              {col.name && (
                <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {col.name}
                </p>
              )}
              {col.items.map(dt => {
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
          ))}
        </div>
      )}

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

function pickInitialState(
  existingByTarget: Array<{ id: number; existing: OverviewTestDefect | null }>,
  defaultDefectTypeId: number | null,
): SharedState {
  const knownExisting = existingByTarget.filter(r => r.existing !== null);
  if (knownExisting.length === 0) {
    return { defectTypeId: defaultDefectTypeId, comment: '' };
  }
  const first = knownExisting[0].existing!;
  const allSameType = knownExisting.every(r => r.existing!.defectType.id === first.defectType.id);
  const allSameComment = knownExisting.every(r => (r.existing!.comment ?? '') === (first.comment ?? ''));
  return {
    defectTypeId: allSameType ? first.defectType.id : defaultDefectTypeId,
    comment: allSameComment ? (first.comment ?? '') : '',
  };
}

export function DefectSelectionModal({
  targets,
  defectTypes,
  defectGroups,
  onClose,
  onApplied,
}: DefectSelectionModalProps): React.ReactElement {
  const isSingle = targets.length === 1;
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [state, setState] = useState<SharedState>({ defectTypeId: null, comment: '' });
  const [applying, setApplying] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingCurrent(true);
    const defaultDt = defectTypes.find(d => d.isDefault) ?? null;

    Promise.all(
      targets.map(async t => {
        const existing = await fetchOverviewTestDefect(t.overviewTestId).catch(() => null);
        return { id: t.overviewTestId, existing };
      }),
    ).then(results => {
      if (cancelled) return;
      setState(pickInitialState(results, defaultDt?.id ?? null));
    }).finally(() => { if (!cancelled) setLoadingCurrent(false); });

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

  const handleStateChange = useCallback((patch: Partial<SharedState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  const handleApply = useCallback(async () => {
    if (state.defectTypeId === null) return;
    setApplying(true);
    try {
      const defectTypeId = state.defectTypeId;
      const comment = state.comment;
      const results = await Promise.all(
        targets.map(async t => {
          const defect = await putOverviewTestDefect(t.overviewTestId, {
            defect_type_id: defectTypeId,
            comment,
          });
          return { overviewTestId: t.overviewTestId, defect };
        }),
      );
      toast.success(
        isSingle
          ? 'Defect decision saved.'
          : `Defect decision saved for ${results.length} test case${results.length !== 1 ? 's' : ''}.`,
      );
      onApplied(results);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save decision.');
    } finally {
      setApplying(false);
    }
  }, [targets, state, isSingle, onApplied, onClose]);

  const handleRemove = useCallback(async () => {
    setApplying(true);
    try {
      await Promise.all(targets.map(t => deleteOverviewTestDefect(t.overviewTestId)));
      toast.success(
        isSingle
          ? 'Defect decision removed.'
          : `Defect decision removed for ${targets.length} test cases.`,
      );
      onApplied(targets.map(t => ({ overviewTestId: t.overviewTestId, defect: null })));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove decision.');
    } finally {
      setApplying(false);
    }
  }, [targets, isSingle, onApplied, onClose]);

  const canApply = state.defectTypeId !== null;

  const subtitle = isSingle
    ? targets[0].testName
    : `Applies the same defect type and comment to ${targets.length} test case${targets.length !== 1 ? 's' : ''}.`;

  return (
    <div
      ref={backdropRef}
      data-mipqa="defect-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        data-mipqa="defect-modal"
        className="relative flex w-full max-w-4xl max-h-[85vh] flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-700 px-6 pt-5 pb-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-100" data-mipqa="defect-modal-title">
              {isSingle ? 'Select defect' : `Select defect — ${targets.length} test cases`}
            </h2>
            <p
              className={`mt-0.5 text-xs text-slate-400 ${isSingle ? 'truncate' : ''}`}
              title={isSingle ? targets[0].testName : undefined}
            >
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            data-mipqa="defect-modal-close-btn"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loadingCurrent ? (
            <div className="flex items-center justify-center py-12">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            </div>
          ) : (
            <DefectPickerBody
              defectTypes={defectTypes}
              defectGroups={defectGroups}
              state={state}
              onStateChange={handleStateChange}
            />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-700 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
            data-mipqa="defect-modal-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={applying || loadingCurrent}
            className="rounded-md border border-slate-600 px-4 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            data-mipqa="defect-modal-remove-btn"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || loadingCurrent || !canApply}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            data-mipqa="defect-modal-apply-btn"
          >
            {applying ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSingle ? 'Apply' : 'Apply to all'}
          </button>
        </div>
      </div>
    </div>
  );
}
