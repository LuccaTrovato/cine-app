import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditoriaService } from '../../../core/services/auditoria.service';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1>Log de Actividad (Auditoría)</h1>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Usuario</th>
          <th>Acción</th>
          <th>Tabla</th>
        </tr>
      </thead>
      <tbody>
        @for (log of logs(); track log.id) {
          <tr>
            <td>{{ log.created_at | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
            <td>{{ log.profiles?.nombre }} {{ log.profiles?.apellido }} ({{ log.profiles?.email }})</td>
            <td>{{ log.accion }}</td>
            <td>{{ log.tabla_afectada }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [
    `
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 0.5rem;
        border-bottom: 1px solid #333;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class AuditoriaComponent implements OnInit {
  private auditoriaService = inject(AuditoriaService);
  logs = signal<any[]>([]);

  async ngOnInit(): Promise<void> {
    this.logs.set(await this.auditoriaService.listar());
  }
}
