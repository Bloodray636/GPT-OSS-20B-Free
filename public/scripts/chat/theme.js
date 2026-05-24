export const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.classList.toggle('dark', savedTheme === 'dark');
  document.body.classList.toggle('light', savedTheme === 'light');
};