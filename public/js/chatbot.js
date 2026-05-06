// ─── E-Vote Chatbot Widget (EVA) ────────────────────────────────
(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────────
  let isOpen = false;
  let isLoading = false;
  let messages = [];
  let suggestions = [];

  // ─── Create DOM ─────────────────────────────────────────────────
  function createChatbotDOM() {
    // Floating Action Button
    const fab = document.createElement('button');
    fab.id = 'chatbot-fab';
    fab.className = 'chatbot-fab';
    fab.setAttribute('aria-label', 'Open chatbot');
    fab.innerHTML = `
      <span class="chatbot-fab-icon" id="chatbot-fab-icon">💬</span>
      <span class="chatbot-fab-pulse"></span>
    `;
    fab.addEventListener('click', toggleChat);

    // Chat Window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'chatbot-window';
    chatWindow.className = 'chatbot-window';
    chatWindow.innerHTML = `
      <!-- Header -->
      <div class="chatbot-header">
        <div class="chatbot-header-left">
          <div class="chatbot-avatar">
            <span class="chatbot-avatar-icon">🤖</span>
            <span class="chatbot-online-dot"></span>
          </div>
          <div class="chatbot-header-info">
            <h3 class="chatbot-header-title">EVA</h3>
            <p class="chatbot-header-subtitle">E-Vote Virtual Assistant</p>
          </div>
        </div>
        <div class="chatbot-header-actions">
          <button class="chatbot-header-btn" id="chatbot-clear-btn" aria-label="Clear chat" title="Clear chat">🗑️</button>
          <button class="chatbot-header-btn" id="chatbot-close-btn" aria-label="Close chat" title="Close">✕</button>
        </div>
      </div>

      <!-- Messages Area -->
      <div class="chatbot-messages" id="chatbot-messages">
        <!-- Welcome message injected by JS -->
      </div>

      <!-- Quick Suggestions -->
      <div class="chatbot-suggestions" id="chatbot-suggestions"></div>

      <!-- Input Area -->
      <div class="chatbot-input-area">
        <div class="chatbot-input-wrapper">
          <input
            type="text"
            id="chatbot-input"
            class="chatbot-input"
            placeholder="Ask me anything about E-Vote..."
            maxlength="500"
            autocomplete="off"
          />
          <button id="chatbot-send-btn" class="chatbot-send-btn" aria-label="Send message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <p class="chatbot-powered-by">Powered by E-Vote AI ⚡</p>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(chatWindow);

    // Attach event listeners
    document.getElementById('chatbot-close-btn').addEventListener('click', toggleChat);
    document.getElementById('chatbot-clear-btn').addEventListener('click', clearChat);
    document.getElementById('chatbot-send-btn').addEventListener('click', sendMessage);
    document.getElementById('chatbot-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Show welcome message
    addBotMessage("Hi there! 👋 I'm **EVA**, your E-Vote Assistant.\n\nI can help you with voting, elections, security, verification, and more. Just ask!");

    // Load suggestions
    loadSuggestions();
  }

  // ─── Toggle Chat ────────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    const chatWindow = document.getElementById('chatbot-window');
    const fab = document.getElementById('chatbot-fab');
    const fabIcon = document.getElementById('chatbot-fab-icon');

    if (isOpen) {
      chatWindow.classList.add('chatbot-window-open');
      fab.classList.add('chatbot-fab-active');
      fabIcon.textContent = '✕';
      setTimeout(() => {
        document.getElementById('chatbot-input').focus();
      }, 300);
    } else {
      chatWindow.classList.remove('chatbot-window-open');
      fab.classList.remove('chatbot-fab-active');
      fabIcon.textContent = '💬';
    }
  }

  // ─── Clear Chat ─────────────────────────────────────────────────
  function clearChat() {
    messages = [];
    const messagesContainer = document.getElementById('chatbot-messages');
    messagesContainer.innerHTML = '';
    addBotMessage("Chat cleared! 🧹 How can I help you?");
    showSuggestions();
  }

  // ─── Load Suggestions ──────────────────────────────────────────
  async function loadSuggestions() {
    try {
      const res = await fetch('/api/chatbot/suggestions');
      const data = await res.json();
      if (data.success) {
        suggestions = data.suggestions;
        showSuggestions();
      }
    } catch (err) {
      // Fallback suggestions
      suggestions = [
        'How do I vote?',
        'Is my vote secure?',
        'How to verify my vote?'
      ];
      showSuggestions();
    }
  }

  // ─── Show Suggestions ──────────────────────────────────────────
  function showSuggestions() {
    const container = document.getElementById('chatbot-suggestions');
    if (!suggestions.length) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';
    container.innerHTML = suggestions.map(s =>
      `<button class="chatbot-suggestion-chip" onclick="window.__chatbotSendSuggestion('${s.replace(/'/g, "\\'")}')">${s}</button>`
    ).join('');
  }

  // ─── Hide Suggestions ─────────────────────────────────────────
  function hideSuggestions() {
    const container = document.getElementById('chatbot-suggestions');
    container.style.display = 'none';
  }

  // ─── Send Suggestion (global) ──────────────────────────────────
  window.__chatbotSendSuggestion = function (text) {
    const input = document.getElementById('chatbot-input');
    input.value = text;
    sendMessage();
  };

  // ─── Send Message ──────────────────────────────────────────────
  async function sendMessage() {
    const input = document.getElementById('chatbot-input');
    const text = input.value.trim();
    if (!text || isLoading) return;

    input.value = '';
    hideSuggestions();
    addUserMessage(text);
    showTypingIndicator();

    try {
      const res = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();

      removeTypingIndicator();

      if (data.success) {
        addBotMessage(data.reply);
      } else {
        addBotMessage("Sorry, I couldn't process that. Please try again! 🔄");
      }
    } catch (err) {
      removeTypingIndicator();
      addBotMessage("Oops! Something went wrong. Please check your connection and try again. 🌐");
    }
  }

  // ─── Add User Message ─────────────────────────────────────────
  function addUserMessage(text) {
    const container = document.getElementById('chatbot-messages');
    const msg = document.createElement('div');
    msg.className = 'chatbot-msg chatbot-msg-user animate-chatbot-msg';
    msg.innerHTML = `
      <div class="chatbot-msg-bubble chatbot-msg-bubble-user">
        <p>${escapeHTML(text)}</p>
      </div>
    `;
    container.appendChild(msg);
    scrollToBottom();
  }

  // ─── Add Bot Message ──────────────────────────────────────────
  function addBotMessage(text) {
    const container = document.getElementById('chatbot-messages');
    const msg = document.createElement('div');
    msg.className = 'chatbot-msg chatbot-msg-bot animate-chatbot-msg';
    msg.innerHTML = `
      <div class="chatbot-msg-avatar">🤖</div>
      <div class="chatbot-msg-bubble chatbot-msg-bubble-bot">
        <div>${formatMarkdown(text)}</div>
        <span class="chatbot-msg-time">${getTimeString()}</span>
      </div>
    `;
    container.appendChild(msg);
    scrollToBottom();
  }

  // ─── Typing Indicator ─────────────────────────────────────────
  function showTypingIndicator() {
    isLoading = true;
    const container = document.getElementById('chatbot-messages');
    const typing = document.createElement('div');
    typing.id = 'chatbot-typing';
    typing.className = 'chatbot-msg chatbot-msg-bot animate-chatbot-msg';
    typing.innerHTML = `
      <div class="chatbot-msg-avatar">🤖</div>
      <div class="chatbot-msg-bubble chatbot-msg-bubble-bot chatbot-typing-bubble">
        <div class="chatbot-typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    container.appendChild(typing);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    isLoading = false;
    const typing = document.getElementById('chatbot-typing');
    if (typing) typing.remove();
  }

  // ─── Utilities ─────────────────────────────────────────────────
  function scrollToBottom() {
    const container = document.getElementById('chatbot-messages');
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 50);
  }

  function getTimeString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatMarkdown(text) {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Code blocks
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  // ─── Initialize ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createChatbotDOM);
  } else {
    createChatbotDOM();
  }
})();
