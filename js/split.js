/**
 * split.js - Split View Manager
 * Handles resizable split pane layout
 */

const Split = {
    container: null,
    divider: null,
    questionPane: null,
    answerPane: null,
    isDragging: false,
    currentMode: 'split',

    init() {
        this.container = document.getElementById('splitContainer');
        this.divider = document.getElementById('splitDivider');
        this.questionPane = document.getElementById('questionPane');
        this.answerPane = document.getElementById('answerPane');

        if (!this.divider) return;

        // Mouse events
        this.divider.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());

        // Touch events
        this.divider.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.drag(e), { passive: false });
        document.addEventListener('touchend', () => this.stopDrag());

        // Load saved ratio
        this.loadRatio();

        // Mode toggle buttons
        document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode === 'note' || mode === 'split' || mode === 'answer') {
                    this.setMode(mode);
                }
            });
        });
    },

    startDrag(e) {
        if (window.innerWidth <= 768) return; // Disable on mobile

        this.isDragging = true;
        this.divider.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    },

    drag(e) {
        if (!this.isDragging) return;

        const containerRect = this.container.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;

        // Calculate percentage
        let percent = ((clientX - containerRect.left) / containerRect.width) * 100;

        // Clamp between 20% and 80%
        percent = Math.max(20, Math.min(80, percent));

        // Snap to 50% if close
        if (Math.abs(percent - 50) < 3) {
            percent = 50;
        }

        this.setRatio(percent);
        e.preventDefault();
    },

    stopDrag() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.divider.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Save ratio
        this.saveRatio();
    },

    setRatio(leftPercent) {
        if (!this.questionPane || !this.answerPane) return;

        this.questionPane.style.flex = `0 0 ${leftPercent}%`;
        this.answerPane.style.flex = `0 0 ${100 - leftPercent - 1}%`;
    },

    saveRatio() {
        const style = this.questionPane.style.flex;
        const match = style.match(/(\d+(?:\.\d+)?)/);
        if (match) {
            localStorage.setItem('splitRatio', match[1]);
        }
    },

    loadRatio() {
        // Reset to new default - 80% question pane
        localStorage.removeItem('splitRatio');
        this.setRatio(80);
    },

    setMode(mode) {
        this.currentMode = mode;
        if (this.container) {
            this.container.dataset.mode = mode;
        }

        // Update toggle buttons
        document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
            const btnMode = btn.dataset.mode;
            btn.classList.toggle('active', btnMode === mode);
        });

        // Resize canvas after mode change
        setTimeout(() => {
            if (typeof Canvas !== 'undefined') {
                Canvas.resize();
            }
        }, 100);
    },

    getMode() {
        return this.currentMode;
    }
};
