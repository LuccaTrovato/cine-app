-- =====================================================================
-- CineApp - Esquema completo de base de datos Supabase (PostgreSQL)
-- TP1 Programacion IV - UTN FRA
-- Ejecutar completo en el SQL Editor de un proyecto Supabase nuevo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSIONES
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. PROFILES (extiende auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null,
  apellido text not null,
  dni text unique not null,
  fecha_nacimiento date not null,
  rol text check (rol in ('cliente', 'empleado', 'admin')) default 'cliente' not null,
  puntos_acumulados int default 0 not null,
  credito_favor decimal(10,2) default 0.00 not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nombre, apellido, dni, fecha_nacimiento, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', 'Usuario'),
    coalesce(new.raw_user_meta_data->>'apellido', 'Nuevo'),
    coalesce(new.raw_user_meta_data->>'dni', new.id::text),
    coalesce((new.raw_user_meta_data->>'fecha_nacimiento')::date, '2000-01-01'::date),
    coalesce(new.raw_user_meta_data->>'rol', 'cliente')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. PELICULAS
-- ---------------------------------------------------------------------
create table public.peliculas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  sinopsis text not null,
  duracion_minutos int not null check (duracion_minutos > 0),
  clasificacion_edad text check (clasificacion_edad in ('ATP', '+13', '+18')) not null,
  generos text[] not null default '{}',
  imagen_url text,
  es_destacada boolean default false not null,
  es_proximamente boolean default false not null,
  fecha_estreno date,
  precio_preventa decimal(10,2),
  created_at timestamptz default now() not null
);

-- ---------------------------------------------------------------------
-- 3. RESEÑAS
-- ---------------------------------------------------------------------
create table public.resenas (
  id uuid primary key default gen_random_uuid(),
  pelicula_id uuid references public.peliculas(id) on delete cascade not null,
  usuario_id uuid references public.profiles(id) on delete cascade not null,
  puntuacion int not null check (puntuacion between 1 and 5),
  comentario text check (char_length(comentario) <= 280),
  created_at timestamptz default now() not null,
  unique (pelicula_id, usuario_id)
);

-- ---------------------------------------------------------------------
-- 4. ALERTAS DE ESTRENO
-- ---------------------------------------------------------------------
create table public.alertas_estreno (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id) on delete cascade not null,
  pelicula_id uuid references public.peliculas(id) on delete cascade not null,
  notificado boolean default false not null,
  created_at timestamptz default now() not null,
  unique (usuario_id, pelicula_id)
);

-- ---------------------------------------------------------------------
-- 5. SALAS (20 filas A-T x 28 butacas, ultimas 3 filas VIP)
-- ---------------------------------------------------------------------
create table public.salas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  filas_cantidad int default 20 not null,
  capacidad int default 560 not null
);

-- ---------------------------------------------------------------------
-- 6. FUNCIONES (con asignacion automatica de sala en la capa de servicio)
-- ---------------------------------------------------------------------
create table public.funciones (
  id uuid primary key default gen_random_uuid(),
  pelicula_id uuid references public.peliculas(id) on delete cascade not null,
  sala_id uuid references public.salas(id) on delete cascade not null,
  fecha_hora_inicio timestamptz not null,
  fecha_hora_fin timestamptz not null,
  formato text check (formato in ('2D', '3D', '4D', '5D')) not null,
  idioma text check (idioma in ('Castellano', 'Subtitulada')) not null,
  precio_base decimal(10,2) not null,
  created_at timestamptz default now() not null,
  constraint fecha_fin_valida check (fecha_hora_fin > fecha_hora_inicio)
);

create index idx_funciones_sala_horario on public.funciones (sala_id, fecha_hora_inicio, fecha_hora_fin);

-- Evita solapamientos estrictos. El margen de limpieza se valida en el trigger
-- siguiente porque PostgreSQL no permite una suma sobre timestamptz dentro de
-- una expresion de indice EXCLUDE si no es IMMUTABLE.
create extension if not exists "btree_gist";

