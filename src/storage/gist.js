const vscode = require('vscode');
const { LocalStorage } = require('./local');

const GIST_FILENAME = 'command-keeper.json';
const GITHUB_API = 'https://api.github.com';

/**
 * GitHub Gist storage: data is stored in a private GitHub Gist.
 * Uses LocalStorage as an in-memory/local cache; syncs to Gist on every mutation.
 */
class GistStorage extends LocalStorage {
    constructor(context) {
        super(context);
        this._pat = null;
        this._gistId = null;
        this._syncing = false;
    }

    async initAuth() {
        try {
            this._pat = (await this._context.secrets.get('commandKeeper.githubPat')) || null;
        } catch {
            this._pat = null;
        }
        this._gistId = vscode.workspace.getConfiguration('commandKeeper').get('githubGistId', '') || null;
        if (this._pat) {
            await this._pullFromGist();
        }
    }

    isAuthenticated() { return !!this._pat; }

    async login(pat) {
        // Validate PAT by calling user endpoint
        let response;
        try {
            response = await fetch(`${GITHUB_API}/user`, {
                headers: this._buildHeaders(pat),
            });
        } catch {
            throw new Error('Cannot connect to GitHub API. Check your internet connection.');
        }
        if (!response.ok) throw new Error('Invalid GitHub Personal Access Token');
        this._pat = pat;
        await this._context.secrets.store('commandKeeper.githubPat', pat);

        // Load local data first
        this._load();

        // Try to pull from existing gist or create one
        if (!this._gistId) {
            await this._createGist();
        } else {
            await this._pullFromGist();
        }
        return { username: (await response.json()).login };
    }

    async logout() {
        this._pat = null;
        await this._context.secrets.delete('commandKeeper.githubPat');
    }

    async checkHealth() {
        if (!this._pat) return false;
        try {
            const r = await fetch(`${GITHUB_API}/user`, { headers: this._buildHeaders() });
            return r.ok;
        } catch {
            return false;
        }
    }

    _buildHeaders(pat) {
        const token = pat || this._pat;
        return {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
        };
    }

    async _pullFromGist() {
        if (!this._pat || !this._gistId) return;
        try {
            const r = await fetch(`${GITHUB_API}/gists/${this._gistId}`, {
                headers: this._buildHeaders(),
            });
            if (!r.ok) return;
            const gist = await r.json();
            const file = gist.files[GIST_FILENAME];
            if (file && file.content) {
                const remote = JSON.parse(file.content);
                this._data = remote;
                this._save();
            }
        } catch {
            // Fall back to local data
        }
    }

    async _pushToGist() {
        if (!this._pat || this._syncing) return;
        this._syncing = true;
        try {
            const content = JSON.stringify(this._data, null, 2);
            const body = { files: { [GIST_FILENAME]: { content } } };

            if (!this._gistId) {
                await this._createGist();
                return;
            }

            const r = await fetch(`${GITHUB_API}/gists/${this._gistId}`, {
                method: 'PATCH',
                headers: this._buildHeaders(),
                body: JSON.stringify(body),
            });
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                console.error('Gist sync failed:', err.message || r.status);
            }
        } catch (e) {
            console.error('Gist push error:', e.message);
        } finally {
            this._syncing = false;
        }
    }

    async _createGist() {
        if (!this._pat) return;
        const content = JSON.stringify(this._data || { version: 1, groups: [], commands: [], _nextGroupId: 1, _nextCommandId: 1 }, null, 2);
        const r = await fetch(`${GITHUB_API}/gists`, {
            method: 'POST',
            headers: this._buildHeaders(),
            body: JSON.stringify({
                description: 'Command Keeper - VS Code extension data',
                public: false,
                files: { [GIST_FILENAME]: { content } },
            }),
        });
        if (!r.ok) throw new Error('Failed to create GitHub Gist');
        const gist = await r.json();
        this._gistId = gist.id;
        // Persist gist ID in user settings
        await vscode.workspace.getConfiguration('commandKeeper').update('githubGistId', this._gistId, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Command Keeper: Created GitHub Gist (ID: ${this._gistId})`);
    }

    // Override save to also push to Gist
    _save() {
        super._save();
        // Push asynchronously (don't await to avoid blocking UI)
        if (this._pat) this._pushToGist().catch(() => {});
    }

    getGistUrl() {
        return this._gistId ? `https://gist.github.com/${this._gistId}` : null;
    }

    async syncNow() {
        await this._pullFromGist();
    }
}

module.exports = { GistStorage };
