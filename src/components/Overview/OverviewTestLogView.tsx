import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  History,
  Info,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  OverviewTestLogItemApiRow,
  OverviewTestLogKeywordApiNode,
  OverviewTestLogTreeNode,
} from '../../services/overviewWidgetsApi';
import { buildAssetsUrlFromObjectKey } from '../../env';

/** Identifiers for the test-detail sub-tabs (All logs / Item details have body content; others placeholder or empty). */
export type OverviewTestLogDetailTabId =
  | 'stack_trace'
  | 'all_logs'
  | 'attachments'
  | 'item_details'
  | 'history';

const TEST_LOG_DETAIL_TABS: ReadonlyArray<{
  id: OverviewTestLogDetailTabId;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'stack_trace', label: 'Stack trace', icon: ClipboardList },
  { id: 'all_logs', label: 'All logs', icon: FileText },
  { id: 'attachments', label: 'Attachments', icon: Paperclip },
  { id: 'item_details', label: 'Item details', icon: Info },
  { id: 'history', label: 'History of actions', icon: History },
];

/** Sub-tabs that only reserve an empty panel until content exists. */
const TEST_LOG_EMPTY_DETAIL_TABS: readonly OverviewTestLogDetailTabId[] = ['attachments'];

export interface OverviewTestLogViewProps {
  launchTitle: string;
  testDisplayName: string;
  items: OverviewTestLogTreeNode[];
  testStatusLabel: string;
  /** From API: suite file path from {@code Suites/} ({@code overview_suites.source}). */
  suiteSourceRelative?: string | null;
  /** From API: Robot test line when opening a test log. */
  testLine?: number | null;
  /** Method type from suite list row (e.g. Test, After suite). */
  suiteListMethodType: string;
  /** Status from the suite list row (same as previous table). */
  suiteListStatusLabel: string;
  suiteListStartTimeRelative: string;
  suiteListStartTimeDisplay: string;
  suiteListStartTimeRaw: string | null;
  suiteListDurationLabel: string;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  hoveredTimeRowKey: string | null;
  onHoverTimeRow: (key: string | null) => void;
}

/**
 * Parses a launch display name like `SB_fuzeforge_DE #612` for the history strip.
 */
