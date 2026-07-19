// Content script bridge for ChatGPT Context Saver.

(function () {
    'use strict';

    const extractor = window.ChatGPTContextSaverExtractor;

    if (!extractor) {
        console.error('ChatGPT Context Saver Error: extractor module is not loaded.');
        return;
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'extractMessages') {
            (async () => {
                try {
                    const messages = await extractor.extractAllMessagesWithScroll();
                    sendResponse({ messages: messages });
                } catch (error) {
                    console.error('ChatGPT Context Saver Error:', error);
                    sendResponse({ error: error.message });
                }
            })();
        } else if (request.action === 'getChatInfo') {
            try {
                const title = extractor.getChatTitle();
                const messageCount = extractor.getVisibleMessageGroups().length;
                sendResponse({ title: title, messageCount: messageCount });
            } catch (error) {
                console.error('ChatGPT Context Saver Error:', error);
                sendResponse({ title: '', messageCount: 0 });
            }
        } else if (request.action === 'getChatTitle') {
            try {
                const title = extractor.getChatTitle();
                sendResponse({ title: title });
            } catch (error) {
                console.error('ChatGPT Context Saver Error:', error);
                sendResponse({ title: '' });
            }
        }

        return true;
    });

    console.log('ChatGPT Context Saver: Content script loaded');
})();
