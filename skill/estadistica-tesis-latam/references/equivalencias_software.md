# Equivalencias para verificar en otros programas

Sirve para que el usuario compruebe un resultado, o para que el jurado pueda replicarlo.

| Análisis | SPSS (menú) | Jamovi | R |
|---|---|---|---|
| Descriptivos | Analizar > Estadísticos descriptivos > Explorar | Exploration > Descriptives | `summary()`, `psych::describe()` |
| Normalidad | Explorar > Gráficos > Pruebas de normalidad (K-S Lilliefors y Shapiro-Wilk) | Exploration > Descriptives > Statistics (Shapiro-Wilk) | `shapiro.test()`, `nortest::lillie.test()` |
| t independiente | Analizar > Comparar medias > Prueba T para muestras independientes (fila "No se asumen varianzas iguales" = Welch) | T-Tests > Independent Samples (Welch, Student, Mann-Whitney) | `t.test(y ~ g)`, `var.equal = TRUE` para Student |
| Mann-Whitney | Pruebas no paramétricas > Cuadros de diálogo antiguos > 2 muestras independientes | T-Tests > Independent Samples > Mann-Whitney U | `wilcox.test(y ~ g)` |
| t pareada | Comparar medias > Prueba T para muestras relacionadas | T-Tests > Paired Samples | `t.test(a, b, paired = TRUE)` |
| Wilcoxon | No paramétricas > 2 muestras relacionadas | T-Tests > Paired Samples > Wilcoxon | `wilcox.test(a, b, paired = TRUE)` |
| ANOVA + post hoc | Comparar medias > ANOVA de un factor (Post hoc: Tukey, Games-Howell) | ANOVA > One-Way ANOVA | `aov()` + `TukeyHSD()`, `oneway.test()`, `rstatix::games_howell_test()` |
| Kruskal-Wallis | No paramétricas > k muestras independientes | ANOVA > Kruskal-Wallis | `kruskal.test()`, `FSA::dunnTest(method="bonferroni")` |
| Correlación | Correlaciones > Bivariadas (Pearson / Spearman) | Regression > Correlation Matrix | `cor.test()`, `method = "spearman"` |
| Chi cuadrado | Estadísticos descriptivos > Tablas de contingencia (Estadísticos: Chi², V de Cramér; Casillas: residuos tipificados corregidos) | Frequencies > Independence Samples (χ²) | `chisq.test()`, `fisher.test()` |
| Regresión lineal | Regresión > Lineales (Estadísticos: colinealidad, Durbin-Watson) | Regression > Linear Regression | `lm()`, `car::vif()`, `lmtest::bptest()` |
| Regresión logística | Regresión > Logística binaria | Regression > 2 Outcomes Binomial | `glm(family = binomial)` |
| Tamaño de muestra / potencia | — (módulo aparte) | jpower | `pwr::pwr.t.test()` etc. |

## Diferencias esperables (no son errores)
- **Kruskal-Wallis post hoc:** SPSS usa comparaciones por pares con ajuste de Bonferroni sobre rangos medios (Dunn-Bonferroni); **Jamovi usa DSCF (Dwass-Steel-Critchlow-Fligner)**, por lo que sus valores *p* no coinciden con Dunn.
- **Mann-Whitney:** SPSS entrega Z con corrección de empates; el script reporta lo mismo. Algunos paquetes usan corrección de continuidad y cambian levemente el *p*.
- **Lilliefors:** SPSS calcula el *p* con tablas de Lilliefors y muestra ".200*" como límite; aquí se muestra "*p* > .20".
- **Levene:** el script centra en la media (como SPSS); `scipy` por defecto centra en la mediana y `car::leveneTest` también.
- **Cramér V y residuos:** iguales a SPSS si se piden "residuos tipificados corregidos".
