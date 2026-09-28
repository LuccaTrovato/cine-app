        -- CineApp - Cancelacion de pedidos Candy Bar
        -- Ejecutar en un proyecto que ya tiene schema.sql aplicado.
        -- Permite cancelar pedidos propios mientras esten PENDIENTES.
        -- Devuelve stock y reintegra credito o puntos.

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

        if not found then
            raise exception 'Pedido no encontrado.';
        end if;

        if v_pedido.estado <> 'PENDIENTE' then
            raise exception 'Este pedido ya fue validado o cancelado.';
        end if;

        perform set_config('app.bypass_rls_triggers', 'true', true);

        update public.candy_pedidos
        set estado = 'CANCELADO'
        where id = p_pedido_id;

        update public.candy_productos
        set stock = stock + v_pedido.cantidad
        where id = v_pedido.producto_id;

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
