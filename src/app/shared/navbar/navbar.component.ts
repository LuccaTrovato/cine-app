import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <a routerLink="/" class="marca">🎬 CineApp</a>
      <div class="enlaces">
        <a routerLink="/" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">Cartelera</a>
        <a routerLink="/candy-bar" routerLinkActive="activo">Candy Bar</a>

        @if (auth.isAuthenticated()) {
          <a routerLink="/mis-entradas" routerLinkActive="activo">Mis Entradas</a>
          <a routerLink="/perfil" routerLinkActive="activo">Perfil ({{ auth.profile()?.puntos_acumulados }} pts)</a>

          @if (auth.esEmpleado() || auth.esAdmin()) {
            <a routerLink="/empleado/validar-qr" routerLinkActive="activo">Validar QR</a>
          }
          @if (auth.esAdmin()) {
            <a routerLink="/admin" routerLinkActive="activo">Admin</a>
          }
          <button class="btn-salir" (click)="salir()">Salir</button>
        } @else {
          <a routerLink="/auth/login" routerLinkActive="activo">Ingresar</a>
          <a routerLink="/auth/registro" routerLinkActive="activo">Registrarse</a>
        }
      </div>
    </nav>
  `,
  styles: [
    `
      .navbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1.5rem;
        background: #141414;
        color: #fff;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .marca {
        font-weight: 700;
        font-size: 1.25rem;
        color: #e50914;
        text-decoration: none;
      }
      .enlaces {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
      }
      .enlaces a {
        color: #ddd;
        text-decoration: none;
        font-size: 0.9rem;
      }
      .enlaces a.activo {
        color: #e50914;
        font-weight: 600;
      }
      .btn-salir {
        background: transparent;
        border: 1px solid #e50914;
        color: #e50914;
        padding: 0.3rem 0.8rem;
        border-radius: 4px;
        cursor: pointer;
      }
    `,
  ],
})
export class NavbarComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  async salir(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
