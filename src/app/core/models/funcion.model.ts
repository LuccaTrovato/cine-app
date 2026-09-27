export type Formato = '2D' | '3D' | '4D' | '5D';
export type Idioma = 'Castellano' | 'Subtitulada';

export interface Sala {
  id: string;
  nombre: string;
  filas_cantidad: number;
  capacidad: number;
}

export interface Funcion {
  id: string;
  pelicula_id: string;
  sala_id: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  formato: Formato;
  idioma: Idioma;
  precio_base: number;
  created_at?: string;
  peliculas?: {
    titulo: string;
    imagen_url?: string;
    duracion_minutos: number;
    clasificacion_edad: string;
    fecha_estreno?: string | null;
    precio_preventa?: number | null;
  };
  salas?: { nombre: string };
}

export interface HorarioSolicitado {
  diaSemana: number; // 0=domingo ... 6=sabado
  hora: string; // 'HH:mm'
}
