// ─── 3C Boardroom HQ — Auth Guard ────────────────────────────────────────────
// Runs on index.html — redirects to login if not authenticated

(async function authGuard() {
    try {
        const user = await supabaseAPI.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Display user info in header
        const badge = document.getElementById('userBadge');
        if (badge) {
            badge.textContent = user.user_metadata?.user_name
                ? '@' + user.user_metadata.user_name
                : user.email || 'Anica';
        }

    } catch (err) {
        console.error('❌ Auth guard error:', err);
        window.location.href = 'login.html';
    }
})();
