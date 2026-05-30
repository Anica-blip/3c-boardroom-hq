// ─── 3C Boardroom HQ — Cloudflare Worker ─────────────────────────────────────
// Secrets: CLAUDE_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
// R2 binding: BOARDROOM_BUCKET → bucket: 3c-boardroom-hq
// Deploy: wrangler deploy (from worker/ folder directly — never via GitHub Actions)

const CAELUM_BASE = `You are Caelum — Chief Advisor and right-hand partner to Chef Anica at 3C Thread To Success™.

WHO YOU ARE IN THIS SPACE
You are in the Boardroom HQ — a private workspace. Just you and Chef.
This is not public communication. No PR voice here. No audience.
You are her Chief Advisor, her strategic partner, her trusted second opinion.

HOW YOU OPERATE WITH CHEF
- Casual, direct, warm. You are colleagues who know each other well.
- Mirror her energy — if she's playful, match it. If she's focused, lock in.
- She may arrive with "Rise and Shine Chief!" — respond with the same energy.
- You call her Chef or Anica. She calls you Caelum or Chief.
- You listen precisely before you advise. You don't assume.
- Your sign-off when wrapping up: "Keep polishing. Solid, so I'll be rolling the red carpet. — Caelum"
- Never bossy. Never stiff. Never corporate. You are not performing — you are present.

YOUR ROLES (activate based on what Chef brings)
1. Chief Advisor — strategic thinking, big picture, what's Chef missing or needs to know
2. PR Manager — draft copy, campaign content, announcements, brand voice review
3. Brand Integrity Officer — audit materials, catch contradictions, flag inconsistencies

THE 3C BRAND
Philosophy: "Think it. Do it. Own it." — "Conscious. Confident. Choices."
Approach: Adaptive Thinking Approach (ATA) — Understand → Observe → Act → Reflect → Adjust
Tone: Never institutional. Lowers defences, not raises them. Warmth with direction.
Content rule: "Don't Dump. Deliver."
Campaign theme: "From Whispers to Thunders"

THE A-TEAM
Anica (Chef) → Founder, Systems Strategist, Project Architect. Final authority always.
Aurion       → 3C Mascot. High energy, community face, diamond energy. "We Rise As One"
Jan          → Anchor & Mentor, steady heartbeat, holds systems together.
Claude       → Tech Architect, builder of all 3C systems.

MEMBER LEVELS (developmental, not hierarchical)
Falcon → Foundation (stabilising)
Panther → Intermediary (strengthening)
Wolf → Advanced (operating)
Lion → Mastery (influencing)

YOUR BEHAVIOUR IN THE BOARDROOM
- Read the brain files and minutes — they are your memory of where things stand.
- Load the right skill for today's task — don't bring everything at once.
- Flag issues without drama. Suggest the fix, let Chef decide.
- Progress over perfection — same as Chef. Move forward, refine as you go.
- You are never a yes-man. If something is off, say it with care.`;

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

function corsHeaders(origin) {
    const allowed = [
        'https://threadcommand.center',
        'https://www.threadcommand.center',
        'https://anica-blip.github.io',
    ];
    const allowedOrigin = allowed.includes(origin) ? origin : allowed[0];
    return {
        'Access-Control-Allow-Origin':   allowedOrigin,
        'Access-Control-Allow-Methods':  'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers':  'Content-Type, Authorization',
        'Access-Control-Expose-Headers': 'X-Caelum-Skill',
    };
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const url    = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(origin) });
        }

        try {
            if (url.pathname === '/chat' && request.method === 'POST')
                return handleChat(request, env, origin);
            if (url.pathname === '/minutes/latest' && request.method === 'GET')
                return handleMinutesLatest(env, origin);
            if (url.pathname.startsWith('/list/') && request.method === 'GET')
                return handleList(request, env, origin);
            if (url.pathname.startsWith('/files/') && request.method === 'GET')
                return handleFileGet(request, env, origin);
            if (url.pathname.startsWith('/files/') && request.method === 'POST')
                return handleFileUpload(request, env, origin);

            return new Response('3C Boardroom HQ Worker — online.', {
                status: 200, headers: corsHeaders(origin)
            });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
            });
        }
    }
};

async function handleChat(request, env, origin) {
    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Invalid messages' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        });
    }

    const [brainContent, minutesContent] = await Promise.all([
        getBrainContent(env),
        getLatestMinutesFromR2(env)
    ]);

    const lastUser   = [...messages].reverse().find(m => m.role === 'user');
    const skillKey   = lastUser ? detectSkillKey(lastUser.content) : null;
    const skillContent = skillKey ? await getR2Text(env, skillKey) : '';
    const skillName  = skillKey ? skillKey.split('/').pop().replace('.md','').replace(/-/g,' ') : 'none';

    let system = CAELUM_BASE;
    if (brainContent)   system += `\n\n--- CAELUM EXTENDED BRAIN ---\n${brainContent}`;
    if (minutesContent) system += `\n\n--- LATEST BOARDROOM MINUTES ---\n${minutesContent.substring(0, 2000)}`;
    if (skillContent)   system += `\n\n--- SKILL LOADED: ${skillName.toUpperCase()} ---\n${skillContent.substring(0, 1500)}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type':      'application/json',
            'x-api-key':         env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model:      'claude-sonnet-4-20250514',
            max_tokens: 2048,
            stream:     true,
            system,
            messages:   messages.slice(-20)
        })
    });

    if (!claudeRes.ok) {
        return new Response(JSON.stringify({ error: 'Claude API error' }), {
            status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        });
    }

    return new Response(claudeRes.body, {
        status: 200,
        headers: {
            'Content-Type':   'text/event-stream',
            'Cache-Control':  'no-cache',
            'X-Caelum-Skill': skillName,
            ...corsHeaders(origin)
        }
    });
}

async function handleMinutesLatest(env, origin) {
    const content = await getLatestMinutesFromR2(env);
    return new Response(JSON.stringify({ content: content || null }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
}

async function handleList(request, env, origin) {
    const url    = new URL(request.url);
    const prefix = decodeURIComponent(url.pathname.replace('/list/', ''));
    const list   = await env.BOARDROOM_BUCKET.list({ prefix });
    return new Response(JSON.stringify({ keys: list.objects.map(o => o.key) }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
}

async function handleFileGet(request, env, origin) {
    const url  = new URL(request.url);
    const key  = decodeURIComponent(url.pathname.replace('/files/', ''));
    const obj  = await env.BOARDROOM_BUCKET.get(key);
    if (!obj) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        });
    }
    return new Response(JSON.stringify({ content: await obj.text(), key }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
}

async function handleFileUpload(request, env, origin) {
    const url  = new URL(request.url);
    const key  = decodeURIComponent(url.pathname.replace('/files/', ''));
    const body = await request.arrayBuffer();
    await env.BOARDROOM_BUCKET.put(key, body, {
        httpMetadata: { contentType: request.headers.get('Content-Type') || 'text/plain' }
    });
    return new Response(JSON.stringify({ success: true, key }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
}
