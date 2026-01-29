const https = require('https');
const http = require('http');
const fs = require('fs');

// Symbola font mirrors (supports most emoji as black symbols)
const urls = [
    'https://github.com/nicehorse06/noto-emoji/raw/main/fonts/NotoEmoji-Regular.ttf',
    'https://cdn.jsdelivr.net/npm/@aspect-dev/noto-emoji-font@1.0.0/NotoEmoji-Regular.ttf'
];

function downloadWithRedirects(url, destPath, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000
        }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                if (maxRedirects === 0) {
                    reject(new Error('Too many redirects'));
                    return;
                }
                console.log('Redirecting to:', response.headers.location);
                downloadWithRedirects(response.headers.location, destPath, maxRedirects - 1)
                    .then(resolve)
                    .catch(reject);
            } else if (response.statusCode === 200) {
                const file = fs.createWriteStream(destPath);
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    const stats = fs.statSync(destPath);
                    if (stats.size < 1000) {
                        reject(new Error('File too small, likely not a font'));
                    } else {
                        resolve(stats.size);
                    }
                });
            } else {
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', reject);
    });
}

async function main() {
    const dest = './lib/NotoEmoji-Regular.ttf';

    for (const url of urls) {
        console.log('Trying:', url);
        try {
            const size = await downloadWithRedirects(url, dest);
            console.log('Success! Downloaded', (size / 1024).toFixed(1), 'KB');
            return;
        } catch (err) {
            console.log('Failed:', err.message);
        }
    }

    console.log('All sources failed. Using text fallback.');
}

main();
