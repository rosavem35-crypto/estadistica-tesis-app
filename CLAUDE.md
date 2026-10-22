# estadistica-tesis-app

MVP independiente de análisis estadístico asistido por IA para tesis y
artículos científicos en español (APA 7). Convierte una base de datos
(Excel/CSV) en tabla + figura + párrafo de resultados + justificación de
método, sin que el usuario necesite saber SPSS, Jamovi o R.

**Producto separado de `marco-teorico-app`** (mismo dueño, repos distintos):
se construye en paralelo para comparar cuál de los dos convierte mejor en
ventas antes de decidir en cuál invertir más.

## Stack

- Next.js 14 (App Router) + TypeScript estricto + Tailwind CSS 3 (`darkMode: 'media'`)
- Supabase: PostgreSQL con RLS, Auth (magic link + email/password) — proyecto
  propio, independiente del de Marco Teórico
- **Motor de cálculo: la herramienta de ejecución de código de Claude (code
  execution tool) + Skills API de Anthropic.** El skill Python
  `skill/estadistica-tesis-latam/` (estadística + redacción APA 7) se sube una
  sola vez vía `scripts/setup/upload-skill.ts`; cada análisis es una llamada a
  la Messages API con `container.skills` + el tool `code_execution`. **No hay
  microservicio Python propio ni port a TypeScript.**
- Hotmart: producto propio y separado del de Marco Teórico (ID, webhook y
  secreto distintos)

## Estado del proyecto

Construcción en progreso siguiendo las fases del plan en
`/root/.claude/plans/wild-sprouting-crystal.md`:

- [x] Fase 0 — scaffold de Next.js
- [~] Fase 1 — extender el skill con alfa de Cronbach, subirlo a la Skills API, probar el motor.
  Código del motor (Skills API + runAnalysis) listo; falta copiar el skill
  extendido al repo (`skill/estadistica-tesis-latam/`) y correr la prueba
  E2E real.
- [~] Fase 2 — UI de subir → perfilar → elegir análisis → resultados (sin auth/pagos).
  Código completo (migración, rutas API, páginas); sin verificar en vivo —
  falta un proyecto de Supabase propio para este producto.
- [ ] Fase 3 — auth + Hotmart + créditos
- [ ] Fase 4 — pulido: todos los tipos de análisis en la UI guiada

## Pendientes externos (solo el usuario puede hacerlos)

- [ ] Agregar `ANTHROPIC_API_KEY_ESTADISTICA` en la configuración de
      secretos del entorno (separada de la key de Marco Teórico).
- [ ] Crear un proyecto de Supabase nuevo (separado del de Marco Teórico)
      y correr `supabase/migrations/001_initial_schema.sql`; agregar
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
      `SUPABASE_SERVICE_ROLE_KEY` al entorno. Para la Fase 2 (sin auth)
      además hace falta sembrar a mano un usuario de desarrollo con id
      `00000000-0000-0000-0000-000000000001` (ver `lib/devUser.ts`) en
      `auth.users` y `public.users`.
- [ ] (Fase 3) Crear el producto nuevo en Hotmart y su webhook, separado
      del de Marco Teórico.

## Comandos

```bash
npm run dev         # desarrollo local
npm run build       # build de producción
npm test            # pruebas (tsx --test tests/*.test.ts)
npm run typecheck   # chequeo de tipos
```
