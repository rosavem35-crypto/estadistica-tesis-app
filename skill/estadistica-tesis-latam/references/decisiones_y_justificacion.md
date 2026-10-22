# Decisiones metodológicas y cómo defenderlas

Cada decisión automática de la skill tiene una razón y una referencia. Úsalo para el capítulo de método o ante preguntas del jurado. Las citas son referencias clásicas ampliamente aceptadas; verifica edición y páginas antes de citarlas en tu tesis.

## 1. Normalidad
- **Regla:** Shapiro-Wilk si n < 50; Kolmogorov-Smirnov con corrección de Lilliefors si n ≥ 50.
- **Por qué:** Shapiro-Wilk es la prueba más potente en muestras pequeñas (Shapiro y Wilk, 1965); la corrección de Lilliefors (1967) es necesaria cuando la media y la varianza se estiman de la muestra. La combinación n < 50 / n ≥ 50 es la convención de SPSS y la más pedida en comités de tesis.
- **Matiz honesto:** muchos metodólogos modernos prefieren Shapiro-Wilk en todos los tamaños y priorizar los gráficos Q-Q (Field, 2018). Si tu comité lo prefiere: `normalidad="shapiro"`. Con n grande, además, el ANOVA y la *t* son robustos al incumplimiento leve de normalidad; la skill es conservadora y pasa a no paramétricas.

## 2. Homogeneidad de varianzas y pruebas robustas
- **Levene** centrado en la media (como SPSS). Si falla → *t* de Welch (Welch, 1947) o ANOVA de Welch + Games-Howell (Games y Howell, 1976).
- **Por qué:** Welch mantiene el error tipo I cuando las varianzas o los tamaños de grupo son distintos.

## 3. Pruebas no paramétricas
- **Mann-Whitney** con Z corregida por empates; tamaño de efecto r biserial por rangos = 2U₁/(n₁n₂) − 1.
- **Kruskal-Wallis** con ε² = H(n+1)/(n²−1) (Tomczak y Tomczak, 2014); post hoc **Dunn** (1964) con Bonferroni.
- **Wilcoxon** de rangos con signo para pareadas; r biserial.
- Se usan cuando falla la normalidad, la variable es ordinal (`ordinal=True`), o hay datos con colas pesadas.
- Aclarar en el texto: Mann-Whitney compara distribuciones/rangos, no estrictamente medianas, salvo que las formas sean similares.

## 4. Post hoc
Solo si el contraste global es significativo. Tukey (varianzas iguales), Games-Howell (desiguales), Dunn-Bonferroni (rangos). Controlan el error tipo I familiar.

## 5. Tamaños de efecto y sus etiquetas
- *d* de Cohen: .20 pequeño, .50 mediano, .80 grande (Cohen, 1988).
- *r* / correlación: .10, .30, .50.
- η²: .01, .06, .14. R²: .02, .13, .26.
- V de Cramér: depende de los grados de libertad (Cohen, 1988).
- Son referencias generales, no verdades; interprétalos según el campo.

## 6. Correlación
- Pearson con IC por transformación z de Fisher; Spearman con IC de Bonett y Wright (2000).
- Matriz: se usa un solo método para todas las variables (Pearson solo si todas son normales). Ajuste de pruebas múltiples opcional: Holm (más potente) o Bonferroni.

## 7. Chi cuadrado
- χ² de Pearson cuando las frecuencias esperadas son adecuadas; Fisher exacta en 2×2 con esperadas < 5. V de Cramér (o φ en 2×2), residuos tipificados corregidos (|z| > 1.96 señala casillas que explican la asociación) y OR con IC de Woolf.

## 8. Regresión lineal
- Supuestos: normalidad de residuos, homocedasticidad (Breusch-Pagan), no multicolinealidad (VIF < 5 aceptable; > 10 problema), independencia (Durbin-Watson 1.5–2.5), casos influyentes (Cook > 4/n).
- Si Breusch-Pagan es significativo, se usan errores estándar robustos HC3 y se avisa.
- Tamaño de muestra mínimo: regla de Green (1991) N ≥ 50 + 8k para evaluar el modelo.
- Categóricas: variables indicadoras con categoría de referencia explícita.

