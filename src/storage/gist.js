const vscode = require('vscode');
const { LocalStorage, normalizeStore, emptyStore } = require('./local');

const GIST_FILENAME = 'terminal-vault.json';
const GITHUB_API = 'https://api.github.com';
const PUSH_DEBOUNCE_MS = 1200;
const GITHUB_AUTH_PROVIDER = 'github';
const GITHUB_AUTH_SCOPES = ['gist'];
const AUTH_ENABLED_KEY = 'terminalVault.githubAuthEnabled';

/**
 * GitHub Gist storage: data is stored in a secret GitHub Gist.
 * Uses LocalStorage as an in-memory/local cache; syncs to Gist on every mutation.
 */
class GistStorage extends LocalStorage {
    constructor(context) {
        super(context);
        this._pat = null;
        this._gistId = null;
        this._syncing = false;
        this._pushTimer = null;
        this._pendingPush = false;
        this._suspendPush = false;
        this._syncStatus = {
            state: 'idle',
            lastSyncedAt: null,
            lastPulledAt: null,
            lastError: null,
            username: null,
            gistId: null,
            gistUrl: null,
        };
    }

    async initAuth() {
        this._pat = null;
        this._gistId = vscode.workspace.getConfiguration('terminalVault').get('githubGistId', '') || null;
        this._syncStatus.gistId = this._gistId;
        this._syncStatus.gistUrl = this.getGistUrl();
        const authEnabled = this._context.globalState.get(AUTH_ENABLED_KEY, false);
        if (authEnabled) {
            await this._restoreSession();
            if (this._pat) {
                await this._pullFromGist();
            }
        }
    }

    isAuthenticated() { return !!this._pat; }

    async login() {
        let session;
        try {
            session = await vscode.authentication.getSession(GITHUB_AUTH_PROVIDER, GITHUB_AUTH_SCOPES, {
                createIfNone: {
                    detail: 'Terminal Vault needs access to create and sync a secret GitHub Gist for your saved commands.',
                },
            });
        } catch {
            throw new Error('GitHub sign-in was cancelled or could not be completed.');
        }

        if (!session?.accessToken) throw new Error('Unable to obtain a GitHub session.');

        this._pat = session.accessToken;
        await this._context.globalState.update(AUTH_ENABLED_KEY, true);
        this._setSyncStatus({ state: 'idle', lastError: null });

        // Load local data first
        this._load();
        this._setSyncStatus({ username: session.account.label });

        // Recherche automatique d'un gist existant si aucun gistId n'est configuré
        if (!this._gistId) {
            // Lister les gists de l'utilisateur
            try {
                const resp = await fetch(`${GITHUB_API}/gists`, {
                    headers: this._buildHeaders(),
                });
                if (resp.ok) {
                    const gists = await resp.json();
                    const found = gists.find(gist =>
                        gist.description === 'Terminal Vault - VS Code extension data' &&
                        gist.files && gist.files[GIST_FILENAME]
                    );
                    if (found) {
                        this._gistId = found.id;
                        this._setSyncStatus({ gistId: this._gistId, gistUrl: this.getGistUrl() });
                        await vscode.workspace.getConfiguration('terminalVault').update('githubGistId', this._gistId, vscode.ConfigurationTarget.Global);
                        await this._pullFromGist();
                        return { username: session.account.label };
                    }
                }
            } catch (e) {
                // Ignore erreur, on créera un nouveau gist
            }
            // Si aucun gist trouvé, on en crée un nouveau
            await this._createGist();
        } else {
            await this._pullFromGist();
        }
        return { username: session.account.label };
    }

    async logout() {
        this._pat = null;
        if (this._pushTimer) clearTimeout(this._pushTimer);
        this._pushTimer = null;
        this._pendingPush = false;
        await this._context.globalState.update(AUTH_ENABLED_KEY, false);
        try {
            await vscode.authentication.getSession(GITHUB_AUTH_PROVIDER, GITHUB_AUTH_SCOPES, {
                silent: true,
                clearSessionPreference: true,
            });
        } catch { }
        this._setSyncStatus({ state: 'idle', lastError: null, username: null });
    }

