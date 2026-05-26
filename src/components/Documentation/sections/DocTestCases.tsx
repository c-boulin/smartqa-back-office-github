import React from 'react';
import { DocSectionBlock, DocList, DocTip, DocMetricCard } from '../DocSection';

const CREATION_STEPS = [
  'Open Test Cases from the sidebar navigation',
  'Click Add Test Case in the top-right toolbar',
  'Complete all required fields in the creation form',
  'Click Save to persist the test case to the project',
];

const REQUIRED_FIELDS = [
  'Title — a concise description of what is being tested',
  'Description — context and purpose of the test case',
  'Preconditions — system or data state required before execution',
  'Test Steps — numbered actions the tester must perform',
  'Expected Results — what a successful outcome looks like',
  'Priority — High, Medium, or Low',
  'Tags — labels for filtering and categorization',
  'Automation Status — Manual, Automated, or To Be Automated',
];

const ORGANIZATION_TIPS = [
  'Use folders to group test cases by feature, module, or epic',
  'Apply tags consistently to enable cross-project filtering',
  'Use the Filters sidebar to isolate specific priorities or statuses',
];

const DocTestCases: React.FC = () => (
  <article data-mipqa="doc-test-cases-article">
    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
      Test cases describe expected system behavior and guide the execution process.
      Well-structured test cases are the backbone of reliable QA.
    </p>

    <DocSectionBlock title="Creating a Test Case">
      <div className="mb-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Steps:</p>
        <DocList items={CREATION_STEPS} ordered />
      </div>
    </DocSectionBlock>

    <DocSectionBlock title="Required Fields">
      <DocList items={REQUIRED_FIELDS} />
    </DocSectionBlock>

    <DocSectionBlock title="Organizing Test Cases">
      <DocList items={ORGANIZATION_TIPS} />
    </DocSectionBlock>

    <DocSectionBlock title="Field Reference">
      <div className="grid grid-cols-2 gap-3">
        <DocMetricCard label="Priority" description="High, Medium, Low — helps prioritize execution order during time-constrained runs." />
        <DocMetricCard label="Automation Status" description="Indicates whether the test is manual, automated, or planned for automation." />
        <DocMetricCard label="Tags" description="Free-form labels for grouping across folders and projects." />
        <DocMetricCard label="Test Steps" description="Each step should be atomic, numbered, and actionable." />
      </div>
    </DocSectionBlock>

    <DocTip>
      Always define expected results for every step, not just the final outcome.
      This makes failures much easier to diagnose during execution.
    </DocTip>
  </article>
);

export default DocTestCases;
