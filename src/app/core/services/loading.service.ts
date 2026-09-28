import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private operacionesPendientes = signal(0);
  readonly activo = this.operacionesPendientes.asReadonly();

  iniciar(): () => void {
    this.operacionesPendientes.update((cantidad) => cantidad + 1);
    let finalizada = false;

    return () => {
      if (finalizada) return;
      finalizada = true;
      this.operacionesPendientes.update((cantidad) => Math.max(0, cantidad - 1));
    };
  }
}
