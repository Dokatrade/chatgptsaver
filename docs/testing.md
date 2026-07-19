# 🧪 Тестирование

## Подход

Проект использует **ручное тестирование** в браузере Chrome, лёгкую автоматическую проверку целостности проекта и fixture-тесты extraction-логики.

## Автоматическая проверка

```bash
npm test
```

Команда проверяет:

- `manifest.json` использует Manifest V3
- версии в `manifest.json` и `package.json` совпадают
- обязательные runtime-файлы существуют
- нужные permissions и host permissions объявлены
- скрипты, подключённые в `popup/popup.html`, существуют
- content scripts из `manifest.json` существуют
- `jsdom` fixtures покрывают основные DOM-сценарии извлечения сообщений
- fixture длинного виртуализированного чата проверяет DOM quiescence, unconditional bottom stabilization и delayed mounting последних conversation turns
- EPUB fixture проверяет ZIP-контейнер, обязательные файлы EPUB 3 и базовый XHTML escaping

Fixture-тесты находятся в `scripts/test-extractor.js` и запускают реальный `content/extractor.js`.

## Загрузка расширения для тестирования

1. Открыть `chrome://extensions/`
2. Включить **«Режим разработчика»** (переключатель в правом верхнем углу)
3. Нажать **«Загрузить распакованное расширение»**
4. Выбрать корневую папку проекта

> После изменения кода — нажать кнопку 🔄 на карточке расширения для перезагрузки.

## Чек-лист тестирования

### Content Scripts (`extractor.js` / `content.js`)
- [ ] `content/extractor.js` и `content/content.js` загружаются на `chatgpt.com`
- [ ] `content/extractor.js` и `content/content.js` загружаются на `chat.openai.com`
- [ ] Сообщения корректно извлекаются из DOM
- [ ] Заголовок чата определяется правильно
- [ ] Вложенные списки, блоки кода, ссылки парсятся корректно
- [ ] Работает fallback-извлечение (`extractMessagesAlternative`)
- [ ] Длинный чат экспортируется полностью после программного сканирования conversation viewport
- [ ] Последние сообщения не теряются, если ChatGPT домонтирует bottom turns после достижения нижней границы

### Popup (`popup.html` / `popup.js`)
- [ ] Popup открывается по клику на иконку
- [ ] Popup доинжектит content script после перезагрузки расширения без reload страницы ChatGPT
- [ ] Имя файла генерируется автоматически
- [ ] Сохранение в TXT работает
- [ ] Сохранение в MD работает
- [ ] Сохранение в PDF работает
- [ ] Сохранение в EPUB работает
- [ ] Скачивание файла запускает диалог «Сохранить как»
- [ ] Ошибки скачивания обрабатываются корректно
- [ ] Эмодзи отображаются в PDF (шрифт Noto Emoji)
- [ ] Markdown-форматирование сохраняется в PDF (жирный, курсив, код)
- [ ] EPUB открывается в EPUB-читалке и содержит роли, ссылки, списки и code blocks
- [ ] Статус-сообщения отображаются корректно

### Background (`background.js`)
- [ ] Service worker регистрируется без ошибок
- [ ] `chrome.runtime.onInstalled` выполняется при установке/обновлении

## Отладка

### DevTools для popup
1. Правый клик на иконке расширения → **«Просмотреть всплывающее окно»**
2. Откроется отдельное окно DevTools для popup

### DevTools для content script
1. На странице ChatGPT → **F12** → вкладка **Console**
2. Искать логи с префиксом `ChatGPT Context Saver:`

### DevTools для service worker
1. `chrome://extensions/` → карточка расширения
2. Клик на **«Service Worker»** → откроется DevTools

## Типичные проблемы

| Проблема | Причина | Решение |
|----------|---------|---------|
| Popup не открывается | Ошибка в manifest.json | Проверить консоль на `chrome://extensions/` |
| Сообщения не извлекаются | Изменилась DOM-структура ChatGPT | Обновить селекторы в `content/extractor.js` и добавить fixture |
| PDF пустой | Ошибка в pdfmake-документе | Проверить структуру в DevTools popup |
| Эмодзи не отображаются | Не загружен шрифт Noto Emoji | Проверить `vfs_fonts_custom.js` |
| EPUB не открывается | Сломана ZIP/XHTML/OPF-структура | Запустить `npm test`, затем проверить файл в EPUB-читалке |
