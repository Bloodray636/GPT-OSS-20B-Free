import { authToken, state, DOM } from './config.js';
import { fetchJSON } from './utils.js';

export async function loadUserSettings() {
  try {
    const settings = await fetchJSON('/api/settings');
    state.settings = settings;

    // Применение темы
    document.body.classList.toggle('dark', settings.theme === 'dark');
    document.body.classList.toggle('light', settings.theme === 'light');
    localStorage.setItem('theme', settings.theme);

    // Сохранение настройки
    state.saveHistory = settings.saveHistory;
  } catch (err) {
    console.error('Failed to load settings:', err);

    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('dark', savedTheme === 'dark');
    document.body.classList.toggle('light', savedTheme === 'light');
  }
}