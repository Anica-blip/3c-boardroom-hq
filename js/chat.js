// 3C Boardroom HQ - Caelum Chat

var currentSessionId    = null;
var conversationHistory = [];
var isStreaming         = false;
var latestMinutesMeta   = null;

// AGENTS - one chat sidebar, one config per agent. Caelum is live.
// Jan and Casey are skeletons (connected: false) until their brains are set up.
var AGENTS = {
    caelum: {
        name: 'Caelum', role: 'Chief Advisor', avatar: 'public/caelum.png', fallback: '🌌',
        placeholder: 'Brief Caelum...', connected: true
    },
    jan: {
        name: 'Jan', role: 'Content & Brand Assistant', avatar: 'public/jan.png', fallback: '✍️',
        placeholder: 'Brief Jan...', connected: false
    },
    casey: {
        name: 'Casey', role: 'Creative Direction', avatar: 'public/casey.png', fallback: '🎬',
        placeholder: 'Brief Casey...', connected: false
    }
};
var currentAgent = 'caelum';
var agentState   = {};   // saved chat per agent while another agent is open

// WORKER ACCESS - every call to the Worker carries the signed-in user's Supabase token
async function workerHeaders(extra) {
    var headers = Object.assign({}, extra || {});
    var result  = await supabaseAPI.client.auth.getSession();
    var session = result && result.data ? result.data.session : null;
    if (session && session.access_token) {
        headers['Authorization'] = 'Bearer ' + session.access_token;
    }
    return headers;
}

function workerAuthMessage(status) {
    if (status === 401) return 'Your session has expired. Please sign in again.';
    if (status === 403) return 'This account does not have access to the Boardroom.';
    return '';
}

// SIDEBAR TOGGLE
function toggleSidebar() {
    var sidebar = document.getElementById('chatSidebar');
    var isOpen  = sidebar.classList.contains('open');
    if (isOpen) {
        minimizeSidebar();
    } else {
        sidebar.classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('active');
        if (AGENTS[currentAgent].connected && !currentSessionId) newSession();
        document.getElementById('chatInput').focus();
    }
}

// OPEN AGENT CHAT - dock buttons. Same agent while open = close.
function openAgentChat(key) {
    if (!AGENTS[key] || isStreaming) return;
    var sidebar = document.getElementById('chatSidebar');
    if (sidebar.classList.contains('open') && key === currentAgent) {
        minimizeSidebar();
        return;
    }
    if (key !== currentAgent) switchAgent(key);
    if (!sidebar.classList.contains('open')) toggleSidebar();
}

function switchAgent(key) {
    var chatMessages = document.getElementById('chatMessages');
    var sessionLabel = document.getElementById('sessionLabel');

    // Save the chat of the agent we are leaving
    agentState[currentAgent] = {
        sessionId: currentSessionId,
        history:   conversationHistory,
        html:      chatMessages.innerHTML,
        label:     sessionLabel ? sessionLabel.textContent : ''
    };

    currentAgent = key;
    var agent = AGENTS[key];

    // Header: avatar, name, role
    var avatar = document.getElementById('sidebarAvatar');
    if (avatar && avatar.tagName === 'IMG') {
        avatar.src = agent.avatar;
        avatar.alt = agent.name;
    } else if (avatar) {
        var img = document.createElement('img');
        img.id        = 'sidebarAvatar';
        img.className = 'sidebar-avatar';
        img.src = agent.avatar;
        img.alt = agent.name;
        img.style.cssText = 'width:38px;height:38px;max-width:38px;max-height:38px;object-fit:cover;border-radius:50%;flex-shrink:0;';
        avatar.replaceWith(img);
    }
    document.getElementById('sidebarName').textContent = agent.name;
    document.getElementById('sidebarRole').textContent = agent.role;
    document.getElementById('chatInput').placeholder   = agent.placeholder;

    // Restore this agent's saved chat, or start fresh
    var saved = agentState[key];
    if (saved) {
        currentSessionId    = saved.sessionId;
        conversationHistory = saved.history;
        chatMessages.innerHTML = saved.html;
        if (sessionLabel) sessionLabel.textContent = saved.label;
        scrollToBottom();
    } else {
        currentSessionId    = null;
        conversationHistory = [];
        chatMessages.innerHTML = welcomeHtml(key);
        if (sessionLabel) sessionLabel.textContent = agent.connected ? 'No active session' : 'Skeleton — not connected yet';
    }
}

