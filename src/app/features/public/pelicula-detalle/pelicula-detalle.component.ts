import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { ResenasService } from '../../../core/services/resenas.service';
import { FuncionesService } from '../../../core/services/funciones.service';
import { AuthService } from '../../../core/services/auth.service';
import { Pelicula, Resena } from '../../../core/models/pelicula.model';
import { Funcion } from '../../../core/models/funcion.model';
import { EstrellasComponent } from '../../../shared/estrellas/estrellas.component';

@Component({
  selector: 'app-pelicula-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, EstrellasComponent],
  template: `
    @if (pelicula(); as p) {
      <div class="detalle">
        <div class="afiche">
          @if (p.imagen_url) {
            <img [src]="p.imagen_url" [alt]="p.titulo" />
          }
        </div>
        <div class="info">
          <h1>{{ p.titulo }}</h1>
          <p class="meta">
            {{ p.duracion_minutos }} min · <strong>{{ p.clasificacion_edad }}</strong> ·
            @for (g of p.generos; track g) {
              <span class="chip">{{ g }}</span>
            }
          </p>
          <app-estrellas [puntuacion]="promedio()" /> ({{ promedio() }}/5)
          <p class="sinopsis">{{ p.sinopsis }}</p>

          @if (p.clasificacion_edad !== 'ATP') {
            <p class="advertencia">Acompañado por un adulto ({{ p.clasificacion_edad }})</p>
          }

          @if (p.es_proximamente) {
            <p class="proximamente">
              Próximamente
              @if (p.fecha_estreno) {
                - Estreno: {{ p.fecha_estreno | date: 'dd/MM/yyyy' }}
              }
            </p>
          }

          <h2>Funciones disponibles</h2>
          @if (funciones().length === 0) {
            <p>No hay funciones programadas por el momento.</p>
          } @else {
            <ul class="funciones">
              @for (f of funciones(); track f.id) {
                <li>
                  <span>{{ f.fecha_hora_inicio | date: 'EEEE dd/MM HH:mm' }}</span>
                  <span class="chip">{{ f.formato }}</span>
                  <span class="chip">{{ f.idioma }}</span>
                  <span class="chip">{{ f.salas?.nombre }}</span>
                  <span>&#36;{{ funcionesService.precioVigente(f) }}</span>
                  <a [routerLink]="['/funciones', f.id, 'butacas']" class="btn">Comprar</a>
                </li>
              }
            </ul>
          }

          <h2>Reseñas</h2>
          @if (auth.isAuthenticated()) {
            <div class="nueva-resena">
              <label>
                Puntuación
                <select [(ngModel)]="nuevaPuntuacion">
                  @for (n of [1, 2, 3, 4, 5]; track n) {
                    <option [value]="n">{{ n }}</option>
                  }
                </select>
              </label>
              <textarea [(ngModel)]="nuevoComentario" maxlength="280" placeholder="Tu comentario (max. 280 caracteres)"></textarea>
              <button (click)="guardarResena()">{{ resenaEditandoId() ? 'Guardar reseña' : 'Publicar reseña' }}</button>
              @if (resenaEditandoId()) {
                <button type="button" class="secundario" (click)="cancelarEdicionResena()">Cancelar edición</button>
              }
            </div>
          }
          @for (r of resenas(); track r.id) {
            <div class="resena">
              <strong>{{ r.profiles?.nombre }} {{ r.profiles?.apellido }}</strong>
              <app-estrellas [puntuacion]="r.puntuacion" />
              <p>{{ r.comentario }}</p>
              @if (auth.profile()?.id === r.usuario_id) {
                <div class="acciones-resena">
                  <button type="button" (click)="editarResena(r)">Editar</button>
                  <button type="button" class="secundario" (click)="eliminarResena(r)">Eliminar</button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .detalle {
        display: flex;
        gap: 2rem;
        flex-wrap: wrap;
      }
      .afiche img {
        width: 280px;
        border-radius: 8px;
      }
      .info {
        flex: 1;
        min-width: 280px;
      }
      .meta {
        color: #999;
      }
      .chip {
        display: inline-block;
        background: #222;
        border-radius: 12px;
        padding: 0.1rem 0.6rem;
        font-size: 0.75rem;
        margin-right: 0.3rem;
      }
      .sinopsis {
        line-height: 1.5;
        margin: 1rem 0;
      }
      .advertencia {
        color: #f5a623;
        font-weight: 600;
      }
      .proximamente {
        color: #e50914;
        font-weight: 600;
      }
      .funciones {
        list-style: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .funciones li {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        border: 1px solid #333;
        border-radius: 6px;
        padding: 0.5rem 0.8rem;
        flex-wrap: wrap;
      }
      .btn,
      button {
        background: #e50914;
        color: #fff;
        border: none;
        padding: 0.4rem 0.9rem;
        border-radius: 4px;
        cursor: pointer;
        text-decoration: none;
        margin-left: auto;
      }
      .nueva-resena {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
        max-width: 520px;
        box-sizing: border-box;
        padding: 1rem;
        border: 1px solid #333;
        border-radius: 8px;
        background: #181818;
        margin-bottom: 1rem;
      }
      .nueva-resena label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .nueva-resena select,
      textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 0.5rem;
        border-radius: 4px;
        border: 1px solid #555;
        background: #101010;
        color: #fff;
        min-height: 70px;
      }
      .nueva-resena select {
        min-height: 2.5rem;
      }
      .nueva-resena button {
        width: 100%;
        margin-left: 0;
        padding: 0.65rem 1rem;
      }
      .resena {
        max-width: 700px;
        margin: 0.75rem 0;
        padding: 1rem;
        border: 1px solid #333;
        border-radius: 8px;
        background: #181818;
      }
      .resena app-estrellas {
        display: block;
        margin: 0.35rem 0;
      }
      .resena p {
        margin-bottom: 0;
        overflow-wrap: anywhere;
      }
      .acciones-resena {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.75rem;
      }
      .acciones-resena button,
      .nueva-resena .secundario {
        margin-left: 0;
        background: #333;
      }
      .acciones-resena .secundario {
        background: transparent;
        border: 1px solid #e50914;
        color: #e50914;
      }
      @media (max-width: 600px) {
        .detalle {
          gap: 1rem;
        }
        .info {
          min-width: 0;
        }
      }
    `,
  ],
})
export class PeliculaDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private peliculasService = inject(PeliculasService);
  private resenasService = inject(ResenasService);
  funcionesService = inject(FuncionesService);
  auth = inject(AuthService);

  pelicula = signal<Pelicula | null>(null);
  funciones = signal<Funcion[]>([]);
  resenas = signal<Resena[]>([]);
  promedio = signal(0);
  resenaEditandoId = signal<string | null>(null);

  nuevaPuntuacion = 5;
  nuevoComentario = '';

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    await this.cargar(id);
  }

  private async cargar(id: string): Promise<void> {
    const [pelicula, funciones, resenas, promedio] = await Promise.all([
      this.peliculasService.obtener(id),
      this.funcionesService.listarPorPelicula(id),
      this.resenasService.listarPorPelicula(id),
      this.resenasService.promedio(id),
    ]);
    this.pelicula.set(pelicula);
    this.funciones.set(funciones);
    this.resenas.set(resenas);
    this.promedio.set(promedio);

  }

  async guardarResena(): Promise<void> {
    const usuario = this.auth.profile();
    const pelicula = this.pelicula();
    if (!usuario || !pelicula) return;
    const id = this.resenaEditandoId();
    if (id) {
      await this.resenasService.actualizar(id, this.nuevaPuntuacion, this.nuevoComentario);
    } else {
      await this.resenasService.crear(pelicula.id, usuario.id, this.nuevaPuntuacion, this.nuevoComentario);
    }
    this.cancelarEdicionResena();
    await this.cargar(pelicula.id);
  }

  editarResena(resena: Resena): void {
    this.resenaEditandoId.set(resena.id);
    this.nuevaPuntuacion = resena.puntuacion;
    this.nuevoComentario = resena.comentario ?? '';
  }

  cancelarEdicionResena(): void {
    this.resenaEditandoId.set(null);
    this.nuevaPuntuacion = 5;
    this.nuevoComentario = '';
  }

  async eliminarResena(resena: Resena): Promise<void> {
    if (!confirm('¿Eliminar esta reseña?')) return;
    await this.resenasService.eliminar(resena.id);
    const pelicula = this.pelicula();
    if (pelicula) await this.cargar(pelicula.id);
  }
}
