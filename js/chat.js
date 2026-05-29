// ─── 3C Boardroom HQ — Caelum Chat ───────────────────────────────────────────

let currentSessionId    = null;
let conversationHistory = [];
let isStreaming         = false;
let latestMinutes       = null;
let activeSkillContext  = '';

// ── SKILL MAP — keyword → folder name ────────────────────────────────────────
const SKILL_MAP = {
    campaign:   'Campaign Strategy',
    youtube:    'Campaign Strategy',
    tiktok:     'Campaign Strategy',
    shorts:     'Campaign Strategy',
    video:      'Campaign Strategy',
    brand:      'Brand Voice',
    voice:      'Brand Voice',
    copy:       'Brand Voice',
    tone:       'Brand Voice',
    post:       'Brand Voice',
    caption:    'Brand Voice',
    aurion:     'Character Files',
    jan:        'Character Files',
    character:  'Character Files',
    persona:    'Character Files',
    falcon:     'Member Personas',
    panther:    'Member Personas',
    wolf:       'Member Personas',
    lion:       'Member Personas',
    member:     'Member Personas',
    minutes:    'Boardroom Minutes',
    session:    'Boardroom Minutes',
    audit:      'Skills Library',
    skill:      'Skills Library',
    research:   'Skills Library',
};

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
    activeSkillContext  = '';

    document.getElementById('sessionLabel').textContent =
        'Session: ' + session.title;

    // Clear chat
    const messages = document.getElementById('chatMessages');
    messages.innerHTML = `
        <div class="welcome-message">
            <p>Hey, Creative Captains! Caelum here,</p>
            <p>Ready when you are. What are we working on?</p>
            <p class="caelum-sign">— Caelum</p>
        </div>
    `;

    // Auto-load latest minutes into session
    latestMinutes = await supabaseAPI.getLatestMinutes();
    if (latestMinutes) {
        showMinutesCard(latestMinutes);
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

    // Strip markdown for preview
    const plain = minutes.content
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/- \[ \]/g, '☐')
        .replace(/- \[x\]/gi, '☑')
        .replace(/^\s*[-*]\s/gm, '')
        .trim();

    document.getElementById('minutesCardPreview').textContent =
        plain.substring(0, 120) + (plain.length > 120 ? '…' : '');
}

// ── MINUTES POPUP ─────────────────────────────────────────────────────────────
function openMinutesPopup() {
    if (!latestMinutes) return;

    const date = new Date(latestMinutes.session_date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    document.getElementById('minutesPopupTitle').textContent =
        `Session ${latestMinutes.session_number} — ${latestMinutes.title}`;

    document.getElementById('minutesPopupMeta').textContent =
        `${date} · Status: ${latestMinutes.status}`;

    // Render markdown beautifully
    document.getElementById('minutesPopupBody').innerHTML =
        marked.parse(latestMinutes.content);

    // Render checkboxes interactively
    document.getElementById('minutesPopupBody')
        .querySelectorAll('input[type="checkbox"]')
        .forEach(cb => cb.setAttribute('disabled', 'true'));

    document.getElementById('minutesPopupOverlay').classList.add('active');
    document.getElementById('minutesPopup').classList.add('active');
}

function closeMinutesPopup() {
    document.getElementById('minutesPopupOverlay').classList.remove('active');
    document.getElementById('minutesPopup').classList.remove('active');
}

// ── SKILL DETECTION ───────────────────────────────────────────────────────────
async function detectAndLoadSkill(message) {
    const lower = message.toLowerCase();
    let matchedFolder = null;

    for (const [keyword, folderName] of Object.entries(SKILL_MAP)) {
        if (lower.includes(keyword)) {
            matchedFolder = folderName;
            break;
        }
    }

    if (!matchedFolder) return '';

    // Find the folder in Supabase
    const folders = await supabaseAPI.getFolders();
    const folder  = folders.find(f => f.name === matchedFolder);
    if (!folder) return '';

    // Fetch files from that folder
    const files = await supabaseAPI.getFiles(folder.id);
    if (!files.length) return '';

    // Show skill indicator
    showSkillIndicator(matchedFolder);

    // Combine file contents as skill context
    const skillText = files.map(f => `[${f.title}]\n${f.content}`).join('\n\n');
    return `\n\n--- CAELUM SKILL LOADED: ${matchedFolder} ---\n${skillText.substring(0, 2000)}`;
}

function showSkillIndicator(skillName) {
    const indicator = document.getElementById('skillIndicator');
    const text      = document.getElementById('skillIndicatorText');
    text.textContent = `Reading: ${skillName}`;
    indicator.style.display = 'flex';
    setTimeout(() => { indicator.style.display = 'none'; }, 4000);
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

    // Detect skill and load context
    const skillContext = await detectAndLoadSkill(content);

    // Build minutes context
    const minutesContext = latestMinutes
        ? `\n\n--- BOARDROOM MINUTES (Session ${latestMinutes.session_number}) ---\n${latestMinutes.content.substring(0, 1500)}`
        : '';

    await streamCaelumResponse(minutesContext + skillContext);
}

// ── KEYBOARD HANDLER ──────────────────────────────────────────────────────────
function handleChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// ── STREAM RESPONSE ───────────────────────────────────────────────────────────
async function streamCaelumResponse(context = '') {
    isStreaming = true;
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;

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
                minutesContext: context
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
                } catch (_) {}
            }
        }

    } catch (err) {
        console.error('❌ Stream error:', err);
        bubble.textContent = '⚠️ Check that WORKER_URL is set in config.js and the Worker is deployed.';
        fullResponse = bubble.textContent;
    }

    bubble.classList.remove('streaming');
    isStreaming    = false;
    sendBtn.disabled = false;

    if (fullResponse) {
        conversationHistory.push({ role: 'assistant', content: fullResponse });
        await supabaseAPI.saveMessage(currentSessionId, 'assistant', fullResponse);
    }
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────
function appendMessage(role, content) {
    const container = document.getElementById('chatMessages');

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
