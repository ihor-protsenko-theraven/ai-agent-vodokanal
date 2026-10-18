import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { ApiService } from '../../core/api.service';

interface EventItem {
  id: string;
  title: string;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  member?: { color: string; displayName: string } | null;
}

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <section>
      <header class="head">
        <h2>Календар</h2>
        <p>Події сімʼї — додавання, перегляд, редагування, видалення.</p>
      </header>

      <form class="compose" (ngSubmit)="create()">
        <input name="title" [(ngModel)]="title" placeholder="Нова подія" required />
        <input type="datetime-local" name="startsAt" [(ngModel)]="startsAt" required />
        <button type="submit">Додати</button>
      </form>

      <ul>
        @for (event of events(); track event.id) {
          <li>
            <span class="dot" [style.background]="event.member?.color || '#2f6f5e'"></span>
            <div>
              <strong>{{ event.title }}</strong>
              <p>{{ event.startsAt | date: 'dd.MM.yyyy HH:mm' }}</p>
            </div>
            <button type="button" (click)="remove(event.id)">✕</button>
          </li>
        }
      </ul>
    </section>
  `,
  styles: [
    `
      .head h2 {
        margin: 0;
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.8rem;
      }
      .head p {
        color: #5b6b63;
        margin: 0.35rem 0 1.25rem;
      }
      .compose {
        display: grid;
        gap: 0.6rem;
        margin-bottom: 1.25rem;
      }
      input,
      button {
        font: inherit;
      }
      input {
        border: 1px solid rgba(29, 42, 36, 0.12);
        border-radius: 0.75rem;
        padding: 0.8rem 0.9rem;
        background: rgba(255, 255, 255, 0.65);
      }
      button {
        border: 0;
        border-radius: 0.75rem;
        padding: 0.8rem 1rem;
        background: #2f6f5e;
        color: #f7f4ef;
        cursor: pointer;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.65rem;
      }
      li {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.75rem;
        align-items: center;
        padding: 0.9rem 0;
        border-bottom: 1px solid rgba(29, 42, 36, 0.08);
      }
      li p {
        margin: 0.15rem 0 0;
        color: #5b6b63;
        font-size: 0.9rem;
      }
      .dot {
        width: 0.75rem;
        height: 0.75rem;
        border-radius: 999px;
      }
      li button {
        background: transparent;
        color: #8a9690;
        padding: 0.35rem;
      }
    `,
  ],
})
export class CalendarPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly events = signal<EventItem[]>([]);
  title = '';
  startsAt = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api
      .get<EventItem[]>('/events')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => this.events.set(items));
  }

  create(): void {
    if (!this.title || !this.startsAt) {
      return;
    }
    const start = new Date(this.startsAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    this.api
      .post<EventItem>('/events', {
        title: this.title,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      })
      .subscribe((created) => {
        this.events.update((list) => [...list, created]);
        this.title = '';
      });
  }

  remove(id: string): void {
    this.api.delete(`/events/${id}`).subscribe(() => {
      this.events.update((list) => list.filter((item) => item.id !== id));
    });
  }
}
