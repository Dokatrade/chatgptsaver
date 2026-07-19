(function (root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.ChatGPTContextSaverEpub = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    const encoder = new TextEncoder();
    const crcTable = buildCrcTable();

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

    function crc32(bytes) {
        let crc = 0xffffffff;

        for (const byte of bytes) {
            crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
        }

        return (crc ^ 0xffffffff) >>> 0;
    }

    function concatBytes(parts) {
        const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;

        parts.forEach(part => {
            result.set(part, offset);
            offset += part.length;
        });

        return result;
    }

    function stringToBytes(value) {
        return encoder.encode(value);
    }

    function writeUint16(view, offset, value) {
        view.setUint16(offset, value, true);
    }

    function writeUint32(view, offset, value) {
        view.setUint32(offset, value >>> 0, true);
    }

    function dosDateTime(date) {
        const year = Math.max(date.getFullYear(), 1980);
        const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
        const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

        return { dosTime, dosDate };
    }

    function createZip(files, modifiedAt) {
        const localParts = [];
        const centralParts = [];
        const { dosTime, dosDate } = dosDateTime(modifiedAt || new Date());
        let offset = 0;

        files.forEach(file => {
            const name = stringToBytes(file.path);
            const data = typeof file.content === 'string' ? stringToBytes(file.content) : file.content;
            const crc = crc32(data);

            const localHeader = new Uint8Array(30);
            const localView = new DataView(localHeader.buffer);
            writeUint32(localView, 0, 0x04034b50);
            writeUint16(localView, 4, 20);
            writeUint16(localView, 6, 0x0800);
            writeUint16(localView, 8, 0);
            writeUint16(localView, 10, dosTime);
            writeUint16(localView, 12, dosDate);
            writeUint32(localView, 14, crc);
            writeUint32(localView, 18, data.length);
            writeUint32(localView, 22, data.length);
            writeUint16(localView, 26, name.length);
            writeUint16(localView, 28, 0);

            localParts.push(localHeader, name, data);

            const centralHeader = new Uint8Array(46);
            const centralView = new DataView(centralHeader.buffer);
            writeUint32(centralView, 0, 0x02014b50);
            writeUint16(centralView, 4, 20);
            writeUint16(centralView, 6, 20);
            writeUint16(centralView, 8, 0x0800);
            writeUint16(centralView, 10, 0);
            writeUint16(centralView, 12, dosTime);
            writeUint16(centralView, 14, dosDate);
            writeUint32(centralView, 16, crc);
            writeUint32(centralView, 20, data.length);
            writeUint32(centralView, 24, data.length);
            writeUint16(centralView, 28, name.length);
            writeUint16(centralView, 30, 0);
            writeUint16(centralView, 32, 0);
            writeUint16(centralView, 34, 0);
            writeUint16(centralView, 36, 0);
            writeUint32(centralView, 38, 0);
            writeUint32(centralView, 42, offset);

            centralParts.push(centralHeader, name);
            offset += localHeader.length + name.length + data.length;
        });

        const centralDirectory = concatBytes(centralParts);
        const endRecord = new Uint8Array(22);
        const endView = new DataView(endRecord.buffer);
        writeUint32(endView, 0, 0x06054b50);
        writeUint16(endView, 4, 0);
        writeUint16(endView, 6, 0);
        writeUint16(endView, 8, files.length);
        writeUint16(endView, 10, files.length);
        writeUint32(endView, 12, centralDirectory.length);
        writeUint32(endView, 16, offset);
        writeUint16(endView, 20, 0);

        return concatBytes([...localParts, centralDirectory, endRecord]);
    }

    function escapeXml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function escapeAttr(text) {
        return escapeXml(text).replace(/"/g, '&quot;');
    }

    function sanitizeUrl(url) {
        const value = String(url || '').trim();

        if (/^(https?:|mailto:)/i.test(value)) {
            return value;
        }

        return '#';
    }

    function inlineMarkdownToXhtml(text) {
        const markdownRegex = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
        let result = '';
        let lastIndex = 0;
        let match;

        while ((match = markdownRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                result += escapeXml(text.slice(lastIndex, match.index));
            }

            if (match[1]) {
                result += `<a href="${escapeAttr(sanitizeUrl(match[3]))}">${escapeXml(match[2])}</a>`;
            } else if (match[4]) {
                result += `<strong>${escapeXml(match[5])}</strong>`;
            } else if (match[6]) {
                result += `<em>${escapeXml(match[7])}</em>`;
            } else if (match[8]) {
                result += `<code>${escapeXml(match[9])}</code>`;
            }

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            result += escapeXml(text.slice(lastIndex));
        }

        return result;
    }

    function closeList(activeList) {
        return activeList ? `</${activeList}>` : '';
    }

    function markdownTextToXhtml(text) {
        const blocks = [];
        const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                blocks.push(markdownLinesToXhtml(text.slice(lastIndex, match.index)));
            }

            const language = match[1] ? ` data-language="${escapeAttr(match[1])}"` : '';
            blocks.push(`<pre><code${language}>${escapeXml(match[2].trim())}</code></pre>`);
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            blocks.push(markdownLinesToXhtml(text.slice(lastIndex)));
        }

        return blocks.filter(Boolean).join('\n');
    }

    function markdownLinesToXhtml(text) {
        const lines = text.split('\n');
        const result = [];
        let activeList = null;

        lines.forEach(line => {
            const trimmed = line.trim();

            if (!trimmed) {
                result.push(closeList(activeList));
                activeList = null;
                return;
            }

            const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
            const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
            const unorderedMatch = trimmed.match(/^(?:[-*+]|[○•])\s+(.+)$/);

            if (headingMatch) {
                result.push(closeList(activeList));
                activeList = null;
                const level = Math.min(headingMatch[1].length + 2, 6);
                result.push(`<h${level}>${inlineMarkdownToXhtml(headingMatch[2])}</h${level}>`);
            } else if (orderedMatch || unorderedMatch) {
                const listType = orderedMatch ? 'ol' : 'ul';
                const itemText = orderedMatch ? orderedMatch[1] : unorderedMatch[1];

                if (activeList !== listType) {
                    result.push(closeList(activeList));
                    result.push(`<${listType}>`);
                    activeList = listType;
                }

                result.push(`<li>${inlineMarkdownToXhtml(itemText)}</li>`);
            } else {
                result.push(closeList(activeList));
                activeList = null;
                result.push(`<p>${inlineMarkdownToXhtml(trimmed)}</p>`);
            }
        });

        result.push(closeList(activeList));

        return result.filter(Boolean).join('\n');
    }

    function buildChatXhtml(messages, metadata) {
        const title = metadata.title || 'Chat Context Export';
        const dateLabel = metadata.createdAt.toISOString().replace('T', ' ').slice(0, 19);

        const messageHtml = messages.map((message, index) => {
            const isUser = message.role === 'user';
            const role = isUser ? 'User' : 'Assistant';
            const className = isUser ? 'user' : 'assistant';

            return [
                `<article id="message-${index + 1}" class="message ${className}">`,
                `<h2>${role}</h2>`,
                markdownTextToXhtml(message.content || ''),
                '</article>'
            ].join('\n');
        }).join('\n');

        return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body>
  <section epub:type="titlepage">
    <h1>${escapeXml(title)}</h1>
    <p class="meta">Exported ${escapeXml(dateLabel)} UTC · ${messages.length} messages · Source: ChatGPT</p>
  </section>
  <section>
    ${messageHtml}
  </section>
</body>
</html>
`;
    }

    function buildNavXhtml(metadata) {
        const title = metadata.title || 'Chat Context Export';

        return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <title>Contents</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${escapeXml(title)}</h1>
    <ol>
      <li><a href="chat.xhtml">Conversation</a></li>
    </ol>
  </nav>
</body>
</html>
`;
    }

    function buildContentOpf(metadata) {
        const title = metadata.title || 'Chat Context Export';
        const modified = metadata.createdAt.toISOString().replace(/\.\d{3}Z$/, 'Z');

        return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${escapeXml(metadata.identifier)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>ChatGPT Context Saver</dc:creator>
    <meta property="dcterms:modified">${escapeXml(modified)}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="chat" href="chat.xhtml" media-type="application/xhtml+xml" />
    <item id="styles" href="styles.css" media-type="text/css" />
  </manifest>
  <spine>
    <itemref idref="chat" />
  </spine>
</package>
`;
    }

    function buildStylesCss() {
        return `body {
    color: #202124;
    font-family: serif;
    line-height: 1.45;
    margin: 0;
}

h1,
h2,
h3,
h4,
h5,
h6 {
    line-height: 1.2;
}

.meta {
    color: #5f6368;
    font-size: 0.9em;
}

.message {
    border-top: 1px solid #dfe1e5;
    margin-top: 1.25em;
    padding-top: 1em;
}

.message h2 {
    font-size: 1.1em;
    margin-bottom: 0.5em;
}

.user h2 {
    color: #0b57d0;
}

.assistant h2 {
    color: #0f7b5f;
}

pre {
    background: #f1f3f4;
    border: 1px solid #dfe1e5;
    overflow-wrap: break-word;
    padding: 0.75em;
    white-space: pre-wrap;
}

code {
    font-family: monospace;
}
`;
    }

    function buildContainerXml() {
        return `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>
`;
    }

    function normalizeMetadata(options) {
        const createdAt = options.createdAt || new Date();
        const identifier = options.identifier || `urn:uuid:${createIdentifier()}`;

        return {
            title: options.title || 'Chat Context Export',
            createdAt: createdAt,
            identifier: identifier
        };
    }

    function createIdentifier() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }

        return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
    }

    function buildEpubFiles(messages, options = {}) {
        const metadata = normalizeMetadata(options);

        return [
            { path: 'mimetype', content: 'application/epub+zip' },
            { path: 'META-INF/container.xml', content: buildContainerXml() },
            { path: 'OEBPS/content.opf', content: buildContentOpf(metadata) },
            { path: 'OEBPS/nav.xhtml', content: buildNavXhtml(metadata) },
            { path: 'OEBPS/chat.xhtml', content: buildChatXhtml(messages, metadata) },
            { path: 'OEBPS/styles.css', content: buildStylesCss() }
        ];
    }

    function createEpubUint8Array(messages, options = {}) {
        const metadata = normalizeMetadata(options);
        const files = buildEpubFiles(messages, metadata);

        return createZip(files, metadata.createdAt);
    }

    function createEpubBlob(messages, options = {}) {
        const bytes = createEpubUint8Array(messages, options);

        return new Blob([bytes], { type: 'application/epub+zip' });
    }

    return {
        buildEpubFiles,
        createEpubBlob,
        createEpubUint8Array
    };
});
