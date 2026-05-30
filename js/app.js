// ─── 3C Boardroom HQ — App ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    await loadBookshelf();
});

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('modalOverlay')?.addEventListener('click', () => {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        document.getElementById('modalOverlay').classList.remove('active');
    });
});

// ── FOLDER MODALS ─────────────────────────────────────────────────────────────
function showAddFolderModal() {
    document.getElementById('newFolderName').value = '';
    document.getElementById('newFolderIcon').value = '📁';
    document.getElementById('newFolderR2').value   = '';
    openModal('addFolderModal');
}

function closeAddFolderModal() { closeModal('addFolderModal'); }

async function saveNewFolder() {
    const name  = document.getElementById('newFolderName').value.trim();
    const icon  = document.getElementById('newFolderIcon').value.trim() || '📁';
    const r2Key = document.getElementById('newFolderR2').value.trim();
    if (!name) return;

    await supabaseAPI.createFolder(name, icon, '#6B21A8', r2Key);
    closeAddFolderModal();
    await loadBookshelf();
}
