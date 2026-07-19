// Shared extraction helpers for ChatGPT conversation DOM.

(function (root, factory) {
    'use strict';

    const api = factory(root);

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.ChatGPTContextSaverExtractor = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
    'use strict';

    function getDocument() {
        return root.document;
    }

    function getWindow() {
        return root.window || root;
    }

    function getNodeApi() {
        return root.Node || getWindow().Node;
    }

    function getChatTitle() {
        // Try to get the chat title from the page.
        const document = getDocument();

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
        // Remove or replace characters that are invalid in filenames.
        return name
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, '_')
            .substring(0, 50)
            .replace(/_+$/, '');
    }

    function isVisibleElement(element) {
        const rect = element.getBoundingClientRect();
        const style = getWindow().getComputedStyle(element);

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
            'svg',
            'menu',
            'form',
            'input',
            'textarea',
            'select',
            '[data-testid*="copy"]',
            '[data-testid*="feedback"]',
            '[data-testid*="share"]',
            '[data-testid*="voice"]',
            '[class*="copy"]',
            '[class*="feedback"]',
            '[class*="sr-only"]'
        ];

        clone.querySelectorAll(selectors.join(', ')).forEach(el => el.remove());

        clone.querySelectorAll('button, [role="button"]').forEach(el => {
            if (el.textContent?.replace(/\s+/g, ' ').trim()) {
                while (el.firstChild) {
                    el.parentNode.insertBefore(el.firstChild, el);
                }
                el.remove();
            } else {
                el.remove();
            }
        });
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
            return new root.URL(cleanedHref, getWindow().location.href).href;
        } catch (error) {
            return cleanedHref;
        }
    }

    function getVisibleMessageGroups() {
        return getMessageGroups({ visibleOnly: true });
    }

    function getMessageGroups(options = {}) {
        const document = getDocument();
        const visibleOnly = options.visibleOnly !== false;

        let groups = Array.from(document.querySelectorAll('[data-message-author-role]'))
            .filter(group => normalizeRole(group.getAttribute('data-message-author-role')));

        if (visibleOnly) {
            groups = groups.filter(isVisibleElement);
        }

        return groups;
    }

    function extractAllMessages() {
        return toPublicMessages(extractMessagesFromDom({ visibleOnly: false }));
    }

    function extractMessagesFromDom(options = {}) {
        const messages = [];
        const messageGroups = getMessageGroups(options);

        if (messageGroups.length > 0) {
            messageGroups.forEach(group => {
                if (options.visibleOnly && !isVisibleElement(group)) return;

                const role = normalizeRole(group.getAttribute('data-message-author-role'));
                if (!role) return;

                const content = extractTextContent(group);

                if (content.trim()) {
                    messages.push(createMessage(role, content, group, options));
                }
            });
        } else {
            const alternativeMessages = extractMessagesAlternative(options);
            messages.push(...alternativeMessages);
        }

        return messages;
    }

    function createMessage(role, content, element, options = {}) {
        const message = {
            role: role,
            content: content.trim()
        };

        if (options.includeMetadata) {
            const stableKey = getStableMessageKey(element, role);
            const turnIndex = getConversationTurnIndex(element);

            if (stableKey) {
                Object.defineProperty(message, '_stableKey', {
                    value: stableKey,
                    enumerable: false
                });
            }

            if (turnIndex !== null) {
                Object.defineProperty(message, '_turnIndex', {
                    value: turnIndex,
                    enumerable: false
                });
            }
        }

        return message;
    }

    function toPublicMessages(messages) {
        return messages.map(message => ({
            role: message.role,
            content: message.content
        }));
    }

    function extractTextContent(element) {
        const document = getDocument();
        const Node = getNodeApi();
        const contentArea = getMessageContentArea(element);
        const clone = contentArea.cloneNode(true);

        removeNonContentElements(clone);

        const codeBlocks = clone.querySelectorAll('pre');
        codeBlocks.forEach(pre => {
            const code = pre.querySelector('code');
            const language = code?.className?.match(/language-(\w+)/)?.[1] || '';
            const codeText = code?.textContent || pre.textContent;
            pre.textContent = `\n\`\`\`${language}\n${codeText}\n\`\`\`\n`;
        });

        const headings = clone.querySelectorAll('h1, h2, h3, h4');
        headings.forEach(h => {
            const level = parseInt(h.tagName[1]);
            const prefix = '#'.repeat(level) + ' ';
            h.textContent = `\n${prefix}${h.textContent}\n`;
        });

        const links = clone.querySelectorAll('a[href]');
        links.forEach(link => {
            const url = normalizeLinkUrl(link.getAttribute('href'));
            const text = link.textContent?.replace(/\s+/g, ' ').trim();
            if (!url || !text) return;

            link.textContent = `[${escapeMarkdownLinkText(text)}](${escapeMarkdownUrl(url)})`;
        });

        const paragraphs = clone.querySelectorAll('p');
        paragraphs.forEach(p => {
            p.insertAdjacentText('afterend', '\n\n');
        });

        const boldElements = clone.querySelectorAll('strong, b');
        boldElements.forEach(el => {
            el.textContent = `**${el.textContent}**`;
        });

        const italicElements = clone.querySelectorAll('em, i');
        italicElements.forEach(el => {
            el.textContent = `*${el.textContent}*`;
        });

        const inlineCodes = clone.querySelectorAll('code:not(pre code)');
        inlineCodes.forEach(code => {
            code.textContent = `\`${code.textContent}\``;
        });

        const allLists = clone.querySelectorAll('ol, ul');
        const processedLists = new Set();

        function formatListItem(li, prefix, indentStr) {
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

        allLists.forEach(list => {
            if (processedLists.has(list)) return;
            if (list.parentElement.closest('ol, ul')) return;

            let result = '\n';
            let orderedCounter = 0;
            let currentList = list;
            let listGroup = [];

            while (currentList && (currentList.tagName === 'OL' || currentList.tagName === 'UL')) {
                if (!processedLists.has(currentList)) {
                    listGroup.push(currentList);
                    processedLists.add(currentList);
                }

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

            const textNode = document.createTextNode(result);
            list.parentNode.replaceChild(textNode, list);

            listGroup.slice(1).forEach(otherList => {
                if (otherList.parentNode) {
                    otherList.parentNode.removeChild(otherList);
                }
            });
        });

        let text = clone.innerText || clone.textContent || '';

        text = text.replace(/\n{3,}/g, '\n\n');

        text = text.replace(/→/g, '->');
        text = text.replace(/←/g, '<-');
        text = text.replace(/↔/g, '<->');
        text = text.replace(/↪/g, '->');
        text = text.replace(/↩/g, '<-');
        text = text.replace(/⇒/g, '=>');
        text = text.replace(/⇐/g, '<=');
        text = text.replace(/⇔/g, '<=>');
        text = text.replace(/▶/g, '>');
        text = text.replace(/◀/g, '<');

        return text;
    }

    function extractMessagesAlternative(options = {}) {
        const document = getDocument();
        const messages = [];
        const visibleOnly = options.visibleOnly !== false;
        const turnSelectors = [
            'article[data-testid^="conversation-turn"]',
            '[data-testid^="conversation-turn"]',
            'main article'
        ];
        const turnElements = Array.from(document.querySelectorAll(turnSelectors.join(', ')))
            .filter((element, index, self) => self.indexOf(element) === index)
            .filter((element, index, self) => !self.some((other, otherIndex) => otherIndex < index && other.contains(element)))
            .filter(element => !visibleOnly || isVisibleElement(element));

        turnElements.forEach((turn, index) => {
            const role = detectRoleFromTurn(turn, index);
            const content = extractTextContent(turn);

            if (role && content.trim()) {
                messages.push(createMessage(role, content, turn, options));
            }
        });

        if (messages.length === 0) {
            const mainContainer = document.querySelector('main') ||
                document.querySelector('[class*="conversation"]');

            if (mainContainer) {
                const children = mainContainer.querySelectorAll(':scope > div > div');
                let isUserTurn = true;

                children.forEach(child => {
                    if (visibleOnly && !isVisibleElement(child)) return;

                    const content = extractTextContent(child);
                    if (content.trim() && content.length > 10) {
                        messages.push(createMessage(
                            isUserTurn ? 'user' : 'assistant',
                            content,
                            child,
                            options
                        ));
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

    function getStableMessageKey(element, role) {
        const messageIdElement = element.closest('[data-message-id]') ||
            element.querySelector('[data-message-id]');
        const messageId = messageIdElement?.getAttribute('data-message-id')?.trim();

        if (messageId) {
            return `${role}:message:${messageId}`;
        }

        const turnElement = element.closest('[data-testid^="conversation-turn"]') ||
            element.querySelector('[data-testid^="conversation-turn"]');
        const turnId = turnElement?.getAttribute('data-testid')?.trim();

        if (turnId) {
            return `${role}:turn:${turnId}`;
        }

        return '';
    }

    function getConversationTurnIndex(element) {
        const turnElement = element.closest('[data-testid^="conversation-turn"]') ||
            element.querySelector('[data-testid^="conversation-turn"]');
        const turnId = turnElement?.getAttribute('data-testid')?.trim() || '';
        const match = turnId.match(/^conversation-turn-(\d+)$/);

        if (!match) {
            return null;
        }

        return Number(match[1]);
    }

    function normalizeMessageKey(message) {
        return `${message.role}:${message.content.replace(/\s+/g, ' ').trim()}`;
    }

    function messagesMatch(first, second) {
        if (first._stableKey && second._stableKey) {
            return first._stableKey === second._stableKey;
        }

        return normalizeMessageKey(first) === normalizeMessageKey(second);
    }

    function replaceWithMoreCompleteMessage(target, index, message) {
        if (message.content.length > target[index].content.length) {
            target[index] = message;
        }
    }

    function findExistingStableMessageIndex(messages, message) {
        if (!message._stableKey) {
            return -1;
        }

        return messages.findIndex(existing => existing._stableKey === message._stableKey);
    }

    function findSnapshotOverlap(target, snapshot) {
        const maxOverlap = Math.min(target.length, snapshot.length);

        for (let overlap = maxOverlap; overlap > 0; overlap--) {
            let matches = true;

            for (let index = 0; index < overlap; index++) {
                if (!messagesMatch(target[target.length - overlap + index], snapshot[index])) {
                    matches = false;
                    break;
                }
            }

            if (matches) {
                return overlap;
            }
        }

        return 0;
    }

    function findSnapshotSequenceIndex(target, snapshot) {
        if (snapshot.length === 0 || snapshot.length > target.length) {
            return -1;
        }

        for (let startIndex = 0; startIndex <= target.length - snapshot.length; startIndex++) {
            let matches = true;

            for (let index = 0; index < snapshot.length; index++) {
                if (!messagesMatch(target[startIndex + index], snapshot[index])) {
                    matches = false;
                    break;
                }
            }

            if (matches) {
                return startIndex;
            }
        }

        return -1;
    }

    function mergeMessageSnapshot(target, snapshot) {
        if (snapshot.length === 0) {
            return;
        }

        const overlap = findSnapshotOverlap(target, snapshot);

        if (overlap === 0) {
            const existingSequenceIndex = findSnapshotSequenceIndex(target, snapshot);

            if (existingSequenceIndex >= 0) {
                snapshot.forEach((message, index) => {
                    replaceWithMoreCompleteMessage(target, existingSequenceIndex + index, message);
                });
                return;
            }
        }

        for (let index = 0; index < overlap; index++) {
            const targetIndex = target.length - overlap + index;
            const message = snapshot[index];

            if (message._stableKey && target[targetIndex]._stableKey === message._stableKey) {
                replaceWithMoreCompleteMessage(target, targetIndex, message);
            }
        }

        snapshot.slice(overlap).forEach(message => {
            const existingIndex = findExistingStableMessageIndex(target, message);

            if (existingIndex >= 0) {
                replaceWithMoreCompleteMessage(target, existingIndex, message);
                return;
            }

            target.push(message);
        });
    }

    function extractMessagesForScrollMerge() {
        return extractMessagesFromDom({
            visibleOnly: false,
            includeMetadata: true
        });
    }

    function getScrollTop(container) {
        if (container === getDocument().scrollingElement) {
            return getWindow().scrollY || container.scrollTop || 0;
        }

        return container.scrollTop;
    }

    function setScrollTop(container, value) {
        if (container === getDocument().scrollingElement) {
            getWindow().scrollTo(0, value);
            container.scrollTop = value;
            triggerScroll(container);
            return;
        }

        container.scrollTop = value;
        triggerScroll(container);
    }

    function triggerScroll(container) {
        try {
            const Event = getWindow().Event;
            container.dispatchEvent(new Event('scroll', { bubbles: true }));
            getWindow().dispatchEvent(new Event('scroll'));
        } catch (error) {
            // Programmatic scroll still works if synthetic events are unavailable.
        }
    }

    function getMaxScrollTop(container) {
        return Math.max(0, container.scrollHeight - container.clientHeight);
    }

    function isNearScrollBottom(container, scrollTop) {
        const tolerance = Math.max(container.clientHeight, 600);

        return scrollTop >= getMaxScrollTop(container) - tolerance;
    }

    function isScrollableContainer(element) {
        if (element === getDocument().scrollingElement) {
            return element.scrollHeight > element.clientHeight + 20;
        }

        const style = getWindow().getComputedStyle(element);
        const overflowY = style.overflowY || style.overflow;

        return /(auto|scroll|overlay)/.test(overflowY) &&
            element.scrollHeight > element.clientHeight + 20;
    }

    function findConversationScrollContainer() {
        const document = getDocument();
        const firstMessage = document.querySelector('[data-message-author-role]');

        if (firstMessage) {
            let ancestor = firstMessage.parentElement;

            while (ancestor) {
                if (isScrollableContainer(ancestor)) {
                    return ancestor;
                }

                ancestor = ancestor.parentElement;
            }
        }

        const candidates = [
            document.scrollingElement,
            document.documentElement,
            document.body,
            ...Array.from(document.querySelectorAll('main, [class*="overflow-y-auto"], [class*="overflow-auto"]'))
        ].filter(Boolean);

        return candidates
            .filter((candidate, index, self) => self.indexOf(candidate) === index)
            .filter(isScrollableContainer)
            .sort((a, b) => {
                const messageCountDifference = b.querySelectorAll('[data-message-author-role]').length -
                    a.querySelectorAll('[data-message-author-role]').length;

                return messageCountDifference || a.scrollHeight - b.scrollHeight;
            })[0] || document.scrollingElement;
    }

    function waitForNextPaint() {
        return new Promise(resolve => {
            const window = getWindow();

            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(resolve);
                });
                return;
            }

            window.setTimeout(resolve, 0);
        });
    }

    async function waitForDomQuiescence(target, options = {}) {
        const window = getWindow();
        const MutationObserver = window.MutationObserver || root.MutationObserver;
        const quietMs = options.quietMs ?? 80;
        const maxWaitMs = options.maxWaitMs ?? 1200;

        if (typeof MutationObserver !== 'function') {
            await waitForNextPaint();
            await new Promise(resolve => window.setTimeout(resolve, quietMs));
            return;
        }

        await new Promise(resolve => {
            let resolved = false;
            let paintObserved = false;
            let quietTimer = null;
            let maxTimer = null;
            const observedTarget = target || getDocument().body || getDocument().documentElement;

            function cleanup() {
                if (resolved) {
                    return;
                }

                resolved = true;
                observer.disconnect();
                window.clearTimeout(quietTimer);
                window.clearTimeout(maxTimer);
                resolve();
            }

            function scheduleQuietTimer() {
                if (!paintObserved) {
                    return;
                }

                window.clearTimeout(quietTimer);
                quietTimer = window.setTimeout(cleanup, quietMs);
            }

            const observer = new MutationObserver(scheduleQuietTimer);
            observer.observe(observedTarget, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            });

            waitForNextPaint().then(() => {
                paintObserved = true;
                scheduleQuietTimer();
            });
            maxTimer = window.setTimeout(cleanup, maxWaitMs);
        });

        await waitForNextPaint();
    }

    async function waitAfterProgrammaticScroll(container, options = {}) {
        await waitForDomQuiescence(container, options);
    }

    function getLastSnapshotKey(snapshot) {
        const lastMessage = snapshot[snapshot.length - 1];

        if (!lastMessage) {
            return '';
        }

        return lastMessage._stableKey || normalizeMessageKey(lastMessage);
    }

    function getBottomState(container, snapshot) {
        return {
            messageCount: snapshot.length,
            lastKey: getLastSnapshotKey(snapshot),
            scrollHeight: container.scrollHeight
        };
    }

    function bottomStatesMatch(first, second) {
        return Boolean(first && second) &&
            first.messageCount === second.messageCount &&
            first.lastKey === second.lastKey &&
            Math.abs(first.scrollHeight - second.scrollHeight) < 2;
    }

    async function collectBottomMessages(container, waitOptions) {
        const messages = [];
        let lastState = null;
        let stableStates = 0;

        for (let attempt = 0; attempt < 16; attempt++) {
            setScrollTop(container, getMaxScrollTop(container));
            await waitAfterProgrammaticScroll(container, waitOptions);

            const snapshot = extractMessagesForScrollMerge();
            const state = getBottomState(container, snapshot);

            mergeMessageSnapshot(messages, snapshot);

            if (bottomStatesMatch(state, lastState)) {
                stableStates++;
            } else {
                stableStates = 1;
            }

            if (stableStates >= 3) {
                break;
            }

            lastState = state;
        }

        setScrollTop(container, getMaxScrollTop(container));
        await waitAfterProgrammaticScroll(container, waitOptions);
        mergeMessageSnapshot(messages, extractMessagesForScrollMerge());

        return messages;
    }

    function findConversationTurnIndexGaps(messages) {
        const indexes = messages
            .map(message => message._turnIndex)
            .filter(index => Number.isInteger(index));
        const uniqueIndexes = Array.from(new Set(indexes)).sort((a, b) => a - b);

        if (uniqueIndexes.length < 2 || indexes.length !== messages.length) {
            return [];
        }

        const gaps = [];

        for (let index = 1; index < uniqueIndexes.length; index++) {
            const previous = uniqueIndexes[index - 1];
            const current = uniqueIndexes[index];

            for (let missing = previous + 1; missing < current; missing++) {
                gaps.push(missing);
            }
        }

        return gaps;
    }

    function normalizeReliableTurnOrder(messages) {
        const turnIndexes = messages.map(message => message._turnIndex);

        if (messages.length < 2 || !turnIndexes.every(index => Number.isInteger(index))) {
            return;
        }

        const messagesByTurnIndex = new Map();

        messages.forEach(message => {
            const existing = messagesByTurnIndex.get(message._turnIndex);

            if (!existing || message.content.length > existing.content.length) {
                messagesByTurnIndex.set(message._turnIndex, message);
            }
        });

        messages.splice(
            0,
            messages.length,
            ...Array.from(messagesByTurnIndex.entries())
                .sort((first, second) => first[0] - second[0])
                .map(([, message]) => message)
        );
    }

    function hasCompletenessGaps(messages) {
        return findConversationTurnIndexGaps(messages).length > 0;
    }

    async function runScrollScan(container, waitOptions) {
        const messages = [];
        let bottomMessages = [];

        setScrollTop(container, 0);
        await waitAfterProgrammaticScroll(container, waitOptions);
        mergeMessageSnapshot(messages, extractMessagesForScrollMerge());

        let lastTop = -1;
        let stagnantSteps = 0;

        // Scroll until the current conversation end, which may move as ChatGPT renders virtualized turns.
        while (true) {
            const currentTop = getScrollTop(container);
            const nextTop = Math.min(
                currentTop + Math.max(container.clientHeight * 0.75, 300),
                container.scrollHeight - container.clientHeight
            );

            if (nextTop <= currentTop + 1) {
                break;
            }

            setScrollTop(container, nextTop);
            await waitAfterProgrammaticScroll(container, waitOptions);
            mergeMessageSnapshot(messages, extractMessagesForScrollMerge());

            const newTop = getScrollTop(container);
            if (Math.abs(newTop - lastTop) < 2) {
                stagnantSteps++;
            } else {
                stagnantSteps = 0;
            }

            if (stagnantSteps >= 2) {
                break;
            }

            lastTop = newTop;
        }

        // Always stabilize the bottom, even when the user's original viewport was not near the bottom.
        mergeMessageSnapshot(bottomMessages, await collectBottomMessages(container, waitOptions));
        mergeMessageSnapshot(messages, bottomMessages);
        mergeMessageSnapshot(messages, extractMessagesForScrollMerge());

        return {
            messages,
            bottomMessages
        };
    }

    async function extractAllMessagesWithScroll(options = {}) {
        const initialMessages = extractMessagesForScrollMerge();
        const container = findConversationScrollContainer();

        if (!container || container.scrollHeight <= container.clientHeight + 20) {
            return toPublicMessages(initialMessages);
        }

        const originalTop = getScrollTop(container);
        const originalNearBottom = isNearScrollBottom(container, originalTop);
        const waitOptions = {
            quietMs: options.quiescenceQuietMs ?? options.renderDelay ?? 80,
            maxWaitMs: options.quiescenceMaxWaitMs ?? 1200
        };
        const maxScanPasses = options.maxScanPasses ?? 2;
        const messages = [];
        let bottomMessages = [];
        let restoredMessages = [];

        try {
            for (let scanPass = 0; scanPass < maxScanPasses; scanPass++) {
                const scanResult = await runScrollScan(container, waitOptions);

                mergeMessageSnapshot(messages, scanResult.messages);
                mergeMessageSnapshot(bottomMessages, scanResult.bottomMessages);
                normalizeReliableTurnOrder(messages);

                if (!hasCompletenessGaps(messages)) {
                    break;
                }
            }
        } finally {
            setScrollTop(container, originalTop);
            await waitAfterProgrammaticScroll(container, waitOptions);

            if (originalNearBottom) {
                restoredMessages = extractMessagesForScrollMerge();
            }
        }

        // ChatGPT may only expose the newest turns in the user's original bottom viewport.
        mergeMessageSnapshot(messages, bottomMessages);

        if (originalNearBottom) {
            mergeMessageSnapshot(messages, restoredMessages);
        }

        mergeMessageSnapshot(messages, initialMessages);
        normalizeReliableTurnOrder(messages);

        return messages.length > 0 ? toPublicMessages(messages) : extractAllMessages();
    }

    return {
        extractAllMessages,
        extractAllMessagesWithScroll,
        extractMessagesAlternative,
        extractTextContent,
        getChatTitle,
        getVisibleMessageGroups,
        sanitizeFilename
    };
});
