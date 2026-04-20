const vscode = require('vscode');
const { LocalStorage } = require('./local');
const { GistStorage } = require('./gist');

function createStorage(context) {
    const mode = vscode.workspace.getConfiguration('terminalVault').get('storageMode', 'local');
    return mode === 'github-gist' ? new GistStorage(context) : new LocalStorage(context);
}

module.exports = { createStorage, LocalStorage, GistStorage };
