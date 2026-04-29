# Дизайн-система: Второй мозг

> Этот файл — единственный источник правды по дизайну. Читай его ПОЛНОСТЬЮ перед любой UI-задачей.

---

## 1. Цветовая палитра

### CSS-переменные (globals.css)

```css
:root {
  /* Фоны */
  --bg:          #0d0d0f;
  --surface:     #141416;
  --surface-2:   #1a1a1e;
  --surface-3:   #222228;

  /* Акценты */
  --accent-soft: #8ae3ee;   /* cyan — основной акцент */
  --signal:      #d7ff6f;   /* lime — важные действия/статусы */
  --accent-glow: rgba(138, 227, 238, 0.15);

  /* Текст */
  --text:        #f0f0f2;
  --text-muted:  rgba(240, 240, 242, 0.5);
  --text-faint:  rgba(240, 240, 242, 0.25);

  /* Границы */
  --border:      rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.16);

  /* Статусы */
  --success:     #4ade80;
  --warning:     #fbbf24;
  --danger:      #f87171;
  --info:        var(--accent-soft);

  /* Градиенты */
  --gradient-accent: linear-gradient(135deg, #8ae3ee 0%, #d7ff6f 100%);
  --gradient-card:   linear-gradient(135deg, rgba(138,227,238,0.08) 0%, rgba(215,255,111,0.04) 100%);
}
```

### Правила использования цвета

- `--accent-soft` (#8ae3ee) — активные состояния, ссылки, иконки основного действия, заголовки в градиенте
- `--signal` (#d7ff6f) — CTA-кнопки, уведомления, прогресс, онлайн-статус
- Никогда не использовать оба акцента на одном интерактивном элементе (только в градиентах)
- Текст на `--accent-soft` фоне: всегда `#0d0d0f` (тёмный)
- Текст на `--signal` фоне: всегда `#0d0d0f` (тёмный)

---

## 2. Типографика

```css
/* Подключено в layout.tsx */
--font-inter:      'Inter', sans-serif;       /* весь UI */
--font-geist-mono: 'Geist Mono', monospace;   /* код, ID, хэши, числа */

/* Шкала размеров */
--text-xs:   11px / 1.5  /* метки, подписи */
--text-sm:   13px / 1.5  /* вторичный текст, описания */
--text-base: 15px / 1.6  /* основной текст */
--text-lg:   18px / 1.4  /* подзаголовки карточек */
--text-xl:   22px / 1.3  /* заголовки разделов */
--text-2xl:  28px / 1.2  /* большие цифры в стат-карточках */
--text-3xl:  36px / 1.1  /* hero-числа */

/* Числа в stat-карточках ВСЕГДА через font-geist-mono + font-variant-numeric: tabular-nums */
```

---

## 3. Сетка и отступы

```
Sidebar (раскрытый):   240px
Sidebar (свёрнутый):    64px  ← только иконки + tooltip
Header:                 64px  (height, fixed top)
Content padding:        24px desktop / 16px mobile
Card gap:               16px
Max-width контента:     1280px
```

### Адаптив — брейкпойнты Tailwind

```
sm:  640px   — планшет
md:  768px   — переход сайдбара
lg:  1024px  — полный дашборд
xl:  1280px  — широкий экран
```

### Сетка карточек

```css
/* Desktop */
grid-template-columns: repeat(4, 1fr)  /* stat-cards */
grid-template-columns: repeat(2, 1fr)  /* большие блоки */

/* Tablet (md) */
grid-template-columns: repeat(2, 1fr)

/* Mobile */
grid-template-columns: 1fr
```

**Принцип:** Не растягивать пустые блоки — добавлять новые виджеты. На широких экранах добавляется четвёртая колонка с мини-виджетами (активность, онлайн-юзеры, быстрые действия).

---

## 4. Компоненты

### 4.1 Карточки (Card)

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px 24px;
  transition: border-color 200ms ease, box-shadow 200ms ease;
}

.card:hover {
  border-color: var(--border-hover);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* Акцентная карточка */
.card-accent {
  background: var(--gradient-card);
  border-color: rgba(138, 227, 238, 0.2);
}
```

### 4.2 Stat-карточка (структура)

```
┌──────────────────────────────────┐
│  Иконка 20px  Заголовок 12px     │
│                                  │
│  [Число 36px tabular-nums]       │
│                                  │
│  ▲ +12.4%  vs прошлый период     │  ← цвет: --success / --danger
│                                  │
│  [Sparkline chart 48px height]   │
└──────────────────────────────────┘
```

- Число анимируется при загрузке (счётчик 0 → значение, 800ms)
- Пока данные грузятся — скелетон (shimmer)
- Sparkline: Recharts LineChart, stroke #8ae3ee, no axes, no grid

### 4.3 Скелетоны

```css
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-2) 25%,
    var(--surface-3) 50%,
    var(--surface-2) 75%
  );
  background-size: 800px 100%;
  animation: shimmer 1.6s infinite;
  border-radius: 6px;
}
```

Скелетоны повторяют точный layout реального контента (не Generic блоки).

### 4.4 Кнопки

```
btn-primary:  background: var(--signal); color: #0d0d0f; border-radius: 8px; font-weight: 600
btn-secondary: background: var(--surface-2); border: 1px solid var(--border); color: var(--text)
btn-ghost:    background: transparent; color: var(--text-muted); hover: var(--surface-2)
btn-danger:   background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.3); color: #f87171

