import React, { useCallback, useEffect, useState } from 'react';
import { Loader, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchMonitoringSettings,
  saveMonitoringSettings,
  type MonitoringSettingsData,
} from '../../services/monitoringSettingsApi';

// ─── Option lists ─────────────────────────────────────────────────────────────

const KEEP_LAUNCHES_OPTIONS: { value: number | null; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 21, label: '21 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
  { value: null, label: 'Forever' },
];

const KEEP_LOGS_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 21, label: '21 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
];

const KEEP_ATTACHMENTS_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 21, label: '21 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

// ─── Row component ────────────────────────────────────────────────────────────

interface SettingRowProps {
  label: string;
  description: string;
  mipqa: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, mipqa, children }: SettingRowProps): React.ReactElement {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6 py-5 border-b border-slate-200 dark:border-slate-700 last:border-0" data-mipqa={mipqa}>
      <div className="sm:w-56 shrink-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>
      <div className="flex-1 flex items-center">
        {children}
      </div>
    </div>
  );
}

const selectClass =
  'w-48 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors';

// ─── Main component ───────────────────────────────────────────────────────────

export function GeneralMonitoringSettings(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MonitoringSettingsData>({
    keepLaunchesDays: 180,
    keepLogsDays: 90,
    keepAttachmentsDays: 30,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setForm(await fetchMonitoringSettings());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await saveMonitoringSettings({
        keep_launches_days: form.keepLaunchesDays,
        keep_logs_days: form.keepLogsDays,
        keep_attachments_days: form.keepAttachmentsDays,
      });
      setForm(updated);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="w-6 h-6 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-4">
      <SettingRow
        label="Keep launches"
        description="How long to keep old launches. A launch and all its descendants (suites, tests, steps, logs) will be deleted."
        mipqa="setting-row-keep-launches"
      >
        <select
          data-mipqa="keep-launches-select"
          value={form.keepLaunchesDays === null ? 'forever' : form.keepLaunchesDays}
          onChange={e => setForm(f => ({ ...f, keepLaunchesDays: e.target.value === 'forever' ? null : Number(e.target.value) }))}
          className={selectClass}
        >
          {KEEP_LAUNCHES_OPTIONS.map(o => (
            <option key={String(o.value)} value={o.value === null ? 'forever' : o.value}>{o.label}</option>
          ))}
        </select>
      </SettingRow>

      <SettingRow
        label="Keep logs"
        description="How long to keep old logs in launches. Related launches structure will be saved, in order to keep statistics."
        mipqa="setting-row-keep-logs"
      >
        <select
          data-mipqa="keep-logs-select"
          value={form.keepLogsDays}
          onChange={e => setForm(f => ({ ...f, keepLogsDays: Number(e.target.value) }))}
          className={selectClass}
        >
          {KEEP_LOGS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </SettingRow>

      <SettingRow
        label="Keep attachments"
        description="How long to keep attachments in system."
        mipqa="setting-row-keep-attachments"
      >
        <select
          data-mipqa="keep-attachments-select"
          value={form.keepAttachmentsDays}
          onChange={e => setForm(f => ({ ...f, keepAttachmentsDays: Number(e.target.value) }))}
          className={selectClass}
        >
          {KEEP_ATTACHMENTS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </SettingRow>

      <div className="flex justify-center pt-4">
        <button
          type="submit"
          disabled={saving}
          data-mipqa="monitoring-general-submit-btn"
          className="flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          {saving
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <Save className="h-4 w-4" />
          }
          Submit
        </button>
      </div>
    </form>
  );
}
