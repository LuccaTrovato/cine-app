import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Resena } from '../models/pelicula.model';

@Injectable({ providedIn: 'root' })
export class ResenasService {
  constructor(private supabaseService: SupabaseService) {}

  async listarPorPelicula(peliculaId: string): Promise<Resena[]> {
    const { data, error } = await this.supabaseService.client
      .from('resenas')
      .select('*, profiles(nombre, apellido)')
      .eq('pelicula_id', peliculaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Resena[];
  }

  async promedio(peliculaId: string): Promise<number> {
    const { data, error } = await this.supabaseService.client.rpc('puntuacion_promedio_pelicula', {
      pelicula: peliculaId,
    });
    if (error) return 0;
    return Number(data) || 0;
  }

  async crear(peliculaId: string, usuarioId: string, puntuacion: number, comentario: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('resenas')
      .insert({ pelicula_id: peliculaId, usuario_id: usuarioId, puntuacion, comentario });
    if (error) throw error;
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabaseService.client.from('resenas').delete().eq('id', id);
    if (error) throw error;
  }
}
