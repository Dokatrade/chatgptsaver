# ChatGPT Context Saver

Chrome-расширение для сохранения контекста длинных бесед в ChatGPT в .txt файл для продолжения в новом чате.

## 🚀 Возможности

- Сохранение истории беседы ChatGPT в текстовый файл
- Поддержка chatgpt.com и chat.openai.com
- Простой интерфейс через popup

## 📦 Установка

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

## 🛠️ Структура проекта

```
├── background/       # Service worker
├── content/          # Content scripts
├── icons/            # Иконки расширения
├── lib/              # Библиотеки
├── popup/            # UI popup-окна
├── manifest.json     # Конфигурация расширения
└── package.json      # Зависимости npm
```

## 📋 Использование

1. Откройте беседу на chatgpt.com или chat.openai.com
2. Нажмите на иконку расширения
3. Сохраните контекст беседы

## 📄 Лицензия

ISC
