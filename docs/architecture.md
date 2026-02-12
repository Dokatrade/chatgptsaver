# 🏗️ Архитектура расширения

## Обзор

**ChatGPT Context Saver** — Chrome-расширение на базе **Manifest V3**, состоящее из трёх основных слоёв: content script, popup UI и background service worker.

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
| `popup.js` | Логика: запрос сообщений, форматирование, генерация PDF/TXT, скачивание |

**Ключевые функции `popup.js`:**
- `formatContent()` — форматирование в TXT/Markdown
- `downloadAsPDF()` — генерация PDF через pdfmake с поддержкой эмодзи (Noto Emoji)
- `textToSegments()` / `parseTextLines()` — парсинг Markdown → pdfmake-структуры
- `transliterate()` / `buildFilename()` — генерация информативного имени файла

### `background/background.js` — Service Worker
- Инициализация расширения (`chrome.runtime.onInstalled`)
- Обработка скачивания файлов через `chrome.downloads.download`

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
│  PDF/TXT    │                         ChatGPT
│             │
│             │    downloadFile        ┌──────────────┐
│             │ ───────────────────▶   │  Background  │
│             │                        │background.js │
└─────────────┘                        └──────────────┘
                                            │
                                     chrome.downloads
                                            │
                                            ▼
                                       Файл на диске
```

## Chrome API

| API | Где используется | Назначение |
|-----|-----------------|-----------|
| `chrome.tabs.query` | popup.js | Получение активной вкладки |
| `chrome.scripting.executeScript` | popup.js | Внедрение content script |
| `chrome.runtime.onMessage` | content.js, background.js | Межкомпонентное общение |
| `chrome.downloads.download` | background.js | Скачивание файлов |

## Правила архитектуры

1. **Без фреймворков** — только vanilla JS, без сборщиков
2. **Manifest V3** — service worker вместо background page
3. **Библиотеки** — хранятся локально в `lib/`, не подгружаются с CDN
4. **Изоляция** — content script работает в IIFE для предотвращения конфликтов с DOM страницы
5. **Async messaging** — все межкомпонентные сообщения асинхронны (`return true` в listener)
