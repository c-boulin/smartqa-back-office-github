export interface OverviewCategoryMeta {
  id: string;
  label: string;
  repoNames: string[];
  /** TEMP(bolt-overview) — only used by the Bolt placeholder category. */
  projectIds?: number[];
  enabled: boolean;
}

export interface OverviewCategorySelection {
  repoNames: string[];
  projectIds: number[];
}

export const EMPTY_OVERVIEW_CATEGORY_SELECTION: OverviewCategorySelection = { repoNames: [], projectIds: [] };

/**
 * TEMP(bolt-overview) — DEV IDs only (Bravigo 471, Winfinity 466-470). These projects stay on QATESmartbuilder.
 * TODO(remove): replace with real Bolt gitlab repoNames when the QATE Bolt repo exists
 */
export const TEMP_BOLT_OVERVIEW_PROJECT_IDS: number[] = [471, 466, 467, 468, 469, 470];

/** TEMP(bolt-overview) — TODO(remove): replace with real Bolt gitlab repoNames when the QATE Bolt repo exists */
export function isTempBoltProjectId(id: number): boolean {
  return TEMP_BOLT_OVERVIEW_PROJECT_IDS.includes(id);
}

/** TEMP(bolt-overview) — SB scope is QATESmartbuilder minus the Bolt allowlist. */
export const TEMP_SB_OVERVIEW_REPO_NAME = 'QATESmartbuilder';

export const OVERVIEW_CATEGORIES: OverviewCategoryMeta[] = [
  { id: 'sb', label: 'DV Content by SB', repoNames: [TEMP_SB_OVERVIEW_REPO_NAME], enabled: true },
  { id: 'dvs', label: 'DV Content by DVS', repoNames: ['QATEconf', 'QATEgraph'], enabled: true },
  // TEMP(bolt-overview) — TODO(remove): replace with real Bolt gitlab repoNames when the QATE Bolt repo exists
  { id: 'bolt', label: 'DV Content by Bolt', repoNames: [], projectIds: TEMP_BOLT_OVERVIEW_PROJECT_IDS, enabled: true },
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

/**
 * TEMP(bolt-overview) — export header label for the active sidebar selection (SB/Bolt are sent as project_ids only).
 * TODO(remove): replace with real Bolt gitlab repoNames when the QATE Bolt repo exists
 */
export function overviewCategoryLabelForSelection(selection: OverviewCategorySelection): string | null {
  const byRepos = overviewCategoryLabelForRepos(selection.repoNames);
  if (byRepos) return byRepos;
  if (selection.projectIds.length === 0) return null;
  const target = new Set(selection.projectIds);
  for (const category of OVERVIEW_CATEGORIES) {
    const ids = category.projectIds ?? [];
    if (ids.length === target.size && ids.every(id => target.has(id))) return category.label;
  }
  return null;
}

export function isTempSbSelection(selection: OverviewCategorySelection): boolean {
  return (
    selection.projectIds.length === 0 &&
    selection.repoNames.length === 1 &&
    selection.repoNames[0] === TEMP_SB_OVERVIEW_REPO_NAME
  );
}
