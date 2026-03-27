# Next.js 15 + App Router + TypeScript + Tailwind + ESLint + shadcn/ui (гайд)

Цей гайд допоможе створити проєкт “як `my-finance-tracker`”: Next.js 15 (App Router) + TypeScript + Tailwind CSS + ESLint + `shadcn/ui`.

## 0) Передумови

1. Встановіть **Node.js LTS** (потрібен для Next.js та shadcn/ui):
   - Перевірка:
     ```bash
     node -v
     npm -v
     ```
2. Рекомендується використовувати **pnpm** (у вас є `pnpm-lock.yaml`, тож логічно):
   - Варіант A (якщо `corepack` доступний):
     ```bash
     corepack enable
     corepack prepare pnpm@latest --activate
     pnpm -v
     ```
   - Варіант B (якщо `corepack` немає):
     ```bash
     npm i -g pnpm
     pnpm -v
     ```

## 1) Створіть Next.js 15 App Router проєкт

Зробіть нову папку/проєкт (в прикладі: `my-finance-tracker`):

```bash
cd /path/to/your/workspace
pnpm create next-app@latest my-finance-tracker --ts --app --tailwind --eslint
```

Якщо ви обираєте через інтерактивне меню `create-next-app`, то треба вибрати:
- `App Router`
- `TypeScript`
- `Tailwind CSS`
- `ESLint`

Після створення перейдіть у папку:
```bash
cd my-finance-tracker
```

## 2) Ініціалізуйте shadcn/ui

У корені проєкту виконайте:

```bash
pnpm dlx shadcn-ui@latest init
```

Якщо ви працюєте через `npm`, можна так:
```bash
npx shadcn-ui@latest init
```

Під час ініціалізації зазвичай потрібно вказати шлях до Tailwind CSS (якщо меню запропонує). Найчастіше shadcn/ui сам підхоплює конфіг, якщо Tailwind вже підключений.

Результат:
- з’явиться `components.json`
- з’явиться папка з UI-компонентами (наприклад `src/components/ui`)
- можуть бути додані/оновлені стилі/утиліти відповідно до Tailwind

## 3) Додайте потрібні shadcn/ui компоненти (приклади)

Наприклад, щоб додати кнопку:
```bash
pnpm dlx shadcn-ui@latest add button
```

Щоб додати, скажімо, `dropdown-menu`:
```bash
pnpm dlx shadcn-ui@latest add dropdown-menu
```

Аналогічно через `npx` (якщо без `pnpm`):
```bash
npx shadcn-ui@latest add button
```

Компонентів можна додавати стільки, скільки потрібно для вашого UI.

## 4) Встановіть залежності та запустіть dev-сервер

```bash
pnpm install # зазвичай це вже зроблено create-next-app, але залишив тут як “надійний” крок
pnpm dev
```

Відкрийте:
- `http://localhost:3000`

## 5) Типові проблеми (корисні перевірки)

1. Немає `pnpm`:
   ```bash
   npm i -g pnpm
   ```
   Або тимчасово працюйте через `npm`:
   ```bash
   npm install
   npm run dev
   ```
2. `node`/`npm` не знайдено:
   - встановіть Node.js (LTS) з офіційного сайту або через `brew`
3. Tailwind не працює:
   - переконайтесь, що в проєкті є `tailwind.config.*`, `src/styles/globals.css`
   - переконайтесь, що `globals.css` імпортиться в `app/layout.tsx`

## 6) Що робити, якщо вам треба “ще один такий самий проєкт”

Повторюйте послідовність:
1) `pnpm create next-app@latest ... --ts --app --tailwind --eslint`  
2) `pnpm dlx shadcn-ui@latest init`  
3) `pnpm dlx shadcn-ui@latest add <component>` (за потреби)  
4) `pnpm dev`

