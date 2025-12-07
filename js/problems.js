/**
 * problems.js - Problem Management Module
 * Handles multiple problems storage and navigation
 */

const ProblemsModule = {
    /**
     * Initialize with empty first problem
     */
    init() {
        if (AppState.problems.length === 0) {
            this.addNew(true);
        }
        this.updateCounter();
    },

    /**
     * Add a new problem
     */
    addNew(silent = false) {
        // Save current problem first
        this.saveCurrent();

        const newProblem = {
            id: Date.now(),
            markdown: '',
            drawings: [],
            textBoxes: []
        };

        AppState.problems.push(newProblem);
        AppState.currentProblemIndex = AppState.problems.length - 1;

        this.loadCurrent();
        this.updateCounter();

        if (!silent) {
            Utils.showToast('새 문제가 추가되었습니다');
            this.openInputModal();
        }
    },

    /**
     * Go to previous problem
     */
    prev() {
        if (AppState.currentProblemIndex > 0) {
            this.saveCurrent();
            AppState.currentProblemIndex--;
            this.loadCurrent();
            this.updateCounter();
        }
    },

    /**
     * Go to next problem
     */
    next() {
        if (AppState.currentProblemIndex < AppState.problems.length - 1) {
            this.saveCurrent();
            AppState.currentProblemIndex++;
            this.loadCurrent();
            this.updateCounter();
        }
    },

    /**
     * Delete current problem
     */
    deleteCurrent() {
        if (AppState.problems.length <= 1) {
            Utils.showToast('마지막 문제는 삭제할 수 없습니다');
            return;
        }

        if (!confirm('현재 문제를 삭제하시겠습니까?')) return;

        AppState.problems.splice(AppState.currentProblemIndex, 1);

        if (AppState.currentProblemIndex >= AppState.problems.length) {
            AppState.currentProblemIndex = AppState.problems.length - 1;
        }

        this.loadCurrent();
        this.updateCounter();
        Utils.showToast('문제가 삭제되었습니다');
    },

    /**
     * Save current problem state
     */
    saveCurrent() {
        const problem = AppState.problems[AppState.currentProblemIndex];
        if (!problem) return;

        problem.markdown = DOM.markdownInput.value;
        problem.drawings = [...AppState.drawings];
        problem.textBoxes = TextBoxModule.getData();
    },

    /**
     * Load current problem
     */
    loadCurrent() {
        const problem = AppState.problems[AppState.currentProblemIndex];
        if (!problem) return;

        // Clear existing text boxes
        TextBoxModule.restore([]);

        // Load problem data
        DOM.markdownInput.value = problem.markdown || '';
        AppState.drawings = problem.drawings || [];

        // Render
        MarkdownModule.render();

        // Restore text boxes after render
        setTimeout(() => {
            TextBoxModule.restore(problem.textBoxes || []);
            CanvasModule.redraw();
        }, 100);

        // Update FAB visibility
        this.updateFabVisibility();
    },

    /**
     * Update problem counter display
     */
    updateCounter() {
        DOM.problemCounter.textContent = `${AppState.currentProblemIndex + 1} / ${AppState.problems.length}`;
    },

    /**
     * Update FAB visibility based on content
     */
    updateFabVisibility() {
        const hasContent = DOM.markdownInput.value.trim().length > 0;
        DOM.fabInput.classList.toggle('hidden', !hasContent);
    },

    /**
     * Open input modal
     */
    openInputModal() {
        DOM.inputModal.classList.remove('hidden');
        DOM.markdownInput.focus();
        DOM.dropdownMenu.classList.add('hidden');
    },

    /**
     * Close input modal
     */
    closeInputModal() {
        DOM.inputModal.classList.add('hidden');
    },

    /**
     * Apply markdown from modal
     */
    applyMarkdown() {
        MarkdownModule.render();
        this.saveCurrent();
        this.closeInputModal();
        this.updateFabVisibility();
        Utils.showToast('마크다운이 적용되었습니다');
    }
};
