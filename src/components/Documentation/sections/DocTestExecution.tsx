import React from 'react';
import { DocSectionBlock, DocList, DocStatusBadge, DocTip, DocMetricCard } from '../DocSection';

const EXECUTION_STEPS = [
  'Open Test Runs from the sidebar navigation',
  'Select an existing Test Run or create a new one',
  'Open a Test Case from the run\'s case list',
  'Execute each step in order, following the instructions',
  'Mark the result using the status selector',
];

const DocTestExecution: React.FC = () => (
  <article data-mipqa="doc-test-execution-article">
    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
      Execution is where your test cases become actionable data.
      Each test run captures a snapshot of your system quality at a specific point in time.
    </p>

    <DocSectionBlock title="How to Execute">
      <DocList items={EXECUTION_STEPS} ordered />
    </DocSectionBlock>

    <DocSectionBlock title="Execution Statuses">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Each test case in a run can be assigned one of the following statuses:
      </p>
      <div className="flex flex-wrap gap-2">
        <DocStatusBadge label="Passed" color="green" />
        <DocStatusBadge label="Failed" color="red" />
        <DocStatusBadge label="Retest" color="amber" />
        <DocStatusBadge label="Blocked" color="orange" />
        <DocStatusBadge label="Skipped" color="slate" />
        <DocStatusBadge label="Untested" color="gray" />
        <DocStatusBadge label="In Progress" color="blue" />
        <DocStatusBadge label="Unknown" color="gray" />
      </div>
    </DocSectionBlock>

    <DocSectionBlock title="Execution Metrics">
      <div className="grid grid-cols-2 gap-3">
        <DocMetricCard
          label="Execution Progress"
          description="Percentage of test cases that have been executed versus total assigned."
        />
        <DocMetricCard
          label="Pass / Fail Distribution"
          description="Visual breakdown of outcome statuses across all cases in the run."
        />
        <DocMetricCard
          label="Active Runs"
          description="Test runs currently in progress, available for continued execution."
        />
        <DocMetricCard
          label="Closed Runs"
          description="Completed runs locked for historical review and reporting."
        />
      </div>
    </DocSectionBlock>

    <DocTip>
      Add execution comments to failed or blocked test cases to capture defect details,
      environment notes, or reproduction steps for the development team.
    </DocTip>
  </article>
);

export default DocTestExecution;
