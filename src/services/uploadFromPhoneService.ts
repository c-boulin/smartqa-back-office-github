const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/** Pending image sent from phone via relay (backend holds file until computer fetches it) */
export interface PendingRelayUpload {
  id: string;
  name: string;
}

export interface CreateUploadTokenResponse {
  data: { token: string };
}

interface GetPendingUploadsResponse {
  data: {
    relay?: PendingRelayUpload[];
    version?: number;
  };
}

async function createUploadToken(): Promise<string> {
  const token = localStorage.getItem('auth_token');
  if (!token?.trim()) {
    throw new Error('No authentication token found');
  }
  const response = await fetch(`${API_BASE_URL}/upload-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to create upload token: ${response.statusText}`);
  }
  const data: CreateUploadTokenResponse = await response.json();
  return data.data.token;
}

export interface PendingResult {
  relay: PendingRelayUpload[];
  version: number;
}

const LONG_POLL_TIMEOUT_SECONDS = 25;

/**
 * Long-poll the pending endpoint (server holds the request up to timeout, then returns).
 * Pass sinceVersion so the server only returns immediately when there's genuinely new data.
 * Pass signal to cancel the request when cleaning up.
 */
async function getPendingUploadsLongPoll(
  token: string,
  sinceVersion: number,
  timeoutSeconds: number = LONG_POLL_TIMEOUT_SECONDS,
  signal?: AbortSignal
): Promise<PendingResult> {
  const url = `${API_BASE_URL}/upload-from-phone/pending?token=${encodeURIComponent(token)}&long_poll=1&timeout=${timeoutSeconds}&since_version=${sinceVersion}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    return { relay: [], version: sinceVersion };
  }
  const data: GetPendingUploadsResponse = await response.json();
  return {
    relay: data.data?.relay ?? [],
    version: data.data?.version ?? 0,
  };
}

/**
 * Upload image from phone to backend (relay). Backend stores it until the computer
 * fetches it and uploads to S3. No S3 or assets domain needed on the phone.
 */
async function uploadRelay(token: string, file: File): Promise<{ id: string; name: string }> {
  const form = new FormData();
  form.append('token', token);
  form.append('file', file, file.name || 'image.jpg');
  const response = await fetch(`${API_BASE_URL}/upload-from-phone/relay`, {
    method: 'POST',
    body: form,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.message || `Relay upload failed: ${response.statusText}`);
  }
  const data = await response.json();
  const id = data?.data?.id;
  const name = data?.data?.name ?? file.name ?? 'image.jpg';
  if (!id) throw new Error('Invalid relay response');
  return { id, name };
}

/**
 * Fetch a relay image by id (used by computer to get the file and run S3 upload).
 */
async function fetchRelayImage(token: string, id: string): Promise<Blob> {
  const url = `${API_BASE_URL}/upload-from-phone/relay-image?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch relay image: ${response.statusText}`);
  return response.blob();
}

export const uploadFromPhoneService = {
  createUploadToken,
  getPendingUploadsLongPoll,
  uploadRelay,
  fetchRelayImage,
};
