export interface Cupon {
  id: string;
  codigo: string;
  porcentaje_descuento: number;
  es_primera_compra: boolean;
  edad_minima?: number | null;
  activo: boolean;
  created_at?: string;
}
