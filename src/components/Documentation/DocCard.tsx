import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { DocSection } from '../../data/documentationData';
import { COLOR_MAP } from '../../data/documentationData';

interface DocCardProps {
  section: DocSection;
}

const DocCard: React.FC<DocCardProps> = ({ section }) => {
  const navigate = useNavigate();
  const colors = COLOR_MAP[section.color];
  const Icon = section.icon;

  return (
    <button
      type="button"
      onClick={() => navigate(`/documentation/${section.id}`)}
      data-mipqa={`doc-card-${section.id}-button`}
      className={`
        group w-full text-left rounded-2xl border bg-white dark:bg-slate-800/60
        ${colors.border} dark:border-slate-700/60
        p-6 flex flex-col gap-4
        hover:shadow-lg hover:-translate-y-0.5
        transition-all duration-200 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-cyan-500/40
      `}
    >
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.iconBg} transition-colors group-hover:scale-105 duration-200`}>
        <Icon className={`w-6 h-6 ${colors.text}`} />
      </div>

      {/* Text */}
      <div className="flex-1 flex flex-col gap-1">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">
          {section.title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {section.description}
        </p>
      </div>

      {/* CTA */}
      <div className={`flex items-center gap-1.5 text-sm font-medium ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
        <span>Read more</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
      </div>
    </button>
  );
};

export default DocCard;
