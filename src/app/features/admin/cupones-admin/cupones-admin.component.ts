import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CuponesService } from '../../../core/services/cupones.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { AuthService } from '../../../core/services/auth.service';
import { Cupon } from '../../../core/models/cupon.model';

@Component({
  selector: 'app-cupones-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h1>Administrar Cupones</h1>

    <form [formGroup]="form" (ngSubmit)="guardar()" class="formulario">
      <label>
        Código
        <input formControlName="codigo" placeholder="BIENVENIDO10" />
      </label>
      <label>
        % de descuento
        <input type="number" formControlName="porcentaje_descuento" min="0" max="100" />
      </label>
      <label class="checkbox"><input type="checkbox" formControlName="es_primera_compra" /> Solo primera compra</label>
      <label>
        Edad mínima (opcional, ej. 50)
        <input type="number" formControlName="edad_minima" />
      </label>
      <label class="checkbox"><input type="checkbox" formControlName="activo" /> Activo</label>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      <button type="submit" [disabled]="form.invalid">Crear cupón</button>
    </form>

    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Descuento</th>
          <th>1ra compra</th>
          <th>Edad mín.</th>
          <th>Activo</th>
        </tr>
      </thead>
      <tbody>
        @for (c of cupones(); track c.id) {
          <tr>
            <td>{{ c.codigo }}</td>
            <td>{{ c.porcentaje_descuento }}%</td>
            <td>{{ c.es_primera_compra ? 'Sí' : 'No' }}</td>
            <td>{{ c.edad_minima ?? '-' }}</td>
            <td>
              <button (click)="toggleActivo(c)">{{ c.activo ? 'Desactivar' : 'Activar' }}</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [
    `
            .formulario {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        box-sizing: border-box;
        width: 100%;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1.25rem;
        margin-bottom: 2rem;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.9rem;
      }
      label.checkbox {
        flex-direction: row;
        align-items: center;
      }
      label.checkbox input {
        appearance: none;
        width: 1.25rem;
        height: 1.25rem;
        flex: 0 0 1.25rem;
        padding: 0;
        border: 1px solid #777;
        border-radius: 4px;
        cursor: pointer;
      }
      label.checkbox input:checked {
        background: #e50914;
        border-color: #e50914;
        box-shadow: inset 0 0 0 4px #181818;
      }
      input {
        padding: 0.5rem;
        border-radius: 4px;
        border: 1px solid #555;
        background: transparent;
        color: inherit;
      }
      button {
        background: #e50914;
        color: #fff;
        border: none;
        padding: 0.65rem 1.25rem;
        border-radius: 4px;
        cursor: pointer;
      }
      .formulario > button {
        align-self: center;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 0.5rem;
        border-bottom: 1px solid #333;
      }
      .error {
        color: #e50914;
      }
    `,
  ],
})
export class CuponesAdminComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cuponesService = inject(CuponesService);
  private auditoriaService = inject(AuditoriaService);
  private auth = inject(AuthService);

  cupones = signal<Cupon[]>([]);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    codigo: ['', Validators.required],
    porcentaje_descuento: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
    es_primera_compra: [false],
    edad_minima: [0],
    activo: [true],
  });

  async ngOnInit(): Promise<void> {
    this.cupones.set(await this.cuponesService.listarTodos());
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) return;
    this.error.set(null);
    try {
      const valores = this.form.getRawValue();
      const creado = await this.cuponesService.crear({ ...valores, edad_minima: valores.edad_minima || null });
      const actorId = this.auth.profile()?.id;
      if (actorId) await this.auditoriaService.registrar(actorId, 'Crear cupon', 'cupones', creado.id, valores);
      this.form.reset({ codigo: '', porcentaje_descuento: 10, es_primera_compra: false, edad_minima: 0, activo: true });
      this.cupones.set(await this.cuponesService.listarTodos());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo crear el cupón (código duplicado?).');
    }
  }

  async toggleActivo(c: Cupon): Promise<void> {
    await this.cuponesService.actualizar(c.id, { activo: !c.activo });
    const actorId = this.auth.profile()?.id;
    if (actorId) await this.auditoriaService.registrar(actorId, 'Actualizar cupon', 'cupones', c.id, { activo: !c.activo });
    this.cupones.set(await this.cuponesService.listarTodos());
  }
}
