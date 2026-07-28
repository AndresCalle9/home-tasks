## Why

Antes de conectar Supabase y el algoritmo de asignación, necesitamos validar la
estructura visual y de navegación de la app: un shell minimalista y moderno con
las dos pantallas principales (calendario semanal y configuración) para poder
iterar el diseño rápido, sin acoplarlo todavía a datos reales ni lógica de
negocio.

## What Changes

- Scaffold del proyecto Next.js (App Router, npm) desplegable en Vercel — aún
  no existe `package.json` en el repo.
- Layout de la app con navegación por pestañas: **Calendario** y
  **Configuración**.
- Pestaña **Calendario**: grilla semanal lunes-domingo mostrando tarea +
  responsable por día, con datos mock estáticos (sin fetch a Supabase). Incluye
  el botón **"Asignar tareas"** visible, en estado no funcional (placeholder /
  disabled o abre un modal vacío) — sin lógica de sorteo ni de definición de
  periodo todavía.
- Pestaña **Configuración**: listas de solo lectura de integrantes y tareas
  (con su estado fija/variable), con datos mock estáticos que simulan lo que
  luego serán lecturas (GET) reales a `members` y `tasks` — sin crear/editar/
  eliminar todavía.
- Sin llamadas a Supabase, sin API routes, sin algoritmo de asignación. Todo el
  estado es mock/estático en el cliente.

## Capabilities

### New Capabilities
- `calendar-view`: pantalla de calendario semanal (lunes-domingo) con datos
  mock y el botón "Asignar tareas" como elemento visual del shell.
- `task-config-view`: pantalla de configuración con listas de solo lectura
  (mock) de integrantes y tareas, como shell visual para la futura gestión CRUD.

### Modified Capabilities
(ninguna — no existen specs previos)

## Impact

- Crea el proyecto Next.js base (`package.json`, `app/`, configuración de
  Vercel) que no existía en el repo.
- Nuevos archivos de UI: layout raíz con navegación por pestañas, página de
  Calendario, página de Configuración, datos mock (fixtures) para ambas.
- No toca `supabase/schema.sql`, `.env`, ni agrega dependencias de Supabase en
  esta etapa.
- Sienta la base de diseño (tema, tipografía, componentes) que las siguientes
  changes (algoritmo de asignación, CRUD real, conexión a Supabase)
  extenderán sin rehacer la UI.
