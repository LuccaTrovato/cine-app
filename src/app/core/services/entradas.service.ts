import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Entrada } from '../models/entrada.model';
import { Funcion } from '../models/funcion.model';
import { Pelicula } from '../models/pelicula.model';
import { calcularEdad } from '../utils/edad.util';

export const RECARGO_VIP = 0.3; // 30% sobre el precio base
const ENTRADAS_ANONIMAS_KEY = 'cine-entradas-anonimas';

export interface ButacaSeleccionada {
  fila: string;
  columna: number;
}

export interface ResultadoCompra {
  compraId: string;
  entradas: Entrada[];
  montoTotal: number;
  creditoUsado: number;
  puntosGanados: number;
}

@Injectable({ providedIn: 'root' })
export class EntradasService {
  private presenciaPorCanal = new WeakMap<RealtimeChannel, { conectado: boolean; butacas: ButacaSeleccionada[] }>();

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  /** Butacas ya ocupadas (PENDIENTE o VALIDADO) para una funcion. */
  async obtenerButacasOcupadas(funcionId: string): Promise<string[]> {
    const { data, error } = await this.supabaseService.client
      .from('entradas')
      .select('fila, columna')
      .eq('funcion_id', funcionId)
      .neq('estado', 'CANCELADO');
    if (error) throw error;
    return (data ?? []).map((e) => `${e.fila}-${e.columna}`);
  }

