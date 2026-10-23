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
  Verificada en vivo a nivel API (login real, `POST /api/analisis/subir`,
  `POST .../perfil`, `POST .../ejecutar`, `GET /api/analisis/[id]` con URLs
  firmadas de Storage que descargan el informe real) contra el proyecto de
  Supabase correcto (`qfybuexqwljitubgysjk`, ver nota de red más abajo). Las
  páginas (`/subir`, `/iniciar-sesion`, etc.) renderizan y compilan bien,
  pero la navegación completa en navegador a las rutas protegidas no se pudo
  probar en *esta sesión de nube* por una limitación del sandbox, no de la
  app — ver "Nota: dev local en este contenedor" abajo.
- [x] Fase 3 — auth (magic link + contraseña, invite-only), migración
  `002_hardening.sql` (REVOKE UPDATE + `add_credits_used()` SECURITY
  DEFINER), webhook de Hotmart (`lib/hotmart/process.ts`, función pura
  testeada con deps falsos), `requireUser()` ya wireado en todas las rutas
  de `analisis` (reemplazó `lib/devUser.ts`, que se eliminó). Verificado en
  vivo: login con contraseña, `requireUser()` rechaza sin sesión (401) y
  acepta con sesión + `active_until` vigente, `add_credits_used()` descontó
  1 crédito correctamente tras un análisis real. Falta solo el producto de
  Hotmart real (ver pendientes externos).
- [~] Fase 4 — pulido: el árbol de decisión (`lib/engine/decisionTree.ts`)
  y el formulario genérico (`app/subir/[id]/elegir/page.tsx`) ya cubren los
  12 tipos de análisis del skill (incluida confiabilidad). Queda como
  mejora, no como bloqueo: formularios dedicados por tipo (en vez del
  formulario genérico), página de historial, observabilidad de costo.

## Pendientes externos (solo el usuario puede hacerlos)

- [x] Agregar `ANTHROPIC_API_KEY_ESTADISTICA` y `ANTHROPIC_SKILL_ID` en la
      configuración de secretos del entorno. Verificado en vivo (Fase 1d).
- [x] Proyecto de Supabase creado y migraciones corridas en vivo
      (`001_initial_schema.sql` + `002_hardening.sql`) contra el proyecto
      **correcto**: `estadistica-tesis-app`, ref `qfybuexqwljitubgysjk`.
      **IMPORTANTE:** la cuenta tiene además otro proyecto sin nombre
      (ref `fqygmsygyddkfyevzday`, "rosavem35-crypto's Project") — las
      variables de entorno del entorno de nube (`NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) apuntan
      a ese proyecto equivocado, no al correcto. **Falta que el usuario
      actualice esas tres variables en la configuración de secretos del
      entorno** con los valores del proyecto `qfybuexqwljitubgysjk`
      (pedírselos de nuevo o sacarlos del dashboard de Supabase →
      Project Settings → API). Hasta que eso se corrija, cualquier sesión
      nueva seguirá apuntando al proyecto equivocado por defecto.
- [ ] Crear el producto nuevo en Hotmart y su webhook (separado del de
      Marco Teórico); agregar `HOTMART_WEBHOOK_SECRET` y, si se vende un
      plan "pro", `HOTMART_PRO_PRODUCT_IDS`.
- [ ] Confirmar los números de créditos por plan en `lib/hotmart/planes.ts`
      (`basico: 20`, `pro: 60` son un placeholder de arranque, no una
      decisión de negocio confirmada).

## Nota: dev local en este contenedor (sandbox de Claude Code en la nube)

Esto es específico de correr `npm run dev` **dentro de una sesión de nube**
con la política de red restringida a dominios permitidos — no aplica a un
deploy real (Vercel) ni a desarrollo en la máquina del usuario:

- El `fetch` nativo de Node no respeta `HTTPS_PROXY` por default. Hay que
  arrancar el server con `NODE_USE_ENV_PROXY=1` (Node ≥22.21), si no,
  cualquier llamada server-side a Supabase (`requireUser()`, el middleware)
  falla con `fetch failed` aunque las credenciales sean correctas.
- El Edge Runtime de Next.js (donde corre `middleware.ts`) parece no heredar
  el proxy ni con esa variable — la navegación del navegador a rutas
  protegidas (`/subir`, `/analisis/[id]`, etc.) se queda redirigiendo a
  `/iniciar-sesion` aunque la sesión sea válida. Las rutas de API bajo
  `/api/analisis/*` (Node.js runtime, no Edge) sí funcionan bien — por ahí
  se verificó el flujo completo esta vez. Si hace falta verificar la UI
  renderizada de punta a punta dentro de una sesión de nube, revisar esto
  primero (podría necesitar el flag experimental `nodeMiddleware` de
  Next.js, o probarlo en un entorno con red sin restricciones).

## Comandos

```bash
npm run dev         # desarrollo local
npm run build       # build de producción
npm test            # pruebas (tsx --test tests/*.test.ts)
npm run typecheck   # chequeo de tipos
```
