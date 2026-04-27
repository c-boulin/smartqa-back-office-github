import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Launch summary shown on history pills and suite list "View" (attributes + duration).
 */
export interface HistoryLaunchTooltipButtonModel {
  id: string;
  label: string;
  active: boolean;
  title: string;
  statusLabel: string;
  statusBand?: string;
  attributeLines: string[];
  durationLabel: string;
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

/**
 * Text color class for launch status inside the dark tooltip panel.
 */
function launchTooltipStatusTextClass(
  statusBand: string | null | undefined,
  statusLabel: string | null | undefined,
): string {
  switch (normalizeStatusBand(statusBand, statusLabel)) {
    case 'failed':
      return 'text-red-400';
    case 'passed':
      return 'text-emerald-400';
    case 'skipped':
      return 'text-amber-300';
    default:
      return 'text-slate-300';
  }
}

export const HistoryLaunchTooltip: React.FC<{
  button: HistoryLaunchTooltipButtonModel;
  top: number;
  left: number;
}> = ({ button, top, left }) => {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed z-[10020] w-[252px] max-w-[calc(100vw-2rem)]"
      style={{ top, left, transform: 'translateX(-50%)' }}
      role="presentation"
    >
      <div className="rounded-[4px] bg-slate-800 text-left text-xs text-slate-200 shadow-[0_10px_26px_rgba(0,0,0,0.38)] dark:bg-slate-800">
        <div className="px-[18px] py-[15px]">
          <span className="block text-[13px] font-semibold leading-[1.25] text-white [overflow-wrap:anywhere]">
            {button.label}: <span className={launchTooltipStatusTextClass(button.statusBand, button.statusLabel)}>{button.statusLabel}</span>
          </span>
          {button.attributeLines.length > 0 ? (
            <div className="mt-3">
              <span className="block text-[10px] font-semibold uppercase leading-none tracking-[0.06em] text-slate-400">
                Launch attributes:
              </span>
              <div className="mt-[7px] space-y-[4px]">
                {button.attributeLines.map(line => (
                  <div
                    key={line}
                    className="max-w-full break-words border border-slate-500/90 px-[7px] py-[4px] text-[12px] leading-[1.1] text-slate-300 [overflow-wrap:anywhere]"
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-[14px]">
            <span className="block text-[10px] font-semibold uppercase leading-none tracking-[0.06em] text-slate-400">
              Duration:
            </span>
            <span className="mt-[6px] block text-[19px] font-semibold leading-none text-white">{button.durationLabel}</span>
          </div>
        </div>
        <div className="absolute left-1/2 top-0 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-800 dark:bg-slate-800" />
      </div>
    </div>,
    document.body,
  );
};
