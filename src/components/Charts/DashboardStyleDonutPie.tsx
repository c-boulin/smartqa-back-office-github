import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export type DashboardStyleDonutDatum = {
  name: string;
  value: number;
  color: string;
};

const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  backgroundColor: 'rgb(241 245 249)',
  border: '1px solid rgb(203 213 225)',
  borderRadius: '8px',
  color: 'rgb(15 23 42)',
};

const RADIAN = Math.PI / 180;

const COMPACT_VIEWPORT_QUERY = '(max-width: 1350px)';

function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(COMPACT_VIEWPORT_QUERY).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    const handler = (e: MediaQueryListEvent) => setCompact(e.matches);
    mql.addEventListener('change', handler);
    setCompact(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return compact;
}

function createSegmentLabelRenderer(labelColor: string, labelOffset: number, fontSize: number) {
  return function renderSegmentLabel(props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    outerRadius?: number;
    percent?: number;
  }): React.ReactElement | null {
    const { cx, cy, midAngle, outerRadius, percent } = props;
    if (cx == null || cy == null || midAngle == null || outerRadius == null || percent == null) return null;
    if (percent < 0.01) return null;
    const radius = outerRadius + labelOffset;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct = `${(percent * 100).toFixed(1).replace('.', ',')}%`;
    const normalizedAngle = ((midAngle % 360) + 360) % 360;
    const anchor = normalizedAngle > 90 && normalizedAngle < 270 ? 'end' : normalizedAngle === 90 || normalizedAngle === 270 ? 'middle' : 'start';
    return (
      <text
        x={x}
        y={y}
        fill={labelColor}
        textAnchor={anchor}
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight={600}
      >
        {pct}
      </text>
    );
  };
}

type DashboardStyleDonutPieProps = {
  data: DashboardStyleDonutDatum[];
  onSliceClick?: (data: { name: string; value: number }) => void;
  showSegmentLabels?: boolean;
  compact?: boolean;
} & Pick<React.ComponentProps<typeof PieChart>, 'width' | 'height'>;

export const DashboardStyleDonutPie: React.FC<DashboardStyleDonutPieProps> = ({
  data,
  onSliceClick,
  showSegmentLabels = false,
  compact = false,
  width,
  height,
}) => {
  const { theme } = useTheme();
  const labelColor = theme === 'dark' ? '#cbd5e1' : '#475569';

  const innerRadius = compact ? 50 : 85;
  const outerRadius = compact ? 72 : 120;
  const labelOffset = compact ? 10 : 14;
  const labelFontSize = compact ? 10 : 12;

  const labelRenderer = showSegmentLabels ? createSegmentLabelRenderer(labelColor, labelOffset, labelFontSize) : undefined;

  return (
    <PieChart width={width} height={height}>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        dataKey="value"
        nameKey="name"
        startAngle={90}
        endAngle={450}
        onClick={onSliceClick}
        label={labelRenderer}
        labelLine={false}
      >
        {data.map((entry, index) => (
          <Cell
            key={`cell-${entry.name}-${index}`}
            fill={entry.color}
            style={onSliceClick !== undefined ? { cursor: 'pointer' } : undefined}
          />
        ))}
      </Pie>
      <Tooltip
        contentStyle={TOOLTIP_CONTENT_STYLE}
        labelStyle={{ color: 'rgb(15 23 42)' }}
        itemStyle={{ color: 'rgb(15 23 42)' }}
      />
    </PieChart>
  );
};

type DashboardStyleDonutWithCenterLabelProps = Omit<DashboardStyleDonutPieProps, 'width' | 'height' | 'compact'> & {
  centerValue: number | string;
  centerSubtitle: string;
};

export const DashboardStyleDonutWithCenterLabel: React.FC<DashboardStyleDonutWithCenterLabelProps> = ({
  data,
  centerValue,
  centerSubtitle,
  onSliceClick,
  showSegmentLabels,
}) => {
  const compact = useCompactViewport();

  return (
    <div className="donut-chart-wrapper relative h-full w-full overflow-visible">
      <ResponsiveContainer width="100%" height="100%" style={{ overflow: 'visible' }}>
        <DashboardStyleDonutPie data={data} onSliceClick={onSliceClick} showSegmentLabels={showSegmentLabels} compact={compact} />
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className={`font-bold leading-none text-slate-900 dark:text-white ${compact ? 'text-xl' : 'text-4xl'}`}>
          {centerValue}
        </div>
        <div className={`mt-1.5 font-semibold uppercase tracking-wider leading-none text-slate-600 dark:text-gray-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {centerSubtitle}
        </div>
      </div>
    </div>
  );
};
