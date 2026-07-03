import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { convertUtcToLocalDisplay } from '../../utils/dateHelpers';
import { createPortal } from 'react-dom';
import { HistoryLaunchTooltip } from './OverviewLaunchHistoryTooltip';
import { computeHistoryLaunchTooltipPosition } from './overviewLaunchTooltipPosition';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  OverviewDefectType,
  OverviewTestDefect,
  OverviewTestLogItemApiRow,
  OverviewTestLogKeywordApiNode,
  OverviewTestLogTreeNode,
} from '../../services/overviewWidgetsApi';
import { buildAssetsUrlFromObjectKey } from '../../env';
import { DefectSelectionModal } from './DefectSelectionModal';

/** Identifiers for the test-detail sub-tabs (All logs / Item details have body content; others placeholder or empty). */
export type OverviewTestLogDetailTabId = 'all_logs';

const TEST_LOG_DETAIL_TABS: ReadonlyArray<{
  id: OverviewTestLogDetailTabId;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'all_logs', label: 'All logs', icon: FileText },
];

export interface OverviewTestLogViewProps {
  testDisplayName: string;
  items: OverviewTestLogTreeNode[];
  testStatusLabel: string;
  historyButtons: Array<{
    id: string;
    label: string;
    active: boolean;
    title: string;
    statusLabel: string;
    statusBand?: string;
    attributeLines: string[];
    durationLabel: string;
  }>;
  hiddenHistoryButtonsCount?: number;
  onShowMoreHistoryButtons?: () => void;
  historyButtonsLoading?: boolean;
  onSelectHistoryButton?: (launchId: string) => void;
  /** From API: suite file path from {@code Suites/} ({@code overview_suites.source}). */
  suiteSourceRelative?: string | null;
  /** From API: Robot test line when opening a test log. */
  testLine?: number | null;
  /** Method type from suite list row (e.g. Test, After suite). */
  suiteListMethodType: string;
  /** Status from the suite list row (same as previous table). */
  suiteListStatusLabel: string;
  suiteListStatusBand?: string;
  suiteListStartTimeRelative: string;
  suiteListStartTimeDisplay: string;
  suiteListStartTimeRaw: string | null;
  suiteListDurationLabel: string;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  hoveredTimeRowKey: string | null;
  onHoverTimeRow: (key: string | null) => void;
  /** When true and the test is failed, show an active "Make decision" button. */
  isCronContext?: boolean;
  /** The overviewTestId for this test log (null for suite-keyword logs). */
  overviewTestId?: number | null;
  /** Cached defect types from the parent (used in the modal). */
  defectTypes?: OverviewDefectType[];
  /** Called after a defect decision is applied so the parent can update the suite list row. */
  onDefectApplied?: (overviewTestId: number, applied: OverviewTestDefect | null) => void;
}

/**
 * Hover title for log row time column (raw DB start when present).
 */
function logTimeHoverLabel(item: OverviewTestLogItemApiRow): string {
  if (item.startTimeRaw !== null && item.startTimeRaw !== '') {
    return convertUtcToLocalDisplay(item.startTimeRaw);
  }
  return convertUtcToLocalDisplay(item.startTimeDisplay);
}

function normalizeStatusBand(
  statusBand: string | null | undefined,
  statusLabel: string | null | undefined,
): 'passed' | 'failed' | 'skipped' | 'unknown' {
  const normalizedBand = (statusBand ?? '').trim().toLowerCase();
  if (normalizedBand === 'passed' || normalizedBand === 'failed' || normalizedBand === 'skipped') {
    return normalizedBand;
  }

  const normalizedLabel = (statusLabel ?? '').trim().toLowerCase();
  if (normalizedLabel.startsWith('pass')) {
    return 'passed';
  }
  if (normalizedLabel.startsWith('fail')) {
    return 'failed';
  }
  if (normalizedLabel.startsWith('skip')) {
    return 'skipped';
  }

  return 'unknown';
}

function statusDotClass(statusBand: string | null | undefined, statusLabel: string | null | undefined): string {
  switch (normalizeStatusBand(statusBand, statusLabel)) {
    case 'failed':
      return 'bg-red-500';
    case 'passed':
      return 'bg-emerald-500';
    case 'skipped':
      return 'bg-amber-400';
    default:
      return 'bg-slate-400 dark:bg-slate-500';
  }
}

