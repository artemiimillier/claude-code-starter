#!/usr/bin/env bash
# admin.sh — единая точка управления проектом «Второй мозг».
#
# Интерактивно:   ./admin.sh
# Программно:     ./admin.sh <command>      (см. ./admin.sh help)
#
# Все админ-операции живут только здесь. ADMIN.md — справочник для людей и ИИ.

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB="$ROOT/web"
ADMINER_PORT="${ADMINER_PORT:-8080}"
DEFAULT_APP_PORT="${APP_PORT:-3000}"

# ── Colors ──────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  C_RESET=$'\033[0m';  C_DIM=$'\033[2m';   C_BOLD=$'\033[1m'
  C_CYAN=$'\033[38;5;87m'; C_LIME=$'\033[38;5;191m'
  C_RED=$'\033[38;5;203m'; C_YELLOW=$'\033[38;5;221m'
  C_GREEN=$'\033[38;5;120m'; C_GREY=$'\033[38;5;244m'; C_BLUE=$'\033[38;5;111m'
else
  C_RESET=''; C_DIM=''; C_BOLD=''
  C_CYAN=''; C_LIME=''; C_RED=''; C_YELLOW=''; C_GREEN=''; C_GREY=''; C_BLUE=''
fi

say()  { printf "%s\n" "$*"; }
ok()   { printf "${C_GREEN}✓${C_RESET} %s\n" "$*"; }
warn() { printf "${C_YELLOW}⚠${C_RESET} %s\n" "$*"; }
err()  { printf "${C_RED}✗${C_RESET} %s\n" "$*" >&2; }
hr()   { printf "${C_DIM}%s${C_RESET}\n" "────────────────────────────────────────────────────────────────"; }

pause() { printf "\n${C_DIM}нажми ENTER чтобы вернуться в меню…${C_RESET}"; read -r _; }

