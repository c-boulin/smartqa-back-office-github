import { z } from 'zod';

const deviceSchema = z.enum(['Desktop Chrome', 'iPhone 12', 'iPad', 'Samsung Galaxy S21']);
const runStatusSchema = z.enum(['draft', 'processing', 'ready', 'failed']);
const executionReportSchema = z.object({
  version: z.union([z.string(), z.number()]),
  status: z.enum(['passed', 'failed', 'error']),
  url: z.string().url(),
  device: deviceSchema,
  prompt: z.string(),
  summary: z.string(),
  duration_ms: z.number().nonnegative(),
  steps: z.array(z.object({
    n: z.number().int().nonnegative(),
    kind: z.enum(['start', 'step', 'assertion', 'screenshot', 'error', 'end']),
    message: z.string(),
    status: z.enum(['pass', 'fail', 'info']),
  }).passthrough()),
  screenshot_keys: z.array(z.string()),
  log_excerpt: z.string(),
}).passthrough();
const runResponseSchema = z.object({
  data: z.object({
    run: z.object({
      id: z.union([z.string().min(1), z.number().int()]).transform(String),
      status: runStatusSchema,
      error_message: z.string().nullable().optional(),
      assistant_message: z.string().nullable().optional(),
      execution_report: executionReportSchema.nullable().optional(),
    }).passthrough(),
  }).passthrough(),
}).passthrough();
const screenshotResponseSchema = z.object({
  data: z.object({
    url: z.string().url().refine(value => value.startsWith('https://')),
  }).passthrough(),
}).passthrough();

export type AiExecutionReport = z.infer<typeof executionReportSchema>;
export type AiExecuteStatus = z.infer<typeof runStatusSchema>;
export interface AiExecuteRun {
  id: string;
  status: AiExecuteStatus;
  errorMessage: string | null;
  assistantMessage: string | null;
  executionReport: AiExecutionReport | null;
}
export interface AiExecuteInput {
  url: string;
  device: z.infer<typeof deviceSchema>;
  prompt: string;
}

function validateAndAdapt<T, U>(schema: z.ZodType<T>, response: unknown, adapt: (data: T) => U): U {
  return adapt(schema.parse(response));
}

function adaptRun(response: unknown): AiExecuteRun {
  return validateAndAdapt(runResponseSchema, response, ({ data }) => ({
    id: data.run.id,
    status: data.run.status,
    errorMessage: data.run.error_message ?? null,
    assistantMessage: data.run.assistant_message ?? null,
    executionReport: data.run.execution_report ?? null,
  }));
}

export function createAiExecuteApi(request: (endpoint: string, options?: RequestInit) => Promise<unknown>) {
  const path = (projectId: string, runId?: string) => `/projects/${encodeURIComponent(projectId)}/ai-execute/runs${runId === undefined ? '' : `/${encodeURIComponent(runId)}`}`;
  const json = (body: unknown, signal: AbortSignal): RequestInit => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  return {
    async createRun(projectId: string, signal: AbortSignal) {
      return adaptRun(await request(path(projectId), json({ title: 'AI Agent Execute' }, signal)));
    },
    async startRun(projectId: string, runId: string, { url, device, prompt }: AiExecuteInput, signal: AbortSignal) {
      return adaptRun(await request(`${path(projectId, runId)}/start`, json({ url, device, prompt }, signal)));
    },
    async getRun(projectId: string, runId: string, signal: AbortSignal) {
      return adaptRun(await request(path(projectId, runId), { method: 'GET', signal, headers: { Accept: 'application/json' } }));
    },
    async getScreenshotUrl(projectId: string, runId: string, key: string, signal: AbortSignal) {
      const response = await request(`${path(projectId, runId)}/screenshot-url?key=${encodeURIComponent(key)}`, {
        method: 'GET', signal, headers: { Accept: 'application/json' },
      });
      return validateAndAdapt(screenshotResponseSchema, response, ({ data }) => data.url);
    },
  };
}

export const POLL_INTERVAL = 5000;
export const POLL_TIMEOUT = 15 * 60 * 1000;
export function isTerminal(status?: string): boolean {
  return status === 'ready' || status === 'failed';
}
