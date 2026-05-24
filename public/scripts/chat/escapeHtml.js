export const escapeHtml = (str) => str.replace(/[&<>]/g, (m) => ({ 
  '&': '&amp;', 
  '<': '&lt;', 
  '>': '&gt;' 
}[m]));