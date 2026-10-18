import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/api.service';

type ContactCategory = 'DOCTOR' | 'TUTOR' | 'SCHOOL' | 'FAMILY' | 'OTHER';

interface ContactItem {
  id: string;
  name: string;
  category: ContactCategory;
  phone: string | null;
  email: string | null;
  organization: string | null;
  notes: string | null;
}

@Component({
  selector: 'app-contacts-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <header class="head">
        <h2>Контакти</h2>
        <p>Лікарі, репетитори, школа — швидко знайти й подзвонити.</p>
      </header>

      <form class="compose" (ngSubmit)="create()">
        <input name="name" [(ngModel)]="name" placeholder="Імʼя" required />
        <select name="category" [(ngModel)]="category">
          <option value="DOCTOR">Лікар</option>
          <option value="TUTOR">Репетитор</option>
          <option value="SCHOOL">Школа</option>
          <option value="FAMILY">Сімʼя</option>
          <option value="OTHER">Інше</option>
        </select>
        <input name="phone" [(ngModel)]="phone" placeholder="Телефон" />
        <button type="submit">Зберегти</button>
      </form>

      <ul>
        @for (contact of contacts(); track contact.id) {
          <li>
            <div>
              <strong>{{ contact.name }}</strong>
              <p>
                {{ categoryLabel(contact.category) }}
                @if (contact.organization) {
                  · {{ contact.organization }}
                }
              </p>
              @if (contact.phone) {
                <a [href]="'tel:' + contact.phone">{{ contact.phone }}</a>
              }
            </div>
            <button type="button" class="ghost" (click)="remove(contact.id)">✕</button>
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
      select,
      button {
        font: inherit;
      }
      input,
      select {
        border: 1px solid rgba(29, 42, 36, 0.12);
        border-radius: 0.75rem;
        padding: 0.8rem 0.9rem;
        background: rgba(255, 255, 255, 0.65);
      }
      button[type='submit'] {
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
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.9rem 0;
        border-bottom: 1px solid rgba(29, 42, 36, 0.08);
      }
      li p {
        margin: 0.2rem 0;
        color: #5b6b63;
        font-size: 0.9rem;
      }
      a {
        color: #2f6f5e;
        text-decoration: none;
        font-weight: 600;
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
export class ContactsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly contacts = signal<ContactItem[]>([]);
  name = '';
  phone = '';
  category: ContactCategory = 'DOCTOR';

  ngOnInit(): void {
    this.api
      .get<ContactItem[]>('/contacts')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contacts) => this.contacts.set(contacts));
  }

  categoryLabel(category: ContactCategory): string {
    switch (category) {
      case 'DOCTOR':
        return 'Лікар';
      case 'TUTOR':
        return 'Репетитор';
      case 'SCHOOL':
        return 'Школа';
      case 'FAMILY':
        return 'Сімʼя';
      case 'OTHER':
        return 'Інше';
      default: {
        const _exhaustive: never = category;
        return _exhaustive;
      }
    }
  }

  create(): void {
    if (!this.name.trim()) {
      return;
    }
    this.api
      .post<ContactItem>('/contacts', {
        name: this.name.trim(),
        category: this.category,
        phone: this.phone || undefined,
      })
      .subscribe((created) => {
        this.contacts.update((list) => [created, ...list]);
        this.name = '';
        this.phone = '';
      });
  }

  remove(id: string): void {
    this.api.delete(`/contacts/${id}`).subscribe(() => {
      this.contacts.update((list) => list.filter((c) => c.id !== id));
    });
  }
}
