const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class MainPanel {
    static currentPanel = null;
    static viewType = 'commandKeeperPanel';

    static createOrShow(context, storage, onRefresh) {
        const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

        if (MainPanel.currentPanel) {
            MainPanel.currentPanel._storage = storage;
            MainPanel.currentPanel.panel.reveal(column);
            MainPanel.currentPanel._postAuthState();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            MainPanel.viewType,
            'Command Keeper',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'src', 'webview')],
            }
        );

        MainPanel.currentPanel = new MainPanel(panel, context, storage, onRefresh);
    }

    constructor(panel, context, storage, onRefresh) {
        this.panel = panel;
        this._context = context;
        this._storage = storage;
        this._onRefresh = onRefresh;

        this.panel.webview.html = this._buildHtml();

        this.panel.webview.onDidReceiveMessage(
            msg => this._handleMessage(msg),
            null,
            context.subscriptions
        );

        this.panel.onDidDispose(() => { MainPanel.currentPanel = null; }, null, context.subscriptions);

        // Delay init to let the webview load
        setTimeout(() => this._postAuthState(), 600);
    }

    _postAuthState() {
        const mode = vscode.workspace.getConfiguration('commandKeeper').get('storageMode', 'local');
        this.panel.webview.postMessage({
            type: 'authState',
            isAuthenticated: this._storage.isAuthenticated(),
            storageMode: mode,
        });
    }

    async _handleMessage(msg) {
        const { type, id } = msg;

        if (type === 'ready') {
            this._postAuthState();
            return;
        }

        if (type === 'apiRequest') {
            try {
                const data = await this._dispatchApi(msg.method, msg.path, msg.body);
                this.panel.webview.postMessage({ type: 'apiResponse', id, data });
            } catch (err) {
                this.panel.webview.postMessage({ type: 'apiResponse', id, error: err.message });
            }
            return;
        }

        if (type === 'login') {
            try {
                const mode = vscode.workspace.getConfiguration('commandKeeper').get('storageMode', 'local');
                let result;
                if (mode === 'github-gist') {
                    result = await this._storage.login(msg.pat);
                } else {
                    result = await this._storage.login(msg.username, msg.password);
                }
                this.panel.webview.postMessage({ type: 'loginResult', success: true, data: result });
                this._postAuthState();
                this._onRefresh?.();
            } catch (err) {
                this.panel.webview.postMessage({ type: 'loginResult', success: false, error: err.message });
            }
            return;
        }

        if (type === 'logout') {
            await this._storage.logout();
            this._postAuthState();
            this._onRefresh?.();
            return;
        }

        if (type === 'copyToClipboard') {
            await vscode.env.clipboard.writeText(msg.text);
            vscode.window.showInformationMessage(`Copied: ${msg.title || 'command'}`);
            return;
        }

        if (type === 'runInTerminal') {
            const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('Command Keeper');
            terminal.show();
            terminal.sendText(msg.text);
            return;
        }

        if (type === 'insertAtCursor') {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                await editor.edit(eb => eb.insert(editor.selection.active, msg.text));
            } else {
                vscode.window.showWarningMessage('No active text editor');
            }
            return;
        }

        if (type === 'notify') {
            if (msg.level === 'error') vscode.window.showErrorMessage(msg.text);
            else if (msg.level === 'warn') vscode.window.showWarningMessage(msg.text);
            else vscode.window.showInformationMessage(msg.text);
            return;
        }

        if (type === 'refreshTree') {
            this._onRefresh?.();
            return;
        }

        if (type === 'openExternal') {
            vscode.env.openExternal(vscode.Uri.parse(msg.url));
            return;
        }
    }

    async _dispatchApi(method, apiPath, body) {
        // Route to correct storage method based on path patterns
        const s = this._storage;

        if (method === 'GET' && apiPath === '/groups') return s.getGroups();
        if (method === 'POST' && apiPath === '/groups') return s.createGroup(body);
        if (method === 'PATCH' && apiPath.startsWith('/groups/')) return s.updateGroup(+apiPath.split('/')[2], body);
        if (method === 'DELETE' && apiPath.startsWith('/groups/')) return s.deleteGroup(+apiPath.split('/')[2]);

        if (method === 'GET' && apiPath.startsWith('/commands/paged')) {
            const params = Object.fromEntries(new URL('http://x' + apiPath).searchParams);
            return s.getCommandsPaged(params);
        }
        if (method === 'GET' && apiPath.startsWith('/commands/top-copied')) {
            const limit = +new URL('http://x' + apiPath).searchParams.get('limit') || 10;
            return s.getTopCopied(limit);
        }
        if (method === 'GET' && /^\/commands\/\d+$/.test(apiPath)) {
            const id = +apiPath.split('/')[2];
            const commands = await s.getCommands();
            const command = commands.find(item => item.id === id);
            if (!command) throw new Error('Command not found');
            return command;
        }
        if (method === 'GET' && apiPath.startsWith('/commands')) {
            const params = Object.fromEntries(new URL('http://x' + apiPath).searchParams);
            return s.getCommands(params);
        }
        if (method === 'POST' && apiPath === '/commands') return s.createCommand(body);
        if (method === 'PATCH' && apiPath.startsWith('/commands/')) {
            const id = +apiPath.split('/')[2];
            return s.updateCommand(id, body);
        }
        if (method === 'DELETE' && apiPath.startsWith('/commands/')) return s.deleteCommand(+apiPath.split('/')[2]);

        if (method === 'GET' && apiPath.startsWith('/search')) {
            const params = Object.fromEntries(new URL('http://x' + apiPath).searchParams);
            return s.search(params.q || '', params);
        }

        if (method === 'GET' && apiPath === '/tags') return s.getTags();

        if (method === 'GET' && apiPath.startsWith('/stats')) {
            const params = Object.fromEntries(new URL('http://x' + apiPath).searchParams);
            return s.getDashboardStats(params);
        }

        if (method === 'POST' && apiPath === '/import') return s.importVault(body);
        if (method === 'POST' && apiPath === '/import/history/preview') {
            return s.previewHistoryImport(body.group_id, body.history, body.tags);
        }
        if (method === 'POST' && apiPath === '/import/history') {
            return s.importHistory(body.group_id, body.history, body.tags);
        }

        if (method === 'GET' && apiPath === '/gist-url') {
            return { url: s.getGistUrl?.() || null };
        }
        if (method === 'POST' && apiPath === '/sync') {
            await s.syncNow?.();
            return { ok: true };
        }

        throw new Error(`Unknown API path: ${method} ${apiPath}`);
    }

    _buildHtml() {
        const nonce = crypto.randomUUID().replace(/-/g, '');
        console.log('[CommandKeeper] Nonce utilisé pour la webview :', nonce);
        const htmlPath = path.join(this._context.extensionPath, 'src', 'webview', 'panel.html');
        try {
            let html = fs.readFileSync(htmlPath, 'utf8');
            html = html.replace(/<body(.*?)>/, `<body$1 data-nonce="${nonce}">`);
            html = html.replace(/\{\{nonce\}\}/g, nonce);
            return html;
        } catch (e) {
            return `<html><body style="padding:20px;font-family:sans-serif">
                <h3>Error loading Command Keeper panel</h3>
                <p>${e.message}</p>
            </body></html>`;
        }
    }
}

module.exports = { MainPanel };
