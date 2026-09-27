import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Rol } from '../models/profile.model';

/** Fabrica de guard funcional que restringe el acceso a los roles indicados. */
export function roleGuard(rolesPermitidos: Rol[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await esperarSesion(auth);

    if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);
    const rol = auth.rol();
    if (rol && rolesPermitidos.includes(rol)) return true;
    return router.createUrlTree(['/']);
  };
}

function esperarSesion(auth: AuthService): Promise<void> {
  if (!auth.cargandoSesion()) return Promise.resolve();
  return new Promise((resolve) => {
    const intervalo = setInterval(() => {
      if (!auth.cargandoSesion()) {
        clearInterval(intervalo);
        resolve();
      }
    }, 50);
  });
}