function launchNumberFromTitle(title: string): number | null {
  const m = title.match(/#(\d+)/);
  if (m === null) {
    return null;
  }
  const n = Number.parseInt(m[1], 10);

  return Number.isNaN(n) ? null : n;
}

/**
 * Hover title for log row time column (raw DB start when present).
 */
function logTimeHoverLabel(item: OverviewTestLogItemApiRow): string {
  if (item.startTimeRaw !== null && item.startTimeRaw !== '') {
    return item.startTimeRaw;
  }
  return item.startTimeDisplay;
}

/**
 * Collects all `overview_msgs` leaves from an accordion tree (for code reference fallback).
 */
function flattenOverviewTestLogMessages(nodes: OverviewTestLogTreeNode[]): OverviewTestLogItemApiRow[] {
  const out: OverviewTestLogItemApiRow[] = [];
  const walk = (n: OverviewTestLogTreeNode): void => {
    if (n.kind === 'message') {
      out.push(n);
      return;
    }
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

/**
 * Item details file fields apply only when suite list method type is Test.
 */
function isItemDetailsTestMethodType(methodType: string): boolean {
  return methodType.trim().toLowerCase() === 'test';
}

/**
 * Hover label for suite-list start time on Item details (raw when present, else display).
 */
function itemDetailsSuiteStartHoverTitle(display: string, raw: string | null): string {
  if (raw !== null && raw !== '') {
    return raw;
  }
  return display;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  const t = text.trim();
  if (t === '' || t === '\u2014') {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort Robot source location from log lines (e.g. {@code Suites/Foo.robot:14}).
 */
function extractCodeReferenceFromLogs(logItems: Array<{ logMessage: string }>): string {
  for (const row of logItems) {
    const msg = row.logMessage;
    const m = msg.match(/([\w./\\-]+\.robot):\s*(\d+)/i);
    if (m !== null) {
      return `${m[1]}:${m[2]}`;
    }
    const m2 = msg.match(/([\w./\\-]+\.robot:\d+)/i);
    if (m2 !== null) {
      return m2[1];
    }
  }
  return '\u2014';
}

/**
 * Builds Item details "Code reference" from the suite path and `overview_tests.line`,
 * without appending `:${line}` when the path already ends with `:\d+`.
 */
function codeReferenceFromSuitePathAndLine(
  suiteSourceRelative: string | null | undefined,
  testLine: number | null | undefined,
): string | null {
  const rel = suiteSourceRelative?.trim() ?? '';
  if (rel === '') {
    return null;
  }
  if (testLine != null && testLine > 0) {
    if (/:\d+$/.test(rel)) {
      return rel;
    }

    return `${rel}:${testLine}`;
  }

  return rel;
}

/**
 * Strips a trailing `:line` segment so "Test case id" stays `path:name`, not `path:line:name`.
 */
function suiteRelativePathForTestCaseId(suiteSourceRelative: string): string {
  return suiteSourceRelative.trim().replace(/:\d+$/, '');
}

/**
 * One metadata block on the Item details tab (label, monospace value, optional copy).
 */
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
  const downloadName = useMemo(() => {
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
          <a
            href={url}
            download={downloadName}
            className="rounded p-0.5 text-cyan-600 hover:bg-cyan-500/15 dark:text-cyan-400 dark:hover:bg-cyan-500/20"
            title="Download"
            aria-label="Download"
            rel="noopener noreferrer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
      <ScreenshotPreviewModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        imageUrl={url}
        imageAlt={downloadName}
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
          {hoveredTimeRowKey === rowKey ? logTimeHoverLabel(node) : node.startTimeDisplay}
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
      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
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
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            {node.statusLabel}
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
            {node.kwType === 'TEARDOWN' && node.screenshotAttachmentCount > 0 ? (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 text-slate-500 dark:text-slate-400"
                title={`${node.screenshotAttachmentCount} screenshot(s)`}
                aria-label={`${node.screenshotAttachmentCount} screenshot attachment(s)`}
                role="img"
              >
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                <span className="tabular-nums text-xs" aria-hidden>
                  {node.screenshotAttachmentCount}
                </span>
              </span>
            ) : null}
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

function ItemDetailMetadataRow({
  label,
  value,
  allowCopy,
}: {
  label: string;
  value: string;
  allowCopy: boolean;
}) {
  const canCopy = allowCopy && value.trim() !== '' && value !== '\u2014';

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 break-all font-mono text-xs text-slate-800 dark:text-slate-200">{value}</span>
        {canCopy ? (
          <button
            type="button"
            onClick={() => void copyTextToClipboard(value)}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-600 dark:hover:text-slate-100"
            aria-label={`Copy ${label}`}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Fourth-level ReportPortal-style test log view (ALL LOGS table and chrome).
 */
const OverviewTestLogView: React.FC<OverviewTestLogViewProps> = ({
  launchTitle,
  testDisplayName,
  items,
  testStatusLabel,
  suiteSourceRelative = null,
  testLine = null,
  suiteListMethodType,
  suiteListStatusLabel,
  suiteListStartTimeRelative,
  suiteListStartTimeDisplay,
  suiteListStartTimeRaw,
  suiteListDurationLabel,
  loading,
  error,
  onRefresh,
  hoveredTimeRowKey,
  onHoverTimeRow,
}) => {
  const launchNum = useMemo(() => launchNumberFromTitle(launchTitle), [launchTitle]);

  const historyPills = useMemo(() => {
    if (launchNum === null) {
      return [launchTitle];
    }
    const start = Math.max(1, launchNum - 5);
    const labels: number[] = [];
    for (let i = start; i <= launchNum; i++) {
      labels.push(i);
    }

    return labels;
  }, [launchNum, launchTitle]);

  const statusUpper = testStatusLabel !== '—' ? testStatusLabel.toUpperCase() : '—';
  const itemDetailsStatusUpper =
    suiteListStatusLabel !== '—' ? suiteListStatusLabel.toUpperCase() : '—';

  const [hoveredItemDetailSuiteStart, setHoveredItemDetailSuiteStart] = useState(false);

  const logItemsSignature = useMemo(
    () =>
      [
        JSON.stringify(items),
        suiteSourceRelative ?? '',
        String(testLine ?? ''),
        suiteListMethodType,
        suiteListStatusLabel,
        suiteListStartTimeRelative,
        suiteListDurationLabel,
        testDisplayName,
      ].join('\n'),
    [
      items,
      suiteSourceRelative,
      testLine,
      suiteListMethodType,
      suiteListStatusLabel,
      suiteListStartTimeRelative,
      suiteListDurationLabel,
      testDisplayName,
    ],
  );

  const [activeDetailTab, setActiveDetailTab] = useState<OverviewTestLogDetailTabId>('all_logs');

  useEffect(() => {
    setActiveDetailTab('all_logs');
  }, [logItemsSignature]);

  useEffect(() => {
    setHoveredItemDetailSuiteStart(false);
  }, [logItemsSignature]);

  /** Successful load with no log rows: full-width empty state (ReportPortal-style). */
  const showNoResultsEmptyState = !loading && error === null && items.length === 0;

  const showItemDetailFileFields = isItemDetailsTestMethodType(suiteListMethodType);
  const itemDetailCodeReference = useMemo(() => {
    const fromDb = codeReferenceFromSuitePathAndLine(suiteSourceRelative, testLine);
    if (fromDb !== null) {
      return fromDb;
    }

    return extractCodeReferenceFromLogs(flattenOverviewTestLogMessages(items));
  }, [suiteSourceRelative, testLine, items]);
  const itemDetailTestCaseId = useMemo(() => {
    const rel = suiteSourceRelative?.trim() ?? '';
    if (rel !== '') {
      return `${suiteRelativePathForTestCaseId(rel)}:${testDisplayName}`;
    }
    const fromLogs = extractCodeReferenceFromLogs(flattenOverviewTestLogMessages(items));
    if (fromLogs !== '\u2014') {
      const file = fromLogs.split(':')[0];

      return `${file}:${testDisplayName}`;
    }

    return testDisplayName;
  }, [suiteSourceRelative, testDisplayName, items]);

  return (
    <div className="relative min-h-[12rem] p-4 text-sm text-slate-800 dark:text-slate-200">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-800/70">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" aria-hidden />
        </div>
      ) : null}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <label className="flex cursor-not-allowed items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <input type="checkbox" disabled className="rounded border-slate-300" />
          History across all launches
        </label>
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
        </div>
      </div>

      {launchNum !== null ? (
        <div className="mb-4 flex flex-wrap items-end gap-1 border-b border-slate-200 pb-2 dark:border-slate-700">
          {historyPills.map((entry, idx) => {
            const isCurrent = typeof entry === 'number' && entry === launchNum;
            const label = typeof entry === 'number' ? `#${entry}` : entry;

            return (
              <div key={`${label}-${idx}`} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-red-500" aria-hidden>
                  ▲
                </span>
                <span
                  className={
                    isCurrent
                      ? 'border-b-2 border-teal-500 px-2 py-1 text-xs font-semibold text-teal-600 dark:text-teal-400'
                      : 'rounded bg-emerald-600/15 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                  }
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-100 px-3 py-2.5 dark:bg-slate-700/50">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          <span className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
            {statusUpper}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
        </div>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded border border-slate-300 bg-slate-200 px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-600 dark:text-slate-400"
        >
          Make decision
        </button>
      </div>

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
        <div className="mb-4 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-3 text-xs dark:border-slate-700/80">
            <span className="font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Log level
            </span>
            <div className="flex flex-wrap gap-2 text-slate-500 dark:text-slate-400">
              {['Fatal', 'Error', 'Warn', 'Info', 'Debug', 'Trace'].map(level => (
                <span
                  key={level}
                  className={level === 'Trace' ? 'font-semibold text-teal-600 dark:text-teal-400' : ''}
                >
                  {level}
                </span>
              ))}
            </div>
            <label className="ml-auto flex cursor-not-allowed items-center gap-1.5">
              <input type="checkbox" disabled className="rounded border-slate-300" />
              Logs with attachment
            </label>
            <label className="flex cursor-not-allowed items-center gap-1.5">
              <input type="checkbox" disabled className="rounded border-slate-300" />
              Hide all passed logs
            </label>
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-600 dark:text-slate-300">{testDisplayName}</span>
            <span className="tabular-nums">&lt; 1 of 1 &gt;</span>
          </div>

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
            <div className="overflow-x-auto">
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

      <div
        role="tabpanel"
        id="test-log-panel-stack_trace"
        hidden={activeDetailTab !== 'stack_trace'}
        aria-labelledby="test-log-tab-stack_trace"
      >
        <div
          className="flex min-h-[10rem] w-full items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 py-10 text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
          role="status"
          aria-live="polite"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-slate-500 opacity-90 dark:text-slate-500" aria-hidden />
          <span>No stack trace to display</span>
        </div>
      </div>

      <div
        role="tabpanel"
        id="test-log-panel-history"
        hidden={activeDetailTab !== 'history'}
        aria-labelledby="test-log-tab-history"
      >
        <div
          className="flex min-h-[10rem] w-full items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 py-10 text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
          role="status"
          aria-live="polite"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-slate-500 opacity-90 dark:text-slate-500" aria-hidden />
          <span>No activities to display</span>
        </div>
      </div>

      <div
        role="tabpanel"
        id="test-log-panel-item_details"
        hidden={activeDetailTab !== 'item_details'}
        aria-labelledby="test-log-tab-item_details"
      >
        <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/40">
          <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,1fr)_minmax(11rem,16rem)] md:items-stretch md:p-6">
            <div className="flex min-w-0 gap-3">
              <span className="max-w-[7rem] shrink-0 break-words pt-1 text-end text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-400 dark:text-slate-500 sm:max-w-[8rem]">
                {suiteListMethodType}
              </span>
              <div className="min-w-0 flex-1 border-l border-slate-200 pl-4 dark:border-slate-600">
                <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">
                  {testDisplayName}
                </h2>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{itemDetailsStatusUpper}</span>
                  <span
                    className="cursor-default text-sm text-slate-600 dark:text-slate-400"
                    onMouseEnter={() => {
                      if (
                        suiteListStartTimeRelative !== '\u2014' &&
                        suiteListStartTimeRelative !== '-'
                      ) {
                        setHoveredItemDetailSuiteStart(true);
                      }
                    }}
                    onMouseLeave={() => setHoveredItemDetailSuiteStart(false)}
                  >
                    {hoveredItemDetailSuiteStart
                      ? itemDetailsSuiteStartHoverTitle(
                          suiteListStartTimeDisplay,
                          suiteListStartTimeRaw,
                        )
                      : suiteListStartTimeRelative}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  <span>{suiteListDurationLabel}</span>
                </div>
                <div className="mt-5 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-600">
                  {showItemDetailFileFields ? (
                    <>
                      <ItemDetailMetadataRow
                        label="Code reference"
                        value={itemDetailCodeReference}
                        allowCopy
                      />
                      <ItemDetailMetadataRow label="Test case id" value={itemDetailTestCaseId} allowCopy />
                    </>
                  ) : null}
                  <ItemDetailMetadataRow label="Description" value={'\u2014'} allowCopy={false} />
                </div>
              </div>
            </div>
            <div className="flex min-h-[11rem] flex-col border-slate-200 md:border-l md:pl-6 dark:border-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Parameters:
              </span>
              <div className="flex flex-1 items-center justify-center pt-4 md:pt-0">
                <span className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  NO PARAMETERS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {TEST_LOG_EMPTY_DETAIL_TABS.map(id => (
        <div
          key={id}
          role="tabpanel"
          id={`test-log-panel-${id}`}
          hidden={activeDetailTab !== id}
          aria-labelledby={`test-log-tab-${id}`}
          className="min-h-[12rem]"
        />
      ))}
    </div>
  );
};

export default OverviewTestLogView;
