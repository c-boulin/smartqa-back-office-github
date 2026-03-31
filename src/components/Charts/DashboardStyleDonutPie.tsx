import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

/**
 * One slice for {@link DashboardStyleDonutPie} (matches dashboard active-test-runs chart shape).
 */
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

type DashboardStyleDonutPieProps = {
  data: DashboardStyleDonutDatum[];
  centerValue: number;
  centerSubtitle: string;
  /** Same contract as dashboard {@code Pie} onClick when slices are clickable. */
  onSliceClick?: (data: { name: string; value: number }) => void;
} & Pick<React.ComponentProps<typeof PieChart>, 'width' | 'height'>;

/**
 * Donut chart built like **Test Cases in Active Test Runs** on the dashboard: same Recharts layout,
 * start/end angles, radii, tooltip, and centre labels.
 *
 * When wrapped in Recharts `ResponsiveContainer`, the library injects `width` / `height` on this
 * component; those must be forwarded to `PieChart` or the donut renders at zero size.
 */
export const DashboardStyleDonutPie: React.FC<DashboardStyleDonutPieProps> = ({
  data,
  centerValue,
  centerSubtitle,
  onSliceClick,
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
    <text
      x="50%"
      y="45%"
      textAnchor="middle"
      dominantBaseline="middle"
      className="fill-slate-900 dark:fill-white text-2xl font-bold"
    >
      {centerValue}
    </text>
    <text
      x="50%"
      y="55%"
      textAnchor="middle"
      dominantBaseline="middle"
      className="fill-slate-600 dark:fill-gray-400 text-sm"
    >
      {centerSubtitle}
    </text>
  </PieChart>
);
