## Why

En uso real el sorteo quedó muy desbalanceado (un integrante con 7 tareas,
otro con 2). La causa es que dos mecanismos de "peso" se combinaban y se
reforzaban entre sí: el peso por dificultad de la tarea (acumulado como
carga) y el peso por edad (adultos con probabilidad ~5x mayor que un niño
en cada sorteo). El resultado es difícil de predecir y de explicar. Se
simplifica a un solo mecanismo de balance, transparente: contar cuántas
tareas tiene cada quien, y usar la edad únicamente como restricción dura
(qué tareas puede o no hacer alguien), no como probabilidad.

## What Changes

- El sorteo deja de ponderar por edad (adultos ya no tienen más
  probabilidad "de fábrica" que un menor elegible). La edad solo sigue
  actuando como restricción dura vía `min_age` (quién puede o no hacer una
  tarea).
- El balance deja de basarse en el peso/dificultad acumulado de las tareas
  y pasa a basarse únicamente en el **número de tareas** que cada
  integrante ya tiene (en el periodo actual y en periodos anteriores
  asignados).
- **BREAKING**: se elimina la columna `tasks.weight` de la base de datos —
  ya no existe el concepto de "peso/dificultad" de una tarea. Se elimina
  del CRUD de tareas en Configuración.
- Se corre un script de datos que le pone una edad mínima por defecto a
  cada tarea: 10 años a todas, excepto las 3 tareas de "Cocinar" (Desayuno,
  Almuerzo, Cena), que quedan en 14.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `period-assignment`: la requirement "Run the Weighted Assignment
  Algorithm" se reescribe — balance por conteo de tareas, sin ponderación
  por edad, edad solo como filtro de elegibilidad.
- `task-config-view`: la requirement "Read-Only Tasks List" pierde el
  campo `weight`/"peso" del CRUD de tareas.

## Impact

- Migración: `alter table tasks drop column weight;` (sin dependencias de
  otras tablas — `weight` no es referenciada por foreign keys).
- Script de datos: define `min_age` por defecto (10, o 14 para "Cocinar
  X") en las tareas existentes.
- Modifica `lib/algorithm/assign.ts` (y sus tests), `lib/data/tasks.ts`,
  `lib/data/assignments.ts`, `app/configuracion/actions.ts`,
  `components/task-form-dialog.tsx`, `components/task-row.tsx`,
  `supabase/schema.sql`, `supabase/seed.sql`.
- No modifica `app/calendario`'s UI de acordeón/agrupación por persona, ni
  `lib/data/periods.ts`, ni `app/configuracion`'s manejo de integrantes.
