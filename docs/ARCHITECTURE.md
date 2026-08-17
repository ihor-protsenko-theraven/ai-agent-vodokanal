# Архітектура фронтенду

Застосунок — нативний TypeScript + DOM API, без React/Vue та без прихованого
фреймворкового шару. Код організовано за предметними можливостями (feature-first),
а не за технічним типом файлу.

```
src/
├── app/                    # запуск застосунку, shell, спільний UI та стан сесії
│   ├── state/
│   └── ui/
├── features/
│   ├── tickets/            # чернетка заявки, дедуплікація, форма та drawer
│   ├── voice/              # Gemini, локальний розбір транскрипції та voice UI
│   ├── geocoding/          # оркестрація й адаптери Geodata/Nominatim
│   └── forland/            # API-клієнт, dropdowns і мапінг Save-запиту
├── shared/                 # типи, конфігурація та чисті утиліти без UI
└── main.ts                 # єдина точка входу Vite
```

## Межі модулів

- `domain` містить детерміновані правила предметної області без `fetch`, DOM і
  `localStorage`; такі модулі покриваються unit-тестами поруч із кодом.
- `application` оркеструє use case: будує Forland payload, запускає геокодування
  або локальний розбір голосового тексту.
- `infrastructure` — адаптери зовнішніх HTTP API. Вони не мають містити UI-логіку.
- `ui` використовує лише DOM API, читає стан через store і викликає його публічні
  дії. Він не формує API payload напряму.
- `app/state/TicketStateStore` є тонким координатором UI-flow. Нові правила,
  перетворення даних і мережеві виклики слід додавати у відповідний feature, а не
  розширювати store.

## Імпорти

Використовується один абсолютний alias: `@/* → src/*`.

```ts
import { wsnConfig } from '@/shared/config';
import { geocodingService } from '@/features/geocoding/application/GeocodingService';
```

Не додаємо нові відносні імпорти між feature (`../../...`). Відносні імпорти
припустимі лише всередині одного невеликого модуля, наприклад тест → файл поруч.

## Перевірки

```powershell
npm run typecheck
npm test
npm run build
```

`typecheck` виконується також перед production build. Це важливо для нативного
TypeScript-проєкту, де помилка шляху або контракту API не приховується збирачем
компонентів.
