# 📐 Стиль кода

## Язык и стек

- **JavaScript** (vanilla, ES6+)
- **HTML5** + **CSS3** (без препроцессоров)
- Без TypeScript, без фреймворков, без сборщиков

## Форматирование

| Параметр | Значение |
|----------|---------|
| Отступы | 4 пробела |
| Кавычки | Одинарные `'...'` |
| Точка с запятой | Обязательна |
| Максимальная длина строки | ~120 символов |
| Trailing comma | Нет |

## Именование

| Сущность | Стиль | Пример |
|----------|-------|--------|
| Переменные | camelCase | `chatInfoLoaded`, `saveBtn` |
| Функции | camelCase | `extractAllMessages()`, `buildFilename()` |
| Константы | camelCase или UPPER_SNAKE_CASE | `emojiRegex`, `MAX_RETRIES` |
| CSS-классы | kebab-case | `.status-message`, `.save-btn` |
| ID элементов | camelCase | `#saveBtn`, `#filename` |
| Файлы | kebab/snake через точку | `popup.js`, `content.js` |

## Структура файла

```
// Описание файла (комментарий)

// Импорты / подключения (если есть)

// Константы и конфигурация

// Вспомогательные функции (helpers)

// Основная логика

// Инициализация / слушатели событий
```

## Комментарии

- **Однострочные** (`//`) — пояснение логики перед блоком кода
- **Над функцией** — краткое описание назначения
- **Язык** — английский для кода и комментариев
- Не комментировать очевидные вещи

```javascript
// ✅ Хорошо
// Transliterate Cyrillic to Latin
function transliterate(text) { ... }

// ❌ Плохо
// This function returns a number
function getCount() { return count; }
```

## DOM-взаимодействие

1. Получать элементы через `document.getElementById()` или `document.querySelector()`
2. Кэшировать ссылки на элементы в переменных в начале скрипта
3. Content scripts — оборачивать в IIFE с `'use strict'`

```javascript
// ✅ Паттерн content script
(function () {
    'use strict';
    // ...код...
})();
```

## Обработка ошибок

- Оборачивать внешние вызовы (Chrome API, DOM) в `try/catch`
- Логировать ошибки через `console.error()` с префиксом расширения
- Всегда предусматривать fallback-значения

```javascript
try {
    const result = await someOperation();
} catch (error) {
    console.error('ChatGPT Context Saver Error:', error);
    showStatus('Ошибка', 'error');
}
```

## Асинхронность

- Использовать `async/await` вместо колбэков где возможно
- В `chrome.runtime.onMessage` — возвращать `true` для асинхронных ответов