function historyButtonStatusClass(statusBand: string | null | undefined, statusLabel: string | null | undefined): string {
  switch (normalizeStatusBand(statusBand, statusLabel)) {
    case 'failed':
      return 'bg-red-500/15 text-red-700 ring-1 ring-inset ring-red-500/30 dark:bg-red-500/20 dark:text-red-300 dark:ring-red-400/30';
    case 'skipped':
      return 'bg-amber-500/15 text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-400/30';
    case 'passed':
      return 'bg-emerald-600/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/30';
    default:
      return 'bg-slate-500/15 text-slate-700 ring-1 ring-inset ring-slate-400/30 dark:bg-slate-500/20 dark:text-slate-300 dark:ring-slate-500/30';
  }
}

type HistoryButtonTooltipState = {
  button: OverviewTestLogViewProps['historyButtons'][number];
  top: number;
  left: number;
};

type AllLogsTreeRowBaseProps = {
  depth: number;
  parentKey: string;
  rowIndex: number;
  hoveredTimeRowKey: string | null;
  onHoverTimeRow: (key: string | null) => void;
};

/** Screen edge inset when centering the modal (matches outer {@code p-4}). */
const SCREEN_INSET_FOR_MODAL_PX = 16;

/** Approximate header + footer height before refs are measured. */
const MODAL_CHROME_VERTICAL_ESTIMATE_PX = 100;

/**
 * Computes pixel size for the image so it fits the given box while keeping aspect ratio.
 */
function computeModalImageDisplaySize(
  naturalW: number,
  naturalH: number,
  maxImageW: number,
  maxImageH: number,
): { imgW: number; imgH: number } {
  const nw = Math.max(1, naturalW);
  const nh = Math.max(1, naturalH);
  const scale = Math.min(1, maxImageW / nw, maxImageH / nh);

  return {
    imgW: Math.max(1, Math.round(nw * scale)),
    imgH: Math.max(1, Math.round(nh * scale)),
  };
}

/**
 * Initial fit using estimated chrome height (before header/footer are measured).
 */
function computeModalImageDisplayFromNatural(naturalW: number, naturalH: number): { imgW: number; imgH: number } {
  const maxW = Math.max(1, window.innerWidth - SCREEN_INSET_FOR_MODAL_PX * 2);
  const maxH = Math.max(
    1,
    window.innerHeight - SCREEN_INSET_FOR_MODAL_PX * 2 - MODAL_CHROME_VERTICAL_ESTIMATE_PX,
  );

  return computeModalImageDisplaySize(naturalW, naturalH, maxW, maxH);
}

/**
 * Full-screen overlay showing the screenshot; panel size follows the image (scaled to viewport).
 * Header: close icon; footer: Close button on the right.
 */
function ScreenshotPreviewModal(props: {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageAlt: string;
}): React.ReactNode {
  const { isOpen, onClose, imageUrl, imageAlt } = props;
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ imgW: number; imgH: number } | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setNaturalSize(null);
      setDisplaySize(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setNaturalSize(null);
    setDisplaySize(null);
  }, [imageUrl]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onResize = (): void => {
      setLayoutTick(t => t + 1);
    };
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, [isOpen]);

  /**
   * Cached images fire {@code complete} without {@code onLoad}; apply dimensions when the dialog opens.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const el = imageRef.current;
    if (el === null || !el.complete || el.naturalWidth < 1) {
      return;
    }
    const nw = el.naturalWidth;
    const nh = el.naturalHeight;
    setNaturalSize({ w: nw, h: nh });
    setDisplaySize(computeModalImageDisplayFromNatural(nw, nh));
  }, [isOpen, imageUrl]);

  useLayoutEffect(() => {
    if (!isOpen || naturalSize === null) {
      return;
    }
    const headerH = headerRef.current?.offsetHeight ?? 0;
    const footerH = footerRef.current?.offsetHeight ?? 0;
    const maxW = Math.max(1, window.innerWidth - SCREEN_INSET_FOR_MODAL_PX * 2);
    const maxViewportH = window.innerHeight - SCREEN_INSET_FOR_MODAL_PX * 2;
    const maxImageH = Math.max(1, maxViewportH - headerH - footerH);
    const next = computeModalImageDisplaySize(naturalSize.w, naturalSize.h, maxW, maxImageH);
    setDisplaySize(prev => {
      if (prev !== null && prev.imgW === next.imgW && prev.imgH === next.imgH) {
        return prev;
      }

      return next;
    });
  }, [isOpen, naturalSize, layoutTick]);

  /**
   * Persists intrinsic size and fits the image inside the viewport (estimated chrome first).
   */
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const el = e.currentTarget;
    const nw = el.naturalWidth;
    const nh = el.naturalHeight;
    setNaturalSize({ w: nw, h: nh });
    setDisplaySize(computeModalImageDisplayFromNatural(nw, nh));
  };

  if (!isOpen) {
    return null;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  /**
   * Portal attaches the overlay to {@code document.body} so it sits above the full app (sidebars, tables, stacking contexts).
   */
  const modalOverlay = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot preview"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-transparent"
        aria-label="Close screenshot preview"
        onClick={onClose}
      />
      <div
        className="pointer-events-auto inline-flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-slate-900 shadow-[0_8px_40px_rgba(0,0,0,0.25)] dark:border-gray-200 dark:bg-white dark:text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={headerRef}
          className="flex w-full shrink-0 justify-end border-b border-gray-200 bg-white px-2 py-2 dark:border-gray-200 dark:bg-white"
        >
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div
          className="flex shrink-0 justify-center overflow-hidden bg-white dark:bg-white"
          style={
            displaySize != null
              ? { width: displaySize.imgW, height: displaySize.imgH }
              : { width: 0, height: 0, overflow: 'hidden' }
          }
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt={imageAlt}
            width={displaySize?.imgW}
            height={displaySize?.imgH}
            onLoad={handleImageLoad}
            className="block max-w-none object-contain"
          />
        </div>
        <div
          ref={footerRef}
          className="flex w-full shrink-0 justify-end border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-200 dark:bg-white"
        >
          <button
            type="button"
            className="rounded-lg bg-slate-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalOverlay, document.body);
}

