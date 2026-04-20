interface RequestServerOptions {
  method?: string;
  query?: Record<string, string>;
  body?: unknown;
  includeJwt?: boolean;
}

export const SERVER_BASE_URL = import.meta.env.VITE_SERVER_BASE_URL ?? 'http://localhost:9090';

function getServerErrorMessage(json: unknown) {
  if (json == null) {
    return 'Request failed.';
  }

  if (typeof json === 'string') {
    return json;
  }

  if (Array.isArray(json)) {
    return json
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'message' in item) {
          return String((item as Record<string, unknown>).message);
        }
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join('; ');
  }

  if (typeof json === 'object') {
    const message = (json as Record<string, unknown>).message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message)) {
      return getServerErrorMessage(message);
    }
    if (message != null) {
      return String(message);
    }
    const error = (json as Record<string, unknown>).error;
    if (typeof error === 'string') {
      return error;
    }
    if (error != null) {
      return String(error);
    }
  }

  return 'Request failed.';
}

export default async function requestServer<ReturnType>(path: string, { body, method = 'GET', includeJwt = false, query }: RequestServerOptions) {
  const headers = new Headers();
  const options: RequestInit = {
    method,
    headers,
  };

  if (includeJwt) {
    const token = localStorage.getItem('jwt');
    if (token) {
      headers.append('Authorization', 'Bearer ' + token);
    }
  }

  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    headers.append('Content-Type', 'application/json');
    options.body = JSON.stringify(body);
  }

  let url = SERVER_BASE_URL;
  url += path;
  if (query) {
    url += '?';
    url += (new URLSearchParams(query)).toString();
  }

  const response = await fetch(url, options);

  if (response.headers.get('x-jwt-status') === 'invalid') {
    localStorage.removeItem('jwt');
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (response.status >= 400) {
    throw new Error(getServerErrorMessage(json), { cause: response });
  }

  return json as ReturnType;
}
