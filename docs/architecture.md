# 🏗️ Архитектура расширения

## Обзор

**ChatGPT Context Saver** — Chrome-расширение на базе **Manifest V3**, состоящее из трёх слоёв: content script, popup UI и минимальный background service worker.

## Компоненты

### `content/extractor.js` — Extractor
- Внедряется на страницы `chatgpt.com` и `chat.openai.com` перед bridge-скриптом
- Экспортирует testable API в `window.ChatGPTContextSaverExtractor` и `module.exports`
- **Задачи:**
  - Извлечение сообщений из DOM (`extractAllMessages`, `extractMessagesAlternative`)
  - Scroll-aware extraction для длинных виртуализированных чатов (`extractAllMessagesWithScroll`)
  - Парсинг текстового контента с сохранением форматирования (`extractTextContent`)
  - Получение заголовка чата (`getChatTitle`)
  - Санитизация имён файлов (`sanitizeFilename`)

#### Надёжность длинных чатов

Для длинных ChatGPT-диалогов extractor сохраняет текущую DOM-first архитектуру, но не ограничивается видимым DOM:

- делает начальный snapshot сообщений перед программной прокруткой;
- сканирует scrollable conversation viewport сверху вниз и мержит viewport snapshots по overlap-логике;
- после каждого программного scroll ждёт DOM quiescence через `MutationObserver`, а не только фиксированный timeout;
- всегда выполняет bottom stabilization pass после основного scan, независимо от исходной позиции пользователя;
- считает bottom стабильным только после 3 последовательных одинаковых состояний: message count, last stable message key и `scrollHeight`;
- после стабилизации делает финальный snapshot и merge;
- если доступны надёжные `data-testid="conversation-turn-N"` индексы, проверяет gaps, нормализует порядок по turn index и автоматически повторяет scan ограниченное число раз.

### `content/content.js` — Content Script Bridge
- Внедряется после `content/extractor.js`
- Общается с popup через `chrome.runtime.onMessage`
- Вызывает extractor API и возвращает `{messages, title, messageCount}` в popup

### `popup/` — UI-слой
| Файл | Назначение |
|------|-----------|
| `popup.html` | Структура popup-окна (кнопка сохранения, выбор формата, поле имени файла) |
| `popup.css` | Стили popup |
| `popup.js` | Логика: запрос сообщений, форматирование, генерация PDF/TXT/MD/EPUB, скачивание через Chrome Downloads API |
| `epub.js` | Генерация EPUB 3: XHTML/OPF/nav/CSS и ZIP-контейнер без сжатия |

**Ключевые функции `popup.js`:**
- `formatContent()` — форматирование в TXT/Markdown
- `downloadBlob()` — единый запуск скачивания TXT/MD/PDF/EPUB через `chrome.downloads.download`
- `downloadAsPDF()` — генерация PDF через pdfmake с поддержкой эмодзи (Noto Emoji)
- `downloadAsEPUB()` — генерация EPUB через `window.ChatGPTContextSaverEpub`
- `textToSegments()` / `parseTextLines()` — парсинг Markdown → pdfmake-структуры
- `transliterate()` / `buildFilename()` — генерация информативного имени файла

### `background/background.js` — Service Worker
- Инициализация расширения (`chrome.runtime.onInstalled`)
- Не участвует в основном export-flow; скачивание выполняет popup

### `lib/` — Внешние библиотеки
| Файл | Назначение |
|------|-----------|
| `pdfmake.min.js` | Генерация PDF |
| `vfs_fonts.min.js` | Встроенные шрифты для pdfmake |
| `vfs_fonts_custom.js` | Кастомные шрифты (Noto Emoji) |
| `html2pdf.min.js` | Альтернативная библиотека для PDF |
| `jspdf.min.js` | Зависимость html2pdf |
| `NotoEmoji-Regular.ttf` | Шрифт для отрисовки эмодзи в PDF |

## Поток данных

```
┌─────────────┐    extractMessages     ┌──────────────┐
│   Popup UI  │ ───────────────────▶   │Content Script│
│  popup.js   │ ◀─────────────────── │  content/*.js │
│             │    {messages, title}    └──────────────┘
│             │                              ▲
│  Format +   │                              │
│  Generate   │                         DOM страницы
│PDF/TXT/MD/EPUB│                       ChatGPT
│             │
│  Download   │
│  via Chrome │
│  Downloads  │
└─────────────┘
       │
       ▼
  Файл на диске
```

## Chrome API

| API | Где используется | Назначение |
|-----|-----------------|-----------|
| `chrome.tabs.query` | popup.js | Получение активной вкладки |
| `chrome.tabs.sendMessage` | popup.js | Запрос данных у content script |
| `chrome.scripting.executeScript` | popup.js | Fallback-внедрение `content/extractor.js` и `content/content.js` в уже открытую вкладку ChatGPT |
| `chrome.runtime.onMessage` | content.js | Обработка запросов от popup |
| `chrome.downloads.download` | popup.js | Скачивание файлов |

## Правила архитектуры

1. **Без фреймворков** — только vanilla JS, без сборщиков
2. **Manifest V3** — service worker используется только для фоновых lifecycle-задач
3. **Библиотеки** — хранятся локально в `lib/`, не подгружаются с CDN
4. **Изоляция** — content script работает в IIFE для предотвращения конфликтов с DOM страницы
5. **Async messaging** — запросы popup ↔ content script асинхронны (`return true` в listener)
