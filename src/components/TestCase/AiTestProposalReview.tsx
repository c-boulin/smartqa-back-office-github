import React, { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, X } from 'lucide-react';
import { AiCommitCounts, AiTestProposal } from '../../services/aiTestProposal';
import { aiPriorityLabel } from './aiTestCaseDraft';

interface Props {
  proposal: AiTestProposal;
  sentPrompt: string;
  commit: (ids: string[], signal: AbortSignal) => Promise<AiCommitCounts>;
  onCommitted: (counts: AiCommitCounts) => void;
  onStartOver: () => void;
}

const PriorityBadge = ({ priority }: { priority: string | number | null | undefined }) => {
  const label = aiPriorityLabel(priority);
  const color = label === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' : label === 'Low' ? 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300';
  return <span data-mipqa="ai-priority-badge" className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${color}`}>{label}</span>;
};

const AiTestProposalReview: React.FC<Props> = ({ proposal, sentPrompt, commit, onCommitted, onStartOver }) => {
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [viewId, setViewId] = useState<string | null>(null);
  const lockedRef = useRef(false);
  const remainingIds = proposal.testCases.filter(item => !addedIds.includes(item.tempId)).map(item => item.tempId);
  const viewed = proposal.testCases.find(item => item.tempId === viewId);
  const scenarios = proposal.testCases.reduce((sum, item) => sum + item.stepResults.length, 0);
  const insertion = useMutation({
    retry: false,
    mutationFn: (ids: string[]) => commit(ids, new AbortController().signal),
    onSuccess: (counts, ids) => {
      setAddedIds(previous => [...previous, ...ids]);
      lockedRef.current = false;
      onCommitted(counts);
    },
    onError: () => { lockedRef.current = false; },
  });
  const add = (ids: string[]) => {
    const pending = ids.filter(id => remainingIds.includes(id));
    if (lockedRef.current || !pending.length) return;
    lockedRef.current = true;
    insertion.mutate(pending);
  };

  return (
    <section data-mipqa="ai-proposal-review" className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
        <div className="min-w-0 flex-1 space-y-8 p-6 sm:p-8">
          <div className="flex justify-end"><p data-mipqa="ai-sent-prompt-bubble" className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-slate-200 px-5 py-4 text-sm leading-relaxed dark:bg-slate-700">{sentPrompt}</p></div>
          <div className="flex items-start gap-3 pt-4 text-sm leading-relaxed"><Sparkles className="mt-1 h-4 w-4 shrink-0 text-pink-600 dark:text-pink-400" /><p data-mipqa="ai-generated-summary">We have generated <strong>{proposal.testCases.length} test cases</strong> across {scenarios} scenarios, you can generate results once you have saved these test cases to your repository.</p></div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <table data-mipqa="ai-proposal-table" className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 dark:text-slate-400"><tr><th scope="col" className="px-4 py-4 font-medium">NAME</th><th scope="col" className="px-3 py-4 font-medium">PRIORITY</th><th scope="col" className="px-3 py-4"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{proposal.testCases.map(item => {
                const added = addedIds.includes(item.tempId);
                return <tr key={item.tempId} data-mipqa="ai-proposed-testcase-row" className={`border-t border-slate-200 dark:border-slate-700 ${viewId === item.tempId ? 'bg-cyan-50 dark:bg-cyan-900/25' : ''}`}>
                  <td className="min-w-32 break-words px-4 py-4 font-medium">{item.title}</td>
                  <td className="px-3 py-4"><PriorityBadge priority={item.priority} /></td>
                  <td className="px-3 py-4"><div className="flex justify-end gap-4"><button type="button" data-mipqa="ai-testcase-view-button" aria-label={`View ${item.title}`} aria-expanded={viewId === item.tempId} aria-controls="ai-testcase-detail" onClick={() => setViewId(item.tempId)} className="rounded px-1 py-1 text-xs hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500">View</button><button type="button" data-mipqa="ai-testcase-add-button" aria-label={`Add ${item.title}`} disabled={added || insertion.isPending} onClick={() => add([item.tempId])} className="rounded px-1 py-1 text-xs font-medium text-pink-700 hover:underline disabled:opacity-50 dark:text-pink-400">{added ? 'Added' : 'Add'}</button></div></td>
                </tr>;
              })}</tbody>
            </table>
            {!proposal.testCases.length && <p className="p-6 text-sm text-slate-600 dark:text-slate-300">No test cases were generated.</p>}
          </div>
          {insertion.isError && <p role="alert" data-mipqa="ai-commit-error" className="text-sm text-red-700 dark:text-red-300">Could not add the test cases. Please try again.</p>}
          {insertion.isPending && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">Adding test cases to your project…</p>}
        </div>
        {viewed && <aside id="ai-testcase-detail" aria-labelledby="ai-detail-heading" data-mipqa="ai-testcase-detail-panel" className="w-full shrink-0 space-y-6 border-t border-slate-200 p-6 dark:border-slate-700 lg:w-[360px] lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between"><h3 id="ai-detail-heading" className="text-xs font-semibold tracking-wide">TEST CASE DETAIL</h3><button type="button" data-mipqa="ai-detail-close-button" aria-label="Close test case details" onClick={() => setViewId(null)} className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div>
          <h4 className="break-words text-xl font-semibold leading-tight">{viewed.title}</h4>
          <div className="grid grid-cols-2 gap-4 text-sm"><div><p className="mb-2">Priority</p><PriorityBadge priority={viewed.priority} /></div><div><p className="mb-2">State</p><span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-500/15 dark:text-green-300">Active</span></div></div>
          <div className="text-sm"><p className="mb-2">Type of test case</p><span className="rounded-full bg-cyan-100 px-2 py-1 text-xs text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300">Functional</span></div>
          <div className="space-y-2 text-sm leading-relaxed"><h5 className="font-semibold">Description</h5><p className="whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">{viewed.description || 'No description provided.'}</p></div>
          <div className="space-y-2 text-sm leading-relaxed"><h5 className="font-semibold">Preconditions</h5><p className="whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">{viewed.preconditions || 'None'}</p></div>
          <div className="space-y-3 text-sm leading-relaxed"><h5 className="font-semibold">Steps</h5><ol className="space-y-4">{viewed.stepResults.map((step, index) => <li key={index} data-mipqa="ai-detail-step" className="border-b border-slate-200 pb-4 dark:border-slate-700"><p className="whitespace-pre-wrap break-words"><span className="font-medium">{index + 1}. </span>{step.step}</p><p className="mt-2 whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300"><span className="font-medium">Expected result: </span>{step.result}</p></li>)}</ol></div>
          <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-700"><button type="button" data-mipqa="ai-detail-add-button" disabled={insertion.isPending || addedIds.includes(viewed.tempId)} onClick={() => add([viewed.tempId])} className="rounded-lg border border-cyan-600 px-5 py-2 text-sm font-medium text-cyan-800 hover:bg-cyan-50 disabled:opacity-50 dark:text-cyan-300 dark:hover:bg-cyan-950">{addedIds.includes(viewed.tempId) ? 'Added' : 'Add Test Case'}</button></div>
        </aside>}
      </div>
      <footer className="flex shrink-0 flex-wrap justify-end gap-4 border-t border-slate-200 bg-slate-100 px-6 py-5 dark:border-slate-700 dark:bg-slate-800">
        <button type="button" data-mipqa="ai-start-over-button" disabled={insertion.isPending} onClick={onStartOver} className="rounded-lg border border-slate-400 px-6 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-50 dark:hover:bg-slate-700">Start Over</button>
        <button type="button" data-mipqa="ai-add-remaining-button" disabled={insertion.isPending || !remainingIds.length} onClick={() => add(remainingIds)} className="rounded-lg border border-pink-500 bg-pink-700 px-6 py-2 text-sm font-medium text-white hover:bg-pink-800 disabled:opacity-50">Add {remainingIds.length} test cases</button>
      </footer>
    </section>
  );
};

export default AiTestProposalReview;
