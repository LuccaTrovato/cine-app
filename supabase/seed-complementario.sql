-- CineApp - Datos administrativos complementarios
-- Ejecutar luego de schema.sql.
-- Es idempotente: no duplica salas ni cupones existentes.

-- Salas disponibles para la asignacion automatica de funciones.
insert into public.salas (nombre, filas_cantidad, capacidad)
select datos.nombre, 20, 560
from (values
  ('Sala 1'),
  ('Sala 2'),
  ('Sala 3'),
  ('Sala 4'),
  ('Sala 5')
) as datos(nombre)
where not exists (
  select 1
  from public.salas sala
  where sala.nombre = datos.nombre
);

-- Cupon de primera compra.
insert into public.cupones (codigo, porcentaje_descuento, es_primera_compra, edad_minima, activo)
select 'BIENVENIDO10', 10, true, null, true
where not exists (
  select 1 from public.cupones where codigo = 'BIENVENIDO10'
);

-- Cupon para clientes mayores de 50 anos.
insert into public.cupones (codigo, porcentaje_descuento, es_primera_compra, edad_minima, activo)
select 'MAYOR50', 20, false, 50, true
where not exists (
  select 1 from public.cupones where codigo = 'MAYOR50'
);

-- Cupon promocional general para pruebas del TP.
insert into public.cupones (codigo, porcentaje_descuento, es_primera_compra, edad_minima, activo)
select 'CINE20', 20, false, null, true
where not exists (
  select 1 from public.cupones where codigo = 'CINE20'
);

-- Verificacion de datos administrativos.
select id, nombre, capacidad
from public.salas
order by nombre;

select codigo, porcentaje_descuento, es_primera_compra, edad_minima, activo
from public.cupones
order by codigo;

-- Las funciones se crean desde /admin/funciones porque requieren:
-- pelicula_id, dias, hora, semanas, formato, idioma y precio_base.
-- Compras, entradas, pedidos, resenas, alertas y auditoria se generan
-- automaticamente durante el uso real de la aplicacion.
