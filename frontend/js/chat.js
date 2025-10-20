class ChatApp {
    constructor() {
        this.sessionId = null;
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.charCount = document.getElementById('charCount');
        this.statusElement = document.querySelector('.status-text');
        this.statusDot = document.querySelector('.status-dot');
        this.uploadButton = document.getElementById('uploadButton');
        this.fileInput = document.getElementById('fileInput');
        this.filesSection = document.getElementById('filesSection');
        this.filesList = document.getElementById('filesList');

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

        // File upload listeners
        this.uploadButton.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.uploadFile(e.target.files[0]);
                e.target.value = ''; // Reset input
            }
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
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: this.sessionId
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
                                // Load files for this session
                                this.loadFiles();
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

    async uploadFile(file) {
        // Validate file
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            this.showError('Bitte nur PDF-Dateien hochladen.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showError('Datei ist zu groß. Maximum 10MB.');
            return;
        }

        // Ensure we have a session ID
        if (!this.sessionId) {
            this.sessionId = this.generateSessionId();
        }

        // Disable upload button
        this.uploadButton.disabled = true;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('session_id', this.sessionId);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Upload fehlgeschlagen');
            }

            const result = await response.json();

            // Show success message in chat
            this.showSystemMessage(`PDF "${result.filename}" hochgeladen und verarbeitet.`);

            // Refresh file list
            await this.loadFiles();

        } catch (error) {
            console.error('Upload error:', error);
            this.showError(`Fehler beim Hochladen: ${error.message}`);
        } finally {
            this.uploadButton.disabled = false;
        }
    }

    async loadFiles() {
        if (!this.sessionId) return;

        try {
            const response = await fetch(`/api/files/${this.sessionId}`);
            if (!response.ok) return;

            const data = await response.json();

            if (data.files && data.files.length > 0) {
                this.displayFiles(data.files);
            } else {
                this.filesSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }

    displayFiles(files) {
        this.filesList.innerHTML = '';

        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            if (!file.processed) {
                fileItem.classList.add('processing');
            }

            const statusIcon = file.processed ? '✓' : '⏳';
            const fileSize = this.formatFileSize(file.file_size);

            fileItem.innerHTML = `
                <span class="file-status-icon">${statusIcon}</span>
                <span class="file-item-name" title="${file.filename}">${file.filename}</span>
                <span class="file-item-size">${fileSize}</span>
                <button class="file-delete" onclick="chatApp.deleteFile('${file.id}')" title="Löschen">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            `;

            this.filesList.appendChild(fileItem);
        });

        this.filesSection.style.display = 'block';
    }

    async deleteFile(fileId) {
        try {
            const response = await fetch(`/api/files/${fileId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Löschen fehlgeschlagen');
            }

            this.showSystemMessage('Datei gelöscht.');
            await this.loadFiles();

        } catch (error) {
            console.error('Delete error:', error);
            this.showError(`Fehler beim Löschen: ${error.message}`);
        }
    }

    showSystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.color = '#6b7280';
        messageDiv.style.fontSize = '12px';
        messageDiv.style.margin = '8px 0';
        messageDiv.textContent = message;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    generateSessionId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// Initialize app when DOM is ready
let chatApp;
document.addEventListener('DOMContentLoaded', () => {
    chatApp = new ChatApp();
});
