import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { AiExecuteInput, createAiExecuteApi, isTerminal, POLL_INTERVAL, POLL_TIMEOUT } from '../services/aiExecuteApi';

export function useAiExecuteRun(projectId: string | undefined) {
  const [api] = useState(() => createAiExecuteApi((path, options) => apiService.authenticatedRequest(path, options)));
  const client = useQueryClient();
  const [tracking, setTracking] = useState<{ projectId: string; runId: string; deadline: number } | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const submittingRef = useRef(false);
  const activeProjectRef = useRef(projectId);
  activeProjectRef.current = projectId;
  const current = tracking?.projectId === projectId ? tracking : null;
  const queryKey = ['ai-execute', projectId, current?.runId];

  useEffect(() => () => {
    controllerRef.current?.abort();
    submittingRef.current = false;
  }, [projectId]);

  const submission = useMutation({
    retry: false,
    mutationFn: async (input: AiExecuteInput) => {
      if (!projectId) throw new Error('Select a project first.');
      const controller = new AbortController();
      controllerRef.current = controller;
      const created = await api.createRun(projectId, controller.signal);
      controller.signal.throwIfAborted();
      const started = await api.startRun(projectId, created.id, input, controller.signal);
      controller.signal.throwIfAborted();
      if (activeProjectRef.current !== projectId) return;
      client.setQueryData(['ai-execute', projectId, started.id], started);
      setTimedOut(false);
      setTracking({ projectId, runId: started.id, deadline: Date.now() + POLL_TIMEOUT });
    },
    onSettled: () => { submittingRef.current = false; },
  });

  const status = useQuery({
    queryKey,
    queryFn: ({ signal }) => api.getRun(projectId!, current!.runId, signal),
    enabled: Boolean(current && !timedOut && !submission.isPending),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: query => isTerminal(query.state.data?.status) || query.state.error || timedOut ? false : POLL_INTERVAL,
  });
  const terminal = isTerminal(status.data?.status);
  useEffect(() => {
    if (!current || terminal || timedOut) return;
    const timer = window.setTimeout(() => {
      setTimedOut(true);
      void client.cancelQueries({ queryKey: ['ai-execute', current.projectId, current.runId] });
    }, Math.max(0, current.deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [current, terminal, timedOut, client]);

  const isRunning = submission.isPending || Boolean(current && !terminal && !timedOut && !status.isError);
  const error = submission.isError ? 'Could not start the test. Please try again.'
    : status.data?.status === 'failed' ? status.data.errorMessage || 'Test execution failed.'
    : status.isError ? 'Could not check the run status. Retry the status check.' : null;

  return {
    run: current ? status.data : undefined,
    isRunning,
    timedOut: Boolean(current && timedOut),
    error,
    start(input: AiExecuteInput) {
      if (!projectId || submittingRef.current || isRunning) return;
      submittingRef.current = true;
      controllerRef.current?.abort();
      if (current) void client.cancelQueries({ queryKey });
      setTracking(null);
      setTimedOut(false);
      submission.reset();
      submission.mutate(input);
    },
    retryPoll() {
      if (!current || terminal || isRunning) return;
      setTimedOut(false);
      setTracking({ ...current, deadline: Date.now() + POLL_TIMEOUT });
      void status.refetch();
    },
  };
}
