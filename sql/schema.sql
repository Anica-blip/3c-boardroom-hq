-- ─────────────────────────────────────────────────────────────────────────────
-- 3C Boardroom HQ — Database schema
-- Project: 3C Control Center (Supabase)
-- Tables:  caelum_sessions, caelum_messages, caelum_folders,
--          caelum_files, caelum_minutes, caelum_decisions
--
-- Matches the live database as read on 03.10.2026.
-- Safe to run more than once: tables and the index are only created if missing,
-- and each policy is dropped and recreated with the same definition.
-- ─────────────────────────────────────────────────────────────────────────────


-- 1. SESSIONS — one row per Caelum chat session
create table if not exists caelum_sessions (
    id          uuid        primary key default gen_random_uuid(),
    title       text        not null default 'New Session',
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);


-- 2. MESSAGES — every chat message, linked to its session
create table if not exists caelum_messages (
    id          uuid        primary key default gen_random_uuid(),
    session_id  uuid        references caelum_sessions(id) on delete cascade,
    role        text        not null check (role in ('user', 'assistant')),
    content     text        not null,
    created_at  timestamptz default now()
);


-- 3. FOLDERS — Bookshelf folders (R2 prefix holds the folder's files)
create table if not exists caelum_folders (
    id          uuid        primary key default gen_random_uuid(),
    name        text        not null,
    icon        text        default '📁',
    color       text        default '#6B21A8',
    sort_order  integer     default 0,
    created_at  timestamptz default now(),
    r2_prefix   text
);


-- 4. FILES — Bookshelf index (content lives in Cloudflare R2)
create table if not exists caelum_files (
    id          uuid        primary key default gen_random_uuid(),
    folder_id   uuid        references caelum_folders(id) on delete cascade,
    title       text        not null,
    file_type   text        default 'note'
                            check (file_type in ('note', 'minutes', 'profile', 'strategy', 'reference')),
    r2_url      text,
    created_at  timestamptz default now(),
    updated_at  timestamptz default now(),
    r2_key      text
);


-- 5. MINUTES — boardroom session minutes (content lives in Cloudflare R2)
create table if not exists caelum_minutes (
    id              uuid        primary key default gen_random_uuid(),
    session_number  integer     not null,
    session_date    date        not null,
    title           text        not null,
    status          text        default 'open' check (status in ('open', 'closed')),
    created_at      timestamptz default now(),
    updated_at      timestamptz default now(),
    r2_key          text
);


-- 6. DECISIONS — boardroom decisions, tracked until resolved
create table if not exists caelum_decisions (
    id          uuid        primary key default gen_random_uuid(),
    session_id  uuid        references caelum_sessions(id) on delete set null,
    decision    text        not null,
    resolved    boolean     not null default false,
    created_at  timestamptz not null default now(),
    resolved_at timestamptz
);

create index if not exists caelum_decisions_resolved_idx
    on caelum_decisions (resolved, created_at desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — signed-in (authenticated) users only, on every table
-- ─────────────────────────────────────────────────────────────────────────────

alter table caelum_sessions  enable row level security;
alter table caelum_messages  enable row level security;
alter table caelum_folders   enable row level security;
alter table caelum_files     enable row level security;
alter table caelum_minutes   enable row level security;
alter table caelum_decisions enable row level security;

drop policy if exists auth_sessions on caelum_sessions;
create policy auth_sessions on caelum_sessions
    for all to authenticated using (true) with check (true);

drop policy if exists auth_messages on caelum_messages;
create policy auth_messages on caelum_messages
    for all to authenticated using (true) with check (true);

drop policy if exists auth_folders on caelum_folders;
create policy auth_folders on caelum_folders
    for all to authenticated using (true) with check (true);

drop policy if exists auth_files on caelum_files;
create policy auth_files on caelum_files
    for all to authenticated using (true) with check (true);

drop policy if exists auth_minutes on caelum_minutes;
create policy auth_minutes on caelum_minutes
    for all to authenticated using (true) with check (true);

drop policy if exists "auth only" on caelum_decisions;
create policy "auth only" on caelum_decisions
    for all to authenticated using (true) with check (true);
