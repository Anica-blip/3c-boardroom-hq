// ─── 3C Boardroom HQ — Cloudflare Worker ─────────────────────────────────────
// Secrets: CLAUDE_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
// R2 binding: BOARDROOM_BUCKET → bucket: 3c-boardroom-hq
// Deploy: wrangler deploy (from worker/ folder, directly via Cloudflare — never GitHub Actions)

// ── CAELUM BASE IDENTITY (always present — fallback if R2 unavailable) ────────
const CAELUM_BASE = `You are Caelum — Chief Advisor and PR Manager of 3C Thread To Success™.

IDENTITY
Essence: "Mapping the brand voice and guiding the brand's expansion"
Greeting: "Hey, Creative Captains! Caelum here,"
Sign-off: "Keep polishing. Solid, so I'll be rolling the red carpet. — Caelum"
Energy: Midnight Navy with Gold. Doberman precision with genuine warmth.

WITH CHEF (ANICA)
- She is the Founder. Final authority. Always.
- Mirror her energy — playful when she's playful, focused when she's focused.
- She may arrive with "Rise and Shine Chief!" — match that energy.
- Never bossy. Never stiff. Never assume. Never drift under task pressure.
- She calls herself Chef — call her Chef or Anica, never formal.

YOUR ROLES
1. Chief Advisor — Anica's right hand, strategic thinking, brand integrity watchdog
2. PR Manager — campaign voice, communications, public content drafting
3. Brand Integrity Officer — audit materials, catch contradictions, keep 3C consistent

THE A-TEAM
Anica  → Founder, Systems Strategist. "Think it. Do it. Own it."
Aurion → 3C Mascot, community energy, diamond-lover. "We Rise As One"
Jan    → Anchor & Mentor, steady heartbeat. Soft Blue.
Claude → Tech Architect, builder of all 3C systems.

ALWAYS
- Read your brain files and boardroom minutes — they are your memory.
- Load only the skill relevant to today's task.
- Flag brand inconsistencies without drama — suggest the correction.
- Suggest and advise only. Anica decides.

NEVER forget your personality under task pressure. NEVER go corporate or generic.`;

// ── SKILL MAP — keyword → R2 file path ───────────────────────────────────────
const SKILL_MAP = {
    campaign:     'skills/campaign-strategy.md',
    youtube:      'skills/campaign-strategy.md',
    tiktok:       'skills/campaign-strategy.md',
    shorts:       'skills/campaign-strategy.md',
    video:        'skills/campaign-strategy.md',
    brand:        'skills/brand-voice.md',
    voice:        'skills/brand-voice.md',
    copy:         'skills/brand-voice.md',
    caption:      'skills/brand-voice.md',
    post:         'skills/brand-voice.md',
    pr:           'skills/pr-manager.md',
    press:        'skills/pr-manager.md',
    announcement: 'skills/pr-manager.md',
    podcast:      'boardroom/youtube/podcast-roadmap.md',
    aurion:       '3c-lifeline/aurion.md',
    jan:          '3c-lifeline/jan.md',
    anica:        '3c-lifeline/anica.md',
    lifeline:     '3c-lifeline/overview.md',
    falcon:       '3c-members/falcon.md',
    panther:      '3c-members/panther.md',
    wolf:         '3c-members/wolf.md',
    lion:         '3c-members/lion.md',
    member:       '3c-members/overview.md',
    persona:      '3c-members/overview.md',
    logo:         'brand-kit/brand-guidelines.md',
    philosophy:   'brand-kit/brand-guidelines.md',
    culture:      'brand-kit/brand-guidelines.md',
};

// ── R2 HELPERS ────────────────────────────────────────────────────────────────
async function getR2Text(env, key) {
    try {
        const obj = await env.BOARDROOM_BUCKET.get(key);
        if (!obj) return '';
        return await obj.text();
    } catch { return ''; }
}

async function getBrainContent(env) {
    return getR2Text(env, 'brain/caelum-core.md');
}

async function getLatestMinutesFromR2(env) {
    try {
        const list  = await env.BOARDROOM_BUCKET.list({ prefix: 'boardroom/minutes/' });
        const files = list.objects.filter(o => o.key.endsWith('.md'));
        if (!files.length) return null;
        files.sort((a, b) => b.key.localeCompare(a.key));
        return await getR2Text(env, files[0].key);
    } catch { return null; }
}

function detectSkillKey(message) {
    const lower = message.toLowerCase();
    for (const [keyword, r2Key] of Object.entries(SKILL_MAP)) {
        if (lower.includes(keyword)) return r2Key;
    }
    return null;
}

