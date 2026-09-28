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
      <a routerLink="/beneficios" class="benef" aria-label="Ver beneficios">
        <img src="imagenes/FlyerBenef.jpg" alt="Beneficios" />
      </a>
    <section class="destacadas">
      <h1>Las más vendidas</h1>
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

    <section class="cartelera">
      <h1>Cartelera</h1>
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
    .benef {
        display: block;
        width: 100%;
        cursor: pointer;
      }
      .benef img {
        width: 100%;
        display: block;
      }
      section {
        margin-bottom: 2.5rem;
      }
      .destacadas h1,
      .cartelera h1 {
        margin: 0 0 1.25rem;
        padding: 0.75rem;
        font-size: clamp(2rem, 4vw, 3rem);
        line-height: 1.1;
      }
      .destacadas h3 {
        padding-left: 0.75rem;
      }
      .grilla {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 1.5rem;
      }
      .tarjeta {
        display: flex;
        flex-direction: column;
        height: 100%;
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
        flex: 1;
        padding: 0.85rem;
        display: flex;
        flex-direction: column;
      }
      .info h3 {
        font-size: 1.1rem;
        margin: 0 0 0.25rem;
        min-height: 2.8rem;
      }
      .info .badge {
        display: block;
        width: fit-content;
        margin-left: auto;
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
        padding: 1.25rem;
        background: #181818;
        border: 1px solid #3a3a3a;
        border-radius: 8px;
      }
      .buscador input {
        width: 100%;
        box-sizing: border-box;
        padding: 0.85rem 1rem;
        border-radius: 4px;
        border: 1px solid #777;
        background: #101010;
        color: #fff;
        font-size: 1rem;
        outline: none;
      }
      .buscador input:focus {
        border-color: #fff;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15);
      }
      .buscador input::placeholder {
        color: #999;
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
        border-radius: 4px;
        padding: 0.55rem 1.1rem;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 500;
      }
      .generos button.activo {
        background: #e50914;
        border-color: #e50914;
        color: #fff;
      }
      @media (max-width: 900px) {
        .grilla {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (max-width: 600px) {
        .grilla {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
      }
      @media (max-width: 380px) {
        .grilla {
          grid-template-columns: 1fr;
        }
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
        const [peliculas, masVendidas] = await Promise.all([this.peliculasService.listar(), this.peliculasService.masVendidas(5)]);
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
