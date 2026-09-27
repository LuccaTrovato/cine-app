import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="layout">
      <nav class="submenu">
        <a routerLink="peliculas" routerLinkActive="activo">Películas</a>
        <a routerLink="funciones" routerLinkActive="activo">Funciones</a>
        <a routerLink="candy-bar" routerLinkActive="activo">Candy Bar</a>
        <a routerLink="cupones" routerLinkActive="activo">Cupones</a>
        <a routerLink="reportes" routerLinkActive="activo">Reportes</a>
        <a routerLink="auditoria" routerLinkActive="activo">Auditoría</a>
      </nav>
      <div class="panel">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [
    `
      .layout {
        display: flex;
        gap: 2rem;
      }
      .submenu {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 160px;
      }
      .submenu a {
        color: #ccc;
        text-decoration: none;
        padding: 0.4rem 0.6rem;
        border-radius: 4px;
        font-size: 0.9rem;
      }
      .submenu a.activo {
        background: #e50914;
        color: #fff;
      }
      .panel {
        flex: 1;
        min-width: 0;
      }
    `,
  ],
})
export class AdminLayoutComponent {}
