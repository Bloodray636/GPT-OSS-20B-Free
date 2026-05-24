import { authToken } from './config.js';
import { refreshToken } from './refreshToken.js';

export const fetchJSON = async (url, options = {}, retry = true) => {
  const headers = options.headers || {};

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  } 

  headers['Cache-Control'] = 'no-cache';

  const res = await fetch(url, { 
    ...options, headers 
});

  if (res.status === 401 && retry) {
    const refreshed = await refreshToken();

    if (refreshed) {
        return fetchJSON(url, options, false);
    }

    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/auth.html';

    throw new Error('Session expired');
  }

  if (!res.ok) {
    throw new Error(await res.text());
  }
  
  return res.json();
};