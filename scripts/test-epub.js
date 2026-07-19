const assert = require('assert');
const epub = require('../popup/epub');

const decoder = new TextDecoder();

function readUInt16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUInt32(bytes, offset) {
    return (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)) >>> 0;
}

function parseLocalFiles(bytes) {
    const files = [];
    let offset = 0;

    while (readUInt32(bytes, offset) === 0x04034b50) {
        const compression = readUInt16(bytes, offset + 8);
        const compressedSize = readUInt32(bytes, offset + 18);
        const nameLength = readUInt16(bytes, offset + 26);
        const extraLength = readUInt16(bytes, offset + 28);
        const nameStart = offset + 30;
        const dataStart = nameStart + nameLength + extraLength;
        const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
        const data = bytes.slice(dataStart, dataStart + compressedSize);

        files.push({
            name,
            compression,
            data: decoder.decode(data)
        });

        offset = dataStart + compressedSize;
    }

    return files;
}

function testEpubContainerStructure() {
    const bytes = epub.createEpubUint8Array([
        {
            role: 'user',
            content: 'Please export **bold** text and [docs](https://example.com/docs).'
        },
        {
            role: 'assistant',
            content: '```js\nconst value = 1 < 2;\n```\n- item'
        }
    ], {
        title: 'Fixture Chat',
        createdAt: new Date('2026-06-26T10:00:00Z'),
        identifier: 'urn:uuid:test-fixture'
    });

    const files = parseLocalFiles(bytes);
    const fileByName = new Map(files.map(file => [file.name, file]));

    assert.strictEqual(files[0].name, 'mimetype');
    assert.strictEqual(files[0].compression, 0);
    assert.strictEqual(files[0].data, 'application/epub+zip');

    [
        'META-INF/container.xml',
        'OEBPS/content.opf',
        'OEBPS/nav.xhtml',
        'OEBPS/chat.xhtml',
        'OEBPS/styles.css'
    ].forEach(name => {
        assert.ok(fileByName.has(name), `Missing EPUB file: ${name}`);
        assert.strictEqual(fileByName.get(name).compression, 0);
    });

    assert.match(fileByName.get('META-INF/container.xml').data, /OEBPS\/content\.opf/);
    assert.match(fileByName.get('OEBPS/content.opf').data, /version="3\.0"/);
    assert.match(fileByName.get('OEBPS/content.opf').data, /urn:uuid:test-fixture/);
    assert.match(fileByName.get('OEBPS/nav.xhtml').data, /epub:type="toc"/);
    assert.match(fileByName.get('OEBPS/chat.xhtml').data, /<strong>bold<\/strong>/);
    assert.match(fileByName.get('OEBPS/chat.xhtml').data, /href="https:\/\/example\.com\/docs"/);
    assert.match(fileByName.get('OEBPS/chat.xhtml').data, /const value = 1 &lt; 2;/);
    assert.match(fileByName.get('OEBPS/chat.xhtml').data, /<li>item<\/li>/);
}

function run() {
    testEpubContainerStructure();

    console.log('EPUB fixture tests passed.');
}

try {
    run();
} catch (error) {
    console.error(`EPUB fixture tests failed: ${error.message}`);
    process.exit(1);
}
