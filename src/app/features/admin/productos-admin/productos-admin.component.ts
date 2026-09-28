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
      <h2>{{ editandoId() === null ? 'Nuevo producto' : 'Editar producto' }}</h2>
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
        <input class="archivo" type="file" accept="image/*" (change)="archivoSeleccionado.set($any($event.target).files[0])" />
      </label>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      <div class="acciones-formulario">
        <button type="submit" [disabled]="form.invalid">
          {{ editandoId() === null ? 'Crear producto' : 'Guardar cambios' }}
        </button>
        @if (editandoId() !== null) {
          <button type="button" class="btn-secundario" (click)="cancelarEdicion()">Cancelar</button>
        }
      </div>
    </form>

    <div class="grilla">
      @for (p of productos(); track p.id) {
        <div class="tarjeta">
          @if (p.imagen_url) {
            <img [src]="p.imagen_url" [alt]="p.nombre" />
          }
          <h3>{{ p.nombre }}</h3>
          <div class="datos">
            <p>&#36;{{ p.precio }} · {{ p.puntos_canje }} pts</p>
            <p class="stock">Stock: {{ p.stock }}</p>
          </div>
          <div class="acciones-card">
            <button (click)="editar(p)">Editar</button>
            <button (click)="eliminar(p)">Eliminar</button>
          </div>
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
        box-sizing: border-box;
        width: 100%;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1.25rem;
        margin-bottom: 2rem;
      }
      .formulario h2 {
        margin: 0;
      }
      .fila {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
      }
      label {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.9rem;
      }
      input {
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
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
      .acciones-formulario,
      .acciones-card {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: auto;
      }
      .acciones-formulario {
        justify-content: center;
      }
      .btn-secundario {
        background: transparent;
        border: 1px solid #777;
      }
      .archivo {
        padding: 0.55rem;
        border: 1px solid #555;
        border-radius: 4px;
        background: #181818;
      }
      .archivo::file-selector-button {
        margin-right: 0.75rem;
        padding: 0.5rem 0.8rem;
        border: 0;
        border-radius: 4px;
        background: #e50914;
        color: #fff;
        cursor: pointer;
      }
      @media (max-width: 600px) {
        .fila {
          grid-template-columns: 1fr;
        }
      }
      .grilla {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
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
        margin: 0.5rem 0;
        min-height: 3rem;
        display: flex;
        align-items: flex-start;
      }
      .datos {
        min-height: 3.5rem;
      }
      .datos p {
        margin: 0.25rem 0;
      }
      .stock {
        color: #aaa;
      }
      .acciones-card button {
        flex: 1;
        min-width: 6rem;
        min-height: 2.75rem;
      }
      .acciones-card button:first-child {
        background: #333;
        border: 1px solid #777;
      }
      .acciones-card button:last-child {
        background: transparent;
        border: 1px solid #e50914;
        color: #e50914;
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
  editandoId = signal<number | null>(null);

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

      const cambios = { ...valores, ...(imagenUrl ? { imagen_url: imagenUrl } : {}) };
      const producto = this.editandoId() === null
        ? await this.candyService.crearProducto(cambios)
        : await this.candyService.actualizarProducto(this.editandoId()!, cambios);
      const actorId = this.auth.profile()?.id;
      if (actorId) {
        await this.auditoriaService.registrar(
          actorId,
          this.editandoId() === null ? 'Crear producto candy' : 'Editar producto candy',
          'candy_productos',
          producto.id.toString(),
          valores
        );
      }

      this.cancelarEdicion();
      this.productos.set(await this.candyService.listarProductos());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo crear el producto.');
    }
  }

  editar(producto: CandyProducto): void {
    this.editandoId.set(producto.id);
    this.archivoSeleccionado.set(null);
    this.form.patchValue({
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? '',
      precio: Number(producto.precio),
      puntos_canje: producto.puntos_canje,
      stock: producto.stock,
    });
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.archivoSeleccionado.set(null);
    this.form.reset({ nombre: '', descripcion: '', precio: 0, puntos_canje: 0, stock: 0 });
  }

  async eliminar(p: CandyProducto): Promise<void> {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    await this.candyService.eliminarProducto(p.id);
    const actorId = this.auth.profile()?.id;
    if (actorId) await this.auditoriaService.registrar(actorId, 'Eliminar producto candy', 'candy_productos', p.id.toString());
    this.productos.set(await this.candyService.listarProductos());
  }
}