alter table public.funciones
  add constraint no_solapamiento_sala
  exclude using gist (
    sala_id with =,
    tstzrange(fecha_hora_inicio, fecha_hora_fin) with &&
  );

create or replace function public.validar_limpieza_funcion()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.funciones f
    where f.sala_id = new.sala_id
      and f.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and new.fecha_hora_inicio < f.fecha_hora_fin + interval '30 minutes'
      and f.fecha_hora_inicio < new.fecha_hora_fin + interval '30 minutes'
  ) then
    raise exception 'La sala seleccionada necesita al menos 30 minutos de limpieza entre funciones.';
  end if;
  return new;
end;
$$;

create trigger trg_validar_limpieza_funcion
  before insert or update on public.funciones
  for each row execute function public.validar_limpieza_funcion();

-- ---------------------------------------------------------------------
-- 7. CUPONES
-- ---------------------------------------------------------------------
create table public.cupones (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  porcentaje_descuento numeric(5,2) not null check (porcentaje_descuento between 0 and 100),
  es_primera_compra boolean default false not null,
  edad_minima int,
  activo boolean default true not null,
  created_at timestamptz default now() not null
);

-- ---------------------------------------------------------------------
-- 8. COMPRAS
-- ---------------------------------------------------------------------
create table public.compras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id) on delete cascade not null,
  monto_total decimal(10,2) not null,
  credito_usado decimal(10,2) default 0 not null,
  cupon_id uuid references public.cupones(id),
  puntos_ganados int default 0 not null,
  fecha_compra timestamptz default now() not null
);

-- ---------------------------------------------------------------------
-- 9. ENTRADAS
-- ---------------------------------------------------------------------
create table public.entradas (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid references public.compras(id) on delete cascade not null,
  funcion_id uuid references public.funciones(id) on delete cascade not null,
  usuario_id uuid references public.profiles(id) on delete cascade not null,
  fila char(1) not null,
  columna int not null,
  es_vip boolean default false not null,
  codigo_qr text unique not null,
  estado text check (estado in ('PENDIENTE', 'VALIDADO', 'CANCELADO')) default 'PENDIENTE' not null,
  precio_pagado decimal(10,2) not null,
  validado_por uuid references public.profiles(id),
  validado_en timestamptz,
  created_at timestamptz default now() not null,
  unique (funcion_id, fila, columna)
);

-- ---------------------------------------------------------------------
-- 10. CANDY BAR - PRODUCTOS Y PEDIDOS
-- ---------------------------------------------------------------------
create table public.candy_productos (
  id bigint generated by default as identity primary key,
  nombre text not null,
  descripcion text,
  precio numeric not null,
  puntos_canje int default 0 not null,
  imagen_url text,
  stock int default 0 not null,
  created_at timestamptz default now() not null
);

create table public.candy_pedidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id) on delete cascade not null,
  producto_id bigint references public.candy_productos(id) not null,
  cantidad int not null default 1,
  precio_pagado numeric,
  puntos_usados int default 0 not null,
  codigo_qr text unique not null,
  estado text check (estado in ('PENDIENTE', 'VALIDADO', 'CANCELADO')) default 'PENDIENTE' not null,
  created_at timestamptz default now() not null
);

-- ---------------------------------------------------------------------
-- 11. LOG DE ACTIVIDAD (AUDITORIA)
-- ---------------------------------------------------------------------
create table public.log_actividad (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id),
  accion text not null,
  tabla_afectada text,
  registro_id text,
  detalle jsonb,
  created_at timestamptz default now() not null
);

-- Codigos QR cortos y unicos para mostrar en tickets y pedidos.
create or replace function public.generar_codigo_qr_corto()
returns trigger
language plpgsql
as $$
begin
  new.codigo_qr := case
    when tg_table_name = 'entradas' then 'TKT-'
    else 'CB-'
  end || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  return new;
end;
$$;