Все кнопки: padding 10px 18px; transition 150ms; active: scale(0.97)
```

### 4.5 Инпуты

```css
input, textarea, select {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  padding: 10px 14px;
  transition: border-color 150ms;
  outline: none;
}
input:focus {
  border-color: var(--accent-soft);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
```

---

## 5. Layout: Header

```
┌──────────────────────────────────────────────────────────────────┐
│ [≡ Лого]  [Breadcrumb]          [Search ⌘K]  [Bell] [Avatar ▾]  │
│  64px высота, position: fixed, backdrop-blur: 12px               │
└──────────────────────────────────────────────────────────────────┘
```

- Blur-glass эффект: `background: rgba(13,13,15,0.8); backdrop-filter: blur(12px)`
- Лого + toggle сайдбара слева
- Breadcrumb с сепаратором `/`
- Поиск: ⌘K открывает command palette
- Bell: пульсирующий badge если есть уведомления
- Avatar: dropdown с профилем и выходом

**Мобильный (<md):**
- Лого по центру
- Бургер слева (анимированный X при открытии)
- Avatar справа

---

## 6. Layout: Sidebar

### Desktop

```
Раскрытый (240px):
┌─────────────────────┐
│ [Иконка] Пункт      │  ← padding: 12px 16px; border-radius: 8px
│ [Иконка] Пункт      │  ← hover: var(--surface-2)
│ [Иконка] Активный   │  ← bg: var(--accent-glow); border-left: 3px solid var(--accent-soft)
│   └ Подпункт        │  ← indent 32px, размер 12px
└─────────────────────┘

Свёрнутый (64px):
┌──────┐
│  [I] │  ← только иконки + Tooltip при hover
│  [I] │
│  [◉] │  ← активный: bg rgba(138,227,238,0.12)
└──────┘
```

Анимация toggle:
```jsx
// Framer Motion
<motion.aside
  animate={{ width: isOpen ? 240 : 64 }}
  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
>
```

### Mobile (<md)

Sidebar = drawer поверх контента:
- Overlay: `background: rgba(0,0,0,0.6); backdrop-filter: blur(4px)`
- Drawer: AnimatePresence x: -280 → 0, spring transition
- Бургер → анимированный X (3 линии в 2 диагонали, 300ms)

```jsx
// Burger animation via Framer Motion variants
const topLine    = { closed: { rotate: 0, y: 0 },   open: { rotate: 45, y: 8 } }
const middleLine = { closed: { opacity: 1 },          open: { opacity: 0 } }
const bottomLine = { closed: { rotate: 0, y: 0 },   open: { rotate: -45, y: -8 } }
```

### Пункты меню (sidebar nav)

```
/ dashboard          → LayoutDashboard
/ data               → Database
/ chat               → MessageSquare
/ connections        → Plug
/ settings           → Settings
────────────────────
/ help               → HelpCircle  (внизу сайдбара)
```

---

## 7. Модальные окна

### Правила

- Рендерятся через `ReactDOM.createPortal(modal, document.body)`
- Backdrop: `background: rgba(0,0,0,0.4); backdrop-filter: blur(8px)`
- Закрытие: ESC, клик по backdrop, кнопка X
- Анимация: `scale(0.95) opacity(0) → scale(1) opacity(1)`, 200ms spring

### Универсальный Confirm Modal

```
┌─────────────────────────────────┐
│  [X]                            │
│                                 │
│  [●]  Заголовок                 │  ← иконка: AlertTriangle/CheckCircle/XCircle
│       Описание действия         │  ← цвет иконки: --danger / --warning / --success
│                                 │
│  [Отмена]    [Подтвердить]      │  ← цвет confirm соответствует типу
└─────────────────────────────────┘
```

Типы: `danger` (красный), `warning` (жёлтый), `success` (зелёный)

### Размеры модалок

```
sm:  max-width: 400px   — confirm, alert
md:  max-width: 560px   — формы, детали
lg:  max-width: 760px   — таблицы, расширенный контент
xl:  max-width: 960px   — full detail panels
```

Все модалки: padding 24px, border-radius 16px, border: 1px solid var(--border).

---

## 8. Иконки — Lucide React

```bash
npm install lucide-react  # уже установлен
```

```tsx
import { LayoutDashboard, Database, MessageSquare } from 'lucide-react'

// Стандартные размеры
size={16}   // inline в тексте
size={20}   // sidebar, кнопки
size={24}   // заголовки карточек
size={32}   // пустые состояния

// Цвета
className="text-[var(--accent-soft)]"  // активные/основные
className="text-[var(--text-muted)]"   // вторичные
className="text-[var(--signal)]"       // внимание/важное

// НЕ использовать emoji-иконки, НЕ использовать другие наборы
```

Все иконки strokeWidth={1.75}, это уже дефолт Lucide.

---

## 9. Графики — Recharts

```bash
npm install recharts  # уже установлен
```

### Конфиг тёмной темы

```tsx
const CHART_COLORS = {
  primary:   '#8ae3ee',
  secondary: '#d7ff6f',
  grid:      'rgba(255,255,255,0.06)',
  axis:      'rgba(255,255,255,0.3)',
  tooltip_bg: '#1a1a1e',
  tooltip_border: 'rgba(255,255,255,0.1)',
}
```

### Placeholder-данные (живая анимация при загрузке)

```tsx
// Плавающий синусоид пока грузятся реальные данные
function usePlaceholderData(points = 24) {
  const [data, setData] = useState(() =>
    Array.from({ length: points }, (_, i) => ({
      i,
      value: 40 + 25 * Math.sin(i * 0.4),
    }))
  )

  useEffect(() => {
    if (!isLoading) return
    const id = setInterval(() => {
      setData(prev => [
        ...prev.slice(1),
        { i: prev[prev.length - 1].i + 1, value: 40 + 25 * Math.sin(Date.now() / 800) + Math.random() * 8 },
      ])
    }, 200)
    return () => clearInterval(id)
  }, [isLoading])

  return data
}
```

Placeholder-линия: opacity 0.4, strokeDasharray "4 2" — видно что это не реальные данные.

---

## 10. Иллюстрации — Undraw.co

**Источник:** https://undraw.co  
**Цвет:** установить primary color `#8ae3ee` на сайте при скачивании  
**Формат:** SVG (скачивать как SVG-файл, класть в `public/illustrations/`)  
**Использование:**

```tsx
// В Next.js Image для оптимизации
import Image from 'next/image'
<Image src="/illustrations/empty-data.svg" alt="" width={240} height={200} />

// Мобильная адаптация обязательна
<Image
  src="/illustrations/empty-data.svg"
  alt=""
  width={240}
  height={200}
  className="w-40 sm:w-60 h-auto"  // меньше на мобильном
/>
```

**Набор иллюстраций для проекта:**
- `empty-data.svg` — страница /data без сообщений
- `searching.svg` — нет результатов поиска
- `no-connection.svg` — ошибка подключения
- `ai-assistant.svg` — страница чата
- `settings.svg` — страница настроек/подключений
- `analytics.svg` — пустой дашборд

---

## 11. Анимации — Framer Motion

```bash
npm install framer-motion  # уже установлен
```

### Стандартные transition-пресеты

```tsx
export const transitions = {
  // UI-состояния (hover, focus)
  fast:   { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  // Появление элементов
  enter:  { type: 'spring', damping: 25, stiffness: 250 },
  // Сайдбар / большие панели
  panel:  { type: 'spring', damping: 28, stiffness: 200 },
  // Модалки
  modal:  { type: 'spring', damping: 30, stiffness: 300 },
}
```

### Анимация появления карточек (stagger)

```tsx
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } }
}
const card = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: transitions.enter }
}

<motion.div variants={container} initial="hidden" animate="show">
  {cards.map(c => <motion.div key={c.id} variants={card} />)}
</motion.div>
```

### Page transitions

```tsx
// В dashboard layout.tsx
<motion.main
  key={pathname}
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
>
```

---

## 12. Анимированный бургер (мобильный)

```tsx
function Burger({ isOpen, toggle }: { isOpen: boolean; toggle: () => void }) {
  return (
    <button onClick={toggle} className="p-2 flex flex-col gap-[5px] justify-center">
      {[
        isOpen ? { rotate: 45, y: 7 }  : { rotate: 0, y: 0 },
        isOpen ? { opacity: 0 }         : { opacity: 1 },
        isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 },
      ].map((anim, i) => (
        <motion.span
          key={i}
          animate={anim}
          transition={{ duration: 0.3 }}
          className="block w-5 h-[2px] rounded-full"
          style={{ background: 'var(--text)' }}
        />
      ))}
    </button>
  )
}
```

---

## 13. Структура файлов (dashboard)

```
src/
  app/
    dashboard/
      layout.tsx          ← sidebar + header + portal-provider
      page.tsx            ← главный дашборд (stat-cards + charts)
      data/page.tsx       ← браузер данных
      chat/page.tsx       ← AI-чат
      connections/page.tsx ← подключения
      settings/page.tsx   ← настройки
  components/
    ui/
      Button.tsx
      Card.tsx
      Modal.tsx           ← универсальный portal-modal
      ConfirmModal.tsx    ← типизированный confirm
      Skeleton.tsx
      Tooltip.tsx
      Badge.tsx
    layout/
      Header.tsx
      Sidebar.tsx
      Burger.tsx
    charts/
      SparklineChart.tsx
      LineChartCard.tsx
      BarChartCard.tsx
    dashboard/
      StatCard.tsx
      ActivityFeed.tsx
```

---

## 14. Ключевые запреты

- НЕ использовать emoji как иконки в UI
- НЕ использовать белый фон в любых элементах
- НЕ добавлять `transition: all` — только конкретные свойства
- НЕ использовать `opacity: 0.5` для disabled — только `pointer-events: none` + `--text-faint`
- НЕ делать модалки без `backdrop-filter: blur`
- НЕ рендерить chart без `ResponsiveContainer`
- НЕ использовать статичные заглушки — только анимированные скелетоны
