import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Pelicula } from '../models/pelicula.model';

@Injectable({ providedIn: 'root' })
export class PeliculasService {
  constructor(private supabaseService: SupabaseService) {}

  async listar(): Promise<Pelicula[]> {
    const { data, error } = await this.supabaseService.client
      .from('peliculas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Pelicula[];
  }

  async obtener(id: string): Promise<Pelicula | null> {
    const { data, error } = await this.supabaseService.client
      .from('peliculas')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Pelicula;
  }

  /** Busca por titulo y/o filtra por generos (coincidencia de al menos uno). */
  async buscar(termino: string, generos: string[]): Promise<Pelicula[]> {
    let query = this.supabaseService.client.from('peliculas').select('*');
    if (termino) query = query.ilike('titulo', `%${termino}%`);
    if (generos.length > 0) query = query.overlaps('generos', generos);
    const { data, error } = await query.order('titulo', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Pelicula[];
  }

  /** Top 3 peliculas segun cantidad de entradas confirmadas (no canceladas). */
  async masVendidas(limite = 3): Promise<Pelicula[]> {
    const { data, error } = await this.supabaseService.client.rpc('peliculas_mas_vendidas', { limite });
    if (error) {
      // Fallback si la funcion RPC no fue creada: se muestran las destacadas.
      const { data: destacadas } = await this.supabaseService.client
        .from('peliculas')
        .select('*')
        .eq('es_destacada', true)
        .limit(limite);
      return (destacadas ?? []) as Pelicula[];
    }
    return (data ?? []) as Pelicula[];
  }

  async crear(pelicula: Partial<Pelicula>): Promise<Pelicula> {
    const { data, error } = await this.supabaseService.client.from('peliculas').insert(pelicula).select().single();
    if (error) throw error;
    return data as Pelicula;
  }

  async actualizar(id: string, cambios: Partial<Pelicula>): Promise<Pelicula> {
    const { data, error } = await this.supabaseService.client
      .from('peliculas')
      .update(cambios)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Pelicula;
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabaseService.client.from('peliculas').delete().eq('id', id);
    if (error) throw error;
  }

  async subirAfiche(archivo: File): Promise<string> {
    const nombreArchivo = `${Date.now()}_${archivo.name}`;
    const { error } = await this.supabaseService.client.storage.from('peliculas').upload(nombreArchivo, archivo);
    if (error) throw error;
    const { data } = this.supabaseService.client.storage.from('peliculas').getPublicUrl(nombreArchivo);
    return data.publicUrl;
  }
}
