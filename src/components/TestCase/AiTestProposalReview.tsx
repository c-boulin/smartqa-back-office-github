import React, { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { AiCommitCounts, AiTestProposal, selectAiProposal } from '../../services/aiTestProposal';

interface Props {
  proposal: AiTestProposal;
  recap: string | null;
  commit: (ids: string[], signal: AbortSignal) => Promise<AiCommitCounts>;
  onCommitted: (counts: AiCommitCounts) => void;
}

const AiTestProposalReview: React.FC<Props> = ({ proposal, recap, commit, onCommitted }) => {
  const [rejectedIds, setRejectedIds] = useState<string[]>([]);
  const [committed, setCommitted] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const lockedRef = useRef(false);
  const acceptedIds = proposal.testCases.filter(item => !rejectedIds.includes(item.tempId)).map(item => item.tempId);
  const insertion = useMutation({
    retry: false,
    mutationFn: () => commit(acceptedIds, new AbortController().signal),
    onSuccess: counts => { setCommitted(true); onCommitted(counts); },
    onError: () => { lockedRef.current = false; },
  });
  const disabled = insertion.isPending || committed;

  const download = () => {
    setDownloadError(false);
    let url: string | undefined;
    try {
      const blob = new Blob([JSON.stringify(selectAiProposal(proposal, acceptedIds), null, 2)], { type: 'application/json' });
      url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ai-test-case-proposal.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch { setDownloadError(true); }
    finally { if (url) URL.revokeObjectURL(url); }
  };

  return (
    <section data-mipqa="ai-proposal-review" className="space-y-4">
      {recap && <p data-mipqa="ai-proposal-recap" className="whitespace-pre-wrap break-words rounded-xl bg-slate-200 p-4 text-sm leading-relaxed dark:bg-slate-800">{recap}</p>}
      <div data-mipqa="ai-proposal-counts" className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-300 p-4 dark:border-slate-700"><p className="text-2xl font-semibold">{proposal.folders.length}</p><p className="text-sm text-slate-600 dark:text-slate-400">Folders</p></div>
        <div className="rounded-xl border border-slate-300 p-4 dark:border-slate-700"><p className="text-2xl font-semibold">{proposal.testCases.length}</p><p className="text-sm text-slate-600 dark:text-slate-400">Test cases</p></div>
      </div>
      {proposal.testCases.length === 0 && <p className="text-sm">No test cases were proposed.</p>}
      {proposal.testCases.map(item => (
        <article key={item.tempId} data-mipqa="ai-proposed-testcase" className="space-y-4 rounded-xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between gap-4"><h3 className="break-words text-base font-semibold">{item.title}</h3><label className="flex shrink-0 items-center gap-2 text-sm"><input type="checkbox" role="switch" aria-label={`Accept ${item.title}`} data-mipqa="ai-testcase-accept-toggle" checked={!rejectedIds.includes(item.tempId)} disabled={disabled} onChange={event => setRejectedIds(previous => event.target.checked ? previous.filter(id => id !== item.tempId) : [...previous, item.tempId])} className="h-4 w-4 accent-blue-600" />Accept</label></div>
          <dl className="space-y-3 text-sm leading-relaxed">
            <div><dt className="font-medium">Folder</dt><dd>{proposal.folders.find(folder => folder.tempId === item.folderTempId)?.name ?? (item.folderTempId ? 'Unknown folder' : 'No folder')}</dd></div>
            <div><dt className="font-medium">Preconditions</dt><dd className="whitespace-pre-wrap break-words">{item.preconditions || 'None'}</dd></div>
            <div><dt className="font-medium">Description</dt><dd className="whitespace-pre-wrap break-words">{item.description || 'None'}</dd></div>
            <div><dt className="font-medium">Priority</dt><dd>{item.priority ?? 'Not specified'}</dd></div>
            <div><dt className="font-medium">Tags</dt><dd className="flex flex-wrap gap-2">{item.tags?.length ? item.tags.map((tag, index) => <span key={index} className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-700">{tag}</span>) : 'None'}</dd></div>
          </dl>
          <ol className="space-y-3">{item.stepResults.map((step, index) => <li key={index} className="rounded-lg border border-slate-200 p-3 text-sm leading-relaxed dark:border-slate-600"><p className="whitespace-pre-wrap break-words"><span className="font-medium">{index + 1}. Step: </span>{step.step}</p><p className="mt-2 whitespace-pre-wrap break-words"><span className="font-medium">Expected result: </span>{step.result}</p></li>)}</ol>
        </article>
      ))}
      <div className="sticky bottom-0 space-y-3 rounded-xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-900">
        <p className="text-sm">{acceptedIds.length} of {proposal.testCases.length} accepted</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" data-mipqa="ai-insert-project-button" disabled={disabled || !acceptedIds.length} onClick={() => { if (lockedRef.current || !acceptedIds.length) return; lockedRef.current = true; insertion.mutate(); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{insertion.isPending ? 'Inserting…' : committed ? 'Inserted' : 'Insert into project'}</button>
          <button type="button" data-mipqa="ai-download-proposal-button" disabled={!acceptedIds.length} onClick={download} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-200 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"><Download className="h-4 w-4" />Download</button>
        </div>
        {insertion.isError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">Could not insert the test cases. Your selections are unchanged. Please try again.</p>}
        {downloadError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">Could not download the proposal. Please try again.</p>}
      </div>
    </section>
  );
};

export default AiTestProposalReview;
