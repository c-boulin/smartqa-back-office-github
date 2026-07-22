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

type DashboardStyleDonutPieProps = {
  data: DashboardStyleDonutDatum[];
  onSliceClick?: (data: { name: string; value: number }) => void;
} & Pick<React.ComponentProps<typeof PieChart>, 'width' | 'height'>;

export const DashboardStyleDonutPie: React.FC<DashboardStyleDonutPieProps> = ({
  data,
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
  </PieChart>
);

type DashboardStyleDonutWithCenterLabelProps = DashboardStyleDonutPieProps & {
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
}) => (
  <div className="relative h-full w-full">
    <ResponsiveContainer width="100%" height="100%">
      <DashboardStyleDonutPie data={data} onSliceClick={onSliceClick} />
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
