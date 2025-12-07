/**
 * page.js - Advanced Page Management System
 * Features:
 * - Multi-page support with automatic page creation
 * - Pull-to-add-page at page end
 * - Horizontal and vertical page navigation
 * - S-Pen vs finger detection
 * - Configurable 1-finger/2-finger navigation
 */

const PageManager = {
    pages: [],
    currentPage: 0,
    pageMode: false,
    scrollDirection: 'vertical', // 'vertical' | 'horizontal'

    // Settings
    settings: {
        fingerMode: 2, // 1 = one finger for navigation, 2 = two fingers
        penForDrawing: true,
        fingerForNavigation: true
    },

    // Touch tracking
    touchStartY: 0,
    touchStartX: 0,
    touchStartTime: 0,
    isAtPageEnd: false,
    pullThreshold: 100, // pixels to pull to add new page

    init() {
        this.loadSettings();
        this.setupEventListeners();
    },

    loadSettings() {
        const saved = localStorage.getItem('pageSettings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) { }
        }
    },

    saveSettings() {
        localStorage.setItem('pageSettings', JSON.stringify(this.settings));
    },

    setupEventListeners() {
        const wrapper = document.getElementById('previewWrapper');
        if (!wrapper) return;

        // Pointer events for pen/touch detection
        wrapper.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        wrapper.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        wrapper.addEventListener('pointerup', (e) => this.handlePointerUp(e));

        // Touch events for multi-touch detection
        wrapper.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        wrapper.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        wrapper.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Scroll for pull-to-add-page
        wrapper.addEventListener('scroll', () => this.handleScroll());
    },

    handlePointerDown(e) {
        if (!this.pageMode) return;

        // S-Pen detection
        if (e.pointerType === 'pen') {
            // Pen is for drawing - let canvas handle it
            if (this.settings.penForDrawing) {
                return; // Don't prevent, let canvas draw
            }
        }

        // Touch/finger detection
        if (e.pointerType === 'touch') {
            this.touchStartX = e.clientX;
            this.touchStartY = e.clientY;
            this.touchStartTime = Date.now();
        }
    },

    handlePointerMove(e) {
        if (!this.pageMode) return;
        // Navigation handled by touch events for multi-touch support
    },

    handlePointerUp(e) {
        if (!this.pageMode) return;
    },

    handleTouchStart(e) {
        if (!this.pageMode) return;

        const touchCount = e.touches.length;

        // Check finger mode setting
        if (touchCount === this.settings.fingerMode) {
            // This is navigation mode
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.touchStartTime = Date.now();
            this.isNavigating = true;
        } else if (touchCount === 1 && this.settings.fingerMode === 2) {
            // Single finger when 2-finger mode is set - block navigation
            this.isNavigating = false;
        }
    },

    handleTouchMove(e) {
        if (!this.pageMode || !this.isNavigating) return;

        const touch = e.touches[0];
        const deltaY = this.touchStartY - touch.clientY;
        const deltaX = this.touchStartX - touch.clientX;

        // Check if at page end and pulling
        const wrapper = document.getElementById('previewWrapper');
        const isAtBottom = wrapper.scrollTop + wrapper.clientHeight >= wrapper.scrollHeight - 5;
        const isAtRight = wrapper.scrollLeft + wrapper.clientWidth >= wrapper.scrollWidth - 5;

        if (this.scrollDirection === 'vertical' && isAtBottom && deltaY > 0) {
            this.showPullIndicator(deltaY);
            e.preventDefault();
        } else if (this.scrollDirection === 'horizontal' && isAtRight && deltaX > 0) {
            this.showPullIndicator(deltaX);
            e.preventDefault();
        }
    },

    handleTouchEnd(e) {
        if (!this.pageMode) return;

        const touch = e.changedTouches[0];
        const deltaY = this.touchStartY - touch.clientY;
        const deltaX = this.touchStartX - touch.clientX;
        const duration = Date.now() - this.touchStartTime;

        // Check if it's a swipe gesture
        if (duration < 300) {
            if (this.scrollDirection === 'vertical') {
                if (Math.abs(deltaY) > 50) {
                    if (deltaY > 0) this.nextPage();
                    else this.prevPage();
                }
            } else {
                if (Math.abs(deltaX) > 50) {
                    if (deltaX > 0) this.nextPage();
                    else this.prevPage();
                }
            }
        }

        // Check if pulled enough to add new page
        const wrapper = document.getElementById('previewWrapper');
        const isAtEnd = this.scrollDirection === 'vertical'
            ? wrapper.scrollTop + wrapper.clientHeight >= wrapper.scrollHeight - 5
            : wrapper.scrollLeft + wrapper.clientWidth >= wrapper.scrollWidth - 5;

        const pullDistance = this.scrollDirection === 'vertical' ? deltaY : deltaX;

        if (isAtEnd && pullDistance > this.pullThreshold) {
            this.addNewPage();
        }

        this.hidePullIndicator();
        this.isNavigating = false;
    },

    handleScroll() {
        if (!this.pageMode) return;
        this.updatePageIndicator();
    },

    showPullIndicator(distance) {
        let indicator = document.getElementById('pullIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'pullIndicator';
            indicator.className = 'pull-indicator';
            indicator.innerHTML = '<span>↓ 새 페이지 추가</span>';
            document.getElementById('questionPane')?.appendChild(indicator);
        }

        const progress = Math.min(distance / this.pullThreshold, 1);
        indicator.style.opacity = progress;
        indicator.style.transform = `translateX(-50%) scale(${0.8 + progress * 0.2})`;

        if (progress >= 1) {
            indicator.classList.add('ready');
            indicator.innerHTML = '<span>✓ 놓으면 추가</span>';
        } else {
            indicator.classList.remove('ready');
            indicator.innerHTML = '<span>↓ 새 페이지 추가</span>';
        }
    },

    hidePullIndicator() {
        const indicator = document.getElementById('pullIndicator');
        if (indicator) {
            indicator.style.opacity = 0;
            setTimeout(() => indicator.remove(), 200);
        }
    },

    // Page management
    enablePageMode() {
        this.pageMode = true;
        this.createPagesFromContent();
        this.updateUI();
        UI.toast('페이지 모드 활성화');
    },

    disablePageMode() {
        this.pageMode = false;
        this.restoreScrollMode();
        this.updateUI();
        UI.toast('스크롤 모드');
    },

    toggle() {
        if (this.pageMode) {
            this.disablePageMode();
        } else {
            this.enablePageMode();
        }
    },

    createPagesFromContent() {
        const wrapper = document.getElementById('previewWrapper');
        const preview = document.getElementById('markdownPreview');
        if (!wrapper || !preview) return;

        wrapper.classList.add('page-mode');
        if (this.scrollDirection === 'horizontal') {
            wrapper.classList.add('horizontal');
        }

        const pageHeight = window.innerHeight - 56 - 60; // header + padding
        const originalContent = preview.innerHTML;

        // Create a container for pages
        const pagesContainer = document.createElement('div');
        pagesContainer.className = 'pages-container';
        pagesContainer.id = 'pagesContainer';

        // Create first page with content
        const firstPage = this.createPage(1);
        firstPage.innerHTML = `<div class="page-content">${originalContent}</div>`;
        pagesContainer.appendChild(firstPage);

        this.pages = [firstPage];
        this.currentPage = 0;

        // Check if we need more pages (content overflows)
        preview.innerHTML = '';
        preview.appendChild(pagesContainer);

        // After rendering, check for overflow and create additional pages
        setTimeout(() => this.checkOverflowAndCreatePages(), 100);

        this.updatePageIndicator();
    },

    createPage(pageNum) {
        const page = document.createElement('div');
        page.className = 'page';
        page.dataset.page = pageNum;
        return page;
    },

    addNewPage() {
        const container = document.getElementById('pagesContainer');
        if (!container) return;

        const newPageNum = this.pages.length + 1;
        const newPage = this.createPage(newPageNum);
        newPage.innerHTML = '<div class="page-content"></div>';

        container.appendChild(newPage);
        this.pages.push(newPage);

        // Navigate to new page
        this.goToPage(newPageNum - 1);

        UI.toast(`페이지 ${newPageNum} 추가됨`);
        this.updatePageIndicator();
    },

    checkOverflowAndCreatePages() {
        // Check if first page content overflows
        const firstPage = this.pages[0];
        if (!firstPage) return;

        const content = firstPage.querySelector('.page-content');
        if (!content) return;

        const pageHeight = firstPage.clientHeight - 48; // padding

        while (content.scrollHeight > pageHeight) {
            // Content overflows - need to split
            this.splitOverflowToNewPage(content, pageHeight);
        }
    },

    splitOverflowToNewPage(content, maxHeight) {
        // Get all child elements
        const children = Array.from(content.children);
        if (children.length === 0) return;

        // Find where to split
        let splitIndex = children.length;
        let currentHeight = 0;

        for (let i = 0; i < children.length; i++) {
            currentHeight += children[i].offsetHeight;
            if (currentHeight > maxHeight) {
                splitIndex = i;
                break;
            }
        }

        if (splitIndex === 0) splitIndex = 1; // At least keep one element

        // Move remaining elements to new page
        const elementsToMove = children.slice(splitIndex);
        if (elementsToMove.length === 0) return;

        // Create new page
        this.addNewPage();
        const newPage = this.pages[this.pages.length - 1];
        const newContent = newPage.querySelector('.page-content');

        elementsToMove.forEach(el => {
            content.removeChild(el);
            newContent.appendChild(el);
        });

        // Recursively check new page for overflow
        const newPageMaxHeight = newPage.clientHeight - 48;
        if (newContent.scrollHeight > newPageMaxHeight) {
            this.splitOverflowToNewPage(newContent, newPageMaxHeight);
        }
    },

    restoreScrollMode() {
        const wrapper = document.getElementById('previewWrapper');
        const preview = document.getElementById('markdownPreview');
        if (!wrapper || !preview) return;

        wrapper.classList.remove('page-mode', 'horizontal');

        // Restore original content (re-render markdown)
        Markdown.render();
        this.pages = [];
        this.currentPage = 0;

        // Hide page indicator
        const indicator = document.getElementById('pageIndicator');
        if (indicator) indicator.style.display = 'none';
    },

    // Navigation
    nextPage() {
        if (this.currentPage < this.pages.length - 1) {
            this.goToPage(this.currentPage + 1);
        }
    },

    prevPage() {
        if (this.currentPage > 0) {
            this.goToPage(this.currentPage - 1);
        }
    },

    goToPage(index) {
        if (index < 0 || index >= this.pages.length) return;

        this.currentPage = index;
        const page = this.pages[index];

        if (page) {
            page.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
        }

        this.updatePageIndicator();
    },

    updatePageIndicator() {
        let indicator = document.getElementById('pageIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'pageIndicator';
            indicator.className = 'page-indicator';
            document.getElementById('questionPane')?.appendChild(indicator);
        }

        if (this.pageMode) {
            indicator.textContent = `${this.currentPage + 1} / ${this.pages.length}`;
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    },

    updateUI() {
        const btn = document.getElementById('pageModeBtn');
        if (btn) {
            btn.classList.toggle('active', this.pageMode);
        }
    },

    // Settings
    setFingerMode(count) {
        this.settings.fingerMode = count;
        this.saveSettings();
    },

    setScrollDirection(direction) {
        this.scrollDirection = direction;
        const wrapper = document.getElementById('previewWrapper');
        if (wrapper) {
            wrapper.classList.toggle('horizontal', direction === 'horizontal');
        }
    },

    // Check if pointer is pen (for S-Pen detection)
    isPen(e) {
        return e.pointerType === 'pen';
    },

    isFinger(e) {
        return e.pointerType === 'touch';
    }
};
