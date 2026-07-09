# Changelog

Все значимые изменения шаблона. Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/) + semver.

## [Unreleased]

### Безопасность
- Правило «секреты без fallback» в разделе «Безопасность» `CLAUDE.md`: запрет дефолтов для `JWT_SECRET`, ключей шифрования и паролей БД (`?? 'dev-secret'`, добивка ключа нулями и т.п.). Без обязательной env-переменной приложение должно падать при старте, а не молча запускаться на проде с секретом из публичного репо (иначе - тривиальный обход авторизации). Наблюдение с реального форка стартера: Claude по умолчанию генерирует такие «удобные» fallback'и, если это не запрещено явно.

### Планируется (v1.1.0+)
- Live-тест онбординга на 1-2 нетехнических пользователях
- Альтернативные плейсхолдеры `marketing/funnel.md` и `products/pricing.md` под воронку услуг и прайс-лист (не только e-commerce/SaaS)
- Расширение `scripts/security-audit.sh` - автоматизация ручных grep-проверок
- Автоматический `npx`-апдейтер для переноса новых промптов в существующий проект пользователя
- Bilingual README (EN)

## [1.0.3] - 2026-04-24

### Безопасность ПДн в `examples/coffeeshop/`

Финальный параноидальный security audit перед публичным релизом. Убраны потенциальные совпадения с реальными людьми/организациями в примере:

- **ФИО:** «Марат Галеев» / «ИП Галеев Марат Ринатович» → обобщено до «Основатель» / «ИП (УСН 6%)». Имя-фамилия-отчество могли случайно совпасть с реальным человеком.
- **Telegram-хендлы:** `@maratcoffee` и `@coffeeplace_kzn` убраны. Реальные короткие хендлы часто заняты живыми людьми.
- **Контакты:** конкретные URL (`coffeeplace.ru/offer`, `coffeeplace.ru/privacy`) обобщены до `[домен]/offer`. Банк (Альфа-Банк) и касса (Эвотор) убраны из юр. реквизитов.
- **Дисклеймеры:** жирное предупреждение «Вымышленный пример» добавлено в `examples/README.md`, `examples/coffeeshop/.business/INDEX.md`, `company/team.md`, `company/legal.md`.
- **Город:** Казань → «региональный центр» в `company/legal.md`. (Упоминания Казани в marketing/audience остались — это сценарий, а не ПДн.)

## [1.0.2] - 2026-04-24

### Убрано
- Все упоминания Loom/демо-видео из README и CHANGELOG. Шаблон объясняется текстом + живым примером `examples/coffeeshop/`, который уже даёт полную картину результата без необходимости в видео.

## [1.0.1] - 2026-04-24

### Добавлено (подготовка к публичному релизу)
- **`examples/coffeeshop/`** - полный пример заполненного проекта (вымышленная сеть кофеен Coffee Place в Казани). Все 7 блоков `.business/`, execution с текущей неделей и бэклогом, один рабочий план (подписка Coffee Monthly) и ретроспектива фазы 1. Служит образцом результата онбординга для новых пользователей
- **`SECURITY.md`** - политика сообщения об уязвимостях (GitHub Security Advisory + контакты), таймлайн реакции, что считается / не считается уязвимостью
- **`CODE_OF_CONDUCT.md`** - Contributor Covenant v2.1 с применимостью для проекта
- **`.github/ISSUE_TEMPLATE/`** - шаблоны: `bug-report.yml` (с обязательными полями ОС/версия Claude Code/шаги), `feature-request.yml` (с фильтром универсальности), `question.yml` (роутинг в Discussions), `config.yml` (ссылки на Discussions, Security Advisory, документацию)

### Обновлено
- **README badges:** версия релиза, MIT-лицензия, статус CI security audit, PRs welcome
- **README FAQ:** 9 вопросов - «почему этот а не пустой CLAUDE.md», «бесплатно ли», «есть ли английская», «сколько токенов», «что если закрою ноут», «что если AUTOPILOT ошибётся», «работает ли в Cursor/Codex», «коммерческое использование», «куда писать»
- **README TL;DR** в 3 строки на первом экране - чтобы пользователь за 10 секунд понял что делать
- **README ссылка на `examples/coffeeshop/`** - показать результат до онбординга
- **LICENSE copyright:** «Artemii Miller / Школа Смысло-кодинга» - согласовано с фактическим владельцем репозитория
- **README URL для клонирования:** `artemiimillier/claude-code-starter` вместо placeholder `smyslokoding/claude-code-starter`

## [1.0.0] - 2026-04-23

## [1.0.0] - 2026-04-23

### Первый публичный релиз

Шаблон прошёл глубокое ревью (17 проблем найдено и закрыто), dry run на 2 разных нишах (стоматология - commercial B2C услуги, SalesTrack - non-commercial внутренний tool), финальный security audit и pre-release чеклист.

