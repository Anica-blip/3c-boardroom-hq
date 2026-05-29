// ─── 3C Boardroom HQ — Supabase API (metadata only — content lives in R2) ────

const supabaseAPI = (() => {

    const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ── AUTH ─────────────────────────────────────────────────────────────────

    async function signInWithGitHub() {
        const { error } = await client.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.origin + '/index.html' }
        });
        if (error) console.error('❌ GitHub sign-in:', error.message);
    }

    async function signOut() {
        await client.auth.signOut();
        window.location.href = 'login.html';
    }

    async function getUser() {
        const { data: { user } } = await client.auth.getUser();
        return user;
    }

    function onAuthStateChange(callback) {
        return client.auth.onAuthStateChange(callback);
    }

    // ── SESSIONS ─────────────────────────────────────────────────────────────

    async function createSession(title = 'New Session') {
        const { data, error } = await client
            .from('caelum_sessions')
            .insert({ title })
            .select().single();
        if (error) { console.error('❌ createSession:', error.message); return null; }
        return data;
    }

    async function getSessions() {
        const { data, error } = await client
            .from('caelum_sessions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) { console.error('❌ getSessions:', error.message); return []; }
        return data;
    }

    // ── MESSAGES ─────────────────────────────────────────────────────────────

    async function saveMessage(sessionId, role, content) {
        const { data, error } = await client
            .from('caelum_messages')
            .insert({ session_id: sessionId, role, content })
            .select().single();
        if (error) { console.error('❌ saveMessage:', error.message); return null; }
        return data;
    }

    async function getMessages(sessionId) {
        const { data, error } = await client
            .from('caelum_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });
        if (error) { console.error('❌ getMessages:', error.message); return []; }
        return data;
    }

    // ── FOLDERS (metadata + R2 prefix) ───────────────────────────────────────

    async function getFolders() {
        const { data, error } = await client
            .from('caelum_folders')
            .select('*')
            .order('sort_order', { ascending: true });
        if (error) { console.error('❌ getFolders:', error.message); return []; }
        return data;
    }

    async function createFolder(name, icon = '📁', color = '#6B21A8', r2Prefix = '') {
        const { data, error } = await client
            .from('caelum_folders')
            .insert({ name, icon, color, r2_prefix: r2Prefix })
            .select().single();
        if (error) { console.error('❌ createFolder:', error.message); return null; }
        return data;
    }

    async function deleteFolder(id) {
        const { error } = await client
            .from('caelum_folders')
            .delete().eq('id', id);
        if (error) console.error('❌ deleteFolder:', error.message);
    }

    // ── FILES (metadata + R2 key — no content in Supabase) ───────────────────

    async function getFiles(folderId) {
        const { data, error } = await client
            .from('caelum_files')
            .select('*')
            .eq('folder_id', folderId)
            .order('created_at', { ascending: false });
        if (error) { console.error('❌ getFiles:', error.message); return []; }
        return data;
    }

    async function createFile(folderId, title, r2Key = '', fileType = 'note') {
        const { data, error } = await client
            .from('caelum_files')
            .insert({ folder_id: folderId, title, r2_key: r2Key, file_type: fileType })
            .select().single();
        if (error) { console.error('❌ createFile:', error.message); return null; }
        return data;
    }

    async function updateFile(id, title, r2Key) {
        const { error } = await client
            .from('caelum_files')
            .update({ title, r2_key: r2Key })
            .eq('id', id);
        if (error) console.error('❌ updateFile:', error.message);
    }

    async function deleteFile(id) {
        const { error } = await client
            .from('caelum_files')
            .delete().eq('id', id);
        if (error) console.error('❌ deleteFile:', error.message);
    }

    // ── MINUTES (metadata + R2 key — content lives in R2) ────────────────────

    async function getMinutes() {
        const { data, error } = await client
            .from('caelum_minutes')
            .select('id, session_number, session_date, title, r2_key, status, created_at')
            .order('session_number', { ascending: false });
        if (error) { console.error('❌ getMinutes:', error.message); return []; }
        return data;
    }

    async function createMinutes(sessionNumber, sessionDate, title, r2Key) {
        const { data, error } = await client
            .from('caelum_minutes')
            .insert({ session_number: sessionNumber, session_date: sessionDate, title, r2_key: r2Key })
            .select().single();
        if (error) { console.error('❌ createMinutes:', error.message); return null; }
        return data;
    }

    async function updateMinutes(id, r2Key, status) {
        const { error } = await client
            .from('caelum_minutes')
            .update({ r2_key: r2Key, status })
            .eq('id', id);
        if (error) console.error('❌ updateMinutes:', error.message);
    }

    async function getLatestMinutes() {
        const { data, error } = await client
            .from('caelum_minutes')
            .select('id, session_number, session_date, title, r2_key, status')
            .order('session_number', { ascending: false })
            .limit(1).single();
        if (error) { return null; }
        return data;
    }

    return {
        client,
        signInWithGitHub,
        signOut,
        getUser,
        onAuthStateChange,
        createSession,
        getSessions,
        saveMessage,
        getMessages,
        getFolders,
        createFolder,
        deleteFolder,
        getFiles,
        createFile,
        updateFile,
        deleteFile,
        getMinutes,
        createMinutes,
        updateMinutes,
        getLatestMinutes
    };

})();
