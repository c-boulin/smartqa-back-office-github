import React from 'react';
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

function createSegmentLabelRenderer(labelColor: string) {
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
    const radius = outerRadius + 22;
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
        fontSize={13}
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
} & Pick<React.ComponentProps<typeof PieChart>, 'width' | 'height'>;

export const DashboardStyleDonutPie: React.FC<DashboardStyleDonutPieProps> = ({
  data,
  onSliceClick,
  showSegmentLabels = false,
  width,
  height,
}) => {
  const { theme } = useTheme();
  const labelColor = theme === 'dark' ? '#cbd5e1' : '#475569';
  const labelRenderer = showSegmentLabels ? createSegmentLabelRenderer(labelColor) : undefined;

  return (
    <PieChart width={width} height={height}>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={75}
        outerRadius={110}
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

type DashboardStyleDonutWithCenterLabelProps = Omit<DashboardStyleDonutPieProps, 'width' | 'height'> & {
  centerValue: number | string;
  centerSubtitle: string;
};

export const DashboardStyleDonutWithCenterLabel: React.FC<DashboardStyleDonutWithCenterLabelProps> = ({
  data,
  centerValue,
  centerSubtitle,
  onSliceClick,
  showSegmentLabels,
}) => (
  <div className="donut-chart-wrapper relative h-full w-full overflow-visible">
    <ResponsiveContainer width="100%" height="100%">
      <DashboardStyleDonutPie data={data} onSliceClick={onSliceClick} showSegmentLabels={showSegmentLabels} />
    </ResponsiveContainer>
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <div className="text-3xl font-bold leading-none text-slate-900 dark:text-white">
        {centerValue}
      </div>
      <div className="mt-1.5 text-xs font-semibold uppercase tracking-wider leading-none text-slate-600 dark:text-gray-400">
        {centerSubtitle}
      </div>
    </div>
  </div>
);
