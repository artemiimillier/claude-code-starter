# План: веб-кабинет — auth + страница подключений

**Дата:** 2026-04-28
**Статус:** реализован

## Цель

Запустить Next.js приложение с регистрацией/входом и страницей подключения AI + Telegram-бот + Telegram-аккаунт.

## Стек

- **Next.js 15** (App Router)
- **MySQL 8** через Docker (docker-compose.yml)
- **mysql2** — драйвер
- **Auth** — JWT в httpOnly cookie (без сторонних библиотек)
- **Tailwind CSS** — тёмная тема, цвета из brand-guidelines
- **TypeScript**

## Структура файлов

```
├── docker-compose.yml
├── scripts/
│   └── start.sh                ← проверка Docker → поднять MySQL → npm run dev
├── .env.local                  ← DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx            ← редирект → /dashboard или /auth
    │   ├── auth/page.tsx       ← вход / регистрация (табы)
    │   └── dashboard/
    │       ├── layout.tsx      ← защищённый layout (проверка JWT)
    │       └── connections/page.tsx
    ├── lib/
    │   ├── db.ts               ← mysql2 pool + migrate()
    │   ├── auth.ts             ← JWT (jose)
    │   └── crypto.ts           ← bcryptjs + AES для session string
    └── app/api/
        ├── auth/register/route.ts
        ├── auth/login/route.ts
        ├── auth/logout/route.ts
        └── connections/route.ts
```

## Схема БД

```sql
users (id, email, password_hash, created_at)
connections (id, user_id, type, config_json, updated_at)
-- type: 'ai' | 'tg_bot' | 'tg_account'
```

## Фазы

### Фаза 1. Инициализация проекта (~15 мин)
- [x] `npx create-next-app` с TypeScript + Tailwind
- [x] Настроить тёмную тему и CSS-переменные (--accent-soft, --signal)
- [x] Установить зависимости: mysql2, jose (JWT), bcryptjs
- [x] `docker-compose.yml` — MySQL 8 + volume для данных
- [x] `scripts/start.sh` — проверяет Docker, поднимает контейнер, ждёт ready, стартует Next.js
- [x] `lib/db.ts` — пул соединений + миграция таблиц при старте

### Фаза 2. Auth API (~15 мин)
- [x] `POST /api/auth/register` — создание пользователя
- [x] `POST /api/auth/login` — выдача JWT в httpOnly cookie
- [x] `POST /api/auth/logout` — очистка cookie
- [x] Защита `/dashboard/*` через layout.tsx (server-side проверка JWT)

### Фаза 3. Страница Auth (~15 мин)
- [x] Форма входа / регистрации (два таба на одной странице)
- [x] Валидация на клиенте (email + пароль мин 8 символов)
- [x] Редирект на `/dashboard/connections` после успешного входа

### Фаза 4. Страница подключений (~20 мин)
- [x] Три карточки: AI, Telegram Bot, Telegram Account
- [x] Карточка AI: поле API key + выбор модели (Claude / OpenAI)
- [x] Карточка TG Bot: поле Bot Token
- [x] Карточка TG Account: поле phone / session string (зашифрован AES-256-GCM)
- [x] `GET/POST /api/connections` — сохранение в БД по user_id

## Критерии готовности

- [x] Можно зарегистрироваться и войти
- [x] После входа — попадаешь на страницу подключений
- [x] Введённые данные сохраняются и подгружаются при перезагрузке
- [x] Тёмная тема с цветами проекта

## Риски

- Session string Telegram — чувствительные данные. Хранить в БД зашифрованными (AES), не в открытом виде.

---

## Итог

**Реализовано:** Auth (register/login/logout) + JWT в httpOnly cookie, защищённый `/dashboard/*`, страница подключений с тремя карточками (AI, TG Bot, TG Account), шифрование чувствительных полей AES-256-GCM, MySQL на порту 3308.

**Баг исправлен:** MySQL 8 strict mode запрещает DEFAULT на TEXT — убрано из миграции `connections.config_json`.
