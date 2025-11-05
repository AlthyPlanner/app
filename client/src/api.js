export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  return fetch(url, { 
    ...options,
    credentials: 'include' // ensure session cookies are sent
  });
}