function welcomeHtml(key) {
    return '<div class="welcome-message">' +
        '<p>Hey Chef. I\'m here.</p>' +
        '<p>Ready when you are — what are we working on today?</p>' +
        '<p class="caelum-sign">— ' + AGENTS[key].name + '</p>' +
        '</div>';
}

// MINIMIZE - hides panel, session stays alive
function minimizeSidebar() {
    document.getElementById('chatSidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// SESSION MANAGEMENT
async function newSession() {
    // Skeleton agents have no session yet - just clear the chat
    if (!AGENTS[currentAgent].connected) {
        conversationHistory = [];
        document.getElementById('chatMessages').innerHTML = welcomeHtml(currentAgent);
        return;
    }

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
        chatMessages.innerHTML = welcomeHtml(currentAgent);
    }
}

// SEND MESSAGE
async function sendMessage() {
    if (isStreaming) return;

    var input   = document.getElementById('chatInput');
    var content = input.value.trim();
    if (!content) return;

    // Skeleton agent: show the message, answer locally, no Worker call, nothing saved
    if (!AGENTS[currentAgent].connected) {
        input.value = '';
        appendMessage('user', content);
        appendMessage('assistant', AGENTS[currentAgent].name + ' is not connected yet. This chat is the skeleton — the brain gets connected later.');
        return;
    }

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
            headers: await workerHeaders({ 'Content-Type': 'application/json' }),
            body:    JSON.stringify({ messages: conversationHistory })
        });

        if (response.status === 401 || response.status === 403) {
            bubble.textContent = workerAuthMessage(response.status);
            bubble.classList.remove('streaming');
            isStreaming = false;
            document.getElementById('sendBtn').disabled = false;
            return;
        }

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

    // DOCUMENT ROUTING — detect finished deliverable wrapped by Caelum
    var DOC_REGEX = /<<<DOCUMENT_START:([^>]*)>>>([\s\S]*?)<<<DOCUMENT_END>>>/;
    var docMatch  = fullResponse.match(DOC_REGEX);
    if (docMatch) {
        var docTitle   = docMatch[1].trim() || 'Document';
        var docContent = docMatch[2].trim();
        var chatText   = fullResponse.replace(DOC_REGEX, '').trim();
        bubble.textContent = (chatText ? chatText + '\n\n' : '') + '📄 ' + docTitle + ' — ready in the panel.';
        fullResponse = chatText + '\n\n[Document delivered: ' + docTitle + ']';
        openArtifactPanel(docTitle, docContent);
    }

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
    roleDiv.textContent = role === 'user' ? 'Chef Anica' : AGENTS[currentAgent].name;

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

// REPORT - opens the artifact panel. Every agent has one.
// Caelum fetches the latest report from the Worker; Jan and Casey are skeletons for now.
async function openMinutesArtifact() {
    var agent = AGENTS[currentAgent];

    if (!agent.connected) {
        openArtifactPanel(agent.name + ' — Report',
            '*' + agent.name + ' is not connected yet — reports will open here once connected.*');
        return;
    }

    openArtifactPanel('Loading…', '*Fetching latest report...*');

    var title = 'Report';

    if (latestMinutesMeta) {
        title = 'Session ' + latestMinutesMeta.session_number + ' — ' + latestMinutesMeta.title;
    }

    try {
        var response = await fetch(WORKER_URL + '/minutes/latest', { headers: await workerHeaders() });
        if (response.status === 401 || response.status === 403) {
            openArtifactPanel('Report', '*' + workerAuthMessage(response.status) + '*');
            return;
        }
        var data     = await response.json();
        if (data.content) {
            openArtifactPanel(title, data.content);
        } else {
            openArtifactPanel(title,
                '*No report yet. Add your first .md file to boardroom/minutes/ in R2.*');
        }
    } catch (err) {
        openArtifactPanel('Report',
            '*Worker not deployed yet — report unavailable.*');
    }
}
