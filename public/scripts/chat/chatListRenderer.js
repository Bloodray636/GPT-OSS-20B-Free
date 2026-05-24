import { DOM, state } from './config.js';
import { showRenameModal } from './modals.js';
import { deleteChatConfirm } from './chatActions.js';

export const renderChatList = () => {
  DOM.chatList.innerHTML = '';

  state.chats.forEach(chat => {
    const li = document.createElement('li');
    li.dataset.id = chat.id;

    if (state.currentChatId === chat.id) {
        li.classList.add('active');   
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = chat.title || 'Новый чат';
    textSpan.addEventListener('click', () => openChat(chat.id));

    const menuWrapper = document.createElement('div');
    menuWrapper.style.position = 'relative';

    const menuBtn = document.createElement('button');
    menuBtn.textContent = '⋮';
    menuBtn.className = 'icon-btn small chat-menu-btn';
    menuBtn.title = 'Меню чата';

    const dropdown = document.createElement('div');
    dropdown.className = 'chat-dropdown';
    dropdown.style.display = 'none';
    dropdown.innerHTML = `
      <button class="rename-chat-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="m21.71 4.72l-2.43-2.43a1 1 0 0 0-1.41 0l-5.58 5.58a1 1 0 0 0-.29.71V11a1 1 0 0 0 1 1h2.42a1 1 0 0 0 .71-.29l5.58-5.58a1 1 0 0 0 0-1.41M15 10h-1V9l4.58-4.58l1 1Zm4 2a1 1 0 0 0-1 1a7 7 0 0 1-7 7H5.41l.64-.63a1 1 0 0 0 0-1.42A7 7 0 0 1 11 6a1 1 0 0 0 0-2a9 9 0 0 0-7 14.62l-1.71 1.67a1 1 0 0 0-.21 1.09A1 1 0 0 0 3 22h8a9 9 0 0 0 9-9a1 1 0 0 0-1-1"/>
        </svg>
        Переименовать
      </button>
      <button class="delete-chat-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        Удалить
      </button>
    `;

    menuWrapper.appendChild(menuBtn);
    menuWrapper.appendChild(dropdown);
    li.appendChild(textSpan);
    li.appendChild(menuWrapper);
    DOM.chatList.appendChild(li);

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.chat-dropdown').forEach(d => d.style.display = 'none');
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    dropdown.querySelector('.rename-chat-item').addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      showRenameModal(chat.id, chat.title);
    });

    dropdown.querySelector('.delete-chat-item').addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      deleteChatConfirm(chat.id);
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.chat-dropdown').forEach(d => d.style.display = 'none');
  });
};