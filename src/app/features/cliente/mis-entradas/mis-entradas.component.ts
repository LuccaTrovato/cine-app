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
          @if (e.estado === 'PENDIENTE') {
            <app-codigo-qr [valor]="e.codigo_qr" [tamano]="120" />
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
          @if (p.estado === 'PENDIENTE') {
            <app-codigo-qr [valor]="p.codigo_qr" [tamano]="120" />
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .grilla {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .ticket {
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1rem;
      }
      .ticket.cancelado {
        opacity: 0.5;
      }
      button {
        background: transparent;
        border: 1px solid #e50914;
        color: #e50914;
        padding: 0.3rem 0.8rem;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 0.5rem;
      }
      .error {
        color: #e50914;
        font-size: 0.8rem;
      }
    `,
  ],
})
export class MisEntradasComponent implements OnInit {
  private auth = inject(AuthService);
  private entradasService = inject(EntradasService);
  private candyService = inject(CandyService);

  entradas = signal<Entrada[]>([]);
  pedidos = signal<CandyPedido[]>([]);
  error = signal<string | null>(null);
  errorMensaje = signal('');

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    const usuario = this.auth.profile();
    if (!usuario) return;
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
}
