# Home Tasks

App web para repartir las tareas del hogar entre los integrantes de una sola
familia: asignación de tareas por periodo (bajo demanda, no automática) y un
calendario visual de lunes a domingo.

## Alcance del producto

1. **Asignación de tareas por periodo**
   - El disparo es **manual**: no hay cron ni asignación automática semanal.
     Un integrante presiona un botón "Asignar tareas", define el periodo
     (fecha inicio/fin) y solo entonces se ejecuta la asignación.
   - Antes de asignar, el flujo debe mostrar la lista completa de tareas para
     ese periodo con su estado **fija/variable** editable (pre-cargado desde
     el valor por defecto de cada tarea, pero modificable para ese periodo
     puntual — ej. reasignar temporalmente a quién le toca una tarea fija).
   - **Tareas fijas**: se definen uno o más integrantes habilitados (para ese
     periodo); a la hora del sorteo, le toca a quien de esos habilitados
     tenga menos carga acumulada en ese momento (empate se rompe al azar).
     Nunca entran al sorteo general de variables ni afectan el balance
     histórico entre periodos, pero sí cuentan hacia la carga inicial de
     quien la gane al balancear las tareas variables de ese mismo periodo
     (para que quien ya tiene varias fijas no termine además con la mayor
     carga variable).
   - **Tareas variables**: se reparten de forma aleatoria pero ponderada por
     edad (adultos > menores) y por la carga acumulada en periodos anteriores
     (quien ha tenido menos carga tiene más probabilidad de recibir tareas).
   - Cada tarea variable recibe **una sola persona asignada para todo el
     periodo** (p.ej. quien cocina el desayuno lo hace todos los días del
     periodo; no hay rotación día a día dentro de un mismo periodo).
   - Las tareas "puntuales" (barrer, trapear, lavar ropa, etc., en
     contraste con las diarias) tienen una **frecuencia configurable por
     tarea** (veces por semana, de 1 a 7; ej. lavar el baño 1 vez, sacar la
     basura 3-4 veces) y reciben esa cantidad de **días específicos** del
     periodo como parte del sorteo, para que el calendario quede completo.
     Tareas relacionadas (ej. lavar y extender ropa) pueden agruparse para
     que siempre caigan en los mismos días — deben compartir la misma
     frecuencia. Una tarea con frecuencia de 1 vez por semana (y sin grupo
     de día) puede además editarse manualmente desde el Calendario para
     escoger a qué día cae, en vez del día que salió del sorteo.
   - El algoritmo debe ser determinista dado un seed, para poder testearlo.
2. **Calendario semanal**: vista lunes-domingo con la tarea y el responsable de
   cada día, a partir del resultado de la asignación del periodo vigente.
   Cada tarea de cada día tiene un checkbox de completado, independiente
   por día (incluso para una tarea diaria, que solo tiene una asignación de
   fondo pero se marca día por día), sin restricción de quién lo marca.
3. **Gestión (CRUD)**: pestaña para crear, editar y eliminar tareas e
   integrantes (nombre, edad, si la tarea es fija por defecto y de
   quién/quiénes — una tarea fija puede tener uno o más responsables
   habilitados).

Fuera de alcance por ahora: multi-hogar, login con contraseña para entrar a
la app, notificaciones push, apps nativas, asignación automática/programada.
Un solo hogar, sin cuentas: se entra directo y cada integrante elige su
perfil (selector estilo Netflix), sin passwords para eso. La única excepción
es una clave compartida (`SECURITY_PASSWORD`, variable de entorno
server-side) que protege específicamente las acciones que cambian el
resultado de un periodo ya sorteado: correr o repetir el sorteo, y
reasignar manualmente el responsable o el día de una tarea desde el
Calendario. Marcar una tarea como completada no requiere esa clave.

## Stack técnico

- **Next.js (App Router)**, desplegado en **Vercel**.
- Sin backend dedicado: toda la lógica (asignación, balance, consultas) vive
  en la capa de API de Next.js (route handlers / server actions). El cliente
  no implementa lógica de negocio.
- **Supabase** (Postgres) como base de datos. Schema y seed inicial en
  `supabase/schema.sql` y `supabase/seed.sql`.
- Package manager: **npm**.

## Seguridad (mínimos no negociables)

- **Nunca** hardcodear API keys, tokens, URLs con credenciales, ni ningún
  secreto directamente en el código fuente.
- **Nunca** commitear archivos `.env`, `.env.local` ni ningún archivo con
  valores reales de credenciales (ya cubierto por `.gitignore`; verificar con
  `git status`/`git diff` antes de cualquier commit).
- Toda credencial vive en variables de entorno, cargadas server-side. Usar
  `.env.example` (sin valores reales) como referencia de qué variables se
  necesitan.
- La **Supabase service role key** (cuando se agregue) es de uso exclusivo del
  servidor (route handlers / server actions). Nunca debe:
  - exponerse al cliente,
  - usarse en un componente `"use client"`,
  - llevar el prefijo `NEXT_PUBLIC_` (ese prefijo es SOLO para valores no
    sensibles que realmente deban llegar al navegador).
- Row Level Security (RLS) habilitado en todas las tablas de Supabase; sin
  autenticación de usuario, el acceso del cliente no debe ir directo a
  Supabase — todo pasa por la capa de API de Next.js usando la service role
  key server-side.
- No loguear (`console.log`, etc.) tokens, keys ni el contenido completo de
  variables de entorno.
- Validar/sanitizar cualquier input que llegue a una query (usar el cliente
  de Supabase parametrizado, no concatenar SQL a mano).

## Convenciones

- UI e interfaz de usuario en **español**.
- Código, nombres de variables/funciones, comentarios y mensajes de commit en
  **inglés**.
- Antes de escribir o revisar componentes de React/Next.js, aplicar el skill
  `vercel-react-best-practices`.

## Modelo de dominio (referencia)

- `members`: integrantes del hogar (nombre, edad).
- `tasks`: catálogo de tareas (nombre, si es diaria, si es fija por defecto y
  de quién/quiénes — vía `task_default_fixed_members` —, peso/dificultad
  opcional).
- `periods`: cada ciclo de asignación definido manualmente (fecha inicio/fin,
  estado).
- `period_task_settings`: snapshot editable, por periodo, de qué tareas son
  fijas y de quién/quiénes — vía `period_task_setting_fixed_members` —
  (parte del "antes de asignar").
- `assignments`: resultado final de la asignación de un periodo — qué tarea le
  tocó a quién (y qué día, para las tareas de una vez por periodo). También es
  la fuente para calcular el balance de carga acumulado.
- `assignment_completions`: si cada tarea asignada, por día, ya se hizo.

Ver `supabase/schema.sql` para el detalle de columnas y relaciones, y
`supabase/seed.sql` para los datos iniciales de integrantes y tareas.

## Flujo de trabajo: OpenSpec

Este repo usa OpenSpec (`schema: spec-driven` en `openspec/config.yaml`) para
todo cambio no trivial. Antes de implementar una función nueva o un cambio de
alcance medio/grande:

1. `/opsx:propose` — describir el cambio y generar proposal/design/tasks.
2. `/opsx:apply` — implementar las tasks del change.
3. `/opsx:archive` — archivar el change y sincronizar specs una vez mergeado.

El `context` y las `rules` de `openspec/config.yaml` ya describen el dominio y
las reglas de negocio de la asignación — no hace falta repetirlas en cada
proposal, pero sí respetarlas al diseñar el modelo de datos y el algoritmo.

Para cambios triviales (typo, ajuste de estilo, config menor) no es necesario
pasar por OpenSpec.
