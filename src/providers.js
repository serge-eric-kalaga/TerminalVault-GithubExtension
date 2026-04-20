const vscode = require('vscode');

class GroupItem extends vscode.TreeItem {
    constructor(group) {
        const label = group.icon ? `${group.icon} ${group.name}` : group.name;
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.group = group;
        this.contextValue = 'group';
        this.description = group.description || '';
        this.tooltip = group.description || group.name;
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

class CommandItem extends vscode.TreeItem {
    constructor(cmd) {
        super(cmd.title, vscode.TreeItemCollapsibleState.None);
        this.command_data = cmd;
        this.contextValue = 'command';
        this.description = cmd.command.length > 60 ? cmd.command.slice(0, 60) + '…' : cmd.command;
        this.tooltip = new vscode.MarkdownString(
            `**${cmd.title}**\n\n\`\`\`\n${cmd.command}\n\`\`\`` +
            (cmd.description ? `\n\n${cmd.description}` : '') +
            (cmd.tags?.length ? `\n\nTags: ${cmd.tags.join(', ')}` : '') +
            `\n\nCopied ${cmd.copy_count || 0} times`
        );
        this.iconPath = cmd.is_favorite
            ? new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'))
            : new vscode.ThemeIcon('terminal');
        // Default click = copy
        this.command = {
            command: 'terminal-vault.copyCommand',
            title: 'Copy Command',
            arguments: [this],
        };
    }
}

class CommandsProvider {
    constructor(storage) {
        this._storage = storage;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() { this._onDidChangeTreeData.fire(); }
    getTreeItem(element) { return element; }

    async getChildren(element) {
        if (!this._storage.isAuthenticated()) {
            const item = new vscode.TreeItem('Click here to connect…', vscode.TreeItemCollapsibleState.None);
            item.command = { command: 'terminal-vault.login', title: 'Connect' };
            item.iconPath = new vscode.ThemeIcon('account');
            return [item];
        }

        try {
            if (!element) {
                const groups = await this._storage.getGroups();
                if (groups.length === 0) {
                    const item = new vscode.TreeItem('No groups — open panel to create one', vscode.TreeItemCollapsibleState.None);
                    item.command = { command: 'terminal-vault.openPanel', title: 'Open Panel' };
                    item.iconPath = new vscode.ThemeIcon('info');
                    return [item];
                }
                return groups.map(g => new GroupItem(g));
            }
            if (element.contextValue === 'group') {
                const cmds = await this._storage.getCommands({ group_id: element.group.id });
                if (cmds.length === 0) {
                    const item = new vscode.TreeItem('No commands yet', vscode.TreeItemCollapsibleState.None);
                    item.iconPath = new vscode.ThemeIcon('info');
                    return [item];
                }
                return cmds.map(c => new CommandItem(c));
            }
        } catch (err) {
            const item = new vscode.TreeItem(`Error: ${err.message}`, vscode.TreeItemCollapsibleState.None);
            item.iconPath = new vscode.ThemeIcon('error');
            return [item];
        }
        return [];
    }
}

class FavoritesProvider {
    constructor(storage) {
        this._storage = storage;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() { this._onDidChangeTreeData.fire(); }
    getTreeItem(element) { return element; }

    async getChildren() {
        if (!this._storage.isAuthenticated()) return [];
        try {
            const result = await this._storage.getCommandsPaged({ is_favorite: true, limit: 50 });
            const cmds = result.items || result;
            if (cmds.length === 0) {
                const item = new vscode.TreeItem('No favorites yet', vscode.TreeItemCollapsibleState.None);
                item.iconPath = new vscode.ThemeIcon('star');
                return [item];
            }
            return cmds.map(c => new CommandItem(c));
        } catch { return []; }
    }
}

module.exports = { CommandsProvider, FavoritesProvider, CommandItem, GroupItem };
