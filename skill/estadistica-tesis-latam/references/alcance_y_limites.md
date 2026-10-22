# Alcance y límites (v1)

## Para qué sirve bien
Análisis cuantitativos estándar de tesis de pregrado, maestría y artículos de ciencias sociales, educación, salud y administración, con observaciones independientes y diseños simples. Incluye confiabilidad de escalas (alfa de Cronbach) como paso previo al análisis de hipótesis.

## Limitaciones a decir en voz alta
1. **No reemplaza al asesor estadístico.** Elegir la prueba correcta depende del diseño del estudio, algo que ningún script ve completo.
2. **Muestreo y diseño:** asume observaciones independientes (salvo las pruebas pareadas). Si hubo muestreo por conglomerados o ponderación, los errores estándar serán demasiado optimistas.
3. **Convención de normalidad:** usa Shapiro-Wilk (n < 50) y Kolmogorov-Smirnov con Lilliefors (n ≥ 50), la convención de SPSS. Con muestras grandes cualquier test de normalidad rechaza desviaciones triviales; con muestras muy pequeñas casi nunca rechaza. Mira siempre los gráficos Q-Q y el histograma. Se puede cambiar con `normalidad="shapiro"`.
4. **El valor *p* de Lilliefors** se obtiene por tabla (statsmodels) y se acota cerca de .20; por eso se informa "*p* > .20".
5. **Pruebas múltiples:** si se hacen muchas pruebas, aplica corrección (`ajuste="holm"` en matrices de correlación). El script no corrige entre análisis separados.
6. **Datos faltantes:** cada análisis excluye los casos con dato faltante en sus variables (por casos en regresión y comparaciones; por pares en correlaciones) y lo avisa. No imputa.
7. **Potencia:** los valores por defecto usan efectos medios de Cohen (convención, no un hallazgo). Lo ideal es justificar el efecto esperado con literatura propia.
8. **Regresión logística:** categoría de evento y de referencia deben definirse explícitamente; con EPV < 10 el modelo se advierte como inestable.

## Fuera de alcance
Validación de instrumentos más allá de la confiabilidad (validez de contenido, validez de criterio, AFE, AFC), SEM, mediación, moderación, ANOVA factorial y de medidas repetidas, Friedman, modelos mixtos, series de tiempo, supervivencia, regresión ordinal/multinomial/Poisson, bayesiano, metaanálisis.

## Qué decir cuando piden algo fuera de alcance
"Esto queda fuera de lo que cubre esta herramienta. Te recomiendo [JASP/Jamovi/R + paquete] y consultarlo con un asesor estadístico. Puedo ayudarte a preparar la base y a describir la muestra."
