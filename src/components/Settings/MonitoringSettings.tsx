import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../UI/Card';
import { DefectGroupSection } from './DefectGroupSection';
import { fetchDefectGroups, type DefectGroupData } from '../../services/defectGroupsApi';

export function MonitoringSettings(): React.ReactElement {
  const [groups, setGroups] = useState<DefectGroupData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDefectGroups();
      setGroups(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load defect groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGroupUpdated = useCallback((updated: DefectGroupData) => {
    setGroups(prev => prev.map(g => (g.id === updated.id ? updated : g)));
  }, []);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-500" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Monitoring Settings</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
          Manage defect types and their groupings used across test run analysis.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Defect Types</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Groups and their associated defect types. Hover a row to edit or delete.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-6 h-6 text-cyan-500 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="mx-auto mb-3 w-10 h-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No defect groups found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-mipqa="defect-types-table">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-10">
                    Defect Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Abbreviation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Color
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Diagram
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              {groups.map(group => (
                <DefectGroupSection
                  key={group.id}
                  group={group}
                  onGroupUpdated={handleGroupUpdated}
                />
              ))}
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
