/**
 * db.js - LocalStorage Database for persistent storage
 * All data is permanently saved and never lost
 */

const DB = {
    STORAGE_KEY: 'study_notes_data',

    /**
     * Get all data from localStorage
     */
    getData() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load data:', e);
        }
        return this.getDefaultData();
    },

    /**
     * Save all data to localStorage
     */
    saveData(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save data:', e);
            return false;
        }
    },

    /**
     * Default data structure
     */
    getDefaultData() {
        return {
            folders: [],
            version: 1,
            lastUpdated: new Date().toISOString()
        };
    },

    // ===== Folders =====

    getFolders() {
        return this.getData().folders;
    },

    getFolder(folderId) {
        return this.getFolders().find(f => f.id === folderId);
    },

    createFolder(name) {
        const data = this.getData();
        const folder = {
            id: Date.now().toString(),
            name: name,
            notes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        data.folders.push(folder);
        data.lastUpdated = new Date().toISOString();
        this.saveData(data);
        return folder;
    },

    renameFolder(folderId, newName) {
        const data = this.getData();
        const folder = data.folders.find(f => f.id === folderId);
        if (folder) {
            folder.name = newName;
            folder.updatedAt = new Date().toISOString();
            data.lastUpdated = new Date().toISOString();
            this.saveData(data);
        }
    },

    deleteFolder(folderId) {
        const data = this.getData();
        data.folders = data.folders.filter(f => f.id !== folderId);
        data.lastUpdated = new Date().toISOString();
        this.saveData(data);
    },

    // ===== Notes =====

    getNotes(folderId) {
        const folder = this.getFolder(folderId);
        return folder ? folder.notes : [];
    },

    getNote(folderId, noteId) {
        const notes = this.getNotes(folderId);
        return notes.find(n => n.id === noteId);
    },

    createNote(folderId, name) {
        const data = this.getData();
        const folder = data.folders.find(f => f.id === folderId);
        if (!folder) return null;

        const note = {
            id: Date.now().toString(),
            name: name,
            markdown: '',
            drawings: [],
            textBoxes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        folder.notes.push(note);
        folder.updatedAt = new Date().toISOString();
        data.lastUpdated = new Date().toISOString();
        this.saveData(data);
        return note;
    },

    updateNote(folderId, noteId, updates) {
        const data = this.getData();
        const folder = data.folders.find(f => f.id === folderId);
        if (!folder) return;

        const note = folder.notes.find(n => n.id === noteId);
        if (!note) return;

        Object.assign(note, updates);
        note.updatedAt = new Date().toISOString();
        folder.updatedAt = new Date().toISOString();
        data.lastUpdated = new Date().toISOString();
        this.saveData(data);
    },

    renameNote(folderId, noteId, newName) {
        this.updateNote(folderId, noteId, { name: newName });
    },

    deleteNote(folderId, noteId) {
        const data = this.getData();
        const folder = data.folders.find(f => f.id === folderId);
        if (!folder) return;

        folder.notes = folder.notes.filter(n => n.id !== noteId);
        folder.updatedAt = new Date().toISOString();
        data.lastUpdated = new Date().toISOString();
        this.saveData(data);
    },

    // ===== Export/Import =====

    exportAll() {
        const data = this.getData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `study-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();

        URL.revokeObjectURL(url);
    },

    importAll(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.folders && Array.isArray(data.folders)) {
                this.saveData(data);
                return true;
            }
        } catch (e) {
            console.error('Import failed:', e);
        }
        return false;
    }
};
