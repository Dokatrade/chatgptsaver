const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

function exists(relativePath) {
    return fs.existsSync(path.join(rootDir, relativePath));
}

function fail(message) {
    throw new Error(message);
}

function checkRequiredFiles(files) {
    files.forEach(file => {
        if (!exists(file)) {
            fail(`Missing required file: ${file}`);
        }
    });
}

function checkManifest(manifest, packageJson) {
    if (manifest.manifest_version !== 3) {
        fail('manifest.json must use Manifest V3.');
    }

    if (manifest.version !== packageJson.version) {
        fail(`Version mismatch: manifest.json has ${manifest.version}, package.json has ${packageJson.version}.`);
    }

    const requiredPermissions = ['activeTab', 'downloads', 'scripting'];
    requiredPermissions.forEach(permission => {
        if (!manifest.permissions.includes(permission)) {
            fail(`Missing manifest permission: ${permission}`);
        }
    });

    const requiredHosts = ['https://chatgpt.com/*', 'https://chat.openai.com/*'];
    requiredHosts.forEach(host => {
        if (!manifest.host_permissions.includes(host)) {
            fail(`Missing host permission: ${host}`);
        }
    });
}

function checkPopupLibraries() {
    const popupHtml = fs.readFileSync(path.join(rootDir, 'popup/popup.html'), 'utf8');
    const scriptMatches = Array.from(popupHtml.matchAll(/<script\s+src="([^"]+)"/g));

    scriptMatches.forEach(match => {
        const scriptPath = path.normalize(path.join('popup', match[1]));
        if (!exists(scriptPath)) {
            fail(`Missing popup script dependency: ${match[1]}`);
        }
    });

    ['txt', 'md', 'pdf', 'epub'].forEach(format => {
        if (!popupHtml.includes(`value="${format}"`)) {
            fail(`Missing popup export format: ${format}`);
        }
    });
}

function checkPopupDownloads() {
    const popupJs = fs.readFileSync(path.join(rootDir, 'popup/popup.js'), 'utf8');

    if (!popupJs.includes('text/markdown;charset=utf-8')) {
        fail('Markdown downloads must use the text/markdown MIME type.');
    }
}

function checkContentScripts(manifest) {
    manifest.content_scripts.forEach(contentScript => {
        contentScript.js.forEach(scriptPath => {
            if (!exists(scriptPath)) {
                fail(`Missing content script dependency: ${scriptPath}`);
            }
        });
    });
}

function main() {
    const packageJson = readJson('package.json');
    const manifest = readJson('manifest.json');

    checkRequiredFiles([
        'manifest.json',
        'background/background.js',
        'content/extractor.js',
        'content/content.js',
        'popup/popup.html',
        'popup/popup.css',
        'popup/popup.js',
        'icons/icon16.png',
        'icons/icon48.png',
        'icons/icon128.png',
        'lib/pdfmake.min.js',
        'lib/vfs_fonts_custom.js'
    ]);

    checkManifest(manifest, packageJson);
    checkPopupLibraries();
    checkPopupDownloads();
    checkContentScripts(manifest);

    console.log('Project checks passed.');
}

try {
    main();
} catch (error) {
    console.error(`Project checks failed: ${error.message}`);
    process.exit(1);
}
