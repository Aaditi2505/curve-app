const ChatWidget = {
    isOpen: false,
    branch: localStorage.getItem('branch') || 'General',
    role: localStorage.getItem('role') || 'User', // Default strict role
    refreshInterval: null,

    init() {
        // Create widget HTML if not exists
        if (!document.getElementById('chat-widget')) {
            const widget = document.createElement('div');
            widget.id = 'chat-widget';
            widget.className = 'chat-widget closed';
            widget.innerHTML = `
                <div class="chat-widget-header" onclick="ChatWidget.toggle()">
                    <div class="header-info">
                        <h3>Team Chat</h3>
                        <span class="status-dot"></span>
                    </div>
                    <button class="minimize-btn">−</button>
                </div>
                <div class="chat-widget-body" id="chat-messages">
                    <!-- Messages go here -->
                </div>
                <div class="chat-widget-input">
                    <input type="file" id="widget-file-input" hidden onchange="ChatWidget.handleUpload(this)">
                    <button class="icon-btn" onclick="document.getElementById('widget-file-input').click()">📎</button>
                    <input type="text" id="widget-input" placeholder="Type a message..." onkeypress="if(event.key==='Enter') ChatWidget.send()">
                    <button class="icon-btn send-btn-widget" onclick="ChatWidget.send()">➤</button>
                </div>
            `;
            document.body.appendChild(widget);
        }

        // Strict Role Display Logic
        // If role string contains 'admin' (case insensitive), display 'Administrator'
        // Otherwise default to 'User'
        if (this.role.toUpperCase().includes('ADMIN')) {
            this.roleDisplay = 'Administrator';
        } else {
            this.roleDisplay = 'User';
        }

        // Start polling
        this.startPolling();
    },

    toggle() {
        this.isOpen = !this.isOpen;
        const widget = document.getElementById('chat-widget');
        if (this.isOpen) {
            widget.classList.remove('closed');
            widget.classList.add('open');
            this.loadMessages();
            this.scrollToBottom();
        } else {
            widget.classList.remove('open');
            widget.classList.add('closed');
        }
    },

    async loadMessages() {
        if (!this.isOpen) return;
        const container = document.getElementById('chat-messages');

        try {
            const res = await fetch(`/api/chat/${encodeURIComponent(this.branch)}`);
            const messages = await res.json();

            // Simple diff check could go here, but full render is safer for now
            container.innerHTML = '';

            if (messages.length === 0) {
                container.innerHTML = '<div class="chat-welcome">Start the conversation...</div>';
                return;
            }

            messages.forEach(msg => {
                const isOwn = msg.userType === this.role; // Match against stored role
                // Display Name Logic
                const displayName = msg.userType.toUpperCase().includes('ADMIN') ? 'Administrator' : 'User';

                const msgDiv = document.createElement('div');
                msgDiv.className = `widget-message ${isOwn ? 'own' : 'other'}`;

                // Content interaction
                let content = msg.message;
                if (content.startsWith('[IMAGE]')) {
                    const src = content.replace('[IMAGE] ', '');
                    content = `<img src="${src}" class="chat-img-preview" onclick="window.open('${src}')">`;
                }

                // Delete Menu (Only for Admin)
                let menuHtml = '';
                if (this.role.toUpperCase().includes('ADMIN')) {
                    menuHtml = `
                    <div class="msg-menu-btn" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('show')">⋮</div>
                    <div class="msg-menu-dropdown">
                        <div onclick="ChatWidget.deleteMsg(${msg.id})">Delete</div>
                        <div onclick="alert('View Info')">View</div>
                    </div>`;
                }

                msgDiv.innerHTML = `
                    ${!isOwn ? `<div class="msg-author">${displayName}</div>` : ''}
                    <div class="msg-content">${content}</div>
                    <div class="msg-meta">
                        ${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    ${menuHtml}
                `;

                container.appendChild(msgDiv);
            });

        } catch (e) {
            console.error('Chat load error', e);
        }
    },

    startPolling() {
        this.refreshInterval = setInterval(() => this.loadMessages(), 3000);
    },

    async send() {
        const input = document.getElementById('widget-input');
        const text = input.value.trim();
        if (!text) return;

        try {
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branch: this.branch,
                    userType: this.role,
                    message: text
                })
            });
            input.value = '';
            this.loadMessages();
            setTimeout(() => this.scrollToBottom(), 100);
        } catch (e) {
            console.error('Send failed', e);
        }
    },

    async handleUpload(input) {
        if (input.files && input.files[0]) {
            const formData = new FormData();
            formData.append('files', input.files[0]);

            try {
                const res = await fetch('/upload', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.paths && data.paths.length > 0) {
                    // Send strict image format
                    this.sendRaw(`[IMAGE] ${data.paths[0]}`);
                }
            } catch (e) {
                alert('Upload failed');
            }
        }
    },

    async sendRaw(text) {
        await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                branch: this.branch,
                userType: this.role,
                message: text
            })
        });
        this.loadMessages();
        setTimeout(() => this.scrollToBottom(), 100);
    },

    async deleteMsg(id) {
        if (!confirm('Delete this message?')) return;
        try {
            await fetch(`/api/chat/${encodeURIComponent(this.branch)}/${id}`, { method: 'DELETE' });
            this.loadMessages();
        } catch (e) {
            alert('Delete failed');
        }
    },

    scrollToBottom() {
        const c = document.getElementById('chat-messages');
        c.scrollTop = c.scrollHeight;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // expose to global for onclicks
    window.ChatWidget = ChatWidget;
    ChatWidget.init();
});
