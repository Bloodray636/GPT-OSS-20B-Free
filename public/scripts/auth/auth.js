import { elements } from './domElements.js';
import { initSwitchForms } from './switchForms.js';
import { handleLogin } from './login.js';
import { handleRegister } from './register.js';
import { initTogglePassword } from './togglePassword.js';

document.addEventListener('DOMContentLoaded', () => {
  // Инициализация переключения форм
  initSwitchForms();

  // Обработчики кнопок
  elements.loginBtn.addEventListener('click', handleLogin);
  elements.registerBtn.addEventListener('click', handleRegister);

  // Глазки для паролей
  initTogglePassword();
});