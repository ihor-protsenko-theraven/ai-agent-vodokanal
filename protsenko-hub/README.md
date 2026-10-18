# protsenkoHub

Самодостатній сімейний хаб у **окремій папці** `protsenko-hub/`.
Усі залежності (`node_modules`, `package-lock.json`) живуть тільки тут — корінь
`ai-agent-vodokanal` не потрібен для запуску. Цю папку можна перенести в окреме
репо як root.

## Стек

- **apps/web** — Angular 19 (standalone, signals, lazy routes)
- **apps/api** — NestJS 11 (JWT cookie auth, modular monolith)
- **packages/shared** — спільні DTO/типи
- **DB** — Prisma + SQLite локально; для Vercel — Neon Postgres (`DATABASE_URL`)
- **Package manager** — npm workspaces

## Швидкий старт

Усі команди — з цієї папки:

```bash
cd protsenko-hub
npm install
cp env.example apps/api/.env

# DB (після install prisma client уже згенеровано через postinstall)
npm run db:migrate
npm run db:seed

# API :3001  +  Web :4200  (у двох терміналах)
npm run dev:api
npm run dev:web
```

Демо-логін після seed:

- `admin@protsenkohub.local` / `protsenko123`
- `family@protsenkohub.local` / `protsenko123`

## Структура

```text
protsenko-hub/
├── apps/
│   ├── api/          # NestJS + Prisma
│   └── web/          # Angular
├── packages/
│   └── shared/       # спільні типи
├── package.json      # npm workspaces root
├── package-lock.json
├── env.example
└── node_modules/     # власні залежності проєкту
```

## API

| Метод | Шлях | Опис |
|-------|------|------|
| POST | `/api/v1/auth/login` | Логін (httpOnly cookie) |
| GET | `/api/v1/events` | Події календаря |
| GET/POST/PATCH/DELETE | `/api/v1/shopping/items` | Покупки |
| GET/POST/PATCH/DELETE | `/api/v1/solomiya/tasks` | Задачі Соломії |
| GET/POST/PATCH/DELETE | `/api/v1/contacts` | Контакти |

## Перенесення в окреме репо

Скопіюй **вміст** `protsenko-hub/` у новий репозиторій (як root), зроби
`npm install` і працюй далі там.
