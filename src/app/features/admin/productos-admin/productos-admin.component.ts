import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CandyService } from '../../../core/services/candy.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { AuthService } from '../../../core/services/auth.service';
import { CandyProducto } from '../../../core/models/candy.model';

@Component({
  selector: 'app-productos-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h1>Administrar Candy Bar</h1>

    <form [formGroup]="form" (ngSubmit)="guardar()" class="formulario">
      <label>
        Nombre
        <input formControlName="nombre" />
      </label>
      <label>
        Descripción
        <input formControlName="descripcion" />
      </label>
      <div class="fila">
        <label>
          Precio ($)
          <input type="number" step="0.01" formControlName="precio" />
        </label>
        <label>
          Puntos de canje
          <input type="number" formControlName="puntos_canje" />
        </label>
        <label>
          Stock
          <input type="number" formControlName="stock" />
        </label>
      </div>
      <label>
        Imagen
        <input type="file" accept="image/*" (change)="archivoSeleccionado.set($any($event.target).files[0])" />
      </label>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      <button type="submit" [disabled]="form.invalid">Crear producto</button>
    </form>

    <div class="grilla">
      @for (p of productos(); track p.id) {
        <div class="tarjeta">
          @if (p.imagen_url) {
            <img [src]="p.imagen_url" [alt]="p.nombre" />
          }
          <h3>{{ p.nombre }}</h3>
          <p>&#36;{{ p.precio }} · {{ p.puntos_canje }} pts · Stock: {{ p.stock }}</p>
          <button (click)="eliminar(p)">Eliminar</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .formulario {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 420px;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1.25rem;
        margin-bottom: 2rem;
      }
      .fila {
        display: flex;
        gap: 1rem;
      }
      label {
        flex: 1;
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
      button {
        background: #e50914;
        color: #fff;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
      }
      .grilla {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
      }
      .tarjeta {
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1rem;
      }
      .tarjeta img {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 6px;
        margin-bottom: 0.5rem;
      }
      .error {
        color: #e50914;
      }
    `,
  ],
})
export class ProductosAdminComponent implements OnInit {
  private fb = inject(FormBuilder);
  private candyService = inject(CandyService);
  private auditoriaService = inject(AuditoriaService);
  private auth = inject(AuthService);

  productos = signal<CandyProducto[]>([]);
  error = signal<string | null>(null);
  archivoSeleccionado = signal<File | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
    puntos_canje: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
  });

  async ngOnInit(): Promise<void> {
    this.productos.set(await this.candyService.listarProductos());
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) return;
    this.error.set(null);
    try {
      const valores = this.form.getRawValue();
      let imagenUrl: string | undefined;
      const archivo = this.archivoSeleccionado();
      if (archivo) imagenUrl = await this.candyService.subirImagen(archivo);

      const creado = await this.candyService.crearProducto({ ...valores, ...(imagenUrl ? { imagen_url: imagenUrl } : {}) });
      const actorId = this.auth.profile()?.id;
      if (actorId) await this.auditoriaService.registrar(actorId, 'Crear producto candy', 'candy_productos', creado.id.toString(), valores);

      this.form.reset({ nombre: '', descripcion: '', precio: 0, puntos_canje: 0, stock: 0 });
      this.archivoSeleccionado.set(null);
      this.productos.set(await this.candyService.listarProductos());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo crear el producto.');
    }
  }

  async eliminar(p: CandyProducto): Promise<void> {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    await this.candyService.eliminarProducto(p.id);
    const actorId = this.auth.profile()?.id;
    if (actorId) await this.auditoriaService.registrar(actorId, 'Eliminar producto candy', 'candy_productos', p.id.toString());
    this.productos.set(await this.candyService.listarProductos());
  }
}
