/**
 * answer.js - Answer Editor with Professional Auto-numbering
 * Google Docs/Word style numbering with smart behavior
 */

const AnswerEditor = {
    editor: null,

    init() {
        this.editor = document.getElementById('answerEditor');
        if (!this.editor) return;

        this.editor.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.editor.addEventListener('input', () => this.saveNote());
        this.editor.addEventListener('paste', (e) => this.handlePaste(e));
    },

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            this.handleEnter(e);
        } else if (e.key === 'Backspace') {
            this.handleBackspace(e);
        } else if (e.key === 'Tab') {
            this.handleTab(e);
        }
    },

    handleEnter(e) {
        const { lineText, lineStart, lineEnd, cursorInLine } = this.getLineInfo();
        const match = lineText.match(/^(\d+)\.\s*/);

        if (!match) return; // Not a numbered line, default behavior

        e.preventDefault();

        const num = parseInt(match[1]);
        const prefix = match[0];
        const content = lineText.slice(prefix.length);

        // Case 1: Empty numbered line (just "N. ") - remove number and exit
        if (content.trim() === '') {
            this.replaceRange(lineStart, lineEnd, '');
            return;
        }

        // Case 2: Cursor at end of line - add next number
        if (cursorInLine >= lineText.length) {
            document.execCommand('insertText', false, '\n' + (num + 1) + '. ');
            return;
        }

        // Case 3: Cursor in middle - split line and renumber
        const beforeCursor = lineText.slice(0, cursorInLine);
        const afterCursor = lineText.slice(cursorInLine);

        // Keep current line as is, new line gets next number
        const newContent = beforeCursor + '\n' + (num + 1) + '. ' + afterCursor.trimStart();
        this.replaceRange(lineStart, lineEnd, newContent);

        // Position cursor after the new number
        const newCursorPos = lineStart + beforeCursor.length + 1 + String(num + 1).length + 2;
        this.setCursorPosition(newCursorPos);
    },

    handleBackspace(e) {
        const { lineText, lineStart, cursorInLine } = this.getLineInfo();
        const match = lineText.match(/^(\d+)\.\s*/);

        if (!match) return; // Not numbered line

        // Cursor right after "N. " - remove the number prefix
        if (cursorInLine > 0 && cursorInLine <= match[0].length) {
            e.preventDefault();
            const content = lineText.slice(match[0].length);
            this.replaceRange(lineStart, lineStart + match[0].length, '');
        }
    },

    handleTab(e) {
        e.preventDefault();
        document.execCommand('insertText', false, '    '); // 4 spaces
    },

    handlePaste(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        document.execCommand('insertText', false, text);
    },

    // Get current line information
    getLineInfo() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return { lineText: '', lineStart: 0, lineEnd: 0, cursorInLine: 0 };

        const text = this.editor.textContent || '';
        const cursorPos = this.getCursorPosition();

        // Find line boundaries
        let lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
        let lineEnd = text.indexOf('\n', cursorPos);
        if (lineEnd === -1) lineEnd = text.length;

        const lineText = text.slice(lineStart, lineEnd);
        const cursorInLine = cursorPos - lineStart;

        return { lineText, lineStart, lineEnd, cursorInLine };
    },

    getCursorPosition() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return 0;

        const range = sel.getRangeAt(0);
        const preRange = range.cloneRange();
        preRange.selectNodeContents(this.editor);
        preRange.setEnd(range.startContainer, range.startOffset);
        return preRange.toString().length;
    },

    setCursorPosition(pos) {
        const range = document.createRange();
        const sel = window.getSelection();

        let currentPos = 0;
        const walker = document.createTreeWalker(this.editor, NodeFilter.SHOW_TEXT);
        let node;

        while ((node = walker.nextNode())) {
            const nodeLen = node.textContent.length;
            if (currentPos + nodeLen >= pos) {
                range.setStart(node, pos - currentPos);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                return;
            }
            currentPos += nodeLen;
        }
    },

    replaceRange(start, end, newText) {
        const text = this.editor.textContent || '';
        const newContent = text.slice(0, start) + newText + text.slice(end);
        this.editor.textContent = newContent;
        this.setCursorPosition(start + newText.length);
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

    // Add choice - smart insertion based on context
    addChoice(questionNum, choiceNum) {
        const choiceSymbol = String.fromCharCode(0x2460 + choiceNum - 1); // ① ② ③ etc
        const current = this.getValue().trimEnd();

        // Find next number
        let nextNum = 1;
        const lines = current.split('\n');
        for (const line of lines) {
            const m = line.match(/^(\d+)\./);
            if (m) nextNum = parseInt(m[1]) + 1;
        }

        // Build new line
        const newLine = `${nextNum}. ${choiceSymbol}`;

        if (current) {
            this.setValue(current + '\n' + newLine);
        } else {
            this.setValue(newLine);
        }

        // Move cursor to end
        this.editor.focus();
        const range = document.createRange();
        range.selectNodeContents(this.editor);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        this.saveNote();
    }
};
