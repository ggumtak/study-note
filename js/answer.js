/**
 * answer.js - Answer Editor with Auto-numbering
 * Handles automatic numbering (1. → Enter → 2.)
 */

const AnswerEditor = {
    editor: null,
    isNumberingMode: false,
    currentNumber: 0,

    init() {
        this.editor = document.getElementById('answerEditor');
        if (!this.editor) return;

        this.editor.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.editor.addEventListener('input', () => this.handleInput());
        this.editor.addEventListener('paste', (e) => this.handlePaste(e));
    },

    handleKeydown(e) {
        if (e.key === 'Enter') {
            this.handleEnter(e);
        } else if (e.key === 'Backspace') {
            this.handleBackspace(e);
        }
    },

    handleEnter(e) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const currentLine = this.getCurrentLineText();

        // Check if current line starts with number
        const match = currentLine.match(/^(\d+)\.\s*/);

        if (e.shiftKey) {
            // Shift+Enter: just line break, no numbering
            return;
        }

        if (match) {
            e.preventDefault();
            const num = parseInt(match[1]);
            const lineContent = currentLine.slice(match[0].length).trim();

            if (lineContent === '') {
                // Empty numbered line - exit numbering mode
                // Just add a newline, keep the empty number line as is
                this.isNumberingMode = false;
                document.execCommand('insertText', false, '\n');
            } else {
                // Insert new line with next number
                this.isNumberingMode = true;
                this.currentNumber = num + 1;
                document.execCommand('insertText', false, '\n' + this.currentNumber + '. ');
            }
        } else if (this.isNumberingMode) {
            // Continue numbering mode
            e.preventDefault();
            this.currentNumber++;
            document.execCommand('insertText', false, '\n' + this.currentNumber + '. ');
        }
    },

    handleBackspace(e) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const currentLine = this.getCurrentLineText();
        const cursorPos = this.getCursorPositionInLine();

        // Check if cursor is right after "n. " pattern
        const match = currentLine.match(/^(\d+)\.\s*/);
        if (match && cursorPos <= match[0].length && cursorPos > 0) {
            // Let default backspace handle it, just exit numbering mode
            this.isNumberingMode = false;
        }
    },

    handleInput() {
        // Check if user started typing a number pattern
        const text = this.editor.textContent;
        if (/^1\.\s/.test(text) && !this.isNumberingMode) {
            this.isNumberingMode = true;
            this.currentNumber = 1;
        }

        // Save to note
        if (typeof UI !== 'undefined') {
            UI.saveCurrentNote();
        }
    },

    handlePaste(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        document.execCommand('insertText', false, text);
    },

    getCurrentLineText() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return '';

        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        const text = node.textContent || '';

        // Find line start
        const beforeCursor = text.slice(0, range.startOffset);
        const lineStart = beforeCursor.lastIndexOf('\n') + 1;
        const lineEnd = text.indexOf('\n', range.startOffset);

        return text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    },

    getCursorPositionInLine() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return 0;

        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        const text = node.textContent || '';

        const beforeCursor = text.slice(0, range.startOffset);
        const lineStart = beforeCursor.lastIndexOf('\n') + 1;

        return range.startOffset - lineStart;
    },

    getValue() {
        return this.editor ? this.editor.textContent : '';
    },

    setValue(text) {
        if (this.editor) {
            this.editor.textContent = text || '';
        }
    },

    // Add answer from choice selection
    addChoice(questionNum, choiceNum) {
        const choiceSymbol = String.fromCharCode(0x2460 + choiceNum - 1); // ① ② ③ etc

        // Find the last number in the editor
        const current = this.getValue().trim();
        let nextNum = 1;

        if (current) {
            // Find all numbers at line starts
            const matches = current.match(/^(\d+)\./gm);
            if (matches && matches.length > 0) {
                // Get the highest number
                const numbers = matches.map(m => parseInt(m));
                nextNum = Math.max(...numbers) + 1;
            }
        }

        const answer = `${nextNum}. ${choiceSymbol}`;

        if (current) {
            this.setValue(current + '\n' + answer);
        } else {
            this.setValue(answer);
        }

        // Update state
        this.currentNumber = nextNum;
        this.isNumberingMode = true;

        // Save
        if (typeof UI !== 'undefined') {
            UI.saveCurrentNote();
        }
    }
};
