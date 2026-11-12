import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { AI_POLL_INTERVAL, AI_POLL_TIMEOUT, createAiTestGenerationApi, isAiTerminal } from '../services/aiTestGenerationApi';

export function useAiTestGeneration(projectId: string | undefined, isOpen: boolean) {
  const [api] = useState(() => createAiTestGenerationApi((path, options) => apiService.authenticatedRequest(path, options)));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => () => controllerRef.current?.abort(), []);
  const submission = useMutation({
    retry: false,
    mutationFn: async ({ content, files }: { content: string; files: File[] }) => {
      if (!projectId) throw new Error('Select a project first.');
      const controller = new AbortController();
      controllerRef.current = controller;
      const session = await api.createSession(projectId, controller.signal);
      setSessionId(session.id);
      const keys: string[] = [];
      for (const file of files) keys.push(await api.uploadAttachment(projectId, session.id, file, controller.signal));
      await api.sendMessage(projectId, session.id, content, keys, controller.signal);
      controller.signal.throwIfAborted();
      setTimedOut(false);
      setDeadline(Date.now() + AI_POLL_TIMEOUT);
    },
    onSettled: () => { submittingRef.current = false; },
  });

  const session = useQuery({
    queryKey: ['ai-generation', projectId, sessionId],
    queryFn: ({ signal }) => api.getSession(projectId!, sessionId!, signal),
    enabled: Boolean(projectId && sessionId && deadline && isOpen && !timedOut && !submission.isPending),
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: query => isAiTerminal(query.state.data?.status) || query.state.error || timedOut ? false : AI_POLL_INTERVAL,
  });
  const terminal = isAiTerminal(session.data?.status);

  useEffect(() => {
    if (!deadline || terminal) return;
    const timer = window.setTimeout(() => setTimedOut(true), Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [deadline, terminal]);

  const isRunning = submission.isPending || Boolean(deadline && !terminal && !timedOut && !session.isError);
  const needsPollRetry = Boolean(deadline && !terminal && (timedOut || session.isError));

  return {
    sessionId,
    isRunning,
    needsPollRetry,
    notice: submission.isError ? 'Could not submit the generation request. Please try again.'
      : session.data?.status === 'failed' ? session.data.errorMessage || 'Test case generation failed.'
      : session.data?.status === 'ready' ? 'Your test case generation is ready.'
      : timedOut ? 'The run is still processing. Retry the status check to continue waiting.'
      : session.isError ? 'Could not check the run status. Retry the status check.'
      : isRunning ? "wait I'm thinking" : null,
    send(content: string, files: File[]) {
      if (submittingRef.current || isRunning || needsPollRetry || !projectId) return false;
      submittingRef.current = true;
      setDeadline(null);
      setSessionId(null);
      setTimedOut(false);
      submission.mutate({ content, files });
      return true;
    },
    retryPoll() {
      if (!needsPollRetry) return;
      setTimedOut(false);
      setDeadline(Date.now() + AI_POLL_TIMEOUT);
      void session.refetch();
    },
  };
}
