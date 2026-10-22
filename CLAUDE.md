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
- [ ] Fase 1 — extender el skill con alfa de Cronbach, subirlo a la Skills API, probar el motor
- [ ] Fase 2 — UI de subir → perfilar → elegir análisis → resultados (sin auth/pagos)
- [ ] Fase 3 — auth + Hotmart + créditos
- [ ] Fase 4 — pulido: todos los tipos de análisis en la UI guiada

## Comandos

```bash
npm run dev         # desarrollo local
npm run build       # build de producción
npm test            # pruebas (tsx --test tests/*.test.ts)
npm run typecheck   # chequeo de tipos
```
