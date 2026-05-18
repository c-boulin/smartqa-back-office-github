import React from 'react';
import { DocSectionBlock, DocList, DocTip, DocMetricCard } from '../DocSection';

const PDF_USE_CASES = [
  'Presentation-ready reports for stakeholder reviews',
  'Printable test evidence for compliance and audit purposes',
  'Formatted summaries with charts and visual data',
  'Release sign-off documentation',
];

const CSV_USE_CASES = [
  'Import data into external tracking or analytics tools',
  'Custom manipulation and filtering in spreadsheet software',
  'Bulk defect import into issue trackers',
  'Long-term trend analysis across releases',
];

const EMAIL_FEATURES = [
  'Schedule reports to deliver automatically on a cadence',
  'Set recipients, format, and frequency in one configuration',
  'Supports daily, weekly, or custom delivery schedules',
  'Keeps stakeholders updated without manual export steps',
];

const DocDownloadingReports: React.FC = () => (
  <article data-mipqa="doc-downloading-reports-article">
    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
      SMARTQA supports multiple export formats so you can share your testing results
      in whatever way best fits your audience and workflow.
    </p>

    <DocSectionBlock title="PDF Export">
      <div className="mb-4">
        <DocMetricCard
          label="Best for: Presentations & Formal Documentation"
          description="PDF reports preserve formatting and charts, making them ideal for sharing with non-technical stakeholders."
        />
      </div>
      <DocList items={PDF_USE_CASES} />
    </DocSectionBlock>

    <DocSectionBlock title="CSV Export">
      <div className="mb-4">
        <DocMetricCard
          label="Best for: Data Analysis & Tool Integration"
          description="CSV exports give you raw, structured data that can be imported into any spreadsheet or analytics tool."
        />
      </div>
      <DocList items={CSV_USE_CASES} />
    </DocSectionBlock>

    <DocSectionBlock title="Email Scheduling">
      <div className="mb-4">
        <DocMetricCard
          label="Best for: Recurring Stakeholder Updates"
          description="Automated email delivery ensures the right people always have up-to-date quality metrics in their inbox."
        />
      </div>
      <DocList items={EMAIL_FEATURES} />
    </DocSectionBlock>

    <DocTip>
      Set up scheduled email reports at the start of each sprint. Stakeholders will automatically
      receive end-of-sprint summaries without any manual export effort.
    </DocTip>
  </article>
);

export default DocDownloadingReports;
