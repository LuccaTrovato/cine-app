export type EstadoEntrada = 'PENDIENTE' | 'VALIDADO' | 'CANCELADO';

export interface Butaca {
  fila: string;
  columna: number;
  esVip: boolean;
  esAccesible: boolean;
  ocupada: boolean;
}

export interface Compra {
  id: string;
  usuario_id: string;
  monto_total: number;
  credito_usado: number;
  cupon_id?: string | null;
  puntos_ganados: number;
  fecha_compra?: string;
}

export interface Entrada {
  id: string;
  compra_id: string;
  funcion_id: string;
  usuario_id: string;
  fila: string;
  columna: number;
  es_vip: boolean;
  codigo_qr: string;
  estado: EstadoEntrada;
  precio_pagado: number;
  validado_por?: string | null;
  validado_en?: string | null;
  created_at?: string;
  funciones?: {
    fecha_hora_inicio: string;
    formato: string;
    idioma: string;
    peliculas?: { titulo: string; imagen_url?: string };
    salas?: { nombre: string };
  };
}