/**
 * Thumbnail + hover actions for a log line with a {@code screenshotObjectKey} (CDN path).
 */
function LogMessageScreenshotPreview(props: { objectKey: string }): React.ReactNode {
  const { objectKey } = props;
  const url = useMemo(() => buildAssetsUrlFromObjectKey(objectKey), [objectKey]);
  const [modalOpen, setModalOpen] = useState(false);
  const imageName = useMemo(() => {
    const parts = objectKey.split('/').filter(Boolean);

    return parts.length > 0 ? parts[parts.length - 1] : 'screenshot';
  }, [objectKey]);

  return (
    <>
      <div className="group relative inline-flex max-w-full flex-col items-center gap-0.5">
        <button
          type="button"
          className="rounded border-0 bg-transparent p-0"
          title="View screenshot"
          aria-label="View screenshot in popup"
          onClick={() => setModalOpen(true)}
        >
          <img
            src={url}
            alt=""
            className="max-h-full min-h-[35px] min-w-[60px] max-w-[65px] cursor-pointer rounded border border-slate-200 object-cover object-top shadow-sm dark:border-slate-600"
          />
        </button>
        <div className="flex items-center justify-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            type="button"
            className="rounded p-0.5 text-cyan-600 hover:bg-cyan-500/15 dark:text-cyan-400 dark:hover:bg-cyan-500/20"
            title="Open in new tab"
            aria-label="Open in new tab"
            onClick={() => {
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <ScreenshotPreviewModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        imageUrl={url}
        imageAlt={imageName}
      />
    </>
  );
}

/**
 * Renders one accordion branch: message row or expandable keyword with nested children.
 */
function AllLogsTreeRows(props: { node: OverviewTestLogTreeNode } & AllLogsTreeRowBaseProps): React.ReactNode {
  const { node, depth, parentKey, rowIndex, hoveredTimeRowKey, onHoverTimeRow } = props;
  const rowKey = `${parentKey}-${node.kind}-${node.kind === 'keyword' ? node.kwId : node.msgId}-d${depth}-i${rowIndex}`;

  if (node.kind === 'message') {
    return (
      <tr key={rowKey} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
        <td
          className="min-w-0 break-words border-l-[3px] border-cyan-600/70 py-2.5 pr-2 align-top font-mono text-xs text-slate-800 dark:border-cyan-500/50 dark:text-slate-200"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {node.logMessage}
        </td>
        <td className="py-2.5 px-2 align-top">
          {node.screenshotObjectKey != null && node.screenshotObjectKey !== '' ? (
            <LogMessageScreenshotPreview objectKey={node.screenshotObjectKey} />
          ) : null}
        </td>
        <td
          className="cursor-default py-2.5 pl-2 pr-3 align-top text-right font-mono text-xs whitespace-nowrap text-slate-700 tabular-nums dark:text-slate-300"
          onMouseEnter={() => onHoverTimeRow(rowKey)}
          onMouseLeave={() => onHoverTimeRow(null)}
        >
          {hoveredTimeRowKey === rowKey ? logTimeHoverLabel(node) : convertUtcToLocalDisplay(node.startTimeDisplay)}
        </td>
      </tr>
    );
  }

  return (
    <KeywordLogAccordionBlock
      node={node}
      depth={depth}
      parentKey={parentKey}
      rowIndex={rowIndex}
      hoveredTimeRowKey={hoveredTimeRowKey}
      onHoverTimeRow={onHoverTimeRow}
    />
  );
}

/**
 * Expandable keyword row; children are nested keywords and/or `overview_msgs` (sorted by API).
 */
function KeywordLogAccordionBlock(
  props: { node: OverviewTestLogKeywordApiNode } & AllLogsTreeRowBaseProps,
): React.ReactNode {
  const { node, depth, parentKey, rowIndex, hoveredTimeRowKey, onHoverTimeRow } = props;
  const [open, setOpen] = useState(false);
  const rowKey = `${parentKey}-kw-${node.kwId}-d${depth}-i${rowIndex}`;
  const expandable = node.children.length > 0;

  return (
    <React.Fragment key={`${rowKey}-frag`}>
      <tr className={`transition-colors ${normalizeStatusBand(node.statusBand, node.statusLabel) === 'failed' ? 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200/70 dark:hover:bg-red-900/60' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}>
        <td
          className="min-w-0 break-words py-2.5 pr-2 align-top font-mono text-xs text-slate-800 dark:text-slate-200"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <div className="flex items-start gap-1">
            <button
              type="button"
              className={`mt-0.5 shrink-0 rounded p-0.5 ${expandable ? 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600' : 'cursor-default text-slate-300 dark:text-slate-600'}`}
              aria-expanded={expandable ? open : undefined}
              disabled={!expandable}
              onClick={() => {
                if (expandable) {
                  setOpen(v => !v);
                }
              }}
              aria-label={expandable ? (open ? 'Collapse': 'Expand') : undefined}
            >
              {expandable ? (
                open ? (
                  <ChevronDown className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden />
                )
              ) : (
                <span className="inline-block w-4" aria-hidden />
              )}
            </button>
            <span className="min-w-0 break-words">{node.logMessage}</span>
          </div>
        </td>
        <td className="py-2.5 px-2 align-top whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotClass(node.statusBand, node.statusLabel)}`} aria-hidden />
            {node.statusLabel !== '—' ? node.statusLabel.toUpperCase() : '—'}
          </span>
        </td>
        <td
          className="cursor-default py-2.5 pl-2 pr-3 align-top text-right whitespace-nowrap text-slate-700 dark:text-slate-300"
          onMouseEnter={() => {
            if (node.startTimeRelative !== '\u2014' && node.startTimeRelative !== '-') {
              onHoverTimeRow(rowKey);
            }
          }}
          onMouseLeave={() => onHoverTimeRow(null)}
        >
          <div className="inline-flex w-full min-w-0 items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              {hoveredTimeRowKey === rowKey ? logTimeHoverLabel(node) : node.durationLabel}
            </span>
          </div>
        </td>
      </tr>
      {open && expandable
        ? node.children.map((child, cIdx) => (
            <AllLogsTreeRows
              key={`${rowKey}-c-${cIdx}`}
              node={child}
              depth={depth + 1}
              parentKey={rowKey}
              rowIndex={cIdx}
              hoveredTimeRowKey={hoveredTimeRowKey}
              onHoverTimeRow={onHoverTimeRow}
            />
          ))
        : null}
    </React.Fragment>
  );
}

/**
 * Fourth-level ReportPortal-style test log view (ALL LOGS table and chrome).
 */
const OverviewTestLogView: React.FC<OverviewTestLogViewProps> = ({
  testDisplayName,
  items,
  testStatusLabel,
  historyButtons,
  hiddenHistoryButtonsCount = 0,
  onShowMoreHistoryButtons,
  historyButtonsLoading = false,
  onSelectHistoryButton,
  loading,
  error,
  onRefresh,
  hoveredTimeRowKey,
  onHoverTimeRow,
  suiteListStatusLabel,
  suiteListStatusBand,
  isCronContext = false,
  overviewTestId = null,
  defectTypes = [],
  onDefectApplied,
}) => {
  const [defectModalOpen, setDefectModalOpen] = useState(false);

  // Use suite-list status as authoritative source (available immediately, before the log payload loads)
  const isFailed =
    normalizeStatusBand(suiteListStatusBand, suiteListStatusLabel) === 'failed' ||
    suiteListStatusLabel.toUpperCase().includes('FAIL') ||
    normalizeStatusBand(undefined, testStatusLabel) === 'failed' ||
    testStatusLabel.toUpperCase().includes('FAIL');
  const canMakeDecision = isCronContext && isFailed && overviewTestId !== null;

  const showHistoryButtonTooltip = (
    button: OverviewTestLogViewProps['historyButtons'][number],
    element: HTMLButtonElement,
  ): void => {
    const { top, left } = computeHistoryLaunchTooltipPosition(element);

    setHoveredHistoryButton({
      button,
      top,
      left,
    });
  };

  const hideHistoryButtonTooltip = (buttonId: string): void => {
    setHoveredHistoryButton(current => (current?.button.id === buttonId ? null : current));
  };

  const logItemsSignature = useMemo(
    () => [JSON.stringify(items), testDisplayName].join('\n'),
    [items, testDisplayName],
  );

  const [activeDetailTab, setActiveDetailTab] = useState<OverviewTestLogDetailTabId>('all_logs');
  const [hoveredHistoryButton, setHoveredHistoryButton] = useState<HistoryButtonTooltipState | null>(null);

  useEffect(() => {
    setActiveDetailTab('all_logs');
    setHoveredHistoryButton(null);
  }, [logItemsSignature]);

  useEffect(() => {
    if (hoveredHistoryButton === null) {
      return;
    }

    const clearTooltip = (): void => {
      setHoveredHistoryButton(null);
    };

    window.addEventListener('scroll', clearTooltip, true);
    window.addEventListener('resize', clearTooltip);

    return () => {
      window.removeEventListener('scroll', clearTooltip, true);
      window.removeEventListener('resize', clearTooltip);
    };
  }, [hoveredHistoryButton]);

  /** Successful load with no log rows: full-width empty state (ReportPortal-style). */
  const showNoResultsEmptyState = !loading && error === null && items.length === 0;

  return (
    <>
    <div className="min-h-[12rem] p-4 text-sm text-slate-800 dark:text-slate-200">
      <div className="mb-4 flex justify-end">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              disabled
              className="p-1.5 text-slate-400"
              aria-label="Previous test"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled
              className="p-1.5 text-slate-400"
              aria-label="Next test"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {canMakeDecision && (
            <button
              type="button"
              onClick={() => setDefectModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-600 bg-transparent px-2.5 py-0.5 text-xs font-medium text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
              data-mipqa="make-decision-button"
            >
              Make decision
            </button>
          )}
        </div>
      </div>

      {historyButtons.length > 0 || hiddenHistoryButtonsCount > 0 ? (
        <div className="mb-5 mx-[25px]">
          <div className="relative overflow-x-auto overflow-y-hidden pb-3 [scrollbar-width:thin]">
            <div className="inline-flex min-w-full items-center gap-2 whitespace-nowrap pr-2">
              {hiddenHistoryButtonsCount > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onShowMoreHistoryButtons?.();
                    }}
                    disabled={historyButtonsLoading}
                    className="shrink-0 rounded-md border border-slate-200 bg-white px-4 py-2 text-center text-xs font-semibold text-cyan-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-cyan-400 dark:hover:bg-slate-700"
                  >
                    <span className="block leading-none">+{hiddenHistoryButtonsCount}</span>
                    <span className="mt-1 block leading-none">More</span>
                  </button>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden />
                </>
              ) : null}
              {historyButtons.map((button, index) => (
                <React.Fragment key={button.id}>
                  <div
                    className={`relative flex shrink-0 items-center ${button.active ? 'pb-1' : ''}`}
                  >
                    <button
                      type="button"
                      onMouseEnter={e => {
                        showHistoryButtonTooltip(button, e.currentTarget);
                      }}
                      onMouseLeave={() => {
                        hideHistoryButtonTooltip(button.id);
                      }}
                      onFocus={e => {
                        showHistoryButtonTooltip(button, e.currentTarget);
                      }}
                      onBlur={() => {
                        hideHistoryButtonTooltip(button.id);
                      }}
                      onClick={e => {
                        e.currentTarget.blur();
                        if (!button.active) {
                          onSelectHistoryButton?.(button.id);
                        }
                      }}
                      disabled={historyButtonsLoading}
                      aria-current={button.active ? 'page' : undefined}
                      className={`relative min-w-[3.8rem] rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${historyButtonStatusClass(button.statusBand, button.statusLabel)} ${
                        button.active
                          ? 'shadow-[inset_0_-2px_0_0_rgba(45,212,191,1)]'
                          : 'hover:brightness-105'
                      }`}
                    >
                      {button.label}
                    </button>
                    {button.active ? (
                      <span className="pointer-events-none absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full bg-teal-400" aria-hidden />
                    ) : null}
                  </div>
                  {index < historyButtons.length - 1 ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden />
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : historyButtonsLoading ? (
        <div className="mb-4 border-b border-slate-200 pb-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Loading launches…
        </div>
      ) : null}

      {hoveredHistoryButton !== null ? (
        <HistoryLaunchTooltip
          button={hoveredHistoryButton.button}
          top={hoveredHistoryButton.top}
          left={hoveredHistoryButton.left}
        />
      ) : null}

      <div className="mb-3 border-b border-slate-200 dark:border-slate-700">
        <nav aria-label="Test log sections">
          <div
            role="tablist"
            className="-mb-px flex flex-wrap divide-x divide-slate-200 dark:divide-slate-600"
          >
          {TEST_LOG_DETAIL_TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeDetailTab === id;

            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`test-log-tab-${id}`}
                aria-selected={isActive}
                aria-controls={`test-log-panel-${id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveDetailTab(id)}
                className={`flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition-colors first:border-l-0 sm:text-xs ${
                  isActive
                    ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'border-b-2 border-transparent text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                } `}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                {label}
              </button>
            );
          })}
          </div>
        </nav>
      </div>

      {error ? (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div
        role="tabpanel"
        id="test-log-panel-all_logs"
        hidden={activeDetailTab !== 'all_logs'}
        aria-labelledby="test-log-tab-all_logs"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-600 dark:text-slate-300">{testDisplayName}</span>
          <span className="tabular-nums">&lt; 1 of 1 &gt;</span>
        </div>

        <div className="relative min-h-[10rem]">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded border border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/60">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" aria-hidden />
            </div>
          ) : null}

          {showNoResultsEmptyState ? (
            <div
              className="flex min-h-[10rem] w-full items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 py-10 text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
              role="status"
              aria-live="polite"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-slate-400 opacity-90 dark:text-slate-500" aria-hidden />
              <span>No results found</span>
            </div>
          ) : (
            <div className={`overflow-x-auto ${loading ? 'pointer-events-none select-none opacity-60' : ''}`}>
              <table className="w-full min-w-[720px] table-fixed text-sm">
                <colgroup>
                  <col style={{ width: '58%' }} />
                  <col className="w-[18%]" />
                  <col className="w-[24%]" />
                </colgroup>
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    <th className="py-2 pl-3 pr-2">
                      <span className="inline-flex w-full items-center gap-1 border border-slate-200 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800">
                        <Search className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        <span className="truncate">Log message</span>
                      </span>
                    </th>
                    <th className="py-2 px-2">
                      <span className="inline-flex items-center gap-1">
                        All statuses
                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                      </span>
                    </th>
                    <th
                      className="py-2 pl-2 pr-3 whitespace-nowrap"
                      scope="col"
                      title="Order matches Robot/XML execution (seq)"
                    >
                      <span className="font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Time
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {items.map((node, idx) => (
                    <AllLogsTreeRows
                      key={
                        node.kind === 'keyword'
                          ? `root-kw-${node.kwId}-${idx}`
                          : `root-msg-${node.msgId}-${idx}`
                      }
                      node={node}
                      depth={0}
                      parentKey={`r${idx}`}
                      rowIndex={idx}
                      hoveredTimeRowKey={hoveredTimeRowKey}
                      onHoverTimeRow={onHoverTimeRow}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <p>
            {items.length === 0
              ? '0 – 0 of 0'
              : `1 – ${items.length} of ${items.length}`}
          </p>
          <p>
            <span className="font-semibold text-teal-600 dark:text-teal-400">50</span> per page
          </p>
        </div>
      </div>

    </div>
    {defectModalOpen && overviewTestId !== null && (
      <DefectSelectionModal
        targets={[{ overviewTestId, testName: testDisplayName }]}
        defectTypes={defectTypes}
        onClose={() => setDefectModalOpen(false)}
        onApplied={results => {
          results.forEach(r => onDefectApplied?.(r.overviewTestId, r.defect));
          setDefectModalOpen(false);
        }}
      />
    )}
    </>
  );
};

export default OverviewTestLogView;
