import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/public/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'beneficios',
    loadComponent: () =>
      import('./features/public/beneficios/beneficios.component').then((m) => m.BeneficiosComponent),
  },
  {
    path: 'peliculas/:id',
    loadComponent: () =>
      import('./features/public/pelicula-detalle/pelicula-detalle.component').then((m) => m.PeliculaDetalleComponent),
  },
  {
    path: 'candy-bar',
    loadComponent: () => import('./features/cliente/candy-bar/candy-bar.component').then((m) => m.CandyBarComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/registro',
    loadComponent: () => import('./features/auth/registro/registro.component').then((m) => m.RegistroComponent),
  },
  {
    path: 'funciones/:id/butacas',
    loadComponent: () =>
      import('./features/reserva/seleccion-butacas/seleccion-butacas.component').then((m) => m.SeleccionButacasComponent),
  },
  {
    path: 'mis-entradas',
    loadComponent: () => import('./features/cliente/mis-entradas/mis-entradas.component').then((m) => m.MisEntradasComponent),
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cliente/perfil/perfil.component').then((m) => m.PerfilComponent),
  },
  {
    path: 'empleado/validar-qr',
    canActivate: [roleGuard(['empleado', 'admin'])],
    loadComponent: () => import('./features/empleado/validar-qr/validar-qr.component').then((m) => m.ValidarQrComponent),
  },
  {
    path: 'admin',
    canActivate: [roleGuard(['admin'])],
    loadComponent: () => import('./features/admin/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'peliculas', pathMatch: 'full' },
      {
        path: 'peliculas',
        loadComponent: () =>
          import('./features/admin/peliculas-admin/peliculas-admin.component').then((m) => m.PeliculasAdminComponent),
      },
      {
        path: 'funciones',
        loadComponent: () =>
          import('./features/admin/funciones-admin/funciones-admin.component').then((m) => m.FuncionesAdminComponent),
      },
      {
        path: 'candy-bar',
        loadComponent: () =>
          import('./features/admin/productos-admin/productos-admin.component').then((m) => m.ProductosAdminComponent),
      },
      {
        path: 'cupones',
        loadComponent: () =>
          import('./features/admin/cupones-admin/cupones-admin.component').then((m) => m.CuponesAdminComponent),
      },
      {
        path: 'reportes',
        loadComponent: () => import('./features/admin/reportes/reportes.component').then((m) => m.ReportesComponent),
      },
      {
        path: 'auditoria',
        loadComponent: () => import('./features/admin/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
