import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'calendar' },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/calendar.page').then((m) => m.CalendarPage),
      },
      {
        path: 'shopping',
        loadComponent: () =>
          import('./features/shopping/shopping.page').then((m) => m.ShoppingPage),
      },
      {
        path: 'solomiya',
        loadComponent: () =>
          import('./features/solomiya/solomiya.page').then((m) => m.SolomiyaPage),
      },
      {
        path: 'contacts',
        loadComponent: () =>
          import('./features/contacts/contacts.page').then((m) => m.ContactsPage),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'app/calendar' },
  { path: '**', redirectTo: 'app/calendar' },
];
