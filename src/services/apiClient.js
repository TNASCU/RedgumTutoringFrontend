import { API_BASE_URL } from './config.js';

export class ApiError extends Error {
  constructor(message, { status = 0, data = null, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** Paths are relative to the API root. Query arrays use repeated keys. */
async function request(path, { method = 'GET', query, body, headers, signal } = {}) {
  const url = new URL(`${API_BASE_URL}/${path.replace(/^\/+/, '')}`, globalThis.location?.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== null) url.searchParams.append(key, String(item));
    }
  }

  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has('Accept')) requestHeaders.set('Accept', 'application/json');
  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  const payload = body === undefined ? undefined : isFormData ? body : JSON.stringify(body);

  let response;
  let text;
  try {
    response = await fetch(url, { method, headers: requestHeaders, body: payload, signal });
    text = await response.text();
  } catch (cause) {
    // Preserve cancellation so callers can ignore requests aborted on unmount.
    if (signal?.aborted || cause.name === 'AbortError') throw cause;
    throw new ApiError('Unable to reach the server. Please try again.', { cause });
  }

  let data = text || null;
  const contentType = response.headers.get('content-type') ?? '';
  if (text && (contentType.includes('/json') || contentType.includes('+json'))) {
    try {
      data = JSON.parse(text);
    } catch (cause) {
      if (response.ok) {
        throw new ApiError('The server returned invalid JSON.', { status: response.status, data: text, cause });
      }
    }
  }

  if (!response.ok) {
    const message = data?.detail || data?.message || data?.title;
    throw new ApiError(
      typeof message === 'string' ? message : `Request failed (${response.status}).`,
      { status: response.status, data },
    );
  }
  return data;
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
