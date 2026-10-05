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
        <input class="archivo" type="file" accept="image/*" (change)="archivoSeleccionado.set($any($event.target).files[0])" />
      </label>
      <div class="fila">
        <label>
          Fecha de estreno
          <input class="fecha-personalizada" type="date" formControlName="fecha_estreno" />
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
              <div class="acciones-tabla">
                <button class="btn-editar" (click)="editar(p)">Editar</button>
                <button class="btn-eliminar" (click)="eliminar(p)">Eliminar</button>
              </div>
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
        box-sizing: border-box;
        width: 100%;
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
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.9rem;
      }
      input,
      select,
      textarea {
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        padding: 0.5rem;
        border-radius: 4px;
        border: 1px solid #555;
        background: transparent;
        color: inherit;
      }
      .fecha-personalizada {
        color-scheme: dark;
      }
      .fecha-personalizada::-webkit-calendar-picker-indicator {
        filter: invert(1);
        opacity: 1;
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
        border-radius: 4px;
        padding: 0.55rem 1rem;
        font-size: 0.95rem;
        cursor: pointer;
      }
      .chips button.activo {
        background: #e50914;
        border-color: #e50914;
        color: #fff;
      }
      button[type='submit'],
      table button,
      .acciones-formulario button {
        background: #e50914;
        color: #fff;
        border: none;
        padding: 0.65rem 1.25rem;
        border-radius: 4px;
        cursor: pointer;
      }
      .archivo {
        padding: 0.55rem;
        border: 1px solid #555;
        border-radius: 4px;
        background: #181818;
      }
      .archivo::file-selector-button {
        margin-right: 0.75rem;
        padding: 0.5rem 0.8rem;
        border: 0;
        border-radius: 4px;
        background: #e50914;
        color: #fff;
        cursor: pointer;
      }
      .acciones-tabla {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .acciones-tabla button {
        min-width: 5.5rem;
      }
      .acciones-tabla .btn-editar {
        background: #333;
        border: 1px solid #777;
      }
      .acciones-tabla .btn-eliminar {
        background: transparent;
        border: 1px solid #e50914;
        color: #e50914;
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
      fecha_estreno: p.fecha_estreno ?? '',
      precio_preventa: p.precio_preventa ?? 0,
    });
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.generosForm = [];
    this.form.reset({ titulo: '', sinopsis: '', duracion_minutos: 90, clasificacion_edad: 'ATP', fecha_estreno: '', precio_preventa: 0 });
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
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaEstreno = valores.fecha_estreno ? new Date(`${valores.fecha_estreno}T00:00:00`) : null;

      const payload: Partial<Pelicula> = {
        ...valores,
        es_proximamente: fechaEstreno !== null && fechaEstreno > hoy,
        clasificacion_edad: valores.clasificacion_edad as Pelicula['clasificacion_edad'],
        generos: this.generosForm,
        fecha_estreno: valores.fecha_estreno || null,
        ...(this.editandoId() ? {} : { es_destacada: false }),
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
