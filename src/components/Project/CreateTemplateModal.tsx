import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { categoriesApiService, Category } from '../../services/categoriesApi';

export interface CreateTemplateFormData {
  name: string;
  country: string;
  projectTypeIri: string;
  categoryIri: string;
  categoryName: string;
  description: string;
  url: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTemplateFormData) => Promise<void>;
}

const INITIAL_FORM: CreateTemplateFormData = {
  name: '',
  country: '',
  projectTypeIri: '',
  categoryIri: '',
  categoryName: '',
  description: '',
  url: '',
};

const CreateTemplateModal: React.FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = useState<CreateTemplateFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateTemplateFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_FORM);
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && categories.length === 0) {
      setCategoriesLoading(true);
      categoriesApiService.getCategories()
        .then(setCategories)
        .finally(() => setCategoriesLoading(false));
    }
  }, [isOpen, categories.length]);

  const set = <K extends keyof CreateTemplateFormData>(key: K, value: CreateTemplateFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Template name is required';
    if (!form.categoryIri) next.categoryIri = 'Category is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = form.name.trim() && form.categoryIri;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!submitting ? onClose : undefined} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create new template</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          <Field label="Template name" required error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Masterchef"
              disabled={submitting}
              className={inputCls(!!errors.name)}
              autoFocus
            />
          </Field>

          <Field label="Category" required error={errors.categoryIri}>
            <select
              value={form.categoryIri}
              onChange={e => {
                const selected = categories.find(c => c.iri === e.target.value);
                setForm(f => ({ ...f, categoryIri: e.target.value, categoryName: selected?.name ?? '' }));
                setErrors(err => { const n = { ...err }; delete n.categoryIri; return n; });
              }}
              disabled={submitting || categoriesLoading}
              className={inputCls(!!errors.categoryIri)}
            >
              <option value="">
                {categoriesLoading ? 'Loading categories…' : 'Select a category'}
              </option>
              {categories.map(c => (
                <option key={c.iri} value={c.iri}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Description" required error={errors.description}>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              disabled={submitting}
              placeholder="A short summary, e.g. MasterChef Brazil episodes, recipes & exclusive content."
              className={`${inputCls(false)} resize-none`}
            />
          </Field>

        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !isFormValid}
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2 shadow-md shadow-cyan-500/20"
          >
            {submitting && <Loader className="w-4 h-4 animate-spin" />}
            {submitting ? 'Creating…' : 'Create template'}
          </button>
        </div>
      </div>
    </div>
  );
};

const inputCls = (hasError: boolean) =>
  `w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors ${
    hasError
      ? 'border-red-400 dark:border-red-500'
      : 'border-slate-300 dark:border-slate-600'
  }`;

const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

export default CreateTemplateModal;
