// 3C Boardroom HQ - Caelum Chat

var currentSessionId    = null;
var conversationHistory = [];
var isStreaming         = false;
var latestMinutesMeta   = null;

// SIDEBAR TOGGLE
function toggleSidebar() {
    var sidebar = document.getElementById('chatSidebar');
    var isOpen  = sidebar.classList.contains('open');
    if (isOpen) {
        minimizeSidebar();
    } else {
        sidebar.classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('active');
        if (!currentSessionId) newSession();
        document.getElementById('chatInput').focus();
    }
}

// MINIMIZE - hides panel, session stays alive
function minimizeSidebar() {
    document.getElementById('chatSidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// SESSION MANAGEMENT
async function newSession() {
    var today   = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    var session = await supabaseAPI.createSession('Session — ' + today);
    if (!session) return;

    currentSessionId    = session.id;
    conversationHistory = [];

    latestMinutesMeta = await supabaseAPI.getLatestMinutes();

    var sessionLabel = document.getElementById('sessionLabel');
    if (sessionLabel) sessionLabel.textContent = 'Session: ' + session.title;

    var chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML =
            '<div class="welcome-message">' +
            '<p>Hey Chef. I\'m here.</p>' +
            '<p>Ready when you are — what are we working on today?</p>' +
            '<p class="caelum-sign">— Caelum</p>' +
            '</div>';
    }
}

// SEND MESSAGE
async function sendMessage() {
    if (isStreaming) return;

    var input   = document.getElementById('chatInput');
    var content = input.value.trim();
    if (!content) return;

    if (!currentSessionId) await newSession();

    input.value = '';
    appendMessage('user', content);
    await supabaseAPI.saveMessage(currentSessionId, 'user', content);
    conversationHistory.push({ role: 'user', content: content });

    await streamCaelumResponse();
}

function handleChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// STREAM RESPONSE
async function streamCaelumResponse() {
    isStreaming = true;
    document.getElementById('sendBtn').disabled = true;

    var messageEl = appendMessage('assistant', '');
    var bubble    = messageEl.querySelector('.message-bubble');
    bubble.classList.add('streaming');

    var fullResponse = '';

    try {
        var response = await fetch(WORKER_URL + '/chat', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ messages: conversationHistory })
        });

        if (!response.ok) throw new Error('Worker error: ' + response.status);

        var skill = response.headers.get('X-Caelum-Skill');
        if (skill && skill !== 'none') showSkillIndicator(skill);

        var reader  = response.body.getReader();
        var decoder = new TextDecoder();

        while (true) {
            var result = await reader.read();
            if (result.done) break;

            var chunk = decoder.decode(result.value, { stream: true });
            var lines = chunk.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (!line.startsWith('data: ')) continue;
                var data = line.slice(6).trim();
                if (data === '[DONE]') break;
                try {
                    var parsed = JSON.parse(data);
                    var delta  = (parsed.delta && parsed.delta.text) ? parsed.delta.text : '';
                    if (delta) {
                        fullResponse += delta;
                        bubble.textContent = fullResponse;
                        scrollToBottom();
                    }
                } catch (e) {}
            }
        }

    } catch (err) {
        console.error('Stream error:', err);
        bubble.textContent = 'Worker not deployed yet. Set up the Worker in Cloudflare to activate Caelum.';
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

// SKILL INDICATOR
function showSkillIndicator(skillName) {
    var indicator = document.getElementById('skillIndicator');
    var text      = document.getElementById('skillIndicatorText');
    if (!indicator || !text) return;
    text.textContent = 'Reading: ' + skillName.charAt(0).toUpperCase() + skillName.slice(1);
    indicator.style.display = 'flex';
    setTimeout(function() { indicator.style.display = 'none'; }, 4000);
}

// UI HELPERS
function appendMessage(role, content) {
    var container = document.getElementById('chatMessages');
    var welcome   = container.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    var div = document.createElement('div');
    div.className = 'message ' + role;

    var roleDiv = document.createElement('div');
    roleDiv.className = 'message-role';
    roleDiv.textContent = role === 'user' ? 'Chef Anica' : 'Caelum';

    var bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = content;

    div.appendChild(roleDiv);
    div.appendChild(bubble);
    container.appendChild(div);
    scrollToBottom();
    return div;
}

function scrollToBottom() {
    var c = document.getElementById('chatMessages');
    if (c) c.scrollTop = c.scrollHeight;
}

// ── ARTIFACT PANEL ────────────────────────────────────────────────────────────

var artifactContent   = '';
var artifactTitleText = '';

function openArtifactPanel(title, markdownContent) {
    artifactTitleText = title || 'Document';
    artifactContent   = markdownContent || '';

    var titleEl = document.getElementById('artifactTitle');
    var bodyEl  = document.getElementById('artifactBody');

    if (titleEl) titleEl.textContent = artifactTitleText;
    if (bodyEl)  bodyEl.innerHTML    = marked.parse(artifactContent);

    document.getElementById('artifactPanel').classList.add('open');
    if (bodyEl) bodyEl.scrollTop = 0;
}

function closeArtifactPanel() {
    document.getElementById('artifactPanel').classList.remove('open');
}

function updateArtifactContent(markdownContent) {
    artifactContent = markdownContent || '';
    var bodyEl = document.getElementById('artifactBody');
    if (bodyEl) {
        bodyEl.innerHTML = marked.parse(artifactContent);
        bodyEl.scrollTop = 0;
    }
}

function copyArtifact() {
    var btn = document.getElementById('copyArtifactBtn');
    navigator.clipboard.writeText(artifactContent).then(function() {
        if (btn) {
            btn.textContent = '✓ Copied';
            setTimeout(function() { btn.textContent = '⎘ Copy'; }, 1500);
        }
    }).catch(function(err) {
        console.error('Copy failed:', err);
    });
}

function downloadArtifact() {
    var filename = (artifactTitleText || 'document')
        .replace(/[^a-z0-9\s]/gi, '')
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase() + '.md';

    var blob = new Blob([artifactContent], { type: 'text/markdown' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// MINUTES — fetches from Worker, opens in artifact panel
async function openMinutesArtifact() {
    openArtifactPanel('Loading…', '*Fetching latest boardroom minutes...*');

    var title = 'Boardroom Minutes';

    if (latestMinutesMeta) {
        var date = new Date(latestMinutesMeta.session_date).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        title = 'Session ' + latestMinutesMeta.session_number + ' — ' + latestMinutesMeta.title;
    }

    try {
        var response = await fetch(WORKER_URL + '/minutes/latest');
        var data     = await response.json();
        if (data.content) {
            openArtifactPanel(title, data.content);
        } else {
            openArtifactPanel(title,
                '*No minutes yet. Add your first .md file to boardroom/minutes/ in R2.*');
        }
    } catch (err) {
        openArtifactPanel('Boardroom Minutes',
            '*Worker not deployed yet — minutes unavailable.*');
    }
}
