import { Injectable, computed, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Profile, RegistroUsuario, Rol } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Perfil de la tabla public.profiles del usuario autenticado (null si no hay sesion). */
  readonly profile = signal<Profile | null>(null);
  /** true mientras se restaura la sesion inicial desde el storage local. */
  readonly cargandoSesion = signal<boolean>(true);

  readonly isAuthenticated = computed(() => this.profile() !== null);
  readonly rol = computed<Rol>(() => this.profile()?.rol ?? 'anon');
  readonly esAdmin = computed(() => this.rol() === 'admin');
  readonly esEmpleado = computed(() => this.rol() === 'empleado');
  readonly esCliente = computed(() => this.rol() === 'cliente');
  readonly esAnon = computed(() => this.rol() === 'anon');

  constructor(private supabaseService: SupabaseService) {
    this.inicializar();
  }

  private async inicializar(): Promise<void> {
    const { data } = await this.supabaseService.client.auth.getSession();
    if (data.session?.user) {
      await this.cargarPerfil(data.session.user.id);
    }
    this.cargandoSesion.set(false);

    this.supabaseService.client.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await this.cargarPerfil(session.user.id);
      } else {
        this.profile.set(null);
      }
    });
  }

  private async cargarPerfil(userId: string): Promise<void> {
    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      this.profile.set(data as Profile);
    }
  }

  async registrar(datos: RegistroUsuario): Promise<{ error: string | null }> {
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email: datos.email,
      password: datos.password,
      options: {
        data: {
          nombre: datos.nombre,
          apellido: datos.apellido,
          dni: datos.dni,
          fecha_nacimiento: datos.fecha_nacimiento,
        },
      },
    });
    if (error) return { error: error.message };
    if (data.user) await this.cargarPerfil(data.user.id);
    return { error: null };
  }

  async login(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) await this.cargarPerfil(data.user.id);
    return { error: null };
  }

  async logout(): Promise<void> {
    await this.supabaseService.client.auth.signOut();
    this.profile.set(null);
  }

  async actualizarPerfil(cambios: Partial<Profile>): Promise<{ error: string | null }> {
    const actual = this.profile();
    if (!actual) return { error: 'No hay sesion activa' };
    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .update(cambios)
      .eq('id', actual.id)
      .select()
      .single();
    if (error) return { error: error.message };
    this.profile.set(data as Profile);
    return { error: null };
  }

  async refrescarPerfil(): Promise<void> {
    const actual = this.profile();
    if (actual) await this.cargarPerfil(actual.id);
  }
}
