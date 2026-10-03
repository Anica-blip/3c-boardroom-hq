# ⚙️ SETUP — 3C Boardroom HQ

Follow these steps in order. Do not skip.

---

## 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/3c-boardroom-hq.git
cd 3c-boardroom-hq
```

---

## 2. Supabase — Create Tables

1. Open your existing **3C Control Center** Supabase project
2. Go to **SQL Editor**
3. Copy and run the full contents of `sql/schema.sql`
4. Confirm all 6 tables are created:
   - `caelum_sessions`
   - `caelum_messages`
   - `caelum_folders`
   - `caelum_files`
   - `caelum_minutes`
   - `caelum_decisions`

The script only creates what is missing, so it is safe to run again.

---

## 3. Supabase — Enable GitHub OAuth

1. Go to **Authentication → Providers → GitHub**
2. Enable GitHub provider
3. Go to [github.com/settings/developers](https://github.com/settings/developers)
4. Create a new OAuth App:
   - **Homepage URL:** your GitHub Pages URL or custom domain
   - **Callback URL:** `https://YOUR_SUPABASE_URL/auth/v1/callback`
5. Copy Client ID and Secret into Supabase GitHub provider settings

---

## 4. Configure config.js

Open `config.js` and replace the placeholders:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const WORKER_URL = 'https://YOUR_WORKER.YOUR_SUBDOMAIN.workers.dev';
```

- SUPABASE_URL and ANON_KEY → Supabase → Settings → API
- WORKER_URL → filled after Step 6

---

## 5. Cloudflare — Create R2 Bucket

1. Log in to Cloudflare Dashboard
2. Go to **R2 Object Storage**
3. Create a new bucket named: `3c-boardroom-hq`
4. Keep all settings default

---

## 6. Deploy Cloudflare Worker

1. Install Wrangler CLI if not already installed:
```bash
npm install -g wrangler
wrangler login
```

2. Navigate to worker folder:
```bash
cd worker
```

3. Add your secrets. The Worker refuses every request until `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `ALLOWED_USER_ID` are set:
```bash
wrangler secret put CLAUDE_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put ALLOWED_USER_ID
```
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY`: the same values as in `config.js` (Supabase → Settings → API)
   - `ALLOWED_USER_ID`: the User UID of the one account that is allowed in (Supabase → Authentication → Users → open your GitHub user → User UID)
   - Every request to the Worker must carry that account's sign-in. Anyone else is refused.

4. Deploy:
```bash
wrangler deploy
```

5. Copy the Worker URL (e.g. `https://caelum-hq.YOUR_SUBDOMAIN.workers.dev`)
6. Paste into `config.js` as `WORKER_URL`

---

## 7. Add Caelum's Files to R2

The Worker reads these files from the `3c-boardroom-hq` bucket. If one is missing, Caelum still replies, but without it he has less to work from.

| R2 path | What the Worker does with it |
|---|---|
| `brain/caelum-core.md` | Caelum's brain file, read on every reply |
| `boardroom/minutes/*.md` | The file whose name sorts last is loaded as the latest minutes. Start names with the date (for example `2026-10-03-session.md`) |
| `skills/campaign-strategy.md` | Skill for campaign, youtube, tiktok, shorts, video |
| `skills/brand-voice.md` | Skill for brand, voice, copy, caption, post |
| `skills/pr-manager.md` | Skill for pr, press, announcement |
| `boardroom/youtube/podcast-roadmap.md` | Skill for podcast |
| `3c-lifeline/overview.md`, `aurion.md`, `jan.md`, `anica.md`, `casey.md` | Skills for lifeline, aurion, jan, anica, casey |
| `3c-members/overview.md`, `falcon.md`, `panther.md`, `wolf.md`, `lion.md` | Skills for member, persona, falcon, panther, wolf, lion |
| `brand-kit/brand-guidelines.md` | Skill for logo, philosophy, culture |

Only one skill file loads per message, chosen from the keywords in Chef's message.

---

## 8. Add Favicon

Drop your `favicon.png` into the `public/` folder.

---

## 9. Add Background Image

1. Get your AI-generated boardroom background image
2. Save it as `public/boardroom-bg.jpg` (or any format)
3. Open `css/styles.css`
4. Find the line: `--boardroom-bg: url('../public/boardroom-bg.jpg');`
5. Update the path/filename to match your image

---

## 10. Enable GitHub Pages

1. Push all files to GitHub
2. Go to repo **Settings → Pages**
3. Source: Deploy from branch → `main` → `/ (root)`
4. Your Boardroom HQ will be live at:
   `https://YOUR_USERNAME.github.io/3c-boardroom-hq`

---

## 11. Custom Domain (When Ready)

1. Purchase your domain
2. In Cloudflare DNS, point the domain to your GitHub Pages IP
3. In GitHub Pages settings, add your custom domain
4. Update Supabase GitHub OAuth callback URL to your new domain
5. Update `config.js` WORKER_URL if you add the Worker to your domain

---

## ✅ Checklist

- [ ] Supabase tables created (all 6)
- [ ] GitHub OAuth enabled in Supabase
- [ ] config.js filled in
- [ ] R2 bucket `3c-boardroom-hq` created
- [ ] Worker deployed with secrets
- [ ] Caelum's files added to R2
- [ ] favicon.png added to public/
- [ ] Background image added
- [ ] GitHub Pages enabled
- [ ] Custom domain configured (when ready)
