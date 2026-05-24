import { setAuthToken } from './config.js';

export const refreshToken = async () => {
  const refresh_token = localStorage.getItem('refresh_token');

  if (!refresh_token) {
    return false;
  }

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token })
    });

    const data = await res.json();

    if (res.ok && data.access_token) {
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      setAuthToken(data.access_token);
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
};