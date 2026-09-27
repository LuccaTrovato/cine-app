export type ClasificacionEdad = 'ATP' | '+13' | '+18';

export interface Pelicula {
  id: string;
  titulo: string;
  sinopsis: string;
  duracion_minutos: number;
  clasificacion_edad: ClasificacionEdad;
  generos: string[];
  imagen_url?: string | null;
  es_destacada: boolean;
  es_proximamente: boolean;
  fecha_estreno?: string | null;
  precio_preventa?: number | null;
  created_at?: string;
  // Campos calculados en el cliente (no existen en la tabla)
  puntuacion_promedio?: number;
  entradas_vendidas?: number;
}

export interface Resena {
  id: string;
  pelicula_id: string;
  usuario_id: string;
  puntuacion: number;
  comentario?: string | null;
  created_at?: string;
  profiles?: { nombre: string; apellido: string };
}
