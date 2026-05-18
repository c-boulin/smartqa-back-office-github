import React from 'react';
import { DocSectionBlock, DocList, DocTip, DocTag } from '../DocSection';

const BENEFITS = [
  'Faster filtering across large test case libraries',
  'Better segmentation by feature, module, or risk area',
  'Cleaner organization without requiring deep folder structures',
  'Cross-project consistency when using shared tag vocabularies',
];

const BEST_PRACTICES = [
  'Keep tag names short — one or two words maximum',
  'Avoid duplicate concepts such as "login" and "sign-in" for the same feature',
  'Use singular terms: "checkout" not "checkouts"',
  'Maintain consistency across the project team',
  'Review and clean up unused tags periodically',
];

const DocTagsOrganization: React.FC = () => (
  <article data-mipqa="doc-tags-organization-article">
    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
      Tags are lightweight labels that help you classify, group, and filter test cases without
      requiring a rigid folder hierarchy. Used correctly, they dramatically improve discoverability.
    </p>

    <DocSectionBlock title="Benefits">
      <DocList items={BENEFITS} />
    </DocSectionBlock>

    <DocSectionBlock title="Best Practices">
      <DocList items={BEST_PRACTICES} />
    </DocSectionBlock>

    <DocSectionBlock title="Good vs. Bad Examples">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Good tag names:</p>
          <div className="flex flex-wrap gap-2">
            <DocTag label="login" variant="good" />
            <DocTag label="mobile-ui" variant="good" />
            <DocTag label="checkout" variant="good" />
            <DocTag label="api" variant="good" />
            <DocTag label="regression" variant="good" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Avoid these patterns:</p>
          <div className="flex flex-wrap gap-2">
            <DocTag label="Login Tests Q2 Version Final" variant="bad" />
            <DocTag label="checkout-flow-new-updated-2024" variant="bad" />
            <DocTag label="tests for the mobile app ui" variant="bad" />
          </div>
        </div>
      </div>
    </DocSectionBlock>

    <DocTip>
      Define a tag vocabulary at the start of a project and share it with the team.
      Consistent tagging makes filtering and reporting far more reliable.
    </DocTip>
  </article>
);

export default DocTagsOrganization;
