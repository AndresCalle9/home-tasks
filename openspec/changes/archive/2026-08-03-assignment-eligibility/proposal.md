## Why

El sorteo actual pondera por edad pero nunca excluye a nadie de una tarea
puntual: solo baja la probabilidad. Eso significa que, por puro azar, un
menor podría terminar asignado a cocinar (inseguro/inapropiado), y que un
integrante de baja probabilidad podría quedar sin ninguna tarea variable en
un periodo completo. Ambos son huecos reales en la justicia del sorteo, no
solo detalles cosméticos.

## What Changes

- Cada tarea gana un campo opcional **edad mínima** (`min_age`). Si está
  definido, esa tarea nunca se sortea para un integrante por debajo de esa
  edad — no es solo un peso más bajo, es una exclusión dura.
- El formulario de tareas en Configuración expone ese campo (opcional, en
  blanco = sin restricción).
- El sorteo garantiza un **mínimo de una tarea variable por integrante
  activo**: si tras la ponderación normal alguien queda en cero, se le
  transfiere una tarea (de las que sí puede hacer) desde quien tenga más
  carga acumulada en ese momento, en vez de dejarlo así por azar.
- Si ningún integrante cumple la edad mínima de una tarea (caso límite, ej.
  hogar sin adultos), se asigna al integrante de mayor edad disponible en
  vez de fallar.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `period-assignment`: la requirement "Run the Weighted Assignment
  Algorithm" gana exclusión por edad mínima y el piso mínimo de una tarea
  por integrante.
- `task-config-view`: las requirements de tareas ganan el campo opcional
  `min_age` en creación/edición.

## Impact

- Migración: `tasks` necesita la columna `min_age` (nullable, sin
  restricción por defecto).
- Modifica `lib/algorithm/assign.ts` (y su test suite), `lib/data/tasks.ts`,
  `components/task-form-dialog.tsx`, `components/task-row.tsx`.
- No modifica `app/configuracion`'s manejo de integrantes, ni
  `lib/data/members.ts`, ni `lib/data/periods.ts`.
- No decide qué edad mínima ponerle a "Cocinar X" para este hogar en
  particular — eso lo define el usuario desde Configuración una vez exista
  el campo.