require_cmd() {
  local missing=()
  for c in "$@"; do command -v "$c" >/dev/null 2>&1 || missing+=("$c"); done
  if (( ${#missing[@]} )); then
    err "не найдены команды: ${missing[*]}"
    return 1
  fi
}

# ── Docker / DB helpers ─────────────────────────────────────────────────────
docker_up() {
  require_cmd docker || return 1
  if ! docker info >/dev/null 2>&1; then
    warn "Docker daemon выключен. Пробую запустить Docker Desktop…"
    [[ "$OSTYPE" == darwin* ]] && open -a Docker || true
    for i in $(seq 1 30); do
      sleep 2; docker info >/dev/null 2>&1 && break
      printf "  … ожидание (%ss)\r" "$((i*2))"
    done
    docker info >/dev/null 2>&1 || { err "Docker не поднялся"; return 1; }
    ok "Docker готов"
  fi
}

mysql_up() {
  docker_up || return 1
  cd "$ROOT"
  if ! docker compose ps mysql 2>/dev/null | grep -q running; then
    say "${C_DIM}Поднимаю MySQL…${C_RESET}"
    docker compose up -d mysql
  fi
  say "${C_DIM}Жду healthcheck…${C_RESET}"
  for i in $(seq 1 30); do
    local s; s=$(docker inspect --format='{{.State.Health.Status}}' second-brain-mysql 2>/dev/null || echo none)
    [[ "$s" == healthy ]] && { ok "MySQL healthy"; return 0; }
    sleep 2
  done
  err "MySQL не стал healthy за 60с — docker logs second-brain-mysql"
  return 1
}

# ── Commands ────────────────────────────────────────────────────────────────

cmd_stack_up() {           # ① запуск сервера + приложения
  mysql_up || return 1
  cd "$WEB"
  ok "Запускаю Next.js dev на :${DEFAULT_APP_PORT}"
  npm run dev -- -p "$DEFAULT_APP_PORT"
}

cmd_app() {                # ② только приложение
  cd "$WEB"; ok "Next.js dev на :${DEFAULT_APP_PORT}"
  npm run dev -- -p "$DEFAULT_APP_PORT"
}

cmd_app_port() {           # ③ приложение на выбранном порту
  printf "Порт [по умолчанию %s]: " "$DEFAULT_APP_PORT"
  read -r port; port="${port:-$DEFAULT_APP_PORT}"
  if ! [[ "$port" =~ ^[0-9]+$ ]] || (( port < 1024 || port > 65535 )); then
    err "Некорректный порт"; return 1
  fi
  cd "$WEB"; ok "Next.js dev на :${port}"
  npm run dev -- -p "$port"
}

cmd_stop() {               # ⑥ остановка всех сервисов
  cd "$ROOT"
  docker compose --profile admin down 2>/dev/null || true
  docker compose down 2>/dev/null || true
  pkill -f "next dev" 2>/dev/null && ok "Next.js dev остановлен" || say "${C_DIM}Next.js не был запущен${C_RESET}"
  ok "Сервисы остановлены"
}

cmd_restart() {            # ④ рестарт
  cmd_stop
  cmd_stack_up
}

cmd_adminer() {            # ⑤ Adminer
  docker_up || return 1
  mysql_up || return 1
  cd "$ROOT"
  docker compose --profile admin up -d adminer
  local url="http://localhost:${ADMINER_PORT}/?server=mysql&username=app&db=second_brain"
  ok "Adminer: $url"
  if [[ "$OSTYPE" == darwin* ]]; then open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$url"
  fi
}

cmd_adminer_stop() {
  cd "$ROOT"
  docker compose --profile admin stop adminer 2>/dev/null && ok "Adminer остановлен" || warn "Adminer не запущен"
}

cmd_db_shell() {           # mysql CLI
  docker_up || return 1
  docker exec -it second-brain-mysql mysql -uapp -papppass second_brain
}

cmd_db_logs() {            # tail mysql logs
  docker_up || return 1
  docker logs -f --tail=200 second-brain-mysql
}

cmd_db_dump() {
  docker_up || return 1
  local out="$ROOT/backups"; mkdir -p "$out"
  local file="$out/second_brain_$(date +%Y%m%d_%H%M).sql"
  docker exec second-brain-mysql mysqldump -uapp -papppass second_brain > "$file"
  ok "Дамп сохранён: $file"
}

cmd_install() {            # npm ci
  cd "$WEB"; require_cmd npm || return 1
  npm ci || npm install
}

cmd_build() {
  cd "$WEB"; require_cmd npx || return 1
  npx next build
}

cmd_lint() {
  cd "$WEB"; npm run lint
}

cmd_typecheck() {
  cd "$WEB"; npx tsc --noEmit
}

cmd_clean_cache() {
  cd "$WEB"; rm -rf .next node_modules/.cache && ok "Кэш .next и node_modules/.cache очищены"
}

cmd_status() {             # git status -s + branch + ahead/behind
  cd "$ROOT"
  printf "${C_BOLD}Branch:${C_RESET} "; git rev-parse --abbrev-ref HEAD
  printf "${C_BOLD}Recent:${C_RESET}\n"; git log --oneline -5
  printf "${C_BOLD}Status:${C_RESET}\n"; git status -s
}

cmd_ai_commit() {          # commit через Claude CLI
  cd "$ROOT"
  require_cmd git || return 1
  if ! command -v claude >/dev/null 2>&1; then
    err "claude CLI не найден. Установи: https://claude.ai/code"
    return 1
  fi

  if [[ -z "$(git status --porcelain)" ]]; then
    warn "Нет изменений для коммита"; return 0
  fi

  printf "${C_BOLD}Изменения:${C_RESET}\n"; git status -s
  hr
  printf "Что коммитим? [a] всё (git add -A) · [s] только staged · [c] отмена: "
  read -r choice
  case "$choice" in
    a|A) git add -A ;;
    s|S) [[ -z "$(git diff --cached --stat)" ]] && { err "Ничего не staged"; return 1; } ;;
    *)   say "Отменено"; return 0 ;;
  esac

  ok "Зову Claude — он составит сообщение и сделает коммит"
  hr
  claude \
    --print \
    --permission-mode acceptEdits \
    --allowedTools "Bash,Read" \
    -p "Проанализируй \`git diff --cached\` и \`git status\`. Составь conventional commit на русском (тип: feat/fix/chore/refactor/docs/test, короткая императивная строка ≤72 символов, при необходимости — пустая строка и тело с подробностями). Затем выполни git commit -m '<message>'. Не используй --no-verify. По итогу — только короткое подтверждение того, что коммит создан."
}

