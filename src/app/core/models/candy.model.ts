export interface CandyProducto {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  puntos_canje: number;
  imagen_url?: string | null;
  stock: number;
  created_at?: string;
}

export type EstadoPedido = 'PENDIENTE' | 'VALIDADO' | 'CANCELADO';

export interface CandyPedido {
  id: string;
  usuario_id: string;
  producto_id: number;
  cantidad: number;
  precio_pagado?: number | null;
  puntos_usados: number;
  codigo_qr: string;
  estado: EstadoPedido;
  created_at?: string;
  candy_productos?: CandyProducto;
}
