/** TEMP(bolt-overview) — categories whose project_ids are resolved at runtime from the projects API. */
export type OverviewProjectScope = 'sb' | 'bolt';

export interface OverviewCategoryMeta {
  id: string;
  label: string;
  repoNames: string[];
  /** TEMP(bolt-overview) — set for SB/Bolt, which are sent as project_ids only. */
  projectScope?: OverviewProjectScope;
  enabled: boolean;
}

/** TEMP(bolt-overview) — SB scope is QATESmartbuilder minus the Bolt projects. */
export const TEMP_SB_OVERVIEW_REPO_NAME = 'QATESmartbuilder';

/**
 * TEMP(bolt-overview) — Bolt projects are identified by title, never by id: ids differ per environment.
 * TODO(remove): replace with real Bolt gitlab repoNames when the QATE Bolt repo exists
 */
const TEMP_BOLT_OVERVIEW_PROJECT_TITLES = ['Bravigo', 'WinInfinity'];

const normalizeTitle = (title: string) => title.trim().toLowerCase();
const BOLT_TITLES = new Set(TEMP_BOLT_OVERVIEW_PROJECT_TITLES.map(normalizeTitle));

export function isTempBoltProjectTitle(title: unknown): boolean {
  return typeof title === 'string' && BOLT_TITLES.has(normalizeTitle(title));
}

export const OVERVIEW_CATEGORIES: OverviewCategoryMeta[] = [
  { id: 'sb', label: 'DV Content by SB', repoNames: [], projectScope: 'sb', enabled: true },
  { id: 'dvs', label: 'DV Content by DVS', repoNames: ['QATEconf', 'QATEgraph'], enabled: true },
  // TEMP(bolt-overview) — TODO(remove): replace with real Bolt gitlab repoNames when the QATE Bolt repo exists
  { id: 'bolt', label: 'DV Content by Bolt', repoNames: [], projectScope: 'bolt', enabled: true },
  { id: 'games', label: 'Games', repoNames: [], enabled: false },
  { id: 'landing', label: 'Landing Page', repoNames: [], enabled: false },
  { id: 'ai-agent', label: 'AI Agent', repoNames: [], enabled: false },
];

export function findOverviewCategory(id: string | null): OverviewCategoryMeta | null {
  if (id === null) return null;
  return OVERVIEW_CATEGORIES.find(category => category.id === id && category.enabled) ?? null;
}

export function overviewCategoryLabelForRepos(repoNames: string[]): string | null {
  if (repoNames.length === 0) return null;
  const target = new Set(repoNames);
  for (const category of OVERVIEW_CATEGORIES) {
    if (category.repoNames.length !== target.size) continue;
    if (category.repoNames.every(name => target.has(name))) return category.label;
  }
  return null;
}
