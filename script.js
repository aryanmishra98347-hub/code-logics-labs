// script.js - PRODUCTION READY
// DOM Elements
const sidebar = document.getElementById('sidebar');
const newChatBtn = document.getElementById('newChatBtn');
const chatMessages = document.getElementById('chatMessages');
const welcomeScreen = document.getElementById('welcomeScreen');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const recBtns = document.querySelectorAll('.rec-btn');
const chatHistory = document.getElementById('chatHistory');

let chats = JSON.parse(localStorage.getItem('codeLogicsLabsChats')) || [];
let currentChatId = null;
let isTyping = false;
let typingTimer;

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://code-logics-labs-backend.onrender.com';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderChatHistory();
    setupEventListeners();
    loadLastChatOrShowWelcome();
    updateSendButtonState();
});

// Event Listeners
function setupEventListeners() {
    // Send message
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    messageInput.addEventListener('input', () => {
        updateSendButtonState();
        clearTimeout(typingTimer);
        typingTimer = setTimeout(updateSendButtonState, 300);
    });
    
    sendBtn.addEventListener('click', sendMessage);
    
    // New chat
    newChatBtn.addEventListener('click', newChat);
    
    // Recommendation buttons
    recBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            messageInput.value = prompt;
            messageInput.focus();
            updateSendButtonState();
            sendMessage();
        });
    });
    
    // Auth buttons
    setupAuthButtons();
    
    // Auto-resize textarea
    messageInput.addEventListener('input', autoResize);
}

// Update send button state
function updateSendButtonState() {
    const hasText = messageInput.value.trim().length > 0;
    sendBtn.disabled = !hasText || isTyping;
}

// Auto-resize textarea
function autoResize() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isTyping) return;

    // Create new chat if needed
    if (!currentChatId) {
        createNewChat(message);
    } else {
        appendMessage(message, 'user');
        saveMessageToCurrentChat(message, 'user');
    }

    messageInput.value = '';
    messageInput.style.height = 'auto';
    updateSendButtonState();
    hideWelcome();

    showTypingIndicator();

    // Call your backend API
fetch(`${API_BASE_URL}/api/code/generate`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: message })
})
.then(response => response.json())
.then(data => {
    hideTypingIndicator();
    const aiResponse = data.code || 'Sorry, I could not generate a response.';
    appendMessage(aiResponse, 'ai');
    saveMessageToCurrentChat(aiResponse, 'ai');
    updateCurrentChatTitle();
    renderChatHistory();
    saveChats();
})
.catch(error => {
    hideTypingIndicator();
    console.error('Error:', error);
    appendMessage('Sorry, there was an error connecting to the AI. Please try again.', 'ai');
});
}

function getCodingResponses(message) {
    return [
        `Excellent question about ${message.split(' ')[0]}! Here's a complete professional solution:

\`\`\`javascript
// Professional quicksort implementation
function quicksort(arr) {
    if (arr.length <= 1) return arr;
    const pivot = arr[Math.floor(arr.length / 2)];
    const left = [];
    const right = [];
    
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] < pivot) left.push(arr[i]);
        else right.push(arr[i]);
    }
    
    return [...quicksort(left), pivot, ...quicksort(right)];
}
\`\`\`

**Time Complexity**: O(n log n) average, O(n²) worst  
**Space Complexity**: O(log n)

Want optimizations or test cases? 🚀`,

        `React useEffect debugging from Code Logics Labs:

**Common causes of infinite loops:**
1. Missing dependencies
2. Calling setState inside useEffect without proper deps
3. Async operations triggering re-renders

**Fixed pattern:**
\`\`\`jsx
useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
        const data = await apiCall();
        if (mounted) setState(data);
    };
    
    fetchData();
    
    return () => { mounted = false; };
}, [dependency1, dependency2]);
\`\`\`

Share your exact code for precise debugging! 🔍`,

        `Complete Node.js REST API boilerplate:

\`\`\`javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
\`\`\`

Ready for production with proper error handling, validation, and middleware!`
    ];
}

function createNewChat(firstMessage) {
    currentChatId = Date.now().toString();
    chats.push({ 
        id: currentChatId, 
        title: firstMessage.slice(0, 40) + '...', 
        messages: [] 
    });
    appendMessage(firstMessage, 'user');
    saveMessageToCurrentChat(firstMessage, 'user');
}

function appendMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = `avatar ${sender}`;
    avatar.innerHTML = sender === 'user' ? 'You' : '<i class="fas fa-robot"></i>';

    const content = document.createElement('div');
    content.className = 'message-content';
    
    // Format message properly
    if (sender === 'ai') {
        content.innerHTML = formatAIResponse(text);
    } else {
        content.innerHTML = text.replace(/\n/g, '<br>');
    }

    if (sender === 'user') {
        messageDiv.appendChild(content);
        messageDiv.appendChild(avatar);
    } else {
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Animate in
    requestAnimationFrame(() => {
        messageDiv.style.animationDelay = '0.1s';
        messageDiv.style.opacity = '1';
    });
}

function showTypingIndicator() {
    isTyping = true;
    updateSendButtonState();
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai';
    typingDiv.innerHTML = `
        <div class="avatar ai"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    isTyping = false;
    updateSendButtonState();
    const typing = document.querySelector('.typing-indicator');
    if (typing) typing.closest('.message').remove();
}

function saveMessageToCurrentChat(text, sender) {
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (currentChat) {
        currentChat.messages.push({ 
            text, 
            sender, 
            timestamp: new Date() 
        });
    }
}

function newChat() {
    chatMessages.innerHTML = '';
    welcomeScreen.style.display = 'flex';
    chatMessages.style.display = 'none';
    currentChatId = null;
    sidebar.classList.remove('open');
}

function hideWelcome() {
    welcomeScreen.style.display = 'none';
    chatMessages.style.display = 'block';
}

function loadLastChatOrShowWelcome() {
    if (chats.length > 0) {
        loadChat(chats[chats.length - 1].id);
    }
}

function renderChatHistory() {
    if (chats.length === 0) {
        chatHistory.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <p>No chats yet. Start coding!</p>
            </div>
        `;
        return;
    }

    chatHistory.innerHTML = '';
    chats.slice(-8).forEach(chat => { // Show last 8 chats
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatItem.innerHTML = `
            <div class="chat-item-icon">
                <i class="fas fa-code"></i>
            </div>
            <div class="chat-item-content">
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-preview">${chat.messages[chat.messages.length - 1]?.text.slice(0, 50)}...</div>
            </div>
        `;
        chatItem.addEventListener('click', () => loadChat(chat.id));
        chatHistory.appendChild(chatItem);
    });
}

function loadChat(chatId) {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    chatMessages.innerHTML = '';
    hideWelcome();
    
    chat.messages.forEach(msg => {
        appendMessage(msg.text, msg.sender);
    });
    
    renderChatHistory();
    chatMessages.scrollTop = chatMessages.scrollHeight;
    sidebar.classList.remove('open');
}

function updateCurrentChatTitle() {
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (currentChat && currentChat.messages.length >= 1) {
        currentChat.title = currentChat.messages[0].text.slice(0, 40) + '...';
        renderChatHistory();
    }
}

function saveChats() {
    localStorage.setItem('codeLogicsLabsChats', JSON.stringify(chats));
}

function setupAuthButtons() {
    document.getElementById('signupBtn').addEventListener('click', () => {
        // Replace with your auth modal/API
        console.log('Sign up clicked - connect backend');
    });
    
    document.getElementById('loginBtn').addEventListener('click', () => {
        // Replace with your auth modal/API
        console.log('Login clicked - connect backend');
    });
}

// Format AI response with proper markdown-style rendering
function formatAIResponse(text) {
    // Convert markdown code blocks to HTML
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'plaintext';
        return `<div class="code-block">
            <div class="code-header">
                <span class="code-lang">${language}</span>
                <button class="copy-btn" onclick="copyCode(this)">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
            <pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>
        </div>`;
    });
    
    // Convert inline code
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Convert headers
    text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Convert bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert lists
    text = text.replace(/^- (.*$)/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Convert checkmarks and emojis (keep them as-is)
    
    // Convert line breaks
    text = text.replace(/\n\n/g, '</p><p>');
    text = text.replace(/\n/g, '<br>');
    
    // Wrap in paragraphs
    text = '<p>' + text + '</p>';
    
    // Clean up empty paragraphs
    text = text.replace(/<p><\/p>/g, '');
    text = text.replace(/<p><br><\/p>/g, '');
    
    return text;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Copy code to clipboard
window.copyCode = function(button) {
    const codeBlock = button.closest('.code-block');
    const code = codeBlock.querySelector('code').textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
    });
};