
const { app, BrowserWindow, ipcMain, Tray, Menu, Notification } = require('electron');
const path = require('path');
const logger = require('./logger');
const dbManager = require('../database/db');
const { setupIPC, performAutoBackup } = require('./ipcHandlers');

logger.init(app.getPath('userData'));

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.exit(0);
}

let mainWindow;
let tray;

function createWindow() {
    console.log("Creating Main Window...");
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        frame: false,
        show: true, // Force show immediately
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../../assets/icon.png')
    });

    console.log("Loading URL: " + path.join(__dirname, '../renderer/index.html'));
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Open DevTools only in specific dev environments, but definitely not in production build
    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
        console.log("Window created and DevTools opened.");
    }

    // Window Controls IPC
    ipcMain.handle('minimize-window', () => mainWindow.minimize());
    ipcMain.handle('maximize-window', () => {
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
    });
    ipcMain.handle('close-window', () => mainWindow.close());

    // --- System Tray ---
    const iconPath = path.join(__dirname, '../../assets/icon.png'); // Ensure this exists or use default
    // If no icon, Tray might fail. Let's wrap safely.
    try {
        tray = new Tray(iconPath); // In prod, use proper ico/png
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Show App', click: () => mainWindow.show() },
            { type: 'separator' },
            { label: 'Quit', click: () => app.quit() }
        ]);
        tray.setToolTip('MpxHR Desktop');
        tray.setContextMenu(contextMenu);
        tray.on('double-click', () => mainWindow.show());
    } catch (e) { console.log("Tray icon not found/failed", e); }

    // --- Startup Notifications ---
    checkStartupNotifications();
}

async function checkStartupNotifications() {
    // Wait for DB init
    await new Promise(r => setTimeout(r, 2000));

    try {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        // Check Settings
        const settings = await dbManager.all("SELECT * FROM settings");
        const getSet = (k) => {
            const row = settings.find(s => s.key === k);
            return row ? row.value === 'true' : false; // Default false to be safe, or true?
        };

        // Check Birthdays
        if (getSet('notify_birthdays')) {
            const bdays = await dbManager.all("SELECT first_name, last_name FROM employees WHERE strftime('%m', dob) = ? AND strftime('%d', dob) = ?", [month, day]);
            if (bdays.length > 0) {
                new Notification({
                    title: "Happy Birthday!",
                    body: "Today is the birthday of: " + bdays.map(e => e.first_name).join(", "),
                    icon: path.join(__dirname, '../../assets/icon.png')
                }).show();
            }
        }

        // Check Anniversaries
        if (getSet('notify_anniversaries')) {
            const workBdays = await dbManager.all("SELECT first_name, last_name FROM employees WHERE strftime('%m', date_of_joining) = ? AND strftime('%d', date_of_joining) = ?", [month, day]);
            if (workBdays.length > 0) {
                new Notification({
                    title: "Work Anniversary!",
                    body: "Celebrating work anniversary for: " + workBdays.map(e => e.first_name).join(", "),
                    icon: path.join(__dirname, '../../assets/icon.png')
                }).show();
            }
        }

    } catch (e) {
        console.error("Notification Check Failed", e);
    }
}

app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
});

app.whenReady().then(() => {
    dbManager.connect(); // Ensure DB is connected
    setupIPC();
    createWindow();

    app.on('activate', () => {
    });

});


app.on('will-quit', async (e) => {
    e.preventDefault();
    console.log("App quitting... checking for auto-backup.");
    await performAutoBackup();
    app.exit(0);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Utility IPC
ipcMain.handle('get-app-version', () => app.getVersion());
