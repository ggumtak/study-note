/**
 * pdf.js - PDF Rendering Module
 * Renders PDF files with handwriting overlay support
 * Inspired by Adobe Acrobat, Xodo, and Samsung Notes
 */

const PDFViewer = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.5,
    pdfData: null,
    isRendering: false,

    async init() {
        // Set worker source for pdf.js
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    },

    /**
     * Load PDF from file input
     * @param {File} file - PDF file object
     * @param {string} noteId - Note ID to associate PDF with
     */
    async loadFromFile(file, noteId) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            this.pdfData = new Uint8Array(arrayBuffer);

            await this.loadPDF(this.pdfData);

            // Store PDF data in note
            if (noteId) {
                const note = DB.getNote(noteId);
                if (note) {
                    note.pdfData = Array.from(this.pdfData); // Store as array for JSON
                    note.isPDF = true;
                    DB.updateNote(noteId, note);
                }
            }

            return true;
        } catch (error) {
            console.error('PDF load error:', error);
            UI.toast('PDF 로드 실패');
            return false;
        }
    },

    /**
     * Load PDF from stored data
     * @param {Uint8Array|Array} data - PDF binary data
     */
    async loadPDF(data) {
        if (typeof pdfjsLib === 'undefined') {
            UI.toast('PDF.js 라이브러리가 로드되지 않았습니다');
            return false;
        }

        try {
            // Convert array to Uint8Array if needed
            const pdfData = data instanceof Uint8Array ? data : new Uint8Array(data);

            this.pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
            this.totalPages = this.pdfDoc.numPages;
            this.currentPage = 1;

            // Setup PDF viewer UI
            this.setupViewer();

            // Render first page
            await this.renderPage(1);

            return true;
        } catch (error) {
            console.error('PDF parse error:', error);
            UI.toast('PDF 파싱 실패');
            return false;
        }
    },

    /**
     * Setup PDF viewer container
     */
    setupViewer() {
        const preview = document.getElementById('markdownPreview');
        if (!preview) return;

        // Clear existing content
        preview.innerHTML = '';

        // Create PDF container
        const container = document.createElement('div');
        container.id = 'pdfContainer';
        container.className = 'pdf-container';

        // Create pages container
        const pagesWrapper = document.createElement('div');
        pagesWrapper.id = 'pdfPages';
        pagesWrapper.className = 'pdf-pages';
        container.appendChild(pagesWrapper);

        // Create page indicator
        const indicator = document.createElement('div');
        indicator.id = 'pdfPageIndicator';
        indicator.className = 'pdf-page-indicator';
        indicator.textContent = `1 / ${this.totalPages}`;
        container.appendChild(indicator);

        preview.appendChild(container);

        // Setup navigation
        this.setupNavigation(container);
    },

    /**
     * Setup page navigation
     */
    setupNavigation(container) {
        // Scroll-based navigation
        const pagesWrapper = document.getElementById('pdfPages');
        if (pagesWrapper) {
            pagesWrapper.addEventListener('scroll', () => {
                this.updatePageIndicator();
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.pdfDoc) return;

            if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                this.nextPage();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                this.prevPage();
            }
        });
    },

    /**
     * Render a specific page
     * @param {number} pageNum - Page number to render
     */
    async renderPage(pageNum) {
        if (!this.pdfDoc || this.isRendering) return;
        if (pageNum < 1 || pageNum > this.totalPages) return;

        this.isRendering = true;

        try {
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.scale });

            // Create page wrapper
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'pdf-page';
            pageWrapper.dataset.page = pageNum;

            // Create canvas for PDF content
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-canvas';
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext('2d');

            // Render PDF page
            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            pageWrapper.appendChild(canvas);

            // Create drawing canvas overlay
            const drawCanvas = document.createElement('canvas');
            drawCanvas.className = 'pdf-draw-canvas';
            drawCanvas.width = viewport.width;
            drawCanvas.height = viewport.height;
            drawCanvas.dataset.page = pageNum;
            pageWrapper.appendChild(drawCanvas);

            // Add page number
            const pageNum_el = document.createElement('div');
            pageNum_el.className = 'pdf-page-number';
            pageNum_el.textContent = pageNum;
            pageWrapper.appendChild(pageNum_el);

            // Add to container
            const pagesWrapper = document.getElementById('pdfPages');
            if (pagesWrapper) {
                pagesWrapper.appendChild(pageWrapper);
            }

            // Setup drawing events for this page
            this.setupDrawingEvents(drawCanvas, pageNum);

        } catch (error) {
            console.error(`Page ${pageNum} render error:`, error);
        }

        this.isRendering = false;
    },

    /**
     * Render all pages
     */
    async renderAllPages() {
        const pagesWrapper = document.getElementById('pdfPages');
        if (pagesWrapper) {
            pagesWrapper.innerHTML = '';
        }

        for (let i = 1; i <= this.totalPages; i++) {
            await this.renderPage(i);
        }

        this.updatePageIndicator();
    },

    /**
     * Setup drawing events for a page's canvas
     */
    setupDrawingEvents(canvas, pageNum) {
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        };

        // Pointer events for S-Pen support
        canvas.addEventListener('pointerdown', (e) => {
            // Only draw with pen or when in drawing mode
            if (e.pointerType === 'pen' || Canvas.mode === 'pen' || Canvas.mode === 'highlighter') {
                isDrawing = true;
                const pos = getPos(e);
                lastX = pos.x;
                lastY = pos.y;
                e.preventDefault();
            }
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!isDrawing) return;

            const pos = getPos(e);

            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(pos.x, pos.y);

            if (Canvas.mode === 'highlighter') {
                ctx.strokeStyle = Canvas.highlighterColor || 'rgba(255, 255, 0, 0.4)';
                ctx.lineWidth = (Canvas.highlighterSize || 20) * this.scale;
                ctx.globalAlpha = 0.4;
            } else {
                ctx.strokeStyle = Canvas.penColor || '#ffffff';
                ctx.lineWidth = (Canvas.penSize || 3) * this.scale;
                ctx.globalAlpha = 1;
            }

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            lastX = pos.x;
            lastY = pos.y;
            e.preventDefault();
        });

        canvas.addEventListener('pointerup', () => {
            isDrawing = false;
            ctx.globalAlpha = 1;
            // Save drawing data
            this.savePageDrawing(pageNum, canvas);
        });

        canvas.addEventListener('pointerleave', () => {
            isDrawing = false;
            ctx.globalAlpha = 1;
        });
    },

    /**
     * Save drawing data for a page
     */
    savePageDrawing(pageNum, canvas) {
        if (!App.currentNoteId) return;

        const note = DB.getNote(App.currentNoteId);
        if (!note) return;

        // Initialize drawings object
        if (!note.pdfDrawings) {
            note.pdfDrawings = {};
        }

        // Store canvas data as base64
        note.pdfDrawings[pageNum] = canvas.toDataURL('image/png');
        DB.updateNote(App.currentNoteId, note);
    },

    /**
     * Load saved drawings for all pages
     */
    loadSavedDrawings(noteId) {
        const note = DB.getNote(noteId);
        if (!note || !note.pdfDrawings) return;

        Object.keys(note.pdfDrawings).forEach(pageNum => {
            const canvas = document.querySelector(`.pdf-draw-canvas[data-page="${pageNum}"]`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                };
                img.src = note.pdfDrawings[pageNum];
            }
        });
    },

    /**
     * Navigate to next page
     */
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.scrollToPage(this.currentPage);
        }
    },

    /**
     * Navigate to previous page
     */
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.scrollToPage(this.currentPage);
        }
    },

    /**
     * Scroll to a specific page
     */
    scrollToPage(pageNum) {
        const page = document.querySelector(`.pdf-page[data-page="${pageNum}"]`);
        if (page) {
            page.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        this.updatePageIndicator();
    },

    /**
     * Update page indicator
     */
    updatePageIndicator() {
        const pagesWrapper = document.getElementById('pdfPages');
        const indicator = document.getElementById('pdfPageIndicator');

        if (!pagesWrapper || !indicator) return;

        // Calculate current page based on scroll position
        const pages = pagesWrapper.querySelectorAll('.pdf-page');
        const scrollTop = pagesWrapper.scrollTop;

        let currentPage = 1;
        pages.forEach((page, index) => {
            if (page.offsetTop <= scrollTop + 100) {
                currentPage = index + 1;
            }
        });

        this.currentPage = currentPage;
        indicator.textContent = `${currentPage} / ${this.totalPages}`;
    },

    /**
     * Set zoom scale
     */
    setScale(scale) {
        this.scale = Math.max(0.5, Math.min(3, scale));
        if (this.pdfDoc) {
            this.renderAllPages();
        }
    },

    /**
     * Clear PDF viewer
     */
    clear() {
        this.pdfDoc = null;
        this.totalPages = 0;
        this.currentPage = 1;
        this.pdfData = null;

        const container = document.getElementById('pdfContainer');
        if (container) {
            container.remove();
        }
    }
};
