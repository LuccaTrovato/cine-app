-- CineApp - Funciones programadas de prueba
-- Ejecutar luego de cargar peliculas y salas.
-- Crea una funcion futura por pelicula sin duplicar funciones existentes.

insert into public.funciones (
  pelicula_id,
  sala_id,
  fecha_hora_inicio,
  fecha_hora_fin,
  formato,
  idioma,
  precio_base
)
select
  pelicula.id,
  sala.id,
  inicio.fecha_hora_inicio,
  inicio.fecha_hora_inicio + (pelicula.duracion_minutos * interval '1 minute'),
  '2D',
  'Castellano',
  3500
from (
  select
    p.id,
    p.duracion_minutos,
    row_number() over (order by p.created_at, p.id) as orden
  from public.peliculas p
  where not exists (
    select 1
    from public.funciones f
    where f.pelicula_id = p.id
      and f.fecha_hora_inicio >= now()
  )
) pelicula
cross join lateral (
  select s.id
  from public.salas s
  order by s.nombre
  limit 1
) sala
cross join lateral (
  select date_trunc('day', now())
    + (pelicula.orden * interval '1 day')
    + interval '18 hours' as fecha_hora_inicio
) inicio;

select
  f.id,
  p.titulo,
  s.nombre as sala,
  f.fecha_hora_inicio,
  f.fecha_hora_fin,
  f.formato,
  f.idioma,
  f.precio_base
from public.funciones f
join public.peliculas p on p.id = f.pelicula_id
join public.salas s on s.id = f.sala_id
where f.fecha_hora_inicio >= now()
order by f.fecha_hora_inicio;
