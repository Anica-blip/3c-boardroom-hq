// ─── 3C Boardroom HQ — Caelum Chat ───────────────────────────────────────────

let currentSessionId    = null;
let conversationHistory = [];
let isStreaming         = false;
let latestMinutesMeta   = null; // metadata from Supabase (no content)

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

    document.getElementById('sessionLabel').textContent = 'Session: ' + session.title;

    document.getElementById('chatMessages').innerHTML = `
        <div class="welcome-message">
            <p>Hey, Creative Captains! Caelum here,</p>
            <p>Ready when you are. What are we working on?</p>
            <p class="caelum-sign">— Caelum</p>
        </div>
    `;

    // Load minutes metadata from Supabase — content fetched from R2 on demand
    latestMinutesMeta = await supabaseAPI.getLatestMinutes();
    if (latestMinutesMeta) {
        showMinutesCard(latestMinutesMeta);
    } else {
        document.getElementById('minutesCard').style.display = 'none';
    }
}

// ── MINUTES CARD ──────────────────────────────────────────────────────────────
function showMinutesCard(minutes) {
    const card = document.getElementById('minutesCard');
    card.style.display = 'block';

    const date = new Date(minutes.session_date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    document.getElementById('minutesCardTitle').textContent =
        `Session ${minutes.session_number} — ${minutes.title}`;
    document.getElementById('minutesCardMeta').textContent =
        `${date} · ${minutes.status === 'open' ? '● Open' : '✓ Closed'}`;
    document.getElementById('minutesCardPreview').textContent =
        'Caelum has read these minutes and is ready to continue.';
}

// ── MINUTES POPUP (fetches content from R2 via worker) ────────────────────────
async function openMinutesPopup() {
    if (!latestMinutesMeta) return;

    document.getElementById('minutesPopupTitle').textContent =
        `Session ${latestMinutesMeta.session_number} — ${latestMinutesMeta.title}`;
    document.getElementById('minutesPopupMeta').textContent =
        new Date(latestMinutesMeta.session_date).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        }) + ' · ' + latestMinutesMeta.status;

    document.getElementById('minutesPopupBody').innerHTML =
        '<p style="color:var(--text-muted);font-style:italic;">Loading minutes...</p>';

    document.getElementById('minutesPopupOverlay').classList.add('active');
    document.getElementById('minutesPopup').classList.add('active');

    // Fetch content from R2 via worker
    try {
        const response = await fetch(`${WORKER_URL}/minutes/latest`);
        const data     = await response.json();
        if (data.content) {
            document.getElementById('minutesPopupBody').innerHTML =
                marked.parse(data.content);
        } else {
            document.getElementById('minutesPopupBody').innerHTML =
                '<p style="color:var(--text-muted);font-style:italic;">No minutes content found in R2.</p>';
        }
    } catch (err) {
        document.getElementById('minutesPopupBody').innerHTML =
            '<p style="color:var(--text-muted);">Could not load minutes. Check Worker is deployed.</p>';
    }
}

function closeMinutesPopup() {
    document.getElementById('minutesPopupOverlay').classList.remove('active');
    document.getElementById('minutesPopup').classList.remove('active');
}

// ── SEND MESSAGE ──────────────────────────────────────────────────────────────
async function sendMessage() {
    if (isStreaming) return;

    const input   = document.getElementById('chatInput');
    const content = input.value.trim();
    if (!content) return;

    if (!currentSessionId) await newSession();

    input.value = '';

    appendMessage('user', content);
    await supabaseAPI.saveMessage(currentSessionId, 'user', content);
    conversationHistory.push({ role: 'user', content });

    // Worker handles all R2 context loading — brain, minutes, skill detection
    await streamCaelumResponse();
}

// ── KEYBOARD HANDLER ──────────────────────────────────────────────────────────
function handleChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// ── STREAM RESPONSE ───────────────────────────────────────────────────────────
async function streamCaelumResponse() {
    isStreaming = true;
    document.getElementById('sendBtn').disabled = true;

    const messageEl = appendMessage('assistant', '');
    const bubble    = messageEl.querySelector('.message-bubble');
    bubble.classList.add('streaming');

    let fullResponse = '';

    try {
        const response = await fetch(`${WORKER_URL}/chat`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ messages: conversationHistory })
        });

        if (!response.ok) throw new Error(`Worker error: ${response.status}`);

        // Show skill indicator if worker loaded a skill
        const skill = response.headers.get('X-Caelum-Skill');
        if (skill && skill !== 'none') showSkillIndicator(skill);

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
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
                } catch (_) {}
            }
        }

    } catch (err) {
        console.error('❌ Stream error:', err);
        bubble.textContent = '⚠️ Check WORKER_URL in config.js and that the Worker is deployed.';
        fullResponse = bubble.textContent;
    }

    bubble.classList.remove('streaming');
    isStreaming = false;
    document.getElementById('sendBtn').disabled = false;

    if (fullResponse) {
        conversationHistory.push({ role: 'assistant', content: fullResponse });
        await supabaseAPI.saveMessage(currentSessionId, 'assistant', fullResponse);
    }
}

// ── SKILL INDICATOR ───────────────────────────────────────────────────────────
function showSkillIndicator(skillName) {
    const indicator = document.getElementById('skillIndicator');
    const text      = document.getElementById('skillIndicatorText');
    const display   = skillName.charAt(0).toUpperCase() + skillName.slice(1);
    text.textContent = `Reading: ${display}`;
    indicator.style.display = 'flex';
    setTimeout(() => { indicator.style.display = 'none'; }, 4000);
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────
function appendMessage(role, content) {
    const container = document.getElementById('chatMessages');
    const welcome   = container.querySelector('.welcome-message');
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
