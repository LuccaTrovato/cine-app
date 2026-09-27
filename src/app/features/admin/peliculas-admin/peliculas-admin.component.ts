import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { AuthService } from '../../../core/services/auth.service';
import { Pelicula } from '../../../core/models/pelicula.model';

const GENEROS_DISPONIBLES = ['Accion', 'Comedia', 'Drama', 'Sci-Fi', 'Terror', 'Animacion', 'Romance', 'Suspenso'];

@Component({
  selector: 'app-peliculas-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h1>Administrar Películas</h1>

    <form [formGroup]="form" (ngSubmit)="guardar()" class="formulario">
      <h2>{{ editandoId() ? 'Editar película' : 'Nueva película' }}</h2>
      <label>
        Título
        <input formControlName="titulo" />
      </label>
      <label>
        Sinopsis
        <textarea formControlName="sinopsis"></textarea>
      </label>
      <div class="fila">
        <label>
          Duración (min)
          <input type="number" formControlName="duracion_minutos" />
        </label>
        <label>
          Clasificación
          <select formControlName="clasificacion_edad">
            <option value="ATP">ATP</option>
            <option value="+13">+13</option>
            <option value="+18">+18</option>
          </select>
        </label>
      </div>
      <label>
        Géneros
        <div class="chips">
          @for (g of generosDisponibles; track g) {
            <button type="button" [class.activo]="generosForm.includes(g)" (click)="toggleGenero(g)">{{ g }}</button>
          }
        </div>
      </label>
      <label>
        Afiche
        <input type="file" accept="image/*" (change)="archivoSeleccionado.set($any($event.target).files[0])" />
      </label>
      <div class="fila">
        <label class="checkbox"><input type="checkbox" formControlName="es_destacada" /> Destacada</label>
        <label class="checkbox"><input type="checkbox" formControlName="es_proximamente" /> Próximamente</label>
      </div>
      <div class="fila">
        <label>
          Fecha de estreno
          <input type="date" formControlName="fecha_estreno" />
        </label>
        <label>
          Precio preventa
          <input type="number" step="0.01" formControlName="precio_preventa" />
        </label>
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="fila">
        <button type="submit" [disabled]="form.invalid || guardando()">{{ editandoId() ? 'Actualizar' : 'Crear' }}</button>
        @if (editandoId()) {
          <button type="button" (click)="cancelarEdicion()">Cancelar</button>
        }
      </div>
    </form>

    <h2>Catálogo</h2>
    <table>
      <thead>
        <tr>
          <th>Título</th>
          <th>Clasif.</th>
          <th>Duración</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @for (p of peliculas(); track p.id) {
          <tr>
            <td>{{ p.titulo }}</td>
            <td>{{ p.clasificacion_edad }}</td>
            <td>{{ p.duracion_minutos }} min</td>
            <td>
              @if (p.es_destacada) {
                <span class="chip">Destacada</span>
              }
              @if (p.es_proximamente) {
                <span class="chip">Próximamente</span>
              }
            </td>
            <td>
              <button (click)="editar(p)">Editar</button>
              <button (click)="eliminar(p)">Eliminar</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [
    `
      .formulario {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 480px;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1.25rem;
        margin-bottom: 2rem;
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
      label.checkbox {
        flex-direction: row;
        align-items: center;
      }
      input,
      select,
      textarea {
        padding: 0.5rem;
        border-radius: 4px;
        border: 1px solid #555;
        background: transparent;
        color: inherit;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
      }
      .chips button,
      .chip {
        border: 1px solid #555;
        background: transparent;
        color: inherit;
        border-radius: 14px;
        padding: 0.2rem 0.6rem;
        font-size: 0.75rem;
        cursor: pointer;
      }
      .chips button.activo {
        background: #e50914;
        border-color: #e50914;
        color: #fff;
      }
      button[type='submit'],
      table button {
        background: #e50914;
        color: #fff;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 0.5rem;
        border-bottom: 1px solid #333;
      }
      .error {
        color: #e50914;
      }
    `,
  ],
})
export class PeliculasAdminComponent implements OnInit {
  private fb = inject(FormBuilder);
  private peliculasService = inject(PeliculasService);
  private auditoriaService = inject(AuditoriaService);
  private auth = inject(AuthService);

  generosDisponibles = GENEROS_DISPONIBLES;
  peliculas = signal<Pelicula[]>([]);
  editandoId = signal<string | null>(null);
  guardando = signal(false);
  error = signal<string | null>(null);
  archivoSeleccionado = signal<File | null>(null);
  generosForm: string[] = [];

  form = this.fb.nonNullable.group({
    titulo: ['', Validators.required],
    sinopsis: ['', Validators.required],
    duracion_minutos: [90, [Validators.required, Validators.min(1)]],
    clasificacion_edad: ['ATP', Validators.required],
    es_destacada: [false],
    es_proximamente: [false],
    fecha_estreno: [''],
    precio_preventa: [0],
  });

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  private async recargar(): Promise<void> {
    this.peliculas.set(await this.peliculasService.listar());
  }

  toggleGenero(g: string): void {
    this.generosForm = this.generosForm.includes(g) ? this.generosForm.filter((x) => x !== g) : [...this.generosForm, g];
  }

  editar(p: Pelicula): void {
    this.editandoId.set(p.id);
    this.generosForm = [...p.generos];
    this.form.patchValue({
      titulo: p.titulo,
      sinopsis: p.sinopsis,
      duracion_minutos: p.duracion_minutos,
      clasificacion_edad: p.clasificacion_edad,
      es_destacada: p.es_destacada,
      es_proximamente: p.es_proximamente,
      fecha_estreno: p.fecha_estreno ?? '',
      precio_preventa: p.precio_preventa ?? 0,
    });
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.generosForm = [];
    this.form.reset({ titulo: '', sinopsis: '', duracion_minutos: 90, clasificacion_edad: 'ATP', es_destacada: false, es_proximamente: false, fecha_estreno: '', precio_preventa: 0 });
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      const valores = this.form.getRawValue();
      let imagenUrl: string | undefined;
      const archivo = this.archivoSeleccionado();
      if (archivo) imagenUrl = await this.peliculasService.subirAfiche(archivo);

      const payload: Partial<Pelicula> = {
        ...valores,
        clasificacion_edad: valores.clasificacion_edad as Pelicula['clasificacion_edad'],
        generos: this.generosForm,
        fecha_estreno: valores.fecha_estreno || null,
        ...(imagenUrl ? { imagen_url: imagenUrl } : {}),
      };

      const actorId = this.auth.profile()?.id;
      if (this.editandoId()) {
        await this.peliculasService.actualizar(this.editandoId()!, payload);
        if (actorId) await this.auditoriaService.registrar(actorId, 'Actualizar pelicula', 'peliculas', this.editandoId()!, payload);
      } else {
        const creada = await this.peliculasService.crear(payload);
        if (actorId) await this.auditoriaService.registrar(actorId, 'Crear pelicula', 'peliculas', creada.id, payload);
      }
      this.cancelarEdicion();
      await this.recargar();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Error al guardar la película.');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(p: Pelicula): Promise<void> {
    if (!confirm(`¿Eliminar "${p.titulo}"?`)) return;
    await this.peliculasService.eliminar(p.id);
    const actorId = this.auth.profile()?.id;
    if (actorId) await this.auditoriaService.registrar(actorId, 'Eliminar pelicula', 'peliculas', p.id);
    await this.recargar();
  }
}
