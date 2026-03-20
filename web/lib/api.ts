const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const SERVER_API_URL = process.env.API_INTERNAL_URL ?? process.env.API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

function getApiBaseUrl() {
  if (typeof window === 'undefined') {
    return SERVER_API_URL;
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const configured = new URL(process.env.NEXT_PUBLIC_API_URL);
      if (configured.hostname === window.location.hostname) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
    } catch {
      // Fall back to current browser hostname if the configured URL is invalid.
    }
  }

  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

function getClientApiBaseUrl() {
  return getApiBaseUrl();
}

function buildPublicApiBaseUrlFromRequest(
  requestHost: string | null,
  requestProto: string | null
): string | null {
  const configured = PUBLIC_API_URL;

  try {
    const configuredUrl = new URL(configured);
    if (!requestHost) {
      return configuredUrl.toString().replace(/\/$/, '');
    }

    const normalizedHost = requestHost.split(',')[0].trim();
    const hostUrl = new URL(`${requestProto ?? configuredUrl.protocol.replace(':', '')}://${normalizedHost}`);
    hostUrl.port = configuredUrl.port || (configuredUrl.protocol === 'https:' ? '443' : '80');
    return hostUrl.toString().replace(/\/$/, '');
  } catch {
    return configured.replace(/\/$/, '');
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildHeaders(initHeaders?: HeadersInit): Promise<Record<string, string>> {
  const headers = new Headers(initHeaders);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (typeof window === 'undefined') {
    const { cookies, headers: nextHeaders } = await import('next/headers');
    const cookieStore = await cookies();
    const serialized = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');

    if (serialized && !headers.has('Cookie')) {
      headers.set('Cookie', serialized);
    }

    const requestHeaders = await nextHeaders();
    const forwardedHost = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
    const forwardedProto = requestHeaders.get('x-forwarded-proto');

    if (forwardedHost && !headers.has('x-forwarded-host')) {
      headers.set('x-forwarded-host', forwardedHost);
    }

    if (forwardedProto && !headers.has('x-forwarded-proto')) {
      headers.set('x-forwarded-proto', forwardedProto);
    }

    const publicApiBaseUrl = buildPublicApiBaseUrlFromRequest(forwardedHost, forwardedProto);
    if (publicApiBaseUrl && !headers.has('x-public-api-base')) {
      headers.set('x-public-api-base', publicApiBaseUrl);
    }
  }

  return Object.fromEntries(headers.entries());
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        headers: await buildHeaders(init?.headers),
        credentials: 'include',
        cache: 'no-store'
      });

      if (!response.ok) {
        const message = `Request failed: ${response.status}`;
        throw new ApiError(message, response.status);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      lastError = error;

      if (error instanceof ApiError && error.status < 500) {
        throw error;
      }

      if (attempt < 3 && typeof window === 'undefined') {
        await sleep(1000 * attempt);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed.');
}

export { getApiBaseUrl, getClientApiBaseUrl, PUBLIC_API_URL as API_URL };
