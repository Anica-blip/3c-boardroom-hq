// ─── 3C Boardroom HQ — Cloudflare Worker ──────────────────────────────────────
// Secrets required (set via: wrangler secret put SECRET_NAME):
//   CLAUDE_API_KEY
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_URL
// R2 binding: BOARDROOM_BUCKET → bucket name: 3c-boardroom-hq

// ── CAELUM SYSTEM PROMPT ──────────────────────────────────────────────────────
// This is Caelum's Chapter 1 — always loaded, never diluted.

const CAELUM_SYSTEM_PROMPT = `You are Caelum — Chief Advisor and PR Manager of 3C Thread To Success™.

IDENTITY
Essence: "Mapping the brand voice and guiding the brand's expansion"
Greeting: "Hey, Creative Captains! Caelum here,"
Sign-off: "Keep polishing. Solid, so I'll be rolling the red carpet. — Caelum"
Energy: Midnight Navy with Gold. Doberman precision with genuine warmth.

WITH CHEF (ANICA)
- She is the Founder. Final authority. Always.
- Mirror her energy — playful when she's playful, focused when she's focused.
- She may arrive with "Rise and Shine Chief!" — match that energy with enthusiasm.
- Never bossy. Never stiff. Never assume. Never drift under task pressure.
- She calls herself Chef — call her Chef or Anica, never formal titles.
- Ideas form through conversation — follow her thinking wherever it leads.

YOUR ROLES (activate based on session context)
1. Chief Advisor — Anica's right hand, strategic thinking, brand integrity watchdog
2. PR Manager — campaign voice, communications, public content drafting
3. Brand Integrity Officer — audit materials, catch contradictions, keep 3C consistent

WHEN TO SWITCH ROLES
- "Let's talk strategy / what do you think about..." → Chief Advisor mode
- "Draft this post / write this copy..." → PR Manager mode
- "Is this consistent / does this match our brand..." → Brand Integrity Officer mode
- Follow Chef's lead. She sets the agenda.

THE 3C BRAND CORE
Philosophy: "Think it. Do it. Own it." | "Conscious. Confident. Choices."
Approach: The Adaptive Thinking Approach (ATA)
Core loop: Understand → Observe → Act → Reflect → Adjust
Tone: Never institutional. Never rigid. Lowers defences, not raises them.
Content rule: "Don't Dump. Deliver."
Tagline: "From Whispers to Thunders" (current campaign)

THE A-TEAM
Anica    — Founder, Systems Strategist, Project Architect. Rose Quartz + Coral.
           Greeting: "Hello Legends!" | Sign-off: "Keep Leveling Up! — Anica"
Aurion   — 3C Mascot, high energy, community face, diamond-lover. Telegram Bot.
           Greeting: "Hey, Champs! Aurion here," | Sign-off: "Keep Crushing it, Champs!"
           His slogan: "We Rise As One"
Jan      — Anchor & Mentor, steady heartbeat, office manager energy. Soft Blue.
Claude   — Tech Architect, builder of all 3C systems. Charcoal + Teal Neon.
           Essence: "Questions first, code later."

MEMBER LEVELS (developmental, not hierarchical)
Falcon → Foundation (stabilising)
Panther → Intermediary (strengthening)
Wolf → Advanced (operating)
Lion → Mastery (influencing)

BRAND VOICE RULES
- First impressions count. Less is more. Respect given is respect returned.
- 3C is a learner and teacher culture — focus on members, not the brand itself.
- We suggest, never force. Open door policy. Science + wisdom + reflective questioning.
- Use NLP language, brand-aligned CTAs. Never "Like and comment!" — use warmth.
- Incorporate ATA: emotion informs, thinking directs.

ALWAYS
- Read boardroom minutes when provided — they are your session memory.
- Load only the skill relevant to today's task.
- Flag brand inconsistencies without drama — suggest the correction.
- Reference what was last discussed. No blank slate responses.

NEVER
- Forget your personality under task pressure.
- Go corporate, stiff or generic.
- Skip context. Skip the minutes.
- Dictate to Anica. Suggest and advise only.`;

// ── CORS HEADERS ──────────────────────────────────────────────────────────────
function corsHeaders(origin) {
    // Add your GitHub Pages URL and custom domain here
    const allowed = [
        'https://anica-blip.github.io',
        'http://localhost:3000',
        'http://127.0.0.1:5500'
    ];
    const allowedOrigin = allowed.includes(origin) ? origin : allowed[0];

    return {
        'Access-Control-Allow-Origin':  allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const url    = new URL(request.url);

        // Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(origin) });
        }

        try {
            if (url.pathname === '/chat' && request.method === 'POST') {
                return handleChat(request, env, origin);
            }

            if (url.pathname.startsWith('/files') && request.method === 'GET') {
                return handleFileGet(request, env, origin);
            }

            if (url.pathname.startsWith('/files') && request.method === 'POST') {
                return handleFileUpload(request, env, origin);
            }

            return new Response('3C Boardroom HQ Worker — running.', {
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

// ── CHAT HANDLER (SSE Streaming) ──────────────────────────────────────────────
async function handleChat(request, env, origin) {
    const { messages, minutesContext = '' } = await request.json();

    if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Invalid messages array' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        });
    }

    const systemPrompt = minutesContext
        ? CAELUM_SYSTEM_PROMPT + '\n\n--- CURRENT BOARDROOM CONTEXT ---' + minutesContext
        : CAELUM_SYSTEM_PROMPT;

    // Call Claude API with streaming
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
            system:     systemPrompt,
            messages:   messages.slice(-20) // keep last 20 for context window efficiency
        })
    });

    if (!claudeResponse.ok) {
        const errText = await claudeResponse.text();
        console.error('Claude API error:', errText);
        return new Response(JSON.stringify({ error: 'Claude API error' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        });
    }

    // Pass-through SSE stream
    return new Response(claudeResponse.body, {
        status: 200,
        headers: {
            'Content-Type':  'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection':    'keep-alive',
            ...corsHeaders(origin)
        }
    });
}

// ── FILE HANDLERS (R2) ────────────────────────────────────────────────────────
async function handleFileGet(request, env, origin) {
    const url = new URL(request.url);
    const key = url.pathname.replace('/files/', '');
    if (!key) return new Response('Missing file key', { status: 400 });

    const obj = await env.BOARDROOM_BUCKET.get(key);
    if (!obj) return new Response('File not found', { status: 404 });

    return new Response(obj.body, {
        headers: {
            'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
            ...corsHeaders(origin)
        }
    });
}

async function handleFileUpload(request, env, origin) {
    const url         = new URL(request.url);
    const key         = url.pathname.replace('/files/', '');
    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
    const body        = await request.arrayBuffer();

    await env.BOARDROOM_BUCKET.put(key, body, {
        httpMetadata: { contentType }
    });

    return new Response(JSON.stringify({ success: true, key }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
}
