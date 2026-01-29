document.addEventListener('DOMContentLoaded', async () => {
    const saveBtn = document.getElementById('saveBtn');
    const filenameInput = document.getElementById('filename');
    const formatSelect = document.getElementById('format');
    const status = document.getElementById('status');

    // Try to get the chat title and set it as the default filename
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.url && (tab.url.includes('chatgpt.com') || tab.url.includes('chat.openai.com'))) {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getChatTitle' });
            if (response && response.title) {
                filenameInput.value = response.title;
            }
        }
    } catch (error) {
        console.log('Could not get chat title:', error);
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
    }

    function hideStatus() {
        status.className = 'status hidden';
    }

    function formatContent(messages, format) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];

        let content = '';

        if (format === 'md' || format === 'txt') {
            content += `# Chat Context Export\n\n`;
            content += `**Date:** ${dateStr} ${timeStr}  \n`;
            content += `**Messages:** ${messages.length}  \n`;
            content += `**Source:** ChatGPT\n\n---\n\n`;

            messages.forEach((msg, index) => {
                const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
                content += `## ${role}\n\n`;
                content += `${msg.content}\n\n`;
                if (index < messages.length - 1) {
                    content += `---\n\n`;
                }
            });
        }

        return content;
    }

    async function downloadAsText(content, filename, extension) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        await chrome.downloads.download({
            url: url,
            filename: `${filename}.${extension}`,
            saveAs: true
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Emoji and special symbols regex pattern (excluding arrows - Roboto supports them)
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1FA00}-\u{1FAFF}]|[\u{2300}-\u{23FF}]|[\u{2B00}-\u{2BFF}]|[\u{2B50}]|[\u{2B55}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]/gu;

    // Parse text with markdown formatting into pdfmake content array
    // Returns an array that can include both text segments and table-based code blocks
    function textToSegments(text, baseStyle = {}) {
        const result = [];

        // First, split by code blocks (```...```)
        const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            // Process text before code block
            if (match.index > lastIndex) {
                const beforeText = text.slice(lastIndex, match.index);
                const segments = parseTextLines(beforeText, baseStyle);
                if (segments.length > 0) {
                    result.push({ text: segments });
                }
            }

            // Create code block with border
            const language = match[1] || '';
            const codeContent = match[2].trim();

            result.push({
                table: {
                    widths: ['*'],
                    body: [[
                        {
                            stack: [
                                language ? { text: language, fontSize: 9, color: '#666666', margin: [0, 0, 0, 4] } : null,
                                { text: codeContent, font: 'Roboto', fontSize: 10, color: '#333333', preserveLeadingSpaces: true }
                            ].filter(Boolean),
                            fillColor: '#f5f5f5',
                            margin: [10, 8, 10, 8]
                        }
                    ]]
                },
                layout: {
                    hLineWidth: () => 1,
                    vLineWidth: () => 1,
                    hLineColor: () => '#dddddd',
                    vLineColor: () => '#dddddd',
                    paddingLeft: () => 0,
                    paddingRight: () => 0,
                    paddingTop: () => 0,
                    paddingBottom: () => 0
                },
                margin: [0, 5, 0, 10]
            });

            lastIndex = match.index + match[0].length;
        }

        // Process remaining text after last code block
        if (lastIndex < text.length) {
            const remainingText = text.slice(lastIndex);
            const segments = parseTextLines(remainingText, baseStyle);
            if (segments.length > 0) {
                result.push({ text: segments });
            }
        }

        // If no code blocks were found, return the original format
        if (result.length === 0) {
            const segments = parseTextLines(text, baseStyle);
            return segments.length > 0 ? segments : { text: text, font: 'Roboto', ...baseStyle };
        }

        return result;
    }

    // Helper function to parse text lines (headings, paragraphs, inline markdown)
    function parseTextLines(text, baseStyle) {
        const segments = [];
        const lines = text.split('\n');

        lines.forEach((line, lineIndex) => {
            // Check for headings: # ## ### ####
            const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);

            if (headingMatch) {
                const level = headingMatch[1].length;
                const headingText = headingMatch[2];
                const headingSizes = { 1: 18, 2: 16, 3: 14, 4: 12 };
                const fontSize = headingSizes[level] || 14;

                segments.push(...parseEmojisInText(headingText, {
                    ...baseStyle,
                    bold: true,
                    fontSize: fontSize,
                    lineHeight: 1
                }));
                segments.push({ text: '\n', font: 'Roboto', fontSize: 4 });
            } else if (line.trim() === '') {
                // Empty line = paragraph break, add extra spacing
                segments.push({ text: '\n', font: 'Roboto', fontSize: 8 });
            } else {
                // Check if line ends with a source citation (ChatGPT style badge at end of sentence)
                // Pattern 1: sentence ends with period/closing bracket, then 1-5 capitalized words at end
                // Pattern 2: line contains URL followed by source name
                // Require at least 20 chars before the source to avoid matching short items
                const sourceCitationRegex = /^(.{20,}[.\)\]])(\s+)([A-ZА-ЯЁ][a-zA-Zа-яёА-ЯЁ]*(?:\s+[A-ZА-ЯЁa-zа-яё][a-zA-Zа-яёА-ЯЁ]*){0,4})\s*$/;
                // Alternative pattern for URLs: text with URL at end, followed by source
                const urlCitationRegex = /^(.+https?:\/\/[^\s]+)(\s+)([A-ZА-ЯЁ][a-zA-Zа-яёА-ЯЁ]*(?:\s+[A-ZА-ЯЁa-zа-яё][a-zA-Zа-яёА-ЯЁ]*){0,4})\s*$/;

                let citationMatch = line.match(sourceCitationRegex) || line.match(urlCitationRegex);

                let lineToProcess = line;
                let citationSource = null;

                if (citationMatch) {
                    lineToProcess = citationMatch[1];
                    citationSource = citationMatch[3];
                }

                // Parse inline markdown: **bold**, *italic*, `code`
                const markdownRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;

                let lastIndex = 0;
                let match;

                while ((match = markdownRegex.exec(lineToProcess)) !== null) {
                    if (match.index > lastIndex) {
                        const plainText = lineToProcess.slice(lastIndex, match.index);
                        segments.push(...parseEmojisInText(plainText, baseStyle));
                    }

                    if (match[1]) {
                        // Bold: **text**
                        segments.push(...parseEmojisInText(match[2], { ...baseStyle, bold: true }));
                    } else if (match[3]) {
                        // Italic: *text*
                        segments.push(...parseEmojisInText(match[4], { ...baseStyle, italics: true }));
                    } else if (match[5]) {
                        // Inline code: `text`
                        segments.push({
                            text: match[6],
                            font: 'Roboto',
                            ...baseStyle,
                            background: '#e8e8e8',
                            fontSize: (baseStyle.fontSize || 11) - 1
                        });
                    }

                    lastIndex = match.index + match[0].length;
                }

                // Add remaining text from line
                if (lastIndex < lineToProcess.length) {
                    segments.push(...parseEmojisInText(lineToProcess.slice(lastIndex), baseStyle));
                }

                // Add citation badge at the end if present
                if (citationSource) {
                    segments.push({
                        text: '  ',
                        font: 'Roboto'
                    });
                    // Link emoji
                    segments.push({
                        text: '🔗',
                        font: 'NotoEmoji',
                        fontSize: 9
                    });
                    // Source name
                    segments.push({
                        text: citationSource,
                        font: 'Roboto',
                        italics: true,
                        fontSize: 9
                    });
                }

                // Add newline if not last line
                if (lineIndex < lines.length - 1) {
                    segments.push({ text: '\n', font: 'Roboto' });
                }
            }
        });

        return segments;
    }

    // Helper: parse emojis in a text segment and return array of segments
    function parseEmojisInText(text, style) {
        const segments = [];
        let lastIndex = 0;
        let match;

        emojiRegex.lastIndex = 0;

        while ((match = emojiRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                segments.push({ text: text.slice(lastIndex, match.index), font: 'Roboto', ...style });
            }
            segments.push({ text: match[0], font: 'NotoEmoji', ...style });
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            segments.push({ text: text.slice(lastIndex), font: 'Roboto', ...style });
        }

        if (segments.length === 0 && text) {
            segments.push({ text: text, font: 'Roboto', ...style });
        }

        return segments;
    }

    // Create role label with emoji
    function createRoleLabel(isUser, roleColor) {
        const emoji = isUser ? '👤' : '🤖';
        const label = isUser ? ' Пользователь' : ' Ассистент';
        return [
            { text: emoji, font: 'NotoEmoji', fontSize: 12, bold: true, color: roleColor },
            { text: label, font: 'Roboto', fontSize: 12, bold: true, color: roleColor }
        ];
    }

    async function downloadAsPDF(messages, filename) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];

        // Build PDF document definition
        const content = [];

        // Header
        content.push({
            text: 'Chat Context Export',
            style: 'header',
            margin: [0, 0, 0, 10]
        });

        // Metadata
        content.push({
            text: `Дата: ${dateStr} ${timeStr}  |  Сообщений: ${messages.length}  |  Источник: ChatGPT`,
            style: 'meta',
            margin: [0, 0, 0, 15]
        });

        // Separator
        content.push({
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#cccccc' }],
            margin: [0, 0, 0, 15]
        });

        // Messages
        messages.forEach((msg, index) => {
            const isUser = msg.role === 'user';
            const roleColor = isUser ? '#0066cc' : '#10a37f';
            const bgColor = isUser ? '#f0f7ff' : '#f0fff7';

            // Message block with colored background
            const messageContent = textToSegments(msg.content, { fontSize: 11, lineHeight: 1.4, color: '#333333' });

            // Build stack with role label and message content
            const stackItems = [
                { text: createRoleLabel(isUser, roleColor), margin: [0, 0, 0, 8] }
            ];

            // Add message content - can be array of elements or single text element
            if (Array.isArray(messageContent)) {
                stackItems.push(...messageContent);
            } else {
                stackItems.push({ text: messageContent });
            }

            content.push({
                table: {
                    widths: ['*'],
                    body: [[
                        {
                            stack: stackItems,
                            fillColor: bgColor,
                            margin: [10, 10, 10, 10]
                        }
                    ]]
                },
                layout: {
                    hLineWidth: () => 0,
                    vLineWidth: () => 0,
                    paddingLeft: () => 0,
                    paddingRight: () => 0,
                    paddingTop: () => 0,
                    paddingBottom: () => 0
                },
                margin: [0, 0, 0, 15]
            });

            // Separator between messages
            if (index < messages.length - 1) {
                content.push({
                    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#eeeeee' }],
                    margin: [0, 0, 0, 15]
                });
            }
        });

        // Document definition
        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 40],
            content: content,
            styles: {
                header: {
                    fontSize: 22,
                    bold: true,
                    color: '#333333'
                },
                meta: {
                    fontSize: 10,
                    color: '#666666'
                },
                role: {
                    fontSize: 12,
                    bold: true
                },
                content: {
                    fontSize: 11,
                    lineHeight: 1.4,
                    color: '#333333'
                }
            },
            defaultStyle: {
                font: 'Roboto'
            },
            footer: function (currentPage, pageCount) {
                return {
                    text: `Страница ${currentPage} из ${pageCount}`,
                    alignment: 'center',
                    fontSize: 9,
                    color: '#999999',
                    margin: [0, 10, 0, 0]
                };
            }
        };

        // Generate and download PDF
        pdfMake.createPdf(docDefinition).download(`${filename}.pdf`);
    }

    saveBtn.addEventListener('click', async () => {
        hideStatus();
        saveBtn.disabled = true;
        showStatus('⏳ Извлечение сообщений...', 'loading');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab.url.includes('chatgpt.com') && !tab.url.includes('chat.openai.com')) {
                showStatus('❌ Откройте страницу ChatGPT', 'error');
                saveBtn.disabled = false;
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractMessages' });

            if (response.error) {
                showStatus(`❌ ${response.error}`, 'error');
                saveBtn.disabled = false;
                return;
            }

            if (!response.messages || response.messages.length === 0) {
                showStatus('❌ Сообщения не найдены', 'error');
                saveBtn.disabled = false;
                return;
            }

            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            const baseFilename = filenameInput.value.trim() || 'chatgpt_context';
            const filename = `${baseFilename}_${dateStr}_${timeStr}`;
            const format = formatSelect.value;

            showStatus('📄 Создание файла...', 'loading');

            if (format === 'pdf') {
                await downloadAsPDF(response.messages, filename);
            } else {
                const content = formatContent(response.messages, format);
                await downloadAsText(content, filename, format);
            }

            showStatus(`✅ Сохранено ${response.messages.length} сообщений!`, 'success');

        } catch (error) {
            console.error('Error:', error);
            showStatus(`❌ Ошибка: ${error.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
        }
    });
});
