import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.auth.bootstrap().subscribe({
      next: () => {
        if (this.router.url === '/' || this.router.url.startsWith('/login')) {
          void this.router.navigateByUrl('/app/calendar');
        }
      },
      error: () => {
        if (!this.router.url.startsWith('/login')) {
          void this.router.navigateByUrl('/login');
        }
      },
    });
  }
}
