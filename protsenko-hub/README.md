# protsenkoHub

Сімейний хаб: календар, список покупок, задачі Соломії, контакти лікарів/репетиторів.

## Стек

- **apps/web** — Angular 19 (standalone, signals, lazy routes)
- **apps/api** — NestJS 11 (JWT cookie auth, modular monolith)
- **packages/shared** — спільні DTO/типи
- **DB** — Prisma + SQLite локально; для Vercel — Neon Postgres (`DATABASE_URL`)

## Швидкий старт

```bash
cd protsenko-hub
pnpm install
cp env.example apps/api/.env

# DB
pnpm --filter api exec prisma migrate dev --name init
pnpm --filter api exec prisma db seed

# API :3001  +  Web :4200
pnpm dev:api
pnpm dev:web
```

Демо-логін після seed:

- `admin@protsenkohub.local` / `protsenko123`
- `family@protsenkohub.local` / `protsenko123`

## Структура API

| Метод | Шлях | Опис |
|-------|------|------|
| POST | `/api/v1/auth/login` | Логін (httpOnly cookie) |
| GET | `/api/v1/events` | Події календаря |
| GET/POST/PATCH/DELETE | `/api/v1/shopping/items` | Покупки |
| GET/POST/PATCH/DELETE | `/api/v1/solomiya/tasks` | Задачі Соломії |
| GET/POST/PATCH/DELETE | `/api/v1/contacts` | Контакти |

## Перенесення в окреме репо

Ця папка `protsenko-hub/` самодостатня. Можна скопіювати її вміст у новий репозиторій як root.
