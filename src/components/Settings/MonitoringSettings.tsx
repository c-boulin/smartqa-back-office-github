import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Check, Loader, Plus, Settings2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../UI/Card';
import { DefectGroupSection } from './DefectGroupSection';
import { GeneralMonitoringSettings } from './GeneralMonitoringSettings';
import { createDefectGroup, fetchDefectGroups, slugify, type DefectGroupData } from '../../services/defectGroupsApi';

type MonitoringTab = 'general' | 'defect-types';

// ─── Inline "Add Group" form ──────────────────────────────────────────────────

interface AddGroupRowProps {
  nextPosition: number;
  onSaved: (group: DefectGroupData) => void;
  onCancel: () => void;
}

function AddGroupRow({ nextPosition, onSaved, onCancel }: AddGroupRowProps): React.ReactElement {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error('Group name is required'); return; }
    setSaving(true);
    try {
      const created = await createDefectGroup({
        name: trimmed,
        slug: slugify(trimmed),
        position: nextPosition,
      });
      onSaved(created);
      toast.success('Group created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setSaving(false);
    }
  }, [name, nextPosition, onSaved]);

  return (
    <div className="flex items-center gap-3 border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800/40">
      <div className="flex flex-1 items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Group name…"
          className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-64"
          data-mipqa="add-group-name-input"
        />
        <span className="text-xs text-slate-400 dark:text-slate-500">
          slug: <span className="font-mono">{slugify(name) || '…'}</span>
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-50"
          data-mipqa="add-group-save-btn"
        >
          {saving
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent inline-block" />
            : <Check className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          data-mipqa="add-group-cancel-btn"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Defect Types Tab ─────────────────────────────────────────────────────────

function DefectTypesTab(): React.ReactElement {
  const [groups, setGroups] = useState<DefectGroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGroup, setShowAddGroup] = useState(false);

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

  const handleGroupDeleted = useCallback((id: number) => {
    setGroups(prev => prev.filter(g => g.id !== id));
  }, []);

  const handleGroupCreated = useCallback((group: DefectGroupData) => {
    setGroups(prev => [...prev, group]);
    setShowAddGroup(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="w-6 h-6 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {groups.length === 0 && !showAddGroup ? (
        <div className="py-16 text-center">
          <Activity className="mx-auto mb-3 w-10 h-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No defect groups found.</p>
        </div>
      ) : (
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
              onGroupDeleted={handleGroupDeleted}
            />
          ))}
        </table>
      )}

      {showAddGroup && (
        <AddGroupRow
          nextPosition={groups.length + 1}
          onSaved={handleGroupCreated}
          onCancel={() => setShowAddGroup(false)}
        />
      )}

      {!showAddGroup && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowAddGroup(true)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
            data-mipqa="add-group-btn"
          >
            <Plus className="h-4 w-4" />
            Add Group
          </button>
        </div>
      )}
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

        {activeTab === 'general' && <GeneralMonitoringSettings />}

        {activeTab === 'defect-types' && <DefectTypesTab />}
      </Card>
    </div>
  );
}