#### Что получает пользователь
- **AUTOPILOT** из 10 шагов с возобновлением после паузы, Reality Check после блока products, поддержкой commercial и non-commercial веток
- **CLAUDE.md** - правила работы с агентом (8 принципов + безопасность + 5 триггеров планирования)
- **.business/** - «второй мозг» проекта с 7 подпапками (company, products, audience, goals, economics, marketing, assets) + execution/ для операционного планирования
- **plans/** и **retrospectives/** с README и TEMPLATE
- **prompts/** - 16 готовых промптов под типовые задачи (setup 9, launch 3, methodology 4)
- **templates/** - CLAUDE.md.tmpl + claude-settings.json.example (hooks + 4 категории запретов безопасности в 9 regex)
- **scripts/security-audit.sh** - локальная проверка перед публикацией форка
- **.github/workflows/security-audit.yml** - CI-проверка при push
- **.github/hooks/pre-commit.sample** - защита от случайного коммита секретов
- **TROUBLESHOOTING.md** - решения типовых проблем при установке и работе
- **CONTRIBUTING.md** - фильтр универсальности для PR
- Удалены внутренние рабочие файлы автора (TEST-PROTOCOL.md, рабочие ретро) - `retrospectives/` содержит только `README.md` и `TEMPLATE.md` как образец

#### Подтверждённые инварианты
- AUTOPILOT запускается с любой первой фразы (СТОП-инструкция в начале CLAUDE.md)
- Честные 90-120 мин + точка паузы после шага 7
- Возобновление через `last_completed_step` (включая подшаги 8.N для интервью)
- `.business/` видна в сайдбаре VS Code (.vscode/settings.json)
- Reality Check после products (2-3 риска, один абзац)
- 2 ветки проекта: commercial / non-commercial
- `prompts/INDEX.md` + правило «ищи перед генерацией»
- Нейтральные имена `prompts/setup|launch|methodology/`
- Брендовая часть (Школа Смысло-кодинга) только в footer README + CTA AUTOPILOT + skill attribution

## [0.5.0] - 2026-04-23

### Исправлено (P1 - non-commercial ветка после dry run)
- AUTOPILOT шаг 8 правило 7 теперь явно описывает что делать с каждым файлом в non-commercial режиме: заглушка «не применимо для некоммерческого проекта» с пояснением причины (`economics/unit-economics.md`, `economics/revenue.md`, `economics/forecast.md`, `marketing/funnel.md`, `marketing/competitors.md`, `assets/testimonials.md`). Пометка «(не применимо для некоммерческого)» в `INDEX.md`. Структура `.business/` остаётся целой - если проект перейдёт в коммерческий, достаточно заменить заглушки содержимым.
- `marketing/content.md` добавлен в список заполняемых для non-commercial (обучающие материалы для пользователей).

## [0.4.0] - 2026-04-23

### Исправлено (P0 - безопасность данных пользователя)
- README больше не утверждает что `.business/` защищена из коробки - чётко объясняет что `.business/` tracked в шаблоне, защита включается на 10a AUTOPILOT
- AUTOPILOT шаг 10a теперь выполняет `git rm -r --cached .business/` перед первым коммитом - иначе заполненные бизнес-данные попадали в историю git несмотря на `.gitignore`
- `retrospectives/README.md` больше не ссылается на несуществующий `HELLO-test.md` - указывает на `TEMPLATE.md`

### Исправлено (P1 - логика и честность)
- Удалён дубль `.business/execution/monthly.md` (единственный источник фокуса месяца - `goals/monthly.md`, обогащён секциями «связь с кварталом» и «итог месяца»)
- README: «20+ промптов» исправлено на фактические «16»
- Убрана ссылка на личный репо автора методологии из `prompts/setup/08-skills-install.md` - Bulletproof описан как опциональный без конкретного URL
- AUTOPILOT шаг 1: удалён неиспользуемый вопрос «Ты из России?» - теперь пассивное правило «если пользователь сам упомянул - напомни про VPN»
- Плейсхолдеры `.business/economics/unit-economics.md` и `.business/products/pricing.md` больше не предлагают «переименуй файл» - логика ветвления только в AUTOPILOT
- `.business/INDEX.md` больше не врёт про «не попадает в git» - честно описывает модель tracking + защита на 10a

### Исправлено (P2 - качество документации)
- Убраны em-dash (—) из README, CONTRIBUTING, CHANGELOG, TEST-PROTOCOL, templates/README, execution/README (правило из CONTRIBUTING теперь соблюдается)
- Удалены пустые папки `templates/plans/` и `templates/retrospectives/`
- README дополнен `.github/`, `scripts/`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE` в дереве структуры

### Улучшено (P3)
- AUTOPILOT шаг 3: добавлен вариант «Другое - скажи мне какой стек» для Go/Rust/Elixir/.NET/Java
- AUTOPILOT шаг 5: формулировка «4 запрета = 9 regex» чтобы пользователь не удивлялся количеству строк в settings.json
- `CLAUDE.md` таблица «Где что искать» дополнена строками про `retrospectives/` и `.business/execution/`

## [0.3.0] - 2026-04-23

### Добавлено
- `scripts/security-audit.sh` - автоматическая проверка утечек перед публикацией
- `.github/workflows/security-audit.yml` - CI-проверка на каждый push
- `.github/hooks/pre-commit.sample` - защита пользователей шаблона от случайного коммита секретов
- `.business/execution/` - папка для еженедельного планирования с README, monthly.md, backlog.md, TEMPLATE-week.md

## [0.2.0] - 2026-04-23

### Добавлено
- 16 готовых промптов в `prompts/`:
  - `setup/` (9) - голосовой ввод, hooks, security, интервью, CLAUDE.md, plans, тест-цикл, skills с аудитом, Playwright
  - `launch/` (3) - GitHub, деплой, платежи
  - `methodology/` (4) - критика плана, «10 причин обосраться», импорт проекта, планирование недели

## [0.1.0] - 2026-04-23

### Добавлено
- Структура репо: `CLAUDE.md`, `AUTOPILOT.md`, `.business/` (7 подпапок), `plans/`, `retrospectives/`, `templates/`
- AUTOPILOT с 10 шагами онбординга, frontmatter-флагами, возобновлением после паузы, Reality Check
- CLAUDE.md с СТОП-инструкцией для автозапуска AUTOPILOT
- `.vscode/settings.json` для видимости `.business/`
- TROUBLESHOOTING.md со решениями типовых проблем
- `templates/CLAUDE.md.tmpl` для генерации под пользователя
- MIT LICENSE, README, .gitignore
