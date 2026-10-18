import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <header class="top">
        <div class="brand">
          <span class="mark">ph</span>
          <div>
            <strong>protsenkoHub</strong>
            <p>{{ auth.user()?.displayName }}</p>
          </div>
        </div>
        <button type="button" class="ghost" (click)="auth.logout()">Вийти</button>
      </header>

      <main class="content">
        <router-outlet />
      </main>

      <nav class="tabs" aria-label="Основна навігація">
        @for (item of nav; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
        }
      </nav>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100dvh;
        display: grid;
        grid-template-rows: auto 1fr auto;
        background:
          radial-gradient(circle at 10% 0%, rgba(47, 111, 94, 0.14), transparent 40%),
          radial-gradient(circle at 90% 10%, rgba(196, 92, 38, 0.12), transparent 35%),
          #f7f4ef;
        color: #1d2a24;
      }
      .top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
      }
      .brand {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }
      .brand p {
        margin: 0;
        font-size: 0.85rem;
        color: #5b6b63;
      }
      .mark {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.85rem;
        display: grid;
        place-items: center;
        background: #2f6f5e;
        color: #f7f4ef;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .content {
        padding: 0 1.25rem 5.5rem;
        max-width: 720px;
        width: 100%;
        margin: 0 auto;
      }
      .tabs {
        position: sticky;
        bottom: 0;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.25rem;
        padding: 0.65rem 0.75rem calc(0.65rem + env(safe-area-inset-bottom));
        background: rgba(247, 244, 239, 0.92);
        backdrop-filter: blur(10px);
        border-top: 1px solid rgba(29, 42, 36, 0.08);
      }
      .tabs a {
        text-align: center;
        text-decoration: none;
        color: #5b6b63;
        font-size: 0.85rem;
        padding: 0.7rem 0.25rem;
        border-radius: 0.75rem;
      }
      .tabs a.active {
        background: #2f6f5e;
        color: #f7f4ef;
        font-weight: 600;
      }
      .ghost {
        border: 0;
        background: transparent;
        color: #5b6b63;
        cursor: pointer;
      }
    `,
  ],
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly nav = [
    { path: '/app/calendar', label: 'Календар' },
    { path: '/app/shopping', label: 'Покупки' },
    { path: '/app/solomiya', label: 'Соломія' },
    { path: '/app/contacts', label: 'Контакти' },
  ] as const;
}