create trigger trg_codigo_qr_corto_entrada
  before insert on public.entradas
  for each row execute function public.generar_codigo_qr_corto();

create trigger trg_codigo_qr_corto_candy
  before insert on public.candy_pedidos
  for each row execute function public.generar_codigo_qr_corto();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.peliculas enable row level security;
alter table public.resenas enable row level security;
alter table public.alertas_estreno enable row level security;
alter table public.salas enable row level security;
alter table public.funciones enable row level security;
alter table public.cupones enable row level security;
alter table public.compras enable row level security;
alter table public.entradas enable row level security;
alter table public.candy_productos enable row level security;
alter table public.candy_pedidos enable row level security;
alter table public.log_actividad enable row level security;

-- Helper: rol del usuario autenticado actual
create or replace function public.rol_actual()
returns text
language sql
security definer
stable
as $$
  select rol from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- ENDURECIMIENTO: evita que un cliente escale privilegios modificando
-- columnas sensibles de su propio perfil via llamadas REST directas
-- (RLS solo protege filas, no columnas; esto lo resuelve a nivel trigger).
-- ---------------------------------------------------------------------
create or replace function public.proteger_columnas_perfil()
returns trigger
language plpgsql
security definer
as $$
begin
  if coalesce(current_setting('app.bypass_rls_triggers', true), '') = 'true' then
    return new;
  end if;
  if public.rol_actual() <> 'admin' then
    new.rol := old.rol;
    new.puntos_acumulados := old.puntos_acumulados;
    new.credito_favor := old.credito_favor;
    new.dni := old.dni;
  end if;
  return new;
end;
$$;

create trigger trg_proteger_columnas_perfil
  before update on public.profiles
  for each row execute function public.proteger_columnas_perfil();

-- ---------------------------------------------------------------------
-- ENDURECIMIENTO: el cliente solo puede cancelar su propia entrada
-- (no puede alterar precio_pagado, es_vip, codigo_qr ni auto-validarse);
-- el staff solo puede transicionar PENDIENTE -> VALIDADO.
-- ---------------------------------------------------------------------
create or replace function public.proteger_columnas_entrada()
returns trigger
language plpgsql
security definer
as $$
begin
  if coalesce(current_setting('app.bypass_rls_triggers', true), '') = 'true' then
    return new;
  end if;
  if public.rol_actual() in ('admin', 'empleado') then
    -- Staff: solo puede validar (PENDIENTE -> VALIDADO), no tocar montos/butacas.
    new.precio_pagado := old.precio_pagado;
    new.fila := old.fila;
    new.columna := old.columna;
    new.es_vip := old.es_vip;
    new.codigo_qr := old.codigo_qr;
    new.funcion_id := old.funcion_id;
    new.usuario_id := old.usuario_id;
    if old.estado <> 'PENDIENTE' or new.estado <> 'VALIDADO' then
      raise exception 'Transicion de estado no permitida para staff';
    end if;
  else
    -- Cliente dueño de la entrada: solo puede cancelarla si esta PENDIENTE.
    if old.usuario_id <> auth.uid() or old.estado <> 'PENDIENTE' or new.estado <> 'CANCELADO' then
      raise exception 'Solo se permite cancelar una entrada propia en estado PENDIENTE';
    end if;
    new.precio_pagado := old.precio_pagado;
    new.fila := old.fila;
    new.columna := old.columna;
    new.es_vip := old.es_vip;
    new.codigo_qr := old.codigo_qr;
    new.funcion_id := old.funcion_id;
    new.usuario_id := old.usuario_id;
    new.validado_por := old.validado_por;
    new.validado_en := old.validado_en;
  end if;
  return new;
end;
$$;

create trigger trg_proteger_columnas_entrada
  before update on public.entradas
  for each row execute function public.proteger_columnas_entrada();

