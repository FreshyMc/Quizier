const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const AUTH_REFRESH_PATH = '/api/auth/refresh';
const AUTH_LOGIN_PATH = '/api/auth/login';
const AUTH_REGISTER_PATH = '/api/auth/register';
const AUTH_LOGOUT_PATH = '/api/auth/logout';

let refreshInFlight: Promise<boolean> | null = null;

export type FieldValidationError = Record<string, string>;

export class ApiError extends Error {
  statusCode: number;
  errors?: FieldValidationError[];

  constructor(message: string, statusCode: number, errors?: FieldValidationError[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

const notifyAuthLogout = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('auth:logout'));
};

const shouldAttemptRefresh = (path: string) => {
  if (path === AUTH_REFRESH_PATH) return false;
  if (path === AUTH_LOGIN_PATH) return false;
  if (path === AUTH_REGISTER_PATH) return false;
  if (path === AUTH_LOGOUT_PATH) return false;
  return true;
};

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${AUTH_REFRESH_PATH}`, {
        method: 'POST',
        credentials: 'include',
      });

      return response.ok;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function readErrorPayload(response: Response): Promise<{
  message: string;
  errors?: FieldValidationError[];
}> {
  let message = `Request failed with ${response.status}`;
  let errors: FieldValidationError[] | undefined;

  try {
    const data = (await response.json()) as {
      message?: string;
      error?: string;
      errors?: FieldValidationError[];
    };
    message = data.message ?? data.error ?? message;
    errors = Array.isArray(data.errors) ? data.errors : undefined;

    if ((!message || message.startsWith('Request failed with')) && errors && errors.length > 0) {
      const firstError = errors[0] ?? {};
      const firstMessage = Object.values(firstError)[0];
      if (firstMessage) {
        message = firstMessage;
      }
    }
  } catch {
    // ignore parse errors
  }

  return { message, errors };
}

async function doFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers,
    ...init,
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response = await doFetch(path, init);

  if (response.status === 401 && shouldAttemptRefresh(path)) {
    const refreshed = await refreshSession();

    if (refreshed) {
      response = await doFetch(path, init);
    } else {
      notifyAuthLogout();
    }
  }

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    throw new ApiError(payload.message, response.status, payload.errors);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
