## Why

Hoy el botón "Asignar tareas" en Calendario es un placeholder que no hace
nada, y Calendario muestra datos inventados de `lib/mock-data.ts`. Esta es la
función central del producto: repartir las tareas variables de forma
aleatoria pero justa (ponderada por edad y por carga acumulada), respetando
las tareas fijas, para un periodo que el usuario define manualmente.

## What Changes

- **Definir periodo**: un flujo nuevo en `/calendario/asignar` donde se
  elige la fecha de inicio (un lunes; el fin se calcula automáticamente como
  el domingo siguiente, para calzar con el calendario semanal ya existente).
- **Revisar fijas/variables**: antes de sortear, se muestra la lista
  completa de tareas (pre-cargada desde el valor por defecto de cada tarea)
  con su estado fija/variable editable para ese periodo puntual, y de quién
  si es fija.
- **Algoritmo de asignación** (determinista dado un seed):
  - Las tareas fijas se asignan directamente a quien se definió en la
    revisión; no entran al sorteo ni al cálculo de balance.
  - Las tareas variables se reparten con una lotería ponderada por: peso por
    edad (niño/adolescente/adulto) y por la carga acumulada de cada
    integrante en periodos anteriores ya asignados (a menor carga, mayor
    probabilidad).
  - Cada tarea variable recibe una sola persona para todo el periodo.
  - Las tareas "de una vez por periodo" (fijas o variables) también reciben
    un día específico (lunes-domingo) como parte del sorteo.
- **Re-sortear**: si el resultado no convence, se puede volver a correr el
  sorteo para el mismo periodo (misma configuración de fijas/variables,
  semilla nueva), sin tener que redefinir el periodo.
- **Conectar Calendario a datos reales**: Calendario deja de leer
  `lib/mock-data.ts` y muestra el periodo vigente (el más reciente con
  estado `assigned`) desde Supabase. Si todavía no se ha asignado ningún
  periodo, se muestra un estado vacío invitando a usar "Asignar tareas".

## Capabilities

### New Capabilities
- `period-assignment`: definir un periodo, revisar/editar qué tareas son
  fijas y de quién, correr el sorteo ponderado por edad y carga acumulada, y
  poder re-sortear el mismo periodo.

### Modified Capabilities
- `calendar-view`: Calendario pasa de mostrar datos mock a mostrar el
  periodo vigente real desde Supabase (o un estado vacío si no hay
  ninguno), y el botón "Asignar tareas" deja de ser un placeholder: navega
  al flujo de `period-assignment`.

## Impact

- Requiere una migración pequeña: `periods` necesita una columna `seed`
  (para que "volver a sortear" sea determinista pero distinto cada vez).
- Nuevos archivos: el algoritmo puro (`lib/algorithm/`), capa de datos para
  `periods`/`assignments` (`lib/data/periods.ts`, `lib/data/assignments.ts`),
  Server Actions, y la UI del flujo en `app/calendario/asignar/`.
- Modifica `app/calendario/page.tsx` (deja de usar `lib/mock-data.ts`) y el
  componente del botón (`components/assign-button.tsx` se reemplaza por un
  link real).
- No modifica `app/configuracion` ni sus Server Actions existentes (sí
  reutiliza `lib/data/members.ts` y `lib/data/tasks.ts` para leer el
  catálogo).
- `lib/mock-data.ts` deja de usarse en `app/calendario` pero no se borra en
  este change (podría quedar huérfano; se limpia si nada más lo referencia).
