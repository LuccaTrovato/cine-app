# Documento de Alcance y Requerimientos Funcionales
**Proyecto:** Sistema Web/PWA de Gestión y Venta de Entradas de Cine (CineApp)  
**Materia:** Programación IV (UTN FRA - C2 2026)  
**Tecnologías:** Angular, Supabase (Auth, Database PostgreSQL, Storage, Realtime), PWA

---

## 1. Alcance General del Proyecto (Scope Statement)

El proyecto consiste en el desarrollo de una aplicación web SPA progresiva (PWA) e interactiva para la reserva y venta de entradas de cine, combos de Candy Bar y gestión administrativa. El sistema contempla tres perfiles operativos (Cliente/Usuario Registrado, Empleado y Administrador), además del acceso público para visitantes no autenticados. 

La aplicación resolverá de forma automatizada la asignación de salas y la prevención de solapamientos de funciones, integrando reglas dinámicas de precios, preventas, programa de fidelización por puntos, cupones segmentados por edad y validación de accesos mediante código QR.

---

## 2. Requerimientos Funcionales (RF) Detallados

---

### 🔑 Módulo 1: Autenticación, Usuarios y Perfiles

#### **RF-01: Registro de Clientes y Gestión de Perfil**
* **Actor:** Usuario Visitante.
* **Datos de Entrada (Formulario):**
  * `email` (string, obligatorio, formato válido).
  * `password` (string, obligatorio, mínimo 6 caracteres).
  * `nombre` y `apellido` (strings, obligatorios).
  * `dni` (string/numérico, obligatorio, único).
  * `fecha_nacimiento` (date, obligatorio, selector de fecha).
* **Datos Guardados en Base de Datos (`auth.users` y `public.profiles`):**
  * `id` (UUID vinculado a Supabase Auth).
  * `email`, `nombre`, `apellido`, `dni`, `fecha_nacimiento`, `avatar_url`.
  * `rol` (enum: `'cliente'`, `'empleado'`, `'admin'`, por defecto `'cliente'`).
  * `puntos_acumulados` (integer, inicia en `0`).
  * `credito_favor` (decimal, inicia en `0.00`).
* **Validaciones y Reglas de Negocio:**
  * Verificar que el email y DNI no estén registrados previamente en el sistema.
  * La `fecha_nacimiento` determina dinámicamente la edad del usuario para aplicar restricciones de clasificación (+13, +18) y beneficios por edad (>50 años).
* **Resultado:** Usuario registrado en Supabase Auth, perfil creado en la tabla `profiles` y sesión iniciada.
* **Nota:** La foto de perfil (`avatar_url`) no se carga en el formulario de registro; el cliente la sube después desde la pantalla "Mi Perfil", una vez logueado.

#### **RF-02: Autenticación de Usuarios (Login y Control de Acceso)**
* **Actor:** Cliente, Empleado, Administrador.
* **Datos de Entrada:** `email`, `password`.
* **Procesamiento y Validación:**
  * Validación de credenciales contra Supabase Auth (retorna token JWT).
  * Carga del perfil en el estado global de Angular para aplicar protección de rutas mediante *Functional Guards* según el rol (`cliente`, `empleado`, `admin`).
* **Resultado:** Redirección automática a la vista correspondiente según el rol del usuario.

---

### 🎬 Módulo 2: Películas, Cartelera y Reseñas

#### **RF-03: Alta y Gestión de Películas (Admin)**
* **Actor:** Administrador.
* **Datos de Entrada:**
  * `titulo` (string, obligatorio).
  * `sinopsis` (texto libre, obligatorio).
  * `duracion_minutos` (integer > 0, obligatorio).
  * `clasificacion_edad` (enum: `'ATP'`, `'+13'`, `'+18'`, obligatorio).
  * `generos` (multiselect: Acción, Comedia, Drama, Sci-Fi, Terror, etc.).
  * `imagen_afiche` (archivo subido a Supabase Storage).
  * `estado_publicacion` (enum: `'Cartelera'`, `'Destacada'`, `'Proximamente'`).
* **Datos Guardados en DB (`peliculas`):**
  * `id`, `titulo`, `sinopsis`, `duracion_minutos`, `clasificacion_edad`, `generos` (array), `imagen_url`, `es_destacada`, `es_proximamente`, `created_at`.
* **Resultado:** Película registrada y disponible para ser programada en funciones.

#### **RF-04: Cartelera, Buscador y Películas Más Vendidas**
* **Actor:** Visitante, Cliente.
* **Funcionalidad:**
  * La página principal presenta en la parte superior las **5 películas más vendidas** (calculado dinámicamente según la cantidad de entradas confirmadas, sin contar canceladas).
  * Buscador interactivo que permite filtrar por **título** y por **género(s)**.
* **Salida Visual:** Tarjetas con afiche, título, duración, clasificación de edad y calificación promedio.

