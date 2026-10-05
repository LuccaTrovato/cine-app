export type Rol = 'cliente' | 'empleado' | 'admin' | 'anon';

export interface Profile {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  rol: Rol;
  puntos_acumulados: number;
  credito_favor: number;
  avatar_url?: string | null;
  created_at?: string;
}

export interface RegistroUsuario {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
}