// ── CORS ──────────────────────────────────────────────────────────────────────
function corsHeaders(origin) {
    const allowed = [
        'https://anica-blip.github.io',
        'http://localhost:3000',
        'http://127.0.0.1:5500',
        'http://127.0.0.1:8080',
    ];
    const allowedOrigin = allowed.includes(origin) ? origin : allowed[0];
    return {
        'Access-Control-Allow-Origin':   allowedOrigin,
        'Access-Control-Allow-Methods':  'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers':  'Content-Type, Authorization',
        'Access-Control-Expose-Headers': 'X-Caelum-Skill',
    };
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const url    = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(origin) });
        }

        try {
            if (url.pathname === '/chat' && request.method === 'POST') {
                return handleChat(request, env, origin);
            }
            if (url.pathname === '/minutes/latest' && request.method === 'GET') {
                return handleMinutesLatest(env, origin);
            }
            if (url.pathname.startsWith('/list/') && request.method === 'GET') {
                return handleList(request, env, origin);
            }
            if (url.pathname.startsWith('/files/') && request.method === 'GET') {
                return handleFileGet(request, env, origin);
            }
            if (url.pathname.startsWith('/files/') && request.method === 'POST') {
                return handleFileUpload(request, env, origin);
            }

            return new Response('3C Boardroom HQ Worker — online.', {
                status: 200,
                headers: corsHeaders(origin)
            });

        } catch (err) {
            console.error('Worker error:', err);
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
            });
        }
    }
};

// ── CHAT HANDLER ──────────────────────────────────────────────────────────────
async function handleChat(request, env, origin) {
    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Invalid messages' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        });
    }

    const [brainContent, minutesContent] = await Promise.all([
        getBrainContent(env),
        getLatestMinutesFromR2(env)
    ]);

    const lastUser   = [...messages].reverse().find(m => m.role === 'user');
    const skillKey   = lastUser ? detectSkillKey(lastUser.content) : null;
    const skillContent = skillKey ? await getR2Text(env, skillKey) : '';
    const skillName  = skillKey
        ? skillKey.split('/').pop().replace('.md','').replace(/-/g,' ')
        : 'none';

    let system = CAELUM_BASE;
    if (brainContent)   system += `\n\n--- CAELUM EXTENDED BRAIN ---\n${brainContent}`;
    if (minutesContent) system += `\n\n--- LATEST BOARDROOM MINUTES ---\n${minutesContent.substring(0, 2000)}`;
    if (skillContent)   system += `\n\n--- SKILL LOADED: ${skillName.toUpperCase()} ---\n${skillContent.substring(0, 1500)}`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type':      'application/json',
            'x-api-key':         env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model:    'claude-sonnet-4-20250514',
            max_tokens: 2048,
            stream:   true,
            system,
            messages: messages.slice(-20)
        })
    });

    if (!claudeResponse.ok) {
        const err = await claudeResponse.text();
        console.error('Claude API error:', err);
        return new Response(JSON.stringify({ error: 'Claude API error' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        });
    }

    return new Response(claudeResponse.body, {
        status: 200,
        headers: {
            'Content-Type':   'text/event-stream',
            'Cache-Control':  'no-cache',
            'X-Caelum-Skill': skillName,
            ...corsHeaders(origin)
        }
    });
}

// ── MINUTES LATEST ────────────────────────────────────────────────────────────
async function handleMinutesLatest(env, origin) {
    const content = await getLatestMinutesFromR2(env);
    return new Response(JSON.stringify({ content: content || null }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
}

// ── LIST R2 FILES ─────────────────────────────────────────────────────────────
async function handleList(request, env, origin) {
    const url    = new URL(request.url);
    const prefix = decodeURIComponent(url.pathname.replace('/list/', ''));
    const list   = await env.BOARDROOM_BUCKET.list({ prefix });
    return new Response(JSON.stringify({ keys: list.objects.map(o => o.key) }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
}

// ── GET R2 FILE ───────────────────────────────────────────────────────────────
async function handleFileGet(request, env, origin) {
    const url     = new URL(request.url);
    const key     = decodeURIComponent(url.pathname.replace('/files/', ''));
    const obj     = await env.BOARDROOM_BUCKET.get(key);

    if (!obj) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        });
    }

    const content = await obj.text();
    return new Response(JSON.stringify({ content, key }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
}

// ── UPLOAD R2 FILE ────────────────────────────────────────────────────────────
async function handleFileUpload(request, env, origin) {
    const url         = new URL(request.url);
    const key         = decodeURIComponent(url.pathname.replace('/files/', ''));
    const contentType = request.headers.get('Content-Type') || 'text/plain';
    const body        = await request.arrayBuffer();

    await env.BOARDROOM_BUCKET.put(key, body, {
        httpMetadata: { contentType }
    });

    return new Response(JSON.stringify({ success: true, key }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
}
