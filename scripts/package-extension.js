const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputName = 'chatgptsaver.zip';
const outputPath = path.join(rootDir, outputName);
const packageRoots = [
    'manifest.json',
    'background',
    'content',
    'popup',
    'icons',
    'lib'
];

function collectFiles(relativePath) {
    const absolutePath = path.join(rootDir, relativePath);
    const stats = fs.statSync(absolutePath);

    if (stats.isFile()) {
        return [relativePath];
    }

    return fs.readdirSync(absolutePath)
        .sort()
        .flatMap(child => collectFiles(path.join(relativePath, child)));
}

function buildCrcTable() {
    const table = [];

    for (let i = 0; i < 256; i++) {
        let crc = i;
        for (let j = 0; j < 8; j++) {
            crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
        }
        table[i] = crc >>> 0;
    }

    return table;
}

const crcTable = buildCrcTable();

function crc32(buffer) {
    let crc = 0xffffffff;

    for (const byte of buffer) {
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
    const year = Math.max(date.getFullYear(), 1980);
    const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

    return { dosTime, dosDate };
}

function createZip(files) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    files.forEach(relativePath => {
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const absolutePath = path.join(rootDir, relativePath);
        const data = fs.readFileSync(absolutePath);
        const name = Buffer.from(normalizedPath, 'utf8');
        const stats = fs.statSync(absolutePath);
        const { dosTime, dosDate } = dosDateTime(stats.mtime);
        const crc = crc32(data);

        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0x0800, 6);
        localHeader.writeUInt16LE(0, 8);
        localHeader.writeUInt16LE(dosTime, 10);
        localHeader.writeUInt16LE(dosDate, 12);
        localHeader.writeUInt32LE(crc, 14);
        localHeader.writeUInt32LE(data.length, 18);
        localHeader.writeUInt32LE(data.length, 22);
        localHeader.writeUInt16LE(name.length, 26);
        localHeader.writeUInt16LE(0, 28);

        localParts.push(localHeader, name, data);

        const centralHeader = Buffer.alloc(46);
        centralHeader.writeUInt32LE(0x02014b50, 0);
        centralHeader.writeUInt16LE(20, 4);
        centralHeader.writeUInt16LE(20, 6);
        centralHeader.writeUInt16LE(0x0800, 8);
        centralHeader.writeUInt16LE(0, 10);
        centralHeader.writeUInt16LE(dosTime, 12);
        centralHeader.writeUInt16LE(dosDate, 14);
        centralHeader.writeUInt32LE(crc, 16);
        centralHeader.writeUInt32LE(data.length, 20);
        centralHeader.writeUInt32LE(data.length, 24);
        centralHeader.writeUInt16LE(name.length, 28);
        centralHeader.writeUInt16LE(0, 30);
        centralHeader.writeUInt16LE(0, 32);
        centralHeader.writeUInt16LE(0, 34);
        centralHeader.writeUInt16LE(0, 36);
        centralHeader.writeUInt32LE(0, 38);
        centralHeader.writeUInt32LE(offset, 42);

        centralParts.push(centralHeader, name);
        offset += localHeader.length + name.length + data.length;
    });

    const centralDirectory = Buffer.concat(centralParts);
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0);
    endRecord.writeUInt16LE(0, 4);
    endRecord.writeUInt16LE(0, 6);
    endRecord.writeUInt16LE(files.length, 8);
    endRecord.writeUInt16LE(files.length, 10);
    endRecord.writeUInt32LE(centralDirectory.length, 12);
    endRecord.writeUInt32LE(offset, 16);
    endRecord.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function main() {
    const files = packageRoots
        .flatMap(collectFiles)
        .filter(file => file !== outputName)
        .sort();

    fs.writeFileSync(outputPath, createZip(files));

    console.log(`Created ${outputName} with ${files.length} files.`);
}

main();
