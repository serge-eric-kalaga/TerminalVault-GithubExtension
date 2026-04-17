const vscode = require('vscode');
const { createStorage } = require('./src/storage');
const { CommandsProvider, FavoritesProvider } = require('./src/providers');
const { showCommandPalette, resolveVariables, extractVariables } = require('./src/palette');
const { MainPanel } = require('./src/panel');

let storage;
let commandsProvider;
let favoritesProvider;
let statusBarItem;

async function activate(context) {
    storage = createStorage(context);

    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'command-keeper.openPanel';
    context.subscriptions.push(statusBarItem);

    // Tree providers
    commandsProvider = new CommandsProvider(storage);
    favoritesProvider = new FavoritesProvider(storage);

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('commandKeeperGroups', commandsProvider),
        vscode.window.registerTreeDataProvider('commandKeeperFavorites', favoritesProvider)
    );

    // Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('command-keeper.openPanel', () => {
            MainPanel.createOrShow(context, storage, refreshProviders);
        }),
        vscode.commands.registerCommand('command-keeper.palette', () => {
            showCommandPalette(storage);
        }),
        vscode.commands.registerCommand('command-keeper.search', () => {
            showCommandPalette(storage);
        }),
        vscode.commands.registerCommand('command-keeper.refresh', () => {
            refreshProviders();
            updateStatusBar();
        }),
        vscode.commands.registerCommand('command-keeper.login', async () => {
            await performLogin(context);
        }),
        vscode.commands.registerCommand('command-keeper.logout', async () => {
            await storage.logout();
            refreshProviders();
            updateStatusBar();
            vscode.window.showInformationMessage('Command Keeper: Disconnected');
        }),
        vscode.commands.registerCommand('command-keeper.copyCommand', async (item) => {
            await handleAction(item, 'copy');
        }),
        vscode.commands.registerCommand('command-keeper.runInTerminal', async (item) => {
            await handleAction(item, 'terminal');
        }),
        vscode.commands.registerCommand('command-keeper.insertAtCursor', async (item) => {
            await handleAction(item, 'insert');
        }),
        vscode.commands.registerCommand('command-keeper.addCommand', async () => {
            await quickAddCommand();
        }),
        vscode.commands.registerCommand('command-keeper.saveClipboardCommand', async () => {
            await quickAddFromClipboard();
        }),
        vscode.commands.registerCommand('command-keeper.saveTerminalSelection', async () => {
            await saveTerminalSelection();
        })
    );

    // Reload storage when settings change
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('commandKeeper')) {
                storage = createStorage(context);
                storage.initAuth().then(() => {
                    refreshProviders();
                    updateStatusBar();
                    if (MainPanel.currentPanel) MainPanel.createOrShow(context, storage, refreshProviders);
                });
            }
        })
    );

    // Init auth and refresh
    await storage.initAuth();
    updateStatusBar();
    refreshProviders();
}

function refreshProviders() {
    commandsProvider.refresh();
    favoritesProvider.refresh();
}

async function performLogin(context) {
    const mode = vscode.workspace.getConfiguration('commandKeeper').get('storageMode', 'local');

    if (mode === 'github-gist') {
        const pat = await vscode.window.showInputBox({
            prompt: 'GitHub Personal Access Token (needs gist scope)',
            password: true,
            placeHolder: 'ghp_…',
        });
        if (!pat) return;
        try {
            await storage.login(pat);
            vscode.window.showInformationMessage('Command Keeper: Connected to GitHub Gist');
            updateStatusBar();
            refreshProviders();
        } catch (e) {
            vscode.window.showErrorMessage(`GitHub login failed: ${e.message}`);
        }
        return;
    }

}

async function handleAction(item, action) {
    const cmd = item?.command_data;
    if (!cmd) return;

    let text = cmd.command;
    if (text.includes('{{')) {
        text = await resolveVariables(text, cmd.default_variables || {}, {
            allowRawCopy: action === 'copy',
        });
        if (text === null) return;
    }

    try { await storage.incrementCopy(cmd.id, cmd.copy_count || 0); } catch {}

    if (action === 'copy') {
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage(`Copied: ${cmd.title}`);
    } else if (action === 'terminal') {
        const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('Command Keeper');
        terminal.show();
        terminal.sendText(text);
    } else if (action === 'insert') {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await editor.edit(eb => eb.insert(editor.selection.active, text));
        } else {
            vscode.window.showWarningMessage('No active text editor to insert into');
        }
    }
}

