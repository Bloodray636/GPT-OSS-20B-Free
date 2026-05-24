import { showInfoModal } from './modals.js';

export const attachCopyToCodeBlocks = (container) => {
  if (!container) {
    return;
  }

  container.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy-code-btn')) {
        return;
    }

    const copyBtn = document.createElement('div');
    copyBtn.className = 'copy-code-btn';
    copyBtn.innerHTML = 'Копировать';
    copyBtn.title = 'Копировать код';

    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const code = pre.querySelector('code')?.innerText || pre.innerText;

      navigator.clipboard.writeText(code).then(() => {
        showInfoModal('Успех', 'Код скопирован');
      }).catch(() => showInfoModal('Ошибка', 'Не удалось скопировать код'));
    });

    pre.style.position = 'relative';
    pre.appendChild(copyBtn);
  });
};