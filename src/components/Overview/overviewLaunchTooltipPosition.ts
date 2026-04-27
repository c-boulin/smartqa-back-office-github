const HISTORY_BUTTON_TOOLTIP_WIDTH_PX = 252;
const HISTORY_BUTTON_TOOLTIP_VIEWPORT_MARGIN_PX = 16;

/**
 * Places the fixed launch tooltip below {@code element}, centered horizontally and clamped to the viewport.
 */
export function computeHistoryLaunchTooltipPosition(element: HTMLElement): { top: number; left: number } {
  const rect = element.getBoundingClientRect();
  const unclampedLeft = rect.left + rect.width / 2;
  const minLeft = HISTORY_BUTTON_TOOLTIP_VIEWPORT_MARGIN_PX + HISTORY_BUTTON_TOOLTIP_WIDTH_PX / 2;
  const maxLeft =
    window.innerWidth - HISTORY_BUTTON_TOOLTIP_VIEWPORT_MARGIN_PX - HISTORY_BUTTON_TOOLTIP_WIDTH_PX / 2;

  return {
    top: rect.bottom + 12,
    left: Math.min(maxLeft, Math.max(minLeft, unclampedLeft)),
  };
}