#### **RF-05: Sistema de Reseñas y Puntuación Promedio**
* **Actor:** Cliente Autenticado.
* **Datos de Entrada:** `pelicula_id`, `puntuacion` (entero de 1 a 5 estrellas), `comentario` (texto corto, máx. 280 caracteres).
* **Datos Guardados (`reseñas`):** `id`, `pelicula_id`, `usuario_id`, `puntuacion`, `comentario`, `created_at`.
* **Validaciones y Negocio:**
  * Cualquier cliente autenticado puede publicar una reseña; el sistema permite una única reseña por usuario y película (puede editarla o borrarla después).
  * El detalle de cada película recalcula automáticamente la **puntuación promedio** visible para todos los visitantes.

#### **RF-06: Sección "Próximamente", Preventa y Alertas de Estreno**
* **Actor:** Cliente, Administrador.
* **Lógica de Preventa:**
  * El Admin configura una fecha de estreno.
  * El sistema habilita la venta de entradas **7 días antes del estreno** con un precio promocional de preventa. Pasada la fecha de estreno, el precio vuelve al valor normal automáticamente.
* **Alerta de Estreno:**
  * Los clientes pueden presionar "Activar Alerta" en una película de *Próximamente*.
  * **Datos Guardados (`alertas_estreno`):** `id`, `usuario_id`, `pelicula_id`, `notificado` (boolean).

---

### 🏛️ Módulo 3: Salas, Funciones y Asignación Automática

#### **RF-07: Configuración de Salas y Butacas VIP**
* **Actor:** Sistema / Administrador.
* **Estructura Fija de Sala:**
  * Cada sala tiene **20 filas numeradas de la A a la T**.
  * Distribución en 3 bloques/columnas: Columna Izquierda (**4 butacas**), Columna Central (**20 butacas**), Columna Derecha (**4 butacas**). (Total: 28 asientos por fila = 560 butacas por sala).
  * **Butacas VIP:** Las últimas 3 filas (**filas R, S y T**) son de categoría VIP, con un costo más alto y diferenciación visual clara en el mapa.
* **Datos Guardados (`salas` y `mapa_butacas`):** `sala_id`, `nombre_sala`, `fila`, `columna`, `es_vip` (boolean).

#### **RF-08: Programación de Funciones con Asignación Automática de Sala**
* **Actor:** Administrador.
* **Datos de Entrada:** `pelicula_id`, Días y horario solicitados (ej. Lunes, Martes y Viernes a las 18:00 hs), Formato (`2D`, `3D`, `4D`, `5D`), Idioma (`Castellano`, `Subtitulada`), Precio base.
* **Reglas de Negocio Automatizadas (Críticas):**
  1. **Asignación Automática de Sala:** El sistema evalúa las salas existentes y asigna automáticamente una sala libre para los días y horarios pedidos.
  2. **Control Estricto de Solapamiento:** Bajo ningún término dos funciones pueden ocurrir en la misma sala al mismo tiempo.
  3. **Margen de Limpieza (30 Minutos):** El sistema calcula `hora_inicio` + `duracion_pelicula`. No se puede programar otra función en esa sala hasta transcurridos al menos **30 minutos de intervalo** desde la finalización de la función anterior.
* **Datos Guardados (`funciones`):** `id`, `pelicula_id`, `sala_id`, `fecha_hora_inicio`, `fecha_hora_fin`, `formato`, `idioma`, `precio_base`.

---

### 🎟️ Módulo 4: Reserva, Compra de Entradas y Cupones

#### **RF-09: Selección de Butacas y Validación de Restricción de Edad**
* **Actor:** Cliente Autenticado.
* **Datos de Entrada:** `funcion_id`, Lista de butacas seleccionadas en el mapa dinámico (ej. Fila M - Columna Central 12).
* **Validación de Edad (Obligatoria):**
  * Si la película es `+18` o `+13`, el sistema calcula la edad actual del cliente basada en su `fecha_nacimiento`.
  * Si el cliente no cumple la edad mínima, la compra se frena emitiendo un mensaje de restricción.
* **Mapeo de Precios:**
  * Butacas Estándar (Filas A a Q): Precio base de la función.
  * Butacas VIP (Filas R, S, T): Precio base + Recargo VIP.

#### **RF-10: Aplicación de Cupones de Descuento y Descuento por Edad**
* **Actor:** Cliente, Administrador.
* **Reglas de Cupones:**
  * **Cupón de Primera Compra:** Configurable por el Admin (porcentaje de descuento). El sistema valida que el cliente no tenga registros en la tabla `compras`.
  * **Cupones para Mayores de 50 años:** Cupones especiales que el sistema solo permite aplicar si la edad del perfil es mayor a 50 años.
* **Datos Guardados (`cupones`):** `id`, `codigo`, `porcentaje_descuento`, `es_primera_compra` (boolean), `edad_minima` (integer), `activo` (boolean).

#### **RF-11: Confirmación de Compra, Crédito a Favor y Pago**
* **Actor:** Cliente Autenticado.
* **Lógica de Descuentos y Pago:**
  * Total = (Entradas Estándar + Entradas VIP) - Descuento Cupón.
  * Si el usuario tiene `credito_favor` en su perfil, puede seleccionar usarlo como parte de pago junto con el método de pago principal.
