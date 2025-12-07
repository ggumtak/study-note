/**
 * canvas.js - Drawing Canvas Module with Undo/Redo and Tool Options
 */

const Canvas = {
    ctx: null,
    canvasEl: null,
    mode: 'view', // 'view' | 'pen' | 'highlighter' | 'eraser'

    // Tool settings
    penColor: '#ffffff',
    penSize: 3,
    highlighterColor: '#ffe66d',
    highlighterSize: 15,
    eraserSize: 15,

    isDrawing: false,
    activePointerId: null,
    sPenButtonPressed: false,
    originalMode: null,
    lastX: 0,
    lastY: 0,

    // Stroke-based history for undo/redo
    history: [],
    redoStack: [],
    currentStroke: null,

    // Page mode
    pageMode: false,
    pageHeight: 800,

    init() {
        const canvas = document.getElementById('drawingCanvas');
        if (!canvas) return;

        this.canvasEl = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Pointer events - pen/stylus draws, finger scrolls
        canvas.addEventListener('pointerdown', (e) => {
            // Skip finger touch - let browser handle scrolling
            if (e.pointerType === 'touch') return;

            // Pen/stylus/mouse: capture and draw
            e.preventDefault();
            e.stopPropagation();
            this.activePointerId = e.pointerId;
            try {
                canvas.setPointerCapture(e.pointerId);
            } catch (err) {
                // Pointer capture may fail on some devices, continue anyway
            }
            this.start(e);
        });

        canvas.addEventListener('pointermove', (e) => {
            // Only process if this is the active pointer and we're drawing
            if (this.isDrawing && (e.pointerId === this.activePointerId || this.activePointerId === null)) {
                e.preventDefault();
                e.stopPropagation();
                this.draw(e);
                return;
            }
            // For non-active pen/mouse, still prevent default to avoid browser gestures
            if (e.pointerType === 'pen' || e.pointerType === 'mouse') {
                e.preventDefault();
                e.stopPropagation();
            }
        });

        canvas.addEventListener('pointerup', (e) => {
            // Only process if this is the active pointer
            if (e.pointerId !== this.activePointerId && this.activePointerId !== null) return;

            try {
                if (canvas.hasPointerCapture(e.pointerId)) {
                    canvas.releasePointerCapture(e.pointerId);
                }
            } catch (err) { }
            this.activePointerId = null;
            this.stop();
        });

        canvas.addEventListener('pointercancel', (e) => {
            try {
                if (canvas.hasPointerCapture(e.pointerId)) {
                    canvas.releasePointerCapture(e.pointerId);
                }
            } catch (err) { }
            this.activePointerId = null;
            this.stop();
        });

        // Additional: prevent pointerleave from breaking stroke
        canvas.addEventListener('pointerleave', (e) => {
            // Only stop if we've lost capture
            if (this.isDrawing && !canvas.hasPointerCapture(e.pointerId)) {
                this.stop();
            }
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Undo/Redo buttons
        document.getElementById('undoBtn')?.addEventListener('click', () => this.undo());
        document.getElementById('redoBtn')?.addEventListener('click', () => this.redo());

        // Tool buttons with popover toggle
        document.querySelectorAll('.toolbar-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tool = btn.dataset.tool;

                // If already active, toggle popover
                if (btn.classList.contains('active')) {
                    this.togglePopover(tool);
                } else {
                    this.setTool(tool);
                    this.closeAllPopovers();
                }
            });
        });

        // Color buttons
        document.querySelectorAll('.color-btn').forEach(btn => {
            // Set background color from data attribute
            btn.style.backgroundColor = btn.dataset.color;

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const grid = btn.closest('.color-grid');
                const target = grid?.dataset.target;

                // Update active state
                grid.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Set color
                if (target === 'pen') {
                    this.penColor = btn.dataset.color;
                } else if (target === 'highlighter') {
                    this.highlighterColor = btn.dataset.color;
                }
            });
        });

        // Size sliders
        document.getElementById('penSizeSlider')?.addEventListener('input', (e) => {
            this.penSize = parseInt(e.target.value);
            document.getElementById('penSizeLabel').textContent = this.penSize;
        });

        document.getElementById('highlighterSizeSlider')?.addEventListener('input', (e) => {
            this.highlighterSize = parseInt(e.target.value);
            document.getElementById('highlighterSizeLabel').textContent = this.highlighterSize;
        });

        document.getElementById('eraserSizeSlider')?.addEventListener('input', (e) => {
            this.eraserSize = parseInt(e.target.value);
            document.getElementById('eraserSizeLabel').textContent = this.eraserSize;
        });

        // Clear all button
        document.getElementById('clearAllBtn')?.addEventListener('click', () => {
            this.clearAll();
            this.closeAllPopovers();
        });

        // Page mode toggle
        document.getElementById('pageModeBtn')?.addEventListener('click', () => {
            this.togglePageMode();
        });

        // Close popovers on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tool-wrapper')) {
                this.closeAllPopovers();
            }
        });
    },

    togglePopover(tool) {
        const popoverId = tool + 'Popover';
        const popover = document.getElementById(popoverId);

        if (popover) {
            const isHidden = popover.classList.contains('hidden');
            this.closeAllPopovers();
            if (isHidden) {
                popover.classList.remove('hidden');
            }
        }
    },

    closeAllPopovers() {
        document.querySelectorAll('.tool-popover').forEach(p => p.classList.add('hidden'));
    },

    resize() {
        const canvas = this.canvasEl;
        const wrapper = document.getElementById('previewWrapper');
        const preview = document.getElementById('markdownPreview');
        if (!canvas || !wrapper || !preview) return;

        const width = Math.max(wrapper.clientWidth, preview.scrollWidth);
        const height = Math.max(wrapper.clientHeight, preview.scrollHeight);

        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        this.redrawAll();
    },

    setTool(tool) {
        const canvas = this.canvasEl;
        if (!canvas) return;

        // Handle keyboard tool - focus on preview for direct input
        if (tool === 'keyboard') {
            const preview = document.getElementById('markdownPreview');
            if (preview) {
                preview.focus();
            }

            // Disable drawing mode
            this.mode = 'view';
            canvas.classList.remove('drawing-mode', 'eraser-mode');
            return;
        }

        // Update mode
        if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
            this.mode = tool;
            this.applyCanvasModeClass(canvas, tool);
        }

        // Update toolbar button states
        document.querySelectorAll('.toolbar-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    },

    setMode(mode) {
        // Legacy mode setter for compatibility
        if (mode === 'draw') {
            this.setTool('pen');
        } else if (mode === 'eraser') {
            this.setTool('eraser');
        } else {
            this.mode = 'view';
            const canvas = this.canvasEl;
            if (canvas) {
                canvas.classList.remove('drawing-mode', 'eraser-mode');
            }
            document.querySelectorAll('.toolbar-btn[data-tool]').forEach(btn => {
                btn.classList.remove('active');
            });
        }
    },

    handleKeydown(e) {
        // Ctrl+Z: Undo
        if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            this.undo();
        }
        // Ctrl+Shift+Z or Ctrl+Y: Redo
        if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') ||
            (e.ctrlKey && e.key.toLowerCase() === 'y')) {
            e.preventDefault();
            this.redo();
        }
    },

    start(e) {
        if (this.mode === 'view') return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        // Only allow drawing with pen (stylus) or mouse, not finger touch
        if (e.pointerType === 'touch') return;

        // S Pen button detection - button 5 is pen eraser, button 2 is secondary
        // When S Pen button is pressed, act as eraser temporarily
        const canvas = this.canvasEl;
        this.sPenButtonPressed = this.isSPenEraserPressed(e);
        if (this.sPenButtonPressed) {
            this.originalMode = this.mode;
            this.mode = 'eraser';
            this.applyCanvasModeClass(canvas, 'eraser');
        }

        this.isDrawing = true;
        const pos = this.getPos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;

        if (this.mode === 'pen' || this.mode === 'highlighter') {
            // Clear redo stack when new stroke starts
            this.redoStack = [];
            this.updateHistoryButtons();

            const color = this.mode === 'pen' ? this.penColor : this.highlighterColor;
            const size = this.mode === 'pen' ? this.penSize : this.highlighterSize;

            this.currentStroke = {
                tool: this.mode,
                color: color,
                size: size,
                opacity: this.mode === 'highlighter' ? 0.4 : 1,
                points: [pos]
            };
        }
    },

    draw(e) {
        if (!this.isDrawing) return;
        const pos = this.getPos(e);

        if (this.mode === 'pen' || this.mode === 'highlighter') {
            this.drawSegment(this.lastX, this.lastY, pos.x, pos.y, this.currentStroke);
            this.currentStroke.points.push(pos);
        } else if (this.mode === 'eraser') {
            this.erase(pos.x, pos.y);
        }

        this.lastX = pos.x;
        this.lastY = pos.y;
    },

    stop() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        // Restore original mode if S Pen button was used
        if (this.sPenButtonPressed && this.originalMode) {
            this.mode = this.originalMode;
            this.applyCanvasModeClass(this.canvasEl, this.mode);
            this.originalMode = null;
            this.sPenButtonPressed = false;
        }

        if (this.currentStroke && this.currentStroke.points.length > 0) {
            this.history.push(this.currentStroke);
            this.updateHistoryButtons();
            this.currentStroke = null;
            UI.saveCurrentNote();
        }
    },

    getPos(e) {
        const canvas = this.canvasEl;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        // Handle touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = rect.width ? canvas.width / rect.width : 1;
        const scaleY = rect.height ? canvas.height / rect.height : 1;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    },

    drawSegment(x1, y1, x2, y2, stroke) {
        if (!this.ctx) return;

        this.ctx.save();
        this.ctx.globalAlpha = stroke.opacity || 1;
        this.ctx.strokeStyle = stroke.color;
        this.ctx.lineWidth = stroke.size;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        this.ctx.restore();
    },

    redrawAll() {
        if (!this.ctx) return;
        const canvas = this.canvasEl;
        if (!canvas) return;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const stroke of this.history) {
            const pts = stroke.points;
            if (pts.length < 2) continue;

            for (let i = 1; i < pts.length; i++) {
                this.drawSegment(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, stroke);
            }
        }
    },

    erase(x, y) {
        const radius = this.eraserSize;
        const before = this.history.length;

        this.history = this.history.filter(stroke => {
            return !stroke.points.some(p => {
                const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
                return dist < radius;
            });
        });

        if (this.history.length !== before) {
            this.redrawAll();
        }
    },

    undo() {
        if (this.history.length === 0) return;

        const stroke = this.history.pop();
        this.redoStack.push(stroke);
        this.redrawAll();
        this.updateHistoryButtons();
        UI.saveCurrentNote();
    },

    redo() {
        if (this.redoStack.length === 0) return;

        const stroke = this.redoStack.pop();
        this.history.push(stroke);
        this.redrawAll();
        this.updateHistoryButtons();
        UI.saveCurrentNote();
    },

    updateHistoryButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        if (undoBtn) {
            undoBtn.disabled = this.history.length === 0;
        }
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
        }
    },

    clearAll() {
        // Save current state for undo before clearing
        const savedHistory = [...this.history];
        if (savedHistory.length > 0) {
            this.redoStack = savedHistory;
        }

        this.history = [];
        const canvas = this.canvasEl;
        if (this.ctx && canvas) this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.updateHistoryButtons();
        UI.saveCurrentNote();
        // toast removed
    },

    togglePageMode() {
        // Delegate to PageManager
        if (typeof PageManager !== 'undefined') {
            PageManager.toggle();
            this.pageMode = PageManager.pageMode;
        } else {
            // Fallback if PageManager not loaded
            this.pageMode = !this.pageMode;
            const btn = document.getElementById('pageModeBtn');
            const wrapper = document.getElementById('previewWrapper');

            if (btn) btn.classList.toggle('active', this.pageMode);
            if (wrapper) wrapper.classList.toggle('page-mode', this.pageMode);

            // toast removed
        }
    },

    paginateContent() {
        const wrapper = document.getElementById('previewWrapper');
        const preview = document.getElementById('markdownPreview');
        if (!preview || !wrapper) return;

        const pageHeight = window.innerHeight - 56 - 80; // header + padding
        const content = preview.innerHTML;

        // Wrap content in pages
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;

        // Get all top-level elements
        const elements = Array.from(tempDiv.children);
        let pages = [];
        let currentPage = document.createElement('div');
        currentPage.className = 'page';
        let currentHeight = 0;
        let pageNum = 1;

        elements.forEach(el => {
            // Clone element to measure
            const clone = el.cloneNode(true);
            currentPage.appendChild(clone);

            // Check if page is full
            if (currentPage.scrollHeight > pageHeight && currentPage.children.length > 1) {
                // Remove last element, save page
                currentPage.removeChild(clone);
                currentPage.dataset.page = pageNum;
                pages.push(currentPage.outerHTML);

                // Start new page
                pageNum++;
                currentPage = document.createElement('div');
                currentPage.className = 'page';
                currentPage.appendChild(clone);
            }
        });

        // Add last page
        if (currentPage.children.length > 0) {
            currentPage.dataset.page = pageNum;
            pages.push(currentPage.outerHTML);
        }

        // If no pages created, wrap all content in one page
        if (pages.length === 0) {
            const singlePage = document.createElement('div');
            singlePage.className = 'page';
            singlePage.dataset.page = '1';
            singlePage.innerHTML = content;
            preview.innerHTML = singlePage.outerHTML;
        } else {
            preview.innerHTML = pages.join('');
        }

        // Add scroll listener for page indicator
        this.totalPages = pageNum;
        this.updatePageIndicator(1);

        wrapper.addEventListener('scroll', () => {
            const scrollTop = wrapper.scrollTop;
            const currentPage = Math.floor(scrollTop / pageHeight) + 1;
            this.updatePageIndicator(Math.min(currentPage, this.totalPages));
        });
    },

    unpaginateContent() {
        // Re-render markdown without pages
        Markdown.render();
    },

    updatePageIndicator(page) {
        let indicator = document.getElementById('pageIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'pageIndicator';
            indicator.className = 'page-indicator';
            document.getElementById('questionPane')?.appendChild(indicator);
        }
        indicator.textContent = `${page} / ${this.totalPages || 1}`;
        indicator.style.display = this.pageMode ? 'block' : 'none';
    },

    // Load drawings from saved data
    loadDrawings(drawings) {
        this.history = drawings || [];
        this.redoStack = [];
        this.redrawAll();
        this.updateHistoryButtons();
    },

    // Get current drawings for saving
    getDrawings() {
        return this.history;
    },

    isSPenEraserPressed(e) {
        if (e.pointerType !== 'pen') return false;
        const buttons = e.buttons || 0;
        return e.button === 5 || e.button === 2 || (buttons & 32) === 32 || (buttons & 64) === 64;
    },

    applyCanvasModeClass(canvas, mode) {
        if (!canvas) return;
        canvas.classList.remove('drawing-mode', 'eraser-mode');

        if (mode === 'eraser') {
            canvas.classList.add('eraser-mode');
        } else if (mode === 'pen' || mode === 'highlighter') {
            canvas.classList.add('drawing-mode');
        }
    }
};
