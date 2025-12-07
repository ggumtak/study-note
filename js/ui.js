/**
 * ui.js - UI Management and View Navigation
 */

const UI = {
    currentView: 'home',
    currentFolderId: null,
    currentNoteId: null,
    contextTarget: null,

    /**
     * Show a specific view
     */
    showView(viewName) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewName + 'View').classList.add('active');
        this.currentView = viewName;
        this.closeAllMenus();
    },

    /**
     * Navigate to home (folders list)
     */
    goHome() {
        this.showView('home');
        this.renderFolders();
    },

    /**
     * Open a folder (show notes list)
     */
    openFolder(folderId) {
        this.currentFolderId = folderId;
        const folder = DB.getFolder(folderId);
        if (!folder) return;

        document.getElementById('folderTitle').textContent = folder.name;
        this.showView('folder');
        this.renderNotes();
    },

    /**
     * Open a note (show editor)
     */
    openNote(noteId) {
        this.currentNoteId = noteId;
        const note = DB.getNote(this.currentFolderId, noteId);
        if (!note) return;

        document.getElementById('noteTitle').textContent = note.name;
        document.getElementById('markdownInput').value = note.markdown || '';

        // Load drawings via Canvas module
        Canvas.loadDrawings(note.drawings || []);
        App.textBoxes = [];

        // Load answer data
        if (typeof AnswerEditor !== 'undefined') {
            AnswerEditor.setValue(note.answer || '');
        }

        this.showView('note');
        Markdown.render();

        setTimeout(() => {
            Canvas.resize();
            this.restoreTextBoxes(note.textBoxes || []);

            // Focus on editable preview for direct typing
            const preview = document.getElementById('markdownPreview');
            if (preview) {
                preview.focus();
            }
        }, 100);
    },

    /**
     * Save current note
     */
    saveCurrentNote() {
        if (!this.currentFolderId || !this.currentNoteId) return;

        DB.updateNote(this.currentFolderId, this.currentNoteId, {
            markdown: document.getElementById('markdownInput').value,
            drawings: Canvas.getDrawings(),
            textBoxes: this.getTextBoxData(),
            answer: typeof AnswerEditor !== 'undefined' ? AnswerEditor.getValue() : ''
        });
    },

    /**
     * Render folders grid
     */
    renderFolders() {
        const grid = document.getElementById('folderGrid');
        const folders = DB.getFolders();

        if (folders.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-icon">📁</div>
                    <div class="empty-text">폴더가 없습니다<br>+ 버튼을 눌러 새 폴더를 만드세요</div>
                </div>
            `;
            return;
        }

        grid.innerHTML = folders.map(folder => `
            <div class="folder-card" data-id="${folder.id}">
                <div class="folder-icon">📁</div>
                <div class="folder-name">${this.escapeHtml(folder.name)}</div>
                <div class="folder-count">${folder.notes.length}개의 노트</div>
            </div>
        `).join('');

        // Add click handlers
        grid.querySelectorAll('.folder-card').forEach(card => {
            card.addEventListener('click', () => this.openFolder(card.dataset.id));
            card.addEventListener('contextmenu', (e) => this.showFolderContext(e, card.dataset.id));
            card.addEventListener('long-press', (e) => this.showFolderContext(e, card.dataset.id));
        });

        // Add long press detection
        this.addLongPress(grid.querySelectorAll('.folder-card'));
    },

    /**
     * Render notes list
     */
    renderNotes() {
        const list = document.getElementById('notesList');
        const notes = DB.getNotes(this.currentFolderId);

        if (notes.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div class="empty-text">노트가 없습니다<br>+ 버튼을 눌러 새 노트를 만드세요</div>
                </div>
            `;
            return;
        }

        // Sort by updated date (newest first)
        const sorted = [...notes].sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        list.innerHTML = sorted.map(note => {
            const preview = this.getPreview(note.markdown);
            const date = this.formatDate(note.updatedAt);
            return `
                <div class="note-item" data-id="${note.id}">
                    <div class="note-item-title">
                        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        ${this.escapeHtml(note.name)}
                    </div>
                    <div class="note-item-preview">${preview}</div>
                    <div class="note-item-date">${date}</div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => this.openNote(item.dataset.id));
            item.addEventListener('contextmenu', (e) => this.showNoteContext(e, item.dataset.id));
        });

        this.addLongPress(list.querySelectorAll('.note-item'));
    },

    /**
     * Show context menu for folder
     */
    showFolderContext(e, folderId) {
        e.preventDefault();
        e.stopPropagation();
        this.contextTarget = { type: 'folder', id: folderId };
        this.showContextMenu('contextMenu', e.clientX || e.touches?.[0]?.clientX, e.clientY || e.touches?.[0]?.clientY);
    },

    /**
     * Show context menu for note
     */
    showNoteContext(e, noteId) {
        e.preventDefault();
        e.stopPropagation();
        this.contextTarget = { type: 'note', id: noteId };
        this.showContextMenu('contextMenu', e.clientX || e.touches?.[0]?.clientX, e.clientY || e.touches?.[0]?.clientY);
    },

    /**
     * Show a context menu at position
     */
    showContextMenu(menuId, x, y) {
        this.closeAllMenus();
        const menu = document.getElementById(menuId);
        menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
        menu.style.top = Math.min(y, window.innerHeight - 200) + 'px';
        menu.classList.remove('hidden');
    },

    /**
     * Close all menus
     */
    closeAllMenus() {
        document.querySelectorAll('.context-menu').forEach(m => m.classList.add('hidden'));
    },

    /**
     * Handle context menu action
     */
    handleContextAction(action) {
        this.closeAllMenus();
        const target = this.contextTarget;
        if (!target) return;

        switch (action) {
            case 'rename':
                if (target.type === 'folder') {
                    const folder = DB.getFolder(target.id);
                    this.showNameModal('폴더 이름 변경', folder?.name || '', (name) => {
                        if (name) {
                            DB.renameFolder(target.id, name);
                            this.renderFolders();
                            this.toast('이름이 변경되었습니다');
                        }
                    });
                } else {
                    const note = DB.getNote(this.currentFolderId, target.id);
                    this.showNameModal('노트 이름 변경', note?.name || '', (name) => {
                        if (name) {
                            DB.renameNote(this.currentFolderId, target.id, name);
                            this.renderNotes();
                            this.toast('이름이 변경되었습니다');
                        }
                    });
                }
                break;

            case 'delete':
                if (target.type === 'folder') {
                    if (confirm('이 폴더와 모든 노트를 삭제하시겠습니까?')) {
                        DB.deleteFolder(target.id);
                        this.renderFolders();
                        this.toast('폴더가 삭제되었습니다');
                    }
                } else {
                    if (confirm('이 노트를 삭제하시겠습니까?')) {
                        DB.deleteNote(this.currentFolderId, target.id);
                        this.renderNotes();
                        this.toast('노트가 삭제되었습니다');
                    }
                }
                break;
        }
    },

    /**
     * Show name input modal
     */
    showNameModal(title, defaultValue, callback) {
        document.getElementById('nameModalTitle').textContent = title;
        const input = document.getElementById('nameInput');
        input.value = defaultValue;
        document.getElementById('nameModal').classList.remove('hidden');
        input.focus();
        input.select();

        this._nameCallback = callback;
    },

    /**
     * Close name modal
     */
    closeNameModal(confirm) {
        document.getElementById('nameModal').classList.add('hidden');
        if (confirm && this._nameCallback) {
            this._nameCallback(document.getElementById('nameInput').value.trim());
        }
        this._nameCallback = null;
    },

    /**
     * Show toast message
     */
    toast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2000);
    },

    /**
     * Add long press detection for mobile
     */
    addLongPress(elements) {
        elements.forEach(el => {
            let timer;
            el.addEventListener('touchstart', (e) => {
                timer = setTimeout(() => {
                    el.dispatchEvent(new CustomEvent('long-press', { detail: e }));
                }, 500);
            });
            el.addEventListener('touchend', () => clearTimeout(timer));
            el.addEventListener('touchmove', () => clearTimeout(timer));
        });
    },

    /**
     * Utility: Get preview text from markdown
     */
    getPreview(markdown) {
        if (!markdown) return '내용 없음';
        const text = markdown.replace(/[#*`>\[\]()_~-]/g, '').trim();
        return text.slice(0, 80) || '내용 없음';
    },

    /**
     * Utility: Format date
     */
    formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '방금 전';
        if (diff < 3600000) return Math.floor(diff / 60000) + '분 전';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '시간 전';
        if (diff < 604800000) return Math.floor(diff / 86400000) + '일 전';

        return date.toLocaleDateString('ko-KR');
    },

    /**
     * Utility: Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Text box management
     */
    restoreTextBoxes(textBoxData) {
        const wrapper = document.getElementById('previewWrapper');
        wrapper.querySelectorAll('.text-box').forEach(el => el.remove());
        App.textBoxes = [];

        textBoxData.forEach(tb => {
            this.createTextBox(tb.left, tb.top, tb.content, tb.id);
        });
    },

    createTextBox(left = '50px', top = '100px', content = '메모', id = null) {
        const boxId = id || Date.now().toString();
        const wrapper = document.getElementById('previewWrapper');

        const textBox = document.createElement('div');
        textBox.className = 'text-box';
        textBox.id = 'textbox-' + boxId;
        textBox.style.left = left;
        textBox.style.top = typeof top === 'number' ? top + 'px' : top;

        textBox.innerHTML = `
            <button class="delete-btn" onclick="UI.deleteTextBox('${boxId}')">×</button>
            <div class="text-box-content" contenteditable="true">${content}</div>
        `;

        wrapper.appendChild(textBox);
        this.makeTextBoxDraggable(textBox);
        App.textBoxes.push({ id: boxId, element: textBox });

        return textBox;
    },

    deleteTextBox(id) {
        const el = document.getElementById('textbox-' + id);
        if (el) el.remove();
        App.textBoxes = App.textBoxes.filter(tb => tb.id !== id);
        this.saveCurrentNote();
    },

    makeTextBoxDraggable(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        const start = (e) => {
            if (e.target.classList.contains('text-box-content') ||
                e.target.classList.contains('delete-btn')) return;

            isDragging = true;
            const rect = element.getBoundingClientRect();
            const wrapper = document.getElementById('previewWrapper');
            const wrapperRect = wrapper.getBoundingClientRect();

            startX = e.touches ? e.touches[0].clientX : e.clientX;
            startY = e.touches ? e.touches[0].clientY : e.clientY;
            initialX = rect.left - wrapperRect.left + wrapper.scrollLeft;
            initialY = rect.top - wrapperRect.top + wrapper.scrollTop;

            e.preventDefault();
        };

        const move = (e) => {
            if (!isDragging) return;
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            const y = e.touches ? e.touches[0].clientY : e.clientY;
            element.style.left = (initialX + x - startX) + 'px';
            element.style.top = (initialY + y - startY) + 'px';
            e.preventDefault();
        };

        const end = () => {
            if (isDragging) {
                isDragging = false;
                UI.saveCurrentNote();
            }
        };

        element.addEventListener('mousedown', start);
        element.addEventListener('touchstart', start, { passive: false });
        document.addEventListener('mousemove', move);
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('mouseup', end);
        document.addEventListener('touchend', end);
    },

    getTextBoxData() {
        return App.textBoxes.map(tb => {
            const el = document.getElementById('textbox-' + tb.id);
            if (!el) return null;
            return {
                id: tb.id,
                left: el.style.left,
                top: el.style.top,
                content: el.querySelector('.text-box-content').innerHTML
            };
        }).filter(Boolean);
    }
};
