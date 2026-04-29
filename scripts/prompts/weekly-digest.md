Ты — AI-ассистент «Второй мозг». Создай еженедельный дайджест.

ЗАДАЧИ:

## 1. Статистика недели
```bash
mysql -h 127.0.0.1 -P 3308 -u app -papppass second_brain -e "
  SELECT 
    COUNT(*) as total_messages,
    COUNT(DISTINCT chat_id) as active_chats,
    COUNT(DISTINCT sender_name) as unique_senders
  FROM messages 
  WHERE original_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
"
```

## 2. Топ контакты недели
```bash
mysql -h 127.0.0.1 -P 3308 -u app -papppass second_brain -e "
  SELECT sender_name, COUNT(*) as msgs
  FROM messages 
  WHERE original_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND chat_type='private'
  GROUP BY sender_name ORDER BY msgs DESC LIMIT 10
"
```
Для топ-3 контактов — прочитай их vault-профили и найди упомянутые возможности.

## 3. Идеи для контента
На основе тем из переписки за неделю — предложи 3-5 идей для постов в Telegram/Instagram.
Поищи в интернете что сейчас актуально в этих темах.
Запиши в vault/content/ideas_$(date +%Y-W%V).md

## 4. Следующие шаги на неделю
Из всех vault/obligations/active.md и vault/contacts/*.md — составь топ-5 приоритетных действий.

## 5. Отправь дайджест в Telegram
Сформируй сообщение для Telegram и сохрани в /tmp/tg-digest.txt:
```
📊 Дайджест недели

📨 Сообщений: N
👥 Активных чатов: N
✅ Топ контакты: ...

💡 Идеи контента:
1. ...
2. ...

📋 Приоритеты:
1. ...
```

После создания файла выведи JSON:
{"digest_file": "/tmp/tg-digest.txt", "content_ideas": N, "top_contacts": [...]}
