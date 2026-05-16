import { elements } from './domElements.js';

export function initSwitchForms() {
  const { 
    loginFormDiv, 
    registerFormDiv, 
    showRegisterLink, 
    showLoginLink, 
    loginError, 
    registerError 
  } = elements;

  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormDiv.style.display = 'none';
    registerFormDiv.style.display = 'block';
    loginError.textContent = '';
    registerError.textContent = '';
  });

  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerFormDiv.style.display = 'none';
    loginFormDiv.style.display = 'block';
    loginError.textContent = '';
    registerError.textContent = '';
  });
}