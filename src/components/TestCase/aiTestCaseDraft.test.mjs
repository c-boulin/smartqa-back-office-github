import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./aiTestCaseDraft.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { validateAiFiles, validateAiDraft, buildAiDraftText, AI_DEVICES, MAX_AI_FILE_BYTES } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('requires a description and an HTTPS URL without attachments', () => {
  assert.ok(validateAiDraft('', '', 1));
  assert.ok(validateAiDraft('Sign In', '', 0));
  assert.equal(validateAiDraft('Sign In', '', 1), null);
  assert.equal(validateAiDraft('Sign In', 'https://example.com', 0), null);
  for (const url of ['http://example.com', 'https://', 'https://user:password@example.com', 'not a url']) assert.ok(validateAiDraft('Sign In', url, 1));
});

test('enforces attachment type, count and size defaults', () => {
  const file = { type: 'image/png', size: MAX_AI_FILE_BYTES };
  assert.equal(validateAiFiles(Array(5).fill(file)), null);
  assert.ok(validateAiFiles(Array(6).fill(file)));
  assert.ok(validateAiFiles([{ ...file, size: MAX_AI_FILE_BYTES + 1 }]));
  assert.ok(validateAiFiles([{ type: 'application/pdf', size: 1 }]));
  assert.equal(validateAiFiles([{ type: 'image/jpeg', size: 1 }, { type: 'image/webp', size: 1 }]), null);
});

test('includes device and URL in request text', () => {
  assert.equal(AI_DEVICES.length, 5);
  assert.equal(buildAiDraftText(' Sign Up ', 'Pixel 5', ''), 'Sign Up\nDevice: Pixel 5');
  assert.equal(buildAiDraftText('Homepage', 'Desktop Chrome', ' https://example.com '), 'Homepage\nDevice: Desktop Chrome\nBase URL: https://example.com');
});
