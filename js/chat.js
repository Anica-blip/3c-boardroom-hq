/* ─── 3C Boardroom HQ — Chat Sidebar ──────────────────────────────────────── */

.chat-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sidebar-w);
    max-width: 100vw;
    height: 100vh;
    background: rgba(8, 5, 24, 0.97);
    border-right: 1px solid rgba(168, 85, 247, 0.2);
    display: flex;
    flex-direction: column;
    z-index: 500;
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(22px);
    box-shadow: 20px 0 60px rgba(0,0,0,0.55);
}
.chat-sidebar.open { transform: translateX(0); }

.sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.2);
    z-index: 499;
}
.sidebar-overlay.active { display: block; }

/* ── SIDEBAR HEADER ────────────────────────────────────────────────────────── */
.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.9rem 1.1rem;
    border-bottom: 1px solid rgba(168, 85, 247, 0.15);
    background: rgba(88, 28, 135, 0.1);
    flex-shrink: 0;
}

.sidebar-title { display: flex; align-items: center; gap: 0.65rem; }

.sidebar-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(168, 85, 247, 0.4);
    flex-shrink: 0;
}

.sidebar-name { font-size: 0.9rem; color: var(--text-primary); font-weight: 600; letter-spacing: 0.03em; }
.sidebar-role { font-size: 0.6rem; color: var(--purple-light); letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.7; }

.sidebar-controls { display: flex; align-items: center; gap: 0.35rem; }

/* All sidebar control buttons — shared base */
.btn-minutes,
.btn-new-session,
.btn-minimize,
.btn-close-sidebar {
    appearance: none;
    -webkit-appearance: none;
    background: rgba(20, 12, 50, 0.8);
    border: 1px solid rgba(168, 85, 247, 0.2);
    border-radius: 6px;
    color: rgba(226, 217, 243, 0.55);
    width: 30px;
    height: 30px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    line-height: 1;
    padding: 0;
    font-family: inherit;
}

.btn-minutes:hover     { border-color: rgba(168, 85, 247, 0.5); color: var(--purple-light); background: rgba(88, 28, 135, 0.3); }
.btn-new-session:hover { border-color: rgba(168, 85, 247, 0.5); color: var(--purple-light); background: rgba(88, 28, 135, 0.3); }
.btn-minimize:hover    { border-color: rgba(168, 85, 247, 0.5); color: var(--purple-light); background: rgba(88, 28, 135, 0.3); }
.btn-close-sidebar:hover { border-color: rgba(239, 68, 68, 0.4); color: rgba(239, 68, 68, 0.7); background: rgba(239, 68, 68, 0.08); }

/* ── SESSION LABEL ─────────────────────────────────────────────────────────── */
.session-label {
    padding: 0.4rem 1.1rem;
    font-size: 0.62rem;
    color: var(--text-muted);
    letter-spacing: 0.05em;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    flex-shrink: 0;
}

/* ── SKILL INDICATOR ───────────────────────────────────────────────────────── */
.skill-indicator {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.28rem 1.1rem;
    font-size: 0.62rem;
    color: var(--purple-light);
    letter-spacing: 0.05em;
    flex-shrink: 0;
}

.skill-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--purple-light);
    animation: pulse 1.5s ease infinite;
    flex-shrink: 0;
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.35; transform: scale(0.75); }
}

/* ── CHAT MESSAGES ─────────────────────────────────────────────────────────── */
.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    scroll-behavior: smooth;
}

.chat-messages::-webkit-scrollbar { width: 3px; }
.chat-messages::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.2); border-radius: 2px; }

.welcome-message {
    padding: 1.1rem 1.2rem;
    background: rgba(88, 28, 135, 0.1);
    border: 1px solid rgba(168, 85, 247, 0.12);
    border-radius: var(--radius);
    color: var(--text-secondary);
    font-size: 0.88rem;
    line-height: 1.7;
}
.welcome-message .caelum-sign {
    margin-top: 0.6rem;
    color: var(--purple-light);
    font-size: 0.73rem;
    opacity: 0.6;
}

.message { display: flex; flex-direction: column; gap: 0.22rem; }

.message-role {
    font-size: 0.58rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    opacity: 0.42;
}
.message.user .message-role { text-align: right; color: var(--gold-light); }
.message.assistant .message-role { color: var(--purple-light); }

.message-bubble {
    padding: 0.78rem 0.95rem;
    border-radius: var(--radius);
    font-size: 0.87rem;
    line-height: 1.65;
}
.message.user .message-bubble {
    background: rgba(202, 138, 4, 0.09);
    border: 1px solid rgba(202, 138, 4, 0.16);
    color: var(--text-primary);
    align-self: flex-end;
    max-width: 92%;
    border-radius: var(--radius) var(--radius) 4px var(--radius);
}
.message.assistant .message-bubble {
    background: rgba(88, 28, 135, 0.11);
    border: 1px solid rgba(168, 85, 247, 0.16);
    color: var(--text-primary);
    border-radius: var(--radius) var(--radius) var(--radius) 4px;
}

