import { Component, OnInit, inject, signal } from '@angular/core';
import { CandyService } from '../../../core/services/candy.service';
import { AuthService } from '../../../core/services/auth.service';
import { CandyProducto } from '../../../core/models/candy.model';

@Component({
  selector: 'app-candy-bar',
  standalone: true,
  imports: [],
  template: `
    <h1>Candy Bar</h1>
    @if (auth.profile(); as p) {
      <p>Tus puntos: <strong>{{ p.puntos_acumulados }}</strong></p>
    }
    @if (mensaje()) {
      <p class="exito">{{ mensaje() }}</p>
    }
    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <div class="grilla">
      @for (prod of productos(); track prod.id) {
        <div class="tarjeta">
          @if (prod.imagen_url) {
            <img [src]="prod.imagen_url" [alt]="prod.nombre" />
          }
          <h3>{{ prod.nombre }}</h3>
          <div class="datos">
            <p class="descripcion">{{ prod.descripcion }}</p>
            <p>&#36;{{ prod.precio }} · {{ prod.puntos_canje }} pts</p>
            <p class="stock">Stock: {{ prod.stock }}</p>
          </div>
          @if (auth.isAuthenticated()) {
            <div class="acciones">
              <button [disabled]="prod.stock === 0" (click)="comprar(prod)">Comprar</button>
              <button
                [disabled]="prod.stock === 0 || (auth.profile()?.puntos_acumulados ?? 0) < prod.puntos_canje"
                (click)="canjear(prod)"
              >
                Canjear con puntos
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .grilla {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1.25rem;
        margin-top: 1rem;
      }
      .tarjeta {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-width: 0;
        box-sizing: border-box;
        overflow: hidden;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1rem;
      }
      .tarjeta h3,
      .tarjeta p {
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .tarjeta h3 {
        margin: 0.35rem 0 0.1rem;
        min-height: 2.8rem;
        display: flex;
        align-items: flex-start;
      }
      .datos {
        flex: 0 0 5.5rem;
        display: flex;
        flex-direction: column;
      }
      .datos p {
        margin: 0.3rem 0;
      }
      .descripcion {
        height: 2.9rem;
        min-height: 2.9rem;
        line-height: 1.35;
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
      .tarjeta img {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 6px;
        margin-bottom: 0.5rem;
      }
      .stock {
        font-size: 0.75rem;
        color: #999;
      }
      .acciones {
        display: flex;
        gap: 0.5rem;
        margin-top: auto;
        align-items: stretch;
      }
      button {
        flex: 1;
        min-height: 2.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e50914;
        color: #fff;
        border: none;
        padding: 0.4rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.75rem;
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .exito {
        color: #2ecc71;
      }
      .error {
        color: #e50914;
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
export class CandyBarComponent implements OnInit {
  private candyService = inject(CandyService);
  auth = inject(AuthService);

  productos = signal<CandyProducto[]>([]);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.productos.set(await this.candyService.listarProductos());
  }

  async comprar(producto: CandyProducto): Promise<void> {
    this.mensaje.set(null);
    this.error.set(null);
    try {
      await this.candyService.comprarConDinero(producto, 1);
      this.mensaje.set(`Compraste ${producto.nombre}. Retiralo en la barra con tu QR (en "Mis Entradas").`);
      this.productos.set(await this.candyService.listarProductos());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo completar la compra.');
    }
  }

  async canjear(producto: CandyProducto): Promise<void> {
    this.mensaje.set(null);
    this.error.set(null);
    try {
      await this.candyService.canjearConPuntos(producto, 1);
      this.mensaje.set(`Canjeaste ${producto.nombre} con puntos. Retiralo en la barra con tu QR.`);
      this.productos.set(await this.candyService.listarProductos());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo completar el canje.');
    }
  }
}
