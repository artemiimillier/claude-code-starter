#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ── 1. Docker daemon ────────────────────────────────────────────────────────
if ! docker info > /dev/null 2>&1; then
  echo "Docker не запущен. Пытаюсь запустить..."

  if [[ "$OSTYPE" == "darwin"* ]]; then
    open -a Docker
    echo "Жду запуска Docker Desktop..."
    for i in $(seq 1 30); do
      sleep 2
      docker info > /dev/null 2>&1 && break
      echo "  ...ожидание ($((i*2))s)"
    done
  else
    echo "Запусти Docker вручную и повтори: bash scripts/start.sh"
    exit 1
  fi

  if ! docker info > /dev/null 2>&1; then
    echo "Docker так и не запустился. Прерываю."
    exit 1
  fi
  echo "Docker запущен."
fi

# ── 2. MySQL контейнер ───────────────────────────────────────────────────────
if ! docker compose ps mysql 2>/dev/null | grep -q "running"; then
  echo "Поднимаю MySQL контейнер..."
  docker compose up -d mysql
fi

# ── 3. Ждём healthcheck ──────────────────────────────────────────────────────
echo "Жду готовности MySQL..."
for i in $(seq 1 30); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' second-brain-mysql 2>/dev/null || echo "none")
  if [[ "$STATUS" == "healthy" ]]; then
    echo "MySQL готов."
    break
  fi
  sleep 2
  echo "  ...($((i*2))s) статус: $STATUS"
done

if [[ "$STATUS" != "healthy" ]]; then
  echo "MySQL не вышел в healthy за 60 секунд. Проверь: docker logs second-brain-mysql"
  exit 1
fi

# ── 4. Запуск приложения ─────────────────────────────────────────────────────
cd "$ROOT/web"
echo "Запускаю Next.js..."
npm run dev
