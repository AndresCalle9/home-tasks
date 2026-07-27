# Home Tasks

App web para repartir las tareas del hogar entre los integrantes de una sola
familia: sorteo semanal de tareas y un calendario visual de lunes a domingo.

## Alcance del producto

1. **Sorteo semanal de tareas**
   - Tareas **fijas**: siempre las hace la misma persona; no entran al sorteo ni
     al cálculo de balance de carga.
   - Tareas **rotativas**: se reparten cada semana de forma aleatoria pero
     ponderada por edad (adultos > niños/adolescentes) y por la carga acumulada
     en semanas anteriores (quien ha tenido menos carga tiene más probabilidad
     de recibir tareas).
   - El algoritmo debe ser determinista dado un seed, para poder testearlo.
2. **Calendario semanal**: vista lunes-domingo con la tarea y el responsable de
   cada día.

Fuera de alcance por ahora: multi-hogar, login con contraseña, notificaciones
push, apps nativas. Un solo hogar, sin cuentas: se entra directo y cada
integrante elige su perfil (selector estilo Netflix), sin passwords.

## Stack técnico

- **Next.js (App Router)**, desplegado en **Vercel**.
- Sin backend dedicado: toda la lógica (sorteo, balance, consultas) vive en la
  capa de API de Next.js (route handlers / server actions). El cliente no
  implementa lógica de negocio.
- **Supabase** (Postgres) como base de datos. Credenciales en `.env`
  (ya está en `.gitignore`, nunca commitear valores reales).
- Package manager: **npm**.

## Convenciones

- UI e interfaz de usuario en **español**.
- Código, nombres de variables/funciones, comentarios y mensajes de commit en
  **inglés**.
- Antes de escribir o revisar componentes de React/Next.js, aplicar el skill
  `vercel-react-best-practices`.

## Modelo de dominio (referencia)

- `members`: integrantes del hogar (nombre, edad, avatar opcional).
- `tasks`: catálogo de tareas (nombre, si es fija y de quién, frecuencia/día
  esperado, peso o dificultad opcional).
- `assignments`: histórico de qué tarea le tocó a quién, en qué semana/día
  (se usa también para calcular el balance acumulado del sorteo).

## Flujo de trabajo: OpenSpec

Este repo usa OpenSpec (`schema: spec-driven` en `openspec/config.yaml`) para
todo cambio no trivial. Antes de implementar una función nueva o un cambio de
alcance medio/grande:

1. `/opsx:propose` — describir el cambio y generar proposal/design/tasks.
2. `/opsx:apply` — implementar las tasks del change.
3. `/opsx:archive` — archivar el change y sincronizar specs una vez mergeado.

El `context` y las `rules` de `openspec/config.yaml` ya describen el dominio y
las reglas de negocio del sorteo — no hace falta repetirlas en cada proposal,
pero sí respetarlas al diseñar el modelo de datos y el algoritmo.

Para cambios triviales (typo, ajuste de estilo, config menor) no es necesario
pasar por OpenSpec.
