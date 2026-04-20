const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const FILENAME = 'terminal-vault-data.json';

function emptyStore() {
    const now = new Date().toISOString();
    return {
        version: 2,
        groups: [],
        commands: [],
        _nextGroupId: 1,
        _nextCommandId: 1,
        meta: {
            last_modified_at: now,
        },
    };
}

function withTimestamp(entity, fallbackTime) {
    const createdAt = entity.created_at || entity.updated_at || fallbackTime;
    const updatedAt = entity.updated_at || entity.created_at || fallbackTime;
    return { ...entity, created_at: createdAt, updated_at: updatedAt };
}

function normalizeStore(data) {
    const fallback = new Date().toISOString();
    const store = data && typeof data === 'object' ? data : emptyStore();
    const groups = Array.isArray(store.groups) ? store.groups.map(group => withTimestamp(group, fallback)) : [];
    const commands = Array.isArray(store.commands) ? store.commands.map(command => withTimestamp(command, fallback)) : [];

    const nextGroupId = Math.max(
        store._nextGroupId || 1,
        groups.reduce((max, group) => Math.max(max, Number(group.id) || 0), 0) + 1
    );
    const nextCommandId = Math.max(
        store._nextCommandId || 1,
        commands.reduce((max, command) => Math.max(max, Number(command.id) || 0), 0) + 1
    );

    return {
        version: Math.max(store.version || 1, 2),
        groups,
        commands,
        _nextGroupId: nextGroupId,
        _nextCommandId: nextCommandId,
        meta: {
            ...(store.meta || {}),
            last_modified_at: store.meta?.last_modified_at || fallback,
        },
    };
}

class LocalStorage {
    constructor(context) {
        this._context = context;
        this._data = null;
    }

    async initAuth() {
        // Local mode: always "authenticated"
        this._load();
    }

    isAuthenticated() { return true; }
    async login() { return {}; }
    async logout() { }

    async checkHealth() { return true; }

    _filePath() {
        return path.join(this._context.globalStorageUri.fsPath, FILENAME);
    }

    _load() {
        const dir = this._context.globalStorageUri.fsPath;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const fp = this._filePath();
        if (!fs.existsSync(fp)) {
            this._data = emptyStore();
            this._save();
        } else {
            try {
                this._data = normalizeStore(JSON.parse(fs.readFileSync(fp, 'utf8')));
                const defaultGroup = this._ensureDefaultGroup();
                const groupIds = new Set(this._data.groups.map(g => g.id));
                for (const cmd of this._data.commands) {
                    if (!groupIds.has(cmd.group_id)) cmd.group_id = defaultGroup.id;
                }
            } catch {
                this._data = emptyStore();
            }
        }
    }

    _save() {
        const fp = this._filePath();
        this._touchStore();
        fs.writeFileSync(fp, JSON.stringify(this._data, null, 2), 'utf8');
    }

    _ensureLoaded() {
        if (!this._data) this._load();
        this._data = normalizeStore(this._data);
    }

    _ensureDefaultGroup() {
        const groups = this._data.groups;
        const defaultGroups = groups.filter(g => g.is_default || g.name === 'Default Group');

        if (defaultGroups.length === 0) {
            const now = new Date().toISOString();
            const defaultGroup = {
                id: this._data._nextGroupId++,
                name: 'Default Group',
                is_default: true,
                color: '#6b7280',
                icon: '📁',
                created_at: now,
                updated_at: now,
            };
            this._data.groups.push(defaultGroup);
            return defaultGroup;
        }

        if (defaultGroups.length > 1) {
            const keep = defaultGroups.find(g => g.is_default) || defaultGroups[0];
            const removeIds = new Set(defaultGroups.filter(g => g.id !== keep.id).map(g => g.id));
            this._data.groups = this._data.groups.filter(g => !removeIds.has(g.id));
            for (const cmd of this._data.commands) {
                if (removeIds.has(cmd.group_id)) cmd.group_id = keep.id;
            }
            keep.is_default = true;
            return keep;
        }

        defaultGroups[0].is_default = true;
        return defaultGroups[0];
    }

    _touchStore() {
        if (!this._data) return;
        this._data.meta = {
            ...(this._data.meta || {}),
            last_modified_at: new Date().toISOString(),
        };
    }

