import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FuncionesService } from '../../../core/services/funciones.service';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Funcion, Sala } from '../../../core/models/funcion.model';
import { Pelicula } from '../../../core/models/pelicula.model';

const DIAS = [
  { valor: 1, etiqueta: 'Lunes' },
  { valor: 2, etiqueta: 'Martes' },
  { valor: 3, etiqueta: 'Miércoles' },
  { valor: 4, etiqueta: 'Jueves' },
  { valor: 5, etiqueta: 'Viernes' },
  { valor: 6, etiqueta: 'Sábado' },
  { valor: 0, etiqueta: 'Domingo' },
];

@Component({
  selector: 'app-funciones-admin',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <h1>Programar Funciones</h1>
    <p>El sistema asigna automáticamente una sala libre respetando 30 minutos de limpieza entre funciones.</p>

    <form [formGroup]="form" (ngSubmit)="programar()" class="formulario">
      <label>
        Película
        <select formControlName="peliculaId">
          <option value="" disabled>Seleccioná una película</option>
          @for (p of peliculas(); track p.id) {
            <option [value]="p.id">{{ p.titulo }} ({{ p.duracion_minutos }} min)</option>
          }
        </select>
      </label>

      <label>
        Días de la semana
        <div class="chips">
          @for (d of dias; track d.valor) {
            <button type="button" [class.activo]="diasSeleccionados.includes(d.valor)" (click)="toggleDia(d.valor)">
              {{ d.etiqueta }}
            </button>
          }
        </div>
      </label>

      <div class="fila">
        <label>
          Hora
          <input type="time" formControlName="hora" />
        </label>
        <label>
          Fecha desde
          <input class="fecha-personalizada" type="date" formControlName="fechaInicio" />
        </label>
        <label>
          Semanas a programar
          <input type="number" min="1" max="12" formControlName="semanas" />
        </label>
      </div>

      <div class="fila">
        <label>
          Formato
          <select formControlName="formato">
            <option value="2D">2D</option>
            <option value="3D">3D</option>
            <option value="4D">4D</option>
            <option value="5D">5D</option>
          </select>
        </label>
        <label>
          Idioma
          <select formControlName="idioma">
            <option value="Castellano">Castellano</option>
            <option value="Subtitulada">Subtitulada</option>
          </select>
        </label>
        <label>
          Precio base
          <input type="number" step="0.01" formControlName="precioBase" />
        </label>
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      @if (exito()) {
        <p class="exito">{{ exito() }}</p>
      }

      <button class="btn-primario" type="submit" [disabled]="form.invalid || diasSeleccionados.length === 0 || programando()">
        {{ programando() ? 'Programando...' : 'Programar funciones' }}
      </button>
    </form>

    <h2>Salas</h2>
    <div class="fila-salas">
      @for (s of salas(); track s.id) {
        <span class="chip">{{ s.nombre }}</span>
      }
      <input #nombreSala placeholder="Nombre nueva sala" />
      <button class="btn-secundario" type="button" (click)="agregarSala(nombreSala.value); nombreSala.value = ''">Agregar sala</button>
    </div>

    <h2>Funciones programadas</h2>
    <label class="filtro-sala">
      Filtrar por sala
      <select [value]="salaFiltro()" (change)="salaFiltro.set($any($event.target).value)">
        <option value="todas">Todas las salas</option>
        @for (s of salas(); track s.id) {
          <option [value]="s.id">{{ s.nombre }}</option>
        }
      </select>
    </label>
    <table>
      <thead>
        <tr>
          <th>Película</th>
          <th>Fecha/Hora</th>
          <th>Sala</th>
          <th>Formato</th>
          <th>Precio</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @for (f of funcionesVisibles(); track f.id) {
          <tr>
            <td>{{ f.peliculas?.titulo }}</td>
            <td>{{ f.fecha_hora_inicio | date: 'dd/MM/yyyy HH:mm' }}</td>
            <td>{{ f.salas?.nombre }}</td>
            <td>{{ f.formato }} · {{ f.idioma }}</td>
            <td>&#36;{{ funcionesService.precioVigente(f) }}</td>
            <td><button class="btn-eliminar" (click)="eliminar(f)">Eliminar</button></td>
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
      .fila-salas {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 1.5rem;
      }
      .filtro-sala {
        display: block;
        max-width: 20rem;
        margin-bottom: 1rem;
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
      select {
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
      .fila-salas button {
        background: #e50914;
        color: #fff;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
      }
      .btn-primario {
        align-self: center;
        min-width: 13rem;
        padding: 0.7rem 1.3rem;
      }
      .btn-secundario {
        background: #333;
        border: 1px solid #777;
        padding: 0.65rem 1rem;
      }
      .btn-eliminar {
        background: transparent;
        border: 1px solid #e50914;
        color: #e50914;
        padding: 0.65rem 1rem;
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
      .exito {
        color: #2ecc71;
      }
    `,
  ],
})
export class FuncionesAdminComponent implements OnInit {
  private fb = inject(FormBuilder);
  funcionesService = inject(FuncionesService);
  private peliculasService = inject(PeliculasService);
  private auditoriaService = inject(AuditoriaService);
  private auth = inject(AuthService);
  private supabaseService = inject(SupabaseService);

  dias = DIAS;
  diasSeleccionados: number[] = [];
  peliculas = signal<Pelicula[]>([]);
  funciones = signal<Funcion[]>([]);
  salas = signal<Sala[]>([]);
  salaFiltro = signal('todas');
  funcionesVisibles = computed(() => {
    const filtro = this.salaFiltro();
    return filtro === 'todas' ? this.funciones() : this.funciones().filter((funcion) => funcion.sala_id === filtro);
  });
  programando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    peliculaId: ['', Validators.required],
    hora: ['18:00', Validators.required],
    fechaInicio: [new Date().toISOString().slice(0, 10), Validators.required],
    semanas: [4, [Validators.required, Validators.min(1)]],
    formato: ['2D', Validators.required],
    idioma: ['Castellano', Validators.required],
    precioBase: [3500, [Validators.required, Validators.min(0)]],
  });

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  private async recargar(): Promise<void> {
    const [peliculas, funciones, salas] = await Promise.all([
      this.peliculasService.listar(),
      this.funcionesService.listar(new Date().toISOString()),
      this.funcionesService.listarSalas(),
    ]);
    this.peliculas.set(peliculas);
    this.funciones.set(funciones);
    this.salas.set(salas);
  }

  toggleDia(dia: number): void {
    this.diasSeleccionados = this.diasSeleccionados.includes(dia)
      ? this.diasSeleccionados.filter((d) => d !== dia)
      : [...this.diasSeleccionados, dia];
  }

  async programar(): Promise<void> {
    if (this.form.invalid || this.diasSeleccionados.length === 0) return;
    this.programando.set(true);
    this.error.set(null);
    this.exito.set(null);
    try {
      const valores = this.form.getRawValue();
      const pelicula = this.peliculas().find((p) => p.id === valores.peliculaId);
      if (!pelicula) throw new Error('Seleccioná una película válida.');

      const creadas = await this.funcionesService.programarFunciones({
        peliculaId: valores.peliculaId,
        duracionMinutos: pelicula.duracion_minutos,
        diasSemana: this.diasSeleccionados,
        hora: valores.hora,
        formato: valores.formato as Funcion['formato'],
        idioma: valores.idioma as Funcion['idioma'],
        precioBase: valores.precioBase,
        fechaInicio: valores.fechaInicio,
        semanas: valores.semanas,
      });

      this.exito.set(`Se programaron ${creadas.length} funciones automáticamente.`);
      const actorId = this.auth.profile()?.id;
      if (actorId) await this.auditoriaService.registrar(actorId, 'Programar funciones', 'funciones', undefined, { cantidad: creadas.length });
      await this.recargar();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudieron programar las funciones.');
    } finally {
      this.programando.set(false);
    }
  }

  async agregarSala(nombre: string): Promise<void> {
    if (!nombre.trim()) return;
    const { error } = await this.supabaseService.client.from('salas').insert({ nombre: nombre.trim() });
    if (!error) await this.recargar();
  }

  async eliminar(f: Funcion): Promise<void> {
    if (!confirm('¿Eliminar esta función?')) return;
    await this.funcionesService.eliminar(f.id);
    const actorId = this.auth.profile()?.id;
    if (actorId) await this.auditoriaService.registrar(actorId, 'Eliminar funcion', 'funciones', f.id);
    await this.recargar();
  }
}