## 9. Regresión logística
- Razón de momios (OR) con IC 95 %, prueba ómnibus de razón de verosimilitud, R² de Cox y Snell y Nagelkerke, bondad de ajuste de Hosmer-Lemeshow (Hosmer, Lemeshow y Sturdivant, 2013), AUC.
- EPV (eventos por variable) ≥ 10 como regla práctica; por debajo se advierte.

## 10. Confiabilidad (alfa de Cronbach)
- **Regla:** alfa de Cronbach con IC 95% (Feldt, Woodruff y Salih, 1987), correlación ítem-total corregida y alfa si se elimina el ítem.
- **Por qué:** el alfa (Cronbach, 1951) es la medida de consistencia interna más reportada y más pedida por comités de tesis en ciencias sociales, educación y salud. El IC evita sobreinterpretar un valor puntual con muestras pequeñas.
- **Interpretación (George y Mallery, 2003):** < .50 inaceptable; .50-.60 pobre; .60-.70 cuestionable; .70-.80 aceptable; .80-.90 buena; > .90 excelente (valores muy altos pueden indicar ítems redundantes, no necesariamente mejor calidad).
- **Matiz honesto:** el alfa asume que todos los ítems miden el mismo rasgo con peso similar (modelo tau-equivalente); si tu escala es multidimensional, calcula el alfa por subescala, no de toda la escala junta. Un ítem con correlación ítem-total negativa suele estar mal redactado o necesitar codificación inversa (`invertir=[...]`); la skill lo señala pero no lo corrige por ti.

## 11. Tamaño de muestra
- Proporciones: fórmula de Cochran (1977) con corrección por población finita. El valor p = .50 es el supuesto más conservador.
- Potencia: cálculo a priori para *t*, *t* pareada, ANOVA, regresión (*f*², F no central), correlación (aproximación de Fisher) y χ². Con efectos medios de Cohen por defecto, y se avisa; lo ideal es usar un efecto esperado de la literatura.

## Referencias
- Bonett, D. G., y Wright, T. A. (2000). Sample size requirements for estimating Pearson, Kendall and Spearman correlations. *Psychometrika, 65*(1), 23–28.
- Cochran, W. G. (1977). *Sampling techniques* (3.ª ed.). Wiley.
- Cohen, J. (1988). *Statistical power analysis for the behavioral sciences* (2.ª ed.). Lawrence Erlbaum.
- Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests. *Psychometrika, 16*(3), 297–334.
- Dunn, O. J. (1964). Multiple comparisons using rank sums. *Technometrics, 6*(3), 241–252.
- Feldt, L. S., Woodruff, D. J., y Salih, F. A. (1987). Statistical inference for coefficient alpha. *Applied Psychological Measurement, 11*(1), 93–103.
- Field, A. (2018). *Discovering statistics using IBM SPSS Statistics* (5.ª ed.). SAGE.
- Games, P. A., y Howell, J. F. (1976). Pairwise multiple comparison procedures with unequal n's and/or variances. *Journal of Educational Statistics, 1*(2), 113–125.
- George, D., y Mallery, P. (2003). *SPSS for Windows step by step: A simple guide and reference* (4.ª ed.). Allyn & Bacon.
- Green, S. B. (1991). How many subjects does it take to do a regression analysis? *Multivariate Behavioral Research, 26*(3), 499–510.
- Hosmer, D. W., Lemeshow, S., y Sturdivant, R. X. (2013). *Applied logistic regression* (3.ª ed.). Wiley.
- Lilliefors, H. W. (1967). On the Kolmogorov-Smirnov test for normality with mean and variance unknown. *Journal of the American Statistical Association, 62*(318), 399–402.
- Seabold, S., y Perktold, J. (2010). statsmodels: Econometric and statistical modeling with Python. *Proceedings of the 9th Python in Science Conference*, 92–96.
- Shapiro, S. S., y Wilk, M. B. (1965). An analysis of variance test for normality. *Biometrika, 52*(3–4), 591–611.
- Tomczak, M., y Tomczak, E. (2014). The need to report effect size estimates revisited. *Trends in Sport Sciences, 21*(1), 19–25.
- Virtanen, P., et al. (2020). SciPy 1.0: Fundamental algorithms for scientific computing in Python. *Nature Methods, 17*, 261–272.
- Welch, B. L. (1947). The generalization of "Student's" problem when several different population variances are involved. *Biometrika, 34*(1–2), 28–35.
