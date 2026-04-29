# Setup — Автопилот развёртывания «Второй мозг»

Разворачивает всю систему с нуля на **любом сервере** (локально или продакшн).
Следуй шагам строго по порядку. Каждый шаг подтверждай перед переходом к следующему.

## Переменные среды

Перед запуском определи:
- `TARGET` — `local` или `production`
- `DOMAIN` — домен (только для production, например `brain.example.com`)

---

## Шаг 1 — Проверка зависимостей

Выполни и убедись что всё установлено:

```bash
node --version          # нужен >= 20
docker --version        # нужен Docker
docker compose version  # нужен Compose v2
git --version
```

Если чего-то нет — установи:
- **Node.js**: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs`
- **Docker**: `curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER`

---

## Шаг 2 — Клонирование / проверка репозитория

```bash
# Если это новый сервер:
git clone <repo-url> artemy && cd artemy

# Если репо уже есть:
git status
git pull origin main
```

---

## Шаг 3 — Создание .env.local

Проверь существует ли `web/.env.local`. Если нет — создай из шаблона:

```bash
ls web/.env.local 2>/dev/null || cp web/.env.example web/.env.local 2>/dev/null || echo "СОЗДАЙ ВРУЧНУЮ"
```

Обязательные переменные в `web/.env.local`:
```
JWT_SECRET=           # случайная строка 32+ символа: openssl rand -hex 32
ENCRYPTION_KEY=       # 32 символа для AES: openssl rand -hex 16
DB_HOST=localhost
DB_PORT=3308
DB_USER=app
DB_PASS=apppass
DB_NAME=second_brain
OPENAI_API_KEY=       # sk-...
TG_API_ID=            # с my.telegram.org
TG_API_HASH=          # с my.telegram.org
VAULT_PATH=           # абсолютный путь к папке vault, например /home/user/vault
```

Для production добавить:
```
NEXT_PUBLIC_URL=https://<DOMAIN>
```

Сгенерируй секреты автоматически:
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
```

---

## Шаг 4 — Запуск MySQL

```bash
cd /path/to/artemy
docker compose up -d mysql
```

Проверь что запустилось:
```bash
docker compose ps
docker compose logs mysql --tail=20
```

Жди пока MySQL скажет `ready for connections` (обычно 10-15 сек).

---

## Шаг 5 — Установка зависимостей и миграция БД

```bash
cd web
npm install
```

Миграция запускается автоматически при первом запросе к `/api/*`.
Можно проверить вручную:
```bash
node -e "
const mysql = require('mysql2/promise');
mysql.createConnection({host:'localhost',port:3308,user:'app',password:'apppass',database:'second_brain'})
  .then(c => c.query('SHOW TABLES'))
  .then(([r]) => console.log(r.map(t=>Object.values(t)[0]).join(', ')))
"
```

---

## Шаг 6 — Запуск приложения

**Локально (dev):**
```bash
cd web && npm run dev
```
Откроется на http://localhost:3000

**Продакшн (PM2):**
```bash
# Установи PM2 если нет
npm install -g pm2

cd web
npm run build
pm2 start npm --name "second-brain" -- start
pm2 save
pm2 startup  # для автозапуска при перезагрузке
```

---

## Шаг 7 — SSL (только для production)

Используем Caddy — он автоматически получает Let's Encrypt:

```bash
# Установка Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/debian.bullseye main" | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

Создай `/etc/caddy/Caddyfile`:
```
<DOMAIN> {
    reverse_proxy localhost:3000
    encode gzip
}
```

```bash
sudo systemctl enable caddy
sudo systemctl restart caddy
```

---

## Шаг 8 — Настройка кронов (Claude Code анализ)

```bash
# Убедись что claude CLI установлен и авторизован
claude --version
claude whoami

# Добавь в crontab
crontab -e
```

Добавь строки:
```cron
# Ежедневный анализ контактов в 9:00
0 9 * * * cd /path/to/artemy && /usr/local/bin/claude -p "$(cat scripts/prompts/daily-analysis.md)" --allowedTools "Bash,Read,Write" --output-format json >> /var/log/second-brain-analysis.log 2>&1

# Еженедельный дайджест в понедельник 8:00
0 8 * * 1 cd /path/to/artemy && /usr/local/bin/claude -p "$(cat scripts/prompts/weekly-digest.md)" --allowedTools "Bash,Read,Write" --output-format json >> /var/log/second-brain-digest.log 2>&1
```

---

## Шаг 9 — Первый вход и настройка

1. Открой http://localhost:3000 (или https://DOMAIN)
2. Зарегистрируйся (первый пользователь)
3. Перейди в **Подключения** → сохрани OpenAI API key
4. Перейди в **Импорт** → авторизуй Telegram аккаунт → запусти импорт
5. После импорта → **CRM** → запусти AI-анализ

---

## Шаг 10 — Проверка работы

```bash
# Health check
curl http://localhost:3000/api/stats

# Проверь vault
ls -la /path/to/vault/contacts/

# Проверь логи
pm2 logs second-brain --lines 50  # production
```

---

## Устранение проблем

| Проблема | Решение |
|---|---|
| MySQL не запускается | `docker compose logs mysql` — скорее всего порт 3308 занят |
| `ENCRYPTION_KEY` ошибка | Ключ должен быть ровно 32 символа |
| TG auth не работает | Проверь `TG_API_ID` и `TG_API_HASH` на my.telegram.org |
| Claude cron не запускается | `claude whoami` — проверь авторизацию |

---

После успешного прохождения всех шагов система готова к работе.
Для добавления новых серверов — повтори с Шага 1.
