import { z } from 'zod';

export const aiProposalSchema = z.object({
  folders: z.array(z.object({ tempId: z.string().min(1), name: z.string() }).passthrough()),
  testCases: z.array(z.object({
    tempId: z.string().min(1),
    folderTempId: z.string().nullable().optional(),
    title: z.string(),
    preconditions: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    priority: z.union([z.string(), z.number()]).nullable().optional(),
    stepResults: z.array(z.object({ step: z.string(), result: z.string() }).passthrough()),
  }).passthrough()),
}).passthrough().refine(proposal => new Set(proposal.testCases.map(item => item.tempId)).size === proposal.testCases.length, 'Duplicate test case identifiers');

export type AiTestProposal = z.infer<typeof aiProposalSchema>;

export function selectAiProposal(proposal: AiTestProposal, acceptedIds: string[]): AiTestProposal {
  const ids = new Set(acceptedIds);
  return { ...proposal, testCases: proposal.testCases.filter(item => ids.has(item.tempId)) };
}

export function aiCommitBody(proposal: AiTestProposal, acceptedIds: string[]): { accepted_test_case_temp_ids: string[] } | undefined {
  const selected = selectAiProposal(proposal, acceptedIds).testCases;
  if (!selected.length) throw new Error('Accept at least one test case.');
  return selected.length === proposal.testCases.length ? undefined : { accepted_test_case_temp_ids: selected.map(item => item.tempId) };
}

export const aiCommitCountsSchema = z.object({ folders: z.number().int().nonnegative(), shared_steps: z.number().int().nonnegative(), test_cases: z.number().int().nonnegative() });
export type AiCommitCounts = z.infer<typeof aiCommitCountsSchema>;
