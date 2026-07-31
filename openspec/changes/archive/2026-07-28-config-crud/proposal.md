## Why

La pestaña Configuración hoy solo muestra datos mock estáticos (ver
`ui-shell-mockup`, ya archivado). Antes de construir el algoritmo de
asignación necesitamos que integrantes y tareas vivan de verdad en Supabase y
se puedan mantener desde la app — hoy la única forma de editar el catálogo es
corriendo SQL a mano contra la base de datos.

## What Changes

- Cliente de Supabase server-side (usa `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` de `.env`; nunca se expone al cliente ni lleva
  prefijo `NEXT_PUBLIC_`), y una capa de acceso a datos mínima para
  `members` y `tasks`, usada solo desde Server Components / Server Actions.
- Server Actions para crear, editar y eliminar integrantes y tareas, con
  revalidación de la pantalla de Configuración tras cada mutación.
- La pestaña Configuración pasa de leer `lib/mock-data.ts` a leer los datos
  reales de Supabase.
- UI: puntos de entrada "Nuevo integrante" / "Nueva tarea" (diálogo o
  formulario inline) y acciones de editar/eliminar por fila, reusando los
  componentes shadcn/ui ya instalados (Dialog, Button, Badge, Card) más los
  primitivos nuevos que hagan falta (input, select, alert-dialog de
  confirmación de borrado).
- Validación de las reglas ya existentes en `supabase/schema.sql` (nombre
  requerido/único, edad ≥ 0, una tarea fija debe tener integrante fijo),
  tanto en el formulario como al recibir el error de Postgres, mostrando un
  mensaje amigable en vez de un crash.

**BREAKING**: ninguno — es la primera vez que Configuración toca datos
reales; no hay usuarios ni integraciones previas que dependan del
comportamiento mock.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `task-config-view`: pasa de mostrar listas de solo lectura (mock) a
  soportar creación, edición y eliminación real de integrantes y tareas
  contra Supabase.

## Impact

- Nueva dependencia: cliente de Supabase (`@supabase/supabase-js`).
- Nuevos archivos: cliente server-side de Supabase, capa de acceso a datos
  (members/tasks), Server Actions de mutación, componentes de formulario y
  confirmación de borrado.
- Modifica `app/configuracion/page.tsx` y los componentes que hoy leen
  `lib/mock-data.ts` para esa pantalla (`components/member-chip.tsx`,
  `components/task-row.tsx`).
- No modifica `app/calendario`, `components/day-column.tsx`,
  `components/task-card.tsx`, ni el arreglo `assignments` de
  `lib/mock-data.ts` — el Calendario sigue mockeado hasta que exista el
  algoritmo de asignación.
- No incluye login/autenticación ni el algoritmo de sorteo.
