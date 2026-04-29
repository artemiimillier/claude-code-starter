# План: редизайн дашборда

**Дата:** 2026-04-28  
**Статус:** черновик  
**Дизайн-система:** `web/DESIGN.md` — читать перед каждой фазой

## Цель

Полностью переработать UI веб-кабинета: классический дашборд с анимированным сайдбаром, живыми графиками, скелетонами, модалками через порталы. Поддержка desktop + mobile.

## Стек

- **Framer Motion** — сайдбар, бургер, модалки, page transitions, stagger-карточки
- **Lucide React** — единый набор иконок
- **Recharts** — графики с placeholder-анимацией
- **Undraw.co SVG** — иллюстрации для empty states
- **CSS shimmer** — скелетоны без JS-библиотек

## Фазы

### Фаза 1. CSS-переменные и базовые компоненты (~30 мин)

- [x] Обновить `globals.css` — полная палитра по DESIGN.md (--bg, --surface-2/3, --accent-glow, --gradient-accent, все статусы)
- [x] Компонент `components/ui/Skeleton.tsx` — shimmer по DESIGN.md, принимает className для размера
- [x] Компонент `components/ui/Button.tsx` — 4 варианта (primary/secondary/ghost/danger) + size (sm/md/lg) + loading state
- [x] Компонент `components/ui/Badge.tsx` — статусные бэджи (success/warning/danger/info) + trend (▲▼)
- [x] Компонент `components/ui/Tooltip.tsx` — появление через Framer Motion, 150ms

### Фаза 2. Модальная система (~45 мин)

- [ ] `components/ui/Modal.tsx` — базовый портал (ReactDOM.createPortal), backdrop blur 8px, AnimatePresence scale + opacity, ESC/backdrop close, 4 размера (sm/md/lg/xl)
- [ ] `components/ui/ConfirmModal.tsx` — поверх Modal, 3 типа (danger/warning/success), иконка AlertTriangle/CheckCircle/XCircle, цветные кнопки
- [ ] Hook `useModal.ts` — `const { open, close, isOpen } = useModal()`
- [ ] Обернуть существующие деструктивные действия в ConfirmModal (logout, удаление данных)
- [ ] Тест: убедиться что модалки работают на мобильном (не выходят за экран)

### Фаза 3. Layout — Header + Sidebar (~60 мин)

- [ ] `components/layout/Header.tsx`
  - Blur-glass фон (rgba(13,13,15,0.8) + backdrop-blur: 12px)
  - Лого + sidebar toggle слева
  - Breadcrumb по маршруту
  - Иконка поиска (⌘K placeholder, без реализации)
  - Bell с пульсирующим бэджем
  - Avatar с dropdown (имя, email, выход)
  - Mobile: лого центр, бургер слева, аватар справа
- [ ] `components/layout/Burger.tsx` — анимированный X из 3 линий
- [ ] `components/layout/Sidebar.tsx`
  - Desktop: Framer Motion width 240→64, spring transition
  - Свёрнутый режим: только иконки + Tooltip
  - Активный пункт: accent-glow bg + 3px border-left
  - Mobile: Drawer поверх контента, overlay backdrop-blur
  - Пункты: Dashboard, Data, Chat, Connections, Settings + Help внизу
- [ ] `dashboard/layout.tsx` — собрать Header + Sidebar + main с page transition
- [ ] Проверить: resize 1280px → 375px без поломок

### Фаза 4. Dashboard главная страница (~90 мин)

- [ ] Stat-карточки (4 шт. в ряд) — структура по DESIGN.md:
  - Всего сообщений (Database icon)
  - Чатов проиндексировано (MessageSquare icon)
  - Последний импорт (Clock icon)
  - Активных подключений (Plug icon)
  - Скелетон пока грузятся данные
  - Число анимируется 0→значение (800ms, Framer Motion)
  - Sparkline chart (Recharts, placeholder синусоид)
- [ ] График "Активность по дням" — LineChart, 30 дней
  - Placeholder: живой синусоид через setInterval (usePlaceholderData hook)
  - После загрузки — плавный переход к реальным данным
  - Цвета по DESIGN.md chart config
- [ ] Панель "Последние сообщения" — таблица/лист 5 записей, skeleton при загрузке
- [ ] Виджет "Статус подключений" — карточка с 3 строками (AI, TG Bot, TG Account), индикаторы online/offline
- [ ] На xl (1280px+) — добавить 4ю колонку с "Быстрые действия" (3 кнопки) и "Подсказка"
- [ ] Stagger-анимация появления карточек (Framer Motion variants, по DESIGN.md)
- [ ] Mobile: 1 колонка, порядок: stat-cards → graph → connections status → recent

### Фаза 5. Страница /connections — редизайн (~45 мин)

- [ ] Каждая карточка подключения в ConfirmModal при сохранении (предупреждение о перезаписи)
- [ ] Индикатор "подключено/не подключено" на каждой карточке
- [ ] Модальное окно с инструкцией по получению токена (клик на иконку ?)
- [ ] Skeleton при загрузке данных подключений
- [ ] Анимация появления карточек (stagger)

### Фаза 6. Страница /data — редизайн (~45 мин)

- [ ] Skeleton-карточки сообщений при загрузке (точно повторяют форму реальной карточки)
- [ ] Empty state: иллюстрация Undraw + заголовок + CTA кнопка
- [ ] Анимация появления карточек списка (AutoAnimate или stagger)
- [ ] Фильтры в sidebar-панели (mobile: drawer снизу)
- [ ] Confirm-модалка при удалении сообщения (danger-тип)

### Фаза 7. Иллюстрации и полировка (~30 мин)

- [ ] Скачать с undraw.co (primary color #8ae3ee) 6 иллюстраций из DESIGN.md
- [ ] Разместить в `public/illustrations/`
- [ ] Подключить на empty-state страницах
- [ ] Финальная проверка на iPhone SE (375px) через DevTools
- [ ] Финальная проверка на 1920px
- [ ] Проверить: все анимации 60fps (DevTools Performance)

## Критерии готовности

- [ ] Сайдбар плавно сворачивается/разворачивается на desktop
- [ ] На мобильном бургер анимирован, drawer работает
- [ ] Все данные имеют состояния: loading (skeleton) → loaded → empty (иллюстрация)
- [ ] Все графики показывают живые placeholder-данные при загрузке
- [ ] ConfirmModal появляется при logout и деструктивных действиях
- [ ] Нет иконок кроме Lucide
- [ ] Нет белых фонов
- [ ] Страница без горизонтального скролла на 375px

## Риски

- Recharts SSR: использовать `dynamic(() => import(...), { ssr: false })` для всех chart-компонентов
- Framer Motion + Next.js App Router: все анимированные компоненты — `'use client'`
- Portal в Next.js: проверить что `document` доступен (useEffect для монтирования)

---

## Итог

*(заполнить после реализации)*
