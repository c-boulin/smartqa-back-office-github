import React, { useCallback, useEffect, useState } from 'react';
import { Bot, Loader, Search, Plus, SquarePen } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import { useApp } from '../context/AppContext';
import { useRestoreLastProject } from '../hooks/useRestoreLastProject';
import { automatedConfigurationsApi, AutomatedConfigurationItem } from '../services/automatedConfigurationsApi';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const BROWSER_OPTIONS = ['Chrome', 'Firefox'] as const;

type FormState = { label: string; browser: string; useragent: string };

const initialForm: FormState = { label: '', browser: '', useragent: '' };

const AutomatedConfiguration: React.FC = () => {
  const { getSelectedProject } = useApp();
  const selectedProject = getSelectedProject();
  useRestoreLastProject();

  const [configurations, setConfigurations] = useState<AutomatedConfigurationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<AutomatedConfigurationItem | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [userAgentOptions, setUserAgentOptions] = useState<string[]>([]);
  const [userAgentOptionsLoading, setUserAgentOptionsLoading] = useState(false);

  const loadConfigurations = useCallback(() => {
    if (!selectedProject?.id) return;
    setLoading(true);
    automatedConfigurationsApi
      .getByProject(selectedProject.id)
      .then((res) => setConfigurations(res.data ?? []))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load automated configurations');
        setConfigurations([]);
      })
      .finally(() => setLoading(false));
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedProject?.id) {
      setConfigurations([]);
      return;
    }
    loadConfigurations();
  }, [selectedProject?.id, loadConfigurations]);

  const fetchUserAgentOptions = useCallback(() => {
    const repositoryUrl = selectedProject?.gitlab_project_name;
    if (!repositoryUrl?.trim()) {
      setUserAgentOptions([]);
      return;
    }
    setUserAgentOptionsLoading(true);
    setUserAgentOptions([]);
    apiService
      .authenticatedRequest(`/gitlab/useragents-list?repository_url=${encodeURIComponent(repositoryUrl)}`)
      .then((response: { success?: boolean; data?: unknown[] }) => {
        const data = response?.data;
        if (!Array.isArray(data)) {
          setUserAgentOptions([]);
          return;
        }
        const options = data.map((item) =>
          typeof item === 'string' ? item : (item as { name?: string; value?: string })?.name ?? (item as { value?: string })?.value ?? String(item)
        );
        setUserAgentOptions(options);
      })
      .catch(() => setUserAgentOptions([]))
      .finally(() => setUserAgentOptionsLoading(false));
  }, [selectedProject?.gitlab_project_name]);

  const openCreate = () => {
    setModalMode('create');
    setEditingItem(null);
    setForm(initialForm);
    setModalOpen(true);
    fetchUserAgentOptions();
  };

  const openEdit = (config: AutomatedConfigurationItem) => {
    setModalMode('edit');
    setEditingItem(config);
    setForm({
      label: config.label,
      browser: config.browser ?? '',
      useragent: config.useragent ?? '',
    });
    setModalOpen(true);
    fetchUserAgentOptions();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject?.id) return;
    try {
      setSaving(true);
      const payload = {
        label: form.label.trim(),
        browser: form.browser.trim() || null,
        useragent: form.useragent.trim() || null,
      };
      if (modalMode === 'create') {
        await automatedConfigurationsApi.create(selectedProject.id, payload);
        toast.success('Configuration created');
        loadConfigurations();
      } else if (editingItem) {
        await automatedConfigurationsApi.update(selectedProject.id, editingItem.id, payload);
        toast.success('Configuration updated');
        setConfigurations((prev) =>
          prev.map((c) =>
            c.id === editingItem.id
              ? { ...c, label: payload.label, browser: payload.browser, useragent: payload.useragent }
              : c
          )
        );
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Automated Configuration</h1>
              <p className="text-slate-600 dark:text-gray-400">
                {selectedProject
                  ? `Configurations for ${selectedProject.name}`
                  : 'Manage automated test configurations per project (browser, user agent).'}
              </p>
            </div>
          </div>
          {selectedProject && (
            <Button size="sm" onClick={openCreate} icon={Plus}>
              Add configuration
            </Button>
          )}
        </div>

        {!selectedProject && (
          <Card className="p-8 text-center">
            <div className="text-slate-600 dark:text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No project selected</p>
              <p className="text-sm">Please select a project from the sidebar to view its automated configurations.</p>
            </div>
          </Card>
        )}

        {selectedProject && (
          <Card className="overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                <Loader className="w-6 h-6 text-cyan-600 dark:text-cyan-400 animate-spin" />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">ID</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">Label</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">Browser</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">User agent</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configurations.map((config) => (
                    <tr
                      key={config.id}
                      className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-6 text-sm text-slate-700 dark:text-gray-300 font-mono">#{config.id}</td>
                      <td className="py-3 px-6 text-sm font-medium text-slate-900 dark:text-white">{config.label}</td>
                      <td className="py-3 px-6 text-sm text-slate-600 dark:text-gray-400 max-w-xs truncate" title={config.browser ?? undefined}>
                        {config.browser || '—'}
                      </td>
                      <td className="py-3 px-6 text-sm text-slate-600 dark:text-gray-400 max-w-md truncate" title={config.useragent ?? undefined}>
                        {config.useragent || '—'}
                      </td>
                      <td className="py-3 px-6">
                        <button
                          type="button"
                          onClick={() => openEdit(config)}
                          className="p-2 text-slate-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit configuration"
                        >
                          <SquarePen className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && configurations.length === 0 && (
              <div className="p-12 text-center">
                <Bot className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-gray-400">No automated configurations for this project</p>
                <p className="text-sm text-slate-500 dark:text-gray-500 mt-1">Click &quot;Add configuration&quot; to create one.</p>
              </div>
            )}
          </Card>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? 'Create automated configuration' : 'Edit automated configuration'}
        size="md"
      >
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
              <option value="">— Select browser —</option>
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
                  if (userAgentOptionsLoading) return 'Loading…';
                  if (!selectedProject?.gitlab_project_name) return 'Configure GitLab in Settings first';
                  return '— Select user agent —';
                })()}
              </option>
              {userAgentOptions.map((ua) => (
                <option key={ua} value={ua}>
                  {ua.length > 80 ? `${ua.slice(0, 80)}…` : ua}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : modalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AutomatedConfiguration;