    async _restoreSession() {
        try {
            const session = await vscode.authentication.getSession(GITHUB_AUTH_PROVIDER, GITHUB_AUTH_SCOPES, {
                silent: true,
            });
            if (!session?.accessToken) return;
            this._pat = session.accessToken;
            this._setSyncStatus({ username: session.account.label });
        } catch { }
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

    async _pullFromGist(options = {}) {
        if (!this._pat || !this._gistId) return;
        this._ensureLoaded();
        this._setSyncStatus({ state: 'pulling', lastError: null });
        try {
            const r = await fetch(`${GITHUB_API}/gists/${this._gistId}`, {
                headers: this._buildHeaders(),
            });
            if (!r.ok) {
                // Si le gist n'existe pas (404), on le crée automatiquement
                if (r.status === 404) {
                    await this._createGist();
                    this._setSyncStatus({ state: 'synced', lastPulledAt: new Date().toISOString(), lastSyncedAt: new Date().toISOString(), lastError: null });
                    return;
                }
                const message = `GitHub pull failed (${r.status})`;
                this._setSyncStatus({ state: 'error', lastError: message });
                if (options.throwOnError) throw new Error(message);
                return;
            }
            const gist = await r.json();
            if (gist.public) {
                const remote = gist.files?.[GIST_FILENAME]?.content
                    ? normalizeStore(JSON.parse(gist.files[GIST_FILENAME].content))
                    : normalizeStore(this._data || emptyStore());
                await this._migrateToSecretGist(remote);
                return;
            }
            const file = gist.files[GIST_FILENAME];
            if (file && file.content) {
                const remote = normalizeStore(JSON.parse(file.content));
                this._data = this._mergeStores(this._data, remote);
                const defaultGroup = this._ensureDefaultGroup();
                const groupIds = new Set(this._data.groups.map(g => g.id));
                for (const cmd of this._data.commands) {
                    if (!groupIds.has(cmd.group_id)) cmd.group_id = defaultGroup.id;
                }
                this._suspendPush = true;
                this._save();
                this._suspendPush = false;
            }
            this._setSyncStatus({
                state: 'synced',
                lastPulledAt: new Date().toISOString(),
                lastSyncedAt: new Date().toISOString(),
                gistId: this._gistId,
                gistUrl: this.getGistUrl(),
                lastError: null,
            });
        } catch {
            // Fall back to local data
            this._setSyncStatus({ state: 'error', lastError: 'Could not pull data from GitHub Gist' });
            if (options.throwOnError) throw new Error('Could not pull data from GitHub Gist');
        }
    }

    async _pushToGist() {
        if (!this._pat || this._syncing) return;
        this._syncing = true;
        this._setSyncStatus({ state: 'pushing', lastError: null });
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
                const message = err.message || `GitHub push failed (${r.status})`;
                this._setSyncStatus({ state: 'error', lastError: message });
                console.error('Gist sync failed:', message);
                throw new Error(message);
            } else {
                this._setSyncStatus({
                    state: 'synced',
                    lastSyncedAt: new Date().toISOString(),
                    gistId: this._gistId,
                    gistUrl: this.getGistUrl(),
                    lastError: null,
                });
            }
        } catch (e) {
            this._setSyncStatus({ state: 'error', lastError: e.message || 'GitHub push error' });
            console.error('Gist push error:', e.message);
            throw e;
        } finally {
            this._syncing = false;
            if (this._pendingPush) {
                this._pendingPush = false;
                this._schedulePush();
            }
        }
    }

    async _createGist(initialData = null, options = {}) {
        if (!this._pat) return;
        const content = JSON.stringify(initialData || this._data || { version: 1, groups: [], commands: [], _nextGroupId: 1, _nextCommandId: 1 }, null, 2);
        const r = await fetch(`${GITHUB_API}/gists`, {
            method: 'POST',
            headers: this._buildHeaders(),
            body: JSON.stringify({
                description: 'Terminal Vault - VS Code extension data',
                public: false,
                files: { [GIST_FILENAME]: { content } },
            }),
        });
        if (!r.ok) throw new Error('Failed to create GitHub Gist');
        const gist = await r.json();
        this._gistId = gist.id;
        this._syncStatus.gistUrl = this.getGistUrl();
        this._setSyncStatus({
            gistId: this._gistId,
            gistUrl: this.getGistUrl(),
            state: 'synced',
            lastSyncedAt: new Date().toISOString(),
            lastError: null,
        });
        // Persist gist ID in user settings
        await vscode.workspace.getConfiguration('terminalVault').update('githubGistId', this._gistId, vscode.ConfigurationTarget.Global);
        if (!options.silent) {
            vscode.window.showInformationMessage(`Terminal Vault: Created secret GitHub Gist (ID: ${this._gistId})`);
        }
    }

    async _migrateToSecretGist(remoteData) {
        const previousGistId = this._gistId;
        await this._createGist(remoteData, { silent: true });
        this._data = normalizeStore(remoteData || this._data || emptyStore());
        this._suspendPush = true;
        super._save();
        this._suspendPush = false;
        vscode.window.showWarningMessage(
            `Terminal Vault: The linked Gist ${previousGistId} was public. A new secret Gist has been created and linked automatically.`
        );
    }

    // Override save to also push to Gist
    _save() {
        super._save();
        if (this._pat && !this._suspendPush) this._schedulePush();
    }

    _schedulePush() {
        if (!this._pat) return;
        if (this._syncing) {
            this._pendingPush = true;
            return;
        }
        if (this._pushTimer) clearTimeout(this._pushTimer);
        this._setSyncStatus({ state: 'queued', lastError: null });
        this._pushTimer = setTimeout(() => {
            this._pushTimer = null;
            this._pushToGist().catch(() => { });
        }, PUSH_DEBOUNCE_MS);
    }

    _setSyncStatus(partial) {
        this._syncStatus = {
            ...this._syncStatus,
            ...partial,
            gistId: partial.gistId !== undefined ? partial.gistId : this._gistId,
            gistUrl: partial.gistUrl !== undefined ? partial.gistUrl : this.getGistUrl(),
        };
        this.onStatusChange?.();
    }

    _mergeStores(localStore, remoteStore) {
        const local = normalizeStore(localStore || emptyStore());
        const remote = normalizeStore(remoteStore || emptyStore());

        const mergeEntities = (localItems, remoteItems) => {
            const merged = new Map();

            for (const item of [...remoteItems, ...localItems]) {
                const existing = merged.get(item.id);
                if (!existing) {
                    merged.set(item.id, item);
                    continue;
                }
                const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
                const currentTime = new Date(item.updated_at || item.created_at || 0).getTime();
                if (currentTime >= existingTime) merged.set(item.id, item);
            }

            return [...merged.values()];
        };

        let groups = mergeEntities(local.groups, remote.groups);
        let commands = mergeEntities(local.commands, remote.commands);

        // Deduplicate default groups — keep the most recently updated one
        const defaultGroups = groups.filter(g => g.is_default || g.name === 'Default Group');
        if (defaultGroups.length > 1) {
            defaultGroups.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
            const keepId = defaultGroups[0].id;
            const removeIds = new Set(defaultGroups.slice(1).map(g => g.id));
            groups = groups.filter(g => !removeIds.has(g.id));
            commands = commands.map(c => removeIds.has(c.group_id) ? { ...c, group_id: keepId } : c);
        }

        commands = commands.filter(command => groups.some(group => group.id == command.group_id));

        return normalizeStore({
            version: Math.max(local.version || 1, remote.version || 1),
            groups,
            commands,
            _nextGroupId: Math.max(local._nextGroupId || 1, remote._nextGroupId || 1),
            _nextCommandId: Math.max(local._nextCommandId || 1, remote._nextCommandId || 1),
            meta: {
                last_modified_at: [local.meta?.last_modified_at, remote.meta?.last_modified_at]
                    .filter(Boolean)
                    .sort()
                    .pop() || new Date().toISOString(),
            },
        });
    }

    getGistUrl() {
        return this._gistId ? `https://gist.github.com/${this._gistId}` : null;
    }

    async syncNow() {
        if (!this._pat) throw new Error('GitHub Gist sync is not connected');
        if (this._pushTimer) {
            clearTimeout(this._pushTimer);
            this._pushTimer = null;
        }
        await this._pushToGist();
        await this._pullFromGist({ throwOnError: true });
    }

    getSyncStatus() {
        return {
            ...this._syncStatus,
            isAuthenticated: this.isAuthenticated(),
            gistId: this._gistId,
            gistUrl: this.getGistUrl(),
        };
    }
}

module.exports = { GistStorage };
