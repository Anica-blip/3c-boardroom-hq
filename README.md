# 🌌 3C Boardroom HQ

> ⚖️ This repository is protected under a binding [Legal Disclaimer](./LEGAL_DISCLAIMER.md) that governs all use, cloning, and forking from the date of inception. Please read before use.

> The private strategic headquarters of the 3C Thread To Success™ ecosystem.
> A boardroom-style workspace where Chef Anica and Caelum meet to plan, file, and decide.

---

**⚠️ Intellectual Property Notice**
This repository is open source under the MIT License, so the code skeleton is free to clone and adapt.
The 3C Thread To Success™ brand, including its name, structure, characters (Anica, Caelum, Jan, Aurion, Casey), philosophy, and overall ecosystem identity, remains the intellectual property of the creator and is **not** included in this licence.
Commercial use of the brand or replication of the ecosystem identity is not permitted without permission.

---

## 🎭 The 3C Ecosystem

This project is part of a larger system built around five core identities, the 3C A-Team:

- **Anica (Founder):** Authority and Vision. Project Founder, Systems Strategist and Project Architect, the Chef.
- **Caelum:** Structure and Direction. Chief Advisor, PR Manager and Brand Integrity Officer.
- **Jan:** Flow and Stability. 3C Assistant Support, Lifeline Mentor and Anchor.
- **Aurion:** Engagement and Experience. 3C Mascot, community voice and diamond-energy guide.
- **Casey:** Story and Play. 3C Creative Director, Lifeline Playmaker and Ace Maven.

Together, they create a balanced environment for growth, learning, and progression. In the Boardroom, it's Chef and Caelum at the table.

---

## 🏛️ What Is the Boardroom HQ?

The Boardroom HQ is a secured private workspace, not a public tool.
It is where brand decisions are made, strategy is filed, and Caelum operates as Chief Advisor.

**Inside the Boardroom:**
- 💬 **Caelum Chat:** a slide-out sidebar to brief Caelum and work through ideas together
- 📄 **Document Panel:** where Caelum delivers finished documents, with Copy and Download (.md)
- 📚 **Bookshelf:** labelled folders for minutes, brand voice, character files, campaigns and more
- 📋 **Session Minutes:** dated, checkbox-tracked boardroom decisions
- 🔐 **GitHub OAuth:** secured access via Supabase authentication

---

## ⚙️ How It Works

**Sessions.** Every chat opens a dated session. Each message is saved, so the conversation is on record.

**Caelum's memory.** Before he replies, Caelum reads three things from the Boardroom's storage:
1. His brain file (`brain/caelum-core.md`)
2. The latest boardroom minutes (`boardroom/minutes/`)
3. One skill file that fits the task, picked from keywords in Chef's message (for example campaign, brand voice, PR, a persona or a member level)

**Chat and documents.** The chat is for working together. The document panel is where Caelum hands over anything finished, so Chef can copy it or download it as a `.md` file. The latest minutes open in the same panel.

**The Bookshelf.** Folders sit on the shelf like binders. Each folder holds files that can be opened, edited and saved, with the content stored in Cloudflare R2 and the index in Supabase.

---

## 🧱 Tech Stack

| Part | What it does |
|---|---|
| **GitHub Pages** | Hosts the Boardroom (custom domain: threadcommand.center) |
| **Supabase** | GitHub OAuth login, plus six tables: `caelum_sessions`, `caelum_messages`, `caelum_folders`, `caelum_files`, `caelum_minutes`, `caelum_decisions` |
| **Cloudflare Worker** | Streams Caelum's replies from Claude (Anthropic), and reads and saves Boardroom files |
| **Cloudflare R2** | Bucket `3c-boardroom-hq`: brain file, skills, minutes and bookshelf files |

The Claude API key lives only in the Worker as a secret, never in the browser. The Worker checks the Supabase login on every request and only lets Chef's account through.

---

## 🚧 Status

The Boardroom is built and waiting to be connected. Still to do:
- Deploy the Worker and add its URL to `config.js`

Full setup steps are in [SETUP.md](./SETUP.md).

---

## 🎨 Artwork
Background AI image generated via [ChatGPT](https://chatgpt.com) by OpenAI

---

## 🎨 Credits

*Designed and Built with ❤️ by Claude (Anthropic) × Chef Anica · 3C Thread To Success™ Cooking Lab 🧪👨‍🍳*

*"Think Smarter, Not Harder — Zero Shortcuts"*

---

## 👤 Creator

**Anica-blip ("Chef")**
Founder of 3C Thread To Success™ ("Cooking Lab")
Independent Creator | Community Builder

---

## 🧠 Philosophy

*"Think it. Do it. Own it."*

This project was built from vision, persistence, and a commitment to creating meaningful and structured experiences, even with minimal resources. The Boardroom HQ exists because great strategy deserves a great space.
