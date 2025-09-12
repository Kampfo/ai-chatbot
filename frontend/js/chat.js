class ChatApp {
    constructor() {
        this.sessionId = null;
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.charCount = document.getElementById('charCount');
        this.statusElement = document.querySelector('.status-text');
        this.statusDot = document.querySelector('.status-dot');
        this.agentSelect = document.getElementById('agentSelect');
        
        this.initEventListeners();
        this.checkHealth();
    }
    
    initEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.messageInput.addEventListener('input', () => {
            const length = this.messageInput.value.length;
            this.charCount.textContent = `${length} / 4000`;
        });
    }
    
    async checkHealth() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                this.setStatus('online');
            } else {
                this.setStatus('offline');
            }
        } catch (error) {
            this.setStatus('offline');
        }
    }
    
    setStatus(status) {
        if (status === 'online') {
            this.statusElement.textContent = 'Verbunden';
            this.statusDot.style.background = '#4ade80';
        } else {
            this.statusElement.textContent = 'Getrennt';
            this.statusDot.style.background = '#ef4444';
        }
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;
        
        // Disable input
        this.messageInput.disabled = true;
        this.sendButton.disabled = true;
        
        // Add user message
        this.addMessage(message, 'user');
        
        // Clear input
        this.messageInput.value = '';
        this.charCount.textContent = '0 / 4000';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Send message to API
            const agent = this.agentSelect ? this.agentSelect.value : null;

            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: this.sessionId,
                    agent: agent
                })
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            // Handle streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';
            let messageElement = null;
            
            // Remove typing indicator
            this.removeTypingIndicator();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.session_id && !this.sessionId) {
                                this.sessionId = data.session_id;
                            }
                            
                            if (data.content) {
                                assistantMessage += data.content;
                                
                                if (!messageElement) {
                                    messageElement = this.addMessage('', 'assistant');
                                }
                                
                                messageElement.querySelector('.message-content').textContent = assistantMessage;
                                this.scrollToBottom();
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('Error:', error);
            this.removeTypingIndicator();
            this.showError('Fehler beim Senden der Nachricht. Bitte versuchen Sie es erneut.');
        } finally {
            // Re-enable input
            this.messageInput.disabled = false;
            this.sendButton.disabled = false;
            this.messageInput.focus();
        }
    }
    
    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv;
    }
    
    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message assistant';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        this.chatMessages.appendChild(indicator);
        this.scrollToBottom();
    }
    
    removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
