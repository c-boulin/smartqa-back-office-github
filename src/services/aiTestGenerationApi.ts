import { z } from 'zod';

const idSchema = z.union([z.string().min(1), z.number().int().positive()]).transform(String);
const sessionSchema = z.object({
  data: z.object({ session: z.object({
    id: idSchema,
    status: z.string().optional(),
    error_message: z.string().nullable().optional(),
  }) }),
});
const presignSchema = z.object({ data: z.object({ url: z.string().url().refine(value => value.startsWith('https://')), key: z.string().min(1) }) });

export interface AiGenerationSession {
  id: string;
  status: string;
  errorMessage: string | null;
}

function validateAndAdapt<T, U>(schema: z.ZodType<T>, response: unknown, adapt: (data: T) => U): U {
  return adapt(schema.parse(response));
}

export function adaptAiSession(response: unknown): AiGenerationSession {
  return validateAndAdapt(sessionSchema, response, ({ data }) => ({
    id: data.session.id,
    status: data.session.status ?? 'processing',
    errorMessage: data.session.error_message ?? null,
  }));
}

export function adaptAiPresign(response: unknown): { url: string; key: string } {
  return validateAndAdapt(presignSchema, response, ({ data }) => ({ url: data.url, key: data.key }));
}

export function createAiTestGenerationApi(request: (endpoint: string, options?: RequestInit) => Promise<unknown>, upload: typeof fetch = fetch) {
  const path = (projectId: string, sessionId?: string) => `/projects/${encodeURIComponent(projectId)}/ai-test-generation/sessions${sessionId ? `/${encodeURIComponent(sessionId)}` : ''}`;
  const json = (body: unknown, signal: AbortSignal): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), signal });
  return {
    async createSession(projectId: string, signal: AbortSignal) {
      return adaptAiSession(await request(path(projectId), json({ title: 'Generate with AI' }, signal)));
    },
    async uploadAttachment(projectId: string, sessionId: string, file: File, signal: AbortSignal) {
      const { url, key } = adaptAiPresign(await request(`${path(projectId, sessionId)}/attachments/presign`, json({ filename: file.name, content_type: file.type }, signal)));
      const response = await upload(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file, credentials: 'omit', signal });
      if (!response.ok) throw new Error('Attachment upload failed.');
      return key;
    },
    async sendMessage(projectId: string, sessionId: string, content: string, attachmentKeys: string[], signal: AbortSignal) {
      await request(`${path(projectId, sessionId)}/messages`, json({ content, attachment_keys: attachmentKeys }, signal));
    },
    async getSession(projectId: string, sessionId: string, signal: AbortSignal) {
      return adaptAiSession(await request(path(projectId, sessionId), { signal, headers: { Accept: 'application/json' } }));
    },
  };
}

export const AI_POLL_INTERVAL = 5000;
export const AI_POLL_TIMEOUT = 15 * 60 * 1000;
export function isAiTerminal(status?: string): boolean {
  return status === 'ready' || status === 'failed';
}
