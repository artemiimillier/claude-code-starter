# ADMIN — справочник админ-команд проекта

Все управляющие операции проекта живут в `./admin.sh` (корень репо).
Этот файл — карта команд для ИИ и человека: **что вызывать, что оно делает, какие предусловия**.

> Когда задача звучит как «запусти», «подними», «перезапусти», «закоммить», «забэкапь», «открой админку» — **первым делом смотри сюда** и зови `./admin.sh <команда>`. Не изобретай свой пайплайн, не пиши `npm run dev` руками.

## Запуск

| Команда                       | Что делает                                              | Предусловия                  |
| ----------------------------- | ------------------------------------------------------- | ---------------------------- |
| `./admin.sh stack-up`         | Поднимает MySQL (docker), стартует Next.js dev на :3000 | Docker, web/.env, npm install |
| `./admin.sh app`              | Только Next.js dev на :3000 (БД должна уже работать)    | Docker mysql up              |
| `./admin.sh app-port`         | Next.js dev на выбранном порту (спросит интерактивно)   | то же                        |
| `./admin.sh restart`          | `stop` + `stack-up`                                     | Docker                       |
| `./admin.sh stop`             | Останавливает контейнеры compose и убивает `next dev`   | —                            |

## База данных (MySQL :3308 host → :3306 container)

| Команда                       | Что делает                                                       |
| ----------------------------- | ---------------------------------------------------------------- |
| `./admin.sh adminer`          | Поднимает Adminer (профиль `admin`), открывает `http://localhost:8080` |
| `./admin.sh adminer-stop`     | Останавливает Adminer                                            |
| `./admin.sh db-shell`         | `mysql` CLI внутри контейнера, БД `second_brain`, юзер `app`     |
| `./admin.sh db-logs`          | `docker logs -f --tail=200 second-brain-mysql`                   |
| `./admin.sh db-dump`          | `mysqldump` в `backups/second_brain_<TS>.sql`                    |

Adminer объявлен в `docker-compose.yml` под `profiles: ["admin"]` — основной `up` его не поднимает.

## Разработка

| Команда                  | Что делает                                |
| ------------------------ | ----------------------------------------- |
| `./admin.sh install`     | `npm ci || npm install` в `web/`          |
| `./admin.sh build`       | `next build` (production)                 |
| `./admin.sh lint`        | ESLint                                    |
| `./admin.sh typecheck`   | `tsc --noEmit`                            |
| `./admin.sh clean-cache` | удаляет `web/.next` и `node_modules/.cache` |

## Git

| Команда                | Что делает                                                                     |
| ---------------------- | ------------------------------------------------------------------------------ |
| `./admin.sh status`    | Текущая ветка, последние 5 коммитов, `git status -s`                           |
| `./admin.sh ai-commit` | Спросит `[a]` все или `[s]` staged → `claude` составит conventional-commit и закоммитит |
| `./admin.sh push`      | `git push -u origin <current-branch>` после подтверждения                      |

`ai-commit` требует `claude` CLI в `PATH`. Использует `--allowedTools "Bash,Read"` и просит модель составить conventional-commit на русском (≤72 символа). Без `--no-verify`.

## Анализ

| Команда                       | Что делает                                                          |
| ----------------------------- | ------------------------------------------------------------------- |
| `./admin.sh analyze-daily`    | `scripts/analyze.sh daily` — ежедневный анализ через Claude         |
| `./admin.sh analyze-weekly`   | `scripts/analyze.sh weekly` — недельный дайджест                    |
| `./admin.sh security-audit`   | `scripts/security-audit.sh` — локальный поиск секретов и личных данных |

## Прочее

| Команда                | Что делает                                  |
| ---------------------- | ------------------------------------------- |
| `./admin.sh open-app`  | Открывает `http://localhost:3000`           |
| `./admin.sh logs-dev`  | `tail -f web/.next/dev.log` (если файл есть) |
| `./admin.sh help`      | Полная справка                              |
| `./admin.sh list`      | Все пункты меню в виде таблицы              |

## Интерактивное меню

`./admin.sh` без аргументов — TUI-меню с группами и нумерацией:

```
▌ Запуск
   1  Запустить сервер и приложение
   2  Запустить только приложение
   3  Запустить с выбором порта
   4  Рестарт
   5  Остановить всё
…
```

Управление: ввести номер пункта или slug команды (см. таблицы выше). `h` — справка, `q` — выход.

## Переменные окружения

| Имя           | По умолчанию | Назначение                          |
| ------------- | ------------ | ----------------------------------- |
| `APP_PORT`    | `3000`       | Порт Next.js dev по умолчанию       |
| `ADMINER_PORT`| `8080`       | Порт Adminer на хосте               |

## Правила для ИИ-агентов

1. **Не дублируй пайплайны.** Если уже есть `./admin.sh <slug>` — вызывай его, а не `cd web && npm run dev`.
2. **Для коммитов используй `./admin.sh ai-commit`.** Не вызывай Claude CLI напрямую и не пиши свои `git commit -m`, кроме случаев, когда пользователь явно просит ручное сообщение.
3. **Перед `stack-up` / `app` / `restart`** убедись, что `web/node_modules` есть. Если нет — `./admin.sh install`.
4. **Деструктивные пункты** (`stop`, `clean-cache`, `db-dump`, `restart`) запускай только по явной просьбе пользователя.
5. **Расширение меню.** Если появляется новая постоянно используемая команда — добавь её в `admin.sh` (массив `MENU` + функция `cmd_<slug>`) и в этот файл. Не создавай отдельный shell-скрипт в корне.
6. **Программный режим.** `./admin.sh <slug>` запускает команду без меню — удобно для автоматизации и хуков.

## Связанные файлы

- [`admin.sh`](admin.sh) — сами команды
- [`docker-compose.yml`](docker-compose.yml) — MySQL и Adminer (профиль `admin`)
- [`scripts/analyze.sh`](scripts/analyze.sh), [`scripts/security-audit.sh`](scripts/security-audit.sh) — обёртки, которые зовёт `admin.sh`
- [`CLAUDE.md`](CLAUDE.md) — общие правила работы с агентом
- [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — решения типовых проблем
