import React from 'react';
import { DocSectionBlock, DocList, DocTip, DocMetricCard } from '../DocSection';

const DocProjectsManagement: React.FC = () => (
  <article data-mipqa="doc-projects-management-article">
    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
      The Projects page is your central workspace. Every testing activity begins here.
    </p>

    <DocSectionBlock title="What You Can Do">
      <DocList items={[
        'View all projects in a structured card or list layout',
        'Search projects by title with instant filtering',
        'Create new projects with full configuration options',
        'Edit, duplicate, or delete existing projects',
        'Use Quick Links to navigate directly to Test Cases or Test Runs',
      ]} />
    </DocSectionBlock>

    <DocSectionBlock title="Project Structure">
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
        Each project acts as a self-contained workspace and holds all of the following:
      </p>
      <div className="grid grid-cols-2 gap-3">
        <DocMetricCard label="Test Cases" description="Describe all scenarios to verify expected system behavior." />
        <DocMetricCard label="Test Runs" description="Execution sessions tracking the current state of your testing." />
        <DocMetricCard label="Reports" description="Summaries and analytics generated after each test run." />
        <DocMetricCard label="Configurations" description="Environment definitions for automated executions." />
      </div>
    </DocSectionBlock>

    <DocTip>
      Use clear and structured project naming conventions such as{' '}
      <span className="font-mono font-medium">"WebApp – Login Release Q1"</span> to keep your
      workspace organized as you scale.
    </DocTip>
  </article>
);

export default DocProjectsManagement;
