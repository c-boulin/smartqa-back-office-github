import React from 'react';
import { DocSectionBlock, DocList, DocTip, DocMetricCard } from '../DocSection';

const SUMMARY_INCLUDES = [
  'Total Test Runs and their statuses',
  'Total Test Cases executed',
  'Linked defects and issues',
  'Charts showing pass/fail/blocked distribution',
  'Execution trends over time',
];

const DETAILED_INCLUDES = [
  'Assigned testers and their individual results',
  'Full execution history per test case',
  'Configuration and environment details',
  'Step-level results and comments',
  'Attached screenshots or evidence files',
];

const DocReportsAnalytics: React.FC = () => (
  <article data-mipqa="doc-reports-analytics-article">
    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
      Reports transform raw execution data into structured, shareable insights.
      SMARTQA provides two report levels to serve different stakeholder needs.
    </p>

    <DocSectionBlock title="Test Run Summary Report">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
        The Summary Report gives a high-level overview of one or more test runs.
        Ideal for stakeholders who need a quick quality gate assessment.
      </p>
      <DocList items={SUMMARY_INCLUDES} />
    </DocSectionBlock>

    <DocSectionBlock title="Test Run Detailed Report">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
        The Detailed Report goes deeper into individual test case results.
        Best used by QA leads and developers investigating failures.
      </p>
      <DocList items={DETAILED_INCLUDES} />
    </DocSectionBlock>

    <DocSectionBlock title="Analytics Metrics">
      <div className="grid grid-cols-2 gap-3">
        <DocMetricCard label="Execution Trends" description="Track quality evolution across multiple runs over time." />
        <DocMetricCard label="Pass Rate" description="Ratio of passed cases versus total executed cases." />
        <DocMetricCard label="Defect Density" description="Number of linked issues relative to test cases executed." />
        <DocMetricCard label="Tester Coverage" description="Which testers are assigned and how many cases each has executed." />
      </div>
    </DocSectionBlock>

    <DocTip variant="info">
      Use the Summary Report for sprint reviews and the Detailed Report for bug triage sessions
      to get the right level of information for each audience.
    </DocTip>
  </article>
);

export default DocReportsAnalytics;
