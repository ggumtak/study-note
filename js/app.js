/**
 * app.js - Main Application Entry Point
 */

const App = {
    drawings: [],
    textBoxes: [],

    async init() {
        console.log('📚 스터디 노트 시작...');

        // Auto-clear old caches on startup (dev mode)
        if ('caches' in window) {
            try {
                const keys = await caches.keys();
                const currentVersion = 'study-note-v6';
                for (const key of keys) {
                    if (key !== currentVersion) {
                        await caches.delete(key);
                        console.log('🗑️ Old cache deleted:', key);
                    }
                }
            } catch (e) { /* ignore */ }
        }

        // Initialize modules
        Markdown.init();
        Canvas.init();
        Split.init();
        AnswerEditor.init();
        if (typeof PageManager !== 'undefined') PageManager.init();

        // Start at home view
        UI.goHome();

        // Setup event listeners
        this.setupEvents();

        // Setup draggable toolbar
        this.setupDraggableToolbar();

        // Setup drawing palette
        this.setupDrawingPalette();

        console.log('✅ 앱 준비 완료!');
    },

    setupDraggableToolbar() {
        const toolbar = document.getElementById('floatingToolbar');
        const handle = document.getElementById('toolbarDragHandle');
        if (!toolbar || !handle) return;

        let isDragging = false;
        let startX, startY, initialX, initialY;

        handle.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') return; // Only pen/mouse

            isDragging = true;
            toolbar.classList.add('dragging');

            // Make it floating if not already
            if (!toolbar.classList.contains('floating')) {
                const rect = toolbar.getBoundingClientRect();
                toolbar.style.left = rect.left + 'px';
                toolbar.style.top = rect.top + 'px';
                toolbar.classList.add('floating');
            }

            startX = e.clientX;
            startY = e.clientY;
            initialX = toolbar.offsetLeft;
            initialY = toolbar.offsetTop;

            handle.setPointerCapture(e.pointerId);
        });

        handle.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            toolbar.style.left = (initialX + dx) + 'px';
            toolbar.style.top = (initialY + dy) + 'px';
            toolbar.style.transform = 'none';
        });

        handle.addEventListener('pointerup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            toolbar.classList.remove('dragging');
            handle.releasePointerCapture(e.pointerId);
        });
    },

    setupDrawingPalette() {
        // Detachable toolbar setup
        const toolbar = document.getElementById('detachableToolbar');
        const handle = document.getElementById('toolbarDragHandle');
        const rotateBtn = document.getElementById('toolbarRotateBtn');
        if (!toolbar || !handle) return;

        let isDragging = false;
        let startX, startY, initialX, initialY;

        handle.addEventListener('pointerdown', (e) => {
            isDragging = true;

            // Detach if not already
            if (!toolbar.classList.contains('detached')) {
                const rect = toolbar.getBoundingClientRect();
                toolbar.classList.add('detached');
                toolbar.style.left = rect.left + 'px';
                toolbar.style.top = rect.top + 'px';
                // Show rotate button when detached
                rotateBtn?.classList.remove('hidden');
            }

            toolbar.classList.add('dragging');
            startX = e.clientX;
            startY = e.clientY;
            initialX = toolbar.offsetLeft;
            initialY = toolbar.offsetTop;

            handle.setPointerCapture(e.pointerId);
        });

        handle.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            toolbar.style.left = (initialX + dx) + 'px';
            toolbar.style.top = (initialY + dy) + 'px';
        });

        handle.addEventListener('pointerup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            toolbar.classList.remove('dragging');
            handle.releasePointerCapture(e.pointerId);
        });

        // Rotate button - toggle horizontal/vertical layout
        rotateBtn?.addEventListener('click', () => {
            toolbar.classList.toggle('horizontal');
        });

        // Double-tap handle to re-attach to header
        let lastTap = 0;
        handle.addEventListener('click', () => {
            const now = Date.now();
            if (now - lastTap < 300 && toolbar.classList.contains('detached')) {
                // Double tap - re-attach
                toolbar.classList.remove('detached', 'horizontal');
                toolbar.style.left = '';
                toolbar.style.top = '';
                rotateBtn?.classList.add('hidden');
            }
            lastTap = now;
        });
    },

    setupEvents() {
        // Home view - Add folder
        document.getElementById('addFolderBtn')?.addEventListener('click', () => {
            UI.showNameModal('새 폴더', '', (name) => {
                if (name) {
                    DB.createFolder(name);
                    UI.renderFolders();
                    UI.toast('폴더가 생성되었습니다');
                }
            });
        });

        // Export/Import
        document.getElementById('exportAllBtn')?.addEventListener('click', () => {
            DB.exportAll();
            UI.toast('백업 파일이 다운로드됩니다');
        });

        document.getElementById('importAllBtn')?.addEventListener('click', () => {
            document.getElementById('fileInput')?.click();
        });

        document.getElementById('fileInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                if (DB.importAll(evt.target.result)) {
                    UI.goHome();
                    UI.toast('복원되었습니다');
                } else {
                    UI.toast('복원 실패');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        // Folder view - Back & Add note
        document.getElementById('backToHomeBtn')?.addEventListener('click', () => {
            UI.goHome();
        });

        // FAB Menu Toggle
        document.getElementById('addNoteBtn')?.addEventListener('click', () => {
            const menu = document.getElementById('fabMenu');
            const fab = document.getElementById('addNoteBtn');
            menu.classList.toggle('hidden');
            fab.classList.toggle('open');
        });

        // New Note from FAB menu
        document.getElementById('newNoteBtn')?.addEventListener('click', () => {
            document.getElementById('fabMenu')?.classList.add('hidden');
            document.getElementById('addNoteBtn')?.classList.remove('open');

            UI.showNameModal('새 노트', '', (name) => {
                if (name) {
                    const note = DB.createNote(UI.currentFolderId, name);
                    if (note) {
                        UI.openNote(note.id);
                        // Don't auto-open modal - let user type directly
                    }
                }
            });
        });

        // Import File from FAB menu
        document.getElementById('importFileBtn')?.addEventListener('click', () => {
            document.getElementById('fabMenu')?.classList.add('hidden');
            document.getElementById('addNoteBtn')?.classList.remove('open');

            // Create file input for txt/pdf
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt,.md,.pdf';
            input.onchange = (e) => this.handleFileImport(e);
            input.click();
        });

        document.getElementById('editFolderBtn')?.addEventListener('click', (e) => {
            UI.contextTarget = { type: 'folder', id: UI.currentFolderId };
            UI.showContextMenu('contextMenu', e.clientX, e.clientY);
        });

        // Note view - Back
        document.getElementById('backToFolderBtn')?.addEventListener('click', () => {
            UI.saveCurrentNote();
            UI.openFolder(UI.currentFolderId);
        });

        // Screen Lock Toggle - prevents pinch zoom
        // Note: Canvas always has touch-action: none (CSS). Finger touch is handled by returning early in canvas.js pointerdown.
        // This toggle only affects the previewWrapper class for additional styling.
        const screenLockBtn = document.getElementById('screenLockBtn');
        screenLockBtn?.addEventListener('click', () => {
            const previewWrapper = document.getElementById('previewWrapper');
            const isLocked = screenLockBtn.classList.toggle('active');

            if (isLocked) {
                // Lock: prevent finger scroll (zoom-locked class adds touch-action: none to wrapper)
                previewWrapper?.classList.add('zoom-locked');
                UI.toast('화면 잠금 ON - 확대/축소 비활성화');
            } else {
                // Unlock: allow finger scroll via wrapper, but canvas still captures pen
                previewWrapper?.classList.remove('zoom-locked');
                UI.toast('화면 잠금 OFF');
            }
        });

        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Canvas.setMode(btn.dataset.mode);
            });
        });

        // Note menu
        document.getElementById('noteMenuBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.getElementById('noteMenu');
            if (menu.classList.contains('hidden')) {
                UI.showContextMenu('noteMenu', e.clientX - 180, e.clientY);
            } else {
                menu.classList.add('hidden');
            }
        });

        // Markdown Input Button (Header)
        document.getElementById('markdownBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('inputModal');
            const textarea = document.getElementById('markdownInput');
            modal?.classList.remove('hidden');

            if (textarea) {
                setTimeout(() => {
                    textarea.focus();
                    textarea.scrollTop = textarea.scrollHeight;
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                }, 100);
            }
        });

        // Edit markdown FAB (also opens modal for backward compatibility)
        document.getElementById('editMarkdownBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('inputModal');
            const textarea = document.getElementById('markdownInput');
            modal?.classList.remove('hidden');

            // Scroll to bottom and focus at end
            if (textarea) {
                setTimeout(() => {
                    textarea.focus();
                    textarea.scrollTop = textarea.scrollHeight;
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                }, 100);
            }
        });

        // Input modal
        document.getElementById('closeInputModal')?.addEventListener('click', () => {
            document.getElementById('inputModal')?.classList.add('hidden');
        });

        document.getElementById('applyMarkdownBtn')?.addEventListener('click', () => {
            document.getElementById('inputModal')?.classList.add('hidden');
            Markdown.render();
            UI.saveCurrentNote();
            UI.toast('적용되었습니다');
        });

        // Name modal
        document.getElementById('cancelNameBtn')?.addEventListener('click', () => {
            UI.closeNameModal(false);
        });

        document.getElementById('confirmNameBtn')?.addEventListener('click', () => {
            UI.closeNameModal(true);
        });

        document.getElementById('nameInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') UI.closeNameModal(true);
            if (e.key === 'Escape') UI.closeNameModal(false);
        });

        // Context menu actions
        document.querySelectorAll('.context-item[data-action]').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                UI.closeAllMenus();

                switch (action) {
                    case 'rename':
                    case 'delete':
                        UI.handleContextAction(action);
                        break;
                    case 'addMemo':
                        const box = UI.createTextBox();
                        box.querySelector('.text-box-content')?.focus();
                        break;
                    case 'clearDrawing':
                        Canvas.clear();
                        break;
                    case 'renameNote':
                        const note = DB.getNote(UI.currentFolderId, UI.currentNoteId);
                        UI.showNameModal('노트 이름 변경', note?.name || '', (name) => {
                            if (name) {
                                DB.renameNote(UI.currentFolderId, UI.currentNoteId, name);
                                document.getElementById('noteTitle').textContent = name;
                                UI.toast('이름이 변경되었습니다');
                            }
                        });
                        break;
                    case 'deleteNote':
                        if (confirm('이 노트를 삭제하시겠습니까?')) {
                            DB.deleteNote(UI.currentFolderId, UI.currentNoteId);
                            UI.openFolder(UI.currentFolderId);
                            UI.toast('노트가 삭제되었습니다');
                        }
                        break;
                }
            });
        });

        // Color picker
        document.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                Canvas.penColor = dot.dataset.color;
            });
        });

        // Pen size
        document.getElementById('penSize')?.addEventListener('input', (e) => {
            Canvas.penSize = parseInt(e.target.value);
            const display = document.getElementById('penSizeValue');
            if (display) display.textContent = Canvas.penSize;
        });

        // Eraser size
        document.getElementById('eraserSize')?.addEventListener('input', (e) => {
            Canvas.eraserSize = parseInt(e.target.value);
            const display = document.getElementById('eraserSizeValue');
            if (display) display.textContent = Canvas.eraserSize;
        });

        // Pen style selector
        document.querySelectorAll('.pen-style').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pen-style').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Canvas.penStyle = btn.dataset.style;
            });
        });

        // Direct editing on markdownPreview
        const markdownInput = document.getElementById('markdownInput');
        const preview = document.getElementById('markdownPreview');

        preview?.addEventListener('input', () => {
            // Sync content to hidden textarea
            if (markdownInput) {
                markdownInput.value = preview.innerText || '';
            }
            UI.saveCurrentNote();
        });

        // Close menus on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu') && !e.target.closest('.icon-btn')) {
                UI.closeAllMenus();
            }
        });

        // Modal overlay click
        document.getElementById('inputModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'inputModal') {
                e.target.classList.add('hidden');
            }
        });

        document.getElementById('nameModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'nameModal') {
                UI.closeNameModal(false);
            }
        });
    },

    // Handle file import (txt, md, pdf)
    handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name.replace(/\.[^.]+$/, ''); // Remove extension
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'txt' || ext === 'md') {
            // Text/Markdown file
            const reader = new FileReader();
            reader.onload = (evt) => {
                let content = evt.target.result;

                // If txt, wrap in markdown-friendly format
                if (ext === 'txt') {
                    // Convert plain text to basic markdown
                    content = content.split('\n').map(line => {
                        // Keep blank lines
                        if (!line.trim()) return '';
                        return line;
                    }).join('\n');
                }

                // Create new note with content
                const note = DB.createNote(UI.currentFolderId, fileName);
                if (note) {
                    // Fix: Use correct signature (folderId, noteId, updates)
                    DB.updateNote(UI.currentFolderId, note.id, { markdown: content });
                    UI.openFolder(UI.currentFolderId);
                    UI.toast(`"${fileName}" 불러오기 완료`);
                }
            };
            reader.readAsText(file);
        } else if (ext === 'pdf') {
            // PDF file - render with PDFViewer
            const note = DB.createNote(UI.currentFolderId, fileName);
            if (note) {
                note.isPDF = true;
                DB.updateNote(note.id, note);

                // Open note and load PDF
                UI.openNote(note.id);

                setTimeout(async () => {
                    if (typeof PDFViewer !== 'undefined') {
                        await PDFViewer.loadFromFile(file, note.id);
                        await PDFViewer.renderAllPages();
                        UI.toast(`"${fileName}" PDF 불러오기 완료`);
                    }
                }, 300);
            }
        } else {
            UI.toast('지원하지 않는 파일 형식입니다');
        }
    }
};

// Start app
document.addEventListener('DOMContentLoaded', () => App.init());
