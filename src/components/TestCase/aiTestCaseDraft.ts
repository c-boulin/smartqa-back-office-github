export const AI_DEVICES = ['Desktop Chrome', 'Desktop Firefox', 'iPhone 13', 'Pixel 5', 'iPad'] as const;
export const MAX_AI_FILES = 5;
export const MAX_AI_FILE_BYTES = 10 * 1024 * 1024;

export function validateAiFiles(files: ReadonlyArray<Pick<File, 'type' | 'size'>>): string | null {
  if (files.length > MAX_AI_FILES) return 'Select up to 5 files.';
  if (files.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) return 'Only PNG, JPEG and WebP images are supported.';
  if (files.some(file => file.size > MAX_AI_FILE_BYTES)) return 'Each file must be 10 MB or smaller.';
  return null;
}

export function validateAiDraft(prompt: string, fileCount: number, projectUrl?: string): string | null {
  if (!prompt.trim() && !fileCount) return 'Describe the test cases you want to create.';
  if (fileCount) return null;
  const urls = prompt.match(/https:\/\/[^\s<>"']+/g) ?? [];
  const valid = urls.some(value => {
    try {
      const url = new URL(value.replace(/[.,;!?)]*$/, ''));
      return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
    } catch { return false; }
  });
  if (valid) return null;
  try {
    const value = projectUrl?.trim() ?? '';
    const url = new URL(value);
    if (value.startsWith('https://') && url.protocol === 'https:' && url.hostname && !url.username && !url.password) return null;
  } catch {
    return 'Include a valid https:// URL in your prompt or attach an image.';
  }
  return 'Include a valid https:// URL in your prompt or attach an image.';
}

export function aiPriorityLabel(priority: string | number | null | undefined): 'High' | 'Medium' | 'Low' {
  if (priority === 2 || priority === 3 || ['high', 'critical'].includes(String(priority).toLowerCase())) return 'High';
  if (priority === 4 || String(priority).toLowerCase() === 'low') return 'Low';
  return 'Medium';
}

export function buildAiDraftText(prompt: string, device: string, baseUrl: string): string {
  const text = prompt.trim() || 'create test cases from these images';
  const prefix = baseUrl.trim() && !text.includes('https://') ? `Go to ${baseUrl.trim()}. ` : '';
  return `${prefix}${text}, Device: ${device}`;
}
