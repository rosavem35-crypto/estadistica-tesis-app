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
- [x] Fase 1 — skill extendido con alfa de Cronbach (`confiabilidad_escala`,
  45/45 pruebas en verde contra pingouin), copiado a `skill/estadistica-tesis-latam/`.
  Fase 1d verificada en vivo: `scripts/setup/test-e2e-analysis.ts` corrió
  `confiabilidad_escala` y `comparar_grupos` contra la API real de Anthropic
  (container.skills + code_execution), con narrativa APA 7, tablas, figura y
  `.docx`/`.xlsx` generados correctamente.
- [x] Fase 2 — UI de subir → perfilar → elegir análisis → resultados.
  Código completo; sin verificar en vivo todavía (falta un proyecto de
  Supabase propio).
- [x] Fase 3 — auth (magic link + contraseña, invite-only), migración
  `002_hardening.sql` (REVOKE UPDATE + `add_credits_used()` SECURITY
  DEFINER), webhook de Hotmart (`lib/hotmart/process.ts`, función pura
  testeada con deps falsos), `requireUser()` ya wireado en todas las rutas
  de `analisis` (reemplazó `lib/devUser.ts`, que se eliminó). Sin verificar
  en vivo — falta el proyecto de Supabase y el producto de Hotmart reales.
- [~] Fase 4 — pulido: el árbol de decisión (`lib/engine/decisionTree.ts`)
  y el formulario genérico (`app/subir/[id]/elegir/page.tsx`) ya cubren los
  12 tipos de análisis del skill (incluida confiabilidad). Queda como
  mejora, no como bloqueo: formularios dedicados por tipo (en vez del
  formulario genérico), página de historial, observabilidad de costo.

## Pendientes externos (solo el usuario puede hacerlos)

- [x] Agregar `ANTHROPIC_API_KEY_ESTADISTICA` y `ANTHROPIC_SKILL_ID` en la
      configuración de secretos del entorno. Verificado en vivo (Fase 1d).
- [ ] Las credenciales de Supabase (`NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) ya están
      en el entorno, pero **el host `*.supabase.co` está bloqueado por la
      política de red de este entorno de nube** — no se pudo ejecutar ni
      verificar nada contra Supabase (ver nota abajo). Falta además: correr
      `supabase/migrations/001_initial_schema.sql` y `002_hardening.sql`
      (no alcanza con las tres variables de arriba — hace falta la
      contraseña de la base de datos o un access token de Supabase para
      correr las migraciones; sino, correrlas a mano desde el SQL Editor
      del proyecto). **Bloquea la verificación en vivo de las Fases 2 y 3.**
- [ ] Crear el producto nuevo en Hotmart y su webhook (separado del de
      Marco Teórico); agregar `HOTMART_WEBHOOK_SECRET` y, si se vende un
      plan "pro", `HOTMART_PRO_PRODUCT_IDS`.
- [ ] Confirmar los números de créditos por plan en `lib/hotmart/planes.ts`
      (`basico: 20`, `pro: 60` son un placeholder de arranque, no una
      decisión de negocio confirmada).

## Comandos

```bash
npm run dev         # desarrollo local
npm run build       # build de producción
npm test            # pruebas (tsx --test tests/*.test.ts)
npm run typecheck   # chequeo de tipos
```
