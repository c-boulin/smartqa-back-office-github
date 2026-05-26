import React from 'react';
import { DocSectionBlock, DocChecklist, DocTip } from '../DocSection';

const CHECKLIST = [
  'Write clear, numbered test steps that any tester can follow independently',
  'Define expected results for every step, not just the final assertion',
  'Organize test cases into folders and apply consistent tags before scaling',
  'Review reports at the end of each sprint to identify recurring failures',
  'Archive old test runs to keep active workspaces clean and navigable',
  'Keep tag names short, singular, and agreed upon across the team',
  'Use preconditions to document any data or system state required before execution',
  'Link test cases to requirements or user stories for full traceability',
  'Schedule automated email reports so stakeholders stay informed without manual effort',
  'Use configurations to test across multiple browsers and environments systematically',
];

const DocBestPractices: React.FC = () => (
  <article data-mipqa="doc-best-practices-article">
    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
      These recommendations are derived from real-world QA workflows and help teams build
      sustainable, scalable testing practices using SMARTQA.
    </p>

    <DocSectionBlock title="QA Workflow Checklist">
      <DocChecklist items={CHECKLIST} />
    </DocSectionBlock>

    <DocSectionBlock title="Why Structure Matters">
      <div className="rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800/50 p-5">
        <blockquote className="text-slate-700 dark:text-slate-200 text-base leading-relaxed font-medium">
          &ldquo;Structured testing leads to predictable quality and faster delivery cycles.&rdquo;
        </blockquote>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
          When test cases are well-defined, organized, and linked to clear expected outcomes,
          your team can identify regressions faster, reduce debugging time,
          and ship with confidence.
        </p>
      </div>
    </DocSectionBlock>

    <DocTip variant="info">
      Start small. Even applying 3 of these practices consistently will measurably
      improve your team&apos;s release confidence within one sprint cycle.
    </DocTip>
  </article>
);

export default DocBestPractices;
