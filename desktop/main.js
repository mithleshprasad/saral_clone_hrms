const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// The desktop app is a thin client: it just opens the same web app (React SPA) that
// talks to the cloud API. No local database, no offline mode — see project decision
// to keep desktop/web on one shared backend. The URL it points at is user-configurable
// so a single installer can be pointed at localhost during dev or a production domain
// after deployment, without rebuilding.
const configPath = path.join(app.getPath('userData'), 'config.json');
const DEFAULT_URL = 'http://localhost:5173';

function loadConfig() {
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
        return { appUrl: DEFAULT_URL };
    }
}

function saveConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

let mainWindow;

function createWindow() {
    const config = loadConfig();

    mainWindow = new BrowserWindow({
        width: 1360,
        height: 860,
        title: 'MpxHR',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.loadURL(config.appUrl);

    const menu = Menu.buildFromTemplate([
        {
            label: 'File',
            submenu: [
                { role: 'reload' },
                { type: 'separator' },
                {
                    label: 'Change Server URL…',
                    click: async () => {
                        const current = loadConfig().appUrl;
                        const result = await promptForUrl(current);
                        if (result) {
                            saveConfig({ appUrl: result });
                            mainWindow.loadURL(result);
                        }
                    },
                },
                { type: 'separator' },
                { role: 'quit' },
            ],
        },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
    ]);
    Menu.setApplicationMenu(menu);
}

// Electron has no built-in text-input dialog; a tiny prompt window keeps this
// dependency-free instead of pulling in a whole prompt library for one field.
function promptForUrl(current) {
    return new Promise((resolve) => {
        const promptWin = new BrowserWindow({
            width: 480,
            height: 180,
            resizable: false,
            minimizable: false,
            maximizable: false,
            parent: mainWindow,
            modal: true,
            // Trusted, fully local inline HTML only (never remote/user content) — safe to
            // relax isolation here for the one ipcRenderer.send() call the prompt needs.
            webPreferences: { contextIsolation: false, nodeIntegration: true },
        });

        const html = `
            <!doctype html><html><body style="font-family: sans-serif; padding: 16px;">
            <p>Web app URL:</p>
            <input id="url" style="width: 100%; padding: 8px; box-sizing: border-box;" value="${current}" />
            <div style="margin-top: 16px; text-align: right;">
                <button id="cancel">Cancel</button>
                <button id="ok">Save</button>
            </div>
            <script>
                const { ipcRenderer } = require('electron');
                document.getElementById('ok').onclick = () => ipcRenderer.send('prompt-url-result', document.getElementById('url').value);
                document.getElementById('cancel').onclick = () => ipcRenderer.send('prompt-url-result', null);
            </script>
            </body></html>
        `;
        promptWin.loadURL('data:text/html,' + encodeURIComponent(html));

        ipcMain.once('prompt-url-result', (event, value) => {
            promptWin.close();
            resolve(value);
        });
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
