import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="hero">
      <div class="panel">
        <p class="eyebrow">сімейний хаб</p>
        <h1>protsenkoHub</h1>
        <p class="lead">Календар, покупки, задачі Соломії та контакти — в одному місці.</p>

        <form (ngSubmit)="submit()">
          <label>
            Email
            <input type="email" name="email" [(ngModel)]="email" required />
          </label>
          <label>
            Пароль
            <input type="password" name="password" [(ngModel)]="password" required />
          </label>
          @if (mode() === 'register') {
            <label>
              Імʼя
              <input name="displayName" [(ngModel)]="displayName" required />
            </label>
            <label>
              Назва сімʼї
              <input name="householdName" [(ngModel)]="householdName" required />
            </label>
          }
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <button type="submit">{{ mode() === 'login' ? 'Увійти' : 'Створити' }}</button>
        </form>

        <button type="button" class="link" (click)="toggle()">
          {{ mode() === 'login' ? 'Немає акаунту? Зареєструватись' : 'Вже є акаунт? Увійти' }}
        </button>
        <p class="hint">Демо: admin&#64;protsenkohub.local / protsenko123</p>
      </div>
    </section>
  `,
  styles: [
    `
      .hero {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background:
          linear-gradient(160deg, rgba(47, 111, 94, 0.18), transparent 45%),
          linear-gradient(20deg, rgba(196, 92, 38, 0.16), transparent 40%),
          #f3eee6;
      }
      .panel {
        width: min(100%, 420px);
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.75rem;
        color: #2f6f5e;
        margin: 0 0 0.5rem;
      }
      h1 {
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(2.4rem, 8vw, 3.4rem);
        margin: 0;
        line-height: 1.05;
      }
      .lead {
        color: #4d5c55;
        margin: 0.75rem 0 1.5rem;
      }
      form {
        display: grid;
        gap: 0.85rem;
      }
      label {
        display: grid;
        gap: 0.35rem;
        font-size: 0.9rem;
      }
      input {
        border: 1px solid rgba(29, 42, 36, 0.15);
        border-radius: 0.75rem;
        padding: 0.85rem 0.95rem;
        background: rgba(255, 255, 255, 0.7);
        font: inherit;
      }
      button[type='submit'] {
        border: 0;
        border-radius: 0.85rem;
        padding: 0.95rem 1rem;
        background: #2f6f5e;
        color: #f7f4ef;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }
      .link {
        margin-top: 1rem;
        border: 0;
        background: transparent;
        color: #2f6f5e;
        cursor: pointer;
        font: inherit;
      }
      .error {
        color: #9b2c2c;
        margin: 0;
      }
      .hint {
        color: #6b7a73;
        font-size: 0.8rem;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = 'admin@protsenkohub.local';
  password = 'protsenko123';
  displayName = '';
  householdName = 'Сімʼя Проценко';
  readonly mode = signal<'login' | 'register'>('login');
  readonly error = signal('');

  toggle(): void {
    this.mode.update((m) => (m === 'login' ? 'register' : 'login'));
    this.error.set('');
  }

  submit(): void {
    this.error.set('');
    const req =
      this.mode() === 'login'
        ? this.auth.login(this.email, this.password)
        : this.auth.register({
            email: this.email,
            password: this.password,
            displayName: this.displayName,
            householdName: this.householdName,
          });

    req.subscribe({
      next: () => void this.router.navigateByUrl('/app/calendar'),
      error: () => this.error.set('Не вдалося увійти. Перевірте дані.'),
    });
  }
}
