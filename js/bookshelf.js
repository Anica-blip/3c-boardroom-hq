// ─── 3C Boardroom HQ — Bookshelf (R2-backed file content) ────────────────────

let currentFolderId   = null;
let currentFolderR2   = '';
let currentFileId     = null;
let currentFileR2Key  = null;

// ── LOAD BOOKSHELF ────────────────────────────────────────────────────────────
async function loadBookshelf() {
    const shelf   = document.getElementById('bookshelf');
    const folders = await supabaseAPI.getFolders();

    if (!folders.length) {
        shelf.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;font-style:italic;">No folders yet.</p>';
        return;
    }

    const spines = await Promise.all(folders.map(async folder => {
        const files = await supabaseAPI.getFiles(folder.id);
        return buildFolderSpine(folder, files.length);
    }));

    shelf.innerHTML = spines.join('');
}

function buildFolderSpine(folder, fileCount) {
    return '<div class="folder-spine"' +
        ' style="background: linear-gradient(180deg, ' + folder.color + 'dd 0%, ' + folder.color + '99 100%);"' +
        ' onclick="openFolderModal(\'' + folder.id + '\', \'' + escStr(folder.name) + '\', \'' + escStr(folder.r2_prefix || '') + '\')"' +
        ' title="' + folder.name + '">' +
        '<div class="folder-label-area">' +
        '<span class="folder-spine-label">' + folder.name + '</span>' +
        '</div>' +
        '<div class="folder-body">' +
        '<span class="folder-emoji">' + folder.icon + '</span>' +
        (fileCount ? '<span style="position:absolute;top:40px;right:4px;font-size:0.44rem;color:rgba(255,255,255,0.4);">' + fileCount + '</span>' : '') +
        '</div>' +
        '</div>';
}

// ── FOLDER MODAL ──────────────────────────────────────────────────────────────
async function openFolderModal(folderId, folderName, r2Prefix) {
    currentFolderId = folderId;
    currentFolderR2 = r2Prefix || '';

    document.getElementById('folderModalTitle').textContent = folderName;
    hideAddFileForm();
    await renderFileList();
    openModal('folderModal');
}

async function renderFileList() {
    const list  = document.getElementById('fileList');
    const files = await supabaseAPI.getFiles(currentFolderId);

    if (!files.length) {
        list.innerHTML = '<p class="no-files-msg">No files yet — add the first one.</p>';
        return;
    }

    list.innerHTML = files.map(file => `
        <div class="file-item" onclick="openFileView('${file.id}', '${escStr(file.title)}', '${escStr(file.r2_key || '')}')">
            <div>
                <div class="file-item-title">${file.title}</div>
                <div class="file-item-meta">
                    ${new Date(file.created_at).toLocaleDateString('en-GB')}
                    ${file.r2_key ? ' · <span style="color:var(--purple-light);font-size:0.65rem;">R2 ✓</span>' : ''}
                </div>
            </div>
            <span class="file-type-badge">${file.file_type}</span>
        </div>
    `).join('');
}

function closeFolderModal() {
    currentFolderId = null;
    closeModal('folderModal');
}

// ── ADD FILE FORM ─────────────────────────────────────────────────────────────
function showAddFileForm() {
    document.getElementById('newFileTitle').value   = '';
    document.getElementById('newFileContent').value = '';
    document.getElementById('addFileForm').style.display = 'flex';
    document.getElementById('newFileTitle').focus();
}

function hideAddFileForm() {
    document.getElementById('addFileForm').style.display = 'none';
}

async function saveNewFile() {
    const title   = document.getElementById('newFileTitle').value.trim();
    const content = document.getElementById('newFileContent').value.trim();
    if (!title || !currentFolderId) return;

    // Auto-generate R2 key from folder prefix + slugified title
    const slug  = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const r2Key = currentFolderR2
        ? `${currentFolderR2.replace(/\/$/, '')}/${slug}.md`
        : `skills/${slug}.md`;

    // Upload content to R2 via worker (if content provided)
    if (content) {
        try {
            await fetch(`${WORKER_URL}/files/${encodeURIComponent(r2Key)}`, {
                method:  'POST',
                headers: { 'Content-Type': 'text/plain' },
                body:    content
            });
        } catch (err) {
            console.error('❌ R2 upload error:', err);
        }
    }

    // Save metadata to Supabase (no content stored here)
    await supabaseAPI.createFile(currentFolderId, title, r2Key);
    hideAddFileForm();
    await renderFileList();
    await loadBookshelf();
}

// ── FILE VIEW MODAL (loads content from R2) ───────────────────────────────────
async function openFileView(fileId, title, r2Key) {
    currentFileId    = fileId;
    currentFileR2Key = r2Key;

    document.getElementById('fileViewTitle').textContent = title;
    document.getElementById('fileViewContent').value     = 'Loading from R2...';
    openModal('fileViewModal');

    if (!r2Key) {
        document.getElementById('fileViewContent').value = '';
        return;
    }

    try {
        const response = await fetch(`${WORKER_URL}/files/${encodeURIComponent(r2Key)}`);
        const data     = await response.json();
        document.getElementById('fileViewContent').value = data.content || '';
    } catch (err) {
        document.getElementById('fileViewContent').value = '⚠️ Could not load from R2. Check Worker is deployed.';
    }
}

async function saveFileEdit() {
    if (!currentFileId) return;

    const title   = document.getElementById('fileViewTitle').textContent;
    const content = document.getElementById('fileViewContent').value;

    // Upload updated content to R2
    if (currentFileR2Key && content) {
        try {
            await fetch(`${WORKER_URL}/files/${encodeURIComponent(currentFileR2Key)}`, {
                method:  'POST',
                headers: { 'Content-Type': 'text/plain' },
                body:    content
            });
        } catch (err) {
            console.error('❌ R2 save error:', err);
        }
    }

    // Update metadata in Supabase
    await supabaseAPI.updateFile(currentFileId, title, currentFileR2Key);
    await renderFileList();
    closeFileViewModal();
}

async function deleteCurrentFile() {
    if (!currentFileId) return;
    if (!confirm('Delete this file? This removes the Supabase record. The R2 file can be removed from Cloudflare directly.')) return;
    await supabaseAPI.deleteFile(currentFileId);
    currentFileId    = null;
    currentFileR2Key = null;
    closeFileViewModal();
    await renderFileList();
    await loadBookshelf();
}

function closeFileViewModal() {
    currentFileId    = null;
    currentFileR2Key = null;
    closeModal('fileViewModal');
}

// ── UTILITY ───────────────────────────────────────────────────────────────────
function escStr(str) {
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '\\n');
}