-- ---------------------------------------------------------------------
-- ENDURECIMIENTO: en candy_pedidos solo el staff puede transicionar
-- PENDIENTE -> VALIDADO, sin alterar cantidades/precios/puntos.
-- ---------------------------------------------------------------------
create or replace function public.proteger_columnas_candy_pedido()
returns trigger
language plpgsql
security definer
as $$
begin
  if coalesce(current_setting('app.bypass_rls_triggers', true), '') = 'true' then
    return new;
  end if;
  if public.rol_actual() not in ('admin', 'empleado') then
    raise exception 'Solo el staff puede actualizar pedidos de candy bar';
  end if;
  new.cantidad := old.cantidad;
  new.precio_pagado := old.precio_pagado;
  new.puntos_usados := old.puntos_usados;
  new.producto_id := old.producto_id;
  new.usuario_id := old.usuario_id;
  new.codigo_qr := old.codigo_qr;
  if old.estado <> 'PENDIENTE' or new.estado <> 'VALIDADO' then
    raise exception 'Transicion de estado no permitida';
  end if;
  return new;
end;
$$;

create trigger trg_proteger_columnas_candy_pedido
  before update on public.candy_pedidos
  for each row execute function public.proteger_columnas_candy_pedido();


-- PROFILES
create policy "Perfil propio visible" on public.profiles for select using (auth.uid() = id or public.rol_actual() in ('admin','empleado'));
create policy "Perfil propio editable" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Admin actualiza cualquier perfil" on public.profiles for update using (public.rol_actual() = 'admin');

-- PELICULAS
create policy "Lectura publica peliculas" on public.peliculas for select using (true);
create policy "Admin administra peliculas" on public.peliculas for all using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');

-- RESEÑAS
create policy "Lectura publica resenas" on public.resenas for select using (true);
create policy "Cliente crea su resena" on public.resenas for insert with check (auth.uid() = usuario_id);
create policy "Cliente edita su resena" on public.resenas for update using (auth.uid() = usuario_id);
create policy "Cliente borra su resena" on public.resenas for delete using (auth.uid() = usuario_id);

-- ALERTAS ESTRENO
create policy "Cliente ve sus alertas" on public.alertas_estreno for select using (auth.uid() = usuario_id);
create policy "Cliente crea sus alertas" on public.alertas_estreno for insert with check (auth.uid() = usuario_id);
create policy "Cliente borra sus alertas" on public.alertas_estreno for delete using (auth.uid() = usuario_id);

-- SALAS
create policy "Lectura publica salas" on public.salas for select using (true);
create policy "Admin administra salas" on public.salas for all using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');

-- FUNCIONES
create policy "Lectura publica funciones" on public.funciones for select using (true);
create policy "Admin administra funciones" on public.funciones for all using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');

-- CUPONES
create policy "Lectura publica cupones activos" on public.cupones for select using (activo = true or public.rol_actual() = 'admin');
create policy "Admin administra cupones" on public.cupones for all using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');

-- COMPRAS
-- Nota: no se otorga INSERT directo al cliente; las compras solo se crean via el RPC
-- security definer "comprar_entradas", que calcula precio/cupon/credito en el servidor.
create policy "Cliente ve sus compras" on public.compras for select using (auth.uid() = usuario_id or public.rol_actual() in ('admin','empleado'));

-- ENTRADAS
-- Nota: no se otorga INSERT directo al cliente (evita manipular precio_pagado/es_vip);
-- se crean via el RPC "comprar_entradas". La cancelacion pasa por el RPC "cancelar_entrada".
create policy "Lectura entradas propias o staff" on public.entradas for select using (auth.uid() = usuario_id or public.rol_actual() in ('admin','empleado'));
create policy "Cliente cancela su entrada" on public.entradas for update using (auth.uid() = usuario_id and estado = 'PENDIENTE');
create policy "Staff valida entradas" on public.entradas for update using (public.rol_actual() in ('admin','empleado'));

-- CANDY PRODUCTOS
create policy "Lectura publica candy productos" on public.candy_productos for select using (true);
create policy "Admin administra candy productos" on public.candy_productos for all using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');

