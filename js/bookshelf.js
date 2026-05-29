// ─── 3C Boardroom HQ — Bookshelf ─────────────────────────────────────────────

let currentFolderId   = null;
let currentFolderName = '';
let currentFileId     = null;

// ── LOAD BOOKSHELF ────────────────────────────────────────────────────────────
async function loadBookshelf() {
    const shelf   = document.getElementById('bookshelf');
    const folders = await supabaseAPI.getFolders();

    if (!folders.length) {
        shelf.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;font-style:italic;">No folders yet.</p>';
        return;
    }

    // Get file counts for each folder
    const spines = await Promise.all(folders.map(async folder => {
        const files = await supabaseAPI.getFiles(folder.id);
        return buildFolderSpine(folder, files.length);
    }));

    shelf.innerHTML = spines.join('');
}

function buildFolderSpine(folder, fileCount) {
    const label = folder.name.length > 12
        ? folder.name.substring(0, 11) + '…'
        : folder.name;

    // Generate a lighter shade of the folder color for the gradient
    return `
        <div class="folder-spine"
             style="background: linear-gradient(160deg, ${folder.color}cc, ${folder.color}88);"
             onclick="openFolderModal('${folder.id}', '${escStr(folder.name)}')"
             title="${folder.name}">
            <span class="folder-spine-count">${fileCount || ''}</span>
            <span class="folder-spine-icon">${folder.icon}</span>
            <span class="folder-spine-label">${label}</span>
        </div>
    `;
}

// ── FOLDER MODAL ──────────────────────────────────────────────────────────────
async function openFolderModal(folderId, folderName) {
    currentFolderId   = folderId;
    currentFolderName = folderName;

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
        <div class="file-item" onclick="openFileView('${file.id}', '${escStr(file.title)}', '${escStr(file.content)}')">
            <div>
                <div class="file-item-title">${file.title}</div>
                <div class="file-item-meta">
                    ${new Date(file.created_at).toLocaleDateString('en-GB')}
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

    await supabaseAPI.createFile(currentFolderId, title, content);
    hideAddFileForm();
    await renderFileList();
    await loadBookshelf(); // refresh file counts
}

// ── FILE VIEW MODAL ───────────────────────────────────────────────────────────
function openFileView(fileId, title, content) {
    currentFileId = fileId;
    document.getElementById('fileViewTitle').textContent   = title;
    document.getElementById('fileViewContent').value       = content;
    openModal('fileViewModal');
}

async function saveFileEdit() {
    if (!currentFileId) return;
    const title   = document.getElementById('fileViewTitle').textContent;
    const content = document.getElementById('fileViewContent').value;
    await supabaseAPI.updateFile(currentFileId, title, content);
    await renderFileList();
    closeFileViewModal();
}

async function deleteCurrentFile() {
    if (!currentFileId) return;
    if (!confirm('Delete this file? This cannot be undone.')) return;
    await supabaseAPI.deleteFile(currentFileId);
    currentFileId = null;
    closeFileViewModal();
    await renderFileList();
    await loadBookshelf();
}

function closeFileViewModal() {
    currentFileId = null;
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
