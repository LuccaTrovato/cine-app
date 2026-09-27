import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  constructor(private supabaseService: SupabaseService) {}

  /** Registra una accion en el log de actividad para trazabilidad administrativa. */
  async registrar(usuarioId: string, accion: string, tablaAfectada?: string, registroId?: string, detalle?: unknown): Promise<void> {
    await this.supabaseService.client.from('log_actividad').insert({
      usuario_id: usuarioId,
      accion,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      detalle: detalle ?? null,
    });
  }

  async listar(limite = 200): Promise<any[]> {
    const { data, error } = await this.supabaseService.client
      .from('log_actividad')
      .select('*, profiles(nombre, apellido, email)')
      .order('created_at', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return data ?? [];
  }
}
