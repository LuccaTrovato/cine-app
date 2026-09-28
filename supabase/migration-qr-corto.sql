-- CineApp - Migracion para QR cortos
-- Ejecutar en un proyecto que ya tiene schema.sql aplicado.
-- Los nuevos codigos tendran formato TKT-XXXXXXXXXXXX o CB-XXXXXXXXXXXX.

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

drop trigger if exists trg_codigo_qr_corto_entrada on public.entradas;
create trigger trg_codigo_qr_corto_entrada
  before insert on public.entradas
  for each row execute function public.generar_codigo_qr_corto();

drop trigger if exists trg_codigo_qr_corto_candy on public.candy_pedidos;
create trigger trg_codigo_qr_corto_candy
  before insert on public.candy_pedidos
  for each row execute function public.generar_codigo_qr_corto();

-- Verificacion de los codigos existentes.
select id, codigo_qr, estado
from public.entradas
order by created_at desc;

select id, codigo_qr, estado
from public.candy_pedidos
order by created_at desc;
