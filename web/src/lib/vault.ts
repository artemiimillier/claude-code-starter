import fs from 'fs/promises'
import path from 'path'

// Vault lives at VAULT_PATH, defaults to ../vault relative to web/
function getVaultRoot(): string {
  return process.env.VAULT_PATH
    ? path.resolve(process.env.VAULT_PATH)
    : path.resolve(process.cwd(), '..', 'vault')
}

export function getVaultPath() { return getVaultRoot() }

async function ensure(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

export async function ensureVault() {
  const root = getVaultRoot()
  await Promise.all([
    ensure(path.join(root, 'contacts')),
    ensure(path.join(root, 'chats')),
    ensure(path.join(root, 'insights')),
    ensure(path.join(root, 'content')),
    ensure(path.join(root, 'obligations')),
  ])
}

// Safe filename: keep cyrillic, latin, digits, spaces → underscores
export function safeFilename(name: string, suffix: string | number | bigint): string {
  const safe = name
    .replace(/[^\wа-яёА-ЯЁ\s-]/gu, '')
    .replace(/\s+/g, '_')
    .slice(0, 50)
    .replace(/_+$/g, '')
  return `${safe || 'Unknown'}_${suffix}.md`
}

export async function writeContactProfile(
  name: string,
  tgId: bigint | number | string,
  content: string,
): Promise<void> {
  await ensureVault()
  const filepath = path.join(getVaultRoot(), 'contacts', safeFilename(name, tgId))
  await fs.writeFile(filepath, content, 'utf-8')
}

export async function readContactProfile(
  name: string,
  tgId: bigint | number | string,
): Promise<string | null> {
  const filepath = path.join(getVaultRoot(), 'contacts', safeFilename(name, tgId))
  try { return await fs.readFile(filepath, 'utf-8') }
  catch { return null }
}

export async function profileExists(name: string, tgId: bigint | number): Promise<boolean> {
  const filepath = path.join(getVaultRoot(), 'contacts', safeFilename(name, tgId))
  try { await fs.access(filepath); return true }
  catch { return false }
}

interface ContactIndex {
  name:     string
  tgId:     bigint | number | string
  username?: string | null
  lastSeen?: Date | null
  msgCount?: number
  hasProfile: boolean
}

export async function updateContactsIndex(contacts: ContactIndex[]): Promise<void> {
  await ensureVault()

  const rows = contacts.map(c => {
    const fn = safeFilename(c.name, c.tgId).replace('.md', '')
    const link = `[[contacts/${fn}\\|${c.name}]]`
    const uname = c.username ? `@${c.username}` : '—'
    const last  = c.lastSeen ? new Date(c.lastSeen).toLocaleDateString('ru-RU') : '—'
    const prof  = c.hasProfile ? '✓' : '—'
    return `| ${link} | ${uname} | ${c.msgCount ?? 0} | ${last} | ${prof} |`
  })

  const content = [
    '# Контакты\n',
    '| Имя | Username | Сообщений | Последний контакт | Профиль |',
    '|-----|----------|-----------|-------------------|---------|',
    ...rows,
    '',
    `*Обновлено: ${new Date().toLocaleString('ru-RU')}*`,
  ].join('\n')

  await fs.writeFile(
    path.join(getVaultRoot(), 'contacts', '_index.md'),
    content,
    'utf-8',
  )
}

export async function writeDailyInsight(content: string): Promise<void> {
  await ensureVault()
  const date = new Date().toISOString().split('T')[0]
  const filepath = path.join(getVaultRoot(), 'insights', `${date}.md`)
  await fs.writeFile(filepath, content, 'utf-8')
}