cmd_push() {
  cd "$ROOT"
  local branch; branch=$(git rev-parse --abbrev-ref HEAD)
  printf "Пушим ветку ${C_BOLD}%s${C_RESET}? [y/N]: " "$branch"
  read -r y; [[ "$y" =~ ^[yY]$ ]] || { say "Отменено"; return 0; }
  git push -u origin "$branch"
}

cmd_analyze_daily()  { "$ROOT/scripts/analyze.sh" daily;  }
cmd_analyze_weekly() { "$ROOT/scripts/analyze.sh" weekly; }
cmd_security_audit() { bash "$ROOT/scripts/security-audit.sh"; }

cmd_open_app() {
  local url="http://localhost:${DEFAULT_APP_PORT}"
  if [[ "$OSTYPE" == darwin* ]]; then open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$url"
  else say "$url"
  fi
}

cmd_logs_dev() {           # follow last dev log if any
  local log="$WEB/.next/dev.log"
  if [[ -f "$log" ]]; then tail -f "$log"
  else warn "$log не найден — запусти приложение"
  fi
}

cmd_help() {
  cat <<EOF
${C_BOLD}admin.sh${C_RESET} — управление проектом «Второй мозг»

  ${C_CYAN}Запуск${C_RESET}
    stack-up        поднять MySQL и Next.js dev
    app             Next.js dev на :${DEFAULT_APP_PORT}
    app-port        Next.js dev с выбором порта
    restart         остановить всё и поднять заново
    stop            остановить контейнеры и dev-сервер

  ${C_CYAN}База данных${C_RESET}
    adminer         поднять Adminer и открыть в браузере
    adminer-stop    остановить Adminer
    db-shell        mysql CLI в контейнере
    db-logs         tail логов MySQL
    db-dump         бэкап в backups/

  ${C_CYAN}Разработка${C_RESET}
    install         npm install (web/)
    build           next build
    lint            ESLint
    typecheck       tsc --noEmit
    clean-cache     удалить .next и node_modules/.cache

  ${C_CYAN}Git${C_RESET}
    status          git status + последние коммиты
    ai-commit       коммит с авто-сообщением через Claude
    push            git push текущей ветки

  ${C_CYAN}Анализ${C_RESET}
    analyze-daily   ежедневный анализ через Claude
    analyze-weekly  недельный дайджест
    security-audit  локальный аудит секретов

  ${C_CYAN}Прочее${C_RESET}
    open-app        открыть localhost:${DEFAULT_APP_PORT}
    logs-dev        tail .next/dev.log
    help            эта справка
EOF
}

