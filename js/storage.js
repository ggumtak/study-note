/**
 * storage.js - Save/Load Module for all problems
 */

const StorageModule = {
    save() {
        // Save current problem first
        ProblemsModule.saveCurrent();

        const saveData = {
            version: 2,
            problems: AppState.problems,
            currentIndex: AppState.currentProblemIndex,
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `study-problems-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();

        URL.revokeObjectURL(url);
        DOM.dropdownMenu.classList.add('hidden');
        Utils.showToast(`${AppState.problems.length}개 문제가 저장되었습니다`);
    },

    load() {
        DOM.fileInput.click();
        DOM.dropdownMenu.classList.add('hidden');
    },

    handleFileLoad(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (data.version === 2 && data.problems) {
                    // New format with multiple problems
                    AppState.problems = data.problems;
                    AppState.currentProblemIndex = data.currentIndex || 0;
                } else if (data.version === 1) {
                    // Old format - single problem
                    AppState.problems = [{
                        id: Date.now(),
                        markdown: data.markdown || '',
                        drawings: data.drawings || [],
                        textBoxes: data.textBoxes || []
                    }];
                    AppState.currentProblemIndex = 0;
                }

                ProblemsModule.loadCurrent();
                ProblemsModule.updateCounter();
                Utils.showToast(`${AppState.problems.length}개 문제를 불러왔습니다`);
            } catch (err) {
                Utils.showToast('파일을 불러오는데 실패했습니다');
                console.error(err);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
};
