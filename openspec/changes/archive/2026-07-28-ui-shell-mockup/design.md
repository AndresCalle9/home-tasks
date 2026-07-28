## Context

El repo hoy solo tiene `openspec/`, `CLAUDE.md` y `supabase/` (schema + seed ya
aplicados en el proyecto real de Supabase). No existe todavía código de
aplicación ni `package.json`. Esta es la primera change de código del
proyecto: crea el scaffold de Next.js y la capa visual (shell) de las dos
pantallas principales, sin tocar Supabase ni el algoritmo de asignación.

## Goals / Non-Goals

**Goals:**
- Scaffoldear un proyecto Next.js (App Router, TypeScript, npm) listo para
  desplegar en Vercel.
- Layout raíz con navegación por pestañas entre **Calendario** y
  **Configuración**, con URLs propias por pestaña (no solo estado de cliente).
- Pantalla de Calendario: grilla lunes-domingo con datos mock, y el botón
  "Asignar tareas" como elemento visual (sin acción funcional).
- Pantalla de Configuración: listas de solo lectura (mock) de integrantes y
  tareas, reflejando la forma que tendrán los datos reales.
- Tipar los datos mock 1:1 con las columnas de `supabase/schema.sql` para que
  la siguiente change (fetch real) solo cambie el origen de los datos, no la
  forma de los componentes.
- Estética minimalista y moderna (usar el skill `frontend-design` para
  decisiones de tipografía/dirección visual durante la implementación).

**Non-Goals:**
- Ninguna llamada a Supabase ni variable de entorno consumida en esta change.
- Ninguna API route / server action.
- El botón "Asignar tareas" no dispara ningún flujo (ni de definición de
  periodo, ni de sorteo); es solo un elemento visual de la pestaña Calendario.
- No hay CRUD real (crear/editar/eliminar) en Configuración, solo lectura mock.
- No hay selector de perfil / identidad de usuario todavía.

## Decisions

- **TypeScript sobre JavaScript**: permite tipar los mocks calcando las
  columnas de `members`/`tasks`/`assignments` (`supabase/schema.sql`), lo que
  reduce el diff cuando se reemplace el mock por datos reales. Alternativa
  descartada: JS plano, más rápido de arrancar pero sin ese contrato de tipos.
- **Rutas por pestaña (`/calendario`, `/configuracion`) en vez de tabs con
  estado de cliente**: cada pantalla es una URL navegable/compartible y se
  puede recargar directo en ella; encaja mejor con Server Components (cada
  pestaña puede ser un Server Component que en la próxima change hace fetch
  real sin reestructurar). `/` redirige a `/calendario`. Alternativa
  descartada: un solo client component con `useState` para la pestaña activa —
  más simple pero pierde URLs propias y fuerza "use client" en todo el shell.
- **Tailwind CSS + shadcn/ui** para estilos y primitivos (botón, tabs, card):
  iteración rápida de un look minimalista/moderno sin escribir un design
  system propio, y sin dependencia de runtime (shadcn copia el código al
  repo). Alternativa descartada: CSS Modules a mano — más control pero más
  lento para esta etapa de mockup.
- **Mocks en `lib/mock-data.ts`** con tipos `Member`, `Task`, `Assignment` que
  reflejan las columnas reales (`name`, `age`, `is_daily`, `default_is_fixed`,
  etc.), en vez de datos ad-hoc por componente. Evita divergencia de forma
  entre pantallas y facilita el swap a fetch real después.
- **npm** como package manager (ya definido en `CLAUDE.md`).

## Risks / Trade-offs

- [Elegir shadcn/ui añade una dependencia de estilo/estructura de componentes]
  → Mitigación: son componentes copiados al repo (no runtime dependency
  oculta), fáciles de ajustar o quitar si no encajan con el rumbo visual.
- [Tipar mocks igual al schema de Supabase podría quedar desalineado si el
  schema cambia antes de la próxima change] → Mitigación: los tipos viven en
  un solo archivo (`lib/mock-data.ts`), fácil de actualizar; no hay lógica de
  negocio real que dependa de ellos todavía.
- [Rutas separadas por pestaña sin sesión/usuario podrían sentirse "vacías"
  sin selector de perfil] → Aceptado como no-goal explícito de esta change;
  se resuelve en una change posterior de selección de perfil.
