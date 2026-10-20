import React, { useCallback, useEffect, useState } from 'react';
import { Loader, Plus, SquarePen, Bot, ArrowLeft } from 'lucide-react';
import { automatedConfigurationsApi, AutomatedConfigurationItem } from '../../services/automatedConfigurationsApi';
import { apiService } from '../../services/api';
import Button from '../UI/Button';
import toast from 'react-hot-toast';
import { apiErrorDetailOr } from '../../utils/apiErrorDetail';

const USER_AGENTS_LOAD_ERROR =
  'Could not load user agents — check CI repository token and branch (rundeckOptions/useragents.json)';

const BROWSER_OPTIONS = ['Chrome', 'Firefox'] as const;

type FormState = { label: string; browser: string; useragent: string };
const initialForm: FormState = { label: '', browser: 'Chrome', useragent: '' };

interface AutomatedConfigurationsStepProps {
  projectId: string;
  gitlabProjectName: string | null | undefined;
}

const AutomatedConfigurationsStep: React.FC<AutomatedConfigurationsStepProps> = ({
  projectId,
  gitlabProjectName,
}) => {
  const [configurations, setConfigurations] = useState<AutomatedConfigurationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<AutomatedConfigurationItem | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [userAgentOptions, setUserAgentOptions] = useState<string[]>([]);
  const [userAgentOptionsLoading, setUserAgentOptionsLoading] = useState(false);

  const loadConfigurations = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    automatedConfigurationsApi
      .getByProject(projectId)
      .then((res) => setConfigurations(res.data ?? []))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load automated configurations');
        setConfigurations([]);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    loadConfigurations();
  }, [loadConfigurations]);

  const fetchUserAgentOptions = useCallback(() => {
    const repositoryUrl = gitlabProjectName;
    if (!repositoryUrl?.trim()) {
      setUserAgentOptions([]);
      return;
    }
    setUserAgentOptionsLoading(true);
    setUserAgentOptions([]);
    apiService
      .authenticatedRequest(`/gitlab/useragents-list?repository_url=${encodeURIComponent(repositoryUrl)}`)
      .then((response: { success?: boolean; data?: unknown[]; errors?: unknown }) => {
        const data = response?.data;
        if (response?.success === false || !Array.isArray(data) || data.length === 0) {
          setUserAgentOptions([]);
          toast.error(apiErrorDetailOr(response, USER_AGENTS_LOAD_ERROR));
          return;
        }
        const options = data.map((item) =>
          typeof item === 'string' ? item : (item as { name?: string; value?: string })?.name ?? (item as { value?: string })?.value ?? String(item)
        );
        setUserAgentOptions(options);
      })
      .catch((err) => {
        setUserAgentOptions([]);
        toast.error(apiErrorDetailOr(err, USER_AGENTS_LOAD_ERROR));
      })
      .finally(() => setUserAgentOptionsLoading(false));
  }, [gitlabProjectName]);

  const openCreate = () => {
    setFormMode('create');
    setEditingItem(null);
    setForm(initialForm);
    setFormVisible(true);
    fetchUserAgentOptions();
  };

  const openEdit = (config: AutomatedConfigurationItem) => {
    setFormMode('edit');
    setEditingItem(config);
    setForm({
      label: config.label,
      browser: config.browser ?? '',
      useragent: config.useragent ?? '',
    });
    setFormVisible(true);
    fetchUserAgentOptions();
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingItem(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    try {
      setSaving(true);
      const payload = {
        label: form.label.trim(),
        browser: form.browser.trim() || null,
        useragent: form.useragent.trim() || null,
      };
      if (formMode === 'create') {
        await automatedConfigurationsApi.create(projectId, payload);
        toast.success('Configuration created');
        loadConfigurations();
      } else if (editingItem) {
        await automatedConfigurationsApi.update(projectId, editingItem.id, payload);
        toast.success('Configuration updated');
        setConfigurations((prev) =>
          prev.map((c) =>
            c.id === editingItem.id
              ? { ...c, label: payload.label, browser: payload.browser, useragent: payload.useragent }
              : c
          )
        );
      }
      closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Loader className="w-6 h-6 text-cyan-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-gray-400">Loading configurations...</p>
      </div>
    );
  }

  if (formVisible) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={closeForm}
            className="p-1.5 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {formMode === 'create' ? 'Create automated configuration' : 'Edit automated configuration'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ac-label" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
              Label
            </label>
            <input
              id="ac-label"
              type="text"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
              placeholder="e.g. Chrome Desktop"
            />
          </div>
          <div>
            <label htmlFor="ac-browser" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
              Browser
            </label>
            <select
              id="ac-browser"
              value={form.browser}
              onChange={(e) => setForm((f) => ({ ...f, browser: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            >
              <option value="">-- Select browser --</option>
              {BROWSER_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ac-useragent" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
              User agent
            </label>
            <select
              id="ac-useragent"
              value={form.useragent}
              onChange={(e) => setForm((f) => ({ ...f, useragent: e.target.value }))}
              disabled={userAgentOptionsLoading}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">
                {(() => {
                  if (userAgentOptionsLoading) return 'Loading...';
                  if (!gitlabProjectName) return 'Configure CI repository on the project first';
                  return '-- Select user agent --';
                })()}
              </option>
              {userAgentOptions.map((ua) => (
                <option key={ua} value={ua}>
                  {ua.length > 80 ? `${ua.slice(0, 80)}...` : ua}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : formMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-gray-400">
          Manage browser and user agent configurations for automated testing.
        </p>
        <Button type="button" size="sm" onClick={openCreate} icon={Plus}>
          Add
        </Button>
      </div>

      {configurations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Bot className="w-8 h-8 text-slate-400 dark:text-gray-600" />
          <p className="text-sm text-slate-500 dark:text-gray-400 text-center">
            No automated configurations yet.<br />
            Click &quot;Add&quot; to create one.
          </p>
        </div>
      )}

      {configurations.length > 0 && (
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {configurations.map((config) => (
            <div
              key={config.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{config.label}</div>
                <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  {config.browser || 'No browser'} &middot; {config.useragent ? (config.useragent.length > 40 ? `${config.useragent.slice(0, 40)}...` : config.useragent) : 'No user agent'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openEdit(config)}
                className="flex-shrink-0 p-2 text-slate-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Edit configuration"
              >
                <SquarePen className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutomatedConfigurationsStep;
