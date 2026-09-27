import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { ResenasService } from '../../../core/services/resenas.service';
import { Pelicula } from '../../../core/models/pelicula.model';
import { EstrellasComponent } from '../../../shared/estrellas/estrellas.component';

const GENEROS_DISPONIBLES = ['Accion', 'Comedia', 'Drama', 'Sci-Fi', 'Terror', 'Animacion', 'Romance', 'Suspenso'];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, EstrellasComponent],
  template: `
    <section class="destacadas">
      <h2>🔥 Las más vendidas</h2>
      <div class="grilla">
        @for (p of masVendidas(); track p.id) {
          <a [routerLink]="['/peliculas', p.id]" class="tarjeta destacada">
            @if (p.imagen_url) {
              <img [src]="p.imagen_url" [alt]="p.titulo" />
            } @else {
              <div class="sin-imagen">Sin afiche</div>
            }
            <h3>{{ p.titulo }}</h3>
          </a>
        }
      </div>
    </section>

    <section class="buscador">
      <input
        type="text"
        placeholder="Buscar por título..."
        [value]="termino()"
        (input)="termino.set($any($event.target).value)"
      />
      <div class="generos">
        @for (g of generosDisponibles; track g) {
          <button
            type="button"
            [class.activo]="generosSeleccionados().includes(g)"
            (click)="toggleGenero(g)"
          >
            {{ g }}
          </button>
        }
      </div>
    </section>

    <section>
      <h2>🎬 Cartelera</h2>
      @if (cargando()) {
        <p>Cargando películas...</p>
      } @else if (peliculasFiltradas().length === 0) {
        <p>No se encontraron películas con esos filtros.</p>
      } @else {
        <div class="grilla">
          @for (p of peliculasFiltradas(); track p.id) {
            <a [routerLink]="['/peliculas', p.id]" class="tarjeta">
              @if (p.imagen_url) {
                <img [src]="p.imagen_url" [alt]="p.titulo" />
              } @else {
                <div class="sin-imagen">Sin afiche</div>
              }
              <div class="info">
                <h3>{{ p.titulo }}</h3>
                <p class="meta">{{ p.duracion_minutos }} min · {{ p.clasificacion_edad }}</p>
                <app-estrellas [puntuacion]="promedios().get(p.id) ?? 0" />
                @if (p.es_proximamente) {
                  <span class="badge">Próximamente</span>
                }
              </div>
            </a>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      section {
        margin-bottom: 2.5rem;
      }
      .grilla {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1.25rem;
      }
      .tarjeta {
        color: inherit;
        text-decoration: none;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        overflow: hidden;
        transition: transform 0.15s;
        display: block;
      }
      .tarjeta:hover {
        transform: translateY(-4px);
      }
      .tarjeta img {
        width: 100%;
        aspect-ratio: 2 / 3;
        object-fit: cover;
        display: block;
      }
      .sin-imagen {
        aspect-ratio: 2 / 3;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #222;
        color: #777;
        font-size: 0.8rem;
      }
      .info {
        padding: 0.6rem;
      }
      .info h3 {
        font-size: 0.95rem;
        margin: 0 0 0.25rem;
      }
      .meta {
        font-size: 0.75rem;
        color: #999;
        margin: 0 0 0.25rem;
      }
      .badge {
        display: inline-block;
        margin-top: 0.3rem;
        background: #e50914;
        color: #fff;
        font-size: 0.7rem;
        padding: 0.1rem 0.4rem;
        border-radius: 3px;
      }
      .buscador {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .buscador input {
        padding: 0.6rem;
        border-radius: 6px;
        border: 1px solid #555;
        max-width: 400px;
      }
      .generos {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .generos button {
        border: 1px solid #555;
        background: transparent;
        color: inherit;
        border-radius: 20px;
        padding: 0.3rem 0.8rem;
        cursor: pointer;
        font-size: 0.8rem;
      }
      .generos button.activo {
        background: #e50914;
        border-color: #e50914;
        color: #fff;
      }
    `,
  ],
})
export class HomeComponent implements OnInit {
  private peliculasService = inject(PeliculasService);
  private resenasService = inject(ResenasService);

  generosDisponibles = GENEROS_DISPONIBLES;

  peliculas = signal<Pelicula[]>([]);
  masVendidas = signal<Pelicula[]>([]);
  promedios = signal<Map<string, number>>(new Map());
  cargando = signal(true);

  termino = signal('');
  generosSeleccionados = signal<string[]>([]);

  peliculasFiltradas = computed(() => {
    const termino = this.termino().toLowerCase().trim();
    const generos = this.generosSeleccionados();
    return this.peliculas().filter((p) => {
      const coincideTitulo = !termino || p.titulo.toLowerCase().includes(termino);
      const coincideGenero = generos.length === 0 || p.generos.some((g) => generos.includes(g));
      return coincideTitulo && coincideGenero;
    });
  });

  async ngOnInit(): Promise<void> {
    const [peliculas, masVendidas] = await Promise.all([this.peliculasService.listar(), this.peliculasService.masVendidas(3)]);
    this.peliculas.set(peliculas);
    this.masVendidas.set(masVendidas);
    this.cargando.set(false);

    const entradas = await Promise.all(peliculas.map((p) => this.resenasService.promedio(p.id).then((v) => [p.id, v] as const)));
    this.promedios.set(new Map(entradas));
  }

  toggleGenero(genero: string): void {
    this.generosSeleccionados.update((actuales) =>
      actuales.includes(genero) ? actuales.filter((g) => g !== genero) : [...actuales, genero]
    );
  }
}
