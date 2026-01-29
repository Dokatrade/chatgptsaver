// Background service worker for ChatGPT Context Saver

chrome.runtime.onInstalled.addListener(() => {
    console.log('ChatGPT Context Saver extension installed');
});

// Handle any background tasks if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'downloadFile') {
        chrome.downloads.download({
            url: request.url,
            filename: request.filename,
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, downloadId: downloadId });
            }
        });
        return true; // Keep channel open for async response
    }
});
