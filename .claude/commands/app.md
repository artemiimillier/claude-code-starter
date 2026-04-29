# Управление приложением

Управляй веб-приложением: старт, стоп, перезапуск.

Аргумент: `$ARGUMENTS` — одно из `start`, `stop`, `restart` (по умолчанию `restart`).

```bash
APP_DIR="/Users/dmitry/GitHub/artemy/web"
NEXT_BIN="$APP_DIR/node_modules/.bin/next"
LOG="/tmp/nextjs-dev.log"

action="${ARGUMENTS:-restart}"

stop_app() {
  pkill -f "next dev" 2>/dev/null && echo "Остановлено." || echo "Процесс не найден."
  sleep 1
}

start_app() {
  (cd "$APP_DIR" && "$NEXT_BIN" dev > "$LOG" 2>&1) &
  sleep 5
  if grep -q "Ready" "$LOG"; then
    echo "Запущено на http://localhost:3000"
  else
    echo "Лог запуска:"
    tail -20 "$LOG"
  fi
}

case "$action" in
  stop)    stop_app ;;
  start)   start_app ;;
  restart) stop_app && start_app ;;
  *)       echo "Неизвестное действие: $action. Используй: start | stop | restart" ;;
esac
```

Выведи результат пользователю одной строкой.
