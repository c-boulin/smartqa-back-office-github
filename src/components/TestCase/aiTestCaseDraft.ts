export const AI_DEVICES = ['Desktop Chrome', 'Desktop Firefox', 'iPhone 13', 'Pixel 5', 'iPad'] as const;
export const AI_PROMPT_CHIPS = ['Sign In', 'Sign Up', 'Homepage', 'Product Page'] as const;
export const MAX_AI_FILES = 5;
export const MAX_AI_FILE_BYTES = 10 * 1024 * 1024;

export function validateAiFiles(files: ReadonlyArray<Pick<File, 'type' | 'size'>>): string | null {
  if (files.length > MAX_AI_FILES) return 'Select up to 5 files.';
  if (files.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) return 'Only PNG, JPEG and WebP images are supported.';
  if (files.some(file => file.size > MAX_AI_FILE_BYTES)) return 'Each file must be 10 MB or smaller.';
  return null;
}

export function validateAiDraft(prompt: string, baseUrl: string, fileCount: number): string | null {
  if (!prompt.trim() && !fileCount) return 'Describe the test cases you want to create.';
  if (!baseUrl.trim()) return fileCount ? null : 'Enter a Base URL or attach an image.';
  try {
    const url = new URL(baseUrl.trim());
    if (!baseUrl.trim().startsWith('https://') || url.protocol !== 'https:' || !url.hostname || url.username || url.password) return 'Enter a valid Base URL starting with https://.';
  } catch {
    return 'Enter a valid Base URL starting with https://.';
  }
  return null;
}

export function buildAiDraftText(prompt: string, device: string, baseUrl: string): string {
  const text = prompt.trim() || 'create test cases from these images';
  const prefix = baseUrl.trim() && !text.includes('https://') ? `Go to ${baseUrl.trim()}. ` : '';
  return `${prefix}${text}, Device: ${device}`;
}
