# Home Tasks

App web **multi-tenant** para repartir las tareas del hogar entre los
integrantes de una familia: cualquier persona puede crear su propio hogar
(cuenta), y desde allí reparte la semana vigente bajo demanda (no
automático), con un calendario lunes-domingo, vista de equipo, y ajustes de
tareas/hogar — todo aislado por hogar.

> Notas históricas:
> - Una versión anterior giraba en torno a "periodos" (fecha inicio/fin,
>   tareas fijas/variables, ponderación por edad, balance histórico entre
>   periodos). La reescritura "app v2" (`7feaa65`) reemplazó ese modelo por
>   el descrito abajo: no hay periodos, historial de semanas pasadas,
>   distinción fija/variable, ni edad de los integrantes. Ver `BACKLOG.md`.
> - Hasta el change `multi-tenant-households`, la app era de un solo hogar
>   sin cuentas ("se entra directo"). Ese modelo ya no aplica — ver
>   "Autenticación y multi-tenancy" abajo.

## Alcance del producto

1. **Reparto de la semana vigente** (pestaña "Ajustes" → "🎲 Repartir
   nuestra semana")
   - El disparo es **manual**: no hay cron ni repartición automática. Un
     integrante presiona el botón, confirma la **clave de acciones de su
     hogar** (`household.action_password_hash`, hasheada en la base de
     datos — ya no una variable de entorno global) y el sorteo reemplaza
     por completo las filas de `assignments` de ese hogar — no existe
     historial de semanas anteriores, solo "la semana actual" de cada hogar.
   - El algoritmo (`lib/algorithm/schedule.ts`) es determinista dado un
     seed (se genera uno aleatorio en cada corrida). Para cada día de la
     semana y cada tarea activa que aplique ese día, elige entre los
     integrantes elegibles para esa tarea (`task_eligible_members`) al que
     tenga **menor carga acumulada** en lo que va de esa misma corrida
     (ponderada por `effort`: ligera/media/alta), rompiendo empates al azar
     vía el seed. Respeta `task_conflicts`: dos tareas que nunca deben caer
     el mismo día en la misma persona.
   - Cada tarea recibe **un solo responsable para todos los días en que
     aplica esa semana** (p.ej. quien cocina el desayuno lo hace todos los
     días que le tocan; no hay rotación día a día).
   - "Reiniciar semana" (también protegido por la clave) vuelve a marcar
     todas las asignaciones como pendientes sin re-sortear quién hace qué.
2. **Frecuencia por tarea** (`tasks.freq`, configurable en Ajustes):
   `diario` (todos los días), `dias` (un conjunto fijo de días específicos)
   o `semanal` (exactamente un día). No hay agrupación de tareas por mismo
   día ni frecuencia variable en "N veces por semana" editable por periodo —
   el patrón de días de cada tarea es fijo hasta que se edite en Ajustes.
3. **Calendario semanal** (pestaña "Semana"): vista lunes-domingo, con dos
   modos — por día (quién hace qué ese día) y por persona (qué le toca a
   cada quien cada día) — a partir de la tabla `assignments` vigente. Cada
   fila (task, day) tiene un `status` (pending/completed/sin-responsable)
   marcable desde la ficha de la tarea, sin restricción de quién lo marca
   ni clave.
4. **"Equipo"**: pestaña que lista los integrantes, cuántas tareas tiene
   cada uno esta semana y para cuántas es elegible; una ficha por
   integrante permite renombrarlo, marcar qué tareas puede hacer, o
   eliminarlo (bloqueado si sigue habilitado para alguna tarea).
5. **"Ajustes"**: nombre del hogar, catálogo de tareas (crear/editar/
   activar-desactivar/eliminar: nombre, icono, esfuerzo, frecuencia, días,
   integrantes elegibles), y los botones para repartir/reiniciar la semana.
6. **Reasignación manual y "duelo"** (desde la ficha de una tarea en Inicio
   o Semana):
   - Cambiar responsable: elegir otro integrante elegible para esa tarea;
     requiere la clave de acciones del hogar.
   - "Retar por intercambio" (duelo): solo para tu propia tarea de hoy;
     ofrece intercambiarla por otra tarea del mismo día y mismo nivel de
     esfuerzo que ya tenga otro integrante y para la que tú también seas
     elegible; se resuelve con un mini-juego de piedra/papel/tijera en el
     mismo dispositivo, y si gana quien reta, se intercambian los dos
     responsables. Esta acción **no** requiere la clave, a diferencia de
     la reasignación directa.

Fuera de alcance por ahora: múltiples cuentas/perfiles con permisos
distintos dentro de un mismo hogar (sigue siendo un solo login por hogar),
invitar a otra persona a un hogar existente, planes de pago, notificaciones
push, apps nativas, historial de semanas pasadas, asignación
automática/programada, tareas fijas/variables, ponderación por edad.

## Autenticación y multi-tenancy

- Cualquier persona puede crear una cuenta (**Supabase Auth**, correo +
  contraseña) y así crear su propio hogar; puede haber muchos hogares en el
  mismo despliegue, completamente aislados entre sí. Sigue sin haber
  cuentas por integrante: un solo login por hogar, y adentro cada
  integrante elige su perfil (selector estilo Netflix, recordado en el
  dispositivo, sin password) — eso no cambió.
- Toda página salvo `/login` y `/signup` requiere sesión (`middleware.ts`
  redirige si no hay una). `lib/auth/session.ts`'s `getCurrentHousehold()`
  resuelve el hogar de la sesión una vez por request (`React.cache`) y su
  `id` se pasa explícitamente a cada función de `lib/data/*.ts` — nunca
  como estado ambiente implícito.
- La clave de acciones (antes `SECURITY_PASSWORD`, variable de entorno
  única para todo el despliegue) ahora es **por hogar**: se define al
  crear la cuenta, vive hasheada (`scrypt`, ver `lib/security/password.ts`)
  en `household.action_password_hash`, y se puede cambiar desde Ajustes.
  Sigue gateando exactamente lo mismo: repartir/reiniciar la semana y
  reasignar manualmente el responsable de una tarea. Marcar como
  completada o resolver un duelo no la requiere.
- **El aislamiento entre hogares lo hace Postgres, no solo el código**: cada
  tabla de dominio tiene Row Level Security con policies reales basadas en
  `auth.uid()` (ver `supabase/schema.sql`), y `lib/data/*.ts` consulta con
  un cliente de Supabase autenticado como el usuario de la sesión
  (`lib/supabase/server-auth-client.ts`, anon key) — no con la service role
  key, que sigue existiendo pero solo para scripts de mantenimiento
  ejecutados a mano (esa key ignora RLS por completo). El filtrado
  explícito por `household_id` en el código es una capa adicional, no la
  única barrera.

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
- La **Supabase service role key** es de uso exclusivo de scripts de
  mantenimiento/migración ejecutados a mano — ningún código de la app en el
  camino de una request la importa (ignora RLS por completo). El anon key
  (`SUPABASE_ANON_KEY`) es el que usa la app en cada request, siempre
  server-side (Server Actions, `middleware.ts`, `lib/auth/session.ts`,
  `lib/data/*.ts`), nunca desde un componente `"use client"`. Ninguna de
  las dos debe:
  - exponerse al cliente,
  - usarse en un componente `"use client"`,
  - llevar el prefijo `NEXT_PUBLIC_` (ese prefijo es SOLO para valores no
    sensibles que realmente deban llegar al navegador).
- Row Level Security (RLS) habilitado en todas las tablas de Supabase, con
  **policies reales** basadas en `auth.uid()` (no solo habilitado sin
  policies) — es la barrera real de aislamiento multi-tenant, no un
  formalismo. El cliente nunca habla directo con Supabase — todo pasa por
  la capa de Next.js (Server Actions/Server Components), que sí habla con
  Supabase autenticado como el usuario de la sesión.
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

- `household`: un hogar/cuenta — `id` (uuid), `user_id` (1:1 con un usuario
  de `auth.users`), `name` (editable desde Ajustes), y
  `action_password_hash` (hasheada, gatilla las acciones destructivas).
- `members`: integrantes de un hogar (`household_id`, nombre, color de
  avatar/pill). Sin edad ni autenticación propia.
- `tasks`: catálogo de tareas de un hogar (`household_id`, nombre, icono,
  `effort`: ligera/media/alta, `freq`: diario/dias/semanal, `days` — días
  específicos cuando no es diaria —, `active`). El nombre es único por
  hogar, no globalmente.
- `task_eligible_members`: qué integrantes de un hogar pueden recibir cada
  tarea en el sorteo (también carga `household_id` directamente, para que
  su policy de RLS no necesite un join); la lotería solo elige entre
  quienes estén aquí.
- `task_conflicts`: pares de tareas de un hogar que nunca deben caer el
  mismo día en el mismo integrante (se respeta en el algoritmo, no en la
  base de datos; también carga `household_id` directamente).
- `assignments`: la semana vigente de un hogar — una fila por (task, day),
  con el integrante responsable (o `null` si nadie fue elegible) y su
  `status` (pending/completed/sin-responsable). "Repartir la semana" borra
  y reinserta las filas de ese hogar; no hay periodos ni historial de
  semanas pasadas.

Todas las tablas de dominio tienen Row Level Security con policies
basadas en `auth.uid()` (vía la función `household_id_for_current_user()`)
— ver `supabase/schema.sql` para el detalle de columnas, relaciones y
policies, y `supabase/seed.sql` / `supabase/migration_v3_multi_tenant.sql`
para los datos iniciales y la migración desde el modelo de un solo hogar.

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
