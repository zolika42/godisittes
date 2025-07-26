const fs = require('fs');
const { exec } = require('child_process');
const chokidar = require('chokidar');

const IGNORED_PATHS = [
    /(^|[\/\\])\../,              // hidden files
    /node_modules/,
    /dist/,
    /translations\.min\.js$/,     // csak a minifikált változatot ignoráld!
    /script\.min\.js$/,
    /style\.min\.css$/,
    /sitemap\.xml$/,
    /robots\.txt$/,
    /deploy\.log$/,              // ha ilyet generálsz
];

// Watcher beállítás
const watcher = chokidar.watch('.', {
    ignored: (path) => IGNORED_PATHS.some((regex) => regex.test(path)),
    persistent: true,
});

console.log('👀 Figyeljük a fájlokat...');

let isRunning = false;
let timeout;

watcher.on('change', (filePath) => {
    if (isRunning) return;

    clearTimeout(timeout);
    timeout = setTimeout(() => {
        isRunning = true;
        console.log(`📦 Változás észlelve: ${filePath}`);
        console.log('🚀 Futtatom: deploy.js\n');

        exec('node deploy.js', (err, stdout, stderr) => {
            if (err) {
                console.error(`❌ Hiba:\n${stderr}`);
            } else {
                console.log(`✅ Kész:\n${stdout}`);
            }
            isRunning = false;
        });
    }, 300); // debounce
});
