/**
 * state.js - Application State Management
 */

const AppState = {
    currentMode: 'view',
    penColor: '#ffffff',
    penSize: 3,
    isDrawing: false,
    lastX: 0,
    lastY: 0,

    // Problem management
    problems: [],
    currentProblemIndex: 0,

    // Current problem data
    textBoxes: [],
    textBoxIdCounter: 0,
    drawings: []
};

const DOM = {
    get markdownInput() { return document.getElementById('markdownInput'); },
    get markdownPreview() { return document.getElementById('markdownPreview'); },
    get canvas() { return document.getElementById('drawingCanvas'); },
    get previewWrapper() { return document.getElementById('previewWrapper'); },
    get penSizeSlider() { return document.getElementById('penSize'); },
    get penSizeValue() { return document.getElementById('penSizeValue'); },
    get fileInput() { return document.getElementById('fileInput'); },
    get problemCounter() { return document.getElementById('problemCounter'); },
    get inputModal() { return document.getElementById('inputModal'); },
    get dropdownMenu() { return document.getElementById('dropdownMenu'); },
    get fabInput() { return document.getElementById('fabInput'); },
    get toast() { return document.getElementById('toast'); },

    // Buttons
    get viewModeBtn() { return document.getElementById('viewModeBtn'); },
    get drawModeBtn() { return document.getElementById('drawModeBtn'); },
    get eraserModeBtn() { return document.getElementById('eraserModeBtn'); },
    get menuBtn() { return document.getElementById('menuBtn'); },
    get prevProblemBtn() { return document.getElementById('prevProblemBtn'); },
    get nextProblemBtn() { return document.getElementById('nextProblemBtn'); },
    get addProblemBtn() { return document.getElementById('addProblemBtn'); },
    get addTextBoxBtn() { return document.getElementById('addTextBoxBtn'); },
    get clearCanvasBtn() { return document.getElementById('clearCanvasBtn'); },
    get saveBtn() { return document.getElementById('saveBtn'); },
    get loadBtn() { return document.getElementById('loadBtn'); },
    get deleteProblemBtn() { return document.getElementById('deleteProblemBtn'); },
    get closeModalBtn() { return document.getElementById('closeModalBtn'); },
    get cancelModalBtn() { return document.getElementById('cancelModalBtn'); },
    get applyMarkdownBtn() { return document.getElementById('applyMarkdownBtn'); },
    get emptyStateBtn() { return document.getElementById('emptyStateBtn'); }
};

const Utils = {
    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    showToast(message, duration = 2000) {
        DOM.toast.textContent = message;
        DOM.toast.classList.remove('hidden');
        setTimeout(() => DOM.toast.classList.add('hidden'), duration);
    }
};
