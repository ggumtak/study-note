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
            preview.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;color:#606080;text-align:center;">
                    <div style="font-size:4rem;margin-bottom:16px;">📝</div>
                    <div>마크다운이 없습니다</div>
                </div>
            `;
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
    }
};
