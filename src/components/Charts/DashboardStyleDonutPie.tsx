import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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

function renderSegmentLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
}): React.ReactElement | null {
  const { cx, cy, midAngle, outerRadius, percent } = props;
  if (cx == null || cy == null || midAngle == null || outerRadius == null || percent == null) return null;
  if (percent < 0.01) return null;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const pct = `${(percent * 100).toFixed(1).replace('.', ',')}%`;
  return (
    <text
      x={x}
      y={y}
      fill="#e2e8f0"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {pct}
    </text>
  );
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
}) => (
  <PieChart width={width} height={height}>
    <Pie
      data={data}
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={90}
      dataKey="value"
      nameKey="name"
      startAngle={90}
      endAngle={450}
      onClick={onSliceClick}
      label={showSegmentLabels ? renderSegmentLabel : undefined}
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

type DashboardStyleDonutWithCenterLabelProps = Omit<DashboardStyleDonutPieProps, 'width' | 'height'> & {
  centerValue: number | string;
  centerSubtitle: string;
};

/**
 * Wraps {@link DashboardStyleDonutPie} in a ResponsiveContainer sized to its
 * parent, and overlays the centre value/subtitle as plain HTML so html2canvas
 * exports render the labels reliably (SVG {@code <text>} inside recharts is
 * unreliable under html2canvas at the sizes we need).
 */
export const DashboardStyleDonutWithCenterLabel: React.FC<DashboardStyleDonutWithCenterLabelProps> = ({
  data,
  centerValue,
  centerSubtitle,
  onSliceClick,
  showSegmentLabels,
}) => (
  <div className="relative h-full w-full">
    <ResponsiveContainer width="100%" height="100%">
      <DashboardStyleDonutPie data={data} onSliceClick={onSliceClick} showSegmentLabels={showSegmentLabels} />
    </ResponsiveContainer>
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <div className="text-2xl font-bold leading-none text-slate-900 dark:text-white">
        {centerValue}
      </div>
      <div className="mt-1 text-sm leading-none text-slate-600 dark:text-gray-400">
        {centerSubtitle}
      </div>
    </div>
  </div>
);
