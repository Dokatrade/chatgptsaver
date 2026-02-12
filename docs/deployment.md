# 🚀 Сборка и деплой

## Локальная установка (для разработки)

1. Клонировать репозиторий:
   ```bash
   git clone https://github.com/Dokatrade/chatgptsaver.git
   cd chatgptsaver
   ```

2. Установить npm-зависимости:
   ```bash
   npm install
   ```

3. Загрузить в Chrome:
   - Открыть `chrome://extensions/`
   - Включить **«Режим разработчика»**
   - **«Загрузить распакованное расширение»** → выбрать папку проекта

## Обновление расширения

После изменений в коде:

1. Перейти на `chrome://extensions/`
2. Нажать 🔄 на карточке расширения
3. Закрыть и открыть popup заново (если был открыт)

> **Content script** требует перезагрузки страницы ChatGPT после обновления расширения.

## Версионирование

Версия указывается в двух местах — они **должны совпадать**:

| Файл | Поле | Текущая |
|------|------|---------|
| `manifest.json` | `"version"` | `1.0.0` |
| `package.json` | `"version"` | `1.0.0` |

### Формат версий — [SemVer](https://semver.org/)

- **MAJOR** (1.x.x) — несовместимые изменения
- **MINOR** (x.1.x) — новая функциональность, обратно совместимая
- **PATCH** (x.x.1) — багфиксы

## Подготовка к публикации в Chrome Web Store

### Чек-лист перед публикацией

- [ ] Версия обновлена в `manifest.json` и `package.json`
- [ ] Все функции протестированы (см. [testing.md](./testing.md))
- [ ] Иконки присутствуют: 16×16, 48×48, 128×128
- [ ] `description` в `manifest.json` заполнено
- [ ] Удалены `console.log` для отладки (опционально)
- [ ] `node_modules/` не включена в архив

### Создание архива

```bash
# Упаковать без лишних файлов
# Windows (PowerShell):
Compress-Archive -Path manifest.json, background, content, popup, icons, lib -DestinationPath chatgptsaver.zip
```

### Не включать в архив

- `node_modules/`
- `.git/`
- `.vscode/`
- `.gitignore`
- `package.json`, `package-lock.json`
- `build-fonts.js`, `download-font.js`
- `Noto_Emoji/`
- `*.md` (кроме тех, что нужны)

## Структура архива для Web Store

```
chatgptsaver.zip
├── manifest.json
├── background/
│   └── background.js
├── content/
│   └── content.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── lib/
    ├── pdfmake.min.js
    ├── vfs_fonts.min.js
    ├── vfs_fonts_custom.js
    ├── html2pdf.min.js
    └── jspdf.min.js
```
