# Phase 1 — Telegram аккаунт: авторизация + импорт истории

## Цель
Подключить личный Telegram-аккаунт через GramJS, выгрузить историю сообщений
с параметром `hours` (0 = вся история), сохранить в MySQL.

## Стек
- `telegram` (gramjs) — клиент Telegram MTProto
- `@anthropic-ai/sdk` — для AI-анализа (Phase 2+)
- In-memory Map для состояния auth сессии и job-прогресса
- SSE / polling для прогресса импорта

## Новые таблицы БД
- `tg_sessions(user_id, session_string_enc, phone, updated_at)`
- `import_jobs(id, user_id, status, progress, total, error, started_at, completed_at)`
- `contacts(id, user_id, tg_id, name, username, type, first_seen, last_seen, meta_json)`

## API routes
```
POST /api/telegram/auth/start     { phone }         → { phoneCodeHash }
POST /api/telegram/auth/verify    { phone, code,    → { ok } | { need2FA }
                                    phoneCodeHash,
                                    password? }
GET  /api/telegram/auth/status                      → { connected, phone }
DELETE /api/telegram/auth                           → { ok }

POST /api/telegram/import         { hours }         → { jobId }
GET  /api/telegram/import/[jobId]                   → { status, progress, total, error }
```

## Auth flow (UI)
```
[Введи номер телефона]
        ↓ POST /auth/start
[Введи код из Telegram]
        ↓ POST /auth/verify
   если need2FA:
[Введи облачный пароль]
        ↓ POST /auth/verify + password
[Подключено ✓]
```

## Import flow
1. POST /import { hours } → jobId
2. Фоновый процесс (не блокирует route):
   - getDialogs() → список чатов
   - для каждого чата: getMessages() → фильтр по дате
   - batch INSERT в messages
   - upsert в contacts
   - обновление job прогресса в memory Map
3. GET /import/[jobId] → polling каждые 2с

## Фазы

- [ ] 1.1 Установка зависимостей (telegram, @anthropic-ai/sdk)
- [ ] 1.2 DB миграция (tg_sessions, import_jobs, contacts)
- [ ] 1.3 lib/telegram-auth.ts — in-memory auth state + sendCode/signIn/check2FA
- [ ] 1.4 lib/telegram-import.ts — импорт диалогов + сохранение
- [ ] 1.5 API routes (auth/start, auth/verify, auth/status, import)
- [ ] 1.6 UI: обновить страницу connections — блок TG Account с auth flow
- [ ] 1.7 UI: страница /dashboard/import с прогресс-баром
- [ ] 1.8 TypeScript check

## Результат
Пользователь заходит в дашборд → подключает аккаунт → нажимает "Импорт" →
видит прогресс → в MySQL появляются messages + contacts.
