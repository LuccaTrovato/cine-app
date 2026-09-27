import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Permite el acceso solo a usuarios autenticados; espera a que se resuelva la sesion inicial. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await esperarSesion(auth);

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login']);
};

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
