import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="tarjeta">
      <h2>Ingresar</h2>
      <form [formGroup]="form" (ngSubmit)="enviar()">
        <label>
          Email
          <input type="email" formControlName="email" />
        </label>
        <label>
          Contraseña
          <input type="password" formControlName="password" />
        </label>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <button type="submit" [disabled]="form.invalid || cargando()">
          {{ cargando() ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>
      <p>¿No tenes cuenta? <a routerLink="/auth/registro">Registrate</a></p>
    </div>
  `,
  styles: [
    `
      .tarjeta {
        max-width: 380px;
        margin: 2rem auto;
        padding: 1.5rem;
        border: 1px solid #333;
        border-radius: 8px;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.9rem;
      }
      input {
        padding: 0.5rem;
        border-radius: 4px;
        border: 1px solid #555;
      }
      button {
        background: #e50914;
        color: #fff;
        border: none;
        padding: 0.6rem;
        border-radius: 4px;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .error {
        color: #e50914;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  cargando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async enviar(): Promise<void> {
    if (this.form.invalid) return;
    this.cargando.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    const { error } = await this.auth.login(email, password);
    this.cargando.set(false);
    if (error) {
      this.error.set(error);
      return;
    }
    this.router.navigateByUrl('/');
  }
}
