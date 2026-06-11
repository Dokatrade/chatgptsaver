// Content script for extracting ChatGPT messages

(function () {
    'use strict';

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'extractMessages') {
            try {
                const messages = extractAllMessages();
                sendResponse({ messages: messages });
            } catch (error) {
                console.error('ChatGPT Context Saver Error:', error);
                sendResponse({ error: error.message });
            }
        } else if (request.action === 'getChatInfo') {
            try {
                const title = getChatTitle();
                const messageCount = getVisibleMessageGroups().length;
                sendResponse({ title: title, messageCount: messageCount });
            } catch (error) {
                console.error('ChatGPT Context Saver Error:', error);
                sendResponse({ title: '', messageCount: 0 });
            }
        } else if (request.action === 'getChatTitle') {
            try {
                const title = getChatTitle();
                sendResponse({ title: title });
            } catch (error) {
                console.error('ChatGPT Context Saver Error:', error);
                sendResponse({ title: '' });
            }
        }
        return true; // Keep the message channel open for async response
    });

    function getChatTitle() {
        // Try to get the chat title from the page

        // Method 1: Get from document title (various formats)
        // "Chat title — ChatGPT", "Chat title - ChatGPT", "Chat title | ChatGPT"
        const docTitle = document.title;
        if (docTitle && docTitle !== 'ChatGPT' && docTitle !== 'New chat' && docTitle !== 'Новый чат') {
            const cleanTitle = docTitle
                .replace(/\s*[—–\-|]\s*ChatGPT\s*$/i, '')
                .replace(/\s*[—–\-|]\s*OpenAI\s*$/i, '')
                .trim();
            if (cleanTitle && cleanTitle !== 'ChatGPT' && cleanTitle !== 'New chat' && cleanTitle !== 'Новый чат') {
                return sanitizeFilename(cleanTitle);
            }
        }

        // Method 2: Try to find the active/selected chat title in the sidebar
        const activeChat = document.querySelector('nav a[class*="bg-"]') ||
            document.querySelector('nav [class*="active"] a') ||
            document.querySelector('nav li[class*="active"]');

        if (activeChat) {
            const text = activeChat.textContent?.trim();
            if (text && text !== 'New chat' && text !== 'Новый чат') {
                return sanitizeFilename(text);
            }
        }

        // Method 3: Get title from the first heading in the chat
        const h1 = document.querySelector('main h1');
        if (h1) {
            const text = h1.textContent?.trim();
            if (text && text.length > 2 && text.length < 100) {
                return sanitizeFilename(text);
            }
        }

        return '';
    }

    function sanitizeFilename(name) {
        // Remove or replace characters that are invalid in filenames
        return name
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename chars
            .replace(/[\r\n]+/g, ' ')     // Replace newlines with spaces
            .replace(/\s+/g, '_')         // Replace spaces with underscores
            .substring(0, 50)             // Limit length
            .replace(/_+$/, '');          // Remove trailing underscores
    }

    function isVisibleElement(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        return rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
    }

    function normalizeRole(role) {
        if (role === 'user' || role === 'assistant') {
            return role;
        }

        return null;
    }

    function getMessageContentArea(element) {
        return element.querySelector('.markdown') ||
            element.querySelector('[data-message-content]') ||
            element.querySelector('[class*="prose"]') ||
            element.querySelector('.whitespace-pre-wrap') ||
            element;
    }

    function removeNonContentElements(clone) {
        const selectors = [
            'button',
            'svg',
            'menu',
            'form',
            'input',
            'textarea',
            'select',
            '[role="button"]',
            '[aria-hidden="true"]',
            '[data-testid*="copy"]',
            '[data-testid*="feedback"]',
            '[data-testid*="share"]',
            '[data-testid*="voice"]',
            '[class*="copy"]',
            '[class*="feedback"]',
            '[class*="sr-only"]'
        ];

        clone.querySelectorAll(selectors.join(', ')).forEach(el => el.remove());
    }

    function escapeMarkdownLinkText(text) {
        return text.replace(/([\[\]\\])/g, '\\$1').trim();
    }

    function escapeMarkdownUrl(url) {
        return url.replace(/\)/g, '%29').trim();
    }

    function normalizeLinkUrl(href) {
        const cleanedHref = href?.trim() || '';
        const lowerHref = cleanedHref.toLowerCase();

        if (!cleanedHref || cleanedHref.startsWith('#') || lowerHref.startsWith('javascript:')) {
            return '';
        }

        try {
            return new URL(cleanedHref, window.location.href).href;
        } catch (error) {
            return cleanedHref;
        }
    }

    function getVisibleMessageGroups() {
        return Array.from(document.querySelectorAll('[data-message-author-role]'))
            .filter(group => normalizeRole(group.getAttribute('data-message-author-role')))
            .filter(isVisibleElement);
    }

    function extractAllMessages() {
        const messages = [];

        // ChatGPT uses different selectors, we try multiple approaches
        // Main approach: find all message containers

        // Selector for message groups (each contains user or assistant message)
        const messageGroups = getVisibleMessageGroups();

        if (messageGroups.length > 0) {
            // Modern ChatGPT structure with data attributes
            messageGroups.forEach(group => {
                if (!isVisibleElement(group)) return;

                const role = normalizeRole(group.getAttribute('data-message-author-role'));
                if (!role) return;

                const content = extractTextContent(group);

                if (content.trim()) {
                    messages.push({
                        role: role,
                        content: content.trim()
                    });
                }
            });
        } else {
            // Fallback: try alternative selectors
            const alternativeMessages = extractMessagesAlternative();
            messages.push(...alternativeMessages);
        }

        return messages;
    }

    function extractTextContent(element) {
        // Get the main content area within the message
        const contentArea = getMessageContentArea(element);

        // Clone to avoid modifying the DOM
        const clone = contentArea.cloneNode(true);

        removeNonContentElements(clone);

        // Handle code blocks specially
        const codeBlocks = clone.querySelectorAll('pre');
        codeBlocks.forEach(pre => {
            const code = pre.querySelector('code');
            const language = code?.className?.match(/language-(\w+)/)?.[1] || '';
            const codeText = code?.textContent || pre.textContent;
            pre.textContent = `\n\`\`\`${language}\n${codeText}\n\`\`\`\n`;
        });

        // Handle headings (h1-h4)
        const headings = clone.querySelectorAll('h1, h2, h3, h4');
        headings.forEach(h => {
            const level = parseInt(h.tagName[1]);
            const prefix = '#'.repeat(level) + ' ';
            h.textContent = `\n${prefix}${h.textContent}\n`;
        });

        // Handle links as Markdown before reading text content
        const links = clone.querySelectorAll('a[href]');
        links.forEach(link => {
            const url = normalizeLinkUrl(link.getAttribute('href'));
            const text = link.textContent?.replace(/\s+/g, ' ').trim();
            if (!url || !text) return;

            link.textContent = `[${escapeMarkdownLinkText(text)}](${escapeMarkdownUrl(url)})`;
        });

        // Handle paragraphs - add spacing between them
        const paragraphs = clone.querySelectorAll('p');
        paragraphs.forEach(p => {
            // Add double newline after paragraph for spacing
            p.insertAdjacentText('afterend', '\n\n');
        });

        // Handle bold text (strong, b tags)
        const boldElements = clone.querySelectorAll('strong, b');
        boldElements.forEach(el => {
            el.textContent = `**${el.textContent}**`;
        });

        // Handle italic text (em, i tags)
        const italicElements = clone.querySelectorAll('em, i');
        italicElements.forEach(el => {
            el.textContent = `*${el.textContent}*`;
        });

        // Handle inline code
        const inlineCodes = clone.querySelectorAll('code:not(pre code)');
        inlineCodes.forEach(code => {
            code.textContent = `\`${code.textContent}\``;
        });

        // Handle lists - merge consecutive ordered lists separated by unordered lists
        // First, find groups of lists that should be merged
        const allLists = clone.querySelectorAll('ol, ul');
        const processedLists = new Set();

        function formatListItem(li, prefix, indentStr) {
            // Get only direct text content, not nested lists
            let itemText = '';
            li.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    itemText += node.textContent;
                } else if (node.nodeName !== 'OL' && node.nodeName !== 'UL') {
                    itemText += node.textContent || '';
                }
            });
            itemText = itemText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

            let result = '';
            if (itemText) {
                result += `${indentStr}${prefix}${itemText}\n`;
            }

            // Process nested lists with increased indent
            const nestedLists = li.querySelectorAll(':scope > ol, :scope > ul');
            nestedLists.forEach(nestedList => {
                if (!processedLists.has(nestedList)) {
                    processedLists.add(nestedList);
                    const nestedIsOrdered = nestedList.tagName === 'OL';
                    const nestedItems = nestedList.querySelectorAll(':scope > li');
                    nestedItems.forEach((nestedLi, nestedIdx) => {
                        const nestedPrefix = nestedIsOrdered ? `${nestedIdx + 1}. ` : '○ ';
                        result += formatListItem(nestedLi, nestedPrefix, indentStr + '  ');
                    });
                }
            });

            return result;
        }

        // Group consecutive lists and track ordered list numbering
        allLists.forEach(list => {
            // Skip if already processed or nested inside another list
            if (processedLists.has(list)) return;
            if (list.parentElement.closest('ol, ul')) return;

            let result = '\n';
            let orderedCounter = 0;  // Running counter for ordered list items
            let currentList = list;
            let listGroup = [];

            // Collect consecutive sibling lists
            while (currentList && (currentList.tagName === 'OL' || currentList.tagName === 'UL')) {
                if (!processedLists.has(currentList)) {
                    listGroup.push(currentList);
                    processedLists.add(currentList);
                }

                // Find next sibling list (skip text nodes)
                let nextSibling = currentList.nextSibling;
                while (nextSibling && nextSibling.nodeType === Node.TEXT_NODE && !nextSibling.textContent.trim()) {
                    nextSibling = nextSibling.nextSibling;
                }

                if (nextSibling && (nextSibling.tagName === 'OL' || nextSibling.tagName === 'UL')) {
                    currentList = nextSibling;
                } else {
                    break;
                }
            }

            // Format all lists in the group with continuous numbering for ordered lists
            listGroup.forEach(listItem => {
                const isOrdered = listItem.tagName === 'OL';
                const items = listItem.querySelectorAll(':scope > li');

                items.forEach((li) => {
                    let prefix;
                    if (isOrdered) {
                        orderedCounter++;
                        prefix = `${orderedCounter}. `;
                    } else {
                        prefix = '○ ';
                    }
                    result += formatListItem(li, prefix, '');
                });
            });

            // Replace first list with formatted text, remove the rest
            const textNode = document.createTextNode(result);
            list.parentNode.replaceChild(textNode, list);

            // Remove other lists in the group
            listGroup.slice(1).forEach(otherList => {
                if (otherList.parentNode) {
                    otherList.parentNode.removeChild(otherList);
                }
            });
        });

        // Get text content with some formatting preserved
        let text = clone.innerText || clone.textContent || '';

        // Clean up excessive whitespace while preserving paragraph breaks
        text = text.replace(/\n{3,}/g, '\n\n');

        // Replace Unicode arrows with ASCII equivalents (fonts don't support them)
        text = text.replace(/→/g, '->');
        text = text.replace(/←/g, '<-');
        text = text.replace(/↔/g, '<->');
        text = text.replace(/⇒/g, '=>');
        text = text.replace(/⇐/g, '<=');
        text = text.replace(/⇔/g, '<=>');
        text = text.replace(/▶/g, '>');
        text = text.replace(/◀/g, '<');

        return text;
    }

    function extractMessagesAlternative() {
        const messages = [];

        // Try structured turn containers before falling back to loose DOM traversal.
        const turnSelectors = [
            'article[data-testid^="conversation-turn"]',
            '[data-testid^="conversation-turn"]',
            'main article'
        ];
        const turnElements = Array.from(document.querySelectorAll(turnSelectors.join(', ')))
            .filter((element, index, self) => self.indexOf(element) === index)
            .filter((element, index, self) => !self.some((other, otherIndex) => otherIndex < index && other.contains(element)))
            .filter(isVisibleElement);

        turnElements.forEach((turn, index) => {
            const role = detectRoleFromTurn(turn, index);
            const content = extractTextContent(turn);

            if (role && content.trim()) {
                messages.push({
                    role: role,
                    content: content.trim()
                });
            }
        });

        // If still no messages, try the main chat container
        if (messages.length === 0) {
            const mainContainer = document.querySelector('main') ||
                document.querySelector('[class*="conversation"]');

            if (mainContainer) {
                // Get all direct children that look like messages
                const children = mainContainer.querySelectorAll(':scope > div > div');
                let isUserTurn = true;

                children.forEach(child => {
                    if (!isVisibleElement(child)) return;

                    const content = extractTextContent(child);
                    if (content.trim() && content.length > 10) {
                        messages.push({
                            role: isUserTurn ? 'user' : 'assistant',
                            content: content.trim()
                        });
                        isUserTurn = !isUserTurn;
                    }
                });
            }
        }

        return messages;
    }

    function detectRoleFromTurn(turn, index) {
        const explicitRole = normalizeRole(turn.getAttribute('data-message-author-role')) ||
            normalizeRole(turn.getAttribute('data-role')) ||
            normalizeRole(turn.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role')) ||
            normalizeRole(turn.querySelector('[data-role]')?.getAttribute('data-role'));

        if (explicitRole) {
            return explicitRole;
        }

        const ariaLabel = turn.getAttribute('aria-label')?.toLowerCase() || '';
        const testId = turn.getAttribute('data-testid')?.toLowerCase() || '';
        const className = typeof turn.className === 'string' ? turn.className.toLowerCase() : '';
        const markerText = `${ariaLabel} ${testId} ${className}`;

        if (/\b(user|you|пользователь|вы)\b/.test(markerText)) {
            return 'user';
        }

        if (/\b(assistant|chatgpt|ассистент)\b/.test(markerText)) {
            return 'assistant';
        }

        return index % 2 === 0 ? 'user' : 'assistant';
    }

    console.log('ChatGPT Context Saver: Content script loaded');
})();
