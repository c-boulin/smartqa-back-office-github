import React, { useState, useEffect } from 'react';
import { X, Loader, ChevronDown } from 'lucide-react';
import { COUNTRY_CODES_ALPHA2 } from '../../constants/countryCodes';
import { Project } from '../../types';
import { categoriesApiService, Category } from '../../services/categoriesApi';
import { HARDCODED_PROJECT_TYPES, ProjectType } from '../../services/projectTypesApi';

const WW_OPTION = { code: 'WW', name: 'WW (Worldwide)' };
const ALL_COUNTRIES = [WW_OPTION, ...COUNTRY_CODES_ALPHA2];

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface CreateProjectFormData {
  name: string;
  country: string;
  projectTypeIri: string;
  categoryIri: string;
  categoryName: string;
  description: string;
  url: string;
  startFrom: 'blank' | 'template';
  templateId: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectFormData) => Promise<void>;
  templates: Project[];
  templatesLoading: boolean;
}

const INITIAL_FORM: CreateProjectFormData = {
  name: '',
  country: '',
  projectTypeIri: '',
  categoryIri: '',
  categoryName: '',
  description: '',
  url: '',
  startFrom: 'blank',
  templateId: '',
};

const CreateProjectModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, templates, templatesLoading }) => {
  const [form, setForm] = useState<CreateProjectFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateProjectFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const projectTypes = HARDCODED_PROJECT_TYPES;

  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_FORM);
      setErrors({});
      setCountrySearch('');
      setCountryOpen(false);
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


  // Reset templateId when switching back to blank
  useEffect(() => {
    if (form.startFrom === 'blank') {
      setForm(f => ({ ...f, templateId: '' }));
      setErrors(e => { const n = { ...e }; delete n.templateId; return n; });
    }
  }, [form.startFrom]);

  const filteredCountries = ALL_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountry = ALL_COUNTRIES.find(c => c.code === form.country);

  const set = <K extends keyof CreateProjectFormData>(key: K, value: CreateProjectFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Project name is required';
    if (!form.country) next.country = 'Country is required';
    if (!form.projectTypeIri) next.projectTypeIri = 'Type is required';
    if (!form.categoryIri) next.categoryIri = 'Category is required';
    if (!form.startFrom) next.startFrom = 'Start from is required';
    if (form.startFrom === 'template' && !form.templateId) next.templateId = 'Please select a template';
    if (form.url.trim() && !isValidUrl(form.url.trim())) next.url = 'Must be a valid URL (e.g. https://example.com)';
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

  const isFormValid =
    form.name.trim() &&
    form.country &&
    form.projectTypeIri &&
    form.categoryIri &&
    (form.startFrom === 'blank' || (form.startFrom === 'template' && form.templateId)) &&
    (!form.url.trim() || isValidUrl(form.url.trim()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!submitting ? onClose : undefined} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create new project</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          <Field label="Project name" required error={errors.name}>
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

          <Field label="Country" required error={errors.country}>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setCountryOpen(o => !o); setCountrySearch(''); }}
                disabled={submitting}
                className={`${inputCls(!!errors.country)} flex items-center justify-between text-left`}
              >
                <span className={selectedCountry ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}>
                  {selectedCountry ? `${selectedCountry.code === 'WW' ? '' : selectedCountry.code + ' – '}${selectedCountry.name}` : 'Select a country'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${countryOpen ? 'rotate-180' : ''}`} />
              </button>
              {countryOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl">
                  <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={e => setCountrySearch(e.target.value)}
                      placeholder="Search countries..."
                      className="w-full px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      autoFocus
                    />
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {filteredCountries.length === 0 && (
                      <li className="px-4 py-2 text-sm text-slate-400">No results</li>
                    )}
                    {filteredCountries.map(c => (
                      <li key={c.code}>
                        <button
                          type="button"
                          onClick={() => { set('country', c.code); setCountryOpen(false); }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                            form.country === c.code
                              ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className="w-3.5 text-xs font-mono text-slate-400 dark:text-slate-500">{c.code !== 'WW' ? c.code : ''}</span>
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Field>

          <Field label="Type" required error={errors.projectTypeIri}>
            <div className="flex flex-wrap gap-4">
              {projectTypes.map(t => (
                <label key={t.id} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="project-type"
                    value={t.id}
                    checked={form.projectTypeIri === t.id}
                    onChange={() => set('projectTypeIri', t.id)}
                    disabled={submitting}
                    className="accent-cyan-500 w-4 h-4"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{t.name}</span>
                </label>
              ))}
            </div>
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

          <Field label="Description" error={errors.description}>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              disabled={submitting}
              placeholder="A short summary, e.g. MasterChef Brazil episodes, recipes & exclusive content."
              className={`${inputCls(false)} resize-none`}
            />
          </Field>

          <Field label="Start from" required error={errors.startFrom}>
            <div className="flex gap-6">
              {(['blank', 'template'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="start-from"
                    value={opt}
                    checked={form.startFrom === opt}
                    onChange={() => set('startFrom', opt)}
                    disabled={submitting}
                    className="accent-cyan-500 w-4 h-4"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                    {opt === 'blank' ? 'Blank project' : 'Use a template'}
                  </span>
                </label>
              ))}
            </div>
          </Field>

          {form.startFrom === 'template' && (
            <Field label="Choose template" required error={errors.templateId}>
              <select
                value={form.templateId}
                onChange={e => set('templateId', e.target.value)}
                disabled={submitting || templatesLoading}
                className={inputCls(!!errors.templateId)}
              >
                <option value="">
                  {templatesLoading ? 'Loading templates…' : 'Select a template'}
                </option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {templatesLoading && (
                <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                  <Loader className="w-3 h-3 animate-spin" /> Loading templates…
                </p>
              )}
            </Field>
          )}
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
            {submitting ? 'Creating…' : 'Create project'}
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

export default CreateProjectModal;
