import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { EntradasService } from '../../../core/services/entradas.service';
import { CandyService } from '../../../core/services/candy.service';
import { Entrada } from '../../../core/models/entrada.model';
import { CandyPedido } from '../../../core/models/candy.model';
import { CodigoQrComponent } from '../../../shared/codigo-qr/codigo-qr.component';

@Component({
  selector: 'app-mis-entradas',
  standalone: true,
  imports: [CommonModule, CodigoQrComponent],
  template: `
    <h1>Mis Entradas</h1>
    @if (entradas().length === 0) {
      <p>Todavía no compraste entradas.</p>
    }
    <div class="grilla">
      @for (e of entradas(); track e.id) {
        <div class="ticket" [class.cancelado]="e.estado === 'CANCELADO'">
          <h3>{{ e.funciones?.peliculas?.titulo }}</h3>
          <p>{{ e.funciones?.fecha_hora_inicio | date: 'dd/MM/yyyy HH:mm' }}</p>
          <p>{{ e.funciones?.salas?.nombre }} · Butaca {{ e.fila }}{{ e.columna }} @if (e.es_vip) { (VIP) }</p>
          <p>Estado: <strong>{{ e.estado }}</strong></p>
          <div class="qr-slot">
            @if (e.estado === 'PENDIENTE') {
              <app-codigo-qr [valor]="e.codigo_qr" [tamano]="120" />
            }
            @if (e.estado === 'CANCELADO') {
              <img class="imagen-cancelado" src="imagenes/cancel_77947.png" alt="Cancelado" />
            }
            @if (e.estado === 'VALIDADO') {
              <img class="imagen-validado" src="imagenes/checked.png" alt="Validado" />
            }
          </div>
          @if (e.estado === 'PENDIENTE' && auth.profile()) {
            <button (click)="cancelar(e)">Cancelar</button>
          }
          @if (error() === e.id) {
            <p class="error">{{ errorMensaje() }}</p>
          }
        </div>
      }
    </div>

    <h1>Mis Pedidos de Candy Bar</h1>
    @if (pedidos().length === 0) {
      <p>Todavía no hiciste pedidos.</p>
    }
    <div class="grilla">
      @for (p of pedidos(); track p.id) {
        <div class="ticket" [class.cancelado]="p.estado === 'CANCELADO'">
          <h3>{{ p.candy_productos?.nombre }} x{{ p.cantidad }}</h3>
          <p>Estado: <strong>{{ p.estado }}</strong></p>
          <div class="qr-slot">
            @if (p.estado === 'PENDIENTE') {
              <app-codigo-qr [valor]="p.codigo_qr" [tamano]="120" />
            }
            @if (p.estado === 'CANCELADO') {
              <img class="imagen-cancelado" src="imagenes/cancel_77947.png" alt="Cancelado" />
            }
            @if (p.estado === 'VALIDADO') {
              <img class="imagen-validado" src="imagenes/checked.png" alt="Validado" />
            }
          </div>
          @if (p.estado === 'PENDIENTE') {
            <button (click)="cancelarPedido(p)">Cancelar pedido</button>
          }
          @if (error() === p.id) {
            <p class="error">{{ errorMensaje() }}</p>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .grilla {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .ticket {
        min-width: 0;
        min-height: 390px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1rem;
      }
      .ticket.cancelado {
        opacity: 0.5;
      }
      .qr-slot {
        min-height: 150px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: auto;
      }
      .ticket button {
        display: block;
        width: 100%;
        background: #e50914;
        border: 1px solid #e50914;
        color: #fff;
        padding: 0.65rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 0.75rem;
        font-weight: 600;
      }
      .error {
        color: #e50914;
        font-size: 0.8rem;
      }
      .imagen-cancelado {
        width: 120px;
        height: 120px;
        object-fit: contain;
        display: block;
      }
      .imagen-validado {
        width: 120px;
        height: 120px;
        object-fit: contain;
        display: block;
      }
      @media (max-width: 600px) {
        .grilla {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class MisEntradasComponent implements OnInit {
  auth = inject(AuthService);
  private entradasService = inject(EntradasService);
  private candyService = inject(CandyService);

  entradas = signal<Entrada[]>([]);
  pedidos = signal<CandyPedido[]>([]);
  error = signal<string | null>(null);
  errorMensaje = signal('');

  async ngOnInit(): Promise<void> {
    await this.esperarSesion();
    await this.cargar();
  }

  private esperarSesion(): Promise<void> {
    if (!this.auth.cargandoSesion()) return Promise.resolve();
    return new Promise((resolve) => {
      const intervalo = setInterval(() => {
        if (!this.auth.cargandoSesion()) {
          clearInterval(intervalo);
          resolve();
        }
      }, 50);
    });
  }

  private async cargar(): Promise<void> {
    const usuario = this.auth.profile();
    if (!usuario) {
      this.entradas.set(this.entradasService.obtenerEntradasAnonimas());
      return;
    }
    const [entradas, pedidos] = await Promise.all([
      this.entradasService.misEntradas(usuario.id),
      this.candyService.misPedidos(usuario.id),
    ]);
    this.entradas.set(entradas);
    this.pedidos.set(pedidos);
  }

  async cancelar(entrada: Entrada): Promise<void> {
    this.error.set(null);
    try {
      await this.entradasService.cancelarEntrada(entrada);
      await this.cargar();
    } catch (e) {
      this.error.set(entrada.id);
      this.errorMensaje.set(e instanceof Error ? e.message : 'No se pudo cancelar.');
    }
  }

  async cancelarPedido(pedido: CandyPedido): Promise<void> {
    this.error.set(null);
    try {
      await this.candyService.cancelarPedido(pedido.id);
      await this.cargar();
    } catch (e) {
      this.error.set(pedido.id);
      this.errorMensaje.set(e instanceof Error ? e.message : 'No se pudo cancelar el pedido.');
    }
  }
}
