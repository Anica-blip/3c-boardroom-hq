// ─── 3C Boardroom HQ — App ───────────────────────────────────────────────────

// ── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadMinutesPreview();
    await loadBookshelf();
});

// ── MINUTES ──────────────────────────────────────────────────────────────────
async function loadMinutesPreview() {
    const latest = await supabaseAPI.getLatestMinutes();
    const preview = document.getElementById('minutesPreview');
    if (!preview) return;

    if (!latest) {
        preview.innerHTML = '<p class="empty-state">No minutes yet — start the first session.</p>';
        return;
    }

    const date = new Date(latest.session_date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    preview.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <strong style="color:var(--text-primary); font-size:0.9rem;">
                Session ${latest.session_number} — ${latest.title}
            </strong>
            <span style="font-size:0.72rem; color:var(--text-muted);">
                ${date} · 
                <span style="color: ${latest.status === 'open' ? '#4ade80' : 'var(--text-muted)'}">
                    ${latest.status === 'open' ? '⬤ Open' : '✓ Closed'}
                </span>
            </span>
        </div>
        <p style="font-size:0.83rem; color:var(--text-secondary); line-height:1.6; 
                  white-space:pre-wrap; max-height:80px; overflow:hidden;">
            ${latest.content.substring(0, 280)}${latest.content.length > 280 ? '...' : ''}
        </p>
    `;
}

// ── MINUTES MODALS ────────────────────────────────────────────────────────────
async function showNewMinutesModal() {
    // Auto-calculate next session number
    const existing = await supabaseAPI.getMinutes();
    const nextNum = existing.length > 0
        ? Math.max(...existing.map(m => m.session_number)) + 1
        : 1;

    document.getElementById('minutesTitle').value = '';
    document.getElementById('minutesContent').value =
        `Session ${nextNum} — ${new Date().toLocaleDateString('en-GB')}\n\n` +
        `## Previous Minutes Synopsis\n> N/A\n\n` +
        `## Items Discussed\n- [ ] \n\n` +
        `## Decisions Made\n- \n\n` +
        `## Carry Forward\n- `;

    openModal('minutesModal');
}

async function saveMinutes() {
    const title   = document.getElementById('minutesTitle').value.trim();
    const content = document.getElementById('minutesContent').value.trim();
    if (!title || !content) return;

    const existing  = await supabaseAPI.getMinutes();
    const sessionNum = existing.length > 0
        ? Math.max(...existing.map(m => m.session_number)) + 1
        : 1;
    const today = new Date().toISOString().split('T')[0];

    await supabaseAPI.createMinutes(sessionNum, today, title, content);
    closeMinutesModal();
    await loadMinutesPreview();
}

function closeMinutesModal() { closeModal('minutesModal'); }

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
}

// Close modals on overlay click
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('modalOverlay')?.addEventListener('click', () => {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        document.getElementById('modalOverlay').classList.remove('active');
    });
});

// ── ADD FOLDER MODAL ──────────────────────────────────────────────────────────
function showAddFolderModal() {
    document.getElementById('newFolderName').value = '';
    document.getElementById('newFolderIcon').value = '📁';
    openModal('addFolderModal');
}

function closeAddFolderModal() { closeModal('addFolderModal'); }

async function saveNewFolder() {
    const name = document.getElementById('newFolderName').value.trim();
    const icon = document.getElementById('newFolderIcon').value.trim() || '📁';
    if (!name) return;

    await supabaseAPI.createFolder(name, icon);
    closeAddFolderModal();
    await loadBookshelf();
}
