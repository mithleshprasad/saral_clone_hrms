// Launcher wrapper — `electron .` run from a terminal spawned by an Electron-based parent
// (VS Code's integrated terminal, since VS Code itself is Electron) can inherit
// ELECTRON_RUN_AS_NODE=1 from that parent process. With it set, `require('electron')`
// inside main.js returns just the path string instead of the Electron API, so
// `app.getPath` throws immediately — Electron never actually launches as a GUI app.
// Stripping the variable before spawning electron makes `npm start` work regardless of
// which terminal it's run from.
delete process.env.ELECTRON_RUN_AS_NODE;

const { spawn } = require('child_process');
const electronPath = require('electron');

const child = spawn(electronPath, ['.'], { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
    console.error('Failed to launch Electron:', err.message);
    process.exit(1);
});
