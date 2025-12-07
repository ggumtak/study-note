/**
 * events.js - Event Handlers Module
 */

const EventsModule = {
    init() {
        this.setupModeButtons();
        this.setupColorButtons();
        this.setupPenSize();
        this.setupCanvasEvents();
        this.setupToolButtons();
        this.setupProblemNav();
        this.setupModal();
        this.setupMenu();
        this.setupKeyboard();
    },

    setupModeButtons() {
        DOM.viewModeBtn.addEventListener('click', () => CanvasModule.setMode('view'));
        DOM.drawModeBtn.addEventListener('click', () => CanvasModule.setMode('draw'));
        DOM.eraserModeBtn.addEventListener('click', () => CanvasModule.setMode('eraser'));
    },

    setupColorButtons() {
        document.querySelectorAll('.color-dot').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-dot').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AppState.penColor = btn.dataset.color;
            });
        });
    },

    setupPenSize() {
        DOM.penSizeSlider.addEventListener('input', (e) => {
            AppState.penSize = parseInt(e.target.value);
            DOM.penSizeValue.textContent = AppState.penSize;
        });
    },

    setupCanvasEvents() {
        const canvas = DOM.canvas;

        canvas.addEventListener('mousedown', (e) => CanvasModule.startDrawing(e));
        canvas.addEventListener('mousemove', (e) => CanvasModule.draw(e));
        canvas.addEventListener('mouseup', () => CanvasModule.stopDrawing());
        canvas.addEventListener('mouseleave', () => CanvasModule.stopDrawing());

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            CanvasModule.startDrawing(e);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            CanvasModule.draw(e);
        }, { passive: false });

        canvas.addEventListener('touchend', () => CanvasModule.stopDrawing());
    },

    setupToolButtons() {
        DOM.addTextBoxBtn.addEventListener('click', () => TextBoxModule.add());
        DOM.clearCanvasBtn.addEventListener('click', () => CanvasModule.clear());
        DOM.saveBtn.addEventListener('click', () => StorageModule.save());
        DOM.loadBtn.addEventListener('click', () => StorageModule.load());
        DOM.fileInput.addEventListener('change', (e) => StorageModule.handleFileLoad(e));
        DOM.deleteProblemBtn.addEventListener('click', () => {
            DOM.dropdownMenu.classList.add('hidden');
            ProblemsModule.deleteCurrent();
        });
    },

    setupProblemNav() {
        DOM.prevProblemBtn.addEventListener('click', () => ProblemsModule.prev());
        DOM.nextProblemBtn.addEventListener('click', () => ProblemsModule.next());
        DOM.addProblemBtn.addEventListener('click', () => ProblemsModule.addNew());
    },

    setupModal() {
        DOM.closeModalBtn.addEventListener('click', () => ProblemsModule.closeInputModal());
        DOM.cancelModalBtn.addEventListener('click', () => ProblemsModule.closeInputModal());
        DOM.applyMarkdownBtn.addEventListener('click', () => ProblemsModule.applyMarkdown());
        DOM.fabInput.addEventListener('click', () => ProblemsModule.openInputModal());

        // Empty state button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'emptyStateBtn' || e.target.closest('#emptyStateBtn')) {
                ProblemsModule.openInputModal();
            }
        });

        // Close modal on overlay click
        DOM.inputModal.addEventListener('click', (e) => {
            if (e.target === DOM.inputModal) {
                ProblemsModule.closeInputModal();
            }
        });
    },

    setupMenu() {
        DOM.menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            DOM.dropdownMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!DOM.dropdownMenu.contains(e.target) && e.target !== DOM.menuBtn) {
                DOM.dropdownMenu.classList.add('hidden');
            }
        });
    },

    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Don't handle shortcuts when typing
            if (e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    StorageModule.save();
                } else if (e.key === 'o') {
                    e.preventDefault();
                    StorageModule.load();
                }
            }

            // Arrow keys for problem navigation
            if (e.key === 'ArrowLeft') ProblemsModule.prev();
            if (e.key === 'ArrowRight') ProblemsModule.next();

            // Mode shortcuts
            if (e.key === 'v') CanvasModule.setMode('view');
            if (e.key === 'p' || e.key === 'd') CanvasModule.setMode('draw');
            if (e.key === 'e') CanvasModule.setMode('eraser');

            // Escape to close modal/menu
            if (e.key === 'Escape') {
                ProblemsModule.closeInputModal();
                DOM.dropdownMenu.classList.add('hidden');
            }
        });
    }
};
