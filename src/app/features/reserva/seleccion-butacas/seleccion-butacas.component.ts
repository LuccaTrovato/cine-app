import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RealtimeChannel } from '@supabase/supabase-js';
import { FuncionesService } from '../../../core/services/funciones.service';
import { EntradasService, ButacaSeleccionada } from '../../../core/services/entradas.service';
import { AuthService } from '../../../core/services/auth.service';
import { Funcion } from '../../../core/models/funcion.model';
import { FILAS, columnasDeFila, esFilaVip, esFilaAccesible } from '../../../core/utils/butacas.util';

@Component({
  selector: 'app-seleccion-butacas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (funcion(); as f) {
      <div class="cabecera">
        <h1>{{ f.peliculas?.titulo }}</h1>
        <p>{{ f.fecha_hora_inicio | date: 'EEEE dd/MM HH:mm' }} · {{ f.formato }} · {{ f.idioma }} · {{ f.salas?.nombre }}</p>
        @if (preventa()) {
          <p class="preventa">🎟️ Precio de preventa vigente</p>
        }
      </div>

      <div class="leyenda">
        <span><i class="cuadro libre"></i> Libre</span>
        <span><i class="cuadro ocupada"></i> Ocupada</span>
        <span><i class="cuadro seleccionada"></i> Seleccionada</span>
        <span><i class="cuadro vip"></i> VIP</span>
        <span><i class="cuadro accesible"></i> Accesible</span>
      </div>

      <div class="pantalla">PANTALLA</div>

      <div class="mapa">
        @for (fila of filas; track fila) {
          <div class="fila">
            <span class="etiqueta-fila">{{ fila }}</span>
            <div class="butacas">
              @for (col of columnas; track col.columna) {
                @if (col.bloque === 'centro' && col.columna === columnaCentroInicio) {
                  <span class="pasillo"></span>
                }
                @if (col.bloque === 'derecha' && col.columna === columnaDerechaInicio) {
                  <span class="pasillo"></span>
                }
                <button
                  type="button"
                  class="butaca"
                  [class.vip]="esVip(fila)"
                  [class.accesible]="esAccesible(fila)"
                  [class.ocupada]="estaOcupada(fila, col.columna)"
                  [class.seleccionada]="estaSeleccionada(fila, col.columna)"
                  [disabled]="estaOcupada(fila, col.columna)"
                  (click)="toggleButaca(fila, col.columna)"
                >
                  {{ col.columna }}
                </button>
              }
            </div>
          </div>
        }
      </div>

      <div class="resumen">
        <h2>Resumen de compra</h2>
        @if (seleccionadas().length === 0) {
          <p>Seleccioná al menos una butaca.</p>
        } @else {
          <ul>
            @for (b of seleccionadas(); track b.fila + b.columna) {
              <li>{{ b.fila }}{{ b.columna }} — &#36;{{ precioButaca(b.fila) }}</li>
            }
          </ul>
          <p>Subtotal: <strong>&#36;{{ subtotal() }}</strong></p>

          <label>
            Cupón de descuento
            <input type="text" [(ngModel)]="codigoCupon" placeholder="CODIGO" />
          </label>

          @if (auth.profile()?.credito_favor && auth.profile()!.credito_favor > 0) {
            <label class="checkbox">
              <input type="checkbox" [(ngModel)]="usarCredito" />
              Usar crédito a favor (&#36;{{ auth.profile()!.credito_favor }})
            </label>
          }

          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          @if (exito()) {
            <p class="exito">{{ exito() }}</p>
          }

          <button (click)="confirmarCompra()" [disabled]="procesando()">
            {{ procesando() ? 'Procesando...' : 'Confirmar compra' }}
          </button>
        }
      </div>
    }
  `,
  styles: [
    `
      .cabecera p {
        color: #999;
      }
      .preventa {
        color: #2ecc71;
        font-weight: 600;
      }
      .leyenda {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin: 1rem 0;
        font-size: 0.8rem;
      }
      .cuadro {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 2px;
        margin-right: 0.3rem;
        vertical-align: middle;
        background: #444;
      }
      .cuadro.libre {
        background: #444;
      }
      .cuadro.ocupada {
        background: #700;
      }
      .cuadro.seleccionada {
        background: #2ecc71;
      }
      .cuadro.vip {
        background: #f5c518;
      }
      .cuadro.accesible {
        background: #3498db;
      }
      .pantalla {
        text-align: center;
        background: #333;
        color: #aaa;
        padding: 0.3rem;
        margin-bottom: 1rem;
        border-radius: 4px;
        letter-spacing: 4px;
        font-size: 0.75rem;
      }
      .mapa {
        display: flex;
        flex-direction: column;
        gap: 3px;
        overflow-x: auto;
      }
      .fila {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .etiqueta-fila {
        width: 18px;
        font-size: 0.7rem;
        color: #888;
      }
      .butacas {
        display: flex;
        gap: 3px;
      }
      .pasillo {
        width: 10px;
      }
      .butaca {
        width: 20px;
        height: 20px;
        font-size: 0.6rem;
        border-radius: 3px;
        border: none;
        background: #444;
        color: #ccc;
        cursor: pointer;
        padding: 0;
      }
      .butaca.vip {
        background: #7a6100;
      }
      .butaca.accesible {
        background: #1c4a6e;
      }
      .butaca.ocupada {
        background: #700;
        cursor: not-allowed;
        opacity: 0.6;
      }
      .butaca.seleccionada {
        background: #2ecc71 !important;
        color: #000;
      }
      .resumen {
        margin-top: 2rem;
        max-width: 380px;
      }
      .resumen ul {
        list-style: none;
        padding: 0;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        margin: 0.6rem 0;
        font-size: 0.9rem;
      }
      label.checkbox {
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
      }
      input[type='text'] {
        padding: 0.5rem;
        border-radius: 4px;
        border: 1px solid #555;
      }
      button {
        background: #e50914;
        color: #fff;
        border: none;
        padding: 0.6rem 1rem;
        border-radius: 4px;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
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
export class SeleccionButacasComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private funcionesService = inject(FuncionesService);
  private entradasService = inject(EntradasService);
  auth = inject(AuthService);

  filas = FILAS;
  columnas = columnasDeFila();
  columnaCentroInicio = 5; // primera columna del bloque central (tras las 4 de la izquierda)
  columnaDerechaInicio = 25; // primera columna del bloque derecho

  funcion = signal<Funcion | null>(null);
  ocupadas = signal<Set<string>>(new Set());
  seleccionadas = signal<ButacaSeleccionada[]>([]);
  procesando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);
  preventa = computed(() => {
    const f = this.funcion();
    return !!f && this.entradasService.esPreventaActiva(f.peliculas as any);
  });

  codigoCupon = '';
  usarCredito = false;

  private canal?: RealtimeChannel;

  esVip = esFilaVip;
  esAccesible = esFilaAccesible;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    const funcion = await this.funcionesService.obtener(id);
    this.funcion.set(funcion);
    if (!funcion) return;

    const ocupadas = await this.entradasService.obtenerButacasOcupadas(id);
    this.ocupadas.set(new Set(ocupadas));

    this.canal = this.entradasService.suscribirseAButacas(id, (fila, columna, ocupada) => {
      this.ocupadas.update((set) => {
        const nuevo = new Set(set);
        const clave = `${fila}-${columna}`;
        if (ocupada) nuevo.add(clave);
        else nuevo.delete(clave);
        return nuevo;
      });
    });
  }

  ngOnDestroy(): void {
    // Previene fugas de memoria por canales WebSocket abiertos al salir de la vista.
    if (this.canal) this.entradasService.desuscribirse(this.canal);
  }

  estaOcupada(fila: string, columna: number): boolean {
    return this.ocupadas().has(`${fila}-${columna}`);
  }

  estaSeleccionada(fila: string, columna: number): boolean {
    return this.seleccionadas().some((b) => b.fila === fila && b.columna === columna);
  }

  toggleButaca(fila: string, columna: number): void {
    this.seleccionadas.update((actuales) => {
      if (actuales.some((b) => b.fila === fila && b.columna === columna)) {
        return actuales.filter((b) => !(b.fila === fila && b.columna === columna));
      }
      return [...actuales, { fila, columna }];
    });
  }

  precioButaca(fila: string): number {
    const f = this.funcion();
    if (!f) return 0;
    return this.entradasService.calcularPrecioButaca(f, f.peliculas as any, esFilaVip(fila));
  }

  subtotal = computed(() =>
    this.seleccionadas().reduce((acc, b) => acc + this.precioButaca(b.fila), 0)
  );

  async confirmarCompra(): Promise<void> {
    const funcion = this.funcion();
    if (!funcion) return;
    this.procesando.set(true);
    this.error.set(null);
    this.exito.set(null);
    try {
      const resultado = await this.entradasService.comprarEntradas({
        funcion,
        pelicula: funcion.peliculas as any,
        butacas: this.seleccionadas(),
        codigoCupon: this.codigoCupon || undefined,
        usarCredito: this.usarCredito,
      });
      this.exito.set(`¡Compra confirmada! Ganaste ${resultado.puntosGanados} puntos.`);
      setTimeout(() => this.router.navigateByUrl('/mis-entradas'), 1500);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Error al procesar la compra.');
    } finally {
      this.procesando.set(false);
    }
  }
}
