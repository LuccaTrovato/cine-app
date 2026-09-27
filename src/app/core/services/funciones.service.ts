import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Funcion, Sala } from '../models/funcion.model';

export interface SolicitudProgramacion {
  peliculaId: string;
  duracionMinutos: number;
  diasSemana: number[]; // 0=domingo..6=sabado
  hora: string; // 'HH:mm'
  formato: Funcion['formato'];
  idioma: Funcion['idioma'];
  precioBase: number;
  fechaInicio: string; // yyyy-mm-dd, primer dia a partir del cual se buscan las ocurrencias
  semanas: number; // cantidad de semanas a programar
}

/** Minutos obligatorios de limpieza entre el fin de una funcion y el inicio de la siguiente en la misma sala. */
export const MINUTOS_LIMPIEZA = 30;

@Injectable({ providedIn: 'root' })
export class FuncionesService {
  constructor(private supabaseService: SupabaseService) {}

  async listarSalas(): Promise<Sala[]> {
    const { data, error } = await this.supabaseService.client.from('salas').select('*').order('nombre');
    if (error) throw error;
    return (data ?? []) as Sala[];
  }

  async listar(desde?: string): Promise<Funcion[]> {
    let query = this.supabaseService.client
      .from('funciones')
      .select('*, peliculas(titulo, imagen_url, duracion_minutos, clasificacion_edad, fecha_estreno, precio_preventa), salas(nombre)')
      .order('fecha_hora_inicio', { ascending: true });
    if (desde) query = query.gte('fecha_hora_inicio', desde);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Funcion[];
  }

  async listarPorPelicula(peliculaId: string): Promise<Funcion[]> {
    const { data, error } = await this.supabaseService.client
      .from('funciones')
      .select('*, salas(nombre)')
      .eq('pelicula_id', peliculaId)
      .gte('fecha_hora_inicio', new Date().toISOString())
      .order('fecha_hora_inicio', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Funcion[];
  }

  async obtener(id: string): Promise<Funcion | null> {
    const { data, error } = await this.supabaseService.client
      .from('funciones')
      .select('*, peliculas(titulo, imagen_url, duracion_minutos, clasificacion_edad, fecha_estreno, precio_preventa), salas(nombre)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Funcion;
  }

  /** Calcula las fechas/horas exactas de las ocurrencias solicitadas (dias de semana repetidos N semanas). */
  private calcularOcurrencias(solicitud: SolicitudProgramacion): Date[] {
    const [hh, mm] = solicitud.hora.split(':').map(Number);
    const ocurrencias: Date[] = [];
    const inicio = new Date(solicitud.fechaInicio + 'T00:00:00');

    for (let semana = 0; semana < solicitud.semanas; semana++) {
      for (let diaOffset = 0; diaOffset < 7; diaOffset++) {
        const fecha = new Date(inicio);
        fecha.setDate(fecha.getDate() + semana * 7 + diaOffset);
        if (solicitud.diasSemana.includes(fecha.getDay())) {
          fecha.setHours(hh, mm, 0, 0);
          if (fecha.getTime() >= inicio.getTime()) ocurrencias.push(fecha);
        }
      }
    }
    return ocurrencias.sort((a, b) => a.getTime() - b.getTime());
  }

  private hayConflicto(inicioA: Date, finA: Date, inicioB: Date, finB: Date): boolean {
    const finAConBuffer = new Date(finA.getTime() + MINUTOS_LIMPIEZA * 60_000);
    const finBConBuffer = new Date(finB.getTime() + MINUTOS_LIMPIEZA * 60_000);
    return inicioA < finBConBuffer && inicioB < finAConBuffer;
  }

  /**
   * Busca la primera sala libre para TODAS las ocurrencias solicitadas, respetando
   * el margen de limpieza de 30 minutos y evitando solapamientos. Lanza error si ninguna sala sirve.
   */
  async asignarSalaAutomatica(
    ocurrencias: Date[],
    duracionMinutos: number
  ): Promise<{ sala: Sala; funcionesExistentes: Funcion[] }> {
    const salas = await this.listarSalas();
    if (salas.length === 0) throw new Error('No hay salas configuradas en el sistema.');

    for (const sala of salas) {
      const { data: existentes, error } = await this.supabaseService.client
        .from('funciones')
        .select('*')
        .eq('sala_id', sala.id);
      if (error) throw error;

      const funcionesExistentes = (existentes ?? []) as Funcion[];
      let conflicto = false;

      for (const inicioNueva of ocurrencias) {
        const finNueva = new Date(inicioNueva.getTime() + duracionMinutos * 60_000);
        for (const existente of funcionesExistentes) {
          const inicioExistente = new Date(existente.fecha_hora_inicio);
          const finExistente = new Date(existente.fecha_hora_fin);
          if (this.hayConflicto(inicioNueva, finNueva, inicioExistente, finExistente)) {
            conflicto = true;
            break;
          }
        }
        if (conflicto) break;
      }

      if (!conflicto) return { sala, funcionesExistentes };
    }

    throw new Error(
      'No hay ninguna sala disponible para todos los horarios solicitados respetando los 30 minutos de limpieza. Probá con otros dias/horarios.'
    );
  }

  /** Genera y persiste todas las funciones solicitadas asignando automaticamente la sala. */
  async programarFunciones(solicitud: SolicitudProgramacion): Promise<Funcion[]> {
    const ocurrencias = this.calcularOcurrencias(solicitud);
    if (ocurrencias.length === 0) throw new Error('No se generaron ocurrencias para los dias/horarios indicados.');

    const { sala } = await this.asignarSalaAutomatica(ocurrencias, solicitud.duracionMinutos);

    const filas = ocurrencias.map((inicio) => {
      const fin = new Date(inicio.getTime() + solicitud.duracionMinutos * 60_000);
      return {
        pelicula_id: solicitud.peliculaId,
        sala_id: sala.id,
        fecha_hora_inicio: inicio.toISOString(),
        fecha_hora_fin: fin.toISOString(),
        formato: solicitud.formato,
        idioma: solicitud.idioma,
        precio_base: solicitud.precioBase,
      };
    });

    const { data, error } = await this.supabaseService.client.from('funciones').insert(filas).select();
    if (error) throw error;
    return (data ?? []) as Funcion[];
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabaseService.client.from('funciones').delete().eq('id', id);
    if (error) throw error;
  }
}
