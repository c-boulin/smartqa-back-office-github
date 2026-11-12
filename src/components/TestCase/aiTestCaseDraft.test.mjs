import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const cache = new URL('../../../node_modules/.cache/ai-test-generation/', import.meta.url);
mkdirSync(cache, { recursive: true });
async function load(path, name) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const output = new URL(name, cache);
  writeFileSync(output, ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  return import(output.href);
}
const { validateAiFiles, validateAiDraft, buildAiDraftText, AI_DEVICES, MAX_AI_FILE_BYTES } = await load('./aiTestCaseDraft.ts', 'draft.mjs');
const { createAiTestGenerationApi, adaptAiSession, isAiTerminal } = await load('../../services/aiTestGenerationApi.ts', 'api.mjs');

test('requires an image or HTTPS URL and rejects non-HTTPS URLs', () => {
  assert.ok(validateAiDraft('Sign In', '', 0));
  assert.equal(validateAiDraft('', '', 1), null);
  assert.equal(validateAiDraft('Sign In', 'https://example.com', 0), null);
  for (const url of ['http://example.com', 'https://', 'https://user:password@example.com', 'not a url']) assert.ok(validateAiDraft('Sign In', url, 1));
});

test('enforces attachment type, count and size defaults', () => {
  const file = { type: 'image/png', size: MAX_AI_FILE_BYTES };
  assert.equal(validateAiFiles(Array(5).fill(file)), null);
  assert.ok(validateAiFiles(Array(6).fill(file)));
  assert.ok(validateAiFiles([{ ...file, size: MAX_AI_FILE_BYTES + 1 }]));
  assert.ok(validateAiFiles([{ type: 'application/pdf', size: 1 }]));
});

test('builds worker content exactly', () => {
  assert.equal(AI_DEVICES.length, 5);
  assert.equal(buildAiDraftText('Sign In', 'Pixel 5', 'https://example.com'), 'Go to https://example.com. Sign In, Device: Pixel 5');
  assert.equal(buildAiDraftText('Test https://other.example', 'iPad', 'https://example.com'), 'Test https://other.example, Device: iPad');
  assert.equal(buildAiDraftText('', 'Desktop Chrome', ''), 'create test cases from these images, Device: Desktop Chrome');
});

test('creates session, uploads attachments, sends keys and polls status', async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const request = async (path, options = {}) => {
    calls.push([path, options.method ?? 'GET', options.body]);
    if (path.endsWith('/sessions')) return { data: { session: { id: 11, status: 'draft' } } };
    if (path.endsWith('/presign')) return { data: { url: 'https://uploads.example/file', key: 'ai/key.png' } };
    if (path.endsWith('/messages')) return { data: { session: { id: 11, status: 'processing' } } };
    return { data: { session: { id: 11, status: 'failed', error_message: 'Worker failed' } } };
  };
  const uploads = [];
  const api = createAiTestGenerationApi(request, async (url, options) => { uploads.push([url, options.method, options.credentials]); return { ok: true }; });
  const file = new File(['png'], 'screen.png', { type: 'image/png' });
  const session = await api.createSession('475', signal);
  assert.equal(await api.uploadAttachment('475', session.id, file, signal), 'ai/key.png');
  await api.sendMessage('475', session.id, 'content', ['ai/key.png'], signal);
  const result = await api.getSession('475', session.id, signal);
  assert.deepEqual(calls.map(([path, method]) => [path, method]), [
    ['/projects/475/ai-test-generation/sessions', 'POST'],
    ['/projects/475/ai-test-generation/sessions/11/attachments/presign', 'POST'],
    ['/projects/475/ai-test-generation/sessions/11/messages', 'POST'],
    ['/projects/475/ai-test-generation/sessions/11', 'GET'],
  ]);
  assert.deepEqual(JSON.parse(calls[0][2]), { title: 'Generate with AI' });
  assert.deepEqual(JSON.parse(calls[1][2]), { filename: 'screen.png', content_type: 'image/png' });
  assert.deepEqual(JSON.parse(calls[2][2]), { content: 'content', attachment_keys: ['ai/key.png'] });
  assert.deepEqual(uploads, [['https://uploads.example/file', 'PUT', 'omit']]);
  assert.deepEqual(result, { id: '11', status: 'failed', errorMessage: 'Worker failed' });
  assert.ok(calls.every(([path]) => !path.includes('discover-worker/callback')));
});

test('validates response shapes and terminal statuses', () => {
  assert.throws(() => adaptAiSession({ data: {} }));
  assert.equal(isAiTerminal('processing'), false);
  assert.equal(isAiTerminal('ready'), true);
  assert.equal(isAiTerminal('failed'), true);
});
