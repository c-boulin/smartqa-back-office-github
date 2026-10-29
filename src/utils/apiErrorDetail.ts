import { ApiRequestError } from '../services/api';

function detailFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const errors = (body as { errors?: unknown }).errors;
  if (!Array.isArray(errors) || errors.length === 0) return undefined;
  const detail = (errors[0] as { detail?: unknown })?.detail;
  return typeof detail === 'string' && detail.trim() !== '' ? detail.trim() : undefined;
}

/** Returns the API `errors[0].detail` from a thrown error or a response body, otherwise `fallback`. */
export function apiErrorDetailOr(source: unknown, fallback: string): string {
  if (source instanceof ApiRequestError) return source.detail ?? fallback;
  return detailFromBody(source) ?? fallback;
}
