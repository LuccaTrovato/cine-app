import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar />
    <main class="contenido">
      <router-outlet />
    </main>
    @if (loading.activo() > 0) {
      <div class="loading-overlay" role="status" aria-live="polite" aria-label="Cargando">
        <div class="spinner"></div>
      </div>
    }
  `,
  styles: [
    `
      .contenido {
        flex: 1;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 1.5rem;
      }
      .loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
        background: rgba(0, 0, 0, 0.68);
        cursor: wait;
      }
      .spinner {
        width: 3.5rem;
        height: 3.5rem;
        border: 4px solid rgba(255, 255, 255, 0.25);
        border-top-color: #e50914;
        border-radius: 50%;
        animation: girar 0.8s linear infinite;
      }
      @keyframes girar {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class AppComponent {
  loading = inject(LoadingService);
}
