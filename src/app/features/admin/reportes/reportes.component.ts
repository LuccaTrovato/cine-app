import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ReportesService, FacturacionDia, VentaPorPelicula } from '../../../core/services/reportes.service';
import { ExportService } from '../../../core/services/export.service';

Chart.register(...registerables);

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1>Reportes y Estadísticas</h1>

    <div class="filtros">
      <label>
        Desde
        <input class="fecha-personalizada" type="date" [(ngModel)]="desde" (change)="cargar()" />
      </label>
      <label>
        Hasta
        <input class="fecha-personalizada" type="date" [(ngModel)]="hasta" (change)="cargar()" />
      </label>
      <button (click)="exportarPdf()">Exportar PDF</button>
      <button (click)="exportarExcel()">Exportar Excel</button>
    </div>

    <p>Facturación total del periodo: <strong>&#36;{{ totalPeriodo() }}</strong></p>

    <div class="graficos">
      <div class="grafico">
        <h3>Facturación por día</h3>
        <canvas #canvasFacturacion></canvas>
      </div>
      <div class="grafico">
        <h3>Ventas por película / formato</h3>
        <canvas #canvasVentas></canvas>
      </div>
    </div>
  `,
  styles: [
    `
      .filtros {
        display: flex;
        gap: 1rem;
        align-items: end;
        flex-wrap: wrap;
        margin-bottom: 1.5rem;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.9rem;
      }
      input {
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
      button {
        background: #e50914;
        color: #fff;
        border: none;
        padding: 0.7rem 1.25rem;
        border-radius: 4px;
        cursor: pointer;
      }
      .graficos {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 2rem;
      }
      .grafico {
        background: #1a1a1a;
        border-radius: 8px;
        padding: 1rem;
      }
    `,
  ],
})
export class ReportesComponent implements OnInit, AfterViewInit {
  private reportesService = inject(ReportesService);
  private exportService = inject(ExportService);

  @ViewChild('canvasFacturacion') private canvasFacturacion!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasVentas') private canvasVentas!: ElementRef<HTMLCanvasElement>;

  desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  hasta = new Date().toISOString().slice(0, 10);

  datosFacturacion = signal<FacturacionDia[]>([]);
  datosVentas = signal<VentaPorPelicula[]>([]);
  totalPeriodo = signal(0);

  private chartFacturacion?: Chart;
  private chartVentas?: Chart;
  private vistaLista = false;

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  ngAfterViewInit(): void {
    this.vistaLista = true;
    this.dibujarGraficos();
  }

  async cargar(): Promise<void> {
    const [facturacion, ventas] = await Promise.all([
      this.reportesService.facturacionPorDia(this.desde, this.hasta + 'T23:59:59'),
      this.reportesService.ventasPorPeliculaYFormato(),
    ]);
    this.datosFacturacion.set(facturacion);
    this.datosVentas.set(ventas.slice(0, 10));
    this.totalPeriodo.set(Math.round(facturacion.reduce((acc, d) => acc + d.total, 0) * 100) / 100);
    if (this.vistaLista) this.dibujarGraficos();
  }

  private dibujarGraficos(): void {
    this.chartFacturacion?.destroy();
    this.chartFacturacion = new Chart(this.canvasFacturacion.nativeElement, {
      type: 'line',
      data: {
        labels: this.datosFacturacion().map((d) => d.fecha),
        datasets: [{ label: 'Facturación ($)', data: this.datosFacturacion().map((d) => d.total), borderColor: '#e50914' }],
      },
    });

    this.chartVentas?.destroy();
    this.chartVentas = new Chart(this.canvasVentas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.datosVentas().map((v) => `${v.titulo} (${v.formato})`),
        datasets: [{ label: 'Entradas vendidas', data: this.datosVentas().map((v) => v.cantidad), backgroundColor: '#f5c518' }],
      },
    });
  }

  exportarPdf(): void {
    this.exportService.exportarFacturacionPdf(this.datosFacturacion(), this.datosVentas());
  }

  exportarExcel(): void {
    this.exportService.exportarFacturacionExcel(this.datosFacturacion(), this.datosVentas());
  }
}
