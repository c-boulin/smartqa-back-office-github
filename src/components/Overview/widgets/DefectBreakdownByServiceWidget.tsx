import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type {
  OverviewDefectSeriesProject,
  OverviewWidgetsWindow,
} from '../../../services/overviewWidgetsApi';
import {
  formatOverviewWindowRangeShort,
  overviewWidgetsLastWeekTrendLabel,
} from '../../../utils/formatOverviewWindowRange';
import { DEFECT_BREAKDOWN_STACK_TYPES } from '../../../constants/defectChartTypes';
import {
  BarChartCard,
  DashboardSection,
  DateFilter,
  SectionToolbar,
  TwoColumnGrid,
  ViewMeta,
  WidgetContentBody,
  WidgetContentHeader,
} from './dashboard';

interface DefectBreakdownByServiceWidgetProps {
  defectSeriesByProject: OverviewDefectSeriesProject[];
  window: OverviewWidgetsWindow;
}

/**
 * Full legend rows (12 defect types) for each service card, colours from {@link DEFECT_BREAKDOWN_STACK_TYPES}.
 */
function DefectBreakdownLegend(): React.ReactElement {
  return (
    <div
      className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-4"
      aria-label="Defect type legend"
    >
      {DEFECT_BREAKDOWN_STACK_TYPES.map(d => (
        <div key={d.key} className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: d.color }}
            aria-hidden
          />
          <span className="leading-tight text-slate-600 dark:text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Stacked defect bars per service; series and `projectId` come from the overview API (fake counts server-side).
 */
const DefectBreakdownByServiceWidget: React.FC<DefectBreakdownByServiceWidgetProps> = ({
  defectSeriesByProject,
  window,
}) => {
  const rangeShort = formatOverviewWindowRangeShort(window.from, window.to);

  return (
    <DashboardSection
      title="Defect Breakdown by Service"
      description={`Defect types per service for ${rangeShort} (same previous calendar week as the execution summary above).`}
      icon="bug"
    >
      <WidgetContentHeader>
        <SectionToolbar split>
          <DateFilter value={overviewWidgetsLastWeekTrendLabel(window)} />
          <ViewMeta label="Launch statistics" />
        </SectionToolbar>
      </WidgetContentHeader>

      <WidgetContentBody>
        {defectSeriesByProject.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No services with test activity in this period.
          </p>
        ) : (
          <TwoColumnGrid>
            {defectSeriesByProject.map((proj, index) => (
              <BarChartCard
                key={proj.projectId}
                title={`${proj.label} Last week defects`}
                subtitle="Launch statistics chart"
                viewLabel="Bar view"
                showRefresh={index === 1}
              >
                <DefectBreakdownLegend />
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={proj.series}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.25} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) {
                            return null;
                          }
                          const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
                          return (
                            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-600 dark:bg-slate-800">
                              <p className="mb-1 font-medium text-slate-900 dark:text-white">{label}</p>
                              <p className="mb-2 text-slate-500 dark:text-slate-400">Total: {total}</p>
                              {payload
                                .filter(p => Number(p.value) > 0)
                                .map(p => (
                                  <p key={String(p.dataKey)} style={{ color: p.color }}>
                                    {p.name}: {p.value}
                                  </p>
                                ))}
                            </div>
                          );
                        }}
                      />
                      {DEFECT_BREAKDOWN_STACK_TYPES.map(defect => (
                        <Bar
                          key={defect.key}
                          dataKey={defect.key}
                          stackId="defects"
                          fill={defect.color}
                          name={defect.label}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </BarChartCard>
            ))}
          </TwoColumnGrid>
        )}
      </WidgetContentBody>
    </DashboardSection>
  );
};

export default DefectBreakdownByServiceWidget;
