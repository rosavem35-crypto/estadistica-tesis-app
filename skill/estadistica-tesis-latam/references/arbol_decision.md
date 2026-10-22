# Árbol de decisión: ¿qué análisis uso?

Responde en este orden: **(1) ¿qué quiero saber?, (2) ¿de qué tipo es cada variable?, (3) ¿las observaciones son independientes?**

## Paso 1. Tipo de variable
| Tipo | Ejemplos | Cómo la trata el script |
|---|---|---|
| Numérica continua | edad, puntaje, horas de estudio | Pruebas paramétricas si cumple supuestos |
| Ordinal / Likert | escala de 1 a 5, nivel (bajo-medio-alto) | Usa `ordinal=True` → pruebas no paramétricas |
| Categórica | sexo, facultad, grupo | Frecuencias, chi cuadrado, o como factor de agrupación |
| Identificador | código, DNI | Se excluye del análisis |

Nota: un ítem Likert aislado es ordinal. Una **escala sumada** de varios ítems suele tratarse como numérica si su distribución lo permite; justifícalo en el método.

## Paso 2. Pregunta → función
| Pregunta | Variables | Función |
|---|---|---|
| ¿Cómo es mi muestra? | cualquiera | `descriptivos`, `frecuencias`, `perfil_datos` |
| ¿Es confiable mi escala (p. ej., Likert) antes de analizarla? | 2+ ítems numéricos de la misma escala | `confiabilidad_escala` |
| ¿Dos grupos difieren? | numérica + categórica de 2 niveles (grupos distintos) | `comparar_grupos` |
| ¿Tres o más grupos difieren? | numérica + categórica de 3+ niveles | `comparar_grupos` |
| ¿Cambió entre antes y después? | dos numéricas del mismo participante | `comparar_pareadas` |
| ¿Dos variables numéricas se relacionan? | numérica + numérica | `correlacion` |
| ¿Varias variables se relacionan entre sí? | 3+ numéricas | `matriz_correlaciones` (usa `ajuste="holm"`) |
| ¿Dos categóricas se asocian? | categórica + categórica | `chi_cuadrado` |
| ¿Qué predice un puntaje? | numérica ~ varios predictores | `regresion_lineal` |
| ¿Qué predice un sí/no? | binaria ~ varios predictores | `regresion_logistica` |
| ¿Cuántos participantes necesito? | ninguna (planificación) | `muestra_poblacion`, `potencia_muestra` |

## Paso 3. Lo que el script decide solo
**Dos grupos independientes**
- Normal en ambos grupos y varianzas iguales → *t* de Student
- Normal, varianzas distintas (Levene) → *t* de Welch
- No normal u ordinal → U de Mann-Whitney

**Tres o más grupos**
- Normal y varianzas iguales → ANOVA de un factor + Tukey
- Normal, varianzas distintas → ANOVA de Welch + Games-Howell
- No normal u ordinal → Kruskal-Wallis + Dunn (Bonferroni)
- El post hoc se hace solo si la prueba global es significativa.

**Pareadas:** diferencias normales → *t* pareada; si no → Wilcoxon.

**Correlación:** ambas normales → Pearson; si no, u ordinal → Spearman.

**Categóricas:** χ² de Pearson; en tablas 2×2 con frecuencias esperadas < 5 → exacta de Fisher.

## Casos que NO cubre la v1 (derivar)
- Mismos participantes medidos 3+ veces → ANOVA de medidas repetidas / Friedman.
- Dos factores a la vez (p. ej., grupo × sexo) → ANOVA factorial.
- Datos anidados (alumnos dentro de aulas) → modelos multinivel.
- Mediación, moderación, SEM, AFE/AFC, validez de contenido/criterio → R (lavaan) o JASP/Jamovi con asesoría.
  (La confiabilidad —alfa de Cronbach— sí está cubierta por `confiabilidad_escala`; lo que queda fuera es la
  validación del instrumento más allá de eso.)
