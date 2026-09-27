import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Cupon } from '../models/cupon.model';

@Injectable({ providedIn: 'root' })
export class CuponesService {
  constructor(private supabaseService: SupabaseService) {}

  async listarActivos(): Promise<Cupon[]> {
    const { data, error } = await this.supabaseService.client.from('cupones').select('*').eq('activo', true);
    if (error) throw error;
    return (data ?? []) as Cupon[];
  }

  async listarTodos(): Promise<Cupon[]> {
    const { data, error } = await this.supabaseService.client.from('cupones').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Cupon[];
  }

  async buscarPorCodigo(codigo: string): Promise<Cupon | null> {
    const { data, error } = await this.supabaseService.client
      .from('cupones')
      .select('*')
      .eq('codigo', codigo.trim().toUpperCase())
      .eq('activo', true)
      .maybeSingle();
    if (error) throw error;
    return data as Cupon | null;
  }

  /** Verifica que el usuario cumpla las condiciones del cupon (primera compra / edad minima). */
  async validarCondiciones(cupon: Cupon, usuarioId: string, edadUsuario: number): Promise<{ valido: boolean; motivo?: string }> {
    if (cupon.edad_minima && edadUsuario < cupon.edad_minima) {
      return { valido: false, motivo: `Este cupon requiere una edad minima de ${cupon.edad_minima} años.` };
    }
    if (cupon.es_primera_compra) {
      const { count, error } = await this.supabaseService.client
        .from('compras')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', usuarioId);
      if (error) throw error;
      if ((count ?? 0) > 0) {
        return { valido: false, motivo: 'Este cupon es solo para la primera compra del cliente.' };
      }
    }
    return { valido: true };
  }

  async crear(cupon: Partial<Cupon>): Promise<Cupon> {
    const payload = { ...cupon, codigo: cupon.codigo?.trim().toUpperCase() };
    const { data, error } = await this.supabaseService.client.from('cupones').insert(payload).select().single();
    if (error) throw error;
    return data as Cupon;
  }

  async actualizar(id: string, cambios: Partial<Cupon>): Promise<Cupon> {
    const { data, error } = await this.supabaseService.client.from('cupones').update(cambios).eq('id', id).select().single();
    if (error) throw error;
    return data as Cupon;
  }
}
