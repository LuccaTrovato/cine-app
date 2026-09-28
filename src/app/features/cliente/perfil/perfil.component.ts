import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (auth.profile(); as p) {
      <h1>Mi Perfil</h1>
      <div class="tarjeta">
        <div class="avatar">
          @if (p.avatar_url) {
            <img [src]="p.avatar_url" alt="avatar" />
          } @else {
            <div class="sin-avatar">{{ p.nombre.charAt(0) }}</div>
          }
          <label class="subir">
            Cambiar foto
            <input type="file" accept="image/*" (change)="subirAvatar($event)" hidden />
          </label>
        </div>

        <form [formGroup]="form" (ngSubmit)="guardar()">
          <label>
            Nombre
            <input formControlName="nombre" />
          </label>
          <label>
            Apellido
            <input formControlName="apellido" />
          </label>
          <p>DNI: {{ p.dni }}</p>
          <p>Fecha de nacimiento: {{ p.fecha_nacimiento }}</p>
          <p>Puntos acumulados: <strong>{{ p.puntos_acumulados }}</strong></p>
          <p>Crédito a favor: <strong>&#36;{{ p.credito_favor }}</strong></p>

          @if (guardado()) {
            <p class="exito">Perfil actualizado.</p>
          }
          <button type="submit" [disabled]="form.invalid">Guardar cambios</button>
        </form>
      </div>
    }
  `,
  styles: [
    `
      .tarjeta {
        max-width: 420px;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 0 auto;
      }
      .avatar {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .avatar img,
      .sin-avatar {
        width: 90px;
        height: 90px;
        border-radius: 50%;
        object-fit: cover;
      }
      .sin-avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #333;
        font-size: 2rem;
      }
      .subir {
        font-size: 0.8rem;
        color: #e50914;
        cursor: pointer;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
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
        align-self: center;
        background: #e50914;
        color: #fff;
        border: none;
        padding: 0.6rem;
        border-radius: 4px;
        cursor: pointer;
      }
      .exito {
        color: #2ecc71;
      }
    `,
  ],
})
export class PerfilComponent {
  auth = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private fb = inject(FormBuilder);

  guardado = signal(false);

  form = this.fb.nonNullable.group({
    nombre: [this.auth.profile()?.nombre ?? '', Validators.required],
    apellido: [this.auth.profile()?.apellido ?? '', Validators.required],
  });

  async guardar(): Promise<void> {
    if (this.form.invalid) return;
    await this.auth.actualizarPerfil(this.form.getRawValue());
    this.guardado.set(true);
    setTimeout(() => this.guardado.set(false), 2000);
  }

  async subirAvatar(evento: Event): Promise<void> {
    const archivo = (evento.target as HTMLInputElement).files?.[0];
    const usuario = this.auth.profile();
    if (!archivo || !usuario) return;

    const nombreArchivo = `${usuario.id}_${Date.now()}_${archivo.name}`;
    const { error } = await this.supabaseService.client.storage.from('avatars').upload(nombreArchivo, archivo, { upsert: true });
    if (error) return;

    const { data } = this.supabaseService.client.storage.from('avatars').getPublicUrl(nombreArchivo);
    await this.auth.actualizarPerfil({ avatar_url: data.publicUrl });
  }
}
