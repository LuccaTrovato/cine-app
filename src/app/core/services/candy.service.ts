import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { CandyPedido, CandyProducto } from '../models/candy.model';

@Injectable({ providedIn: 'root' })
export class CandyService {
  constructor(private supabaseService: SupabaseService, private authService: AuthService) {}

  async listarProductos(): Promise<CandyProducto[]> {
    const { data, error } = await this.supabaseService.client.from('candy_productos').select('*').order('nombre');
    if (error) throw error;
    return (data ?? []) as CandyProducto[];
  }

  async crearProducto(producto: Partial<CandyProducto>): Promise<CandyProducto> {
    const { data, error } = await this.supabaseService.client.from('candy_productos').insert(producto).select().single();
    if (error) throw error;
    return data as CandyProducto;
  }

  async actualizarProducto(id: number, cambios: Partial<CandyProducto>): Promise<CandyProducto> {
    const { data, error } = await this.supabaseService.client.from('candy_productos').update(cambios).eq('id', id).select().single();
    if (error) throw error;
    return data as CandyProducto;
  }

  async eliminarProducto(id: number): Promise<void> {
    const { error } = await this.supabaseService.client.from('candy_productos').delete().eq('id', id);
    if (error) throw error;
  }

  async subirImagen(archivo: File): Promise<string> {
    const nombreArchivo = `${Date.now()}_${archivo.name}`;
    const { error } = await this.supabaseService.client.storage.from('productos').upload(nombreArchivo, archivo);
    if (error) throw error;
    const { data } = this.supabaseService.client.storage.from('productos').getPublicUrl(nombreArchivo);
    return data.publicUrl;
  }

  /** Compra un producto pagando dinero. El precio, el stock y los puntos ($1 = 1 punto) se calculan en el servidor (RPC). */
  async comprarConDinero(producto: CandyProducto, cantidad: number): Promise<CandyPedido> {
    const { data, error } = await this.supabaseService.client.rpc('candy_comprar', {
      p_producto_id: producto.id,
      p_cantidad: cantidad,
    });
    if (error) throw new Error(error.message);
    await this.authService.refrescarPerfil();
    return await this.obtenerPedido(data.pedido_id);
  }

  /** Canjea un producto exclusivamente con puntos acumulados (validado y descontado en el servidor). */
  async canjearConPuntos(producto: CandyProducto, cantidad: number): Promise<CandyPedido> {
    const { data, error } = await this.supabaseService.client.rpc('candy_canjear', {
      p_producto_id: producto.id,
      p_cantidad: cantidad,
    });
    if (error) throw new Error(error.message);
    await this.authService.refrescarPerfil();
    return await this.obtenerPedido(data.pedido_id);
  }

  async cancelarPedido(pedidoId: string): Promise<void> {
    const { error } = await this.supabaseService.client.rpc('cancelar_pedido_candy', {
      p_pedido_id: pedidoId,
    });
    if (error) throw new Error(error.message);
    await this.authService.refrescarPerfil();
  }

  private async obtenerPedido(id: string): Promise<CandyPedido> {
    const { data, error } = await this.supabaseService.client.from('candy_pedidos').select('*, candy_productos(*)').eq('id', id).single();
    if (error) throw error;
    return data as CandyPedido;
  }

  async misPedidos(usuarioId: string): Promise<CandyPedido[]> {
    const { data, error } = await this.supabaseService.client
      .from('candy_pedidos')
      .select('*, candy_productos(*)')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CandyPedido[];
  }

  async buscarPorCodigoQr(codigo: string): Promise<CandyPedido | null> {
    const { data, error } = await this.supabaseService.client
      .from('candy_pedidos')
      .select('*, candy_productos(*)')
      .eq('codigo_qr', codigo.trim())
      .maybeSingle();
    if (error) throw error;
    return data as CandyPedido | null;
  }

  async validarPedido(pedidoId: string): Promise<CandyPedido> {
    const { data: actual, error: errorLectura } = await this.supabaseService.client
      .from('candy_pedidos')
      .select('estado')
      .eq('id', pedidoId)
      .single();
    if (errorLectura) throw errorLectura;
    if (actual.estado === 'VALIDADO') throw new Error('Este QR ya fue consumido anteriormente y no es valido.');
    if (actual.estado === 'CANCELADO') throw new Error('Este pedido fue cancelado.');

    const { data, error } = await this.supabaseService.client
      .from('candy_pedidos')
      .update({ estado: 'VALIDADO' })
      .eq('id', pedidoId)
      .select()
      .single();
    if (error) throw error;
    return data as CandyPedido;
  }
}
