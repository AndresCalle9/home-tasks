## Why

La cuadrícula de 7 columnas del Calendario (una por día, con tarjetas de
tarea apiladas) no convence visualmente y es difícil de leer: con 7 columnas
angostas el ojo tiene que recorrer tarea por tarea para entender quién hace
qué. Organizar por persona dentro de cada día responde directamente a la
pregunta que la app busca resolver ("¿qué me toca hoy?" / "¿qué le toca a
cada quién?").

## What Changes

- Reemplazar la cuadrícula de 7 columnas por 7 elementos colapsables
  (acordeón vertical), uno por día de lunes a domingo.
- Colapsado por defecto: solo se ve el nombre del día.
- Solo un día expandido a la vez — expandir uno colapsa el que estuviera
  abierto.
- Al expandir un día, el contenido deja de ser una lista plana de tareas
  (tarea + persona) y pasa a agruparse **por persona**: cada integrante con
  responsabilidades ese día aparece como un encabezado, con sus tareas
  debajo.
- Aplicar de nuevo el skill `frontend-design` para la interacción de
  expandir/colapsar (animación, cómo se ve la lista agrupada por persona),
  manteniendo la identidad visual ya establecida (paleta "chore chart",
  colores por persona, tipografías Fredoka/Karla).

**BREAKING**: ninguno — sigue siendo una vista sobre datos mock
(`lib/mock-data.ts`), sin tocar Supabase ni el modelo de datos.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `calendar-view`: la requirement "Weekly Calendar Grid" cambia de una
  cuadrícula de 7 columnas a un acordeón de 7 días con contenido agrupado
  por persona al expandir.

## Impact

- Modifica `app/calendario/page.tsx`, `components/day-column.tsx`,
  `components/task-card.tsx` (se reemplazan o reestructuran para el nuevo
  layout).
- No modifica `lib/mock-data.ts` (los datos y su forma no cambian, solo cómo
  se agrupan/renderizan), ni `app/configuracion`, ni ningún archivo de
  `lib/data/`, `lib/supabase/`, o Server Actions.
- No introduce dependencias nuevas (se puede lograr con primitivos ya
  usados: shadcn `button`, clases de Tailwind, y estado de React para el
  acordeón).
