import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

interface TaskItem {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  status: TaskStatus;
  priority: number;
}

@Component({
  selector: 'app-solomiya-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <section>
      <header class="head">
        <h2>Соломія</h2>
        <p>Задачі по дитині — садочок, лікарі, підготовка.</p>
      </header>

      <form class="compose" (ngSubmit)="create()">
        <input name="title" [(ngModel)]="title" placeholder="Нова задача" required />
        <button type="submit">Додати</button>
      </form>

      <ul>
        @for (task of tasks(); track task.id) {
          <li>
            <div>
              <strong>{{ task.title }}</strong>
              <p>
                {{ statusLabel(task.status) }}
                @if (task.dueAt) {
                  · до {{ task.dueAt | date: 'dd.MM' }}
                }
              </p>
            </div>
            <div class="actions">
              <button type="button" (click)="cycle(task)">Статус</button>
              <button type="button" class="ghost" (click)="remove(task.id)">✕</button>
            </div>
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
        grid-template-columns: 1fr auto;
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
        padding: 0.7rem 0.9rem;
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
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.9rem 0;
        border-bottom: 1px solid rgba(29, 42, 36, 0.08);
      }
      li p {
        margin: 0.2rem 0 0;
        color: #5b6b63;
        font-size: 0.9rem;
      }
      .actions {
        display: flex;
        gap: 0.35rem;
        align-items: start;
      }
      .ghost {
        background: transparent;
        color: #8a9690;
      }
    `,
  ],
})
export class SolomiyaPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tasks = signal<TaskItem[]>([]);
  title = '';

  private readonly order: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

  ngOnInit(): void {
    const sub = this.api
      .get<TaskItem[]>('/solomiya/tasks')
      .subscribe((tasks) => this.tasks.set(tasks));
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  statusLabel(status: TaskStatus): string {
    switch (status) {
      case 'TODO':
        return 'До зробити';
      case 'IN_PROGRESS':
        return 'В процесі';
      case 'DONE':
        return 'Готово';
      default: {
        const _exhaustive: never = status;
        return _exhaustive;
      }
    }
  }

  create(): void {
    if (!this.title.trim()) {
      return;
    }
    this.api
      .post<TaskItem>('/solomiya/tasks', { title: this.title.trim(), priority: 1 })
      .subscribe((created) => {
        this.tasks.update((list) => [created, ...list]);
        this.title = '';
      });
  }

  cycle(task: TaskItem): void {
    const idx = this.order.indexOf(task.status);
    const next = this.order[(idx + 1) % this.order.length];
    this.api
      .patch<TaskItem>(`/solomiya/tasks/${task.id}`, { status: next })
      .subscribe((updated) => {
        this.tasks.update((list) =>
          list.map((row) => (row.id === updated.id ? updated : row)),
        );
      });
  }

  remove(id: string): void {
    this.api.delete(`/solomiya/tasks/${id}`).subscribe(() => {
      this.tasks.update((list) => list.filter((task) => task.id !== id));
    });
  }
}
