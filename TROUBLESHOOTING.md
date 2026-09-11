# TROUBLESHOOTING

Решения типовых проблем при настройке и работе с Claude Code. Если что-то не находишь - открой issue на GitHub.

## Установка и авторизация

### `npm : Невозможно загрузить файл npm.ps1` (Windows)

PowerShell Execution Policy блокирует скрипты. В PowerShell от администратора:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Подтверди. Перезапусти PowerShell. Попробуй команду ещё раз.

### `Error: Claude Code on Windows requires git-bash`

Git установлен, но Claude Code не видит `bash.exe`. В PowerShell:

```powershell
$env:CLAUDE_CODE_GIT_BASH_PATH="C:\Program Files\Git\bin\bash.exe"
```

Затем запусти `claude` - должно заработать.

### «Model may not exist or no access»

Обычно значит одно из:
1. У тебя подписка $20 (Pro), но ты пытаешься использовать Opus - нужен Max от $100.
2. Авторизация слетела. `claude logout` → `claude login`.
3. Ты используешь расширение **GitHub Copilot**, а не **Claude Code**. Это разные вещи. Нужно именно Claude Code от Anthropic.

### «Unable to connect to Anthropic services - ENOTFOUND»

Сетевая ошибка. Проверь:
1. VPN включён (если из РФ - обязательно).
2. VPN-страна не прыгает - держи одну страну постоянно.
3. Интернет работает вообще (`ping google.com`).

### Не могу установить Claude Code из РФ

Без VPN - не получится авторизоваться. Варианты:
1. VPN одной страны (Нидерланды / Турция / Сербия), никогда не выключать.
2. Для SMS-верификации - сервис онлайн-номеров (например, оформление e-SIM в другой стране).
3. План Б: **GLM 5.1** через Anthropic-совместимый endpoint (z.ai). Работает без Anthropic.

### В VS Code не вижу иконку Claude

1. Проверь что расширение **Claude Code** от Anthropic установлено (не GitHub Copilot).
2. Reload Window: `Cmd/Ctrl + Shift + P` → `Developer: Reload Window`.
3. Проверь что расширение активировано (Extensions → Claude Code → Enable).

## Папки и файлы

### Не вижу `.business/` в сайдбаре VS Code

VS Code по умолчанию скрывает папки с точкой. В `.vscode/settings.json` этого шаблона уже прописано:

```json
{"files.exclude": {"**/.business": false}}
```

Если всё равно не видно - `Cmd/Ctrl + Shift + P` → `Developer: Reload Window`.

### У меня несколько бизнесов - как вести `.business/`?

Два подхода:
1. **Один проект на бизнес** - у каждого свой репо шаблона, своя `.business/`. Рекомендуется.
2. **Моно-репо с подпапками** - `./businesses/biz-1/.business/`, `./businesses/biz-2/.business/`. В `CLAUDE.md` чётко укажи какой `.business/` читать в какой папке.

### Как перенести существующий проект в шаблон

Возьми промпт `prompts/methodology/import-existing-project.md` - Клод прочитает твой текущий код и заполнит `.business/` на основе того что найдёт.

## Работа с Клодом

### Клод долго думает (>5-10 минут)

1. Подожди. Иногда на сложных задачах это нормально.
2. Если больше 10 минут - Esc → переформулируй промпт короче и конкретнее.
3. Не создавай новый чат ради «перезапуска» - потеряешь контекст.

### Клод не понимает задачу

Признаки: отвечает общими словами, делает не то, путает файлы.
Причины:
1. Слишком длинный контекст (>60%). Команда `/compact` или `/clear`.
2. Промпт слишком размытый. Добавь конкретику: файлы, примеры, критерий готовности.
3. Не прочитал `.business/INDEX.md`. Начни промпт с «сначала прочитай `.business/INDEX.md`».

### Bypass Permissions - надо или нет?

Bypass = Клод не спрашивает разрешения на каждую команду. Удобнее, но опаснее.

Стартер не включает этот режим. Для самостоятельной работы согласуй локальный объём, ограничь доступы и используй тестовую среду. Конкретные разрешения проверяй в установленной версии инструмента.

Git-коммит сохраняет отслеживаемый код, но не отменяет платежи, отправки, утечки и удаление рабочей БД. Несколько deny-правил не заменяют изоляцию ОС и ограничение сети. Не используй обход разрешений как решение зависшего запроса доступа.

### Альтернативные окружения

Общие правила поддерживают **Claude Code и Codex**: входные файлы `CLAUDE.md` и `AGENTS.md` ведут к одной методологии. Установка не требует VS Code. Настройки разрешений, уведомлений и субагентов зависят от инструмента; Claude hooks не становятся настройками Codex. Desktop/Cowork не считаются проверенными средами этой установки.

### Голосовой ввод не работает

**Wispr Flow** (лучший на рынке, платный, Mac + Windows) - [wisprflow.ai](https://wisprflow.ai).
**Super Whisper** - альтернатива для Mac.
**Встроенный fallback:** Mac - System Settings → Keyboard → Dictation. Windows - `Win + H`.

Если Wispr не запускается на Mac - проверь разрешения: System Settings → Privacy → Microphone + Accessibility.

## Git и деплой

### `git commit` говорит «please tell me who you are»

Не настроен `user.name` или `user.email`. Локально для проекта:

```bash
git config user.name "Твоё Имя"
git config user.email "email@example.com"
```

### Случайно закоммитил `.env`

Сразу:
1. `git rm --cached .env`
2. Добавь `.env` в `.gitignore` (проверь что уже там).
3. `git commit -m "remove accidentally committed .env"`
4. **Если уже запушил в публичный репо** - **ротейт все ключи**, которые были в `.env`. Они скомпрометированы.

Для деплоя / платежей - см. `prompts/launch/`.
