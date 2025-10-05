class ChatApp {
    constructor() {
        if (!window.authManager?.isAuthenticated()) {
            window.location.href = '/auth/login.html';
            return;
        }

        this.apiBaseUrl = '/api';
        this.currentChatId = null;
        this.chats = [];

        this.initElements();
        this.initEventListeners();
        this.loadUserInfo();
        this.loadChats();
    }

    initElements() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.mobileMenuToggle = document.getElementById('mobileMenuToggle');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.chatList = document.getElementById('chatList');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.userName = document.getElementById('userName');

        this.chatTitle = document.getElementById('chatTitle');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messages = document.getElementById('messages');
        this.welcomeMessage = document.getElementById('welcomeMessage');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.charCount = document.getElementById('charCount');
    }

    initEventListeners() {
        this.newChatBtn?.addEventListener('click', () => this.createNewChat());
        this.logoutBtn?.addEventListener('click', () => window.authManager.logout());
        this.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        this.mobileMenuToggle?.addEventListener('click', () => this.toggleSidebar());

        this.sendBtn?.addEventListener('click', () => this.sendMessage());

        this.messageInput?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && event.ctrlKey) {
                event.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput?.addEventListener('input', () => {
            this.updateCharCount();
            this.autoResizeTextarea();
        });
    }

    toggleSidebar() {
        this.sidebar?.classList.toggle('collapsed');
    }

    updateCharCount() {
        if (!this.charCount || !this.messageInput) return;
        const length = this.messageInput.value.length;
        this.charCount.textContent = `${length} / 4000`;
    }

    autoResizeTextarea() {
        if (!this.messageInput) return;
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = `${this.messageInput.scrollHeight}px`;
    }

    async loadUserInfo() {
        try {
            const response = await window.authManager.fetchWithAuth(`${this.apiBaseUrl}/auth/me`);
            const user = await response.json();
            if (this.userName) {
                this.userName.textContent = user.username || user.email;
            }
        } catch (error) {
            console.error('Failed to load user info:', error);
        }
    }

    async loadChats() {
        try {
            const response = await window.authManager.fetchWithAuth(`${this.apiBaseUrl}/chats`);
            this.chats = await response.json();
            this.renderChatList();
        } catch (error) {
            console.error('Failed to load chats:', error);
            this.showError('Fehler beim Laden der Chats');
        }
    }

    renderChatList() {
        if (!this.chatList) return;
        this.chatList.innerHTML = '';

        if (!this.chats.length) {
            this.chatList.innerHTML = '<div class="empty-state">Noch keine Chats</div>';
            return;
        }

        this.chats.forEach((chat) => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            if (chat.id === this.currentChatId) {
                chatItem.classList.add('active');
            }

            chatItem.innerHTML = `
                <div class="chat-item-content" data-chat-id="${chat.id}">
                    <div class="chat-item-title">${this.escapeHtml(chat.title)}</div>
                    <div class="chat-item-preview">${chat.last_message ? this.escapeHtml(chat.last_message) : 'Kein Inhalt'}</div>
                    <div class="chat-item-date">${this.formatDate(chat.updated_at)}</div>
                </div>
                <div class="chat-item-actions">
                    <button class="btn-icon" data-action="delete" data-chat-id="${chat.id}" title="Löschen">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                    </button>
                </div>
            `;

            const content = chatItem.querySelector('.chat-item-content');
            content?.addEventListener('click', () => this.loadChat(chat.id));

            const deleteBtn = chatItem.querySelector('[data-action="delete"]');
            deleteBtn?.addEventListener('click', (event) => {
                event.stopPropagation();
                this.deleteChat(chat.id);
            });

            this.chatList.appendChild(chatItem);
        });
    }

    async createNewChat() {
        try {
            const response = await window.authManager.fetchWithAuth(`${this.apiBaseUrl}/chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: 'Neuer Chat' })
            });

            if (!response.ok) throw new Error('Chat konnte nicht erstellt werden');

            const newChat = await response.json();
            this.chats.unshift(newChat);
            this.renderChatList();
            this.loadChat(newChat.id);
        } catch (error) {
            console.error('Failed to create chat:', error);
            this.showError('Fehler beim Erstellen des Chats');
        }
    }

    async loadChat(chatId) {
        try {
            const response = await window.authManager.fetchWithAuth(`${this.apiBaseUrl}/chats/${chatId}`);
            if (!response.ok) throw new Error('Chat konnte nicht geladen werden');

            const chat = await response.json();
            this.currentChatId = chatId;
            if (this.chatTitle) {
                this.chatTitle.textContent = chat.title;
            }

            if (this.welcomeMessage) {
                this.welcomeMessage.style.display = 'none';
            }

            if (this.messages) {
                this.messages.innerHTML = '';
                chat.messages.forEach((msg) => this.addMessageToUI(msg.content, msg.role, new Date(msg.created_at)));
            }

            this.scrollToBottom();
            this.highlightActiveChat(chatId);
        } catch (error) {
            console.error('Failed to load chat:', error);
            this.showError('Fehler beim Laden des Chats');
        }
    }

    highlightActiveChat(chatId) {
        document.querySelectorAll('.chat-item').forEach((item) => item.classList.remove('active'));
        const activeItem = document.querySelector(`[data-chat-id="${chatId}"]`)?.closest('.chat-item');
        activeItem?.classList.add('active');
    }

    async deleteChat(chatId) {
        if (!window.confirm('Chat wirklich löschen?')) return;

        try {
            const response = await window.authManager.fetchWithAuth(`${this.apiBaseUrl}/chats/${chatId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Chat konnte nicht gelöscht werden');

            this.chats = this.chats.filter((chat) => chat.id !== chatId);
            this.renderChatList();

            if (this.currentChatId === chatId) {
                this.currentChatId = null;
                if (this.messages) this.messages.innerHTML = '';
                if (this.welcomeMessage) this.welcomeMessage.style.display = 'block';
                if (this.chatTitle) this.chatTitle.textContent = 'AI Chat Assistant';
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
            this.showError('Fehler beim Löschen des Chats');
        }
    }

    async sendMessage() {
        if (!this.currentChatId || !this.messageInput || !this.sendBtn) {
            this.showError('Bitte wähle zuerst einen Chat aus');
            return;
        }

        const message = this.messageInput.value.trim();
        if (!message) return;

        this.messageInput.disabled = true;
        this.sendBtn.disabled = true;

        this.addMessageToUI(message, 'user', new Date());
        this.messageInput.value = '';
        this.updateCharCount();
        this.autoResizeTextarea();

        const typingIndicator = this.showTypingIndicator();

        try {
            const response = await window.authManager.fetchWithAuth(
                `${this.apiBaseUrl}/chats/${this.currentChatId}/messages/stream`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: message })
                }
            );

            if (!response?.ok || !response.body) throw new Error('Netzwerkfehler');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';
            let messageElement = null;

            this.removeTypingIndicator(typingIndicator);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.content) {
                            assistantMessage += data.content;
                            if (!messageElement) {
                                messageElement = this.addMessageToUI('', 'assistant', new Date());
                            }
                            const contentElement = messageElement.querySelector('.message-content');
                            if (contentElement) contentElement.textContent = assistantMessage;
                            this.scrollToBottom();
                        }
                        if (data.error) {
                            throw new Error(data.error);
                        }
                    } catch (error) {
                        console.error('Stream parse error:', error);
                    }
                }
            }

            await this.loadChats();
        } catch (error) {
            console.error('Error sending message:', error);
            this.removeTypingIndicator(typingIndicator);
            this.showError('Fehler beim Senden der Nachricht');
        } finally {
            this.messageInput.disabled = false;
            this.sendBtn.disabled = false;
            this.messageInput.focus();
        }
    }

    addMessageToUI(content, role, timestamp) {
        if (!this.messages) return null;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(content)}</div>
            <div class="message-time">${this.formatTime(timestamp)}</div>
        `;

        this.messages.appendChild(messageDiv);
        this.scrollToBottom();
        return messageDiv;
    }

    showTypingIndicator() {
        if (!this.messages) return null;
        const indicator = document.createElement('div');
        indicator.className = 'message assistant';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;
        this.messages.appendChild(indicator);
        this.scrollToBottom();
        return indicator;
    }

    removeTypingIndicator(indicator) {
        if (indicator && indicator.remove) {
            indicator.remove();
        } else {
            document.getElementById('typingIndicator')?.remove();
        }
    }

    showError(message) {
        if (!this.messagesContainer) return;
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        this.messagesContainer.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 4000);
    }

    scrollToBottom() {
        if (!this.messagesContainer) return;
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text ?? '';
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Heute';
        if (diffDays === 1) return 'Gestern';
        if (diffDays < 7) return `vor ${diffDays} Tagen`;

        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    }

    formatTime(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new ChatApp());