# ── Menu definition ─────────────────────────────────────────────────────────
# Каждая запись: "GROUP|TITLE|cmd"
MENU=(
  "Запуск|Запустить сервер и приложение|stack-up"
  "Запуск|Запустить только приложение|app"
  "Запуск|Запустить с выбором порта|app-port"
  "Запуск|Рестарт|restart"
  "Запуск|Остановить всё|stop"

  "База данных|Открыть Adminer|adminer"
  "База данных|Остановить Adminer|adminer-stop"
  "База данных|MySQL shell|db-shell"
  "База данных|Логи MySQL|db-logs"
  "База данных|Бэкап БД|db-dump"

  "Разработка|npm install|install"
  "Разработка|next build|build"
  "Разработка|ESLint|lint"
  "Разработка|tsc --noEmit|typecheck"
  "Разработка|Очистить .next кэш|clean-cache"

  "Git|Статус и последние коммиты|status"
  "Git|AI-коммит (Claude составит сообщение)|ai-commit"
  "Git|Push текущей ветки|push"

  "Анализ|Ежедневный анализ|analyze-daily"
  "Анализ|Недельный дайджест|analyze-weekly"
  "Анализ|Security audit|security-audit"

  "Прочее|Открыть приложение в браузере|open-app"
  "Прочее|Tail dev log|logs-dev"
)

print_menu() {
  clear
  printf "\n  ${C_BOLD}${C_CYAN}╭─────────────────────────────────────────────────╮${C_RESET}\n"
  printf "  ${C_BOLD}${C_CYAN}│${C_RESET}  ${C_BOLD}ВТОРОЙ МОЗГ${C_RESET} · admin                       ${C_BOLD}${C_CYAN}│${C_RESET}\n"
  printf "  ${C_BOLD}${C_CYAN}╰─────────────────────────────────────────────────╯${C_RESET}\n"
  printf "  ${C_DIM}%s${C_RESET}\n\n" "$ROOT"

  local last_group=""
  local i=0
  for entry in "${MENU[@]}"; do
    i=$((i+1))
    local group="${entry%%|*}"
    local rest="${entry#*|}"
    local title="${rest%%|*}"
    if [[ "$group" != "$last_group" ]]; then
      [[ -n "$last_group" ]] && printf "\n"
      printf "  ${C_BLUE}▌${C_RESET} ${C_BOLD}%s${C_RESET}\n" "$group"
      last_group="$group"
    fi
    printf "    ${C_LIME}%2d${C_RESET}  %s\n" "$i" "$title"
  done

  printf "\n  ${C_DIM}номер действия · [h] справка · [q] выход${C_RESET}\n"
  printf "  ${C_BOLD}❯${C_RESET} "
}

run_cmd_by_name() {
  local fn="cmd_${1//-/_}"
  if declare -f "$fn" >/dev/null; then
    "$fn"
  else
    err "Неизвестная команда: $1"
    cmd_help
    return 1
  fi
}

run_menu_index() {
  local idx="$1"
  if ! [[ "$idx" =~ ^[0-9]+$ ]] || (( idx < 1 || idx > ${#MENU[@]} )); then
    err "Нет пункта №$idx"; return 1
  fi
  local entry="${MENU[$((idx-1))]}"
  local cmd="${entry##*|}"
  hr
  printf "${C_DIM}▶ ${C_RESET}%s\n" "$cmd"
  hr
  run_cmd_by_name "$cmd"
}

main_menu() {
  while true; do
    print_menu
    read -r input || exit 0
    case "$input" in
      q|Q|quit|exit) say "Пока!"; exit 0 ;;
      h|H|help|\?)   cmd_help; pause ;;
      "")            continue ;;
      *)
        if [[ "$input" =~ ^[0-9]+$ ]]; then
          run_menu_index "$input" || true
        else
          run_cmd_by_name "$input" || true
        fi
        pause
        ;;
    esac
  done
}

# ── Entry ───────────────────────────────────────────────────────────────────
if (( $# == 0 )); then
  main_menu
else
  case "$1" in
    -h|--help|help) cmd_help ;;
    list)
      for entry in "${MENU[@]}"; do
        group="${entry%%|*}"; rest="${entry#*|}"; title="${rest%%|*}"; cmd="${rest##*|}"
        printf "%-12s  %-40s  %s\n" "[$group]" "$title" "$cmd"
      done
      ;;
    *) run_cmd_by_name "$1" ;;
  esac
fi
