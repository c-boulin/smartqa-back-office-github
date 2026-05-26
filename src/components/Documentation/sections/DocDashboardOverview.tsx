import React from 'react';
import { DocSectionBlock, DocList, DocTip, DocMetricCard } from '../DocSection';

const DASHBOARD_FEATURES = [
  'Real-time execution overview across all active projects',
  'Service and country performance breakdowns',
  'Pass vs Fail trends visualized with time-series charts',
  'Running averages for key quality indicators',
  'Widget-based layout for focused, customizable views',
];

const DocDashboardOverview: React.FC = () => (
  <article data-mipqa="doc-dashboard-overview-article">
    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
      The Dashboard gives you an at-a-glance view of your project health and testing activity.
      It aggregates data from all active runs to surface the metrics that matter most.
    </p>

    <DocSectionBlock title="Dashboard Metrics">
      <div className="grid grid-cols-2 gap-3">
        <DocMetricCard
          label="Execution Overview"
          description="Total cases executed, pass rate, and current run status at a glance."
        />
        <DocMetricCard
          label="Service Performance"
          description="Breakdown of test results grouped by service, application, or module."
        />
        <DocMetricCard
          label="Country Metrics"
          description="Geo-segmented execution data for multi-region testing coverage."
        />
        <DocMetricCard
          label="Pass vs Fail Trends"
          description="Time-series charts showing quality trajectory across recent test runs."
        />
        <DocMetricCard
          label="Running Averages"
          description="Statistical averages to smooth out short-term fluctuations in quality data."
        />
        <DocMetricCard
          label="Active Executions"
          description="Live status of test cases currently being executed across all open runs."
        />
      </div>
    </DocSectionBlock>

    <DocSectionBlock title="Dashboard Features">
      <DocList items={DASHBOARD_FEATURES} />
    </DocSectionBlock>

    <DocTip variant="info">
      The Dashboard is the best starting point for your daily QA standup.
      Use the widget filters to focus on the service or environment relevant to the current sprint.
    </DocTip>
  </article>
);

export default DocDashboardOverview;
