# Web — заметки для агентов

Стек: **Next.js 16.2.4 (App Router) + React 19 + Turbopack**.

## Особенности этого Next.js, о которых стоит помнить

- **Динамические параметры роутов асинхронные.** Сигнатура:
  ```ts
  export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
  }
  ```
- **`src/instrumentation.ts`** — точка старта серверного процесса. Используется для long-running тасков (live-приёмник Telegram).
- **API-роуты не должны падать на module-eval.** При `next build` Next дёргает каждый роут, чтобы собрать метаданные. Любое создание клиентов (OpenAI/Anthropic/etc.), требующее env-переменных, делать **лениво** — на первый вызов, не на `import`.
- **Build-сборщик — Turbopack.** Если что-то ломается, `next build --webpack` для отладки.

## Дизайн и UI

См. [DESIGN.md](./DESIGN.md) — единый источник правды по компонентам, цветам, анимациям и иконкам.
