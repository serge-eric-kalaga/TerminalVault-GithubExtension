const vscode = require('vscode');

function cmdToItem(cmd) {
    const tags = cmd.tags || [];
    return {
        label: `${cmd.is_favorite ? '$(star-full) ' : '$(terminal) '}${cmd.title}`,
        description: cmd.command.length > 90 ? cmd.command.slice(0, 90) + '…' : cmd.command,
        detail: `Copied ${cmd.copy_count || 0}×${tags.length ? '  •  ' + tags.join(', ') : ''}`,
        _cmd: cmd,
    };
}

function extractVariables(commandText) {
    const varRegex = /\{\{(\w+)\}\}/g;
    const vars = [];
    let m;
    while ((m = varRegex.exec(commandText)) !== null) {
        if (!vars.includes(m[1])) vars.push(m[1]);
    }
    return vars;
}

async function resolveVariables(commandText, defaults = {}, options = {}) {
    const vars = extractVariables(commandText);
    if (vars.length === 0) return commandText;

    if (options.allowRawCopy) {
        const mode = await vscode.window.showQuickPick([
            { label: 'Fill variables and continue', value: 'fill' },
            { label: 'Copy template as-is', value: 'raw' },
        ], {
            placeHolder: 'This command contains variables',
        });
        if (!mode) return null;
        if (mode.value === 'raw') return commandText;
    }

    const resolved = {};
    for (const name of vars) {
        const val = await vscode.window.showInputBox({
            prompt: `Value for {{${name}}}`,
            value: defaults[name] || '',
            placeHolder: defaults[name] || name,
        });
        if (val === undefined) return null;
        resolved[name] = val;
    }
    let result = commandText;
    for (const [k, v] of Object.entries(resolved)) {
        result = result.replaceAll(`{{${k}}}`, v);
    }
    return result;
}

async function showCommandPalette(storage) {
    if (!storage.isAuthenticated()) {
        const choice = await vscode.window.showWarningMessage('Command Keeper: Not connected', 'Connect');
        if (choice === 'Connect') vscode.commands.executeCommand('command-keeper.login');
        return;
    }

    const qp = vscode.window.createQuickPick();
    qp.placeholder = 'Search commands… (type to filter, tag:name, fav:true)';
    qp.matchOnDescription = true;
    qp.matchOnDetail = true;

    const loadTop = async () => {
        qp.busy = true;
        try {
            const top = await storage.getTopCopied(25);
            qp.items = top.map(cmdToItem);
        } catch { qp.items = []; }
        qp.busy = false;
    };

    await loadTop();

    let timer;
    qp.onDidChangeValue(value => {
        clearTimeout(timer);
        if (!value.trim()) { loadTop(); return; }
        timer = setTimeout(async () => {
            qp.busy = true;
            try {
                const result = await storage.search(value, { limit: 30 });
                const cmds = result.items || result.commands || result;
                qp.items = cmds.map(cmdToItem);
            } catch { qp.items = []; }
            qp.busy = false;
        }, 300);
    });

    qp.onDidAccept(async () => {
        const sel = qp.selectedItems[0];
        if (!sel) return;
        qp.hide();
        await executeCommand(sel._cmd, storage);
    });

    qp.show();
}

async function executeCommand(cmd, storage) {
    const action = await vscode.window.showQuickPick([
        { label: '$(copy) Copy to clipboard', value: 'copy' },
        { label: '$(terminal-bash) Run in terminal', value: 'terminal' },
        { label: '$(insert) Insert at cursor', value: 'insert' },
    ], { placeHolder: cmd.title });

    if (!action) return;

    let text = cmd.command;
    if (text.includes('{{')) {
        text = await resolveVariables(text, cmd.default_variables || {}, {
            allowRawCopy: action.value === 'copy',
        });
        if (text === null) return;
    }

    try { await storage.incrementCopy(cmd.id, cmd.copy_count || 0); } catch {}

    if (action.value === 'copy') {
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage(`Copied: ${cmd.title}`);
    } else if (action.value === 'terminal') {
        const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('Command Keeper');
        terminal.show();
        terminal.sendText(text);
    } else if (action.value === 'insert') {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await editor.edit(eb => eb.insert(editor.selection.active, text));
        } else {
            vscode.window.showWarningMessage('No active text editor');
        }
    }
}

module.exports = { showCommandPalette, resolveVariables, executeCommand, extractVariables };
