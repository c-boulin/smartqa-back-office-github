import { useApp } from '../context/AppContext';
import { Project } from '../types';

/**
 * Sidebar / header "template vs project" surface mode — driven by Projects page tabs
 * (`SET_SIDEBAR_ENTITY_MODE`), not by whether the selected row is a template.
 */
export function useTemplateContext(): {
  isTemplateContext: boolean;
  selected: Project | null;
} {
  const { state, getSelectedProject } = useApp();
  const selected = getSelectedProject();
  const isTemplateContext = state.sidebarEntityMode === 'templates';
  return { isTemplateContext, selected };
}
