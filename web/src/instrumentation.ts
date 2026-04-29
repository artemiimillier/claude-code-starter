export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { bootstrap } = await import('./lib/telegram-live')
  bootstrap().catch((err) => console.error('[instrumentation] live bootstrap failed', err))
}
