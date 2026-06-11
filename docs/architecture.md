# 🏗️ Архитектура расширения

## Обзор

**ChatGPT Context Saver** — Chrome-расширение на базе **Manifest V3**, состоящее из трёх слоёв: content script, popup UI и минимальный background service worker.

## Компоненты

### `content/content.js` — Content Script
- Внедряется на страницы `chatgpt.com` и `chat.openai.com`
- **Задачи:**
  - Извлечение сообщений из DOM (`extractAllMessages`, `extractMessagesAlternative`)
  - Парсинг текстового контента с сохранением форматирования (`extractTextContent`)
  - Получение заголовка чата (`getChatTitle`)
  - Санитизация имён файлов (`sanitizeFilename`)
- Общается с popup через `chrome.runtime.onMessage`

### `popup/` — UI-слой
| Файл | Назначение |
|------|-----------|
| `popup.html` | Структура popup-окна (кнопка сохранения, выбор формата, поле имени файла) |
| `popup.css` | Стили popup |
| `popup.js` | Логика: запрос сообщений, форматирование, генерация PDF/TXT/MD, скачивание через Chrome Downloads API |

**Ключевые функции `popup.js`:**
- `formatContent()` — форматирование в TXT/Markdown
- `downloadBlob()` — единый запуск скачивания TXT/MD/PDF через `chrome.downloads.download`
- `downloadAsPDF()` — генерация PDF через pdfmake с поддержкой эмодзи (Noto Emoji)
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
│  popup.js   │ ◀─────────────────── │  content.js  │
│             │    {messages, title}    └──────────────┘
│             │                              ▲
│  Format +   │                              │
│  Generate   │                         DOM страницы
│ PDF/TXT/MD  │                         ChatGPT
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
| `chrome.scripting.executeScript` | popup.js | Fallback-внедрение content script в уже открытую вкладку ChatGPT |
| `chrome.runtime.onMessage` | content.js | Обработка запросов от popup |
| `chrome.downloads.download` | popup.js | Скачивание файлов |

## Правила архитектуры

1. **Без фреймворков** — только vanilla JS, без сборщиков
2. **Manifest V3** — service worker используется только для фоновых lifecycle-задач
3. **Библиотеки** — хранятся локально в `lib/`, не подгружаются с CDN
4. **Изоляция** — content script работает в IIFE для предотвращения конфликтов с DOM страницы
5. **Async messaging** — запросы popup ↔ content script асинхронны (`return true` в listener)