function suggestTitleFromCommand(command) {
    const text = command.trim();
    if (!text) return '';
    const parts = text.split(/\s+/).slice(0, 3);
    return parts.join(' ').slice(0, 80);
}

async function quickAddCommand(prefill = {}) {
    if (!storage.isAuthenticated()) {
        const choice = await vscode.window.showWarningMessage('Not connected to Command Keeper', 'Connect');
        if (choice === 'Connect') await performLogin();
        return;
    }

    let groups;
    try { groups = await storage.getGroups(); } catch (e) {
        vscode.window.showErrorMessage(`Cannot load groups: ${e.message}`);
        return;
    }

    if (!groups.length) {
        const choice = await vscode.window.showWarningMessage('No groups yet. Open the panel to create one.', 'Open Panel');
        if (choice === 'Open Panel') vscode.commands.executeCommand('command-keeper.openPanel');
        return;
    }

    const groupPick = await vscode.window.showQuickPick(
        groups.map(g => ({ label: `${g.icon || '📁'} ${g.name}`, value: g })),
        { placeHolder: prefill.placeHolder || 'Select group' }
    );
    if (!groupPick) return;

    const initialCommand = (prefill.command || '').trim();
    const title = await vscode.window.showInputBox({
        prompt: 'Command title',
        placeHolder: 'e.g. Deploy to production',
        value: prefill.title || suggestTitleFromCommand(initialCommand),
    });
    if (!title) return;

    const command = await vscode.window.showInputBox({
        prompt: 'Command text',
        placeHolder: 'e.g. kubectl apply -f deploy.yaml',
        value: initialCommand,
    });
    if (!command) return;

    const description = await vscode.window.showInputBox({
        prompt: 'Description (optional)',
        placeHolder: 'What does this command do?',
        value: prefill.description || '',
    });
    const defaultVariables = {};
    for (const name of extractVariables(command.trim())) {
        const defaultValue = await vscode.window.showInputBox({
            prompt: `Default value for {{${name}}} (optional)`,
            placeHolder: name,
            value: prefill.default_variables?.[name] || '',
        });
        if (defaultValue === undefined) return;
        defaultVariables[name] = defaultValue;
    }

    try {
        await storage.createCommand({
            group_id: groupPick.value.id,
            title: title.trim(),
            command: command.trim(),
            description: description?.trim() || null,
            tags: [],
            is_favorite: false,
            default_variables: defaultVariables,
        });
        vscode.window.showInformationMessage(`Command "${title}" added`);
        refreshProviders();
    } catch (e) {
        vscode.window.showErrorMessage(`Failed to add command: ${e.message}`);
    }
}

async function quickAddFromClipboard() {
    const clipboardText = (await vscode.env.clipboard.readText()).trim();
    if (!clipboardText) {
        vscode.window.showWarningMessage('Clipboard is empty. Copy a command from the terminal first.');
        return;
    }

    await quickAddCommand({
        command: clipboardText,
        placeHolder: 'Select group for the copied terminal command',
    });
}

async function saveTerminalSelection() {
    try {
        await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
    } catch {}

    await quickAddFromClipboard();
}

async function updateStatusBar() {
    if (!statusBarItem) return;
    const mode = vscode.workspace.getConfiguration('commandKeeper').get('storageMode', 'local');

    const modeIcons = { local: '$(database)', 'github-gist': '$(github)' };
    const icon = modeIcons[mode] || '$(terminal)';

    if (mode !== 'local' && !storage.isAuthenticated()) {
        statusBarItem.text = `${icon} CK: Login`;
        statusBarItem.tooltip = 'Command Keeper — click to connect';
        statusBarItem.command = 'command-keeper.login';
    } else {
        const healthy = await storage.checkHealth?.() ?? true;
        if (!healthy) {
            statusBarItem.text = `$(warning) CK: Offline`;
            statusBarItem.tooltip = 'Command Keeper backend unreachable — click to open panel';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            statusBarItem.text = `${icon} Command Keeper`;
            statusBarItem.tooltip = `Command Keeper (${mode}) — click to open`;
            statusBarItem.backgroundColor = undefined;
            statusBarItem.command = 'command-keeper.openPanel';
        }
    }
    statusBarItem.show();
}

function deactivate() {}

module.exports = { activate, deactivate };
