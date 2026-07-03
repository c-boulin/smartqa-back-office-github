import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Check, ChevronDown, Search, X } from 'lucide-react';
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

interface RowState {
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

// ─── Per-row defect type dropdown (portalled to escape overflow) ──────────────

interface DefectTypeDropdownProps {
  value: number | null;
  defectTypes: OverviewDefectType[];
  defectGroups?: DefectGroupData[];
  onChange: (id: number) => void;
}

function DefectTypeDropdown({ value, defectTypes, defectGroups, onChange }: DefectTypeDropdownProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const selected = value !== null ? defectTypes.find(d => d.id === value) : undefined;

  const filtered = useMemo(
    () => defectTypes.filter(dt => dt.name.toLowerCase().includes(search.toLowerCase())),
    [defectTypes, search],
  );

  const openDropdown = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 220) });
    setSearch('');
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filteredIdSet = useMemo(() => new Set(filtered.map(d => d.id)), [filtered]);

  const dropdown = open
    ? createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="rounded-lg border border-slate-600 bg-slate-800 shadow-2xl"
        >
          {/* Search */}
          <div className="flex items-center gap-1.5 border-b border-slate-700 px-2.5 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <input
              type="text"
              value={search}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              onChange={e => setSearch(e.target.value)}
              placeholder="Search defect types…"
              className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>
          {/* Options */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-500">No results</p>
            ) : defectGroups && defectGroups.length > 0 ? (
              defectGroups.map(group => {
                const groupItems = group.defectTypes.filter(dt => filteredIdSet.has(dt.id));
                if (groupItems.length === 0) return null;
                return (
                  <div key={group.id}>
                    <p className="px-3 pb-0.5 pt-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {group.name}
                    </p>
                    {groupItems.map(dt => (
                      <button
                        key={dt.id}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => { onChange(dt.id); setOpen(false); setSearch(''); }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-slate-700 ${
                          value === dt.id ? 'text-cyan-400' : 'text-slate-300'
                        }`}
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dt.color }} />
                        <span className="flex-1 truncate text-left">{dt.name}</span>
                        {value === dt.id && <Check className="ml-auto h-3 w-3 shrink-0" />}
                      </button>
                    ))}
                  </div>
                );
              })
            ) : (
              filtered.map(dt => (
                <button
                  key={dt.id}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { onChange(dt.id); setOpen(false); setSearch(''); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-slate-700 ${
                    value === dt.id ? 'text-cyan-400' : 'text-slate-300'
                  }`}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dt.color }} />
                  <span className="flex-1 truncate text-left">{dt.name}</span>
                  {value === dt.id && <Check className="ml-auto h-3 w-3 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openDropdown}
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
      {dropdown}
    </>
  );
}

// ─── Single-target grid layout ────────────────────────────────────────────────

interface SingleTargetBodyProps {
  defectTypes: OverviewDefectType[];
  defectGroups?: DefectGroupData[];
  state: RowState;
  onStateChange: (patch: Partial<RowState>) => void;
}

function SingleTargetBody({ defectTypes, defectGroups, state, onStateChange }: SingleTargetBodyProps): React.ReactElement {
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
      {/* Search */}
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

      {/* Defect types — one column per group */}
      {columns.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">No defect types match.</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
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

// ─── Multi-target table layout ────────────────────────────────────────────────

interface MultiTargetBodyProps {
  targets: DefectModalTarget[];
  defectTypes: OverviewDefectType[];
  defectGroups?: DefectGroupData[];
  rowStates: Map<number, RowState>;
  onRowChange: (overviewTestId: number, patch: Partial<RowState>) => void;
}

function MultiTargetBody({ targets, defectTypes, defectGroups, rowStates, onRowChange }: MultiTargetBodyProps): React.ReactElement {
  return (
    <div className="flex flex-col divide-y divide-slate-700/60">
      {targets.map(target => {
        const state = rowStates.get(target.overviewTestId) ?? { defectTypeId: null, comment: '' };
        return (
          <div key={target.overviewTestId} className="flex flex-col gap-2.5 py-4 first:pt-0 last:pb-0">
            <p
              className="truncate text-sm font-semibold text-slate-200"
              title={target.testName}
              data-mipqa={`defect-row-name-${target.overviewTestId}`}
            >
              {target.testName}
            </p>
            <div className="flex items-start gap-3">
              {/* Defect type dropdown — portalled, won't clip */}
              <div className="w-48 shrink-0">
                <DefectTypeDropdown
                  value={state.defectTypeId}
                  defectTypes={defectTypes}
                  defectGroups={defectGroups}
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
  defectGroups,
  onClose,
  onApplied,
}: DefectSelectionModalProps): React.ReactElement {
  const isSingle = targets.length === 1;
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [rowStates, setRowStates] = useState<Map<number, RowState>>(new Map());
  const [applying, setApplying] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

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
          map.set(id, { defectTypeId: existing.defectType.id, comment: existing.comment ?? '' });
        } else {
          map.set(id, { defectTypeId: defaultDt?.id ?? null, comment: '' });
        }
      });
      setRowStates(map);
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

  const handleRowChange = useCallback((overviewTestId: number, patch: Partial<RowState>) => {
    setRowStates(prev => {
      const next = new Map(prev);
      const cur = prev.get(overviewTestId) ?? { defectTypeId: null, comment: '' };
      next.set(overviewTestId, { ...cur, ...patch });
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

  const singleState = isSingle
    ? (rowStates.get(targets[0].overviewTestId) ?? { defectTypeId: null, comment: '' })
    : null;
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
        className={`relative flex w-full flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl ${
          isSingle ? 'max-w-2xl max-h-[85vh]' : 'max-w-4xl max-h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-700 px-6 pt-5 pb-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-100" data-mipqa="defect-modal-title">
              {isSingle ? 'Select defect' : `Select defects — ${targets.length} test cases`}
            </h2>
            {isSingle ? (
              <p className="mt-0.5 truncate text-xs text-slate-400" title={targets[0].testName}>
                {targets[0].testName}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-400">
                Set a defect type and comment for each test case individually.
              </p>
            )}
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

        {/* Body — scrollable, dropdowns escape via portal */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loadingCurrent ? (
            <div className="flex items-center justify-center py-12">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            </div>
          ) : isSingle && singleState !== null ? (
            <SingleTargetBody
              defectTypes={defectTypes}
              defectGroups={defectGroups}
              state={singleState}
              onStateChange={handleSingleStateChange}
            />
          ) : (
            <MultiTargetBody
              targets={targets}
              defectTypes={defectTypes}
              defectGroups={defectGroups}
              rowStates={rowStates}
              onRowChange={handleRowChange}
            />
          )}
        </div>

        {/* Footer */}
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
            {isSingle ? 'Apply' : 'Apply all'}
          </button>
        </div>
      </div>
    </div>
  );
}
