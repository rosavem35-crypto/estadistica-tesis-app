---
name: estadistica-tesis-latam
description: Análisis estadístico para tesis y artículos científicos en español (APA 7). Úsala cuando el usuario quiera analizar sus datos, elegir o aplicar t de Student, Mann-Whitney, ANOVA, Kruskal-Wallis, correlación, chi cuadrado, regresión lineal o logística, confiabilidad de una escala (alfa de Cronbach), calcular tamaño de muestra o potencia, o redactar resultados y justificación del método, y mencione SPSS, Jamovi, R o "no sé qué prueba usar". No cubre validación de instrumentos más allá de la confiabilidad (AFE, AFC, validez).
---

# Estadística para tesis (Latinoamérica) — v1.0

Esta skill convierte una base de datos (Excel, CSV o SPSS .sav) en **tabla APA 7 + figura + párrafo de resultados + justificación para el capítulo de método**, todo en español, listo para pegar en una tesis o artículo. Está pensada para quien no domina SPSS, Jamovi o RStudio.

**Principio rector: diagnosticar antes de analizar.** Primero se describe y se perfila la base, luego se comprueban los supuestos, y solo entonces el script elige la prueba. Nunca se elige la prueba "porque sale significativa".

## Reglas de honestidad (no negociables)

1. **Todo número que aparezca en la respuesta viene de la salida del script.** Nunca estimes, redondees de memoria ni inventes estadísticos, valores *p* o tamaños de efecto. Si no se ejecutó, no se reporta.
2. **Reporta los supuestos que fallan.** Si el script cambia a una prueba no paramétrica o robusta, dilo y explica por qué en una frase. No ocultes advertencias (`avisos`).
3. **No fuerces significancia.** Un resultado no significativo se redacta como tal ("no se rechaza H₀"), sin lenguaje de "tendencia". Tampoco se dice "se demostró" ni "se probó": se dice "los datos aportan evidencia / no aportan evidencia".
4. **Correlación no es causalidad**, y la regresión con datos observacionales tampoco prueba causa. Mantén ese lenguaje en la redacción.
5. **Tamaño de efecto siempre junto al valor *p*.** El script ya lo incluye; no lo quites.
6. **Si hay dudas sobre el diseño** (muestras dependientes, muestreo por conglomerados, mediciones repetidas, datos anidados), dilo: la v1 asume observaciones independientes salvo en `comparar_pareadas`.
7. **Privacidad:** pide bases sin nombres, DNI, correos ni datos que identifiquen personas (Ley 29733 en Perú; LFPDPPP en México). Si la base los trae, indica al usuario que los elimine o codifique antes de compartirla.

## Qué incluye y qué no (alcance v1)

**Incluye:** perfil de datos y calidad (faltantes, atípicos, tipo de variable), descriptivos y frecuencias, confiabilidad de escalas (alfa de Cronbach), comparación de 2 grupos independientes, de 3 o más grupos, de medidas pareadas (pre-post), correlación (par y matriz), chi cuadrado / Fisher, regresión lineal múltiple, regresión logística binaria, tamaño de muestra (Cochran) y potencia a priori.

**No incluye (decláralo si lo piden):** validación de instrumentos más allá de la confiabilidad (validez de contenido, AFE/AFC), SEM, mediación y moderación, ANOVA factorial o de medidas repetidas, Friedman, modelos mixtos/multinivel, series de tiempo, supervivencia, regresión ordinal/multinomial/Poisson, análisis bayesiano. Para eso, recomienda JASP/Jamovi/R con asesoría estadística. Ver `references/alcance_y_limites.md`.

## Flujo de trabajo

1. **Aclarar lo mínimo** (máximo 3 preguntas, solo lo que cambie la prueba): ¿cuál es la pregunta o hipótesis?, ¿cuál es la variable dependiente y cuáles las independientes?, ¿los mismos participantes miden más de una vez? Si el usuario ya lo dijo, no preguntes.
2. **Cargar y perfilar:** `cargar_datos` → `perfil_datos`. Revisa con el usuario los tipos detectados (la escala Likert se marca como "ordinal / Likert (posible)"; una columna de ID se excluye). Si algo está mal codificado (p. ej., "999" como faltante), corrígelo antes de seguir.
3. **Elegir el análisis** con `references/arbol_decision.md`.
4. **Ejecutar la función** correspondiente con `salida="..."` para que guarde las figuras PNG (300 dpi).
5. **Armar el informe** con `Informe(...)` y `.guardar()` (Word con tablas APA, Excel y Markdown).
6. **Entregar** la tabla, la figura, el párrafo de resultados, la justificación del método y las advertencias. Resume en 2–3 líneas lo que significan los resultados en lenguaje sencillo.
7. **Verificar** que los números del texto entregado coincidan con la tabla generada.

## Uso como biblioteca (Python)

```python
import sys; sys.path.insert(0, "scripts")
from tesis_stats import *

df  = cargar_datos("mis_datos.xlsx")                 # .xlsx, .csv o .sav
inf = Informe("Resultados de mi tesis", salida="resultados")

inf.agregar(perfil_datos(df, salida="resultados"))
inf.agregar(confiabilidad_escala(df, ["satisf_1", "satisf_2", "satisf_3", "satisf_4", "satisf_5"],
                                 etiqueta_escala="la escala de satisfacción", salida="resultados"))
inf.agregar(comparar_grupos(df, y="postest", grupo="grupo", salida="resultados"))
inf.agregar(comparar_pareadas(df, pre="pretest", post="postest", salida="resultados"))
inf.agregar(matriz_correlaciones(df, ["edad", "horas_estudio", "ansiedad"], salida="resultados"))
inf.agregar(chi_cuadrado(df, "sexo", "aprobado", salida="resultados"))
inf.agregar(regresion_lineal(df, "postest", ["pretest", "horas_estudio", "grupo"],
                             referencia={"grupo": "Control"}, salida="resultados"))
inf.agregar(regresion_logistica(df, "aprobado", ["horas_estudio", "ansiedad"],
                                evento="Sí", salida="resultados"))
inf.guardar()                      # informe.docx + tablas.xlsx + informe.md
```

