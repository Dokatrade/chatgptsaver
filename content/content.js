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
        // The title is usually in the document title or in a specific element

        // Method 1: Get from document title (format: "Chat title — ChatGPT")
        const docTitle = document.title;
        if (docTitle && docTitle !== 'ChatGPT') {
            // Remove the " — ChatGPT" or " - ChatGPT" suffix
            const cleanTitle = docTitle.replace(/\s*[—–-]\s*ChatGPT\s*$/i, '').trim();
            if (cleanTitle && cleanTitle !== 'ChatGPT') {
                return sanitizeFilename(cleanTitle);
            }
        }

        // Method 2: Try to find the active chat item in the sidebar
        const activeChat = document.querySelector('nav [class*="active"] a') ||
            document.querySelector('nav li[class*="active"]') ||
            document.querySelector('[data-testid="conversation-turn-1"]');

        if (activeChat) {
            const text = activeChat.textContent?.trim();
            if (text) {
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

    function extractAllMessages() {
        const messages = [];

        // ChatGPT uses different selectors, we try multiple approaches
        // Main approach: find all message containers

        // Selector for message groups (each contains user or assistant message)
        const messageGroups = document.querySelectorAll('[data-message-author-role]');

        if (messageGroups.length > 0) {
            // Modern ChatGPT structure with data attributes
            messageGroups.forEach(group => {
                const role = group.getAttribute('data-message-author-role');
                const content = extractTextContent(group);

                if (content.trim()) {
                    messages.push({
                        role: role === 'user' ? 'user' : 'assistant',
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
        const contentArea = element.querySelector('.markdown') ||
            element.querySelector('[class*="prose"]') ||
            element.querySelector('.whitespace-pre-wrap') ||
            element;

        // Clone to avoid modifying the DOM
        const clone = contentArea.cloneNode(true);

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

        // Try to find conversation turns by looking for common patterns
        // This is a fallback for when the data attributes aren't available

        // Look for article elements or divs with specific classes
        const articles = document.querySelectorAll('article, [class*="message"], [class*="turn"]');

        articles.forEach(article => {
            const text = article.innerText || article.textContent || '';
            if (!text.trim()) return;

            // Try to determine if user or assistant based on styling or position
            const isUser = article.classList.contains('user') ||
                article.querySelector('[class*="user"]') ||
                article.getAttribute('data-role') === 'user';

            messages.push({
                role: isUser ? 'user' : 'assistant',
                content: text.trim()
            });
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
                    const text = child.innerText || child.textContent || '';
                    if (text.trim() && text.length > 10) {
                        messages.push({
                            role: isUserTurn ? 'user' : 'assistant',
                            content: text.trim()
                        });
                        isUserTurn = !isUserTurn;
                    }
                });
            }
        }

        return messages;
    }

    console.log('ChatGPT Context Saver: Content script loaded');
})();
