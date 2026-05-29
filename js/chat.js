// ─── 3C Boardroom HQ — Caelum Chat ───────────────────────────────────────────

let currentSessionId  = null;
let conversationHistory = [];
let isStreaming = false;

// ── SIDEBAR TOGGLE ────────────────────────────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById('chatSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const isOpen  = sidebar.classList.contains('open');

    if (isOpen) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        // Auto-start session if none active
        if (!currentSessionId) newSession();
        document.getElementById('chatInput').focus();
    }
}

// ── SESSION MANAGEMENT ────────────────────────────────────────────────────────
async function newSession() {
    const session = await supabaseAPI.createSession(
        'Session — ' + new Date().toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short'
        })
    );
    if (!session) return;

    currentSessionId    = session.id;
    conversationHistory = [];

    document.getElementById('sessionLabel').textContent =
        'Session: ' + session.title;

    // Clear messages and show fresh welcome
    const messages = document.getElementById('chatMessages');
    messages.innerHTML = `
        <div class="welcome-message">
            <p>Hey, Creative Captains! Caelum here,</p>
            <p>Ready when you are. What are we working on?</p>
            <p class="caelum-sign">— Caelum</p>
        </div>
    `;
}

// ── SEND MESSAGE ──────────────────────────────────────────────────────────────
async function sendMessage() {
    if (isStreaming) return;

    const input   = document.getElementById('chatInput');
    const content = input.value.trim();
    if (!content) return;

    if (!currentSessionId) await newSession();

    // Clear input
    input.value = '';

    // Add user message to UI
    appendMessage('user', content);

    // Save to Supabase
    await supabaseAPI.saveMessage(currentSessionId, 'user', content);

    // Build conversation history for API
    conversationHistory.push({ role: 'user', content });

    // Load latest minutes for context
    const minutes = await supabaseAPI.getLatestMinutes();
    const minutesContext = minutes
        ? `\n\n[BOARDROOM MINUTES — Session ${minutes.session_number}]\n${minutes.content.substring(0, 1500)}`
        : '';

    // Stream response
    await streamCaelumResponse(minutesContext);
}

// ── KEYBOARD HANDLER ──────────────────────────────────────────────────────────
function handleChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// ── STREAM RESPONSE ───────────────────────────────────────────────────────────
async function streamCaelumResponse(minutesContext = '') {
    isStreaming = true;
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;

    // Create assistant message bubble
    const messageEl = appendMessage('assistant', '');
    const bubble    = messageEl.querySelector('.message-bubble');
    bubble.classList.add('streaming');

    let fullResponse = '';

    try {
        const response = await fetch(`${WORKER_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: conversationHistory,
                minutesContext
            })
        });

        if (!response.ok) throw new Error(`Worker error: ${response.status}`);

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') break;

                try {
                    const parsed = JSON.parse(data);
                    const delta  = parsed.delta?.text || '';
                    if (delta) {
                        fullResponse += delta;
                        bubble.textContent = fullResponse;
                        scrollToBottom();
                    }
                } catch (_) { /* skip malformed chunks */ }
            }
        }

    } catch (err) {
        console.error('❌ Stream error:', err);
        bubble.textContent = '⚠️ Something went wrong. Check the Worker is deployed and WORKER_URL is set in config.js.';
        fullResponse = bubble.textContent;
    }

    bubble.classList.remove('streaming');
    isStreaming   = false;
    sendBtn.disabled = false;

    if (fullResponse) {
        conversationHistory.push({ role: 'assistant', content: fullResponse });
        await supabaseAPI.saveMessage(currentSessionId, 'assistant', fullResponse);
    }
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────
function appendMessage(role, content) {
    const container = document.getElementById('chatMessages');

    // Remove welcome message on first real message
    const welcome = container.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `
        <div class="message-role">${role === 'user' ? 'Chef Anica' : 'Caelum'}</div>
        <div class="message-bubble">${escapeHtml(content)}</div>
    `;
    container.appendChild(div);
    scrollToBottom();
    return div;
}

function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