Parámetros útiles: `ordinal=True` (fuerza pruebas no paramétricas para escalas Likert o rangos), `normalidad="shapiro"` (cambia la convención por defecto), `orden=[...]` (orden de los grupos), `alfa=0.05`, `set_decimal(",")` (coma decimal en los textos).

Tamaño de muestra y potencia (no necesitan datos):

```python
inf.agregar(muestra_poblacion(N=1200, confianza=0.95, error=0.05, p=0.5))
inf.agregar(potencia_muestra("t_independiente", efecto=0.5, alfa=0.05, potencia=0.80))
```

## Uso desde la terminal

```bash
python scripts/tesis_stats.py perfil         --datos datos.xlsx
python scripts/tesis_stats.py confiabilidad  --datos datos.xlsx --items satisf_1 satisf_2 satisf_3 satisf_4 satisf_5
python scripts/tesis_stats.py comparar       --datos datos.xlsx --y postest --grupo grupo
python scripts/tesis_stats.py pareadas    --datos datos.xlsx --pre pretest --post postest
python scripts/tesis_stats.py correlacion --datos datos.xlsx --vars edad horas_estudio ansiedad --ajuste holm
python scripts/tesis_stats.py chi2        --datos datos.xlsx --x sexo --y aprobado
python scripts/tesis_stats.py regresion   --datos datos.xlsx --y postest --x pretest grupo --ref grupo=Control
python scripts/tesis_stats.py logistica   --datos datos.xlsx --y aprobado --x horas_estudio --evento Sí
python scripts/tesis_stats.py muestra     --N 1200
python scripts/tesis_stats.py potencia    --prueba t_independiente --efecto 0.5
```

Opciones comunes: `--salida`, `--formatos md xlsx docx`, `--decimal ,`, `--titulo`, `--ordinal`, `--hoja`. Los errores del usuario (columna mal escrita, variable constante, grupo con n < 2) salen como `ERROR: ...` con sugerencias de nombres parecidos.

## Qué hace el script por ti

- **Normalidad:** Shapiro-Wilk si n < 50; Kolmogorov-Smirnov con corrección de Lilliefors si n ≥ 50 (convención de SPSS y de la mayoría de comités de tesis). Se puede cambiar con `normalidad="shapiro"`. Detalle y matices en `references/decisiones_y_justificacion.md`.
- **Homogeneidad:** Levene (centrado en la media) → Student vs. Welch; ANOVA clásico vs. Welch.
- **Post hoc:** solo si la prueba global es significativa (Tukey, Games-Howell o Dunn con Bonferroni).
- **Tamaños de efecto:** d de Cohen (agrupada; d_z en pareadas), r biserial por rangos, η², ε², V de Cramér, φ, OR con IC, R² y R² de Nagelkerke. (f² de Cohen solo se usa en el cálculo de potencia, no se reporta en la salida de regresión.)
- **Regresión:** Breusch-Pagan, VIF, Durbin-Watson, distancia de Cook; errores robustos HC3 automáticos si hay heterocedasticidad; regla de Green (50 + 8k) para el tamaño de muestra; en logística, EPV ≥ 10, Hosmer-Lemeshow y AUC.
- **Confiabilidad:** alfa de Cronbach con IC 95% (Feldt, Woodruff y Salih, 1987), correlación ítem-total corregida y alfa si se elimina el ítem; avisa si algún ítem tiene correlación ítem-total negativa (candidato a invertir con `invertir=[...]`).
- **Formato APA 7 en español:** sin cero inicial en estadísticos acotados, "*p* < .001", símbolos en cursiva, tablas con solo líneas horizontales, "Tabla N" / "Figura N" con título en cursiva y "Nota.".
- **Redacción:** hipótesis H₀/H₁, decisión ("se rechaza / no se rechaza H₀"), párrafo de resultados con la dirección de la diferencia y párrafo de método con justificación.

## Cómo presentar los resultados al usuario

- Muestra primero **la tabla y el párrafo**, luego la figura, luego las advertencias.
- Explica en una línea qué prueba se usó y por qué (p. ej.: "Se usó U de Mann-Whitney porque la normalidad no se cumple en el grupo control").
- Recuerda que el texto es **un borrador de redacción**: el investigador debe leerlo, adaptarlo a su hipótesis y revisarlo con su asesor.
- Para citar el software en la tesis usa el texto de `plantillas_redaccion.md` (SciPy y statsmodels).
- Si el usuario quiere reproducir en SPSS/Jamovi/R, ver `references/equivalencias_software.md`.

## Archivos de referencia (leer solo cuando haga falta)

| Archivo | Cuándo leerlo |
|---|---|
| `references/arbol_decision.md` | Para elegir la prueba según tipo de variable y diseño |
| `references/decisiones_y_justificacion.md` | Para defender cada decisión ante un jurado, con citas |
| `references/equivalencias_software.md` | Para verificar en SPSS, Jamovi o R |
| `references/plantillas_redaccion.md` | Para redactar método, resultados y limitaciones |
| `references/alcance_y_limites.md` | Cuando piden algo fuera de la v1 |

## Pruebas del código

`python3 -m pytest tests -q` ejecuta 36 pruebas que contrastan los resultados con SciPy y statsmodels. Datos sintéticos de práctica en `ejemplos/`.
