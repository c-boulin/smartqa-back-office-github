import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, SquarePen, Trash2, Copy,
  ChevronLeft, ChevronRight, Loader,
  MoreVertical, ChevronDown, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import { categoriesApiService, Category } from '../services/categoriesApi';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTemplates } from '../hooks/useTemplates';
import { Project } from '../types';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../utils/permissions';
import PermissionGuard from '../components/PermissionGuard';
import CreateTemplateModal, { CreateTemplateFormData } from '../components/Project/CreateTemplateModal';
import ProjectTitle from '../components/Project/ProjectTitle';
import SearchAutocomplete, { Suggestion } from '../components/UI/SearchAutocomplete';

/* ------------------------------------------------------------------ */
/* TemplateFormModal                                                    */
/* ------------------------------------------------------------------ */

const EditTemplateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; categoryIri: string; categoryName: string }) => void;
  initialData: { name: string; description: string; categoryIri: string; categoryName: string };
  isSubmitting: boolean;
}> = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
  const [form, setForm] = useState(initialData);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  useEffect(() => { if (isOpen) setForm(initialData); }, [isOpen, initialData.name, initialData.description, initialData.categoryIri]);

  useEffect(() => {
    if (isOpen && categories.length === 0) {
      setCategoriesLoading(true);
      categoriesApiService.getCategories().then(setCategories).finally(() => setCategoriesLoading(false));
    }
  }, [isOpen, categories.length]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (form.name.trim()) onSubmit(form); };

  const inputCls = 'w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isSubmitting ? onClose : undefined} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Template</h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Template name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Enter template name"
              disabled={isSubmitting}
              className={inputCls}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={form.categoryIri}
              onChange={e => {
                const selected = categories.find(c => c.iri === e.target.value);
                setForm(f => ({ ...f, categoryIri: e.target.value, categoryName: selected?.name ?? '' }));
              }}
              disabled={isSubmitting || categoriesLoading}
              className={inputCls}
            >
              <option value="">{categoriesLoading ? 'Loading categories…' : 'Select a category'}</option>
              {categories.map(c => <option key={c.iri} value={c.iri}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              disabled={isSubmitting}
              placeholder="Enter template description"
              className={`${inputCls} resize-none`}
            />
          </div>
        </form>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || !form.name.trim()} onClick={handleSubmit} className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2 shadow-md shadow-cyan-500/20">
            {isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Updating…' : 'Update template'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* CloneTemplateModal                                                   */
/* ------------------------------------------------------------------ */

const CloneTemplateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  templateData: { name: string; description: string };
  setTemplateData: (data: { name: string; description: string }) => void;
  isSubmitting: boolean;
}> = ({ isOpen, onClose, onSubmit, title, templateData, setTemplateData, isSubmitting }) => {
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(); };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Template Name *
          </label>
          <input
            type="text"
            value={templateData.name}
            onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            required disabled={isSubmitting}
            placeholder="Enter template name" autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">Description</label>
          <textarea
            value={templateData.description}
            onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={isSubmitting} placeholder="Enter description"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <><Loader className="w-4 h-4 mr-2 animate-spin" />Duplicating...</> : 'Duplicate'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* TemplateActionMenu                                                   */
/* ------------------------------------------------------------------ */

const TemplateActionMenu: React.FC<{
  template: Project;
  onDuplicate: (t: Project) => void;
  onDelete: (t: Project) => void;
  canCreate: boolean;
  canDelete: boolean;
  disabled: boolean;
}> = ({ template, onDuplicate, onDelete, canCreate, canDelete, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setIsOpen(v => !v);
  };

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  if (!canCreate && !canDelete) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        disabled={disabled}
        className="p-2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {isOpen && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1"
        >
          {canCreate && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDuplicate(template); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
            >
              <Copy className="w-4 h-4 text-slate-400 dark:text-gray-400" />
              Duplicate Template
            </button>
          )}
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDelete(template); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Template
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* SortDropdown                                                         */
/* ------------------------------------------------------------------ */

const SortDropdown: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all"
      >
        <span>{selected?.label ?? 'Sort'}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                opt.value === value
                  ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20'
                  : 'text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* ViewDropdown (All Template / My Templates)                          */
/* ------------------------------------------------------------------ */

const ViewDropdown: React.FC<{
  value: 'all' | 'my-templates';
  onChange: (v: 'all' | 'my-templates') => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = value === 'all' ? 'All Template' : 'My Templates';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all"
      >
        <span>{label}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
          {(['all', 'my-templates'] as const).map(v => (
            <button
              key={v}
              onClick={() => { onChange(v); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                v === value
                  ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20'
                  : 'text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              {v === 'all' ? 'All Template' : 'My Templates'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Main page                                                            */
/* ------------------------------------------------------------------ */

const Templates: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const { state: authState } = useAuth();
  const { hasPermission } = usePermissions();
  const hasFetchedRef = useRef(false);

  const hasAnyAction = hasPermission(PERMISSIONS.TEMPLATE.UPDATE) ||
                       hasPermission(PERMISSIONS.TEMPLATE.DELETE) ||
                       hasPermission(PERMISSIONS.TEMPLATE.CREATE);

  const {
    templates, loading, error, pagination,
    fetchTemplates, searchTemplates,
    fetchTemplatesCreatedByUser, searchTemplatesCreatedByUser,
    fetchTemplatesWithSort, cloneTemplate,
    createTemplate, updateTemplate, deleteTemplate
  } = useTemplates();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'my-templates'>('all');
  const [sortBy, setSortBy] = useState('createdAt-desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToManage, setTemplateToManage] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', categoryIri: '', categoryName: '' });

  const templateNameSuggestions = useMemo<Suggestion[]>(() =>
    templates
      .filter(t => t.name)
      .map(t => ({ label: t.name, country: t.country ?? undefined, type: t.project_type ?? undefined })),
    [templates]
  );

  const SORT_OPTIONS = useMemo(() => [
    { value: 'createdAt-desc', label: 'Creation date (New/Old)', param: 'order[createdAt]=desc' },
    { value: 'createdAt-asc',  label: 'Creation date (Old/New)', param: 'order[createdAt]=asc' },
    { value: 'id-asc',         label: 'ID (Ascending)',          param: 'order[id]=asc' },
    { value: 'id-desc',        label: 'ID (Descending)',         param: 'order[id]=desc' },
    { value: 'updatedAt-desc', label: 'Last Modified',           param: 'order[updatedAt]=desc' },
    { value: 'title-asc',      label: 'Title (A-Z)',             param: 'order[title]=asc' },
    { value: 'title-desc',     label: 'Title (Z-A)',             param: 'order[title]=desc' },
  ], []);

  const handleSearch = useCallback(async (term: string) => {
    setCurrentSearchTerm(term);
    const sortOption = SORT_OPTIONS.find(o => o.value === sortBy);
    if (term.trim()) {
      if (filterMode === 'my-templates') {
        await searchTemplatesCreatedByUser(term, authState.user?.id?.toString() || '', 1, sortOption?.param);
      } else {
        await searchTemplates(term, 1, sortOption?.param);
      }
    } else {
      await handleFilterChange(filterMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTemplates, searchTemplatesCreatedByUser, filterMode, sortBy]);

  const handleFilterChange = useCallback(async (mode: 'all' | 'my-templates') => {
    setFilterMode(mode);
    setSearchTerm('');
    setCurrentSearchTerm('');
    const sortOption = SORT_OPTIONS.find(o => o.value === sortBy);
    if (mode === 'my-templates') {
      await fetchTemplatesCreatedByUser(authState.user?.id?.toString() || '', 1, sortOption?.param);
    } else {
      await fetchTemplatesWithSort(1, sortOption?.param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTemplatesCreatedByUser, fetchTemplatesWithSort, sortBy, authState]);

  const handleSortChange = useCallback(async (newSortBy: string) => {
    setSortBy(newSortBy);
    const sortOption = SORT_OPTIONS.find(o => o.value === newSortBy);
    if (currentSearchTerm.trim()) {
      if (filterMode === 'my-templates') {
        await searchTemplatesCreatedByUser(currentSearchTerm, authState.user?.id?.toString() || '', 1, sortOption?.param);
      } else {
        await searchTemplates(currentSearchTerm, 1, sortOption?.param);
      }
    } else {
      if (filterMode === 'my-templates') {
        await fetchTemplatesCreatedByUser(authState.user?.id?.toString() || '', 1, sortOption?.param);
      } else {
        await fetchTemplatesWithSort(1, sortOption?.param);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTemplates, searchTemplatesCreatedByUser, fetchTemplatesCreatedByUser, fetchTemplatesWithSort, currentSearchTerm, filterMode]);

  const handleCreateTemplate = useCallback(async (data: CreateTemplateFormData) => {
    try {
      setIsSubmitting(true);
      await createTemplate({
        name: data.name,
        description: data.description,
        country: data.country || undefined,
        url: data.url || undefined,
        categoryIri: data.categoryIri || undefined,
        categoryName: data.categoryName || undefined,
        projectTypeIri: data.projectTypeIri || undefined,
      });
      setIsCreateModalOpen(false);
    } catch { /* handled in hook */ } finally { setIsSubmitting(false); }
  }, [createTemplate]);

  const handleEditTemplate = useCallback(async (data: { name: string; description: string; categoryIri: string; categoryName: string }) => {
    if (!templateToManage) return;
    try {
      setIsSubmitting(true);
      await updateTemplate(templateToManage.id, data);
      setIsEditModalOpen(false);
      setTemplateToManage(null);
      setFormData({ name: '', description: '', categoryIri: '', categoryName: '' });
    } catch { /* handled in hook */ } finally { setIsSubmitting(false); }
  }, [updateTemplate, templateToManage]);

  const handleCloneTemplate = useCallback(async () => {
    if (!templateToManage) return;
    try {
      setIsSubmitting(true);
      await cloneTemplate(templateToManage.id, {
        title: formData.name,
        description: formData.description,
        category: templateToManage.category ?? undefined,
        categoryIri: templateToManage.categoryIri ?? undefined,
        country: templateToManage.country ?? undefined,
        project_type: templateToManage.project_type ?? undefined,
        projectTypeIri: templateToManage.projectTypeIri ?? undefined,
        testCasesCount: templateToManage.testCasesCount,
      });
    } catch (err) {
      console.error('Error cloning template:', err);
    } finally {
      setIsSubmitting(false);
      setIsCloneModalOpen(false);
      setTemplateToManage(null);
      setFormData({ name: '', description: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloneTemplate, templateToManage, formData]);

  const handleDeleteTemplate = useCallback(async () => {
    if (!templateToManage) return;
    try {
      setIsSubmitting(true);
      await deleteTemplate(templateToManage.id);
      setTemplateToManage(null);
    } catch { /* handled in hook */ } finally { setIsSubmitting(false); }
  }, [deleteTemplate, templateToManage]);

  const openEditModal   = useCallback((t: Project) => { setTemplateToManage(t); setFormData({ name: t.name, description: t.description, categoryIri: t.categoryIri ?? '', categoryName: t.category ?? '' }); setIsEditModalOpen(true); }, []);
  const openCloneModal  = useCallback((t: Project) => { setTemplateToManage(t); setFormData({ name: `${t.name} (copy)`, description: t.description, categoryIri: t.categoryIri ?? '', categoryName: t.category ?? '' }); setIsCloneModalOpen(true); }, []);
  const openDeleteDialog = useCallback((t: Project) => { setTemplateToManage(t); setIsDeleteDialogOpen(true); }, []);

  const handlePageChange = useCallback((page: number) => {
    const sortOption = SORT_OPTIONS.find(o => o.value === sortBy);
    if (currentSearchTerm.trim()) {
      if (filterMode === 'my-templates') {
        searchTemplatesCreatedByUser(currentSearchTerm, authState.user?.id?.toString() || '', page, sortOption?.param);
      } else {
        searchTemplates(currentSearchTerm, page, sortOption?.param);
      }
    } else {
      if (filterMode === 'my-templates') {
        fetchTemplatesCreatedByUser(authState.user?.id?.toString() || '', page, sortOption?.param);
      } else {
        fetchTemplatesWithSort(page, sortOption?.param);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSearchTerm, filterMode, sortBy, searchTemplates, searchTemplatesCreatedByUser, fetchTemplatesCreatedByUser, fetchTemplatesWithSort]);

  const handleTemplateClick = useCallback((template: Project) => {
    dispatch({ type: 'SET_NAVIGATING_TO_PROJECT', payload: true });
    dispatch({ type: 'SET_TEMPLATE_MODE', payload: true });
    dispatch({ type: 'UPDATE_PROJECT', payload: template });
    dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: template.id });
    setTimeout(() => { toast.success(`Selected template: ${template.name}`); navigate('/test-cases', { state: { from: 'templates' } }); }, 50);
  }, [dispatch, navigate]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    const sortOption = SORT_OPTIONS.find(o => o.value === sortBy);
    fetchTemplatesWithSort(1, sortOption?.param);
    hasFetchedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-600 dark:text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-gray-400">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error && templates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="p-8 text-center bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load templates</p>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={() => fetchTemplates(1)}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Templates</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
          Manage reusable testing templates ({pagination.totalItems} total)
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <SearchAutocomplete
              data-mipqa="templates-search-input"
              value={searchTerm}
              onChange={setSearchTerm}
              onSearch={handleSearch}
              suggestions={templateNameSuggestions}
              placeholder="Search for template..."
            />
          </div>

          {/* View filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">View</span>
            <ViewDropdown value={filterMode} onChange={handleFilterChange} />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">Sort by</span>
            <SortDropdown
              value={sortBy}
              options={SORT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              onChange={handleSortChange}
            />
          </div>
        </div>

        <PermissionGuard permission={PERMISSIONS.TEMPLATE.CREATE}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create new template
          </button>
        </PermissionGuard>
      </div>

      {/* Active filters chips */}
      {(currentSearchTerm || filterMode !== 'all') && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-gray-400">Active filters:</span>
          {currentSearchTerm && (
            <span className="inline-flex items-center px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-600 dark:text-cyan-400">
              Search: &ldquo;{currentSearchTerm}&rdquo;
            </span>
          )}
          {filterMode !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-600 dark:text-blue-400">
              My Templates
            </span>
          )}
          <button
            onClick={() => { setSearchTerm(''); setCurrentSearchTerm(''); setFilterMode('all'); setSortBy('createdAt-desc'); fetchTemplatesWithSort(1, SORT_OPTIONS.find(o => o.value === 'createdAt-desc')?.param); }}
            className="text-xs text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Table */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 rounded-2xl">
            <Loader className="w-6 h-6 text-cyan-600 dark:text-cyan-400 animate-spin" />
          </div>
        )}

        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm">
          <div className="overflow-x-auto overflow-y-visible rounded-2xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60">
                  <th className="text-left py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500 w-20">
                    ID
                  </th>
                  <th className="text-left py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500">
                    Template Name
                  </th>
                  <th className="text-center py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500 w-36">
                    Test Case
                  </th>
                  {hasAnyAction && (
                    <th className="text-right py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500 w-28">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {templates.map((template) => (
                    <tr
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    >
                      {/* ID */}
                      <td className="py-4 px-6 text-sm font-mono text-slate-500 dark:text-gray-400 align-middle">
                        #{template.id || 'N/A'}
                      </td>

                      {/* Template Name */}
                      <td className="py-4 px-6 align-middle">
                        <ProjectTitle
                          project={template}
                          nameClassName="group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors"
                          categoryAndTitleOnly
                        />
                        {template.description && (
                          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                            {template.description}
                          </p>
                        )}
                      </td>

                      {/* Test Case count */}
                      <td className="py-4 px-6 text-center align-middle">
                        <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                          {template.testCasesCount} Test cases
                        </span>
                      </td>

                      {/* Actions */}
                      {hasAnyAction && (
                        <td className="py-4 px-6 align-middle">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {hasPermission(PERMISSIONS.TEMPLATE.UPDATE) && (
                              <button
                                onClick={() => openEditModal(template)}
                                className="p-2 text-slate-400 dark:text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Edit"
                                disabled={isSubmitting}
                              >
                                <SquarePen className="w-4 h-4" />
                              </button>
                            )}
                            <TemplateActionMenu
                              template={template}
                              onDuplicate={openCloneModal}
                              onDelete={openDeleteDialog}
                              canCreate={hasPermission(PERMISSIONS.TEMPLATE.CREATE)}
                              canDelete={hasPermission(PERMISSIONS.TEMPLATE.DELETE)}
                              disabled={isSubmitting}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                ))}
              </tbody>
            </table>

            {templates.length === 0 && !loading && (
              <div className="text-center py-16">
                <Search className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-gray-600" />
                <p className="text-lg font-medium text-slate-500 dark:text-gray-400">No templates found</p>
                <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">
                  {currentSearchTerm || filterMode !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Create your first template to get started.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-500 dark:text-gray-400">
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
              {pagination.totalItems} templates
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="secondary" size="sm" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1 || loading} icon={ChevronLeft}>
                Previous
              </Button>
              <span className="text-sm text-slate-500 dark:text-gray-400">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button variant="secondary" size="sm" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages || loading} icon={ChevronRight}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateTemplateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateTemplate} />
      <EditTemplateModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditTemplate} initialData={formData} isSubmitting={isSubmitting} />
      <CloneTemplateModal isOpen={isCloneModalOpen} onClose={() => setIsCloneModalOpen(false)} onSubmit={handleCloneTemplate} title="Clone Template" templateData={formData} setTemplateData={(d) => setFormData(f => ({ ...f, ...d }))} isSubmitting={isSubmitting} />
      <ConfirmDialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} onConfirm={handleDeleteTemplate} title="Delete Template" message={`Are you sure you want to delete the template "${templateToManage?.name}"? This action is irreversible and will delete all associated test cases and data.`} confirmText="Delete" variant="danger" />
    </div>
  );
};

export default Templates;
