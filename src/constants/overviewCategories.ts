export interface OverviewCategoryMeta {
  id: string;
  label: string;
  repoNames: string[];
  enabled: boolean;
}

export const OVERVIEW_CATEGORIES: OverviewCategoryMeta[] = [
  { id: 'dvs', label: 'DV Content by DVS', repoNames: ['QATEconf', 'QATEgraph'], enabled: true },
  { id: 'sb', label: 'DV Content by SB', repoNames: ['QATESmartbuilder'], enabled: true },
  { id: 'bolt', label: 'DV Content by Bolt', repoNames: [], enabled: false },
  { id: 'games', label: 'Games', repoNames: [], enabled: false },
  { id: 'landing', label: 'Landing Page', repoNames: [], enabled: false },
  { id: 'ai-agent', label: 'AI Agent', repoNames: [], enabled: false },
];

export function overviewCategoryLabelForRepos(repoNames: string[]): string | null {
  if (repoNames.length === 0) return null;
  const target = new Set(repoNames);
  for (const category of OVERVIEW_CATEGORIES) {
    if (category.repoNames.length !== target.size) continue;
    if (category.repoNames.every(name => target.has(name))) return category.label;
  }
  return null;
}
