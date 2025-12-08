/**
 * answer.js - Simple Answer Editor
 */

const AnswerEditor = {
    editor: null,

    init() {
        this.editor = document.getElementById('answerEditor');
        if (!this.editor) return;

        this.editor.addEventListener('input', () => this.saveNote());
        this.editor.addEventListener('paste', (e) => this.handlePaste(e));
    },

    handlePaste(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        document.execCommand('insertText', false, text);
    },

    saveNote() {
        if (typeof UI !== 'undefined') {
            UI.saveCurrentNote();
        }
    },

    getValue() {
        return this.editor ? this.editor.textContent : '';
    },

    setValue(text) {
        if (this.editor) {
            this.editor.textContent = text || '';
        }
    },

    // Just append choice symbol
    addChoice(questionNum, choiceNum) {
        const choiceSymbol = String.fromCharCode(0x2460 + choiceNum - 1);
        const current = this.getValue();

        if (current && !current.endsWith(' ') && !current.endsWith('\n')) {
            this.setValue(current + ' ' + choiceSymbol);
        } else {
            this.setValue(current + choiceSymbol);
        }

        this.saveNote();
    }
};
