import React from 'react';
import { DocSectionBlock, DocList, DocTip, DocMetricCard } from '../DocSection';

const CONFIGURATION_STEPS = [
  'Open Automated Configuration from the Settings menu',
  'Click Add Configuration to start a new configuration entry',
  'Specify browser, user agent, and environment label',
  'Review all settings and click Save to persist the configuration',
];

const CONFIGURATION_FIELDS = [
  'Browser — Chrome, Firefox, Safari, Edge, and more',
  'User Agent — device or browser variant identifier string',
  'Environment Label — staging, production, QA, or custom labels',
  'Operating System — target platform for the automated run',
  'Screen Resolution — viewport dimensions for visual testing',
];

const DocAutomatedConfiguration: React.FC = () => (
  <article data-mipqa="doc-automated-configuration-article">
    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
      Automated Configurations define the environment in which your automated test suites run.
      Each configuration specifies the browser, user agent, and environment parameters
      that SMARTQA will use when executing automated test cases.
    </p>

    <DocSectionBlock title="Configuration Settings">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <DocMetricCard label="Browser" description="Target browser for automated execution (Chrome, Firefox, Safari, Edge)." />
        <DocMetricCard label="User Agent" description="Specific device or browser string to simulate for testing." />
        <DocMetricCard label="Environment" description="The target deployment environment: staging, production, or custom." />
        <DocMetricCard label="Screen Resolution" description="Viewport dimensions to match the target user's screen." />
      </div>
    </DocSectionBlock>

    <DocSectionBlock title="Configuration Flow">
      <DocList items={CONFIGURATION_STEPS} ordered />
    </DocSectionBlock>

    <DocSectionBlock title="Available Fields">
      <DocList items={CONFIGURATION_FIELDS} />
    </DocSectionBlock>

    <DocTip variant="info">
      Create separate configurations for each environment and browser combination you support.
      This enables parallel automated runs across environments from a single test suite.
    </DocTip>
  </article>
);

export default DocAutomatedConfiguration;
