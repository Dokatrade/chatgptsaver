# 🤖 Agents — карта правил репозитория

> **ChatGPT Context Saver** — Chrome-расширение (Manifest V3) для сохранения контекста длинных бесед ChatGPT в TXT/PDF.

## Стек

`JavaScript (vanilla ES6+)` · `HTML/CSS` · `Chrome Extensions API` · `pdfmake` · `Noto Emoji`

---

## 📖 Карта документации

### 🏗️ [Архитектура](docs/architecture.md)
Компоненты расширения, поток данных между popup / content script / background, используемые Chrome API. **Читать первым** для понимания структуры проекта.

### 📐 [Стиль кода](docs/code-style.md)
Форматирование, именование переменных/функций, структура файлов, правила комментирования, работа с DOM и обработка ошибок.

### 🔀 [Git-воркфлоу](docs/git-workflow.md)
Формат коммитов (Conventional Commits), стратегия ветвления, правила `.gitignore`, порядок создания коммитов.

### 🧪 [Тестирование](docs/testing.md)
Ручное тестирование в Chrome, чек-листы проверки каждого компонента, отладка через DevTools, типичные проблемы и решения.

### 📦 [Зависимости](docs/dependencies.md)
npm-пакеты, библиотеки в `lib/`, шрифты Noto Emoji, правила обновления зависимостей, пересборка VFS-шрифтов.

### 🚀 [Сборка и деплой](docs/deployment.md)
Локальная установка, обновление расширения, версионирование (SemVer), подготовка архива для Chrome Web Store.

---

## 🗂️ Структура проекта

```
chatgptsaver/
├── agents.md              ← вы здесь
├── docs/                  ← правила и гайдлайны
│   ├── architecture.md
│   ├── code-style.md
│   ├── git-workflow.md
│   ├── testing.md
│   ├── dependencies.md
│   └── deployment.md
├── manifest.json          ← конфигурация расширения
├── background/            ← service worker
├── content/               ← content scripts (DOM-извлечение)
├── popup/                 ← UI расширения
├── lib/                   ← runtime-библиотеки
├── icons/                 ← иконки расширения
└── package.json           ← npm-конфигурация
```

---

## ⚡ Быстрый старт для агента

1. Прочитай **[architecture.md](docs/architecture.md)** — пойми, как устроено расширение
2. Прочитай **[code-style.md](docs/code-style.md)** — соблюдай стиль кода проекта
3. Прочитай **[git-workflow.md](docs/git-workflow.md)** — следуй конвенциям коммитов
4. Перед отправкой изменений — пройди чек-лист из **[testing.md](docs/testing.md)**
5. При работе с зависимостями — сверяйся с **[dependencies.md](docs/dependencies.md)**
6. При подготовке релиза — следуй **[deployment.md](docs/deployment.md)**
