import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface FacturacionDia {
  fecha: string;
  total: number;
  cantidadEntradas: number;
}

export interface VentaPorPelicula {
  titulo: string;
  formato: string;
  cantidad: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  constructor(private supabaseService: SupabaseService) {}

  /** Facturacion y cantidad de entradas vendidas agrupadas por dia, en un rango de fechas. */
  async facturacionPorDia(desde: string, hasta: string): Promise<FacturacionDia[]> {
    const { data, error } = await this.supabaseService.client
      .from('compras')
      .select('monto_total, fecha_compra')
      .gte('fecha_compra', desde)
      .lte('fecha_compra', hasta);
    if (error) throw error;

    const agrupado = new Map<string, FacturacionDia>();
    for (const compra of data ?? []) {
      const fecha = new Date(compra.fecha_compra).toISOString().slice(0, 10);
      const actual = agrupado.get(fecha) ?? { fecha, total: 0, cantidadEntradas: 0 };
      actual.total += Number(compra.monto_total);
      actual.cantidadEntradas += 1;
      agrupado.set(fecha, actual);
    }
    return Array.from(agrupado.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /** Ventas agrupadas por pelicula y formato (2D/3D/4D/5D), usando entradas no canceladas. */
  async ventasPorPeliculaYFormato(): Promise<VentaPorPelicula[]> {
    const { data, error } = await this.supabaseService.client
      .from('entradas')
      .select('precio_pagado, funciones(formato, peliculas(titulo))')
      .neq('estado', 'CANCELADO');
    if (error) throw error;

    const agrupado = new Map<string, VentaPorPelicula>();
    for (const entrada of data ?? []) {
      const funciones = entrada.funciones as any;
      const titulo = funciones?.peliculas?.titulo ?? 'Desconocida';
      const formato = funciones?.formato ?? '2D';
      const clave = `${titulo}__${formato}`;
      const actual = agrupado.get(clave) ?? { titulo, formato, cantidad: 0, total: 0 };
      actual.cantidad += 1;
      actual.total += Number(entrada.precio_pagado);
      agrupado.set(clave, actual);
    }
    return Array.from(agrupado.values()).sort((a, b) => b.total - a.total);
  }
}