-- CANDY PEDIDOS
-- Nota: no se otorga INSERT directo al cliente; los pedidos se crean via los RPC
-- "candy_comprar" / "candy_canjear" que validan stock, precio y puntos en el servidor.
create policy "Cliente ve sus pedidos" on public.candy_pedidos for select using (auth.uid() = usuario_id or public.rol_actual() in ('admin','empleado'));
create policy "Staff valida pedidos" on public.candy_pedidos for update using (public.rol_actual() in ('admin','empleado'));

-- LOG ACTIVIDAD
create policy "Admin lee auditoria" on public.log_actividad for select using (public.rol_actual() = 'admin');
create policy "Usuarios autenticados insertan auditoria" on public.log_actividad for insert with check (auth.uid() is not null);

-- =====================================================================
-- FUNCIONES RPC DE NEGOCIO (transacciones atomicas y seguras)
-- Se invocan desde el frontend via supabase.rpc(...). El precio, los
-- puntos y el credito se calculan siempre en el servidor (nunca se confia
-- en valores enviados por el cliente), evitando manipulacion de precios.
-- =====================================================================

create or replace function public.comprar_entradas(
  p_funcion_id uuid,
  p_butacas jsonb, -- [{"fila":"A","columna":1}, ...]
  p_codigo_cupon text default null,
  p_usar_credito boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_perfil public.profiles%rowtype;
  v_funcion public.funciones%rowtype;
  v_pelicula public.peliculas%rowtype;
  v_butaca jsonb;
  v_fila text;
  v_columna int;
  v_es_vip boolean;
  v_preventa boolean;
  v_precio_base numeric;
  v_precio_butaca numeric;
  v_monto_bruto numeric := 0;
  v_cupon public.cupones%rowtype;
  v_descuento_pct numeric := 0;
  v_monto_final numeric;
  v_credito_usado numeric := 0;
  v_puntos_ganados int;
  v_compra_id uuid;
  v_edad int;
  v_compras_previas int;
  v_entradas jsonb := '[]'::jsonb;
  v_codigo_qr text;
  v_nueva_entrada_id uuid;
begin
  if v_usuario is null then
    raise exception 'Debes iniciar sesion para comprar entradas.';
  end if;

  select * into v_perfil from public.profiles where id = v_usuario for update;
  if not found then
    raise exception 'Perfil no encontrado.';
  end if;

  select * into v_funcion from public.funciones where id = p_funcion_id;
  if not found then
    raise exception 'La funcion indicada no existe.';
  end if;

  select * into v_pelicula from public.peliculas where id = v_funcion.pelicula_id;

  v_edad := extract(year from age(v_perfil.fecha_nacimiento));
  if v_pelicula.clasificacion_edad = '+18' and v_edad < 18 then
    raise exception 'Esta funcion es +18. Debes tener al menos 18 anios.';
  elsif v_pelicula.clasificacion_edad = '+13' and v_edad < 13 then
    raise exception 'Esta funcion es +13. Debes tener al menos 13 anios.';
  end if;

  v_preventa := v_pelicula.fecha_estreno is not null
    and v_pelicula.precio_preventa is not null
    and now() >= (v_pelicula.fecha_estreno::timestamptz - interval '7 days')
    and now() < v_pelicula.fecha_estreno::timestamptz;

  v_precio_base := case when v_preventa then v_pelicula.precio_preventa else v_funcion.precio_base end;

  if p_codigo_cupon is not null and length(trim(p_codigo_cupon)) > 0 then
    select * into v_cupon from public.cupones where codigo = upper(trim(p_codigo_cupon)) and activo = true;
    if not found then
      raise exception 'El cupon ingresado no existe o esta inactivo.';
    end if;
    if v_cupon.edad_minima is not null and v_edad < v_cupon.edad_minima then
      raise exception 'Este cupon requiere una edad minima de % anios.', v_cupon.edad_minima;
    end if;
    if v_cupon.es_primera_compra then
      select count(*) into v_compras_previas from public.compras where usuario_id = v_usuario;
      if v_compras_previas > 0 then
        raise exception 'Este cupon es solo para la primera compra del cliente.';
      end if;
    end if;
    v_descuento_pct := v_cupon.porcentaje_descuento;
  end if;

  for v_butaca in select * from jsonb_array_elements(p_butacas)
  loop
    v_fila := upper(v_butaca->>'fila');
    v_es_vip := v_fila in ('R', 'S', 'T');
    v_precio_butaca := case when v_es_vip then round(v_precio_base * 1.3, 2) else v_precio_base end;
    v_monto_bruto := v_monto_bruto + v_precio_butaca;
  end loop;

  v_monto_final := round(v_monto_bruto * (1 - v_descuento_pct / 100), 2);
  v_credito_usado := case when p_usar_credito then least(v_perfil.credito_favor, v_monto_final) else 0 end;
  v_puntos_ganados := floor(v_monto_final);

  insert into public.compras (usuario_id, monto_total, credito_usado, cupon_id, puntos_ganados)
  values (v_usuario, v_monto_final, v_credito_usado, v_cupon.id, v_puntos_ganados)
  returning id into v_compra_id;

  for v_butaca in select * from jsonb_array_elements(p_butacas)
  loop
    v_fila := upper(v_butaca->>'fila');
    v_columna := (v_butaca->>'columna')::int;
    v_es_vip := v_fila in ('R', 'S', 'T');
    v_precio_butaca := case when v_es_vip then round(v_precio_base * 1.3, 2) else v_precio_base end;
    v_codigo_qr := 'TKT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

    begin
      insert into public.entradas (compra_id, funcion_id, usuario_id, fila, columna, es_vip, codigo_qr, precio_pagado)
      values (v_compra_id, p_funcion_id, v_usuario, v_fila, v_columna, v_es_vip, v_codigo_qr, v_precio_butaca)
      returning id into v_nueva_entrada_id;
    exception when unique_violation then
      raise exception 'La butaca % % ya fue reservada por otro cliente.', v_fila, v_columna;
    end;

    v_entradas := v_entradas || jsonb_build_object(
      'id', v_nueva_entrada_id, 'fila', v_fila, 'columna', v_columna, 'es_vip', v_es_vip,
      'precio_pagado', v_precio_butaca, 'codigo_qr', v_codigo_qr
    );
  end loop;

  perform set_config('app.bypass_rls_triggers', 'true', true);
  update public.profiles
    set puntos_acumulados = puntos_acumulados + v_puntos_ganados,
        credito_favor = round(credito_favor - v_credito_usado, 2)
    where id = v_usuario;

  return jsonb_build_object(
    'compra_id', v_compra_id,
    'entradas', v_entradas,
    'monto_total', v_monto_final,
    'credito_usado', v_credito_usado,
    'puntos_ganados', v_puntos_ganados
  );
end;
$$;

create or replace function public.cancelar_entrada(p_entrada_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_entrada public.entradas%rowtype;
  v_funcion public.funciones%rowtype;
begin
  select * into v_entrada from public.entradas where id = p_entrada_id;
  if not found or v_entrada.usuario_id <> v_usuario then
    raise exception 'Entrada no encontrada.';
  end if;
  if v_entrada.estado <> 'PENDIENTE' then
    raise exception 'Esta entrada ya fue validada o cancelada.';
  end if;

  select * into v_funcion from public.funciones where id = v_entrada.funcion_id;
  if now() > (v_funcion.fecha_hora_inicio - interval '2 hours') then
    raise exception 'Solo se puede cancelar hasta 2 horas antes del inicio de la funcion.';
  end if;

  perform set_config('app.bypass_rls_triggers', 'true', true);
  update public.entradas set estado = 'CANCELADO' where id = p_entrada_id;
  update public.profiles set credito_favor = round(credito_favor + v_entrada.precio_pagado, 2) where id = v_usuario;
end;
$$;

create or replace function public.cancelar_pedido_candy(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_pedido public.candy_pedidos%rowtype;
begin
  select * into v_pedido
  from public.candy_pedidos
  where id = p_pedido_id
    and usuario_id = v_usuario
  for update;

  if not found then raise exception 'Pedido no encontrado.'; end if;
  if v_pedido.estado <> 'PENDIENTE' then
    raise exception 'Este pedido ya fue validado o cancelado.';
  end if;

  perform set_config('app.bypass_rls_triggers', 'true', true);
  update public.candy_pedidos set estado = 'CANCELADO' where id = p_pedido_id;
  update public.candy_productos set stock = stock + v_pedido.cantidad where id = v_pedido.producto_id;

  if coalesce(v_pedido.precio_pagado, 0) > 0 then
    update public.profiles
    set credito_favor = round(credito_favor + v_pedido.precio_pagado, 2)
    where id = v_usuario;
  elsif v_pedido.puntos_usados > 0 then
    update public.profiles
    set puntos_acumulados = puntos_acumulados + v_pedido.puntos_usados
    where id = v_usuario;
  end if;
end;
$$;

create or replace function public.candy_comprar(p_producto_id bigint, p_cantidad int default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_producto public.candy_productos%rowtype;
  v_total numeric;
  v_puntos int;
  v_codigo_qr text;
  v_pedido_id uuid;
begin
  if v_usuario is null then raise exception 'Debes iniciar sesion.'; end if;
  select * into v_producto from public.candy_productos where id = p_producto_id for update;
  if not found then raise exception 'Producto no encontrado.'; end if;
  if v_producto.stock < p_cantidad then raise exception 'No hay stock suficiente.'; end if;

  v_total := round(v_producto.precio * p_cantidad, 2);
  v_puntos := floor(v_total);
  v_codigo_qr := 'CB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.candy_pedidos (usuario_id, producto_id, cantidad, precio_pagado, puntos_usados, codigo_qr)
  values (v_usuario, p_producto_id, p_cantidad, v_total, 0, v_codigo_qr)
  returning id into v_pedido_id;

  update public.candy_productos set stock = stock - p_cantidad where id = p_producto_id;

  perform set_config('app.bypass_rls_triggers', 'true', true);
  update public.profiles set puntos_acumulados = puntos_acumulados + v_puntos where id = v_usuario;

  return jsonb_build_object('pedido_id', v_pedido_id, 'codigo_qr', v_codigo_qr, 'total', v_total, 'puntos_ganados', v_puntos);
end;
$$;

create or replace function public.candy_canjear(p_producto_id bigint, p_cantidad int default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_producto public.candy_productos%rowtype;
  v_perfil public.profiles%rowtype;
  v_puntos_necesarios int;
  v_codigo_qr text;
  v_pedido_id uuid;
begin
  if v_usuario is null then raise exception 'Debes iniciar sesion.'; end if;
  select * into v_perfil from public.profiles where id = v_usuario for update;
  select * into v_producto from public.candy_productos where id = p_producto_id for update;
  if not found then raise exception 'Producto no encontrado.'; end if;
  if v_producto.stock < p_cantidad then raise exception 'No hay stock suficiente.'; end if;

  v_puntos_necesarios := v_producto.puntos_canje * p_cantidad;
  if v_perfil.puntos_acumulados < v_puntos_necesarios then
    raise exception 'No tenes puntos suficientes para este canje.';
  end if;

  v_codigo_qr := 'CB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.candy_pedidos (usuario_id, producto_id, cantidad, precio_pagado, puntos_usados, codigo_qr)
  values (v_usuario, p_producto_id, p_cantidad, 0, v_puntos_necesarios, v_codigo_qr)
  returning id into v_pedido_id;

  update public.candy_productos set stock = stock - p_cantidad where id = p_producto_id;

  perform set_config('app.bypass_rls_triggers', 'true', true);
  update public.profiles set puntos_acumulados = puntos_acumulados - v_puntos_necesarios where id = v_usuario;

  return jsonb_build_object('pedido_id', v_pedido_id, 'codigo_qr', v_codigo_qr, 'puntos_usados', v_puntos_necesarios);
end;
$$;

-- =====================================================================
-- STORAGE BUCKETS Y POLITICAS RLS
-- Crear manualmente los buckets 'peliculas', 'productos' y 'avatars' (publicos)
-- desde el dashboard de Supabase antes de correr estas politicas.
-- =====================================================================
create policy "Subir archivos peliculas" on storage.objects for insert to authenticated with check (bucket_id = 'peliculas');
create policy "Ver archivos peliculas" on storage.objects for select to anon, authenticated using (bucket_id = 'peliculas');
create policy "Borrar archivos peliculas" on storage.objects for delete to authenticated using (bucket_id = 'peliculas');

create policy "Subir archivos productos" on storage.objects for insert to anon, authenticated with check (bucket_id = 'productos');
create policy "Ver archivos productos" on storage.objects for select to anon, authenticated using (bucket_id = 'productos');
create policy "Borrar archivos productos" on storage.objects for delete to anon, authenticated using (bucket_id = 'productos');

create policy "Subir avatar propio" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
create policy "Ver avatars" on storage.objects for select to anon, authenticated using (bucket_id = 'avatars');
create policy "Actualizar avatar propio" on storage.objects for update to authenticated using (bucket_id = 'avatars');

-- =====================================================================
-- FUNCIONES AUXILIARES DE CONSULTA (usadas por el frontend via .rpc())
-- =====================================================================

-- Top N peliculas segun cantidad de entradas confirmadas (no canceladas)
create or replace function public.peliculas_mas_vendidas(limite int default 3)
returns setof public.peliculas
language sql
stable
as $$
  select p.*
  from public.peliculas p
  left join public.funciones f on f.pelicula_id = p.id
  left join public.entradas e on e.funcion_id = f.id and e.estado <> 'CANCELADO'
  group by p.id
  order by count(e.id) desc
  limit limite;
$$;

-- Puntuacion promedio (1-5) de una pelicula
create or replace function public.puntuacion_promedio_pelicula(pelicula uuid)
returns numeric
language sql
stable
as $$
  select coalesce(round(avg(puntuacion)::numeric, 1), 0)
  from public.resenas
  where pelicula_id = pelicula;
$$;

-- =====================================================================
-- SEED: salas iniciales (asignacion automatica las usa como pool)
-- =====================================================================
insert into public.salas (nombre) values ('Sala 1'), ('Sala 2'), ('Sala 3'), ('Sala 4'), ('Sala 5');

-- =====================================================================
-- SEED: combos iniciales de Candy Bar
-- =====================================================================
insert into public.candy_productos (nombre, descripcion, precio, puntos_canje, stock)
select datos.nombre, datos.descripcion, datos.precio, datos.puntos_canje, datos.stock
from (values
  ('COMBO FAMILIA', 'Combo familiar para compartir', 12000, 12000, 50),
  ('COMBO MEGA INDIVIDUAL', 'Combo mega individual', 6000, 6000, 50),
  ('COMBO MEGA RECARGADO', 'Combo mega con porcion recargada', 8500, 8500, 50),
  ('COMBO NACHOS', 'Nachos con salsa cheddar', 4500, 4500, 50),
  ('COMBO PANCHO', 'Pancho con bebida', 4000, 4000, 50),
  ('COMBO PAPAS CON CHEDDAR', 'Papas fritas con salsa cheddar', 5000, 5000, 50)
) as datos(nombre, descripcion, precio, puntos_canje, stock)
where not exists (
  select 1
  from public.candy_productos producto
  where producto.nombre = datos.nombre
);

-- =====================================================================
-- REALTIME: publicar tablas necesarias para WebSockets
-- =====================================================================
alter publication supabase_realtime add table public.entradas;
alter publication supabase_realtime add table public.candy_pedidos;
