const assert = require('assert');
const { JSDOM } = require('jsdom');
const extractor = require('../content/extractor');

function setupDom(html) {
    const dom = new JSDOM(html, {
        url: 'https://chatgpt.com/c/test-chat'
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.Node = dom.window.Node;

    dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
        if (this.hasAttribute('data-hidden-fixture')) {
            return { width: 0, height: 0 };
        }

        return { width: 100, height: 20 };
    };

    return dom;
}

function normalizeText(text) {
    return text.replace(/\s+/g, ' ').trim();
}

function testModernMessageExtraction() {
    setupDom(`
        <main>
            <div data-message-author-role="user">
                <div class="whitespace-pre-wrap">
                    Save the visible marker
                    <span aria-hidden="true">after aria hidden</span>
                    <button type="button">↪ inline button text</button>
                    <button data-testid="copy-turn-action-button"><svg></svg></button>
                </div>
            </div>
            <div data-message-author-role="assistant">
                <div class="markdown">
                    <p>Use <strong>bold</strong>, <em>italic</em>, and <code>inlineCode</code>.</p>
                    <p>Read <a href="/docs">docs</a>.</p>
                    <pre><code class="language-js">const value = 1;</code></pre>
                </div>
            </div>
        </main>
    `);

    const messages = extractor.extractAllMessages();

    assert.strictEqual(messages.length, 2);
    assert.strictEqual(messages[0].role, 'user');
    assert.match(normalizeText(messages[0].content), /Save the visible marker after aria hidden -> inline button text/);
    assert.doesNotMatch(messages[0].content, /copy-turn-action-button/);

    assert.strictEqual(messages[1].role, 'assistant');
    assert.match(messages[1].content, /\*\*bold\*\*/);
    assert.match(messages[1].content, /\*italic\*/);
    assert.match(messages[1].content, /`inlineCode`/);
    assert.match(messages[1].content, /\[docs\]\(https:\/\/chatgpt.com\/docs\)/);
    assert.match(messages[1].content, /```js/);
    assert.match(messages[1].content, /const value = 1;/);
}

function testAlternativeTurnExtraction() {
    setupDom(`
        <main>
            <article data-testid="conversation-turn-1" aria-label="You said">
                <div class="prose"><p>Fallback user message with enough text.</p></div>
            </article>
            <article data-testid="conversation-turn-2" aria-label="ChatGPT said">
                <div class="markdown"><p>Fallback assistant message with enough text.</p></div>
            </article>
        </main>
    `);

    const messages = extractor.extractAllMessages();

    assert.deepStrictEqual(messages.map(message => message.role), ['user', 'assistant']);
    assert.match(messages[0].content, /Fallback user message/);
    assert.match(messages[1].content, /Fallback assistant message/);
}

function testHiddenSizedMessageExtraction() {
    setupDom(`
        <main>
            <div data-message-author-role="user" data-hidden-fixture>
                <div class="whitespace-pre-wrap">Message kept in DOM with zero rendered size.</div>
            </div>
            <div data-message-author-role="assistant">
                <div class="markdown"><p>Visible assistant reply.</p></div>
            </div>
        </main>
    `);

    const messages = extractor.extractAllMessages();

    assert.strictEqual(messages.length, 2);
    assert.match(messages[0].content, /Message kept in DOM/);
    assert.match(messages[1].content, /Visible assistant reply/);
}

function testNestedListExtraction() {
    setupDom(`
        <main>
            <div data-message-author-role="assistant">
                <div class="markdown">
                    <ol>
                        <li>First item</li>
                        <li>Second item
                            <ul>
                                <li>Nested detail</li>
                            </ul>
                        </li>
                    </ol>
                </div>
            </div>
        </main>
    `);

    const [message] = extractor.extractAllMessages();

    assert.match(message.content, /1\. First item/);
    assert.match(message.content, /2\. Second item/);
    assert.match(message.content, /○ Nested detail/);
}

async function testLongVirtualizedConversationExtraction() {
    setupDom(`
        <aside class="overflow-y-auto" style="overflow-y: auto"></aside>
        <main style="overflow-y: auto"><section style="overflow: visible"></section></main>
    `);

    const conversation = document.querySelector('main');
    const messageWrapper = conversation.querySelector('section');
    const sidebar = document.querySelector('aside');
    const clientHeight = 300;
    const scrollHeight = 30000;
    let scrollTop = scrollHeight - clientHeight;

    Object.defineProperties(conversation, {
        clientHeight: { configurable: true, get: () => clientHeight },
        scrollHeight: { configurable: true, get: () => scrollHeight },
        scrollTop: {
            configurable: true,
            get: () => scrollTop,
            set: value => {
                scrollTop = Math.max(0, Math.min(value, scrollHeight - clientHeight));
                const messageNumber = Math.min(Math.floor(scrollTop / clientHeight) + 1, 96);
                messageWrapper.innerHTML = `
                    <div data-message-author-role="assistant">
                        <div class="markdown"><p>Virtualized message ${messageNumber}</p></div>
                    </div>
                `;
            }
        }
    });

    Object.defineProperties(messageWrapper, {
        clientHeight: { configurable: true, get: () => clientHeight },
        scrollHeight: { configurable: true, get: () => scrollHeight * 3 },
        scrollTop: { configurable: true, value: 0, writable: true }
    });

    Object.defineProperties(sidebar, {
        clientHeight: { configurable: true, get: () => clientHeight },
        scrollHeight: { configurable: true, get: () => scrollHeight * 2 },
        scrollTop: { configurable: true, value: 0, writable: true }
    });

    messageWrapper.innerHTML = [97, 98, 99, 100].map(messageNumber => `
        <div data-message-author-role="assistant">
            <div class="markdown"><p>Virtualized message ${messageNumber}</p></div>
        </div>
    `).join('');

    const messages = await extractor.extractAllMessagesWithScroll({ renderDelay: 0 });

    assert.match(messages.at(-5).content, /Virtualized message 96/);
    assert.match(messages.at(-1).content, /Virtualized message 100/);
    assert.strictEqual(conversation.scrollTop, scrollHeight - clientHeight);
}

async function testRepeatedMessagesInVirtualizedConversation() {
    setupDom(`
        <main style="overflow-y: auto"><section style="overflow: visible"></section></main>
    `);

    const conversation = document.querySelector('main');
    const messageWrapper = conversation.querySelector('section');
    const clientHeight = 300;
    const scrollHeight = 1200;
    const turns = [
        { role: 'user', content: 'Continue.' },
        { role: 'assistant', content: 'First continuation.' },
        { role: 'user', content: 'Continue.' },
        { role: 'assistant', content: 'Final continuation.' }
    ];
    let scrollTop = scrollHeight - clientHeight;

    function renderWindow(startIndex) {
        messageWrapper.innerHTML = turns.slice(startIndex, startIndex + 2).map(turn => `
            <div data-message-author-role="${turn.role}">
                <div class="${turn.role === 'assistant' ? 'markdown' : 'whitespace-pre-wrap'}">
                    <p>${turn.content}</p>
                </div>
            </div>
        `).join('');
    }

    Object.defineProperties(conversation, {
        clientHeight: { configurable: true, get: () => clientHeight },
        scrollHeight: { configurable: true, get: () => scrollHeight },
        scrollTop: {
            configurable: true,
            get: () => scrollTop,
            set: value => {
                scrollTop = Math.max(0, Math.min(value, scrollHeight - clientHeight));
                renderWindow(Math.min(Math.floor(scrollTop / clientHeight), turns.length - 2));
            }
        }
    });

    Object.defineProperties(messageWrapper, {
        clientHeight: { configurable: true, get: () => clientHeight },
        scrollHeight: { configurable: true, get: () => scrollHeight * 2 },
        scrollTop: { configurable: true, value: 0, writable: true }
    });

    renderWindow(2);

    const messages = await extractor.extractAllMessagesWithScroll({ renderDelay: 0 });

    assert.deepStrictEqual(messages.map(message => message.content), turns.map(turn => turn.content));
    assert.strictEqual(messages.filter(message => message.content === 'Continue.').length, 2);
    assert.strictEqual(conversation.scrollTop, scrollHeight - clientHeight);
}

async function testDelayedBottomRenderExtraction() {
    setupDom(`
        <main style="overflow-y: auto"><section style="overflow: visible"></section></main>
    `);

    const conversation = document.querySelector('main');
    const messageWrapper = conversation.querySelector('section');
    const clientHeight = 300;
    const scrollHeight = 1800;
    const turns = Array.from({ length: 10 }, (_, index) => ({
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `Delayed bottom message ${index + 1}`
    }));
    let scrollTop = 0;
    let bottomSettled = false;
    let bottomMountScheduled = false;

    function renderWindow(startIndex, count = 3) {
        messageWrapper.innerHTML = turns.slice(startIndex, startIndex + count).map((turn, offset) => `
            <article data-testid="conversation-turn-${startIndex + offset + 1}">
                <div data-message-author-role="${turn.role}">
                    <div class="${turn.role === 'assistant' ? 'markdown' : 'whitespace-pre-wrap'}">
                        <p>${turn.content}</p>
                    </div>
                </div>
            </article>
        `).join('');
    }

    Object.defineProperties(conversation, {
        clientHeight: { configurable: true, get: () => clientHeight },
        scrollHeight: { configurable: true, get: () => scrollHeight },
        scrollTop: {
            configurable: true,
            get: () => scrollTop,
            set: value => {
                scrollTop = Math.max(0, Math.min(value, scrollHeight - clientHeight));

                if (scrollTop >= scrollHeight - clientHeight) {
                    if (bottomSettled) {
                        renderWindow(6, 4);
                        return;
                    }

                    renderWindow(6, 2);

                    if (!bottomMountScheduled) {
                        bottomMountScheduled = true;
                        window.setTimeout(() => {
                            renderWindow(6, 3);
                            window.setTimeout(() => {
                                bottomSettled = true;
                                renderWindow(6, 4);
                            }, 0);
                        }, 0);
                    }

                    return;
                }

                renderWindow(Math.floor(scrollTop / clientHeight));
            }
        }
    });

    Object.defineProperties(messageWrapper, {
        clientHeight: { configurable: true, get: () => clientHeight },
        scrollHeight: { configurable: true, get: () => scrollHeight * 2 },
        scrollTop: { configurable: true, value: 0, writable: true }
    });

    renderWindow(0);

    const messages = await extractor.extractAllMessagesWithScroll({
        quiescenceQuietMs: 0,
        maxScanPasses: 2
    });

    assert.deepStrictEqual(messages.map(message => message.content), turns.map(turn => turn.content));
    assert.strictEqual(conversation.scrollTop, 0);
}

async function run() {
    testModernMessageExtraction();
    testAlternativeTurnExtraction();
    testHiddenSizedMessageExtraction();
    testNestedListExtraction();
    await testLongVirtualizedConversationExtraction();
    await testRepeatedMessagesInVirtualizedConversation();
    await testDelayedBottomRenderExtraction();

    console.log('Extractor fixture tests passed.');
}

run().catch(error => {
    console.error(`Extractor fixture tests failed: ${error.message}`);
    process.exit(1);
});