  /** Suscribe a cambios realtime de entradas para una funcion especifica. Recordar removeChannel en ngOnDestroy. */
  suscribirseAButacas(
    funcionId: string,
    onCambio: (fila: string, columna: number, ocupada: boolean) => void,
    onSeleccionTemporal: (butacas: ButacaSeleccionada[]) => void,
  ): RealtimeChannel {
    const canal = this.supabaseService.client
      .channel(`butacas-funcion-${funcionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'entradas', filter: `funcion_id=eq.${funcionId}` },
        (payload) => onCambio(payload.new['fila'], payload.new['columna'], payload.new['estado'] !== 'CANCELADO')
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'entradas', filter: `funcion_id=eq.${funcionId}` },
        (payload) => onCambio(payload.new['fila'], payload.new['columna'], payload.new['estado'] !== 'CANCELADO')
      )
      .on('presence', { event: 'sync' }, () => {
        const estado = canal.presenceState() as Record<string, Array<{ butacas?: ButacaSeleccionada[] }>>;
        const seleccionadas = Object.values(estado).flatMap((presencias) =>
          presencias.flatMap((presencia) => presencia.butacas ?? [])
        );
        onSeleccionTemporal(seleccionadas);
      })
      .on('presence', { event: 'join' }, () => {
        const estado = canal.presenceState() as Record<string, Array<{ butacas?: ButacaSeleccionada[] }>>;
        onSeleccionTemporal(Object.values(estado).flatMap((presencias) =>
          presencias.flatMap((presencia) => presencia.butacas ?? [])
        ));
      })
      .on('presence', { event: 'leave' }, () => {
        const estado = canal.presenceState() as Record<string, Array<{ butacas?: ButacaSeleccionada[] }>>;
        onSeleccionTemporal(Object.values(estado).flatMap((presencias) =>
          presencias.flatMap((presencia) => presencia.butacas ?? [])
        ));
      });

    const presencia = { conectado: false, butacas: [] as ButacaSeleccionada[] };
    this.presenciaPorCanal.set(canal, presencia);
    canal.subscribe((estado) => {
      if (estado === 'SUBSCRIBED') {
        presencia.conectado = true;
        void canal.track({ butacas: presencia.butacas });
      }
    });
    return canal;
  }

  actualizarSeleccionTemporal(canal: RealtimeChannel, butacas: ButacaSeleccionada[]): void {
    const presencia = this.presenciaPorCanal.get(canal);
    if (!presencia) return;
    presencia.butacas = butacas;
    if (presencia.conectado) void canal.track({ butacas });
  }

  desuscribirse(canal: RealtimeChannel): void {
    this.supabaseService.client.removeChannel(canal);
  }

  /** Precio en preventa activo si hoy esta dentro de los 7 dias previos al estreno. */
  esPreventaActiva(pelicula: Pelicula): boolean {
    if (!pelicula.fecha_estreno || pelicula.precio_preventa == null) return false;
    const hoy = new Date();
    const estreno = new Date(pelicula.fecha_estreno);
    const inicioPreventa = new Date(estreno);
    inicioPreventa.setDate(inicioPreventa.getDate() - 7);
    return hoy >= inicioPreventa && hoy < estreno;
  }

  calcularPrecioButaca(funcion: Funcion, pelicula: Pelicula, esVip: boolean): number {
    const base = this.esPreventaActiva(pelicula) ? Number(pelicula.precio_preventa) : Number(funcion.precio_base);
    return esVip ? Math.round(base * (1 + RECARGO_VIP) * 100) / 100 : base;
  }

  /** Verifica restriccion de edad segun clasificacion de la pelicula. */
  validarRestriccionEdad(pelicula: Pelicula, fechaNacimientoUsuario: string): { permitido: boolean; mensaje?: string } {
    if (pelicula.clasificacion_edad === 'ATP') return { permitido: true };
    const edadMinima = pelicula.clasificacion_edad === '+18' ? 18 : 13;
    const edad = calcularEdad(fechaNacimientoUsuario);
    if (edad < edadMinima) {
      return {
        permitido: false,
        mensaje: `Esta funcion es ${pelicula.clasificacion_edad}. Debes tener al menos ${edadMinima} años. Acompañado por un adulto.`,
      };
    }
    return { permitido: true };
  }

  /**
   * Flujo completo de compra: valida edad en el cliente (UX), delega el calculo autoritativo de precio,
   * cupon, credito y puntos al RPC "comprar_entradas" en el servidor.
   */
  async comprarEntradas(params: {
    funcion: Funcion;
    pelicula: Pelicula;
    butacas: ButacaSeleccionada[];
    codigoCupon?: string;
    usarCredito: boolean;
  }): Promise<ResultadoCompra> {
    const profile = this.authService.profile();

    // Validacion optimista en el cliente (UX rapida); el servidor vuelve a validar todo de forma autoritativa.
    if (profile) {
      const restriccion = this.validarRestriccionEdad(params.pelicula, profile.fecha_nacimiento);
      if (!restriccion.permitido) throw new Error(restriccion.mensaje);
    }

    const ocupadas = await this.obtenerButacasOcupadas(params.funcion.id);
    for (const b of params.butacas) {
      if (ocupadas.includes(`${b.fila}-${b.columna}`)) {
        throw new Error(`La butaca ${b.fila}${b.columna} ya fue reservada por otro cliente. Elegi otra.`);
      }
    }

    // El precio, el cupon, el credito y los puntos se calculan y validan en el servidor (RPC "comprar_entradas")
    // para que un cliente no pueda manipular montos manipulando la llamada REST directamente.
    const { data, error } = await this.supabaseService.client.rpc('comprar_entradas', {
      p_funcion_id: params.funcion.id,
      p_butacas: params.butacas.map((b) => ({ fila: b.fila, columna: b.columna })),
      p_codigo_cupon: params.codigoCupon ?? null,
      p_usar_credito: params.usarCredito,
    });
    if (error) throw new Error(error.message);

    if (profile) await this.authService.refrescarPerfil();

    const resultado: ResultadoCompra = {
      compraId: data.compra_id,
      entradas: this.normalizarEntradas(data.entradas as Entrada[]),
      montoTotal: Number(data.monto_total),
      creditoUsado: Number(data.credito_usado),
      puntosGanados: Number(data.puntos_ganados),
    };

    if (!profile) this.guardarEntradasAnonimas(resultado.entradas, params.funcion);
    return resultado;
  }

  obtenerEntradasAnonimas(): Entrada[] {
    try {
      const entradas = JSON.parse(localStorage.getItem(ENTRADAS_ANONIMAS_KEY) ?? '[]');
      return Array.isArray(entradas) ? this.normalizarEntradas(entradas as Entrada[]) : [];
    } catch {
      return [];
    }
  }

  private guardarEntradasAnonimas(entradas: Entrada[], funcion: Funcion): void {
    const detallesFuncion = {
      fecha_hora_inicio: funcion.fecha_hora_inicio,
      formato: funcion.formato,
      idioma: funcion.idioma,
      peliculas: funcion.peliculas
        ? { titulo: funcion.peliculas.titulo, imagen_url: funcion.peliculas.imagen_url }
        : undefined,
      salas: funcion.salas ? { nombre: funcion.salas.nombre } : undefined,
    };
    const nuevas = this.normalizarEntradas(entradas).map((entrada) => ({ ...entrada, funciones: detallesFuncion }));
    const anteriores = this.obtenerEntradasAnonimas();
    localStorage.setItem(ENTRADAS_ANONIMAS_KEY, JSON.stringify([...nuevas, ...anteriores]));
  }

  async misEntradas(usuarioId: string): Promise<Entrada[]> {
    const { data, error } = await this.supabaseService.client
      .from('entradas')
      .select('*, funciones(fecha_hora_inicio, formato, idioma, peliculas(titulo, imagen_url), salas(nombre))')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Entrada[];
  }

  /** Cancelacion permitida hasta 2 horas antes de la funcion; acredita el importe como credito a favor (validado en el servidor). */
  async cancelarEntrada(entrada: Entrada): Promise<void> {
    const { error } = await this.supabaseService.client.rpc('cancelar_entrada', { p_entrada_id: entrada.id });
    if (error) throw new Error(error.message);
    await this.authService.refrescarPerfil();
  }

  /** Busca una entrada por codigo QR exacto (escaneado o tipeado manualmente). */
  async buscarPorCodigoQr(codigo: string): Promise<Entrada | null> {
    const codigoNormalizado = codigo.trim();
    const { data, error } = await this.supabaseService.client
      .from('entradas')
      .select('*, funciones(fecha_hora_inicio, formato, idioma, peliculas(titulo), salas(nombre))')
      .eq('codigo_qr', codigoNormalizado)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as Entrada;

    const { data: entradaPorId, error: errorPorId } = await this.supabaseService.client
      .from('entradas')
      .select('*, funciones(fecha_hora_inicio, formato, idioma, peliculas(titulo), salas(nombre))')
      .eq('id', codigoNormalizado)
      .maybeSingle();
    if (errorPorId) throw errorPorId;
    return entradaPorId as Entrada | null;
  }

  private normalizarEntradas(entradas: Entrada[] | string | null | undefined): Entrada[] {
    let lista: Entrada[];
    try {
      const valor = typeof entradas === 'string' ? JSON.parse(entradas) : entradas;
      lista = Array.isArray(valor) ? (valor as Entrada[]) : [];
    } catch {
      lista = [];
    }
    return lista.map((entrada) => ({
      ...entrada,
      codigo_qr: entrada.codigo_qr || entrada.id,
    }));
  }

  /** Valida (consume) el QR de una entrada. Rechaza si ya fue validado o cancelado. */
  async validarEntrada(entradaId: string, empleadoId: string): Promise<Entrada> {
    const { data: actual, error: errorLectura } = await this.supabaseService.client
      .from('entradas')
      .select('estado')
      .eq('id', entradaId)
      .single();
    if (errorLectura) throw errorLectura;
    if (actual.estado === 'VALIDADO') throw new Error('Este QR ya fue consumido anteriormente y no es valido.');
    if (actual.estado === 'CANCELADO') throw new Error('Esta entrada fue cancelada y no es valida.');

    const { data, error } = await this.supabaseService.client
      .from('entradas')
      .update({ estado: 'VALIDADO', validado_por: empleadoId, validado_en: new Date().toISOString() })
      .eq('id', entradaId)
      .select()
      .single();
    if (error) throw error;
    return data as Entrada;
  }
}
