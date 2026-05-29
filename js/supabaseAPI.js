// ─── 3C Boardroom HQ — Supabase API ──────────────────────────────────────────

const supabaseAPI = (() => {

    const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ── AUTH ─────────────────────────────────────────────────────────────────

    async function signInWithGitHub() {
        const { error } = await client.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.origin + '/index.html' }
        });
        if (error) console.error('❌ GitHub sign-in error:', error.message);
    }

    async function signOut() {
        const { error } = await client.auth.signOut();
        if (error) console.error('❌ Sign-out error:', error.message);
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
            .select()
            .single();
        if (error) { console.error('❌ Create session:', error.message); return null; }
        return data;
    }

    async function getSessions() {
        const { data, error } = await client
            .from('caelum_sessions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) { console.error('❌ Get sessions:', error.message); return []; }
        return data;
    }

    async function updateSessionTitle(id, title) {
        const { error } = await client
            .from('caelum_sessions')
            .update({ title })
            .eq('id', id);
        if (error) console.error('❌ Update session title:', error.message);
    }

    // ── MESSAGES ─────────────────────────────────────────────────────────────

    async function saveMessage(sessionId, role, content) {
        const { data, error } = await client
            .from('caelum_messages')
            .insert({ session_id: sessionId, role, content })
            .select()
            .single();
        if (error) { console.error('❌ Save message:', error.message); return null; }
        return data;
    }

    async function getMessages(sessionId) {
        const { data, error } = await client
            .from('caelum_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });
        if (error) { console.error('❌ Get messages:', error.message); return []; }
        return data;
    }

    // ── FOLDERS ──────────────────────────────────────────────────────────────

    async function getFolders() {
        const { data, error } = await client
            .from('caelum_folders')
            .select('*')
            .order('sort_order', { ascending: true });
        if (error) { console.error('❌ Get folders:', error.message); return []; }
        return data;
    }

    async function createFolder(name, icon = '📁', color = '#6B21A8') {
        const { data, error } = await client
            .from('caelum_folders')
            .insert({ name, icon, color })
            .select()
            .single();
        if (error) { console.error('❌ Create folder:', error.message); return null; }
        return data;
    }

    async function deleteFolder(id) {
        const { error } = await client
            .from('caelum_folders')
            .delete()
            .eq('id', id);
        if (error) console.error('❌ Delete folder:', error.message);
    }

    // ── FILES ─────────────────────────────────────────────────────────────────

    async function getFiles(folderId) {
        const { data, error } = await client
            .from('caelum_files')
            .select('*')
            .eq('folder_id', folderId)
            .order('created_at', { ascending: false });
        if (error) { console.error('❌ Get files:', error.message); return []; }
        return data;
    }

    async function createFile(folderId, title, content = '', fileType = 'note') {
        const { data, error } = await client
            .from('caelum_files')
            .insert({ folder_id: folderId, title, content, file_type: fileType })
            .select()
            .single();
        if (error) { console.error('❌ Create file:', error.message); return null; }
        return data;
    }

    async function updateFile(id, title, content) {
        const { error } = await client
            .from('caelum_files')
            .update({ title, content })
            .eq('id', id);
        if (error) console.error('❌ Update file:', error.message);
    }

    async function deleteFile(id) {
        const { error } = await client
            .from('caelum_files')
            .delete()
            .eq('id', id);
        if (error) console.error('❌ Delete file:', error.message);
    }

    // ── MINUTES ──────────────────────────────────────────────────────────────

    async function getMinutes() {
        const { data, error } = await client
            .from('caelum_minutes')
            .select('*')
            .order('session_number', { ascending: false });
        if (error) { console.error('❌ Get minutes:', error.message); return []; }
        return data;
    }

    async function createMinutes(sessionNumber, sessionDate, title, content) {
        const { data, error } = await client
            .from('caelum_minutes')
            .insert({ session_number: sessionNumber, session_date: sessionDate, title, content })
            .select()
            .single();
        if (error) { console.error('❌ Create minutes:', error.message); return null; }
        return data;
    }

    async function updateMinutes(id, content, status) {
        const { error } = await client
            .from('caelum_minutes')
            .update({ content, status })
            .eq('id', id);
        if (error) console.error('❌ Update minutes:', error.message);
    }

    async function getLatestMinutes() {
        const { data, error } = await client
            .from('caelum_minutes')
            .select('*')
            .order('session_number', { ascending: false })
            .limit(1)
            .single();
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
        updateSessionTitle,
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
