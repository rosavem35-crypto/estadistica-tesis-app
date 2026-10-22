# Plantillas de redacción

El script ya genera el párrafo de cada análisis. Estas plantillas sirven para el resto del capítulo. Reemplaza los corchetes con tus datos.

## Método: procedimiento de análisis de datos
> Los datos se analizaron con Python 3 utilizando las bibliotecas SciPy (Virtanen et al., 2020) y statsmodels (Seabold y Perktold, 2010). Primero se describió la muestra mediante frecuencias y porcentajes para las variables categóricas, y medias y desviaciones estándar (o medianas y rangos intercuartílicos) para las numéricas. La normalidad se evaluó con la prueba de [Shapiro-Wilk (n < 50) / Kolmogorov-Smirnov con corrección de Lilliefors (n ≥ 50)] y la homogeneidad de varianzas con la prueba de Levene. Según el cumplimiento de los supuestos se aplicó [prueba]. Se reporta el tamaño del efecto en cada contraste. El nivel de significancia fue α = .05.

## Método: aspectos éticos (datos)
> Los datos se recolectaron de manera anónima [y con consentimiento informado], y la base de análisis no contiene información que permita identificar a los participantes, en concordancia con [Ley N.º 29733 de Protección de Datos Personales (Perú) / Ley Federal de Protección de Datos Personales en Posesión de los Particulares (México)].

## Resultados: estadística descriptiva
> La muestra estuvo conformada por *N* = [n] participantes ([x] % mujeres), con una edad promedio de *M* = [..] años (*DE* = [..]). [Tabla 1]

## Resultados: confiabilidad de una escala
> La confiabilidad de [nombre de la escala] se evaluó mediante el coeficiente alfa de Cronbach, obteniéndose α = [.xx], IC 95% [[lo], [hi]], a partir de [k] ítems y *n* = [n] participantes, lo que indica una confiabilidad [inaceptable/pobre/cuestionable/aceptable/buena/excelente]. [Si corresponde: el ítem [nombre] mostró una correlación ítem-total corregida baja o negativa, por lo que se recomienda revisar su redacción o invertir su codificación.]

## Resultados: cuando no se rechaza H₀
> No se encontraron diferencias estadísticamente significativas entre [grupos] en [variable], [estadístico], *p* = [..], [tamaño de efecto]. Es decir, los datos no aportan evidencia suficiente para afirmar diferencias; esto no demuestra que los grupos sean iguales.

## Discusión: limitaciones relacionadas con el análisis
> Este estudio tiene limitaciones. Primero, [el muestreo no probabilístico limita la generalización]. Segundo, el diseño [transversal] no permite inferir causalidad. Tercero, [el tamaño de muestra / la potencia estadística para detectar efectos pequeños fue limitada]. Cuarto, [los supuestos de X no se cumplieron plenamente, por lo que se emplearon pruebas robustas/no paramétricas].

## Cita sugerida del software
> Virtanen, P., Gommers, R., Oliphant, T. E., et al. (2020). SciPy 1.0: Fundamental algorithms for scientific computing in Python. *Nature Methods, 17*, 261–272.
> Seabold, S., y Perktold, J. (2010). statsmodels: Econometric and statistical modeling with Python. *Proceedings of the 9th Python in Science Conference*, 92–96.

## Reglas de estilo APA 7 que el script ya aplica
- *p* = .024; *p* < .001 (nunca "p = .000").
- Sin cero inicial para estadísticos que no pueden superar 1 (*p*, *r*, *β*, *R*², η², V).
- Símbolos estadísticos en cursiva: *t*, *F*, *U*, *p*, *r*, *M*, *DE*.
- Tablas: solo líneas horizontales superior, bajo el encabezado e inferior; número en negrita y título en cursiva arriba; "*Nota.*" debajo.
- Decimales: 2 para la mayoría; 3 para *p*.
