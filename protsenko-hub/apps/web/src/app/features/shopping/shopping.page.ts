import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

interface ShoppingItem {
  id: string;
  name: string;
  qty: number;
  unit: string | null;
  category: string | null;
  isChecked: boolean;
  version: number;
}

@Component({
  selector: 'app-shopping-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <header class="head">
        <h2>Покупки</h2>
        <p>Список для магазину — відмічайте прямо з телефону.</p>
      </header>

      <form class="compose" (ngSubmit)="create()">
        <input name="name" [(ngModel)]="name" placeholder="Що купити?" required />
        <button type="submit">Додати</button>
      </form>

      <ul>
        @for (item of items(); track item.id) {
          <li [class.checked]="item.isChecked">
            <button type="button" class="check" (click)="toggle(item)">
              {{ item.isChecked ? '✓' : '' }}
            </button>
            <div>
              <strong>{{ item.name }}</strong>
              <p>{{ item.qty }}{{ item.unit ? ' ' + item.unit : '' }}</p>
            </div>
            <button type="button" class="ghost" (click)="remove(item.id)">✕</button>
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
      button[type='submit'] {
        border: 0;
        border-radius: 0.75rem;
        padding: 0.8rem 1rem;
        background: #c45c26;
        color: #fff8f3;
        cursor: pointer;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.5rem;
      }
      li {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.75rem;
        align-items: center;
        padding: 0.75rem 0;
        border-bottom: 1px solid rgba(29, 42, 36, 0.08);
      }
      li.checked strong {
        text-decoration: line-through;
        color: #7a8781;
      }
      li p {
        margin: 0.1rem 0 0;
        color: #5b6b63;
        font-size: 0.85rem;
      }
      .check {
        width: 1.7rem;
        height: 1.7rem;
        border-radius: 0.5rem;
        border: 1.5px solid #2f6f5e;
        background: transparent;
        color: #2f6f5e;
        cursor: pointer;
      }
      li.checked .check {
        background: #2f6f5e;
        color: #f7f4ef;
      }
      .ghost {
        border: 0;
        background: transparent;
        color: #8a9690;
        cursor: pointer;
      }
    `,
  ],
})
export class ShoppingPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<ShoppingItem[]>([]);
  name = '';

  ngOnInit(): void {
    const sub = this.api
      .get<ShoppingItem[]>('/shopping/items')
      .subscribe((items) => this.items.set(items));
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  create(): void {
    if (!this.name.trim()) {
      return;
    }
    this.api
      .post<ShoppingItem>('/shopping/items', { name: this.name.trim() })
      .subscribe((created) => {
        this.items.update((list) => [created, ...list]);
        this.name = '';
      });
  }

  toggle(item: ShoppingItem): void {
    this.api
      .patch<ShoppingItem>(`/shopping/items/${item.id}`, {
        isChecked: !item.isChecked,
        version: item.version,
      })
      .subscribe((updated) => {
        this.items.update((list) =>
          list.map((row) => (row.id === updated.id ? updated : row)),
        );
      });
  }

  remove(id: string): void {
    this.api.delete(`/shopping/items/${id}`).subscribe(() => {
      this.items.update((list) => list.filter((item) => item.id !== id));
    });
  }
}
