/**
 * markdown.js - Markdown Rendering with Multiple Choice Recognition
 */

const Markdown = {
    currentQuestionNum: 0,

    init() {
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                highlight: function (code, lang) {
                    if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                        try {
                            return hljs.highlight(code, { language: lang }).value;
                        } catch (e) { }
                    }
                    return typeof hljs !== 'undefined' ? hljs.highlightAuto(code).value : code;
                },
                breaks: true,
                gfm: true
            });
        }
    },

    render() {
        const input = document.getElementById('markdownInput');
        const preview = document.getElementById('markdownPreview');
        if (!input || !preview) return;

        const md = input.value;

        if (!md.trim()) {
            // Empty state: show nothing, let user type directly via inlineTypingCursor
            preview.innerHTML = '';
        } else if (typeof marked !== 'undefined') {
            let html = marked.parse(md);
            html = this.processChoices(html);
            preview.innerHTML = html;

            if (typeof hljs !== 'undefined') {
                preview.querySelectorAll('pre code').forEach(block => {
                    hljs.highlightElement(block);
                });
            }

            // Bind choice click events
            this.bindChoiceEvents(preview);
        } else {
            preview.innerHTML = '<pre>' + md + '</pre>';
        }

        setTimeout(() => Canvas.resize(), 100);
    },

    /**
     * Process ALL circled numbers ①-⑩ anywhere in the HTML
     * Makes them all clickable regardless of position
     */
    processChoices(html) {
        // Match any circled number ①-⑩ (Unicode 2460-2469)
        const circledNumbers = /[\u2460-\u2469]/g;

        let questionNum = 0;
        let lastChoiceNum = 0;

        return html.replace(circledNumbers, (match) => {
            const choiceNum = match.charCodeAt(0) - 0x245F; // ① = 1, ② = 2, etc

            // Increment question number when we see ① (choice 1)
            if (choiceNum === 1) {
                questionNum++;
            } else if (choiceNum <= lastChoiceNum) {
                // If we go back to a lower number, it's a new question
                questionNum++;
            }
            lastChoiceNum = choiceNum;

            return `<button class="choice-badge" data-choice="${choiceNum}" data-question="${questionNum}">${match}</button>`;
        });
    },

    /**
     * Bind click events to choice badges
     */
    bindChoiceEvents(container) {
        container.querySelectorAll('.choice-badge').forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const choiceNum = parseInt(badge.dataset.choice);
                const questionNum = parseInt(badge.dataset.question);

                // Toggle selection within same question
                const siblings = container.querySelectorAll(`.choice-badge[data-question="${questionNum}"]`);
                siblings.forEach(s => s.classList.remove('selected'));
                badge.classList.add('selected');

                // Add to answer editor
                if (typeof AnswerEditor !== 'undefined') {
                    AnswerEditor.addChoice(questionNum, choiceNum);
                }
            });
        });
    },

    /**
     * Real-time inline markdown rendering
     * Renders completed markdown patterns while keeping unfinished ones as-is
     */
    renderInline(text) {
        if (!text || !text.trim()) return '';

        // Split into lines for processing
        const lines = text.split('\n');
        const processedLines = [];
        let inCodeBlock = false;
        let codeBlockContent = [];
        let codeBlockLang = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Handle code blocks
            if (line.startsWith('```')) {
                if (!inCodeBlock) {
                    // Start of code block
                    inCodeBlock = true;
                    codeBlockLang = line.slice(3).trim();
                    codeBlockContent = [];
                } else {
                    // End of code block - render it
                    inCodeBlock = false;
                    const code = this.escapeHtml(codeBlockContent.join('\n'));
                    const highlighted = this.highlightCode(code, codeBlockLang);
                    processedLines.push(`<pre><code class="language-${codeBlockLang || 'plaintext'}">${highlighted}</code></pre>`);
                    codeBlockLang = '';
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlockContent.push(line);
                continue;
            }

            // Process regular lines
            processedLines.push(this.processLine(line));
        }

        // If still in unclosed code block, show as raw
        if (inCodeBlock) {
            processedLines.push('```' + codeBlockLang);
            processedLines.push(...codeBlockContent.map(l => this.escapeHtml(l)));
        }

        return processedLines.join('\n');
    },

    /**
     * Process a single line for inline markdown patterns
     */
    processLine(line) {
        if (!line.trim()) return '<br>';

        let result = line;

        // Headers (only if line starts with #)
        if (/^#{1,6}\s/.test(result)) {
            const match = result.match(/^(#{1,6})\s+(.*)$/);
            if (match) {
                const level = match[1].length;
                const content = this.processInlinePatterns(match[2]);
                return `<h${level}>${content}</h${level}>`;
            }
        }

        // Blockquote
        if (result.startsWith('> ')) {
            const content = this.processInlinePatterns(result.slice(2));
            return `<blockquote>${content}</blockquote>`;
        }

        // Unordered list
        if (/^[-*+]\s/.test(result)) {
            const content = this.processInlinePatterns(result.slice(2));
            return `<li>${content}</li>`;
        }

        // Ordered list
        if (/^\d+\.\s/.test(result)) {
            const match = result.match(/^\d+\.\s+(.*)$/);
            if (match) {
                const content = this.processInlinePatterns(match[1]);
                return `<li>${content}</li>`;
            }
        }

        // Horizontal rule
        if (/^(---|\*\*\*|___)$/.test(result.trim())) {
            return '<hr>';
        }

        // Regular paragraph with inline patterns
        return `<p>${this.processInlinePatterns(result)}</p>`;
    },

    /**
     * Process inline patterns (bold, italic, code, links)
     */
    processInlinePatterns(text) {
        let result = this.escapeHtml(text);

        // Inline code (must be done first to avoid conflicts)
        result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold + Italic (***text***)
        result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');

        // Bold (**text**)
        result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic (*text*)
        result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Strikethrough (~~text~~)
        result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>');

        // Links [text](url)
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        // Images ![alt](url)
        result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');

        return result;
    },

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Highlight code if hljs is available
     */
    highlightCode(code, lang) {
        if (typeof hljs !== 'undefined') {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (e) { }
            }
            return hljs.highlightAuto(code).value;
        }
        return code;
    }
};
