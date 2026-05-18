import React, { useState, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { DOC_SECTIONS } from '../data/documentationData';
import DocSearchBar from '../components/Documentation/DocSearchBar';
import DocCard from '../components/Documentation/DocCard';

const Documentation: React.FC = () => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return DOC_SECTIONS;
    return DOC_SECTIONS.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="min-h-screen" data-mipqa="documentation-page">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-700/50 mb-8 shadow-xl">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative px-8 py-12 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center shadow-lg mb-1">
            <BookOpen className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 mb-2">
              Smart QA Help Center
            </p>
            <h1
              className="text-3xl font-bold text-white mb-3"
              data-mipqa="documentation-title"
            >
              Documentation
            </h1>
            <p className="text-slate-300 max-w-xl mx-auto text-base leading-relaxed">
              Learn how to use SMARTQA, from project setup to execution, reporting, and automation.
            </p>
          </div>

          <DocSearchBar
            value={search}
            onChange={setSearch}
            className="w-full max-w-lg mt-2"
          />
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length > 0 ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          data-mipqa="documentation-cards-grid"
        >
          {filtered.map(section => (
            <DocCard key={section.id} section={section} />
          ))}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center py-20 gap-3"
          data-mipqa="documentation-empty-state"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            No results for &ldquo;{search}&rdquo;
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-xs">
            Try different keywords or clear the search.
          </p>
        </div>
      )}
    </div>
  );
};

export default Documentation;
