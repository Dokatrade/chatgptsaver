# ChatGPT Context Saver

Chrome-расширение для сохранения длинных бесед ChatGPT в TXT, Markdown, PDF или EPUB.

## Возможности

- Экспорт сообщений пользователя и ассистента из текущей беседы ChatGPT
- Форматы TXT, Markdown, PDF и EPUB
- Сохранение Markdown-разметки: заголовки, списки, ссылки, inline-code и code blocks
- PDF-экспорт через локальный pdfmake с поддержкой эмодзи через Noto Emoji
- EPUB-экспорт через встроенный генератор EPUB 3 без дополнительных runtime-зависимостей
- Автоматическое имя файла на основе названия чата, даты и количества сообщений
- Поддержка `chatgpt.com` и `chat.openai.com`
- Fallback-инжект content script после перезагрузки расширения без reload страницы

## Установка

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/Dokatrade/chatgptsaver.git
   cd chatgptsaver
   ```

2. Установите зависимости:
   ```bash
   npm install
   ```

3. Загрузите расширение в Chrome:
   - Откройте `chrome://extensions/`
   - Включите "Режим разработчика"
   - Нажмите "Загрузить распакованное расширение"
   - Выберите папку проекта

## Использование

1. Откройте беседу на `chatgpt.com` или `chat.openai.com`
2. Нажмите на иконку расширения
3. При необходимости измените имя файла
4. Выберите TXT, Markdown, PDF или EPUB
5. Нажмите "Сохранить чат"

## Проверки и упаковка

```bash
npm test
npm run package
```

`npm test` проверяет базовую целостность проекта: Manifest V3, совпадение версий, нужные файлы, permissions и popup-зависимости.

`npm run package` создаёт `chatgptsaver.zip` из runtime-файлов расширения: `manifest.json`, `background/`, `content/`, `popup/`, `icons/`, `lib/`.

## Структура проекта

```
├── background/       # Service worker
├── content/          # Content scripts
├── icons/            # Иконки расширения
├── lib/              # Библиотеки
├── popup/            # UI popup-окна
├── manifest.json     # Конфигурация расширения
└── package.json      # Зависимости npm
```

## Документация

- [Архитектура](docs/architecture.md)
- [Тестирование](docs/testing.md)
- [Зависимости](docs/dependencies.md)
- [Деплой](docs/deployment.md)

## Лицензия

ISC
