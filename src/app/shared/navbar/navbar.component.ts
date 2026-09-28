import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <a routerLink="/" class="marca">Cine Luki <img src="icons/cinema_popcorn_icon-icons.com_66128.png" alt="Director" /></a>
      <div class="enlaces">
        <a routerLink="/" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">Cartelera</a>
        <a routerLink="/candy-bar" routerLinkActive="activo">Candy Bar</a>

        @if (auth.isAuthenticated()) {
          <a routerLink="/mis-entradas" routerLinkActive="activo">Mis Entradas</a>
          <a routerLink="/perfil" routerLinkActive="activo">{{ auth.profile()?.nombre }} ({{ auth.profile()?.puntos_acumulados }} pts)</a>

          @if (auth.esEmpleado() || auth.esAdmin()) {
            <a routerLink="/empleado/validar-qr" routerLinkActive="activo">Validar QR</a>
          }
          @if (auth.esAdmin()) {
            <a routerLink="/admin" routerLinkActive="activo">Admin</a>
          }
          <button class="btn-salir" (click)="salir()">Cerrar Sesion</button>
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
        position: relative;
        z-index: 1001;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 2rem 1.5rem;
        color: #fff;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0;
        border-bottom: 1px solid #fff;
      }
      .marca {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
        color: #fff;
        font-weight: 700;
        font-size: 2rem;
        text-decoration: none;
        padding-right: 1.5rem;
      }
      .marca img {
        width: 2rem;
        height: 2rem;
        display: block;
        }
      .enlaces {
        display: flex;
        flex: 1;
        justify-content: space-evenly;
        gap: 0.75rem;
        align-items: center;
        flex-wrap: wrap;
        margin-left: 1.5rem;
      }
      .enlaces a {
        color: #ddd;
        text-decoration: none;
        font-size: 1.3rem;
        font-weight: 600;
        text-align: center;
      }
      .enlaces a.activo {
        color: #e50914;
        font-weight: 600;
      }
      .btn-salir {
        background: #e50914;
        border: 1px solid #e50914;
        color: #fff;
        padding: 0.3rem 0.8rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1.3rem;

      }
      @media (max-width: 800px) {
        .navbar {
          padding: 1.25rem 1rem;
        }
        .marca {
          border-right: 0;
          padding-right: 0;
        }
        .enlaces {
          flex-basis: 100%;
          justify-content: space-between;
          margin: 0.75rem 0 0;
          padding-top: 0.75rem;
          border-top: 1px solid #555;
        }
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
