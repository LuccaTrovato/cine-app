import { AfterViewInit, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Html5Qrcode } from 'html5-qrcode';
import { EntradasService } from '../../../core/services/entradas.service';
import { CandyService } from '../../../core/services/candy.service';
import { AuthService } from '../../../core/services/auth.service';

type ResultadoValidacion = { tipo: 'entrada' | 'candy'; descripcion: string } | null;

@Component({
  selector: 'app-validar-qr',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1>Validar QR</h1>
    <p>Escaneá el código con la cámara o tipealo manualmente para validar entradas y pedidos de Candy Bar.</p>

    <div id="lector-qr" class="lector"></div>

    <div class="manual">
      <input type="text" [(ngModel)]="codigoManual" placeholder="Código alfanumérico (ej: TICKET-... o CANDY-...)" />
      <button (click)="validar(codigoManual)">Validar código</button>
    </div>

    @if (resultado(); as r) {
      <div class="resultado ok">
        {{ r.tipo === 'entrada' ? 'Entrada' : 'Pedido' }} validado correctamente.<br />
        {{ r.descripcion }}
      </div>
    }
    @if (error()) {
      <div class="resultado error">{{ error() }}</div>
    }
  `,
  styles: [
    `
      .lector {
        max-width: 360px;
        margin: 1rem 0;
      }
      .manual {
        display: flex;
        gap: 0.5rem;
        max-width: 420px;
        margin-bottom: 1rem;
      }
      input {
        flex: 1;
        padding: 0.5rem;
        border-radius: 4px;
        border: 1px solid #555;
      }
      button {
        background: #e50914;
        color: #fff;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
      }
      .resultado {
        padding: 1rem;
        border-radius: 6px;
        margin-top: 1rem;
        max-width: 420px;
      }
      .resultado.ok {
        background: #123a1e;
        color: #2ecc71;
      }
      .resultado.error {
        background: #3a1212;
        color: #e50914;
      }
    `,
  ],
})
export class ValidarQrComponent implements AfterViewInit, OnDestroy {
  private entradasService = inject(EntradasService);
  private candyService = inject(CandyService);
  private auth = inject(AuthService);

  codigoManual = '';
  resultado = signal<ResultadoValidacion>(null);
  error = signal<string | null>(null);

  private scanner?: Html5Qrcode;

  ngAfterViewInit(): void {
    this.scanner = new Html5Qrcode('lector-qr');
    this.scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (textoDecodificado) => this.validar(textoDecodificado),
        () => {}
      )
      .catch(() => {
        // Sin camara disponible: el empleado puede usar el ingreso manual igualmente.
      });
  }

  ngOnDestroy(): void {
    // Libera la camara al salir de la vista para evitar que quede encendida.
    this.scanner?.stop().catch(() => {});
  }

  async validar(codigo: string): Promise<void> {
    if (!codigo?.trim()) return;
    const codigoNormalizado = codigo.trim().toUpperCase();
    this.error.set(null);
    this.resultado.set(null);
    const empleado = this.auth.profile();
    if (!empleado) return;

    try {
      if (codigoNormalizado.startsWith('TKT-') || codigoNormalizado.startsWith('TICKET-')) {
        const entrada = await this.entradasService.buscarPorCodigoQr(codigoNormalizado);
        if (!entrada) throw new Error('No se encontró ninguna entrada con ese código.');
        await this.entradasService.validarEntrada(entrada.id, empleado.id);
        this.resultado.set({
          tipo: 'entrada',
          descripcion: `${entrada.funciones?.peliculas?.titulo ?? ''} · Butaca ${entrada.fila}${entrada.columna}`,
        });
      } else if (codigoNormalizado.startsWith('CB-') || codigoNormalizado.startsWith('CANDY-')) {
        const pedido = await this.candyService.buscarPorCodigoQr(codigoNormalizado);
        if (!pedido) throw new Error('No se encontró ningún pedido con ese código.');
        await this.candyService.validarPedido(pedido.id);
        this.resultado.set({
          tipo: 'candy',
          descripcion: `${pedido.candy_productos?.nombre ?? ''} x${pedido.cantidad}`,
        });
      } else {
        throw new Error('Formato de código no reconocido.');
      }
      this.codigoManual = '';
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'El QR ya no es válido y fue consumido.');
    }
  }
}
