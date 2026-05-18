import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DOC_SECTIONS, COLOR_MAP } from '../../data/documentationData';

interface DocSideNavProps {
  activeId: string;
}

const DocSideNav: React.FC<DocSideNavProps> = ({ activeId }) => {
  const navigate = useNavigate();

  return (
    <nav
      data-mipqa="doc-side-nav"
      className="w-64 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto"
    >
      <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-3 shadow-sm">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Contents
        </p>
        <ul className="space-y-0.5">
          {DOC_SECTIONS.map((section) => {
            const isActive = section.id === activeId;
            const colors = COLOR_MAP[section.color];
            const Icon = section.icon;

            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/documentation/${section.id}`)}
                  data-mipqa={`doc-side-nav-${section.id}-link`}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium
                    transition-all duration-150
                    ${isActive
                      ? `${colors.bg} ${colors.text} border ${colors.border}`
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? colors.text : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="truncate leading-tight">{section.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default DocSideNav;
