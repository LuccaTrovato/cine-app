# CineApp

Aplicación web SPA/PWA para la gestión y venta de entradas de cine, Candy Bar y administración, desarrollada para el **TP1 de Programación IV (UTN FRA)**.

## Stack tecnológico

- **Angular 19** — Standalone Components, Zoneless (`provideExperimentalZonelessChangeDetection`), Signals (`signal`, `computed`, `input`), nuevo control de flujo (`@if`/`@for`/`@switch`), Reactive Forms, Functional Guards con `inject()`, Lazy Loading (`loadComponent`).
- **Supabase** — Auth (email/password + JWT), PostgreSQL con Row Level Security, Storage Buckets (afiches, candy bar, avatares) y Realtime (WebSockets) para el mapa de butacas.
- **PWA** — Service Worker (`@angular/pwa`) para instalación e uso offline básico.
- **Librerías**: `@supabase/supabase-js`, `jspdf` + `jspdf-autotable` (reportes PDF), `xlsx` (reportes Excel), `chart.js` (gráficos), `html5-qrcode` (escaneo QR empleados), `qrcode` (generación de QR de entradas/pedidos).

## Estructura del proyecto

```
src/app/
  core/
    guards/      -> authGuard, roleGuard (functional guards)
    models/      -> interfaces TS que reflejan las tablas de Supabase
    services/    -> SupabaseService, AuthService, PeliculasService, FuncionesService,
                     EntradasService, CandyService, CuponesService, ResenasService,
                     ReportesService, ExportService, AuditoriaService
    utils/       -> butacas.util.ts (layout de sala), edad.util.ts
  shared/        -> Navbar, Estrellas, CodigoQr (componentes reutilizables)
  features/
    auth/        -> login, registro
    public/      -> home (cartelera/buscador), pelicula-detalle (reseñas, funciones)
    reserva/     -> seleccion-butacas (mapa realtime + checkout)
    cliente/     -> mis-entradas, perfil, candy-bar
    empleado/    -> validar-qr (cámara + manual)
    admin/       -> peliculas-admin, funciones-admin (asignación automática de sala),
                     productos-admin, cupones-admin, reportes (charts + PDF/Excel), auditoria
supabase/
  schema.sql     -> DDL completo: tablas, triggers, RLS, políticas de Storage, seed de salas
```

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Crear un proyecto nuevo en [supabase.com](https://supabase.com).
2. Ir a **SQL Editor** y ejecutar el contenido completo de [`supabase/schema.sql`](./supabase/schema.sql). Esto crea:
   - Tablas: `profiles`, `peliculas`, `resenas`, `alertas_estreno`, `salas`, `funciones`, `cupones`, `compras`, `entradas`, `candy_productos`, `candy_pedidos`, `log_actividad`.
   - Trigger `on_auth_user_created` que crea el perfil automáticamente al registrarse.
   - Constraint `no_solapamiento_sala` (usando `btree_gist`) que impide solapar funciones en la misma sala y exige 30 minutos de limpieza.
   - Políticas RLS para cada tabla según rol (`cliente`, `empleado`, `admin`).
   - Funciones RPC `peliculas_mas_vendidas` y `puntuacion_promedio_pelicula`.
   - 5 salas de ejemplo (pool para la asignación automática).
3. Ir a **Storage** y crear 3 buckets **públicos**: `peliculas`, `productos`, `avatars`. Las políticas de Storage ya quedaron creadas por el script.
4. Ir a **Database > Replication** y confirmar que `entradas` y `candy_pedidos` están agregadas a la publicación `supabase_realtime` (el script ya lo hace).
5. Copiar el **Project URL** y la **anon public key** desde *Project Settings > API*.

### 2. Configurar el frontend

Editar `src/environments/environment.ts` y `environment.development.ts` con tus credenciales:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://TU-PROYECTO.supabase.co',
  supabaseKey: 'TU-ANON-KEY',
};
```

### 3. Instalar dependencias y ejecutar

```bash
npm install
npm start   # ng serve
```

### 4. Crear el primer usuario administrador

Registrate normalmente desde la app (queda como `cliente`). Luego, en el **Table Editor** de Supabase, editá la fila de tu usuario en `profiles` y cambiá `rol` a `admin` (o `empleado` para probar la validación de QR).

### 5. Build de producción

```bash
npm run build
```

### 6. Despliegue (Vercel / Netlify)

- **Vercel**: importar el repo, *Build Command* `npm run build`, *Output Directory* `dist/cine-app/browser`.
- **Netlify**: *Build Command* `npm run build`, *Publish directory* `dist/cine-app/browser`.
- Configurar las variables de entorno del proyecto Supabase directamente en `environment.ts` antes de compilar (no hay backend propio: las credenciales anon son públicas por diseño, protegidas por RLS).

## Reglas de negocio implementadas

- **Salas y butacas**: 20 filas (A-T) × 28 butacas (4 + 20 + 4), filas **J/K accesibles**, filas **R/S/T VIP** con recargo del 30%.
- **Asignación automática de sala** y **30 minutos de limpieza** entre funciones: algoritmo en `FuncionesService.asignarSalaAutomatica`, reforzado con el constraint SQL `no_solapamiento_sala`.
- **Restricción de edad** (+13/+18) validada contra `fecha_nacimiento` antes de confirmar la compra.
- **Preventa** (7 días antes del estreno a precio promocional) y vuelta automática al precio normal.
- **Cancelación** hasta 2 horas antes de la función, acreditando **crédito a favor**.
- **Puntos** ($1 = 1 punto), canje por productos de Candy Bar o descuentos, y **cupones** (primera compra / mayores de 50).
- **QR único** por entrada y por pedido de Candy Bar, consumido una sola vez (`validarEntrada` / `validarPedido`).
- **Realtime**: el mapa de butacas se actualiza para todos los clientes conectados vía WebSockets (`postgres_changes`), con `removeChannel` en `ngOnDestroy` para evitar fugas de memoria.
- **Reportes**: facturación por día y ventas por película/formato, con exportación a **PDF** y **Excel**, y **Log de Actividad** (auditoría) de las acciones administrativas.

## Desarrollo (comandos originales de Angular CLI)

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
