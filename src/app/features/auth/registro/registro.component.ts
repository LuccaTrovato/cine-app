import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="tarjeta">
      <h2>Crear cuenta</h2>
      <form [formGroup]="form" (ngSubmit)="enviar()">
        <div class="fila">
          <label>
            Nombre
            <input formControlName="nombre" />
          </label>
          <label>
            Apellido
            <input formControlName="apellido" />
          </label>
        </div>
        <label>
          DNI
          <input formControlName="dni" />
        </label>
        <label>
          Fecha de nacimiento
          <input type="date" formControlName="fecha_nacimiento" />
        </label>
        <label>
          Email
          <input type="email" formControlName="email" />
        </label>
        <label>
          Contraseña (min. 6 caracteres)
          <input type="password" formControlName="password" />
        </label>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <button type="submit" [disabled]="form.invalid || cargando()">
          {{ cargando() ? 'Creando cuenta...' : 'Registrarme' }}
        </button>
      </form>
      <p>¿Ya tenes cuenta? <a routerLink="/auth/login">Ingresa</a></p>
    </div>
  `,
  styles: [
    `
      .tarjeta {
        max-width: 420px;
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
      .fila {
        display: flex;
        gap: 1rem;
      }
      label {
        flex: 1;
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
export class RegistroComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  cargando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    dni: ['', Validators.required],
    fecha_nacimiento: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async enviar(): Promise<void> {
    if (this.form.invalid) return;
    this.cargando.set(true);
    this.error.set(null);
    const { error } = await this.auth.registrar(this.form.getRawValue());
    this.cargando.set(false);
    if (error) {
      this.error.set(error);
      return;
    }
    this.router.navigateByUrl('/');
  }
}
