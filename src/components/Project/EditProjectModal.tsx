import React, { useState, useEffect } from 'react';
import { X, Loader, Globe, ChevronDown } from 'lucide-react';
import { COUNTRY_CODES_ALPHA2 } from '../../constants/countryCodes';
import { Project } from '../../types';
import { categoriesApiService, Category } from '../../services/categoriesApi';
import { HARDCODED_PROJECT_TYPES, ProjectType } from '../../services/projectTypesApi';

const WW_OPTION = { code: 'WW', name: 'Worldwide' };
const ALL_COUNTRIES = [WW_OPTION, ...COUNTRY_CODES_ALPHA2];

export interface EditProjectFormData {
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
  project: Project | null;
  onClose: () => void;
  onSubmit: (data: EditProjectFormData) => Promise<void>;
}

const EditProjectModal: React.FC<Props> = ({ isOpen, project, onClose, onSubmit }) => {
  const [form, setForm] = useState<EditProjectFormData>({
    name: '', country: '', projectTypeIri: '', categoryIri: '', categoryName: '', description: '', url: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof EditProjectFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const projectTypes = HARDCODED_PROJECT_TYPES;

  useEffect(() => {
    if (isOpen && categories.length === 0) {
      setCategoriesLoading(true);
      categoriesApiService.getCategories()
        .then(setCategories)
        .finally(() => setCategoriesLoading(false));
    }
  }, [isOpen, categories.length]);


  useEffect(() => {
    if (isOpen && project) {
      // Reconcile the stored project type value (which may differ in casing or format)
      // against the hardcoded list, matching case-insensitively.
      const rawType = project.projectTypeIri ?? project.project_type ?? '';
      const matchedType = HARDCODED_PROJECT_TYPES.find(
        t => t.id.toLowerCase() === rawType.toLowerCase() || t.name.toLowerCase() === rawType.toLowerCase()
      );
      setForm({
        name: project.name ?? '',
        country: project.country ?? '',
        projectTypeIri: matchedType ? matchedType.id : rawType,
        categoryIri: project.categoryIri ?? '',
        categoryName: project.category ?? '',
        description: project.description ?? '',
        url: project.url ?? '',
      });
      setErrors({});
      setCountrySearch('');
      setCountryOpen(false);
    }
  }, [isOpen, project]);

  // Once categories load, reconcile the selected categoryIri/categoryName in case the IRI format differs
  useEffect(() => {
    if (!categories.length || !form.categoryIri) return;
    const exact = categories.find(c => c.iri === form.categoryIri);
    if (exact) {
      if (!form.categoryName) setForm(f => ({ ...f, categoryName: exact.name }));
      return;
    }
    // Try matching by numeric ID suffix
    const numericId = form.categoryIri.split('/').pop();
    const byId = categories.find(c => c.id === numericId || c.iri.split('/').pop() === numericId);
    if (byId) setForm(f => ({ ...f, categoryIri: byId.iri, categoryName: byId.name }));
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCountries = ALL_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountry = ALL_COUNTRIES.find(c => c.code === form.country);

  const set = <K extends keyof EditProjectFormData>(key: K, value: EditProjectFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Project name is required';
    if (!form.country) next.country = 'Country is required';
    if (!form.projectTypeIri) next.projectTypeIri = 'Type is required';
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

  const isFormValid =
    form.name.trim() &&
    form.country &&
    form.projectTypeIri &&
    form.categoryIri;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!submitting ? onClose : undefined} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Edit project</h2>
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
                  {selectedCountry
                    ? `${selectedCountry.code} – ${selectedCountry.name}`
                    : 'Select a country'}
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
                          <span className="w-3.5 text-xs font-mono text-slate-400 dark:text-slate-500">{c.code}</span>
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
                    name="edit-project-type"
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
              placeholder="A short summary of this project."
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
            Back
          </button>
          <button
            type="button"
            disabled={submitting || !isFormValid}
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2 shadow-md shadow-cyan-500/20"
          >
            {submitting && <Loader className="w-4 h-4 animate-spin" />}
            {submitting ? 'Saving…' : 'Save'}
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

export default EditProjectModal;
