import React from 'react';
import { BookOpen, Wrench } from 'lucide-react';

const Documentation: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center max-w-md">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 flex items-center justify-center mb-6">
          <BookOpen className="w-10 h-10 text-cyan-600 dark:text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Documentation
        </h1>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-sm font-medium text-amber-600 dark:text-amber-400 mb-4">
          <Wrench className="w-4 h-4" />
          Under construction
        </div>
        <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed">
          The user guide is being prepared and will be available here soon. This section will contain step-by-step instructions and best practices for using SmartQA.
        </p>
      </div>
    </div>
  );
};

export default Documentation;