* **Generación de Entradas:**
  * Al confirmar el pago, el sistema genera un **Código QR único** por entrada/compra.
  * Se asignan los puntos correspondientes al cliente ($1 peso gastado = 1 punto ganado).
* **Datos Guardados (`compras` y `entradas`):**
  * `compras`: `id`, `usuario_id`, `monto_total`, `credito_usado`, `cupon_id`, `puntos_ganados`, `fecha_compra`.
  * `entradas`: `id`, `compra_id`, `funcion_id`, `fila`, `columna`, `es_vip`, `codigo_qr`, `precio_pagado`, `estado` (enum: `'PENDIENTE'`, `'VALIDADO'`, `'CANCELADO'`).

---

### 🍿 Módulo 5: Fidelización (Puntos) y Candy Bar

#### **RF-12: Programa de Fidelización (Puntos y Crédito)**
* **Actor:** Cliente, Administrador.
* **Acumulación:** 1 peso gastado en compras = 1 punto acumulado en la cuenta.
* **Canje:** Los clientes pueden canjear sus puntos por entradas gratis o productos del Candy Bar según el catálogo configurado por el Admin.
* **Crédito en Cuenta:** El crédito a favor acumulado en el perfil puede reutilizarse en cualquier compra futura.

#### **RF-13: Compra y Canje en Candy Bar**
* **Actor:** Cliente, Administrador.
* **Datos de Productos (`candy_productos`):** `id`, `nombre`, `descripcion`, `precio`, `puntos_canje`, `imagen_url`, `stock`.
* **Proceso:** El cliente compra un producto/combo o lo canjea por puntos, obteniendo un Código QR para su retiro en la barra.

---

### 🔍 Módulo 6: Operatoria de Empleados (Validación QR)

#### **RF-14: Validación de Entradas y Retiro de Candy Bar**
* **Actor:** Empleado.
* **Datos de Entrada:**
  * Escaneo de código QR mediante la cámara del dispositivo.
  * Tipeo manual del código alfanumérico alternativo (para casos de falla del lector).
* **Regla de Negocio Crítica:**
  * El sistema verifica el estado del código en la base de datos.
  * Si la entrada/pedido está en estado `'PENDIENTE'`, se conmuta inmediatamente a **`'VALIDADO'`** registrando fecha, hora y ID del empleado.
  * Si la entrada ya fue validada previamente, el sistema la rechaza e informa que **el QR ya no es válido y fue consumido**.

---

### 📊 Módulo 7: Panel de Administración, Reportes y Exportación

#### **RF-15: Reportes de Facturación y Estadísticas**
* **Actor:** Administrador.
* **Métricas Principales:**
  * Facturación total acumulada por día ($).
  * Cantidad total de entradas sold/vendidas por día.
  * Gráfico estadístico de rendimiento de ventas por película y por formato.
* **Exportación de Reportes (Requisito Obligatorio):**
  * Botón para exportar el reporte de facturación consolidado a documento **PDF**.
  * Botón para exportar los datos detallados a archivo **Excel (.xlsx)**.

---

## 3. Matriz de Entidades de Base de Datos (Supabase)

| Tabla Supabase | Campos Principales | Función en la Aplicación |
| :--- | :--- | :--- |
| `profiles` | `id`, `email`, `nombre`, `apellido`, `dni`, `fecha_nacimiento`, `rol`, `puntos_acumulados`, `credito_favor`, `avatar_url` | Extensión de `auth.users` con datos reales del usuario. |
| `peliculas` | `id`, `titulo`, `sinopsis`, `duracion_minutos`, `clasificacion_edad`, `generos`, `imagen_url`, `es_destacada`, `es_proximamente` | Catálogo completo de películas. |
| `reseñas` | `id`, `pelicula_id`, `usuario_id`, `puntuacion`, `comentario`, `created_at` | Reseñas y calificaciones de 1 a 5 estrellas. |
| `salas` | `id`, `nombre`, `filas_cantidad` (20), `columnas_bloques` | Estructura de las salas del cine. |
| `funciones` | `id`, `pelicula_id`, `sala_id`, `fecha_hora_inicio`, `fecha_hora_fin`, `formato`, `idioma`, `precio_base` | Proyección de películas con asignación automática de sala. |
| `cupones` | `id`, `codigo`, `porcentaje_descuento`, `es_primera_compra`, `edad_minima`, `activo` | Configuración de descuentos y reglas de cupones. |
| `compras` | `id`, `usuario_id`, `monto_total`, `credito_usado`, `cupon_id`, `puntos_ganados`, `fecha_compra` | Registro de transacciones financieras. |
| `entradas` | `id`, `compra_id`, `funcion_id`, `fila`, `columna`, `es_vip`, `codigo_qr`, `estado` (`PENDIENTE`/`VALIDADO`/`CANCELADO`) | Billetes digitales con control de uso por QR. |
| `candy_productos` | `id`, `nombre`, `precio`, `puntos_canje`, `stock` | Catálogo y ventas del Candy Bar. |
