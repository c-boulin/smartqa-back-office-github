import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Loader, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../UI/Card';
import { DefectGroupSection } from './DefectGroupSection';
import { fetchDefectGroups, type DefectGroupData } from '../../services/defectGroupsApi';

type MonitoringTab = 'general' | 'defect-types';

function DefectTypesTab(): React.ReactElement {
  const [groups, setGroups] = useState<DefectGroupData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGroups(await fetchDefectGroups());
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="w-6 h-6 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center">
        <Activity className="mx-auto mb-3 w-10 h-10 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">No defect groups found.</p>
      </div>
    );
  }

  return (
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
  );
}

export function MonitoringSettings(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<MonitoringTab>('general');

  const tabs: { id: MonitoringTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'defect-types', label: 'Defect Types' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-500" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Monitoring Settings</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
          Configure monitoring behavior and defect classification.
        </p>
      </Card>

      <Card className="overflow-hidden">
        {/* Inner tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              data-mipqa={`monitoring-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3.5 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.id === 'general' && <Settings2 className="w-4 h-4" />}
              {tab.id === 'defect-types' && <Activity className="w-4 h-4" />}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className="flex items-center justify-center py-20 text-slate-400 dark:text-slate-500">
            <p className="text-sm">General settings coming soon.</p>
          </div>
        )}

        {activeTab === 'defect-types' && <DefectTypesTab />}
      </Card>
    </div>
  );
}
