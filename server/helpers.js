export const isValidUsername = (username) => username && username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
export const isValidEmail = (email) => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const isValidPassword = (password) => password && password.length >= 6;

export const ERROR_MESSAGES = {
  INVALID_USERNAME: 'Invalid username (letters, digits, underscore, min 3 chars)',
  WEAK_PASSWORD: 'Password must be at least 6 characters',
  INVALID_EMAIL: 'Invalid email address',
  SERVER_MISCONFIG: 'Server misconfiguration',
  USER_EXISTS_WRONG_CRED: 'User exists but wrong credentials',
  REGISTRATION_FAILED: 'Registration failed',
};