.streaming::after {
    content: '▊';
    animation: blink 0.8s step-end infinite;
    color: var(--purple-light);
    margin-left: 2px;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* ── CHAT INPUT ────────────────────────────────────────────────────────────── */
.chat-input-area {
    display: flex;
    align-items: flex-end;
    gap: 0.45rem;
    padding: 0.85rem 1.1rem;
    border-top: 1px solid rgba(168, 85, 247, 0.12);
    background: rgba(0,0,0,0.25);
    flex-shrink: 0;
}

.chat-input {
    flex: 1;
    padding: 0.62rem 0.85rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(168, 85, 247, 0.2);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 0.86rem;
    font-family: 'Open Sans', sans-serif;
    resize: none;
    outline: none;
    transition: border-color var(--transition);
    line-height: 1.5;
    max-height: 120px;
}
.chat-input:focus { border-color: rgba(168, 85, 247, 0.42); }
.chat-input::placeholder { color: var(--text-muted); font-style: italic; }

.btn-send {
    width: 36px;
    height: 36px;
    background: var(--purple-mid);
    border: none;
    border-radius: var(--radius-sm);
    color: white;
    font-size: 1rem;
    cursor: pointer;
    transition: background var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.btn-send:hover { background: var(--purple-light); }
.btn-send:disabled { opacity: 0.38; cursor: not-allowed; }

/* ── MINUTES POPUP ─────────────────────────────────────────────────────────── */
.minutes-popup-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.65);
    z-index: 800;
    backdrop-filter: blur(6px);
}
.minutes-popup-overlay.active { display: block; }

.minutes-popup {
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.96);
    width: 700px;
    max-width: calc(100vw - 2rem);
    max-height: 82vh;
    background: linear-gradient(160deg, #140c38, #0e0927);
    border: 1px solid rgba(168, 85, 247, 0.28);
    border-radius: 18px;
    z-index: 801;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 30px 80px rgba(0,0,0,0.75);
    opacity: 0;
    transition: transform 0.22s ease, opacity 0.22s ease;
}
.minutes-popup.active {
    display: flex;
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
}

.minutes-popup-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 1.35rem 1.65rem 0.85rem;
    border-bottom: 1px solid rgba(168, 85, 247, 0.12);
    flex-shrink: 0;
    background: rgba(88, 28, 135, 0.12);
}
.minutes-popup-title { font-size: 0.98rem; color: var(--text-primary); letter-spacing: 0.04em; margin-bottom: 0.2rem; }
.minutes-popup-meta { font-size: 0.66rem; color: var(--text-muted); letter-spacing: 0.04em; }
.minutes-popup-close { background: transparent; border: none; color: var(--text-secondary); font-size: 1rem; cursor: pointer; transition: color var(--transition); }
.minutes-popup-close:hover { color: var(--text-primary); }

.minutes-popup-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.35rem 1.65rem;
    color: var(--text-secondary);
    font-size: 0.87rem;
    line-height: 1.85;
}

.minutes-popup-body h1,
.minutes-popup-body h2 { color: var(--text-primary); font-size: 0.9rem; margin: 1rem 0 0.4rem; padding-bottom: 0.25rem; border-bottom: 1px solid rgba(168, 85, 247, 0.12); }
.minutes-popup-body h3 { color: var(--purple-light); font-size: 0.76rem; letter-spacing: 0.06em; text-transform: uppercase; margin: 0.85rem 0 0.3rem; }
.minutes-popup-body p { margin-bottom: 0.65rem; }
.minutes-popup-body ul, .minutes-popup-body ol { padding-left: 1.25rem; margin-bottom: 0.65rem; }
.minutes-popup-body li { margin-bottom: 0.22rem; }
.minutes-popup-body strong { color: var(--text-primary); }
.minutes-popup-body blockquote { border-left: 3px solid rgba(168, 85, 247, 0.3); padding-left: 0.85rem; color: var(--text-muted); font-style: italic; margin: 0.65rem 0; }
.minutes-popup-body table { width: 100%; border-collapse: collapse; font-size: 0.81rem; margin: 0.65rem 0; }
.minutes-popup-body th { background: rgba(88, 28, 135, 0.2); color: var(--text-primary); padding: 0.42rem 0.65rem; text-align: left; font-size: 0.7rem; }
.minutes-popup-body td { padding: 0.38rem 0.65rem; border-bottom: 1px solid rgba(255,255,255,0.04); }

.minutes-popup-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1.65rem;
    border-top: 1px solid rgba(168, 85, 247, 0.1);
    flex-shrink: 0;
}
.minutes-popup-note { font-size: 0.66rem; color: var(--text-muted); font-style: italic; }
