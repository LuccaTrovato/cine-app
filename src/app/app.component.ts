import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar />
    <main class="contenido">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      .contenido {
        min-height: calc(100vh - 60px);
        max-width: 1200px;
        margin: 0 auto;
        padding: 1.5rem;
      }
    `,
  ],
})
export class AppComponent {}
