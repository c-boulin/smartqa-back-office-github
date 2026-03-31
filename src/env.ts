/**
 * Resolves the assets CloudFront domain.
 * Uses VITE_ASSETS_CLOUDFRONT_DOMAIN when set, otherwise derives from VITE_API_BASE_URL
 * so it works for dev (smartqa.dve-dev.com) and prod (smartqa.dvtech.io) even when
 * the env var is missing in the build.
 */
export function getAssetsCloudfrontDomain(): string {
  const fromEnv = import.meta.env.VITE_ASSETS_CLOUDFRONT_DOMAIN;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return fromEnv.trim();
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase && typeof apiBase === 'string') {
    try {
      const url = new URL(apiBase);
      const hostname = url.hostname;
      if (hostname) {
        return `https://asset-back.${hostname}`;
      }
    } catch {
      // ignore URL parse errors
    }
  }
  throw new Error(
    'VITE_ASSETS_CLOUDFRONT_DOMAIN is not configured. Please set it in your environment or ensure VITE_API_BASE_URL is set so it can be derived.'
  );
}

/**
 * Builds the full HTTPS URL for an object on the assets CDN (e.g. {@code overview_msgs.screenshot_object_key}).
 */
export function buildAssetsUrlFromObjectKey(objectKey: string): string {
  const base = getAssetsCloudfrontDomain().replace(/\/$/, '');
  const path = objectKey.trim().replace(/^\/+/, '');

  return `${base}/${path}`;
}
