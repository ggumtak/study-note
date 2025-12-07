/**
 * textbox.js - Text Box Module
 */

const TextBoxModule = {
    add() {
        const id = ++AppState.textBoxIdCounter;
        const scrollTop = DOM.previewWrapper.scrollTop;

        const textBox = document.createElement('div');
        textBox.className = 'text-box';
        textBox.id = `textbox-${id}`;
        textBox.style.left = '50px';
        textBox.style.top = `${scrollTop + 100}px`;

        textBox.innerHTML = `
            <button class="delete-btn" onclick="TextBoxModule.delete(${id})">×</button>
            <div class="text-box-content" contenteditable="true">메모</div>
        `;

        DOM.previewWrapper.appendChild(textBox);
        this.makeDraggable(textBox);

        AppState.textBoxes.push({ id, element: textBox });
        textBox.querySelector('.text-box-content').focus();

        DOM.dropdownMenu.classList.add('hidden');
        Utils.showToast('메모가 추가되었습니다');
    },

    delete(id) {
        const textBox = document.getElementById(`textbox-${id}`);
        if (textBox) {
            textBox.remove();
            AppState.textBoxes = AppState.textBoxes.filter(tb => tb.id !== id);
        }
    },

    makeDraggable(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        const startDrag = (e) => {
            if (e.target.classList.contains('text-box-content') ||
                e.target.classList.contains('delete-btn')) return;

            isDragging = true;
            element.classList.remove('editing');

            const rect = element.getBoundingClientRect();
            const wrapperRect = DOM.previewWrapper.getBoundingClientRect();

            if (e.touches) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }

            initialX = rect.left - wrapperRect.left + DOM.previewWrapper.scrollLeft;
            initialY = rect.top - wrapperRect.top + DOM.previewWrapper.scrollTop;

            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('touchend', stopDrag);

            e.preventDefault();
        };

        const drag = (e) => {
            if (!isDragging) return;

            let clientX, clientY;
            if (e.touches) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            element.style.left = `${initialX + (clientX - startX)}px`;
            element.style.top = `${initialY + (clientY - startY)}px`;
            e.preventDefault();
        };

        const stopDrag = () => {
            isDragging = false;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('touchend', stopDrag);
        };

        element.addEventListener('mousedown', startDrag);
        element.addEventListener('touchstart', startDrag, { passive: false });
        element.addEventListener('dblclick', () => {
            element.classList.add('editing');
            element.querySelector('.text-box-content').focus();
        });
    },

    restore(textBoxData) {
        AppState.textBoxes.forEach(tb => {
            const el = document.getElementById(`textbox-${tb.id}`);
            if (el) el.remove();
        });
        AppState.textBoxes = [];

        if (!textBoxData) return;

        textBoxData.forEach(tb => {
            AppState.textBoxIdCounter = Math.max(AppState.textBoxIdCounter, tb.id);

            const textBox = document.createElement('div');
            textBox.className = 'text-box';
            textBox.id = `textbox-${tb.id}`;
            textBox.style.left = tb.left;
            textBox.style.top = tb.top;

            textBox.innerHTML = `
                <button class="delete-btn" onclick="TextBoxModule.delete(${tb.id})">×</button>
                <div class="text-box-content" contenteditable="true">${tb.content}</div>
            `;

            DOM.previewWrapper.appendChild(textBox);
            this.makeDraggable(textBox);
            AppState.textBoxes.push({ id: tb.id, element: textBox });
        });
    },

    getData() {
        return AppState.textBoxes.map(tb => {
            const el = document.getElementById(`textbox-${tb.id}`);
            if (!el) return null;
            return {
                id: tb.id,
                left: el.style.left,
                top: el.style.top,
                content: el.querySelector('.text-box-content').innerHTML
            };
        }).filter(Boolean);
    }
};

window.deleteTextBox = (id) => TextBoxModule.delete(id);