    // Groups
    async getGroups() {
        this._ensureLoaded();
        return [...this._data.groups].sort((a, b) => a.name.localeCompare(b.name));
    }

    async createGroup(data) {
        this._ensureLoaded();
        const now = new Date().toISOString();
        const group = {
            id: this._data._nextGroupId++,
            name: data.name,
            description: data.description || null,
            color: data.color || '#3b82f6',
            icon: data.icon || '📁',
            created_at: now,
            updated_at: now,
        };
        this._data.groups.push(group);
        this._save();
        return group;
    }

    async updateGroup(id, data) {
        this._ensureLoaded();
        const idx = this._data.groups.findIndex(g => g.id === id);
        if (idx === -1) throw new Error('Group not found');
        this._data.groups[idx] = {
            ...this._data.groups[idx],
            ...data,
            updated_at: new Date().toISOString(),
        };
        this._save();
        return this._data.groups[idx];
    }

    async deleteGroup(id) {
        this._ensureLoaded();
        const group = this._data.groups.find(g => g.id === id);
        if (group?.is_default) throw new Error('The Default Group cannot be deleted.');
        this._data.groups = this._data.groups.filter(g => g.id !== id);
        this._data.commands = this._data.commands.filter(c => c.group_id !== id);
        this._save();
    }

    // Commands helpers
    _commandTags(cmd) {
        return cmd.tags || [];
    }

    async getCommands(params = {}) {
        this._ensureLoaded();
        let cmds = this._data.commands.map(c => ({ ...c, tags: this._commandTags(c) }));
        if (params.group_id != null) cmds = cmds.filter(c => c.group_id == params.group_id);
        return cmds.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    }

    async getCommandsPaged(params = {}) {
        this._ensureLoaded();
        let cmds = this._data.commands.map(c => ({ ...c, tags: this._commandTags(c) }));

        if (params.group_id != null) cmds = cmds.filter(c => c.group_id == params.group_id);
        if (params.is_favorite != null) cmds = cmds.filter(c => c.is_favorite === (params.is_favorite === true || params.is_favorite === 'true'));

        const q = (params.q || '').toLowerCase().trim();
        if (q) {
            cmds = cmds.filter(c =>
                c.title.toLowerCase().includes(q) ||
                c.command.toLowerCase().includes(q) ||
                (c.description || '').toLowerCase().includes(q)
            );
        }

        if (params.tag) {
            const tags = Array.isArray(params.tag) ? params.tag : [params.tag];
            cmds = cmds.filter(c => tags.some(t => (c.tags || []).includes(t)));
        }

        if (params.sort === 'mostCopied') {
            cmds.sort((a, b) => (b.copy_count || 0) - (a.copy_count || 0));
        } else {
            cmds.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
        }

        const limit = parseInt(params.limit) || 20;
        const offset = parseInt(params.offset) || 0;
        const total = cmds.length;
        return { items: cmds.slice(offset, offset + limit), total, limit, offset };
    }

    async getTopCopied(limit = 10) {
        this._ensureLoaded();
        return [...this._data.commands]
            .map(c => ({ ...c, tags: this._commandTags(c) }))
            .sort((a, b) => (b.copy_count || 0) - (a.copy_count || 0))
            .slice(0, limit);
    }

    async createCommand(data) {
        this._ensureLoaded();
        let groupId = data.group_id;
        const groupIds = new Set(this._data.groups.map(g => g.id));
        if (!groupId || !groupIds.has(groupId)) {
            groupId = this._ensureDefaultGroup().id;
        }
        const now = new Date().toISOString();
        const cmd = {
            id: this._data._nextCommandId++,
            group_id: groupId,
            title: data.title,
            command: data.command,
            description: data.description || null,
            tags: data.tags || [],
            is_favorite: data.is_favorite || false,
            copy_count: data.copy_count || 0,
            default_variables: data.default_variables || {},
            created_at: now,
            updated_at: now,
        };
        this._data.commands.push(cmd);
        this._save();
        return cmd;
    }

