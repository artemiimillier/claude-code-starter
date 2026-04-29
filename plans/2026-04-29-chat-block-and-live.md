# План: блокировка чатов + live-приёмник

## Цель
1. Запретить обработку новых сообщений из произвольного чата (блокировка).
2. Удалить накопленные данные одного чата без удаления контакта.
3. После удаления — чекбокс «Не загружать новые» в модалке.
4. Видеть список заблокированных, в т.ч. тех, у которых уже нет сообщений.
5. Live-приёмник новых сообщений — апдейт `messages` и `contacts`, с уважением блокировок.

## Архитектура

### БД
Новая таблица `chat_blocks` (хранит блок даже для уже стёртых чатов):
```sql
chat_blocks (
  id INT PK,
  user_id INT FK->users,
  chat_id BIGINT,
  chat_name VARCHAR(255),
  chat_type ENUM('private','group','channel'),
  blocked_at DATETIME,
  UNIQUE(user_id, chat_id)
)
```
Миграция в `web/src/lib/db.ts` под `migrate()`.

### API
- `GET /api/data/chats` — для каждой строки добавить `blocked: boolean`. UNION с осиротевшими блоками (count=0).
- `POST /api/data/chats/[chatId]/block` body `{ blocked: boolean, name?, type? }`.
- `DELETE /api/data/chats/[chatId]` body `{ block: boolean }` — удаляет messages, опционально создаёт chat_blocks.
- Новый хелпер `web/src/lib/chat-blocks.ts`: `isBlocked`, `setBlocked`, `unblock`, `listBlocked`.

### Импорт
В `runImport` ([telegram-import.ts:59](web/src/lib/telegram-import.ts:59)) — перед обработкой dialog'а проверять `isBlocked(userId, chatId)` → `continue`.

### Live-приёмник
Singleton-диспетчер: `web/src/lib/telegram-live.ts`.
- `instrumentation.ts` (Next 16) — на boot стартует диспетчер.
- Диспетчер при старте: загружает все `tg_sessions`, поднимает `TelegramClient` per user, вешает `addEventHandler(NewMessage)`.
- Хук `register(userId)` — зовётся после успешной авторизации (verify code/2FA).
- Хук `unregister(userId)` — на logout.
- Обработчик: resolve chat meta → `isBlocked` → skip; иначе `INSERT … source='live'`, upsert contact, обновить `last_seen`/`msg_count`.
- На любой ошибке клиента — отдельный try/catch, не крашить всё приложение.

### UI (web/src/app/dashboard/data/page.tsx)
- `NavItem` принимает `blocked`, рендерит иконку `Lock` справа от имени и приглушает цвет.
- Новый компонент `ChatRowMenu` — три точки → попап с пунктами: `Не загружать новые` (toggle, иконка зависит от blocked), `Удалить данные`.
- Новая модалка `web/src/components/data/ChatDeleteModal.tsx` (использует общий `Modal`):
  - Заголовок: «Удалить данные чата X?»
  - Описание: сколько сообщений будет удалено.
  - Чекбокс: «Не загружать новые сообщения в будущем».
  - Кнопки «Отмена» / «Удалить».
- В сайдбаре снизу — секция «Заблокированные» со всеми блоками (включая count=0). Из неё можно разблокировать.

## Фазы

- [x] План
- [x] Миграция `chat_blocks`
- [x] `lib/chat-blocks.ts`
- [x] `GET /api/data/chats` (включает blocked + orphans)
- [x] `POST /api/data/chats/[chatId]/block`
- [x] `DELETE /api/data/chats/[chatId]`
- [x] Импорт уважает блок
- [x] `lib/telegram-live.ts` + `instrumentation.ts`
- [x] `register` после авторизации, `unregister` после logout
- [x] `ChatDeleteModal`
- [x] UI: меню чата, lock-иконка, секция заблокированных
- [x] Type-check (tsc --noEmit чисто)

## Итог сессии

### Реализовано
- БД: новая таблица `chat_blocks (user_id, chat_id, chat_name, chat_type, blocked_at)` — переживает удаление сообщений.
- Хелпер `web/src/lib/chat-blocks.ts`: `isBlocked / listBlockedIds / listBlocks / setBlocked / unblock`.
- API:
  - `GET /api/data/chats` — поле `blocked`, плюс «осиротевшие» блоки с `count: 0`.
  - `POST /api/data/chats/[chatId]/block` `{ blocked }` — переключение.
  - `DELETE /api/data/chats/[chatId]` `{ block }` — удаляет messages, опционально создаёт блок.
- `runImport` пропускает `blockedIds` перед обработкой dialog'а.
- Live-приёмник `web/src/lib/telegram-live.ts`:
  - singleton-диспетчер с `Map<userId, TelegramClient>`,
  - `bootstrap()` поднимает все сессии последовательно (anti-flood),
  - `register/unregister` — точки входа из auth-флоу,
  - `NewMessage` handler: skip-if-blocked → `INSERT … source='live'` → upsert `contacts`.
- `instrumentation.ts` — стартует bootstrap в node-runtime.
- `telegram-auth.ts`: `persistSession` зовёт `register`, `disconnectUser` зовёт `unregister`.
- UI `web/src/app/dashboard/data/page.tsx`: меню «три точки» в каждом чате (toggle блока + удаление), `Lock`-иконка у заблокированных, секция «Заблокированные» в сайдбаре.
- Модалка `web/src/components/data/ChatDeleteModal.tsx` с чекбоксом «Не загружать новые».

### Что осталось
- Миграция `chat_blocks` создаётся внутри `migrate()` — выполнится при первом обращении к API. Если есть отдельный шаг деплой-миграций, добавить туда.
- `next build` падает на `/api/chat` из-за отсутствия `OPENAI_API_KEY` в окружении сборки — не связано с этим планом.
- Возможный риск: при большом числе сессий bootstrap может занять заметное время на старте Next-сервера. Можно сделать lazy-старт.
- В UI нет real-time обновления при поступлении live-сообщений — только при перезагрузке `/data`. Достаточно для v1.