    async updateCommand(id, data) {
        this._ensureLoaded();
        const idx = this._data.commands.findIndex(c => c.id === id);
        if (idx === -1) throw new Error('Command not found');
        this._data.commands[idx] = {
            ...this._data.commands[idx],
            ...data,
            updated_at: new Date().toISOString(),
        };
        this._save();
        return { ...this._data.commands[idx], tags: this._commandTags(this._data.commands[idx]) };
    }

    async deleteCommand(id) {
        this._ensureLoaded();
        this._data.commands = this._data.commands.filter(c => c.id !== id);
        this._save();
    }

    async incrementCopy(id, currentCount) {
        return this.updateCommand(id, { copy_count: (currentCount || 0) + 1 });
    }

    async search(q, params = {}) {
        const result = await this.getCommandsPaged({ ...params, q, limit: 50 });
        return result;
    }

    async getTags() {
        this._ensureLoaded();
        const tagSet = new Set();
        this._data.commands.forEach(c => (c.tags || []).forEach(t => tagSet.add(t)));
        return [...tagSet].sort();
    }

    async getDashboardStats() {
        this._ensureLoaded();
        return {
            total_commands: this._data.commands.length,
            total_groups: this._data.groups.length,
            total_tags: (await this.getTags()).length,
            total_copies: this._data.commands.reduce((s, c) => s + (c.copy_count || 0), 0),
            top_commands: await this.getTopCopied(5),
        };
    }

    async importVault(data) {
        this._ensureLoaded();
        const idMap = {};
        for (const g of data.groups || []) {
            if (g.is_default || g.name === 'Default Group') {
                idMap[g.source_id] = this._ensureDefaultGroup().id;
            } else {
                const created = await this.createGroup(g);
                idMap[g.source_id] = created.id;
            }
        }
        for (const c of data.commands || []) {
            await this.createCommand({ ...c, group_id: idMap[c.source_group_id] || idMap[c.group_id] || c.group_id });
        }
        return { groups_created: (data.groups || []).length, commands_created: (data.commands || []).length };
    }

    async previewHistoryImport(groupId, history, tags = []) {
        const existing = new Set(this._data.commands.map(c => c.command.trim()));
        const lines = history.split('\n');
        const noise = new Set(['cd', 'ls', 'pwd', 'clear', 'exit', 'history', 'alias']);
        const items = [];
        const seen = new Set();

        for (const raw of lines) {
            let line = raw.trim();
            if (line.startsWith(':') && line.includes(';')) line = line.split(';', 2)[1].trim();
            if (!line || line.startsWith('#') || line.length < 3) continue;
            const first = line.split(' ')[0].toLowerCase();
            if (noise.has(first)) { items.push({ command: line, status: 'noise', reason: `noise: ${first}` }); continue; }
            if (seen.has(line)) { items.push({ command: line, status: 'duplicate', reason: 'duplicate in history' }); continue; }
            seen.add(line);
            if (existing.has(line)) { items.push({ command: line, status: 'duplicate', reason: 'already exists' }); continue; }
            items.push({ command: line, status: 'new' });
        }

        const created = items.filter(i => i.status === 'new').length;
        const dupes = items.filter(i => i.status === 'duplicate').length;
        const noiseCount = items.filter(i => i.status === 'noise').length;
        return { total_lines: lines.length, parsed: items.length, created_candidates: created, duplicate_candidates: dupes, noise_candidates: noiseCount, truncated: false, items };
    }

    async importHistory(groupId, history, tags = []) {
        const preview = await this.previewHistoryImport(groupId, history, tags);
        let created = 0;
        for (const item of preview.items) {
            if (item.status !== 'new') continue;
            const tokens = item.command.split(' ');
            const title = tokens.length > 1 ? `${tokens[0]} ${tokens[1]}` : tokens[0];
            await this.createCommand({ group_id: groupId, title: title.slice(0, 160), command: item.command, tags, default_variables: {} });
            created++;
        }
        return { created, skipped_duplicates: preview.duplicate_candidates, skipped_noise: preview.noise_candidates, total_lines: preview.total_lines, parsed: preview.parsed };
    }

    getDataPath() {
        return this._filePath();
    }

    getRawData() {
        this._ensureLoaded();
        return this._data;
    }
}

module.exports = { LocalStorage, normalizeStore, emptyStore };
